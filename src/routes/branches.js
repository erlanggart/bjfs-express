import express from 'express';
import {
  getAllBranches,
  getBranchById,
  createBranch,
  updateBranch,
  deleteBranch,
  getBranchDetail,
  getBranchBirthdays,
} from '../controllers/branchController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public route for listing branches (used by admin and branch_admin)
router.get('/', authenticate, getAllBranches);
router.get('/detail', authenticate, getBranchDetail); // Branch detail with members pagination
router.get('/birthdays', authenticate, getBranchBirthdays); // Get birthdays by branch and month

// Admin only routes
router.post('/', authenticate, authorize('admin'), createBranch);
router.post('/create', authenticate, authorize('admin'), createBranch);
router.put('/:id', authenticate, authorize('admin'), updateBranch);
router.post('/update', authenticate, authorize('admin'), updateBranch);
router.delete('/:id', authenticate, authorize('admin'), deleteBranch);

// Legacy PHP-compatible routes (backward compatibility)
router.get('/list.php', authenticate, getAllBranches);
router.get('/detail.php', authenticate, getBranchDetail);
router.post('/create.php', authenticate, authorize('admin'), createBranch);
router.post('/update.php', authenticate, authorize('admin'), updateBranch);

router.get('/:id', getBranchById);

export default router;
