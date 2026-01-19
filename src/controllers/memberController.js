import db from "../config/database.js";
import argon2 from "argon2";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper: Get member_id from user_id
const getMemberIdFromUserId = async (userId) => {
	const [rows] = await db.query("SELECT id FROM members WHERE user_id = ?", [
		userId,
	]);
	return rows.length > 0 ? rows[0].id : null;
};

// ============ PROFILE OPERATIONS ============

// GET /api/members/detail/:id - Get member detail with evaluations
export const getMemberDetail = async (req, res, next) => {
	try {
		const memberId = req.params.id;

		// Get member with branch info
		const [members] = await db.query(
			`
      SELECT m.*, b.name as branch_name, b.report_template, u.username 
      FROM members m 
      LEFT JOIN branches b ON m.branch_id = b.id
      LEFT JOIN users u ON m.user_id = u.id
      WHERE m.id = ?
    `,
			[memberId],
		);

		if (members.length === 0) {
			return res.status(404).json({ message: "Member tidak ditemukan" });
		}

		const member = members[0];

		// Get evaluations for this member
		const [evaluations] = await db.query(
			`
      SELECT me.*, u.username as author_name
      FROM member_evaluations me
      LEFT JOIN users u ON me.author_id = u.id
      WHERE me.member_id = ?
      ORDER BY me.evaluation_date DESC
    `,
			[memberId],
		);

		res.json({
			success: true,
			member_info: member,
			evaluations: evaluations,
		});
	} catch (error) {
		next(error);
	}
};

// PUT /api/members/update-profile - Member updates own profile
export const updateProfile = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const memberId = await getMemberIdFromUserId(userId);

		if (!memberId) {
			return res.status(404).json({ message: "Data member tidak ditemukan" });
		}

		const { full_name, phone_number, address, date_of_birth } = req.body;

		await db.query(
			"UPDATE members SET full_name = ?, phone_number = ?, address = ?, date_of_birth = ? WHERE id = ?",
			[full_name, phone_number, address, date_of_birth, memberId],
		);

		res.json({
			success: true,
			message: "Profil berhasil diperbarui",
		});
	} catch (error) {
		next(error);
	}
};

// PUT /api/members/update/:id - Admin/Branch admin updates member data
export const updateMember = async (req, res, next) => {
	try {
		const memberId = req.params.id;
		const updates = req.body;

		// Build dynamic update query
		const allowedFields = [
			"full_name",
			"date_of_birth",
			"birth_place",
			"phone_number",
			"address",
			"position",
			"status",
			"branch_id",
			"registration_date",
			"last_payment_date",
		];

		const updateFields = [];
		const values = [];

		for (const field of allowedFields) {
			if (updates[field] !== undefined) {
				updateFields.push(`${field} = ?`);
				values.push(updates[field]);
			}
		}

		if (updateFields.length === 0) {
			return res
				.status(400)
				.json({ message: "Tidak ada data untuk diperbarui" });
		}

		values.push(memberId);
		const sql = `UPDATE members SET ${updateFields.join(", ")} WHERE id = ?`;

		await db.query(sql, values);

		res.json({
			success: true,
			message: "Data member berhasil diperbarui",
		});
	} catch (error) {
		next(error);
	}
};

// PUT /api/members/toggle-status/:id - Toggle member active/inactive status
export const toggleMemberStatus = async (req, res, next) => {
	try {
		// Support both params (PUT /members/:id) and body (POST with member_id)
		const memberId = req.params.id || req.body.member_id;

		if (!memberId) {
			return res.status(400).json({ message: "Member ID diperlukan." });
		}

		const [members] = await db.query(
			"SELECT status FROM members WHERE id = ?",
			[memberId],
		);

		if (members.length === 0) {
			return res.status(404).json({ message: "Member tidak ditemukan" });
		}

		const newStatus = members[0].status === "active" ? "inactive" : "active";

		await db.query(
			"UPDATE members SET status = ?, status_updated_at = NOW() WHERE id = ?",
			[newStatus, memberId],
		);

		res.json({
			success: true,
			message: `Status member berhasil diubah menjadi ${newStatus}`,
			newStatus: newStatus,
		});
	} catch (error) {
		next(error);
	}
};

