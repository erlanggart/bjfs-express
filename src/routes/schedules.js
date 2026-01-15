import express from 'express';
import {
  getAllSchedules,
  getScheduleById,
  createSchedule,
  updateSchedule,
  deleteSchedule,
} from '../controllers/scheduleController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/', getAllSchedules);
router.get('/:id', getScheduleById);

router.use(authenticate);
router.post('/', authorize('admin', 'admin_cabang'), createSchedule);
router.put('/:id', authorize('admin', 'admin_cabang'), updateSchedule);
router.delete('/:id', authorize('admin'), deleteSchedule);

export default router;
