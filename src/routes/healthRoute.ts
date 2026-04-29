import { Router, Request, Response } from 'express';
import { pool } from '../db/pool';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT NOW() as time');
    res.status(200).json({
      success: true,
      message: 'Resvy API is running',
      database: 'connected',
      time: result.rows[0].time,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
    });
  }
});

export default router;