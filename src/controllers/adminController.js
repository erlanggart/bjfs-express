import prisma from '../config/prisma.js';
import db from '../config/database.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============ ARTICLES MANAGEMENT (Using Prisma) ============

// GET /api/admin/articles - List all articles
export const listArticles = async (req, res, next) => {
  try {
    const articles = await prisma.articles.findMany({
      select: {
        id: true,
        title: true,
        created_at: true,
        author_id: true,
        thumbnail_url: true,
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    res.json({
      success: true,
      articles
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/articles/:id - Get article detail
export const getArticleDetail = async (req, res, next) => {
  try {
    const articleId = req.params.id;

    const [articles] = await db.query(`
      SELECT id, title, content, thumbnail_url, created_at, updated_at
      FROM articles
      WHERE id = ?
    `, [articleId]);

    if (articles.length === 0) {
      return res.status(404).json({ message: 'Artikel tidak ditemukan' });
    }

    res.json({
      success: true,
      article: articles[0]
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/admin/articles - Create new article
export const createArticle = async (req, res, next) => {
  try {
    const { title, content } = req.body;
    const authorId = req.user.id;

    if (!title || !content) {
      return res.status(400).json({ message: 'Judul dan konten tidak boleh kosong' });
    }

    let thumbnailPath = null;
    if (req.file) {
      thumbnailPath = `/uploads/articles/${req.file.filename}`;
    }

    const [result] = await db.query(
      'INSERT INTO articles (title, content, author_id, thumbnail_url) VALUES (?, ?, ?, ?)',
      [title, content, authorId, thumbnailPath]
    );

    res.status(201).json({
      success: true,
      message: 'Artikel berhasil dibuat',
      articleId: result.insertId
    });
  } catch (error) {
    // Cleanup uploaded file on error
    if (req.file) {
      const filePath = path.join(__dirname, '../../uploads/articles', req.file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    next(error);
  }
};

// PUT /api/admin/articles/:id - Update article
export const updateArticle = async (req, res, next) => {
  try {
    const articleId = req.params.id;
    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({ message: 'Judul dan konten tidak boleh kosong' });
    }

    // Get old thumbnail to delete if new one is uploaded
    const [articles] = await db.query(
      'SELECT thumbnail_url FROM articles WHERE id = ?',
      [articleId]
    );

    if (articles.length === 0) {
      return res.status(404).json({ message: 'Artikel tidak ditemukan' });
    }

    let thumbnailPath = articles[0].thumbnail_url;

    // If new thumbnail uploaded
    if (req.file) {
      // Delete old thumbnail
      if (thumbnailPath) {
        const oldPath = path.join(__dirname, '../..', thumbnailPath);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
      thumbnailPath = `/uploads/articles/${req.file.filename}`;
    }

    await db.query(
      'UPDATE articles SET title = ?, content = ?, thumbnail_url = ?, updated_at = NOW() WHERE id = ?',
      [title, content, thumbnailPath, articleId]
    );

    res.json({
      success: true,
      message: 'Artikel berhasil diperbarui'
    });
  } catch (error) {
    // Cleanup uploaded file on error
    if (req.file) {
      const filePath = path.join(__dirname, '../../uploads/articles', req.file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    next(error);
  }
};

// DELETE /api/admin/articles/:id - Delete article
export const deleteArticle = async (req, res, next) => {
  try {
    const articleId = req.params.id;

    // Get thumbnail path to delete file
    const [articles] = await db.query(
      'SELECT thumbnail_url FROM articles WHERE id = ?',
      [articleId]
    );

    if (articles.length === 0) {
      return res.status(404).json({ message: 'Artikel tidak ditemukan' });
    }

    // Delete thumbnail file if exists
    if (articles[0].thumbnail_url) {
      const filePath = path.join(__dirname, '../..', articles[0].thumbnail_url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Delete from database
    await db.query('DELETE FROM articles WHERE id = ?', [articleId]);

    res.json({
      success: true,
      message: 'Artikel berhasil dihapus'
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/admin/articles/upload-image - Upload inline image for article content
export const uploadArticleImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Tidak ada file yang diupload' });
    }

    const imageUrl = `/uploads/content/${req.file.filename}`;
    
    res.json({
      success: true,
      url: imageUrl
    });
  } catch (error) {
    // Cleanup uploaded file on error
    if (req.file) {
      const filePath = path.join(__dirname, '../../uploads/content', req.file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    next(error);
  }
};
