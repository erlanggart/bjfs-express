import express from 'express';
import {
  getAttendance,
  markAttendance,
  getAttendanceStats,
} from '../controllers/attendanceController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getAttendance);
router.post('/', authorize('admin', 'admin_cabang'), markAttendance);
router.get('/stats', getAttendanceStats);

export default router;
