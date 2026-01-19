import { PrismaClient } from "@prisma/client";
import db from "../config/database.js";

const prisma = new PrismaClient();

// Get dashboard chart data - Member registration in last 12 months by branch
export const getDashboardChartData = async (req, res) => {
	try {
		// Get raw data from database
		const chartRawData = await prisma.$queryRaw`
      SELECT
        YEAR(m.registration_date) as reg_year,
        MONTH(m.registration_date) as reg_month,
        b.name as branch_name,
        COUNT(m.id) as count
      FROM members m
      JOIN branches b ON m.branch_id = b.id
      WHERE m.registration_date >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
      GROUP BY YEAR(m.registration_date), MONTH(m.registration_date), b.name
      ORDER BY reg_year, reg_month
    `;

		// Get all branches
		const branchesData = await prisma.branches.findMany({
			select: { name: true },
			orderBy: { name: "asc" },
		});

		const branches = branchesData.map((b) => b.name);
		const datasets = {};
		branches.forEach((branchName) => {
			datasets[branchName] = [];
		});

		// Generate labels for last 12 months
		const labels = [];
		const monthMap = {};

		for (let i = 11; i >= 0; i--) {
			const date = new Date();
			date.setMonth(date.getMonth() - i);
			date.setDate(1);

			const monthKey = date.toLocaleString("en-US", {
				month: "short",
				year: "numeric",
			});
			labels.push(monthKey);

			const yearMonth = `${date.getFullYear()}-${date.getMonth() + 1}`;
			monthMap[yearMonth] = 11 - i;

			// Initialize all branches with 0
			branches.forEach((branchName) => {
				datasets[branchName].push(0);
			});
		}

		// Fill in actual data
		chartRawData.forEach((row) => {
			const key = `${row.reg_year}-${row.reg_month}`;
			if (monthMap[key] !== undefined) {
				const index = monthMap[key];
				if (datasets[row.branch_name]) {
					datasets[row.branch_name][index] = Number(row.count);
				}
			}
		});

		res.json({
			labels,
			branches,
			datasets,
		});
	} catch (error) {
		console.error("Error fetching chart data:", error);
		res.status(500).json({ message: "Gagal mengambil data grafik." });
	}
};

// Get cumulative member count chart - Total active members per branch over 12 months
export const getMemberCountChart = async (req, res) => {
	try {
		const branchesData = await prisma.branches.findMany({
			select: { name: true },
			orderBy: { name: "asc" },
		});

		const branches = branchesData.map((b) => b.name);
		const datasets = {};
		branches.forEach((branchName) => {
			datasets[branchName] = [];
		});

		const labels = [];

		// Loop through last 12 months
		for (let i = 11; i >= 0; i--) {
			const date = new Date();
			date.setMonth(date.getMonth() - i);
			date.setDate(1);

			// End of month
			const endOfMonth = new Date(
				date.getFullYear(),
				date.getMonth() + 1,
				0,
				23,
				59,
				59,
			);

			const monthKey = date.toLocaleString("en-US", {
				month: "short",
				year: "numeric",
			});
			labels.push(monthKey);

			// Count active members per branch up to end of this month
			const monthlyCounts = await prisma.$queryRaw`
        SELECT 
          b.name as branch_name, 
          COUNT(m.id) as total_members
        FROM branches b
        LEFT JOIN members m ON b.id = m.branch_id 
          AND m.status = 'active' 
          AND m.registration_date <= ${endOfMonth}
        GROUP BY b.name
        ORDER BY b.name
      `;

			// Create map for easy lookup
			const countsMap = {};
			monthlyCounts.forEach((row) => {
				countsMap[row.branch_name] = Number(row.total_members);
			});

			// Fill dataset for each branch
			branches.forEach((branchName) => {
				datasets[branchName].push(countsMap[branchName] || 0);
			});
		}

		res.json({
			labels,
			branches,
			datasets,
		});
	} catch (error) {
		console.error("Error fetching member count chart:", error);
		res
			.status(500)
			.json({ message: "Gagal mengambil data grafik jumlah member." });
	}
};

