import pool from '../config/database.js';
import { google } from 'googleapis';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Public Controller
 * Handles all public endpoints that don't require authentication
 */

// Get all branches with member count
export const getBranches = async (req, res) => {
  try {
    const sql = `
      SELECT 
        b.id,
        b.name,
        b.address,
        b.report_template,
        COUNT(m.id) as member_count
      FROM 
        branches b
      LEFT JOIN 
        members m ON b.id = m.branch_id AND m.status = 'active'
      GROUP BY 
        b.id, b.name, b.address, b.report_template
      ORDER BY 
        b.name ASC
    `;
    
    const [branches] = await pool.query(sql);
    res.json(branches);
  } catch (error) {
    console.error('Error fetching branches:', error);
    res.status(500).json({ message: 'Gagal mengambil data cabang.' });
  }
};

// Get all schedules
export const getSchedules = async (req, res) => {
  try {
    const sql = `
      SELECT 
        s.*,
        b.name as branch_name
      FROM 
        schedules s
      JOIN 
        branches b ON s.branch_id = b.id
      ORDER BY 
        s.day_of_week ASC, s.start_time ASC
    `;
    
    const [schedules] = await pool.query(sql);
    res.json(schedules);
  } catch (error) {
    console.error('Error fetching schedules:', error);
    res.status(500).json({ message: 'Gagal mengambil data jadwal.' });
  }
};

// Get articles list
export const getArticles = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 3;
    
    const sql = `
      SELECT id, title, content, thumbnail_url, created_at 
      FROM articles
      ORDER BY created_at DESC
      LIMIT ?
    `;
    
    const [articles] = await pool.query(sql, [limit]);
    
    // Process each article to create preview
    const processedArticles = articles.map(article => {
      const plainText = article.content.replace(/<[^>]*>/g, '');
      return {
        ...article,
        content_preview: plainText.substring(0, 100) + '...',
        content: undefined
      };
    });
    
    res.json(processedArticles);
  } catch (error) {
    console.error('Error fetching articles:', error);
    res.status(500).json({ message: 'Gagal mengambil daftar artikel: ' + error.message });
  }
};

// Get article detail
export const getArticleDetail = async (req, res) => {
  try {
    const { id } = req.params;
    
    const sql = `
      SELECT id, title, content, thumbnail_url, created_at 
      FROM articles
      WHERE id = ?
    `;
    
    const [articles] = await pool.query(sql, [id]);
    
    if (articles.length === 0) {
      return res.status(404).json({ message: 'Artikel tidak ditemukan.' });
    }
    
    res.json(articles[0]);
  } catch (error) {
    console.error('Error fetching article detail:', error);
    res.status(500).json({ message: 'Gagal mengambil detail artikel: ' + error.message });
  }
};

// Get articles for sidebar
export const getArticlesSidebar = async (req, res) => {
  try {
    const excludeId = req.query.exclude_id;
    
    let sql = `
      SELECT id, title, thumbnail_url, created_at 
      FROM articles
    `;
    
    const params = [];
    if (excludeId) {
      sql += ' WHERE id != ?';
      params.push(excludeId);
    }
    
    sql += ' ORDER BY created_at DESC LIMIT 5';
    
    const [articles] = await pool.query(sql, params);
    res.json(articles);
  } catch (error) {
    console.error('Error fetching sidebar articles:', error);
    res.status(500).json({ message: 'Gagal mengambil artikel sidebar: ' + error.message });
  }
};

// Get matches list
export const getMatches = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit);
    const all = req.query.all === 'true';
    
    let sql = 'SELECT * FROM matches ORDER BY match_date DESC';
    const params = [];
    
    if (!all && limit && limit > 0) {
      sql += ' LIMIT ?';
      params.push(limit);
    }
    
    const [matches] = await pool.query(sql, params);
    res.json(matches);
  } catch (error) {
    console.error('Error fetching matches:', error);
    res.status(500).json({ message: 'Gagal mengambil data pertandingan.' });
  }
};