// POST /api/members/move-branch - Move member to another branch
export const moveBranch = async (req, res, next) => {
	try {
		const { id } = req.params; // Get member_id from URL params
		const { new_branch_id } = req.body;

		if (!id || !new_branch_id) {
			return res
				.status(400)
				.json({ message: "Member ID dan Branch ID diperlukan" });
		}

		await db.query("UPDATE members SET branch_id = ? WHERE id = ?", [
			new_branch_id,
			id,
		]);

		res.json({
			success: true,
			message: "Member berhasil dipindahkan ke cabang baru",
		});
	} catch (error) {
		next(error);
	}
};

// POST /api/members/reset-password/:id - Reset member password to default
export const resetPassword = async (req, res, next) => {
	try {
		const memberId = req.params.id;

		// Get member's user_id
		const [members] = await db.query(
			"SELECT user_id FROM members WHERE id = ?",
			[memberId],
		);

		if (members.length === 0) {
			return res.status(404).json({ message: "Member tidak ditemukan" });
		}

		const userId = members[0].user_id;
		const defaultPassword = "bjfspassword"; // Default password
		const hashedPassword = await argon2.hash(defaultPassword);

		await db.query("UPDATE users SET password = ? WHERE id = ?", [
			hashedPassword,
			userId,
		]);

		res.json({
			success: true,
			message: "Password berhasil direset ke default",
		});
	} catch (error) {
		next(error);
	}
};

// ============ DOCUMENT OPERATIONS ============

// POST /api/members/upload-documents - Upload member documents (KK, Akte, Biodata)
export const uploadDocuments = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const memberId = await getMemberIdFromUserId(userId);

		if (!memberId) {
			return res.status(404).json({ message: "Data member tidak ditemukan" });
		}

		const { document_type } = req.body;

		if (!document_type || !["kk", "akte", "biodata"].includes(document_type)) {
			return res.status(400).json({ message: "Tipe dokumen tidak valid" });
		}

		if (!req.file) {
			return res.status(400).json({ message: "File dokumen diperlukan" });
		}

		const documentUrl = `/uploads/documents/${req.file.filename}`;
		const columnMap = {
			kk: "kk_url",
			akte: "akte_url",
			biodata: "biodata_url",
		};

		await db.query(
			`UPDATE members SET ${columnMap[document_type]} = ? WHERE id = ?`,
			[documentUrl, memberId],
		);

		res.json({
			success: true,
			message: "Dokumen berhasil diunggah",
			url: documentUrl,
		});
	} catch (error) {
		next(error);
	}
};

// DELETE /api/members/delete-document - Delete member document
export const deleteDocument = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const memberId = await getMemberIdFromUserId(userId);

		if (!memberId) {
			return res.status(404).json({ message: "Data member tidak ditemukan" });
		}

		const { document_type } = req.body;

		if (!document_type || !["kk", "akte", "biodata"].includes(document_type)) {
			return res.status(400).json({ message: "Tipe dokumen tidak valid" });
		}

		const columnMap = {
			kk: "kk_url",
			akte: "akte_url",
			biodata: "biodata_url",
		};

		await db.query(
			`UPDATE members SET ${columnMap[document_type]} = NULL WHERE id = ?`,
			[memberId],
		);

		res.json({
			success: true,
			message: "Dokumen berhasil dihapus",
		});
	} catch (error) {
		next(error);
	}
};

// ============ ATTENDANCE OPERATIONS ============