// Get payment data for dashboard
export const getPaymentData = async (req, res) => {
	try {
		const month = parseInt(req.query.month) || new Date().getMonth() + 1;
		const year = parseInt(req.query.year) || new Date().getFullYear();

		// End of month
		const endOfMonth = new Date(year, month, 0, 23, 59, 59);

		// Get all active members with payment status and payment type
		const allActiveMembers = await prisma.$queryRaw`
      SELECT 
        m.id,
        m.full_name,
        m.avatar,
        b.name as branch_name,
        pp.payment_type,
        CASE 
          WHEN pp.status = 'approved' THEN 'paid'
          WHEN YEAR(m.registration_date) = ${year} AND MONTH(m.registration_date) = ${month} THEN 'paid'
          ELSE 'unpaid'
        END as payment_status
      FROM members m
      JOIN branches b ON m.branch_id = b.id
      LEFT JOIN payment_proofs pp ON m.id = pp.member_id 
        AND pp.payment_month = ${month} AND pp.payment_year = ${year} AND pp.status = 'approved'
      WHERE m.status = 'active' AND m.registration_date <= ${endOfMonth}
    `;

		// Get all branches
		const branchesData = await prisma.branches.findMany({
			select: { name: true },
		});

		// Initialize branch stats
		const branchStats = {};
		branchesData.forEach((branch) => {
			branchStats[branch.name] = {
				total_active_members: 0,
				paid_members: 0,
				paid_full: 0,
				paid_cuti: 0,
			};
		});

		// Process data
		const paidMembersList = [];
		const unpaidMembersList = [];

		allActiveMembers.forEach((member) => {
			const branchName = member.branch_name;
			if (!branchStats[branchName]) {
				branchStats[branchName] = {
					total_active_members: 0,
					paid_members: 0,
					paid_full: 0,
					paid_cuti: 0,
				};
			}

			branchStats[branchName].total_active_members++;

			if (member.payment_status === "paid") {
				branchStats[branchName].paid_members++;

				// Count by payment type
				if (member.payment_type === "full") {
					branchStats[branchName].paid_full++;
				} else if (member.payment_type === "cuti") {
					branchStats[branchName].paid_cuti++;
				} else {
					// Default to full if payment_type is null (e.g., new registration in the month)
					branchStats[branchName].paid_full++;
				}

				paidMembersList.push(member);
			} else {
				unpaidMembersList.push(member);
			}
		});

		// Format payment stats
		const paymentStats = Object.entries(branchStats).map(
			([branch_name, stats]) => ({
				branch_name,
				total_active_members: stats.total_active_members,
				paid_members: stats.paid_members,
				paid_full: stats.paid_full,
				paid_cuti: stats.paid_cuti,
			}),
		);

		// Get pending payments
		const pendingPayments = await prisma.payment_proofs.findMany({
			where: {
				status: "pending",
			},
			select: {
				id: true,
				uploaded_at: true,
				members: {
					select: {
						id: true,
						full_name: true,
						avatar: true,
						branches: {
							select: {
								name: true,
							},
						},
					},
				},
			},
			orderBy: {
				uploaded_at: "desc",
			},
		});

		// Format pending payments
		const formattedPendingPayments = pendingPayments.map((pp) => ({
			id: pp.id,
			uploaded_at: pp.uploaded_at,
			member_id: pp.members.id,
			member_name: pp.members.full_name,
			member_avatar: pp.members.avatar,
			branch_name: pp.members.branches.name,
		}));

		res.json({
			payment_stats: paymentStats,
			pending_payments: formattedPendingPayments,
			paid_members_list: paidMembersList,
			unpaid_members_list: unpaidMembersList,
		});
	} catch (error) {
		console.error("Error fetching payment data:", error);
		res.status(500).json({ message: "Gagal mengambil data pembayaran." });
	}
};