// Get match detail
export const getMatchDetail = async (req, res) => {
  try {
    const id = req.params.id || req.query.id;
    
    if (!id) {
      return res.status(400).json({ message: 'ID pertandingan diperlukan.' });
    }
    
    // Get match basic info
    const matchSql = 'SELECT * FROM matches WHERE id = ?';
    const [matches] = await pool.query(matchSql, [id]);
    
    if (matches.length === 0) {
      return res.status(404).json({ message: 'Pertandingan tidak ditemukan.' });
    }
    
    const match = matches[0];
    
    // Get lineup
    const lineupSql = `
      SELECT 
        ml.*,
        m.full_name,
        m.nickname
      FROM 
        match_lineups ml
      JOIN 
        members m ON ml.member_id = m.id
      WHERE 
        ml.match_id = ?
      ORDER BY 
        ml.position ASC
    `;
    const [lineup] = await pool.query(lineupSql, [id]);
    
    // Get scorers
    const scorersSql = `
      SELECT 
        ms.*,
        m.full_name,
        m.nickname
      FROM 
        match_scorers ms
      JOIN 
        members m ON ms.member_id = m.id
      WHERE 
        ms.match_id = ?
    `;
    const [scorers] = await pool.query(scorersSql, [id]);
    
    // Get photos
    const photosSql = 'SELECT * FROM match_photos WHERE match_id = ?';
    const [photos] = await pool.query(photosSql, [id]);
    
    res.json({
      ...match,
      lineup,
      scorers,
      photos
    });
  } catch (error) {
    console.error('Error fetching match detail:', error);
    res.status(500).json({ message: 'Gagal mengambil detail pertandingan.' });
  }
};

// Get hero gallery
export const getHeroGallery = async (req, res) => {
  try {
    const sql = `
      SELECT * 
      FROM hero_gallery
      ORDER BY display_order ASC, created_at DESC
    `;
    
    const [gallery] = await pool.query(sql);
    res.json(gallery);
  } catch (error) {
    console.error('Error fetching hero gallery:', error);
    res.status(500).json({ message: 'Gagal mengambil data hero gallery.' });
  }
};

// Get branch admin profiles (coaches)
export const getBranchAdminProfiles = async (req, res) => {
  try {
    // Get branch admins with branch info
    const [admins] = await pool.query(`
      SELECT 
        ba.id,
        ba.full_name,
        ba.avatar,
        ba.phone_number,
        ba.address,
        b.name as branch_name
      FROM branch_admins ba 
      LEFT JOIN branches b ON ba.branch_id = b.id 
      ORDER BY ba.full_name
    `);

    // Get competencies for each admin
    for (let admin of admins) {
      const [competencies] = await pool.query(`
        SELECT 
          competency_name, 
          issuer, 
          date_obtained, 
          certificate_number 
        FROM branch_admin_competencies 
        WHERE branch_admin_id = ? 
        ORDER BY date_obtained DESC
      `, [admin.id]);
      
      admin.competencies = competencies;
    }

    res.json(admins);
  } catch (error) {
    console.error('Error fetching branch admin profiles:', error);
    res.status(500).json({ message: 'Gagal mengambil profil pelatih.' });
  }
};

// Get/Update visitor statistics
export const getVisitorStats = async (req, res) => {
  try {
    if (req.method === 'POST') {
      // Increment visitor count
      // This is a simplified version - in production you might want to track unique visitors
      const sql = `
        INSERT INTO visitor_stats (visit_date, visit_count)
        VALUES (CURDATE(), 1)
        ON DUPLICATE KEY UPDATE visit_count = visit_count + 1
      `;
      await pool.query(sql);
      return res.json({ message: 'Visitor count updated' });
    }
    
    // Get statistics
    const sql = `
      SELECT 
        SUM(visit_count) as total_visits,
        COUNT(DISTINCT visit_date) as total_days
      FROM visitor_stats
    `;
    
    const [stats] = await pool.query(sql);
    res.json(stats[0] || { total_visits: 0, total_days: 0 });
  } catch (error) {
    console.error('Error with visitor stats:', error);
    res.status(500).json({ message: 'Gagal memproses statistik pengunjung.' });
  }
};

