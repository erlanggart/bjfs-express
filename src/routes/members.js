import express from 'express';
import {
  getMemberDetail,
  updateProfile,
  updateMember,
  toggleMemberStatus,
  moveBranch,
  resetPassword,
  uploadDocuments,
  deleteDocument,
  getAttendanceHistory,
  getMyAttendance,
  createEvaluation,
  getEvaluation,
  updateEvaluation,
  deleteEvaluation,
  getMyEvaluations,
  getMyAchievements,
  addAchievement,
  updateAchievement,
  deleteAchievement,
  getPaymentStatus,
  getPaymentHistory,
  getMyPaymentHistory,
  uploadPayment,
  markAsPaid,
  submitFeedback,
  getMyFeedback
} from '../controllers/memberController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { upload, uploadPaymentProof } from '../middleware/upload.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// ============ PROFILE ROUTES ============
router.get('/detail/:id', getMemberDetail);
router.put('/update-profile', updateProfile); // Member updates own profile
router.put('/update/:id', authorize('admin', 'admin_cabang'), updateMember);
router.put('/toggle-status/:id', authorize('admin', 'admin_cabang'), toggleMemberStatus);
router.put('/move-branch/:id', authorize('admin', 'admin_cabang'), moveBranch);
router.post('/reset-password/:id', authorize('admin', 'admin_cabang'), resetPassword);

// ============ DOCUMENT ROUTES ============
router.post('/upload-documents', upload.single('document'), uploadDocuments);
router.delete('/delete-document', deleteDocument);

// ============ ATTENDANCE ROUTES ============
router.get('/attendance-history/:id', getAttendanceHistory);
router.get('/my-attendance', getMyAttendance);

// ============ EVALUATION ROUTES ============
router.post('/evaluations', authorize('admin', 'admin_cabang'), createEvaluation);
router.get('/evaluations/:id', getEvaluation);
router.put('/evaluations/:id', authorize('admin', 'admin_cabang'), updateEvaluation);
router.delete('/evaluations/:id', authorize('admin', 'admin_cabang'), deleteEvaluation);
router.get('/my-evaluations', getMyEvaluations);

// ============ ACHIEVEMENT ROUTES ============
router.get('/my-achievements', getMyAchievements);
router.post('/achievements', addAchievement);
router.put('/achievements/:id', updateAchievement);
router.delete('/achievements/:id', deleteAchievement);

// ============ PAYMENT ROUTES ============
router.get('/payment-status', getPaymentStatus);
router.get('/payment-history/:id', getPaymentHistory);
router.get('/my-payment-history', getMyPaymentHistory);
router.post('/upload-payment', uploadPaymentProof.single('proof'), uploadPayment);
router.post('/mark-as-paid', authorize('admin', 'admin_cabang'), markAsPaid);

// ============ FEEDBACK ROUTES ============
router.post('/submit-feedback', submitFeedback);
router.get('/my-feedback', getMyFeedback);

// ============ PHP ALIASES FOR BACKWARD COMPATIBILITY ============

// Profile endpoints with .php
router.get('/detail.php', getMemberDetail);
router.put('/update_profile.php', updateProfile);
router.put('/update.php', authorize('admin', 'admin_cabang'), updateMember);
router.put('/toggle_status.php', authorize('admin', 'admin_cabang'), toggleMemberStatus);
router.post('/toggle_status.php', authorize('admin', 'admin_cabang'), toggleMemberStatus); // Support POST method
router.post('/move_branch.php', authorize('admin', 'admin_cabang'), moveBranch);
router.post('/reset_password.php', authorize('admin', 'admin_cabang'), resetPassword);

// Document endpoints with .php
router.post('/upload_documents.php', upload.single('document'), uploadDocuments);
router.delete('/delete_document.php', deleteDocument);

// Attendance endpoints with .php
router.get('/get_attendance_history.php', getAttendanceHistory);
router.get('/my_attendance.php', getMyAttendance);

// Evaluation endpoints with .php
router.post('/create_evaluation.php', authorize('admin', 'admin_cabang'), createEvaluation);
router.get('/get_evaluation.php', getEvaluation);
router.put('/update_evaluation.php', authorize('admin', 'admin_cabang'), updateEvaluation);
router.delete('/delete_evaluation.php', authorize('admin', 'admin_cabang'), deleteEvaluation);
router.get('/my_evaluations.php', getMyEvaluations);

// Achievement endpoints with .php
router.get('/my_achievements.php', getMyAchievements);
router.post('/add_achievement.php', addAchievement);
router.put('/update_achievement.php', updateAchievement);
router.delete('/delete_achievement.php', deleteAchievement);

// Payment endpoints with .php
router.get('/payment_status.php', getPaymentStatus);
router.get('/payment_history.php', getPaymentHistory);
router.get('/my_payment_history.php', getMyPaymentHistory);
router.post('/upload_payment.php', uploadPaymentProof.single('proof'), uploadPayment);
router.post('/mark_as_paid.php', authorize('admin', 'admin_cabang'), markAsPaid);

// Feedback endpoints with .php
router.post('/submit_feedback.php', submitFeedback);
router.get('/my_feedback.php', getMyFeedback);

export default router;