// GET /api/members/attendance-history/:id - Get attendance history with pagination
export const getAttendanceHistory = async (req, res, next) => {
	try {
		const memberId = req.params.id;
		const page = parseInt(req.query.page) || 1;
		const limit = parseInt(req.query.limit) || 5;
		const offset = (page - 1) * limit;

		// Get total count
		const [countResult] = await db.query(
			"SELECT COUNT(*) as total FROM attendance WHERE member_id = ?",
			[memberId],
		);
		const total = countResult[0].total;

		// Get paginated data
		const [attendance] = await db.query(
			`
      SELECT 
        DATE_FORMAT(a.attendance_date, '%Y-%m-%d') as attendance_date,
        a.status,
        s.age_group,
        s.start_time,
        s.end_time,
        b.name as branch_name
      FROM attendance a
      LEFT JOIN schedules s ON a.schedule_id = s.id
      LEFT JOIN branches b ON s.branch_id = b.id
      WHERE a.member_id = ? AND a.attendance_date IS NOT NULL
      ORDER BY a.attendance_date DESC, s.start_time DESC
      LIMIT ? OFFSET ?
    `,
			[memberId, limit, offset],
		);

		res.json({
			history: attendance,
			total_pages: Math.ceil(total / limit),
			current_page: page,
		});
	} catch (error) {
		next(error);
	}
};

// GET /api/members/my-attendance - Member's own attendance recap
export const getMyAttendance = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const memberId = await getMemberIdFromUserId(userId);

		if (!memberId) {
			return res.status(404).json({ message: "Data member tidak ditemukan" });
		}

		const month = parseInt(req.query.month) || new Date().getMonth() + 1;
		const year = parseInt(req.query.year) || new Date().getFullYear();

		// Get member info
		const [members] = await db.query(
			`
      SELECT m.id, m.full_name, b.name as branch_name 
      FROM members m 
      LEFT JOIN branches b ON m.branch_id = b.id
      WHERE m.id = ?
    `,
			[memberId],
		);

		if (members.length === 0) {
			return res.status(404).json({ message: "Member tidak ditemukan" });
		}

		// Get attendance data for the month
		const [attendance] = await db.query(
			`
      SELECT a.*, s.day_of_week, s.start_time, s.end_time, s.age_group, s.location
      FROM attendance a
      JOIN schedules s ON a.schedule_id = s.id
      WHERE a.member_id = ? 
        AND MONTH(a.attendance_date) = ? 
        AND YEAR(a.attendance_date) = ?
      ORDER BY a.attendance_date, s.start_time
    `,
			[memberId, month, year],
		);

		res.json({
			success: true,
			member_info: members[0],
			month,
			year,
			attendance,
		});
	} catch (error) {
		next(error);
	}
};

// ============ EVALUATION OPERATIONS ============

// POST /api/members/evaluations - Create evaluation (for coaches)
export const createEvaluation = async (req, res, next) => {
	try {
		const { member_id, evaluation_date, report_type, scores, coach_notes } =
			req.body;
		const authorId = req.user.id;

		if (!member_id || !evaluation_date || !report_type || !scores) {
			return res.status(400).json({ message: "Data evaluasi tidak lengkap" });
		}

		const [result] = await db.query(
			"INSERT INTO member_evaluations (member_id, author_id, evaluation_date, report_type, scores, coach_notes) VALUES (?, ?, ?, ?, ?, ?)",
			[
				member_id,
				authorId,
				evaluation_date,
				report_type,
				JSON.stringify(scores),
				coach_notes,
			],
		);

		res.json({
			success: true,
			message: "Evaluasi berhasil dibuat",
			evaluationId: result.insertId,
		});
	} catch (error) {
		next(error);
	}
};

// GET /api/members/evaluations/:id - Get single evaluation
export const getEvaluation = async (req, res, next) => {
	try {
		const evaluationId = req.params.id;

		const [evaluations] = await db.query(
			"SELECT * FROM member_evaluations WHERE id = ?",
			[evaluationId],
		);

		if (evaluations.length === 0) {
			return res.status(404).json({ message: "Evaluasi tidak ditemukan" });
		}

		res.json({
			success: true,
			evaluation: evaluations[0],
		});
	} catch (error) {
		next(error);
	}
};