// Get member count
export const getMemberCount = async (req, res) => {
  try {
    const sql = `
      SELECT COUNT(*) as total_members
      FROM members
      WHERE status = 'active'
    `;
    
    const [result] = await pool.query(sql);
    res.json(result[0]);
  } catch (error) {
    console.error('Error fetching member count:', error);
    res.status(500).json({ message: 'Gagal mengambil jumlah member.' });
  }
};

// PHP-compatible endpoints

// GET /api/public/list_articles.php - Get articles with pagination
export const listArticlesPHP = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 9;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    let sqlBase = 'FROM articles a JOIN users u ON a.author_id = u.id';
    const params = [];

    if (search) {
      sqlBase += ' WHERE a.title LIKE ?';
      params.push(`%${search}%`);
    }

    // Count total articles
    const [countResult] = await pool.query(`SELECT COUNT(a.id) as total ${sqlBase}`, params);
    const totalArticles = countResult[0].total;

    // Get articles for current page
    const dataSql = `SELECT a.id, a.title, a.content, a.thumbnail_url, a.created_at, u.username as author_name ${sqlBase} ORDER BY a.created_at DESC LIMIT ? OFFSET ?`;
    const [articles] = await pool.query(dataSql, [...params, limit, offset]);

    // Add full thumbnail URL
    const appUrl = process.env.APP_URL || '';
    const formattedArticles = articles.map(article => ({
      ...article,
      thumbnail_url: article.thumbnail_url ? `${appUrl}${article.thumbnail_url}` : null
    }));

    res.json({
      articles: formattedArticles,
      total_pages: Math.ceil(totalArticles / limit),
      current_page: page
    });
  } catch (error) {
    console.error('Error listing articles:', error);
    res.status(500).json({ message: 'Gagal mengambil data artikel.' });
  }
};

// GET /api/public/article_details.php - Get article details
export const getArticleDetailsPHP = async (req, res) => {
  try {
    const id = req.query.id;

    if (!id || isNaN(id)) {
      return res.status(400).json({ message: 'ID Artikel tidak valid.' });
    }

    const [articles] = await pool.query(
      'SELECT id, title, content, thumbnail_url, created_at FROM articles WHERE id = ?',
      [id]
    );

    if (articles.length === 0) {
      return res.status(404).json({ message: 'Artikel tidak ditemukan.' });
    }

    res.json(articles[0]);
  } catch (error) {
    console.error('Error fetching article details:', error);
    res.status(500).json({ message: 'Gagal mengambil data artikel: ' + error.message });
  }
};

// GET /api/public/members_count.php - Get member count per branch
export const getMembersCountPHP = async (req, res) => {
  try {
    const [membersCount] = await pool.query(`
      SELECT 
        b.id as branch_id,
        b.name as branch_name,
        COUNT(DISTINCT m.id) as total_members,
        COUNT(DISTINCT CASE 
          WHEN m.status = 'active' OR m.status = 'aktif' 
          THEN m.id 
        END) as active_members
      FROM branches b
      LEFT JOIN members m ON b.id = m.branch_id
      GROUP BY b.id, b.name
      ORDER BY b.name
    `);

    const formattedCount = membersCount.map(row => ({
      branch_id: parseInt(row.branch_id),
      branch_name: row.branch_name,
      total_members: parseInt(row.total_members),
      active_members: parseInt(row.active_members)
    }));

    res.json(formattedCount);
  } catch (error) {
    console.error('Error fetching members count:', error);
    res.status(500).json({
      error: 'Failed to fetch members count',
      message: error.message
    });
  }
};

