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
