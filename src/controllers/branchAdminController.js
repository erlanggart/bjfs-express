import db from '../config/database.js';

// POST /api/branch_admins/add_competency.php - Add competency
export const addCompetency = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { competency_name, issuer, date_obtained, certificate_number, description } = req.body;

    if (!competency_name) {
      return res.status(400).json({ message: 'Nama kompetensi wajib diisi' });
    }

    // Get branch_admin_id
    const [admin] = await db.query(
      'SELECT id FROM branch_admins WHERE user_id = ?',
      [userId]
    );

    if (admin.length === 0) {
      return res.status(404).json({ message: 'Data branch admin tidak ditemukan' });
    }

    // Validate and sanitize date_obtained
    const validDateObtained = date_obtained && date_obtained !== '' ? date_obtained : null;

    await db.query(
      `INSERT INTO branch_admin_competencies 
       (branch_admin_id, competency_name, issuer, date_obtained, certificate_number, description, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [admin[0].id, competency_name, issuer || null, validDateObtained, certificate_number || null, description || null]
    );

    res.status(201).json({ message: 'Kompetensi berhasil ditambahkan' });
  } catch (error) {
    next(error);
  }
};

// PUT /api/branch_admins/update_competency.php - Update competency
export const updateCompetency = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id, competency_name, issuer, date_obtained, certificate_number, description } = req.body;

    // Get branch_admin_id
    const [admin] = await db.query(
      'SELECT id FROM branch_admins WHERE user_id = ?',
      [userId]
    );

    if (admin.length === 0) {
      return res.status(404).json({ message: 'Data branch admin tidak ditemukan' });
    }

    await db.query(
      `UPDATE branch_admin_competencies 
       SET competency_name = ?, issuer = ?, date_obtained = ?, 
           certificate_number = ?, description = ?, updated_at = NOW()
       WHERE id = ? AND branch_admin_id = ?`,
      [competency_name, issuer, date_obtained, certificate_number, description, id, admin[0].id]
    );

    res.json({ message: 'Kompetensi berhasil diperbarui' });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/branch_admins/delete_competency.php - Delete competency
export const deleteCompetency = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.body;

    // Get branch_admin_id
    const [admin] = await db.query(
      'SELECT id FROM branch_admins WHERE user_id = ?',
      [userId]
    );

    if (admin.length === 0) {
      return res.status(404).json({ message: 'Data branch admin tidak ditemukan' });
    }

    await db.query(
      'DELETE FROM branch_admin_competencies WHERE id = ? AND branch_admin_id = ?',
      [id, admin[0].id]
    );

    res.json({ message: 'Kompetensi berhasil dihapus' });
  } catch (error) {
    next(error);
  }
};

// GET /api/branch_admins/my_competencies.php - Get my competencies
export const getMyCompetencies = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get branch_admin_id
    const [admin] = await db.query(
      'SELECT id FROM branch_admins WHERE user_id = ?',
      [userId]
    );

    if (admin.length === 0) {
      return res.json([]);
    }

    const [competencies] = await db.query(
      `SELECT * FROM branch_admin_competencies 
       WHERE branch_admin_id = ? 
       ORDER BY created_at DESC`,
      [admin[0].id]
    );

    res.json(competencies);
  } catch (error) {
    next(error);
  }
};

// GET /api/branch-admin/list_members.php - List members in branch
export const listMembersInBranch = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const search = req.query.search || '';
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    // Get branch_id from admin
    const [adminData] = await db.query(
      'SELECT branch_id FROM branch_admins WHERE user_id = ?',
      [userId]
    );

    if (adminData.length === 0) {
      return res.status(403).json({ message: 'Admin cabang tidak ditemukan.' });
    }

    const branchId = adminData[0].branch_id;

    let sql = `
      SELECT 
        m.id, 
        m.full_name, 
        m.avatar, 
        m.status, 
        m.registration_date, 
        m.last_payment_date,
        (SELECT status FROM payment_proofs pp 
         WHERE pp.member_id = m.id AND pp.payment_month = ? AND pp.payment_year = ?) as current_month_proof_status
      FROM members m
      WHERE m.branch_id = ?
    `;
    const params = [currentMonth, currentYear, branchId];

    if (search) {
      sql += ' AND m.full_name LIKE ?';
      params.push(`%${search}%`);
    }

    sql += ' ORDER BY m.full_name ASC';

    const [members] = await db.query(sql, params);
    res.json(members);
  } catch (error) {
    next(error);
  }
};

// GET /api/branch-admin/export_members.php - Export members to Excel
export const exportMembers = async (req, res, next) => {
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

    const [members] = await db.query(
      `SELECT 
        m.id,
        m.full_name,
        u.username,
        m.phone_number,
        m.date_of_birth,
        TIMESTAMPDIFF(YEAR, m.date_of_birth, CURDATE()) AS age,
        m.registration_date,
        m.last_payment_date,
        b.name as branch_name
      FROM members m
      JOIN users u ON m.user_id = u.id
      JOIN branches b ON m.branch_id = b.id
      WHERE m.branch_id = ? AND m.status = 'active'
      ORDER BY m.full_name ASC`,
      [branchId]
    );

    if (members.length === 0) {
      return res.status(404).json({ message: 'Tidak ada member aktif untuk diekspor di cabang ini.' });
    }

    // Import ExcelJS for creating Excel files
    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Members');

    // Add header row
    worksheet.columns = [
      { header: 'ID Member', key: 'id', width: 15 },
      { header: 'Nama Lengkap', key: 'full_name', width: 30 },
      { header: 'Username', key: 'username', width: 20 },
      { header: 'No. Telepon', key: 'phone_number', width: 20 },
      { header: 'Tgl Lahir', key: 'date_of_birth', width: 15 },
      { header: 'Usia (Tahun)', key: 'age', width: 15 },
      { header: 'Tgl Registrasi', key: 'registration_date', width: 15 },
      { header: 'Pembayaran Terakhir', key: 'last_payment_date', width: 20 }
    ];

    // Make header bold
    worksheet.getRow(1).font = { bold: true };

    // Add data rows
    members.forEach(member => {
      worksheet.addRow(member);
    });

    // Prepare file for download
    const branchName = members[0].branch_name;
    const date = new Date().toISOString().split('T')[0];
    const filename = `Data Member - ${branchName} - ${date}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
};
