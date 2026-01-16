import express from 'express';
import {
  getBranches,
  getSchedules,
  getArticles,
  getArticleDetail,
  getArticlesSidebar,
  getMatches,
  getMatchDetail,
  getHeroGallery,
  getBranchAdminProfiles,
  getVisitorStats,
  getMemberCount,
  listArticlesPHP,
  getArticleDetailsPHP,
  getMembersCountPHP,
  getBranchAdminProfilesPHP,
  listSchedulesPHP,
  listHeroGalleryPHP,
  listBranchesPHP,
  listMatchesPHP,
  getMatchDetailPHP,
  listArticlesSidebar,
  visitorStats,
  getGoogleDriveAlbums,
  getGoogleDrivePhotos,
  getGoogleDriveImage
} from '../controllers/publicController.js';
import { listActiveHeroImages } from '../controllers/heroGalleryController.js';

const router = express.Router();

// Branch endpoints
router.get('/branches', getBranches);
router.get('/list_branches', getBranches); // Alias for compatibility
router.get('/list_branches.php', listBranchesPHP); // PHP alias

// Schedule endpoints
router.get('/schedules', getSchedules);
router.get('/list_schedules', getSchedules); // Alias for compatibility
router.get('/list_schedules.php', listSchedulesPHP); // PHP alias

// Article endpoints
router.get('/articles/list', getArticles);
router.get('/articles/detail/:id', getArticleDetail);
router.get('/articles/list_sidebar', getArticlesSidebar);
router.get('/list_articles', getArticles); // Alias for compatibility
router.get('/list_articles.php', listArticlesPHP); // PHP alias with pagination
router.get('/article_details.php', getArticleDetailsPHP); // PHP alias
router.get('/articles/list_sidebar.php', listArticlesSidebar); // PHP alias for sidebar

// Match endpoints
router.get('/matches', getMatches);
router.get('/list_matches', getMatches); // Alias for compatibility
router.get('/list_matches.php', listMatchesPHP); // PHP alias
router.get('/get_match_detail/:id', getMatchDetail);
router.get('/get_match_detail.php', getMatchDetailPHP); // PHP alias

// Hero gallery
router.get('/hero_gallery', listActiveHeroImages);
router.get('/list_hero_gallery', listActiveHeroImages); // Alias for compatibility
router.get('/list_hero_gallery.php', listHeroGalleryPHP); // PHP alias

// Branch admin profiles (coaches)
router.get('/branch_admin_profiles', getBranchAdminProfiles);
router.get('/branch_admin_profiles.php', getBranchAdminProfilesPHP); // PHP alias

// Member count
router.get('/members_count', getMemberCount);
router.get('/members_count.php', getMembersCountPHP); // PHP alias

// Visitor statistics
router.get('/visitor_stats', getVisitorStats);
router.post('/visitor_stats', getVisitorStats);
router.get('/visitor_stats.php', visitorStats);
router.post('/visitor_stats.php', visitorStats);

// Google Drive endpoints
router.get('/google_drive_albums', getGoogleDriveAlbums);
router.get('/google_drive_albums.php', getGoogleDriveAlbums);
router.get('/google_drive_photos', getGoogleDrivePhotos);
router.get('/google_drive_photos.php', getGoogleDrivePhotos);
router.get('/google_drive_image', getGoogleDriveImage);
router.get('/google_drive_image.php', getGoogleDriveImage);

export default router;