// GET /api/public/branch_admin_profiles.php - Get branch admin profiles with competencies
export const getBranchAdminProfilesPHP = async (req, res) => {
  try {
    const [admins] = await pool.query(`
      SELECT 
        ba.id,
        ba.full_name,
        ba.avatar,
        ba.phone_number,
        ba.address,
        b.name as branch_name
      FROM branch_admins ba 
      LEFT JOIN branches b ON ba.branch_id = b.id 
      ORDER BY ba.full_name
    `);

    // Get competencies for each admin
    for (const admin of admins) {
      const [competencies] = await pool.query(`
        SELECT competency_name, issuer, date_obtained, certificate_number 
        FROM branch_admin_competencies 
        WHERE branch_admin_id = ? 
        ORDER BY date_obtained DESC
      `, [admin.id]);
      admin.competencies = competencies;
    }

    res.json(admins);
  } catch (error) {
    console.error('Error fetching branch admin profiles:', error);
    res.status(500).json({ message: 'Gagal mengambil data profil pelatih' });
  }
};

// GET /api/public/list_schedules.php - Get all schedules
export const listSchedulesPHP = async (req, res) => {
  try {
    const [schedules] = await pool.query(`
      SELECT 
        s.id,
        s.branch_id,
        b.name as branch_name,
        s.day_of_week,
        s.start_time,
        s.end_time,
        s.age_group,
        s.location,
        s.min_age,
        s.max_age
      FROM schedules s
      INNER JOIN branches b ON s.branch_id = b.id
      ORDER BY 
        b.name,
        FIELD(s.day_of_week, 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'),
        s.start_time
    `);

    const formattedSchedules = schedules.map(row => ({
      id: row.id,
      branch_id: row.branch_id,
      branch_name: row.branch_name,
      day: row.day_of_week,
      start_time: row.start_time,
      end_time: row.end_time,
      age_group: row.age_group,
      location: row.location,
      min_age: parseInt(row.min_age) || null,
      max_age: parseInt(row.max_age) || null
    }));

    res.json(formattedSchedules);
  } catch (error) {
    console.error('Error fetching schedules:', error);
    res.status(500).json({
      error: 'Failed to fetch schedules',
      message: error.message
    });
  }
};

// GET /api/public/list_hero_gallery.php - Get hero gallery images
export const listHeroGalleryPHP = async (req, res) => {
  try {
    const [heroImages] = await pool.query(`
      SELECT id, image_path, display_order 
      FROM hero_gallery 
      WHERE is_active = 1 
      ORDER BY display_order ASC
    `);

    res.json({
      success: true,
      data: heroImages
    });
  } catch (error) {
    console.error('Error fetching hero gallery:', error);
    res.status(500).json({
      success: false,
      message: 'Database error: ' + error.message
    });
  }
};

// GET /api/public/list_branches.php - Get all branches
export const listBranchesPHP = async (req, res) => {
  try {
    const [branches] = await pool.query(`
      SELECT 
        b.id,
        b.name,
        b.address,
        COUNT(DISTINCT m.id) as member_count
      FROM branches b
      LEFT JOIN members m ON b.id = m.branch_id AND m.status = 'active'
      GROUP BY b.id, b.name, b.address
      ORDER BY b.name ASC
    `);

    res.json(branches);
  } catch (error) {
    console.error('Error fetching branches:', error);
    res.status(500).json({ message: 'Gagal mengambil data cabang.' });
  }
};

// GET /api/public/list_matches.php - Get all matches
export const listMatchesPHP = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit);
    const all = req.query.all === 'true';

    let sql = 'SELECT * FROM matches ORDER BY match_date DESC';
    const params = [];

    if (!all && limit && limit > 0) {
      sql += ' LIMIT ?';
      params.push(limit);
    }

    const [matches] = await pool.query(sql, params);
    res.json(matches);
  } catch (error) {
    console.error('Error fetching matches:', error);
    res.status(500).json({ message: 'Gagal mengambil data pertandingan.' });
  }
};

