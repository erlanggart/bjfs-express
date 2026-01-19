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

// POST /api/attendance/record.php - Record attendance (QR scan or manual)
export const recordAttendance = async (req, res, next) => {
  try {
    const adminUserId = req.user.id;
    const { schedule_id, member_id, members } = req.body;
    const attendanceDate = new Date().toISOString().split('T')[0];

    if (!schedule_id) {
      return res.status(400).json({ message: 'ID Jadwal diperlukan.' });
    }

    // Get branch_id from admin user
    const [adminData] = await db.query(
      'SELECT branch_id FROM branch_admins WHERE user_id = ?',
      [adminUserId]
    );

    if (adminData.length === 0) {
      return res.status(403).json({ message: 'Admin cabang tidak ditemukan.' });
    }

    const branchId = adminData[0].branch_id;

    // Start transaction
    await db.query('START TRANSACTION');

    try {
      // QR Scan logic - single member
      if (member_id && !Array.isArray(member_id)) {
        if (!member_id) {
          throw new Error('ID Member yang diterima kosong.');
        }

        // Validate member
        const [memberCheck] = await db.query(
          'SELECT COUNT(*) as count FROM members WHERE id = ? AND branch_id = ?',
          [member_id, branchId]
        );

        if (memberCheck[0].count === 0) {
          throw new Error(`Member dengan ID '${member_id}' tidak ditemukan di cabang Anda.`);
        }

        await db.query(
          `INSERT INTO attendance (schedule_id, member_id, recorded_by_user_id, attendance_date, status) 
           VALUES (?, ?, ?, ?, 'hadir') 
           ON DUPLICATE KEY UPDATE status = VALUES(status)`,
          [schedule_id, member_id, adminUserId, attendanceDate]
        );
      }
      // Manual attendance with status - multiple members
      else if (members && Array.isArray(members)) {
        for (const member of members) {
          if (member.id && member.status) {
            await db.query(
              `INSERT INTO attendance (schedule_id, member_id, recorded_by_user_id, attendance_date, status) 
               VALUES (?, ?, ?, ?, ?) 
               ON DUPLICATE KEY UPDATE status = VALUES(status)`,
              [schedule_id, member.id, adminUserId, attendanceDate, member.status]
            );
          }
        }
      } else {
        throw new Error('Data member yang dikirim tidak valid.');
      }

      await db.query('COMMIT');
      res.json({ message: 'Absensi berhasil dicatat.' });
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    res.status(400).json({ message: 'Gagal mencatat absensi: ' + error.message });
  }
};

// POST /api/attendance/admin_record.php - Record branch admin attendance
export const recordAdminAttendance = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { schedule_id, status, notes } = req.body;

    if (!schedule_id || !status) {
      return res.status(400).json({ message: 'Schedule ID dan status diperlukan' });
    }

    const allowedStatuses = ['hadir', 'sakit', 'izin', 'alpa'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: 'Status tidak valid' });
    }

    // Get branch_admin_id
    const [admin] = await db.query(
      'SELECT id FROM branch_admins WHERE user_id = ?',
      [userId]
    );

    if (admin.length === 0) {
      return res.status(404).json({ message: 'Data admin cabang tidak ditemukan' });
    }

    const attendanceDate = new Date().toISOString().split('T')[0];

    // Check existing record
    const [existing] = await db.query(
      `SELECT id FROM admin_attendance 
       WHERE branch_admin_id = ? AND schedule_id = ? AND attendance_date = ?`,
      [admin[0].id, schedule_id, attendanceDate]
    );

    let message;
    if (existing.length > 0) {
      // Update existing
      await db.query(
        `UPDATE admin_attendance 
         SET status = ?, notes = ?, updated_at = NOW() 
         WHERE id = ?`,
        [status, notes || null, existing[0].id]
      );
      message = 'Status attendance berhasil diperbarui';
    } else {
      // Insert new
      await db.query(
        `INSERT INTO admin_attendance (branch_admin_id, schedule_id, attendance_date, status, notes, created_at) 
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [admin[0].id, schedule_id, attendanceDate, status, notes || null]
      );
      message = 'Attendance berhasil dicatat';
    }

    res.json({ message, status });
  } catch (error) {
    next(error);
  }
};

// GET /api/attendance/admin_status.php - Get branch admin attendance status
export const getAdminAttendanceStatus = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { schedule_id } = req.query;

    if (!schedule_id) {
      return res.status(400).json({ message: 'Schedule ID diperlukan' });
    }

    // Get branch_admin_id
    const [admin] = await db.query(
      'SELECT id FROM branch_admins WHERE user_id = ?',
      [userId]
    );

    if (admin.length === 0) {
      return res.status(404).json({ message: 'Data admin cabang tidak ditemukan' });
    }

    const attendanceDate = new Date().toISOString().split('T')[0];

    const [attendance] = await db.query(
      `SELECT status FROM admin_attendance 
       WHERE branch_admin_id = ? AND schedule_id = ? AND attendance_date = ?`,
      [admin[0].id, schedule_id, attendanceDate]
    );

    res.json({
      status: attendance.length > 0 ? attendance[0].status : null,
      has_attendance: attendance.length > 0
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/attendance/list_members.php - List members for attendance
export const listMembersForAttendance = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { schedule_id } = req.query;

    if (!schedule_id) {
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
    const todayDate = new Date().toISOString().split('T')[0];

    // Get schedule details for age filtering
    const [scheduleDetails] = await db.query(
      'SELECT min_age, max_age FROM schedules WHERE id = ?',
      [schedule_id]
    );

    const minAge = scheduleDetails[0]?.min_age;
    const maxAge = scheduleDetails[0]?.max_age;

    let sql = `
      SELECT 
        m.id, m.full_name, m.avatar, a.status AS attendance_status,
        TIMESTAMPDIFF(YEAR, m.date_of_birth, CURDATE()) AS age
      FROM members m
      LEFT JOIN attendance a ON m.id = a.member_id AND a.schedule_id = ? AND a.attendance_date = ?
      WHERE m.branch_id = ? AND m.status = 'active'
    `;
    const params = [schedule_id, todayDate, branchId];

    // Add age filter if defined
    if (minAge !== null && maxAge !== null) {
      sql += ' HAVING age BETWEEN ? AND ?';
      params.push(minAge, maxAge);
    }

    sql += ' ORDER BY m.full_name ASC';

    const [members] = await db.query(sql, params);
    res.json(members);
  } catch (error) {
    next(error);
  }
};

// DELETE /api/attendance/delete_by_session.php - Delete all attendance by session
export const deleteAttendanceBySession = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { schedule_id, attendance_date } = req.body;

    if (!schedule_id || !attendance_date) {
      return res.status(400).json({ message: 'ID Jadwal dan Tanggal Absensi diperlukan.' });
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

    // Security check: ensure schedule belongs to admin's branch
    const [scheduleCheck] = await db.query(
      'SELECT COUNT(*) as count FROM schedules WHERE id = ? AND branch_id = ?',
      [schedule_id, branchId]
    );

    if (scheduleCheck[0].count === 0) {
      return res.status(403).json({ message: 'Anda tidak memiliki akses untuk sesi jadwal ini.' });
    }

    // Delete attendance records
    await db.query(
      'DELETE FROM attendance WHERE schedule_id = ? AND attendance_date = ?',
      [schedule_id, attendance_date]
    );

    res.json({ message: 'Semua data absensi untuk sesi ini telah dihapus.' });
  } catch (error) {
    next(error);
  }
};

// GET /api/attendance/monthly_summary.php - Get monthly attendance summary
export const getMonthlySummary = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const month = req.query.month || new Date().getMonth() + 1;
    const year = req.query.year || new Date().getFullYear();

    // Get branch_id from admin
    const [adminData] = await db.query(
      'SELECT branch_id FROM branch_admins WHERE user_id = ?',
      [userId]
    );

    if (adminData.length === 0) {
      return res.status(403).json({ message: 'Admin cabang tidak ditemukan.' });
    }

    const branchId = adminData[0].branch_id;

    const [sessions] = await db.query(
      `SELECT 
        DATE_FORMAT(a.attendance_date, '%Y-%m-%d') as attendance_date,
        s.id as schedule_id,
        s.age_group,
        s.start_time,
        s.min_age,
        s.max_age
      FROM attendance a
      JOIN schedules s ON a.schedule_id = s.id
      WHERE s.branch_id = ? 
        AND MONTH(a.attendance_date) = ? 
        AND YEAR(a.attendance_date) = ?
      GROUP BY a.attendance_date, s.id, s.age_group, s.start_time, s.min_age, s.max_age
      ORDER BY a.attendance_date ASC, s.start_time ASC`,
      [branchId, month, year]
    );

    res.json(sessions);
  } catch (error) {
    next(error);
  }
};

// GET /api/attendance/report.php - Get attendance report
export const getAttendanceReport = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { schedule_id, date } = req.query;

    if (!schedule_id || !date) {
      return res.status(400).json({ message: 'ID Jadwal dan Tanggal diperlukan.' });
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

    // Get schedule details
    const [scheduleDetails] = await db.query(
      'SELECT min_age, max_age FROM schedules WHERE id = ?',
      [schedule_id]
    );

    if (scheduleDetails.length === 0) {
      return res.status(404).json({ message: 'Jadwal tidak ditemukan.' });
    }

    const minAge = scheduleDetails[0].min_age;
    const maxAge = scheduleDetails[0].max_age;

    let sql = `
      SELECT 
        m.id, 
        m.full_name,
        a.status AS attendance_status,
        TIMESTAMPDIFF(YEAR, m.date_of_birth, CURDATE()) AS age
      FROM members m
      LEFT JOIN attendance a ON m.id = a.member_id AND a.schedule_id = ? AND a.attendance_date = ?
      WHERE m.branch_id = ? AND m.status = 'active'
    `;
    const params = [schedule_id, date, branchId];

    // Add age filter if defined
    if (minAge !== null && maxAge !== null) {
      sql += ' HAVING age BETWEEN ? AND ?';
      params.push(minAge, maxAge);
    }

    sql += ' ORDER BY m.full_name ASC';

    const [members] = await db.query(sql, params);
    res.json(members);
  } catch (error) {
    next(error);
  }
};