// PUT /api/members/evaluations/:id - Update evaluation
export const updateEvaluation = async (req, res, next) => {
	try {
		const evaluationId = req.params.id;
		const { scores, coach_notes } = req.body;
		const authorId = req.user.id;

		await db.query(
			"UPDATE member_evaluations SET scores = ?, coach_notes = ?, author_id = ? WHERE id = ?",
			[JSON.stringify(scores), coach_notes, authorId, evaluationId],
		);

		res.json({
			success: true,
			message: "Evaluasi berhasil diperbarui",
		});
	} catch (error) {
		next(error);
	}
};

// DELETE /api/members/evaluations/:id - Delete evaluation
export const deleteEvaluation = async (req, res, next) => {
	try {
		const evaluationId = req.params.id;

		await db.query("DELETE FROM member_evaluations WHERE id = ?", [
			evaluationId,
		]);

		res.json({
			success: true,
			message: "Evaluasi berhasil dihapus",
		});
	} catch (error) {
		next(error);
	}
};

// GET /api/members/my-evaluations - Member's own evaluations
export const getMyEvaluations = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const memberId = await getMemberIdFromUserId(userId);

		if (!memberId) {
			return res.status(404).json({ message: "Data member tidak ditemukan" });
		}

		// Get member info
		const [members] = await db.query(
			`
      SELECT m.id, m.full_name, b.name as branch_name 
      FROM members m 
      LEFT JOIN branches b ON m.branch_id = b.id
      WHERE m.id = ?
    `,
			[memberId],
		);

		// Get evaluations
		const [evaluations] = await db.query(
			`
      SELECT me.*, u.username as author_name
      FROM member_evaluations me
      LEFT JOIN users u ON me.author_id = u.id
      WHERE me.member_id = ?
      ORDER BY me.evaluation_date DESC
    `,
			[memberId],
		);

		res.json({
			success: true,
			member_info: members[0],
			evaluations,
		});
	} catch (error) {
		next(error);
	}
};

// ============ ACHIEVEMENT OPERATIONS ============

// GET /api/members/my-achievements - Get member's achievements
export const getMyAchievements = async (req, res, next) => {
	try {
		const userId = req.user.id;

		// Only members can access this
		if (req.user.role !== "member") {
			return res.json({ success: true, achievements: [] });
		}

		const memberId = await getMemberIdFromUserId(userId);

		if (!memberId) {
			return res.status(404).json({ message: "Data member tidak ditemukan" });
		}

		const [achievements] = await db.query(
			"SELECT * FROM member_achievements WHERE member_id = ? ORDER BY event_date DESC",
			[memberId],
		);

		res.json({
			success: true,
			achievements,
		});
	} catch (error) {
		next(error);
	}
};

// POST /api/members/achievements - Add achievement
export const addAchievement = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const memberId = await getMemberIdFromUserId(userId);

		if (!memberId) {
			return res.status(404).json({ message: "Data member tidak ditemukan" });
		}

		const { achievement_name, event_date, notes } = req.body;

		if (!achievement_name || !event_date) {
			return res
				.status(400)
				.json({ message: "Nama prestasi dan tanggal diperlukan" });
		}

		const [result] = await db.query(
			"INSERT INTO member_achievements (member_id, achievement_name, event_date, notes) VALUES (?, ?, ?, ?)",
			[memberId, achievement_name, event_date, notes],
		);

		res.json({
			success: true,
			message: "Prestasi berhasil ditambahkan",
			achievementId: result.insertId,
		});
	} catch (error) {
		next(error);
	}
};

// PUT /api/members/achievements/:id - Update achievement
export const updateAchievement = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const memberId = await getMemberIdFromUserId(userId);
		const achievementId = req.params.id;

		if (!memberId) {
			return res.status(404).json({ message: "Data member tidak ditemukan" });
		}

		// Verify ownership
		const [achievements] = await db.query(
			"SELECT member_id FROM member_achievements WHERE id = ?",
			[achievementId],
		);

		if (achievements.length === 0 || achievements[0].member_id !== memberId) {
			return res
				.status(403)
				.json({ message: "Tidak memiliki akses untuk mengubah prestasi ini" });
		}

		const { achievement_name, event_date, notes } = req.body;

		await db.query(
			"UPDATE member_achievements SET achievement_name = ?, event_date = ?, notes = ? WHERE id = ?",
			[achievement_name, event_date, notes, achievementId],
		);

		res.json({
			success: true,
			message: "Prestasi berhasil diperbarui",
		});
	} catch (error) {
		next(error);
	}
};

