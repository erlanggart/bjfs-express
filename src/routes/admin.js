import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { upload, uploadHero } from '../middleware/upload.js';
import * as adminController from '../controllers/adminController.js';
import * as heroGalleryController from '../controllers/heroGalleryController.js';
import * as usersController from '../controllers/usersController.js';
import * as dashboardController from '../controllers/dashboardController.js';
import * as paymentController from '../controllers/paymentController.js';

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(authorize('admin'));

// ============ ARTICLES ROUTES ============
router.get('/articles', adminController.listArticles);
router.get('/articles/:id', adminController.getArticleDetail);
router.post('/articles', upload.single('thumbnail'), adminController.createArticle);
router.put('/articles/:id', upload.single('thumbnail'), adminController.updateArticle);
router.delete('/articles/:id', adminController.deleteArticle);
router.post('/articles/upload-image', upload.single('image'), adminController.uploadArticleImage);

// ============ HERO GALLERY ROUTES ============
router.get('/hero-gallery', heroGalleryController.listHeroImages);
router.post('/hero-gallery', heroGalleryController.createHeroImage);
router.put('/hero-gallery', heroGalleryController.updateHeroImage);
router.delete('/hero-gallery/:id', heroGalleryController.deleteHeroImage);
router.post('/hero-gallery/upload', uploadHero.single('image'), heroGalleryController.uploadHeroImage);

// ============ USERS MANAGEMENT ROUTES ============
router.get('/users', usersController.listUsers);
router.post('/users', usersController.createUser);
router.delete('/users', usersController.deleteUser);
router.post('/remove-admin', usersController.removeAdmin);

// ============ DASHBOARD ROUTES ============
router.get('/dashboard-chart-data', dashboardController.getDashboardChartData);
router.get('/dashboard-member-count-chart', dashboardController.getMemberCountChart);
router.get('/dashboard-payment-data', dashboardController.getPaymentData);
router.get('/login-stats-summary', dashboardController.getLoginStatsSummary);
router.get('/user-login-stats', dashboardController.getUserLoginStats);
router.get('/dashboard-activity-data', dashboardController.getDashboardActivityData);
router.get('/dashboard-report-status', dashboardController.getDashboardReportStatus);

// Legacy PHP-compatible routes (backward compatibility)
router.post('/remove_admin.php', usersController.removeAdmin);
router.get('/dashboard_activity_data.php', dashboardController.getDashboardActivityData);
router.get('/dashboard_report_status.php', dashboardController.getDashboardReportStatus);

// ============ PAYMENT ROUTES ============
router.post('/upload-payment-for-member', upload.single('proof'), paymentController.uploadPaymentForMember);
router.post('/verify-payment', paymentController.verifyPayment);

export default router;