// GET /api/public/get_match_detail.php - Get match detail
export const getMatchDetailPHP = async (req, res) => {
  try {
    const id = req.query.id;

    if (!id) {
      return res.status(400).json({ message: 'ID pertandingan diperlukan.' });
    }

    // Get match basic info
    const [matches] = await pool.query('SELECT * FROM matches WHERE id = ?', [id]);

    if (matches.length === 0) {
      return res.status(404).json({ message: 'Pertandingan tidak ditemukan.' });
    }

    const match = matches[0];

    // Get lineup
    const [lineup] = await pool.query(`
      SELECT 
        ml.*,
        m.full_name,
        m.nickname
      FROM match_lineups ml
      JOIN members m ON ml.member_id = m.id
      WHERE ml.match_id = ?
      ORDER BY ml.position ASC
    `, [id]);

    // Get scorers
    const [scorers] = await pool.query(`
      SELECT 
        ms.*,
        m.full_name,
        m.nickname
      FROM match_scorers ms
      JOIN members m ON ms.member_id = m.id
      WHERE ms.match_id = ?
    `, [id]);

    // Get photos
    const [photos] = await pool.query('SELECT * FROM match_photos WHERE match_id = ?', [id]);

    res.json({
      ...match,
      lineup,
      scorers,
      photos
    });
  } catch (error) {
    console.error('Error fetching match detail:', error);
    res.status(500).json({ message: 'Gagal mengambil detail pertandingan.' });
  }
};

// List articles for sidebar (exclude current article)
export const listArticlesSidebar = async (req, res) => {
  try {
    const excludeId = req.query.exclude_id;
    const limit = parseInt(req.query.limit) || 5;

    let sql = `
      SELECT 
        id,
        title,
        thumbnail,
        created_at
      FROM articles
      WHERE status = 'published'
    `;

    const params = [];
    if (excludeId) {
      sql += ' AND id != ?';
      params.push(excludeId);
    }

    sql += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);

    const [articles] = await pool.query(sql, params);

    // Add full URL to thumbnails
    const articlesWithUrls = articles.map(article => ({
      ...article,
      thumbnail: article.thumbnail ? `${process.env.APP_URL}/uploads/articles/${article.thumbnail}` : null
    }));

    res.json({
      success: true,
      data: articlesWithUrls
    });
  } catch (error) {
    console.error('Error fetching sidebar articles:', error);
    res.status(500).json({ message: 'Gagal mengambil artikel sidebar.' });
  }
};

