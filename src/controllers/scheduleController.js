import db from '../config/database.js';

export const getAllSchedules = async (req, res, next) => {
  try {
    const { branch_id, is_active } = req.query;
    
    let query = `
      SELECT 
        s.*,
        b.branch_name
      FROM schedules s
      LEFT JOIN branches b ON s.branch_id = b.id
      WHERE 1=1
    `;
    const params = [];

    if (branch_id) {
      query += ' AND s.branch_id = ?';
      params.push(branch_id);
    }

    if (is_active !== undefined) {
      query += ' AND s.is_active = ?';
      params.push(is_active);
    }

    query += ' ORDER BY s.schedule_date DESC, s.schedule_time ASC';

    const [schedules] = await db.query(query, params);
    res.json({ success: true, data: schedules });
  } catch (error) {
    next(error);
  }
};

export const getScheduleById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [schedules] = await db.query(`
      SELECT 
        s.*,
        b.branch_name
      FROM schedules s
      LEFT JOIN branches b ON s.branch_id = b.id
      WHERE s.id = ?
    `, [id]);

    if (schedules.length === 0) {
      return res.status(404).json({ message: 'Schedule tidak ditemukan' });
    }

    res.json({ success: true, data: schedules[0] });
  } catch (error) {
    next(error);
  }
};

export const createSchedule = async (req, res, next) => {
  try {
    const {
      branch_id,
      schedule_date,
      schedule_time,
      activity_type,
      notes,
      is_active = 1,
    } = req.body;

    if (!branch_id || !schedule_date || !schedule_time) {
      return res.status(400).json({ message: 'Field yang diperlukan tidak lengkap' });
    }

    const [result] = await db.query(`
      INSERT INTO schedules (
        branch_id, schedule_date, schedule_time, 
        activity_type, notes, is_active
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [branch_id, schedule_date, schedule_time, activity_type, notes, is_active]);

    res.status(201).json({
      success: true,
      message: 'Schedule berhasil ditambahkan',
      data: { id: result.insertId },
    });
  } catch (error) {
    next(error);
  }
};

export const updateSchedule = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const fields = Object.keys(updates);
    const values = Object.values(updates);

    if (fields.length === 0) {
      return res.status(400).json({ message: 'Tidak ada data untuk diupdate' });
    }

    const setClause = fields.map(field => `${field} = ?`).join(', ');
    values.push(id);

    const [result] = await db.query(
      `UPDATE schedules SET ${setClause} WHERE id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Schedule tidak ditemukan' });
    }

    res.json({ success: true, message: 'Schedule berhasil diupdate' });
  } catch (error) {
    next(error);
  }
};

export const deleteSchedule = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [result] = await db.query('DELETE FROM schedules WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Schedule tidak ditemukan' });
    }

    res.json({ success: true, message: 'Schedule berhasil dihapus' });
  } catch (error) {
    next(error);
  }
};

// PHP-compatible schedule endpoints

