import express from 'express';
import {
  getAllMembers,
  getMemberById,
  createMember,
  updateMember,
  deleteMember,
} from '../controllers/memberController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.get('/', getAllMembers);
router.get('/:id', getMemberById);
router.post('/', authorize('admin', 'admin_cabang'), createMember);
router.put('/:id', authorize('admin', 'admin_cabang'), updateMember);
router.delete('/:id', authorize('admin'), deleteMember);

export default router;
