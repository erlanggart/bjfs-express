import express from 'express';
import { 
  getMyProfile, 
  updateMyProfile, 
  changePassword, 
  uploadAvatar, 
  saveSignature 
} from '../controllers/userController.js';
import { authenticate } from '../middleware/auth.js';
import { uploadAvatar as uploadAvatarMiddleware, uploadSignature } from '../middleware/upload.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Profile routes
router.get('/my-profile', getMyProfile);
router.put('/update-profile', updateMyProfile);

// Password change
router.post('/change-password', changePassword);

// Avatar upload
router.post('/upload-avatar', uploadAvatarMiddleware.single('avatar'), uploadAvatar);

// Signature upload for branch_admin (handles both file upload and base64)
router.post('/save-signature', uploadSignature.single('signature'), saveSignature);

// Legacy PHP-compatible routes (backward compatibility)
router.post('/change_password.php', changePassword);
router.post('/upload_avatar.php', uploadAvatarMiddleware.single('avatar'), uploadAvatar);
router.post('/save_signature.php', uploadSignature.single('signature'), saveSignature);

export default router;
