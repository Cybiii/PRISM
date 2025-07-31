import { Router, Request, Response } from 'express';
import { supabaseService } from '../services/SupabaseService';
import { userService } from '../services/UserService';
import { logger } from '../utils/logger';

// Extend Request type to include user property
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

const router = Router();

// Helper function to convert hydration level to ml for frontend compatibility
function getHydrationMl(hydrationLevel: string): number {
  const levels = {
    'excellent': 2500,
    'good': 2000,
    'fair': 1500,
    'poor': 1000,
    'critical': 500
  };
  return levels[hydrationLevel as keyof typeof levels] || 1500;
}

// Middleware to extract user ID from token
async function getUserFromToken(req: Request, res: Response, next: any): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      res.status(401).json({
        success: false,
        error: 'No access token provided'
      });
      return;
    }

    try {
      const currentUser = await userService.getCurrentUser(token);
      if (!currentUser || !currentUser.user || !currentUser.user.id) {
        res.status(401).json({
          success: false,
          error: 'Invalid or expired token'
        });
        return;
      }

      req.user = currentUser.user;
      logger.info(`✅ User authenticated: ${req.user.id}`);
      next();
    } catch (error) {
      logger.error('Token validation failed:', error);
      res.status(401).json({
        success: false,
        error: 'Authentication failed'
      });
      return;
    }
  } catch (error: any) {
    logger.error('Auth middleware error:', error);
    res.status(401).json({
      success: false,
      error: 'Authentication failed'
    });
    return;
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
    // Get combined analytics from multiple time periods
    const [stats24h, stats7d, stats30d, recentReadings] = await Promise.all([
      supabaseService.get24HourStats(req.user.id),
      supabaseService.get7DayStats(req.user.id),
      supabaseService.get30DayStats(req.user.id),
      supabaseService.getReadingsByTimeRange(req.user.id, 168, 10) // Last 7 days, 10 readings
    ]);

    const healthSummary = {
      overview: {
        totalReadings: stats30d.totalReadings || 0,
        avgHealthScore: stats7d.avgHealthScore || 0,
        avgPH: stats7d.avgPH || 0,
        trendDirection: stats7d.trendDirection || 'stable'
      },
      periods: {
        last24h: stats24h,
        last7d: stats7d,
        last30d: stats30d
      },
      recentActivity: recentReadings.slice(0, 5),
      generatedAt: new Date().toISOString()
    };
    
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
    
    // Always try to get real database data first
    logger.info(`Fetching readings for user ${req.user.id} (${hours} hours, limit: ${limit})`);
    
    try {
      const rawReadings = await supabaseService.getReadingsByTimeRange(
        req.user.id,
        parseInt(hours as string),
        limit ? parseInt(limit as string) : undefined
      );
      
      // Transform database format to frontend format
      const readings = rawReadings.map(reading => ({
        id: reading.id || '',
        timestamp: reading.reading_time,
        ph: reading.ph,
        hydration_ml: getHydrationMl(reading.hydration_level), // Convert string to number
        color_score: reading.health_score,
        confidence: reading.confidence_score || 0,
        created_at: reading.created_at || reading.reading_time
      }));
      
      logger.info(`✅ Found ${readings.length} real readings for user ${req.user.id}`);
      if (readings.length > 0) {
        logger.info('✅ Sample transformed reading:', JSON.stringify(readings[0], null, 2));
      }
      
      return res.json({
        success: true,
        data: {
          readings,
          count: readings.length,
          timeRange: `${hours} hours`,
          source: 'database',
          generatedAt: new Date().toISOString()
        }
      });
      
    } catch (dbError) {
      logger.error('Database query failed:', dbError);
      throw dbError;
    }

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
    // Always try to get real database data first
    logger.info(`Fetching latest reading for user ${req.user.id}`);
    
    try {
      const latestReading = await supabaseService.getLatestReading(req.user.id);
      
      if (!latestReading) {
        logger.info(`No real readings found for user ${req.user.id}`);
        

        
        return res.json({
          success: true,
          data: null,
          message: 'No readings found for this user'
        });
      }
      
      logger.info(`✅ Found latest real reading for user ${req.user.id}: ${latestReading.id}`);
      
      return res.json({
        success: true,
        data: latestReading,
        source: 'database'
      });
      
    } catch (dbError) {
      logger.warn('Failed to fetch latest reading from database:', dbError);
      throw dbError; // Re-throw to be caught by outer catch
    }

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
    // Always try to get real database data first
    logger.info(`Fetching trends analysis for user ${req.user.id}`);
    
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

      logger.info(`✅ Generated real trends analysis for user ${req.user.id}`);

      return res.json({
        success: true,
        data: trends,
        source: 'database'
      });
      
    } catch (dbError) {
      logger.error('Failed to fetch trends from database:', dbError);
      throw dbError;
    }

  } catch (error: any) {
    logger.error('Trends analysis error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate trends analysis'
    });
  }
});

export default router; 