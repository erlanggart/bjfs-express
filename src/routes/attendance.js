import express from 'express';
import {
  getAttendance,
  markAttendance,
  getAttendanceStats,
  recordAttendance,
  recordAdminAttendance,
  getAdminAttendanceStatus,
  listMembersForAttendance,
  deleteAttendanceBySession,
  getMonthlySummary,
  getAttendanceReport
} from '../controllers/attendanceController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

// Legacy routes
router.get('/', getAttendance);
router.post('/', authorize('admin', 'admin_cabang'), markAttendance);
router.get('/stats', getAttendanceStats);

// New PHP-compatible routes (admin_cabang only)
router.post('/record.php', authorize('admin_cabang'), recordAttendance);
router.post('/admin_record.php', authorize('admin_cabang'), recordAdminAttendance);
router.get('/admin_status.php', authorize('admin_cabang'), getAdminAttendanceStatus);
router.get('/list_members.php', authorize('admin_cabang'), listMembersForAttendance);
router.delete('/delete_by_session.php', authorize('admin_cabang'), deleteAttendanceBySession);
router.get('/monthly_summary.php', authorize('admin_cabang'), getMonthlySummary);
router.get('/report.php', authorize('admin_cabang'), getAttendanceReport);

export default router;