// POST /api/schedules/create.php - Create schedule
export const createSchedulePHP = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { age_group, day_of_week, start_time, end_time, location, min_age, max_age } = req.body;

    if (!age_group || !day_of_week || !start_time || !end_time) {
      return res.status(400).json({ message: 'Data jadwal tidak lengkap.' });
    }

    // Get branch_id from admin
    const [adminData] = await db.query(
      'SELECT branch_id FROM branch_admins WHERE user_id = ?',
      [userId]
    );

    if (adminData.length === 0) {
      return res.status(403).json({ message: 'Admin cabang tidak ditemukan.' });
    }

    const branchId = adminData[0].branch_id;

    // Generate UUID for schedule
    const crypto = await import('crypto');
    const scheduleId = 'SCH-' + crypto.randomBytes(6).toString('hex');

    await db.query(
      `INSERT INTO schedules (id, branch_id, age_group, day_of_week, start_time, end_time, location, min_age, max_age) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [scheduleId, branchId, age_group, day_of_week, start_time, end_time, location || '', min_age || null, max_age || null]
    );

    res.status(201).json({ message: 'Jadwal baru berhasil dibuat.' });
  } catch (error) {
    next(error);
  }
};

// PUT /api/schedules/update.php - Update schedule
export const updateSchedulePHP = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id, age_group, day_of_week, start_time, end_time, location, min_age, max_age } = req.body;

    if (!id || !age_group || !day_of_week || !start_time || !end_time) {
      return res.status(400).json({ message: 'Data jadwal tidak lengkap.' });
    }

    // Get branch_id from admin
    const [adminData] = await db.query(
      'SELECT branch_id FROM branch_admins WHERE user_id = ?',
      [userId]
    );

    if (adminData.length === 0) {
      return res.status(403).json({ message: 'Admin cabang tidak ditemukan.' });
    }

    const branchId = adminData[0].branch_id;

    // Verify schedule belongs to admin's branch
    const [scheduleCheck] = await db.query(
      'SELECT COUNT(*) as count FROM schedules WHERE id = ? AND branch_id = ?',
      [id, branchId]
    );

    if (scheduleCheck[0].count === 0) {
      return res.status(403).json({ message: 'Anda tidak memiliki akses untuk mengubah jadwal ini.' });
    }

    await db.query(
      `UPDATE schedules 
       SET age_group = ?, day_of_week = ?, start_time = ?, end_time = ?, location = ?, min_age = ?, max_age = ? 
       WHERE id = ?`,
      [age_group, day_of_week, start_time, end_time, location || '', min_age || null, max_age || null, id]
    );

    res.json({ message: 'Jadwal berhasil diperbarui.' });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/schedules/delete.php - Delete schedule  
export const deleteSchedulePHP = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ message: 'ID Jadwal diperlukan.' });
    }

    // Get branch_id from admin
    const [adminData] = await db.query(
      'SELECT branch_id FROM branch_admins WHERE user_id = ?',
      [userId]
    );

    if (adminData.length === 0) {
      return res.status(403).json({ message: 'Admin cabang tidak ditemukan.' });
    }

    const branchId = adminData[0].branch_id;

    // Verify schedule belongs to admin's branch
    const [scheduleCheck] = await db.query(
      'SELECT COUNT(*) as count FROM schedules WHERE id = ? AND branch_id = ?',
      [id, branchId]
    );

    if (scheduleCheck[0].count === 0) {
      return res.status(403).json({ message: 'Anda tidak memiliki akses untuk menghapus jadwal ini.' });
    }

    await db.query('DELETE FROM schedules WHERE id = ?', [id]);

    res.json({ message: 'Jadwal berhasil dihapus.' });
  } catch (error) {
    next(error);
  }
};

// GET /api/schedules/today.php - Get today's schedules
export const getTodaySchedules = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get branch_id from admin
    const [adminData] = await db.query(
      'SELECT branch_id FROM branch_admins WHERE user_id = ?',
      [userId]
    );

    if (adminData.length === 0) {
      return res.status(403).json({ message: 'Admin cabang tidak ditemukan.' });
    }

    const branchId = adminData[0].branch_id;

    // Map day names
    const dayMap = {
      'Sunday': 'Minggu',
      'Monday': 'Senin',
      'Tuesday': 'Selasa',
      'Wednesday': 'Rabu',
      'Thursday': 'Kamis',
      'Friday': 'Jumat',
      'Saturday': 'Sabtu'
    };

    const today = dayMap[new Date().toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Jakarta' })];

    const [schedules] = await db.query(
      `SELECT id, age_group, start_time, end_time, location 
       FROM schedules 
       WHERE branch_id = ? AND day_of_week = ? AND is_active = 1 
       ORDER BY start_time ASC`,
      [branchId, today]
    );

    res.json(schedules);
  } catch (error) {
    next(error);
  }
};

// GET /api/schedules/list_by_branch.php - Get all schedules by branch
export const getSchedulesByBranch = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get branch_id from admin
    const [adminData] = await db.query(
      'SELECT branch_id FROM branch_admins WHERE user_id = ?',
      [userId]
    );

    if (adminData.length === 0) {
      return res.status(403).json({ message: 'Admin cabang tidak ditemukan.' });
    }

    const branchId = adminData[0].branch_id;

    const [schedules] = await db.query(
      `SELECT 
        id, branch_id, age_group, day_of_week, start_time, end_time, 
        location, min_age, max_age, is_active, created_at
       FROM schedules 
       WHERE branch_id = ? 
       ORDER BY is_active DESC, day_of_week, start_time`,
      [branchId]
    );

    res.json(schedules);
  } catch (error) {
    next(error);
  }
};

// GET /api/schedules/by_date.php - Get schedules by date
export const getSchedulesByDate = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const date = req.query.date || new Date().toISOString().split('T')[0];

    // Get branch_id from admin
    const [adminData] = await db.query(
      'SELECT branch_id FROM branch_admins WHERE user_id = ?',
      [userId]
    );

    if (adminData.length === 0) {
      return res.status(403).json({ message: 'Admin cabang tidak ditemukan.' });
    }

    const branchId = adminData[0].branch_id;

    // Map day names
    const dayMap = {
      'Sunday': 'Minggu',
      'Monday': 'Senin',
      'Tuesday': 'Selasa',
      'Wednesday': 'Rabu',
      'Thursday': 'Kamis',
      'Friday': 'Jumat',
      'Saturday': 'Sabtu'
    };

    const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Jakarta' });
    const dayInIndonesian = dayMap[dayOfWeek];

    const [schedules] = await db.query(
      `SELECT id, age_group, start_time, end_time 
       FROM schedules 
       WHERE branch_id = ? AND day_of_week = ? 
       ORDER BY start_time ASC`,
      [branchId, dayInIndonesian]
    );

    res.json(schedules);
  } catch (error) {
    next(error);
  }
};

// POST /api/schedules/toggle_status.php - Toggle schedule status
export const toggleScheduleStatus = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ message: 'Schedule ID is required.' });
    }

    // Get branch_id from admin
    const [adminData] = await db.query(
      'SELECT branch_id FROM branch_admins WHERE user_id = ?',
      [userId]
    );

    if (adminData.length === 0) {
      return res.status(403).json({ message: 'Admin cabang tidak ditemukan.' });
    }

    const branchId = adminData[0].branch_id;

    // Get current schedule
    const [schedule] = await db.query(
      'SELECT id, is_active FROM schedules WHERE id = ? AND branch_id = ?',
      [id, branchId]
    );

    if (schedule.length === 0) {
      return res.status(404).json({ message: 'Schedule not found or access denied.' });
    }

    // Toggle status
    const newStatus = schedule[0].is_active === 1 ? 0 : 1;

    await db.query(
      'UPDATE schedules SET is_active = ? WHERE id = ?',
      [newStatus, id]
    );

    res.json({
      message: 'Schedule status updated successfully.',
      is_active: newStatus
    });
  } catch (error) {
    next(error);
  }
};
