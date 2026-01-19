import express from 'express';
import {
  getAllSchedules,
  getScheduleById,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  createSchedulePHP,
  updateSchedulePHP,
  deleteSchedulePHP,
  getTodaySchedules,
  getSchedulesByBranch,
  getSchedulesByDate,
  toggleScheduleStatus
} from '../controllers/scheduleController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/', getAllSchedules);

// Protected routes
router.use(authenticate);

// Modern REST endpoints (recommended) - Specific routes BEFORE parameterized routes
router.get('/today', authorize('admin_cabang'), getTodaySchedules);
router.get('/list_by_branch', authorize('admin_cabang'), getSchedulesByBranch);
router.get('/by_date', authorize('admin_cabang'), getSchedulesByDate);
router.post('/create', authorize('admin_cabang'), createSchedulePHP);
router.post('/update', authorize('admin_cabang'), updateSchedulePHP);
router.delete('/delete', authorize('admin_cabang'), deleteSchedulePHP);
router.post('/toggle_status', authorize('admin_cabang'), toggleScheduleStatus);

// Parameterized routes MUST come last
router.get('/:id', getScheduleById);

// Legacy PHP-compatible routes (backward compatibility)
router.post('/create.php', authorize('admin_cabang'), createSchedulePHP);
router.put('/update.php', authorize('admin_cabang'), updateSchedulePHP);
router.delete('/delete.php', authorize('admin_cabang'), deleteSchedulePHP);
router.get('/today.php', authorize('admin_cabang'), getTodaySchedules);
router.get('/list_by_branch.php', authorize('admin_cabang'), getSchedulesByBranch);
router.get('/by_date.php', authorize('admin_cabang'), getSchedulesByDate);
router.post('/toggle_status.php', authorize('admin_cabang'), toggleScheduleStatus);

export default router;
