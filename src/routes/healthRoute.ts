import { Router } from 'express';
import { pool } from '../db/pool';

const router = Router();

/**
 * @openapi
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: Check API and database health
 *     security: []
 *     responses:
 *       200:
 *         description: API is running and database is connected
 *       500:
 *         description: Database connection failed
 */
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as time');
    res.status(200).json({
      success:  true,
      message:  'Resvy API is running',
      database: 'connected',
      time:     result.rows[0].time,
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
    });
  }
});

export default router;