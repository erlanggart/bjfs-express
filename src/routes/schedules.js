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
router.get('/:id', getScheduleById);

// Protected routes
router.use(authenticate);

// Legacy routes
router.post('/', authorize('admin', 'admin_cabang'), createSchedule);
router.put('/:id', authorize('admin', 'admin_cabang'), updateSchedule);
router.delete('/:id', authorize('admin'), deleteSchedule);

// PHP-compatible routes (admin_cabang only)
router.post('/create.php', authorize('admin_cabang'), createSchedulePHP);
router.put('/update.php', authorize('admin_cabang'), updateSchedulePHP);
router.delete('/delete.php', authorize('admin_cabang'), deleteSchedulePHP);
router.get('/today.php', authorize('admin_cabang'), getTodaySchedules);
router.get('/list_by_branch.php', authorize('admin_cabang'), getSchedulesByBranch);
router.get('/by_date.php', authorize('admin_cabang'), getSchedulesByDate);
router.post('/toggle_status.php', authorize('admin_cabang'), toggleScheduleStatus);

export default router;