// Visitor statistics - GET and POST
export const visitorStats = async (req, res) => {
  const statsFile = './visitor_stats.json';

  try {
    // Initialize stats if file doesn't exist
    let stats;
    try {
      const data = await fs.readFile(statsFile, 'utf8');
      stats = JSON.parse(data);
    } catch (err) {
      stats = {
        total_visitors: Math.floor(Math.random() * (20000 - 10000 + 1)) + 10000,
        daily_visitors: 0,
        current_online: 0,
        page_views: 0,
        last_reset_date: new Date().toISOString().split('T')[0],
        sessions: []
      };
    }

    // Reset daily stats if it's a new day
    const today = new Date().toISOString().split('T')[0];
    if (stats.last_reset_date !== today) {
      stats.daily_visitors = 0;
      stats.last_reset_date = today;
      // Keep some sessions from yesterday as "carried over"
      stats.sessions = stats.sessions.slice(-5);
    }

    if (req.method === 'GET') {
      // Return current statistics
      const currentTime = Math.floor(Date.now() / 1000);
      
      // Clean old sessions (older than 30 minutes)
      stats.sessions = stats.sessions.filter(session => 
        (currentTime - session.last_activity) < 1800
      );

      stats.current_online = stats.sessions.length;

      // Add some realistic variation to numbers
      const timeVariation = Math.floor(Math.sin(Date.now() / 3600000) * 5);
      stats.current_online = Math.max(1, stats.current_online + timeVariation + Math.floor(Math.random() * 6) - 2);

      // Calculate page views (roughly 2.5x total visitors)
      stats.page_views = Math.floor(stats.total_visitors * 2.5) + timeVariation * 10;

      // Update file
      await fs.writeFile(statsFile, JSON.stringify(stats, null, 2));

      res.json({
        success: true,
        data: {
          total_visitors: stats.total_visitors,
          daily_visitors: stats.daily_visitors,
          current_online: stats.current_online,
          page_views: stats.page_views,
          last_updated: new Date().toISOString().replace('T', ' ').substr(0, 19)
        }
      });
    } else if (req.method === 'POST') {
      // Track new visitor/session
      const { session_id } = req.body;
      const sessionId = session_id || `session_${Date.now()}_${Math.random()}`;
      const currentTime = Math.floor(Date.now() / 1000);

      // Check if this is a new session
      let isNewSession = true;
      stats.sessions = stats.sessions.map(session => {
        if (session.session_id === sessionId) {
          isNewSession = false;
          return {
            ...session,
            last_activity: currentTime,
            page_views: (session.page_views || 0) + 1
          };
        }
        return session;
      });

      // If new session, add to stats
      if (isNewSession) {
        stats.total_visitors++;
        stats.daily_visitors++;

        stats.sessions.push({
          session_id: sessionId,
          first_visit: currentTime,
          last_activity: currentTime,
          page_views: 1
        });
      }

      // Update file
      await fs.writeFile(statsFile, JSON.stringify(stats, null, 2));

      res.json({
        success: true,
        data: {
          session_id: sessionId,
          total_visitors: stats.total_visitors,
          daily_visitors: stats.daily_visitors
        }
      });
    }
  } catch (error) {
    console.error('Error handling visitor stats:', error);
    res.status(500).json({ message: 'Gagal mengelola statistik pengunjung.' });
  }
};

