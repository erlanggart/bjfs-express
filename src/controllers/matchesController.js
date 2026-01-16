import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const prisma = new PrismaClient();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// PUBLIC: Get matches list for landing page
export const listPublicMatches = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || undefined;

    const matches = await prisma.matches.findMany({
      orderBy: {
        match_date: 'desc'
      },
      take: limit,
      include: {
        match_photos: {
          select: {
            id: true,
            photo_url: true
          }
        }
      }
    });

    // Add APP_URL to photo URLs
    const appUrl = process.env.APP_URL || '';
    const matchesWithUrls = matches.map(match => ({
      ...match,
      match_photos: match.match_photos.map(photo => ({
        ...photo,
        photo_url: appUrl + photo.photo_url
      }))
    }));

    res.json(matchesWithUrls);
  } catch (error) {
    console.error('Error fetching public matches:', error);
    res.status(500).json({ 
      message: 'Gagal mengambil data pertandingan.',
      error: error.message 
    });
  }
};

// PUBLIC: Get match detail for public view
export const getPublicMatchDetail = async (req, res) => {
  try {
    const matchId = parseInt(req.params.id);

    if (!matchId || isNaN(matchId)) {
      return res.status(400).json({ message: 'ID Pertandingan tidak valid.' });
    }

    const match = await prisma.matches.findUnique({
      where: { id: matchId },
      include: {
        match_lineups: {
          select: {
            id: true,
            team_name: true,
            member_id: true,
            player_name: true,
            is_bjfs_player: true
          }
        },
        match_scorers: {
          include: {
            match_lineups: {
              select: {
                player_name: true,
                team_name: true
              }
            }
          }
        },
        match_photos: {
          select: {
            id: true,
            photo_url: true
          }
        }
      }
    });

    if (!match) {
      return res.status(404).json({ message: 'Pertandingan tidak ditemukan.' });
    }

    // Add APP_URL to photo URLs
    const appUrl = process.env.APP_URL || '';
    
    // Group lineups by team
    const lineups = {
      team_a: match.match_lineups.filter(l => l.team_name === match.team_a_name),
      team_b: match.match_lineups.filter(l => l.team_name === match.team_b_name)
    };

    // Group scorers by team with player names
    const scorers = {
      team_a: match.match_scorers
        .filter(s => s.match_lineups.team_name === match.team_a_name)
        .map(s => ({
          player_name: s.match_lineups.player_name,
          goals_scored: s.goals_scored
        })),
      team_b: match.match_scorers
        .filter(s => s.match_lineups.team_name === match.team_b_name)
        .map(s => ({
          player_name: s.match_lineups.player_name,
          goals_scored: s.goals_scored
        }))
    };

    res.json({
      match_info: {
        id: match.id,
        event_name: match.event_name,
        team_a_name: match.team_a_name,
        team_b_name: match.team_b_name,
        score_a: match.score_a,
        score_b: match.score_b,
        match_date: match.match_date,
        created_at: match.created_at
      },
      lineups,
      scorers,
      photos: match.match_photos.map(photo => ({
        ...photo,
        photo_url: appUrl + photo.photo_url
      }))
    });
  } catch (error) {
    console.error('Error fetching public match detail:', error);
    res.status(500).json({ 
      message: 'Gagal mengambil detail pertandingan.',
      error: error.message 
    });
  }
};

// ADMIN: List all matches
export const listMatches = async (req, res) => {
  try {
    const matches = await prisma.matches.findMany({
      orderBy: {
        match_date: 'desc'
      },
      include: {
        match_photos: {
          select: {
            id: true,
            photo_url: true
          }
        },
        users: {
          select: {
            id: true,
            username: true
          }
        }
      }
    });

    // Add APP_URL to photo URLs
    const appUrl = process.env.APP_URL || '';
    const matchesWithUrls = matches.map(match => ({
      ...match,
      match_photos: match.match_photos.map(photo => ({
        ...photo,
        photo_url: appUrl + photo.photo_url
      }))
    }));

    res.json(matchesWithUrls);
  } catch (error) {
    console.error('Error fetching matches:', error);
    res.status(500).json({ 
      message: 'Gagal mengambil data pertandingan.',
      error: error.message 
    });
  }
};

