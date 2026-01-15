import express from 'express';
const router = express.Router();

// Public endpoints that don't require authentication
router.get('/branches', async (req, res) => {
  // Return public branch information
  res.json({ success: true, data: [] });
});

router.get('/schedules', async (req, res) => {
  // Return public schedule information
  res.json({ success: true, data: [] });
});

export default router;
