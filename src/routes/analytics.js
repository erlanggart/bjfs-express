import express from 'express';
import { getRealtimeData, getHistoricalData } from '../controllers/analyticsController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);
router.use(authorize('admin'));

router.get('/realtime', getRealtimeData);
router.get('/historical', getHistoricalData);

export default router;