// DELETE /api/members/achievements/:id - Delete achievement
export const deleteAchievement = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const memberId = await getMemberIdFromUserId(userId);
		const achievementId = req.params.id;

		if (!memberId) {
			return res.status(404).json({ message: "Data member tidak ditemukan" });
		}

		// Verify ownership
		const [achievements] = await db.query(
			"SELECT member_id FROM member_achievements WHERE id = ?",
			[achievementId],
		);

		if (achievements.length === 0 || achievements[0].member_id !== memberId) {
			return res
				.status(403)
				.json({ message: "Tidak memiliki akses untuk menghapus prestasi ini" });
		}

		await db.query("DELETE FROM member_achievements WHERE id = ?", [
			achievementId,
		]);

		res.json({
			success: true,
			message: "Prestasi berhasil dihapus",
		});
	} catch (error) {
		next(error);
	}
};

// ============ PAYMENT OPERATIONS ============

// GET /api/members/payment-status - Get member's payment status
export const getPaymentStatus = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const memberId = await getMemberIdFromUserId(userId);

		if (!memberId) {
			return res
				.status(404)
				.json({ message: "Profil member tidak ditemukan." });
		}

		// Get member info
		const [members] = await db.query(
			"SELECT id, full_name, registration_date, last_payment_date FROM members WHERE id = ?",
			[memberId],
		);

		if (members.length === 0) {
			return res
				.status(404)
				.json({ message: "Profil member tidak ditemukan." });
		}

		// Get payment history with all fields
		const [payment_history] = await db.query(
			"SELECT * FROM payment_proofs WHERE member_id = ? ORDER BY uploaded_at DESC",
			[memberId],
		);

		res.json({
			member_info: members[0],
			payment_history,
		});
	} catch (error) {
		next(error);
	}
};

// GET /api/members/payment-history/:id - Get payment history for specific member
export const getPaymentHistory = async (req, res, next) => {
	try {
		const memberId = req.params.id;

		const [payments] = await db.query(
			"SELECT id, member_id, payment_month, payment_year, proof_url, status, payment_type, uploaded_at FROM payment_proofs WHERE member_id = ? ORDER BY uploaded_at DESC",
			[memberId],
		);

		res.json(payments);
	} catch (error) {
		next(error);
	}
};

// GET /api/members/my-payment-history - Member's own payment history
export const getMyPaymentHistory = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const memberId = await getMemberIdFromUserId(userId);

		if (!memberId) {
			return res.status(404).json({ message: "Data member tidak ditemukan" });
		}

		const [payments] = await db.query(
			"SELECT id, member_id, payment_month, payment_year, proof_url, status, payment_type, uploaded_at FROM payment_proofs WHERE member_id = ? ORDER BY payment_year DESC, payment_month DESC",
			[memberId],
		);

		res.json({
			success: true,
			payments,
		});
	} catch (error) {
		next(error);
	}
};