// Get login stats summary
export const getLoginStatsSummary = async (req, res) => {
	try {
		const period = req.query.period || "weekly"; // 'weekly' or 'monthly'
		const role = req.query.role || "all"; // 'admin_cabang', 'member', or 'all'

		// Determine period
		const days = period === "weekly" ? 7 : 30;

		// Build query with role filter
		let roleCondition = "";
		let roleParams = [days];

		if (role !== "all") {
			roleCondition = "AND u.role = ?";
			roleParams.push(role);
		}

		// Get user login stats
		const [results] = await db.query(
			`
      SELECT 
        u.id,
        u.username,
        u.role,
        CASE 
          WHEN u.role = 'admin_cabang' THEN MAX(ba.full_name)
          WHEN u.role = 'member' THEN MAX(m.full_name)
          ELSE u.username
        END as full_name,
        CASE 
          WHEN u.role = 'admin_cabang' THEN MAX(b1.name)
          WHEN u.role = 'member' THEN MAX(b2.name)
          ELSE '-'
        END as branch_name,
        COUNT(ll.id) as login_count,
        MAX(ll.login_time) as last_login
      FROM users u
      LEFT JOIN branch_admins ba ON u.id = ba.user_id AND u.role = 'admin_cabang'
      LEFT JOIN branches b1 ON ba.branch_id = b1.id
      LEFT JOIN members m ON u.id = m.user_id AND u.role = 'member'
      LEFT JOIN branches b2 ON m.branch_id = b2.id
      LEFT JOIN login_logs ll ON u.id = ll.user_id 
        AND ll.login_time >= DATE_SUB(NOW(), INTERVAL ? DAY)
      WHERE 1=1 ${roleCondition}
      GROUP BY u.id, u.username, u.role
      ORDER BY login_count DESC, u.username ASC
    `,
			roleParams,
		);

		// Count total logins in period
		const [totalResult] = await db.query(
			`
      SELECT COUNT(*) as total 
      FROM login_logs 
      WHERE login_time >= DATE_SUB(NOW(), INTERVAL ? DAY)
    `,
			[days],
		);

		const totalLogins = totalResult[0].total;

		res.json({
			period: period,
			days: days,
			role: role,
			total_logins: parseInt(totalLogins),
			users: results,
		});
	} catch (error) {
		console.error("Error fetching login stats summary:", error);
		res.status(500).json({ message: "Gagal mengambil rekap login." });
	}
};

