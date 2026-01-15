import db from '../config/database.js';

export const getAllBranches = async (req, res, next) => {
  try {
    const [branches] = await db.query(`
      SELECT 
        b.*,
        COUNT(DISTINCT m.id) as total_members,
        COUNT(DISTINCT ba.id) as total_admins
      FROM branches b
      LEFT JOIN members m ON b.id = m.branch_id AND m.status = 'active'
      LEFT JOIN branch_admins ba ON b.id = ba.branch_id
      GROUP BY b.id
      ORDER BY b.branch_name ASC
    `);

    res.json({ success: true, data: branches });
  } catch (error) {
    next(error);
  }
};

export const getBranchById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [branches] = await db.query(`
      SELECT 
        b.*,
        COUNT(DISTINCT m.id) as total_members,
        COUNT(DISTINCT ba.id) as total_admins
      FROM branches b
      LEFT JOIN members m ON b.id = m.branch_id AND m.status = 'active'
      LEFT JOIN branch_admins ba ON b.id = ba.branch_id
      WHERE b.id = ?
      GROUP BY b.id
    `, [id]);

    if (branches.length === 0) {
      return res.status(404).json({ message: 'Branch tidak ditemukan' });
    }

    res.json({ success: true, data: branches[0] });
  } catch (error) {
    next(error);
  }
};

export const createBranch = async (req, res, next) => {
  try {
    const { branch_name, address, phone, email } = req.body;

    if (!branch_name) {
      return res.status(400).json({ message: 'Nama branch diperlukan' });
    }

    const [result] = await db.query(
      'INSERT INTO branches (branch_name, address, phone, email) VALUES (?, ?, ?, ?)',
      [branch_name, address, phone, email]
    );

    res.status(201).json({
      success: true,
      message: 'Branch berhasil ditambahkan',
      data: { id: result.insertId },
    });
  } catch (error) {
    next(error);
  }
};

export const updateBranch = async (req, res, next) => {
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
      `UPDATE branches SET ${setClause} WHERE id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Branch tidak ditemukan' });
    }

    res.json({ success: true, message: 'Branch berhasil diupdate' });
  } catch (error) {
    next(error);
  }
};

export const deleteBranch = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [result] = await db.query('DELETE FROM branches WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Branch tidak ditemukan' });
    }

    res.json({ success: true, message: 'Branch berhasil dihapus' });
  } catch (error) {
    next(error);
  }
};
