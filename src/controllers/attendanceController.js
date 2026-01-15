import db from '../config/database.js';

export const getAttendance = async (req, res, next) => {
  try {
    const { branch_id, date_from, date_to, member_id } = req.query;
    
    let query = `
      SELECT 
        a.*,
        m.full_name as member_name,
        b.branch_name,
        s.schedule_date,
        s.schedule_time
      FROM attendance a
      LEFT JOIN members m ON a.member_id = m.id
      LEFT JOIN branches b ON a.branch_id = b.id
      LEFT JOIN schedules s ON a.schedule_id = s.id
      WHERE 1=1
    `;
    const params = [];

    if (branch_id) {
      query += ' AND a.branch_id = ?';
      params.push(branch_id);
    }

    if (date_from) {
      query += ' AND DATE(a.check_in_time) >= ?';
      params.push(date_from);
    }

    if (date_to) {
      query += ' AND DATE(a.check_in_time) <= ?';
      params.push(date_to);
    }

    if (member_id) {
      query += ' AND a.member_id = ?';
      params.push(member_id);
    }

    query += ' ORDER BY a.check_in_time DESC';

    const [attendance] = await db.query(query, params);
    res.json({ success: true, data: attendance });
  } catch (error) {
    next(error);
  }
};

export const markAttendance = async (req, res, next) => {
  try {
    const {
      member_id,
      branch_id,
      schedule_id,
      attendance_date,
      status = 'present',
      notes,
    } = req.body;

    if (!member_id || !branch_id) {
      return res.status(400).json({ message: 'member_id dan branch_id diperlukan' });
    }

    const check_in_time = new Date();

    const [result] = await db.query(`
      INSERT INTO attendance (
        member_id, branch_id, schedule_id, attendance_date,
        check_in_time, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      member_id,
      branch_id,
      schedule_id,
      attendance_date || check_in_time,
      check_in_time,
      status,
      notes,
    ]);

    res.status(201).json({
      success: true,
      message: 'Attendance berhasil dicatat',
      data: { id: result.insertId },
    });
  } catch (error) {
    next(error);
  }
};

export const getAttendanceStats = async (req, res, next) => {
  try {
    const { branch_id, month, year } = req.query;

    let query = `
      SELECT 
        COUNT(DISTINCT a.member_id) as total_members,
        COUNT(a.id) as total_attendance,
        COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_count,
        COUNT(CASE WHEN a.status = 'late' THEN 1 END) as late_count,
        COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent_count
      FROM attendance a
      WHERE 1=1
    `;
    const params = [];

    if (branch_id) {
      query += ' AND a.branch_id = ?';
      params.push(branch_id);
    }

    if (month && year) {
      query += ' AND MONTH(a.attendance_date) = ? AND YEAR(a.attendance_date) = ?';
      params.push(month, year);
    }

    const [stats] = await db.query(query, params);
    res.json({ success: true, data: stats[0] });
  } catch (error) {
    next(error);
  }
};