// Get user login stats
export const getUserLoginStats = async (req, res) => {
	try {
		const { user_id } = req.query;

		if (!user_id) {
			return res.status(400).json({ message: "User ID diperlukan." });
		}

		// Count weekly logins (last 7 days)
		const [weekResult] = await db.query(
			`SELECT COUNT(*) as count 
       FROM login_logs 
       WHERE user_id = ? 
       AND login_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)`,
			[user_id],
		);
		const weeklyLogins = weekResult[0].count;

		// Count monthly logins (last 30 days)
		const [monthResult] = await db.query(
			`SELECT COUNT(*) as count 
       FROM login_logs 
       WHERE user_id = ? 
       AND login_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
			[user_id],
		);
		const monthlyLogins = monthResult[0].count;

		// Count total logins
		const [totalResult] = await db.query(
			`SELECT COUNT(*) as count FROM login_logs WHERE user_id = ?`,
			[user_id],
		);
		const totalLogins = totalResult[0].count;

		// Get last login time
		const [lastLoginResult] = await db.query(
			`SELECT login_time FROM login_logs WHERE user_id = ? ORDER BY login_time DESC LIMIT 1`,
			[user_id],
		);
		const lastLogin =
			lastLoginResult.length > 0 ? lastLoginResult[0].login_time : null;

		res.json({
			user_id: user_id,
			weekly_logins: parseInt(weeklyLogins),
			monthly_logins: parseInt(monthlyLogins),
			total_logins: parseInt(totalLogins),
			last_login: lastLogin,
		});
	} catch (error) {
		console.error("Error fetching user login stats:", error);
		res.status(500).json({ message: "Gagal mengambil statistik login." });
	}
};

// Get member activity data (new & deactivated members)
export const getDashboardActivityData = async (req, res) => {
	try {
		const month = req.query.month || new Date().getMonth() + 1;
		const year = req.query.year || new Date().getFullYear();

		// Create start and end date for the month
		const startDate = new Date(year, month - 1, 1, 0, 0, 0);
		const endDate = new Date(year, month, 0, 23, 59, 59);

		// Get new members registered in the selected month
		const newMembers = await prisma.members.findMany({
			where: {
				registration_date: {
					gte: startDate,
					lte: endDate,
				},
			},
			select: {
				id: true,
				full_name: true,
				registration_date: true,
				avatar: true,
				branches: {
					select: {
						name: true,
					},
				},
			},
			orderBy: {
				registration_date: "desc",
			},
		});

		// Get deactivated members in the selected month
		const deactivatedMembers = await prisma.members.findMany({
			where: {
				status: "inactive",
				status_updated_at: {
					gte: startDate,
					lte: endDate,
				},
			},
			select: {
				id: true,
				full_name: true,
				status_updated_at: true,
				avatar: true,
				branches: {
					select: {
						name: true,
					},
				},
			},
			orderBy: {
				status_updated_at: "desc",
			},
		});

		// Format avatars with APP_URL
		const appUrl = process.env.APP_URL || "";
		const formattedNewMembers = newMembers.map((member) => ({
			id: member.id,
			full_name: member.full_name,
			registration_date: member.registration_date,
			avatar: member.avatar ? `${appUrl}${member.avatar}` : null,
			branch_name: member.branches?.name,
		}));

		const formattedDeactivatedMembers = deactivatedMembers.map((member) => ({
			id: member.id,
			full_name: member.full_name,
			status_updated_at: member.status_updated_at,
			avatar: member.avatar ? `${appUrl}${member.avatar}` : null,
			branch_name: member.branches?.name,
		}));

		res.json({
			new_members: formattedNewMembers,
			deactivated_members: formattedDeactivatedMembers,
		});
	} catch (error) {
		console.error("Error fetching activity data:", error);
		res.status(500).json({ message: "Gagal mengambil data aktivitas member." });
	}
};

// Get report status (members with and without evaluations)
export const getDashboardReportStatus = async (req, res) => {
	try {
		const month = parseInt(req.query.month) || new Date().getMonth() + 1;
		const year = parseInt(req.query.year) || new Date().getFullYear();

		// End of month date for filtering members registered before this date
		const endOfMonth = new Date(year, month, 0);

		// Get all active members with their evaluation status
		const allActiveMembers = await prisma.members.findMany({
			where: {
				status: "active",
				registration_date: {
					lte: endOfMonth,
				},
			},
			select: {
				id: true,
				full_name: true,
				avatar: true,
				branches: {
					select: {
						name: true,
					},
				},
				member_evaluations: {
					where: {
						evaluation_date: {
							gte: new Date(year, month - 1, 1),
							lte: new Date(year, month, 0, 23, 59, 59),
						},
					},
					select: {
						id: true,
					},
					take: 1,
				},
			},
			orderBy: [
				{
					branches: {
						name: "asc",
					},
				},
				{
					full_name: "asc",
				},
			],
		});

		// Separate into reported and unreported
		const reportedMembers = [];
		const unreportedMembers = [];

		const appUrl = process.env.APP_URL || "";

		allActiveMembers.forEach((member) => {
			const memberData = {
				id: member.id,
				full_name: member.full_name,
				avatar: member.avatar ? `${appUrl}${member.avatar}` : null,
				branch_name: member.branches?.name,
				report_id:
					member.member_evaluations.length > 0
						? member.member_evaluations[0].id
						: null,
			};

			if (member.member_evaluations.length > 0) {
				reportedMembers.push(memberData);
			} else {
				unreportedMembers.push(memberData);
			}
		});

		res.json({
			reported_members: reportedMembers,
			unreported_members: unreportedMembers,
		});
	} catch (error) {
		console.error("Error fetching report status:", error);
		res.status(500).json({ message: "Gagal mengambil data status rapor." });
	}
};
