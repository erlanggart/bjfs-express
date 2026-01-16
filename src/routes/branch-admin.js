import express from 'express';
import { listMembersInBranch, exportMembers } from '../controllers/branchAdminController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication and admin_cabang role
router.use(authenticate);
router.use(authorize('admin_cabang'));

// Branch admin routes (different path from branch_admins)
router.get('/list_members.php', listMembersInBranch);
router.get('/export_members.php', exportMembers);

export default router;