// ADMIN: Get match detail
export const getMatchDetail = async (req, res) => {
  try {
    const matchId = parseInt(req.params.id);

    if (!matchId || isNaN(matchId)) {
      return res.status(400).json({ message: 'ID Pertandingan tidak valid.' });
    }

    const match = await prisma.matches.findUnique({
      where: { id: matchId },
      include: {
        match_lineups: {
          select: {
            id: true,
            team_name: true,
            member_id: true,
            player_name: true,
            is_bjfs_player: true
          }
        },
        match_scorers: {
          select: {
            lineup_id: true,
            goals_scored: true
          }
        },
        match_photos: {
          select: {
            id: true,
            photo_url: true
          }
        }
      }
    });

    if (!match) {
      return res.status(404).json({ message: 'Pertandingan tidak ditemukan.' });
    }

    // Add APP_URL to photo URLs
    const appUrl = process.env.APP_URL || '';
    const matchWithUrls = {
      ...match,
      match_photos: match.match_photos.map(photo => ({
        ...photo,
        photo_url: appUrl + photo.photo_url
      }))
    };

    res.json({
      match_info: {
        id: matchWithUrls.id,
        event_name: matchWithUrls.event_name,
        team_a_name: matchWithUrls.team_a_name,
        team_b_name: matchWithUrls.team_b_name,
        score_a: matchWithUrls.score_a,
        score_b: matchWithUrls.score_b,
        match_date: matchWithUrls.match_date,
        created_by_user_id: matchWithUrls.created_by_user_id,
        created_at: matchWithUrls.created_at
      },
      lineups: matchWithUrls.match_lineups,
      scorers: matchWithUrls.match_scorers,
      photos: matchWithUrls.match_photos
    });
  } catch (error) {
    console.error('Error fetching match detail:', error);
    res.status(500).json({ 
      message: 'Gagal mengambil detail pertandingan.',
      error: error.message 
    });
  }
};

// ADMIN: Create match
export const createMatch = async (req, res) => {
  try {
    const { 
      event_name, 
      team_a_name, 
      team_b_name, 
      score_a, 
      score_b, 
      match_date,
      lineup_a,
      lineup_b,
      scorers
    } = req.body;

    const userId = req.user.id;

    // Parse JSON strings
    const lineupAData = typeof lineup_a === 'string' ? JSON.parse(lineup_a) : lineup_a;
    const lineupBData = typeof lineup_b === 'string' ? JSON.parse(lineup_b) : lineup_b;
    const scorersData = typeof scorers === 'string' ? JSON.parse(scorers) : scorers;

    // Create match with transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create match
      const match = await tx.matches.create({
        data: {
          event_name,
          team_a_name,
          team_b_name,
          score_a: parseInt(score_a),
          score_b: parseInt(score_b),
          match_date: new Date(match_date),
          created_by_user_id: userId
        }
      });

      // 2. Create lineups and map IDs
      const lineupIdMap = {};

      if (lineupAData && Array.isArray(lineupAData)) {
        for (const player of lineupAData) {
          const lineup = await tx.match_lineups.create({
            data: {
              match_id: match.id,
              team_name: team_a_name,
              member_id: player.member_id || null,
              player_name: player.player_name,
              is_bjfs_player: player.is_bjfs_player || false
            }
          });
          lineupIdMap[player.id] = lineup.id;
        }
      }

      if (lineupBData && Array.isArray(lineupBData)) {
        for (const player of lineupBData) {
          const lineup = await tx.match_lineups.create({
            data: {
              match_id: match.id,
              team_name: team_b_name,
              member_id: player.member_id || null,
              player_name: player.player_name,
              is_bjfs_player: player.is_bjfs_player || false
            }
          });
          lineupIdMap[player.id] = lineup.id;
        }
      }

      // 3. Create scorers
      if (scorersData && Array.isArray(scorersData)) {
        for (const scorer of scorersData) {
          const lineupId = lineupIdMap[scorer.lineup_player_id];
          const goals = parseInt(scorer.goals) || 1;
          
          if (lineupId) {
            await tx.match_scorers.create({
              data: {
                match_id: match.id,
                lineup_id: lineupId,
                goals_scored: goals
              }
            });
          }
        }
      }

      // 4. Handle photo uploads
      if (req.files && req.files.length > 0) {
        const uploadDir = path.join(__dirname, '../../uploads/matches/');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        for (const file of req.files) {
          const fileName = `${Date.now()}_${file.originalname}`;
          const filePath = path.join(uploadDir, fileName);
          fs.renameSync(file.path, filePath);

          const photoUrl = `/uploads/matches/${fileName}`;
          await tx.match_photos.create({
            data: {
              match_id: match.id,
              photo_url: photoUrl
            }
          });
        }
      }

      return match;
    });

    res.status(201).json({ 
      message: 'Pertandingan berhasil ditambahkan.',
      match_id: result.id 
    });
  } catch (error) {
    console.error('Error creating match:', error);
    res.status(500).json({ 
      message: 'Gagal menambahkan pertandingan.',
      error: error.message 
    });
  }
};

