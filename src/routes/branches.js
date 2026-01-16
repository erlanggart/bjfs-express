import express from 'express';
import {
  getAllBranches,
  getBranchById,
  createBranch,
  updateBranch,
  deleteBranch,
  getBranchDetail,
} from '../controllers/branchController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public route for listing branches (used by admin and branch_admin)
router.get('/', authenticate, getAllBranches);
router.get('/list.php', authenticate, getAllBranches); // Alias for compatibility
router.get('/detail.php', authenticate, getBranchDetail); // Branch detail with members pagination
router.get('/:id', getBranchById);

// Admin only routes
router.post('/', authenticate, authorize('admin'), createBranch);
router.put('/:id', authenticate, authorize('admin'), updateBranch);
router.delete('/:id', authenticate, authorize('admin'), deleteBranch);

export default router;
