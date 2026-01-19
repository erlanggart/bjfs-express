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

// Modern REST endpoints (recommended)
router.post('/competencies', addCompetency);
router.put('/competencies/:id', updateCompetency);
router.delete('/competencies/:id', deleteCompetency);
router.get('/my-competencies', getMyCompetencies);

// Legacy PHP-compatible routes (backward compatibility)
router.post('/add_competency.php', addCompetency);
router.put('/update_competency.php', updateCompetency);
router.delete('/delete_competency.php', deleteCompetency);
router.get('/my_competencies.php', getMyCompetencies);

export default router;
