import express from 'express';
import { listFeedback, updateFeedbackStatus, replyToFeedback } from '../controllers/feedbackController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication and admin/admin_cabang role
router.use(authenticate);
router.use(authorize('admin', 'admin_cabang'));

// PHP-compatible routes
router.get('/list.php', listFeedback);
router.post('/update_status.php', updateFeedbackStatus);
router.post('/reply.php', replyToFeedback);

export default router;
