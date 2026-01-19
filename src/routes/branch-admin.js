import express from 'express';
import { listMembersInBranch, exportMembers } from '../controllers/branchAdminController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication and admin_cabang role
router.use(authenticate);
router.use(authorize('admin_cabang'));

// Modern REST endpoints (recommended)
router.get('/members', listMembersInBranch);
router.get('/export-members', exportMembers);

// Legacy PHP-compatible routes (backward compatibility)
router.get('/list_members.php', listMembersInBranch);
router.get('/export_members.php', exportMembers);

export default router;