// Google Drive Albums - List all albums (folders) with photos
export const getGoogleDriveAlbums = async (req, res) => {
  const serviceAccountPath = path.join(__dirname, '../../config/google/bogor-junior-fs-91ae7504dc76.json');
  const rootFolderId = '1ohFEQW-Ou8XYTsk0DUM87S-tGNU-WF0d';
  const cacheFile = './drive_albums_cache.json';
  const cacheTtl = 300000; // 5 minutes in ms

  try {
    // Check cache
    try {
      const stat = await fs.stat(cacheFile);
      if (Date.now() - stat.mtimeMs < cacheTtl) {
        const cached = await fs.readFile(cacheFile, 'utf8');
        return res.json(JSON.parse(cached));
      }
    } catch (err) {
      // Cache doesn't exist or error, continue
    }

    // Setup Google Drive client
    const auth = new google.auth.GoogleAuth({
      keyFile: serviceAccountPath,
      scopes: ['https://www.googleapis.com/auth/drive.readonly']
    });

    const drive = google.drive({ version: 'v3', auth });

    const albums = [];

    // Get all subfolders (albums) in root folder
    let pageToken = null;
    do {
      const response = await drive.files.list({
        q: `'${rootFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: 'nextPageToken, files(id, name)',
        pageSize: 100,
        orderBy: 'name',
        pageToken: pageToken || undefined
      });

      for (const folder of response.data.files) {
        const folderId = folder.id;
        const folderName = folder.name;

        // Get photos in this folder
        const photos = [];
        let photoPageToken = null;
        do {
          const photoResponse = await drive.files.list({
            q: `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`,
            fields: 'nextPageToken, files(id, name, mimeType)',
            pageSize: 100,
            pageToken: photoPageToken || undefined
          });

          for (const file of photoResponse.data.files) {
            photos.push({
              id: file.id,
              name: file.name,
              url: `/api/public/google_drive_image.php?id=${file.id}`
            });
          }

          photoPageToken = photoResponse.data.nextPageToken;
        } while (photoPageToken);

        // Add album if it has photos
        if (photos.length > 0) {
          albums.push({
            id: folderId,
            name: folderName,
            photoCount: photos.length,
            coverPhoto: photos[0].url,
            photos: photos
          });
        }
      }

      pageToken = response.data.nextPageToken;
    } while (pageToken);

    const result = { albums };

    // Save to cache
    await fs.writeFile(cacheFile, JSON.stringify(result, null, 2));

    res.json(result);
  } catch (error) {
    console.error('Error fetching Google Drive albums:', error);
    res.status(500).json({ 
      error: 'Gagal mengambil album dari Google Drive.',
      message: error.message 
    });
  }
};

// Google Drive Photos - List all photos recursively from folder
export const getGoogleDrivePhotos = async (req, res) => {
  const serviceAccountPath = path.join(__dirname, '../../config/google/bogor-junior-fs-91ae7504dc76.json');
  const rootFolderId = '1ohFEQW-Ou8XYTsk0DUM87S-tGNU-WF0d';
  const cacheFile = './drive_photos_cache.json';
  const cacheTtl = 300000; // 5 minutes

  try {
    // Check cache
    try {
      const stat = await fs.stat(cacheFile);
      if (Date.now() - stat.mtimeMs < cacheTtl) {
        const cached = await fs.readFile(cacheFile, 'utf8');
        return res.json(JSON.parse(cached));
      }
    } catch (err) {
      // Cache doesn't exist, continue
    }

    // Setup Google Drive client
    const auth = new google.auth.GoogleAuth({
      keyFile: serviceAccountPath,
      scopes: ['https://www.googleapis.com/auth/drive.readonly']
    });

    const drive = google.drive({ version: 'v3', auth });

    const images = [];

    // Recursive function to scan folders
    const scanFolder = async (folderId) => {
      // Get all subfolders
      let pageToken = null;
      do {
        const response = await drive.files.list({
          q: `'${folderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
          fields: 'nextPageToken, files(id, name)',
          pageSize: 100,
          pageToken: pageToken || undefined
        });

        for (const folder of response.data.files) {
          await scanFolder(folder.id);
        }

        pageToken = response.data.nextPageToken;
      } while (pageToken);

      // Get all images in current folder
      pageToken = null;
      do {
        const response = await drive.files.list({
          q: `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`,
          fields: 'nextPageToken, files(id, name, mimeType)',
          pageSize: 100,
          pageToken: pageToken || undefined
        });

        for (const file of response.data.files) {
          images.push({
            id: file.id,
            name: file.name,
            url: `https://drive.google.com/uc?export=view&id=${file.id}`
          });
        }

        pageToken = response.data.nextPageToken;
      } while (pageToken);
    };

    // Start scanning
    await scanFolder(rootFolderId);

    const result = { data: images };

    // Save to cache
    await fs.writeFile(cacheFile, JSON.stringify(result, null, 2));

    res.json(result);
  } catch (error) {
    console.error('Error fetching Google Drive photos:', error);
    res.status(500).json({ 
      error: 'Gagal mengambil foto dari Google Drive.',
      message: error.message 
    });
  }
};

// Google Drive Image - Proxy to serve individual image
export const getGoogleDriveImage = async (req, res) => {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Image ID required' });
  }

  try {
    const serviceAccountPath = path.join(__dirname, '../../config/google/bogor-junior-fs-91ae7504dc76.json');
    
    const auth = new google.auth.GoogleAuth({
      keyFile: serviceAccountPath,
      scopes: ['https://www.googleapis.com/auth/drive.readonly']
    });

    const drive = google.drive({ version: 'v3', auth });

    // Get file metadata
    const file = await drive.files.get({
      fileId: id,
      fields: 'mimeType'
    });

    // Get file content
    const response = await drive.files.get(
      {
        fileId: id,
        alt: 'media'
      },
      { responseType: 'stream' }
    );

    // Set proper content type
    res.setHeader('Content-Type', file.data.mimeType);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day

    // Pipe the image stream to response
    response.data.pipe(res);
  } catch (error) {
    console.error('Error fetching Google Drive image:', error);
    res.status(500).json({ 
      error: 'Gagal mengambil gambar dari Google Drive.',
      message: error.message 
    });
  }
};
