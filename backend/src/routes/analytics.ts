import { Router, Request, Response } from 'express';
import { supabaseService } from '../services/SupabaseService';
import { userService } from '../services/UserService';
import { logger } from '../utils/logger';

const router = Router();

// Middleware to extract user ID from token
async function getUserFromToken(req: Request, res: Response, next: any) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No access token provided'
      });
    }

    const currentUser = await userService.getCurrentUser(token);
    if (!currentUser) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    req.user = currentUser.user;
    next();
  } catch (error: any) {
    logger.error('Auth middleware error:', error);
    return res.status(401).json({
      success: false,
      error: 'Authentication failed'
    });
  }
}

// Get 24-hour analytics
router.get('/24h', getUserFromToken, async (req: Request, res: Response) => {
  try {
    const stats = await supabaseService.get24HourStats(req.user.id);
    
    return res.json({
      success: true,
      data: {
        timeRange: '24 hours',
        stats,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error: any) {
    logger.error('24h analytics error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch 24-hour analytics'
    });
  }
});

// Get 7-day analytics
router.get('/7d', getUserFromToken, async (req: Request, res: Response) => {
  try {
    const stats = await supabaseService.get7DayStats(req.user.id);
    
    return res.json({
      success: true,
      data: {
        timeRange: '7 days',
        stats,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error: any) {
    logger.error('7d analytics error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch 7-day analytics'
    });
  }
});

// Get 30-day analytics
router.get('/30d', getUserFromToken, async (req: Request, res: Response) => {
  try {
    const stats = await supabaseService.get30DayStats(req.user.id);
    
    return res.json({
      success: true,
      data: {
        timeRange: '30 days',
        stats,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error: any) {
    logger.error('30d analytics error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch 30-day analytics'
    });
  }
});

// Get comprehensive health summary
router.get('/summary', getUserFromToken, async (req: Request, res: Response) => {
  try {
    const healthSummary = await userService.getUserHealthSummary(req.user.id);
    
    return res.json({
      success: true,
      data: healthSummary
    });

  } catch (error: any) {
    logger.error('Health summary error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch health summary'
    });
  }
});

// Get readings by time range
router.get('/readings', getUserFromToken, async (req: Request, res: Response) => {
  try {
    const { hours = 24, limit } = req.query;
    
    const readings = await supabaseService.getReadingsByTimeRange(
      req.user.id,
      parseInt(hours as string),
      limit ? parseInt(limit as string) : undefined
    );
    
    return res.json({
      success: true,
      data: {
        readings,
        count: readings.length,
        timeRange: `${hours} hours`,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error: any) {
    logger.error('Readings fetch error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch readings'
    });
  }
});

// Get latest reading
router.get('/latest', getUserFromToken, async (req: Request, res: Response) => {
  try {
    const latestReading = await supabaseService.getLatestReading(req.user.id);
    
    if (!latestReading) {
      return res.json({
        success: true,
        data: null,
        message: 'No readings found for this user'
      });
    }
    
    return res.json({
      success: true,
      data: latestReading
    });

  } catch (error: any) {
    logger.error('Latest reading error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch latest reading'
    });
  }
});

// Get daily summaries
router.get('/daily', getUserFromToken, async (req: Request, res: Response) => {
  try {
    const { days = 30 } = req.query;
    
    const dailySummaries = await supabaseService.getDailySummaries(
      req.user.id,
      parseInt(days as string)
    );
    
    return res.json({
      success: true,
      data: {
        summaries: dailySummaries,
        count: dailySummaries.length,
        dayRange: parseInt(days as string),
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error: any) {
    logger.error('Daily summaries error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch daily summaries'
    });
  }
});

// Health trends analysis
router.get('/trends', getUserFromToken, async (req: Request, res: Response) => {
  try {
    const [stats24h, stats7d, stats30d] = await Promise.all([
      supabaseService.get24HourStats(req.user.id),
      supabaseService.get7DayStats(req.user.id),
      supabaseService.get30DayStats(req.user.id)
    ]);

    const trends = {
      shortTerm: {
        period: '24 hours',
        avgHealthScore: stats24h.avgHealthScore,
        avgPH: stats24h.avgPH,
        totalReadings: stats24h.totalReadings,
        trend: stats24h.trendDirection
      },
      mediumTerm: {
        period: '7 days',
        avgHealthScore: stats7d.avgHealthScore,
        avgPH: stats7d.avgPH,
        totalReadings: stats7d.totalReadings,
        trend: stats7d.trendDirection
      },
      longTerm: {
        period: '30 days',
        avgHealthScore: stats30d.avgHealthScore,
        avgPH: stats30d.avgPH,
        totalReadings: stats30d.totalReadings,
        trend: stats30d.trendDirection
      },
      overallAssessment: {
        improving: [stats24h, stats7d, stats30d].filter(s => s.trendDirection === 'improving').length,
        declining: [stats24h, stats7d, stats30d].filter(s => s.trendDirection === 'declining').length,
        stable: [stats24h, stats7d, stats30d].filter(s => s.trendDirection === 'stable').length
      }
    };

    return res.json({
      success: true,
      data: trends
    });

  } catch (error: any) {
    logger.error('Trends analysis error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate trends analysis'
    });
  }
});

export default router; 