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

// Modern REST endpoints (recommended)
router.post('/record', authorize('admin_cabang'), recordAttendance);
router.post('/admin_record', authorize('admin_cabang'), recordAdminAttendance);
router.get('/admin_status', authorize('admin_cabang'), getAdminAttendanceStatus);
router.get('/list_members', authorize('admin_cabang'), listMembersForAttendance);
router.delete('/delete_by_session', authorize('admin_cabang'), deleteAttendanceBySession);
router.get('/monthly_summary', authorize('admin_cabang'), getMonthlySummary);
router.get('/report', authorize('admin_cabang'), getAttendanceReport);

// Legacy PHP-compatible routes (backward compatibility)
router.post('/record.php', authorize('admin_cabang'), recordAttendance);
router.post('/admin_record.php', authorize('admin_cabang'), recordAdminAttendance);
router.get('/admin_status.php', authorize('admin_cabang'), getAdminAttendanceStatus);
router.get('/list_members.php', authorize('admin_cabang'), listMembersForAttendance);
router.delete('/delete_by_session.php', authorize('admin_cabang'), deleteAttendanceBySession);
router.get('/monthly_summary.php', authorize('admin_cabang'), getMonthlySummary);
router.get('/report.php', authorize('admin_cabang'), getAttendanceReport);

// Legacy routes
router.get('/', getAttendance);
router.post('/', authorize('admin', 'admin_cabang'), markAttendance);
router.get('/stats', getAttendanceStats);

export default router;