// ADMIN: Update match
export const updateMatch = async (req, res) => {
  try {
    const matchId = parseInt(req.body.id);
    const { 
      event_name, 
      team_a_name, 
      team_b_name, 
      score_a, 
      score_b, 
      match_date,
      lineup_a,
      lineup_b,
      scorers,
      photos_to_delete
    } = req.body;

    if (!matchId || isNaN(matchId)) {
      return res.status(400).json({ message: 'ID Pertandingan tidak valid.' });
    }

    // Parse JSON strings
    const lineupAData = typeof lineup_a === 'string' ? JSON.parse(lineup_a) : lineup_a;
    const lineupBData = typeof lineup_b === 'string' ? JSON.parse(lineup_b) : lineup_b;
    const scorersData = typeof scorers === 'string' ? JSON.parse(scorers) : scorers;
    const photosToDelete = photos_to_delete ? 
      (typeof photos_to_delete === 'string' ? JSON.parse(photos_to_delete) : photos_to_delete) : 
      [];

    await prisma.$transaction(async (tx) => {
      // 1. Update match info
      await tx.matches.update({
        where: { id: matchId },
        data: {
          event_name,
          team_a_name,
          team_b_name,
          score_a: parseInt(score_a),
          score_b: parseInt(score_b),
          match_date: new Date(match_date)
        }
      });

      // 2. Delete old lineups and scorers
      await tx.match_scorers.deleteMany({
        where: { match_id: matchId }
      });
      await tx.match_lineups.deleteMany({
        where: { match_id: matchId }
      });

      // 3. Create new lineups and map IDs
      const lineupIdMap = {};

      if (lineupAData && Array.isArray(lineupAData)) {
        for (const player of lineupAData) {
          const lineup = await tx.match_lineups.create({
            data: {
              match_id: matchId,
              team_name: team_a_name,
              member_id: player.member_id || null,
              player_name: player.player_name,
              is_bjfs_player: player.is_bjfs_player || false
            }
          });
          lineupIdMap[player.id] = lineup.id;
        }
      }

      if (lineupBData && Array.isArray(lineupBData)) {
        for (const player of lineupBData) {
          const lineup = await tx.match_lineups.create({
            data: {
              match_id: matchId,
              team_name: team_b_name,
              member_id: player.member_id || null,
              player_name: player.player_name,
              is_bjfs_player: player.is_bjfs_player || false
            }
          });
          lineupIdMap[player.id] = lineup.id;
        }
      }

      // 4. Create scorers
      if (scorersData && Array.isArray(scorersData)) {
        for (const scorer of scorersData) {
          const lineupId = lineupIdMap[scorer.lineup_player_id];
          const goals = parseInt(scorer.goals) || 1;
          
          if (lineupId) {
            await tx.match_scorers.create({
              data: {
                match_id: matchId,
                lineup_id: lineupId,
                goals_scored: goals
              }
            });
          }
        }
      }

      // 5. Delete photos marked for deletion
      if (photosToDelete && Array.isArray(photosToDelete) && photosToDelete.length > 0) {
        const photos = await tx.match_photos.findMany({
          where: {
            id: { in: photosToDelete.map(id => parseInt(id)) }
          }
        });

        for (const photo of photos) {
          const filePath = path.join(__dirname, '../..', photo.photo_url);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }

        await tx.match_photos.deleteMany({
          where: {
            id: { in: photosToDelete.map(id => parseInt(id)) }
          }
        });
      }

      // 6. Add new photos
      if (req.files && req.files.length > 0) {
        const uploadDir = path.join(__dirname, '../../uploads/matches/');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        for (const file of req.files) {
          const fileName = `${Date.now()}_${file.originalname}`;
          const filePath = path.join(uploadDir, fileName);
          fs.renameSync(file.path, filePath);

          const photoUrl = `/uploads/matches/${fileName}`;
          await tx.match_photos.create({
            data: {
              match_id: matchId,
              photo_url: photoUrl
            }
          });
        }
      }
    });

    res.json({ message: 'Pertandingan berhasil diperbarui.' });
  } catch (error) {
    console.error('Error updating match:', error);
    res.status(500).json({ 
      message: 'Gagal memperbarui pertandingan.',
      error: error.message 
    });
  }
};

// ADMIN: Delete match
export const deleteMatch = async (req, res) => {
  try {
    const matchId = parseInt(req.params.id);

    if (!matchId || isNaN(matchId)) {
      return res.status(400).json({ message: 'ID Pertandingan tidak valid.' });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Get all photos to delete files
      const photos = await tx.match_photos.findMany({
        where: { match_id: matchId }
      });

      // 2. Delete photo files from server
      for (const photo of photos) {
        const filePath = path.join(__dirname, '../..', photo.photo_url);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      // 3. Delete match (cascade will delete related records)
      await tx.matches.delete({
        where: { id: matchId }
      });
    });

    res.json({ message: 'Pertandingan dan semua data terkait berhasil dihapus.' });
  } catch (error) {
    console.error('Error deleting match:', error);
    res.status(500).json({ 
      message: 'Gagal menghapus pertandingan.',
      error: error.message 
    });
  }
};

// ADMIN: List members for lineup selection
export const listMembersForLineup = async (req, res) => {
  try {
    const search = req.query.search || '';

    const members = await prisma.members.findMany({
      where: {
        status: 'active',
        ...(search && {
          full_name: {
            contains: search
          }
        })
      },
      select: {
        id: true,
        full_name: true,
        branches: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        full_name: 'asc'
      },
      take: 20
    });

    const formattedMembers = members.map(member => ({
      id: member.id,
      full_name: member.full_name,
      branch_name: member.branches?.name || ''
    }));

    res.json(formattedMembers);
  } catch (error) {
    console.error('Error fetching members for lineup:', error);
    res.status(500).json({ 
      message: 'Gagal mengambil daftar member.',
      error: error.message 
    });
  }
};