// POST /api/members/upload-payment - Upload payment proof
export const uploadPayment = async (req, res, next) => {
	try {
		const userId = req.user.id;

		// Get member info including full_name for folder creation
		const [members] = await db.query(
			"SELECT id, full_name FROM members WHERE user_id = ?",
			[userId],
		);

		if (members.length === 0) {
			return res
				.status(404)
				.json({ message: "Profil member tidak ditemukan." });
		}

		const memberId = members[0].id;
		const memberName = members[0].full_name;

		// Accept both 'month'/'year' (PHP style) and 'payment_month'/'payment_year'
		const paymentMonth = req.body.month || req.body.payment_month;
		const paymentYear = req.body.year || req.body.payment_year;
		const paymentType = req.body.payment_type || "full";

		if (!paymentMonth || !paymentYear) {
			return res
				.status(400)
				.json({ message: "Periode pembayaran tidak valid." });
		}

		if (!req.file) {
			return res.status(400).json({ message: "Bukti pembayaran diperlukan." });
		}

		// Validate payment type
		if (!["full", "cuti"].includes(paymentType)) {
			return res.status(400).json({ message: "Tipe pembayaran tidak valid." });
		}

		// Create safe folder name from member name
		const folderName = memberName.replace(/[^a-zA-Z0-9_-]/g, "_");
		const memberFolder = path.join(
			__dirname,
			"../../uploads/proofs",
			folderName,
		);

		// Create member folder if not exists
		if (!fs.existsSync(memberFolder)) {
			fs.mkdirSync(memberFolder, { recursive: true });
		}

		// Generate new filename and move file to member folder
		const extension = path.extname(req.file.originalname);
		const newFilename = `${memberId}_${paymentYear}-${paymentMonth}${extension}`;
		const oldPath = req.file.path;
		const newPath = path.join(memberFolder, newFilename);

		// Move file from temp location to member folder
		fs.renameSync(oldPath, newPath);

		const proofUrl = `/uploads/proofs/${folderName}/${newFilename}`;

		// Insert or update payment proof with status 'pending'
		await db.query(
			`INSERT INTO payment_proofs (member_id, payment_month, payment_year, proof_url, status, payment_type) 
       VALUES (?, ?, ?, ?, 'pending', ?)
       ON DUPLICATE KEY UPDATE proof_url = VALUES(proof_url), status = 'pending', payment_type = VALUES(payment_type)`,
			[memberId, paymentMonth, paymentYear, proofUrl, paymentType],
		);

		res.status(201).json({
			message:
				"Bukti pembayaran berhasil diunggah dan sedang menunggu verifikasi.",
		});
	} catch (error) {
		next(error);
	}
};

// POST /api/members/mark-as-paid - Mark member as paid
export const markAsPaid = async (req, res, next) => {
	try {
		const { member_id } = req.body;

		if (!member_id) {
			return res.status(400).json({ message: "Member ID diperlukan" });
		}

		const today = new Date().toISOString().split("T")[0];

		await db.query("UPDATE members SET last_payment_date = ? WHERE id = ?", [
			today,
			member_id,
		]);

		res.json({
			success: true,
			message: "Member berhasil ditandai lunas",
		});
	} catch (error) {
		next(error);
	}
};

// ============ FEEDBACK OPERATIONS ============

// POST /api/members/submit-feedback - Submit feedback
export const submitFeedback = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const memberId = await getMemberIdFromUserId(userId);

		if (!memberId) {
			return res.status(404).json({ message: "Data member tidak ditemukan" });
		}

		const { content } = req.body;

		if (!content || content.trim() === "") {
			return res.status(400).json({ message: "Konten feedback diperlukan" });
		}

		const [result] = await db.query(
			"INSERT INTO feedback (member_id, content) VALUES (?, ?)",
			[memberId, content],
		);

		res.json({
			success: true,
			message: "Feedback berhasil dikirim",
			feedbackId: result.insertId,
		});
	} catch (error) {
		next(error);
	}
};

// GET /api/members/my-feedback - Get member's feedback with replies
export const getMyFeedback = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const memberId = await getMemberIdFromUserId(userId);

		if (!memberId) {
			return res.status(404).json({ message: "Data member tidak ditemukan" });
		}

		const [feedback] = await db.query(
			`
      SELECT 
        f.*,
        u.username as replier_username 
      FROM feedback f
      LEFT JOIN users u ON f.replied_by_user_id = u.id
      WHERE f.member_id = ?
      ORDER BY f.submitted_at DESC
    `,
			[memberId],
		);

		// Return array directly like PHP
		res.json(feedback);
	} catch (error) {
		next(error);
	}
};
