import db from '../config/database.js';

// GET /api/feedback/list.php - Get feedback list
export const listFeedback = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    let sql = `
      SELECT 
        f.id, f.content, f.status, f.submitted_at,
        f.reply_content, f.replied_at,
        m.id as member_id, m.full_name as member_name,
        m.avatar as member_avatar,
        b.name as branch_name,
        u_replier.username as replier_username
      FROM feedback f
      JOIN members m ON f.member_id = m.id
      JOIN branches b ON m.branch_id = b.id
      LEFT JOIN users u_replier ON f.replied_by_user_id = u_replier.id
    `;
    const params = [];

    // Filter by branch for admin_cabang
    if (role === 'admin_cabang') {
      const [adminData] = await db.query(
        'SELECT branch_id FROM branch_admins WHERE user_id = ?',
        [userId]
      );

      if (adminData.length === 0) {
        return res.status(403).json({ message: 'Admin cabang tidak terdaftar di cabang manapun.' });
      }

      const branchId = adminData[0].branch_id;
      sql += ' WHERE m.branch_id = ?';
      params.push(branchId);
    }

    sql += ' ORDER BY f.submitted_at DESC';

    const [feedbackList] = await db.query(sql, params);

    // Add full avatar URL
    const appUrl = process.env.APP_URL || '';
    const formattedList = feedbackList.map(item => ({
      ...item,
      member_avatar: item.member_avatar ? `${appUrl}${item.member_avatar}` : null
    }));

    res.json(formattedList);
  } catch (error) {
    next(error);
  }
};

// PUT /api/feedback/:id/status - Update feedback status
export const updateFeedbackStatus = async (req, res, next) => {
  try {
    // Support both REST (:id param) and legacy (body.id)
    const id = req.params.id || req.body.id;
    const { status } = req.body;

    if (!id || !status) {
      return res.status(400).json({ message: 'ID feedback dan status baru diperlukan.' });
    }

    const validStatuses = ['unread', 'read', 'archived'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Status tidak valid.' });
    }

    await db.query(
      'UPDATE feedback SET status = ? WHERE id = ?',
      [status, id]
    );

    res.json({ message: 'Status feedback berhasil diperbarui.' });
  } catch (error) {
    next(error);
  }
};

// POST /api/feedback/:id/reply - Reply to feedback
export const replyToFeedback = async (req, res, next) => {
  try {
    const userId = req.user.id;
    // Support both REST (:id param) and legacy (body.feedback_id)
    const feedbackId = req.params.id || req.body.feedback_id;
    const { reply_content } = req.body;

    if (!feedbackId || !reply_content || !reply_content.trim()) {
      return res.status(400).json({ message: 'ID feedback dan isi balasan diperlukan.' });
    }

    await db.query(
      `UPDATE feedback 
       SET reply_content = ?, replied_by_user_id = ?, replied_at = NOW(), status = 'read' 
       WHERE id = ?`,
      [reply_content, userId, feedbackId]
    );

    res.json({ message: 'Balasan berhasil dikirim.' });
  } catch (error) {
    next(error);
  }
};
