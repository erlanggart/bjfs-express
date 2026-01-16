import express from 'express';
import {
  addCompetency,
  updateCompetency,
  deleteCompetency,
  getMyCompetencies,
  listMembersInBranch,
  exportMembers
} from '../controllers/branchAdminController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication and admin_cabang role
router.use(authenticate);
router.use(authorize('admin_cabang'));

// Competency management routes
router.post('/add_competency.php', addCompetency);
router.put('/update_competency.php', updateCompetency);
router.delete('/delete_competency.php', deleteCompetency);
router.get('/my_competencies.php', getMyCompetencies);

export default router;
