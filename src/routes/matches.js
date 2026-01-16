import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import * as matchesController from '../controllers/matchesController.js';

const router = express.Router();

// ============ PUBLIC ROUTES ============
// Get matches list for landing page
router.get('/public', matchesController.listPublicMatches);

// Get public match detail
router.get('/public/:id', matchesController.getPublicMatchDetail);

// ============ ADMIN ROUTES ============
// All admin routes require authentication and admin/admin_cabang role
router.use(authenticate);
router.use(authorize('admin', 'admin_cabang'));

// List members for lineup selection (must be before /:id)
router.get('/members/for-lineup', matchesController.listMembersForLineup);

// List all matches
router.get('/', matchesController.listMatches);

// Get match detail
router.get('/:id', matchesController.getMatchDetail);

// Create match (with multiple photo uploads)
router.post('/', upload.array('photos', 10), matchesController.createMatch);

// Update match (with multiple photo uploads)
router.put('/', upload.array('photos', 10), matchesController.updateMatch);

// Delete match
router.delete('/:id', matchesController.deleteMatch);

export default router;
