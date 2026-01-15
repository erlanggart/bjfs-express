import db from '../config/database.js';

export const getAllMembers = async (req, res, next) => {
  try {
    const { branch_id, status } = req.query;
    
    let query = `
      SELECT 
        m.*,
        b.branch_name,
        u.username,
        u.email
      FROM members m
      LEFT JOIN branches b ON m.branch_id = b.id
      LEFT JOIN users u ON m.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (branch_id) {
      query += ' AND m.branch_id = ?';
      params.push(branch_id);
    }

    if (status) {
      query += ' AND m.status = ?';
      params.push(status);
    }

    query += ' ORDER BY m.full_name ASC';

    const [members] = await db.query(query, params);
    res.json({ success: true, data: members });
  } catch (error) {
    next(error);
  }
};

export const getMemberById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [members] = await db.query(`
      SELECT 
        m.*,
        b.branch_name,
        u.username,
        u.email
      FROM members m
      LEFT JOIN branches b ON m.branch_id = b.id
      LEFT JOIN users u ON m.user_id = u.id
      WHERE m.id = ?
    `, [id]);

    if (members.length === 0) {
      return res.status(404).json({ message: 'Member tidak ditemukan' });
    }

    res.json({ success: true, data: members[0] });
  } catch (error) {
    next(error);
  }
};

export const createMember = async (req, res, next) => {
  try {
    const {
      full_name,
      date_of_birth,
      address,
      phone,
      parent_name,
      parent_phone,
      branch_id,
      status = 'active',
      user_id,
    } = req.body;

    // Validate required fields
    if (!full_name || !date_of_birth || !branch_id) {
      return res.status(400).json({ message: 'Field yang diperlukan tidak lengkap' });
    }

    const [result] = await db.query(`
      INSERT INTO members (
        full_name, date_of_birth, address, phone, 
        parent_name, parent_phone, branch_id, status, user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      full_name,
      date_of_birth,
      address,
      phone,
      parent_name,
      parent_phone,
      branch_id,
      status,
      user_id,
    ]);

    res.status(201).json({
      success: true,
      message: 'Member berhasil ditambahkan',
      data: { id: result.insertId },
    });
  } catch (error) {
    next(error);
  }
};

export const updateMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Build dynamic update query
    const fields = Object.keys(updates);
    const values = Object.values(updates);

    if (fields.length === 0) {
      return res.status(400).json({ message: 'Tidak ada data untuk diupdate' });
    }

    const setClause = fields.map(field => `${field} = ?`).join(', ');
    values.push(id);

    const [result] = await db.query(
      `UPDATE members SET ${setClause} WHERE id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Member tidak ditemukan' });
    }

    res.json({
      success: true,
      message: 'Member berhasil diupdate',
    });
  } catch (error) {
    next(error);
  }
};

export const deleteMember = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [result] = await db.query('DELETE FROM members WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Member tidak ditemukan' });
    }

    res.json({
      success: true,
      message: 'Member berhasil dihapus',
    });
  } catch (error) {
    next(error);
  }
};
