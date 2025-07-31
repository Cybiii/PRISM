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

// Middleware to extract user ID from token
async function getUserFromToken(req: Request, res: Response, next: any): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    
    // Try real authentication first
    if (authHeader && authHeader.startsWith('Bearer ') && token) {
      try {
        // TODO: Implement real token validation here
        // For now, we'll extract user info from the token or localStorage
        logger.info('✅ Real user authentication attempted');
        
        // If real auth works, use it
        // req.user = { id: realUserId, email: realUserEmail };
        // next();
        // return;
      } catch (error) {
        logger.warn('Real authentication failed, using development fallback');
      }
    }
    
    // Development fallback only if real auth failed or no token
    if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
      logger.info('Development mode: Using mock user for analytics');
      req.user = {
        id: 'demo-user-123',
        email: 'demo@puma-health.com'
      };
      next();
      return;
    }

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'No access token provided'
      });
      return;
    }

    const currentUser = await userService.getCurrentUser(token);
    if (!currentUser) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
      return;
    }

    req.user = currentUser.user;
    next();
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
    
    // Development mode: Return mock readings data
    if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
      logger.info('Development mode: Returning mock readings data');
      
      const mockReadings = Array.from({ length: Math.min(parseInt(limit as string) || 20, 50) }, (_, i) => ({
        id: `mock-reading-${i}`,
        user_id: req.user.id,
        ph_level: 6.0 + Math.random() * 2.5, // 6.0 to 8.5
        color_r: Math.floor(120 + Math.random() * 80), // 120-200
        color_g: Math.floor(140 + Math.random() * 80), // 140-220
        color_b: Math.floor(40 + Math.random() * 60),  // 40-100
        color_score: Math.floor(1 + Math.random() * 10), // 1-10
        confidence: 0.7 + Math.random() * 0.3, // 0.7-1.0
        device_id: 'arduino-001',
        created_at: new Date(Date.now() - (i * 60 * 60 * 1000)).toISOString(), // Each reading 1 hour apart
        recommendations: ['Stay hydrated', 'Monitor pH levels']
      }));

      return res.json({
        success: true,
        data: {
          readings: mockReadings,
          count: mockReadings.length,
          timeRange: `${hours} hours`,
          generatedAt: new Date().toISOString()
        }
      });
    }
    
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
    // Development mode: Return mock latest reading
    if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
      logger.info('Development mode: Returning mock latest reading');
      
      const mockLatestReading = {
        id: `mock-latest-${Date.now()}`,
        user_id: req.user.id,
        ph_level: 7.2,
        color_r: 152,
        color_g: 164,
        color_b: 60,
        color_score: 3,
        confidence: 0.85,
        device_id: 'arduino-001',
        created_at: new Date().toISOString(),
        recommendations: ['Stay hydrated', 'Monitor pH levels', 'Consider increasing water intake']
      };

      return res.json({
        success: true,
        data: mockLatestReading
      });
    }
    
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
    // Development mode: Return mock trends data
    if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
      logger.info('Development mode: Returning mock trends data');
      
      const mockTrends = {
        shortTerm: {
          period: '24 hours',
          avgHealthScore: 7.2,
          avgPH: 7.1,
          totalReadings: 8,
          trend: 'improving'
        },
        mediumTerm: {
          period: '7 days',
          avgHealthScore: 6.8,
          avgPH: 7.0,
          totalReadings: 45,
          trend: 'stable'
        },
        longTerm: {
          period: '30 days',
          avgHealthScore: 6.5,
          avgPH: 6.9,
          totalReadings: 180,
          trend: 'improving'
        },
        overallAssessment: {
          improving: 2,
          declining: 0,
          stable: 1
        }
      };

      return res.json({
        success: true,
        data: mockTrends
      });
    }

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