import { Express, Request, Response } from 'express';
import { DatabaseService } from '../services/DatabaseService';
import { ColorClassificationService } from '../services/ColorClassificationService';
import { DataProcessingService } from '../services/DataProcessingService';
import { SerialService } from '../services/SerialService';
import { supabaseService } from '../services/SupabaseService';
import authRoutes from './auth';
import analyticsRoutes from './analytics';
import { logger } from '../utils/logger';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

interface Services {
  dbService: DatabaseService;
  colorService: ColorClassificationService;
  processingService: DataProcessingService;
  serialService: SerialService;
}

/**
 * Get health recommendations based on numeric score (1-10)
 */
function getHealthRecommendationsForScore(score: number): string[] {
  const recommendationMap: { [key: number]: string[] } = {
    1: [
      'Seek immediate medical attention - severe dehydration detected',
      'This reading indicates a critical health concern',
      'Contact a healthcare provider immediately'
    ],
    2: [
      'Urgent hydration needed - drink water immediately',
      'Consider seeking medical advice if symptoms persist',
      'Monitor closely and increase fluid intake significantly'
    ],
    3: [
      'Severe dehydration detected - increase water intake immediately',
      'Drink small amounts of water frequently',
      'Avoid caffeine and alcohol until hydration improves'
    ],
    4: [
      'Significant dehydration - increase fluid intake',
      'Drink 2-3 glasses of water over the next hour',
      'Monitor your hydration status closely'
    ],
    5: [
      'Mild to moderate dehydration detected',
      'Increase water intake gradually throughout the day',
      'Consider electrolyte replacement if sweating'
    ],
    6: [
      'Slightly dehydrated - increase water intake',
      'Drink 1-2 glasses of water in the next 30 minutes',
      'Maintain regular hydration habits'
    ],
    7: [
      'Fair hydration status - room for improvement',
      'Continue regular water intake',
      'Aim for 8 glasses of water daily'
    ],
    8: [
      'Good hydration levels detected',
      'Maintain current fluid intake',
      'Continue healthy hydration habits'
    ],
    9: [
      'Excellent hydration - well done!',
      'Monitor to avoid overhydration',
      'Maintain balanced fluid intake'
    ],
    10: [
      'Optimal hydration status',
      'Excellent health indicator',
      'Keep up the great work with your hydration habits'
    ]
  };

  return recommendationMap[score] || recommendationMap[7]; // Default to fair if score not found
}

/**
 * Extract user ID from JWT token using Supabase auth
 */
async function extractUserIdFromToken(authHeader: string): Promise<string | null> {
  try {
    if (!authHeader.startsWith('Bearer ')) {
      return null;
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Use Supabase to verify the JWT token
    const { data: { user }, error } = await supabaseService['supabase'].auth.getUser(token);
    
    if (error || !user) {
      logger.warn('Failed to verify JWT token:', error?.message);
      return null;
    }
    
    logger.debug('Successfully extracted user ID from JWT:', user.id);
    return user.id;
  } catch (error) {
    logger.error('Error extracting user ID from token:', error);
    return null;
  }
}

export function setupRoutes(app: Express, services: Services): void {
  const { dbService, colorService, processingService, serialService } = services;

  // Health check endpoint
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      services: {
        database: dbService ? 'running' : 'not initialized',
        serial: serialService ? 'running' : 'not initialized',
        colorClassification: colorService ? 'running' : 'not initialized'
      }
    });
  });

  // Mount authentication routes
  app.use('/api/auth', authRoutes);
  
  // Mount analytics routes
  app.use('/api/analytics', analyticsRoutes);

  // Trigger comprehensive manual sensor reading
  app.post('/api/readings/manual', async (req: Request, res: Response): Promise<void> => {
    try {
      if (!serialService) {
        const response: ApiResponse = {
          success: false,
          error: 'Serial service not available',
          timestamp: new Date().toISOString()
        };
        res.status(503).json(response);
        return;
      }

      // Try real authentication first, fallback to mock if needed
      let userId: string | null = null;
      const authHeader = req.headers.authorization;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          // Try to use real authentication
          const token = authHeader.split(' ')[1];
          userId = await extractUserIdFromToken(authHeader);
          logger.info(`✅ Real user authenticated: ${userId}`);
        } catch (error) {
          logger.warn('Token validation failed, trying development fallback');
        }
      }
      
      // No mock user fallback - require real authentication
      if (!userId) {
        logger.warn('Manual reading rejected: No authenticated user ID');
        res.status(401).json({
          success: false,
          error: 'Authentication required for manual readings'
        });
        return;
      }

      logger.info(`Manual reading requested by authenticated user: ${userId}`);

      // Trigger comprehensive manual reading with proper user ID
      const result = await serialService.triggerManualReading(userId);
      
      if (result.success) {
        const response: ApiResponse = {
          success: true,
          data: {
            readingData: result.data,
            userId: userId
          },
          timestamp: new Date().toISOString()
        };
        res.json(response);
        return;
      } else {
        const response: ApiResponse = {
          success: false,
          error: result.error || 'Manual reading failed',
          timestamp: new Date().toISOString()
        };
        res.status(500).json(response);
        return;
      }
    } catch (error: any) {
      logger.error('Error in manual reading endpoint:', error);
      const response: ApiResponse = {
        success: false,
        error: error.message || 'Internal server error',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
      return;
    }
  });

  // Get latest reading
  app.get('/api/readings/latest', async (req: Request, res: Response) => {
    try {
      const reading = await dbService.getLatestReading();
      const response: ApiResponse = {
        success: true,
        data: reading,
        timestamp: new Date().toISOString()
      };
      res.json(response);
    } catch (error) {
      logger.error('Error getting latest reading:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Failed to get latest reading',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  });

  // Get readings with pagination
  app.get('/api/readings', async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const readings = await dbService.getReadings(limit, offset);
      const response: ApiResponse = {
        success: true,
        data: {
          readings,
          pagination: { limit, offset, count: readings.length }
        },
        timestamp: new Date().toISOString()
      };
      res.json(response);
    } catch (error) {
      logger.error('Error getting readings:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Failed to get readings',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  });

  // Get readings by date range
  app.get('/api/readings/range', async (req: Request, res: Response) => {
    try {
      const startDate = new Date(req.query.start as string);
      const endDate = new Date(req.query.end as string);
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        const response: ApiResponse = {
          success: false,
          error: 'Invalid date format. Use ISO 8601 format.',
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }
      
      const readings = await dbService.getReadingsByDateRange(startDate, endDate);
      const response: ApiResponse = {
        success: true,
        data: { readings, startDate, endDate },
        timestamp: new Date().toISOString()
      };
      return res.json(response);
    } catch (error) {
      logger.error('Error getting readings by range:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Failed to get readings',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
      return;
    }
  });

  // Clusters endpoint removed - Arduino provides health scores directly

  // Get health recommendations for a score
  app.get('/api/recommendations/:score', (req: Request, res: Response) => {
    try {
      const score = parseInt(req.params.score);
      
      if (isNaN(score) || score < 1 || score > 10) {
        const response: ApiResponse = {
          success: false,
          error: 'Score must be between 1 and 10',
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }
      
      const recommendations = getHealthRecommendationsForScore(score);
      const response: ApiResponse = {
        success: true,
        data: { score, recommendations },
        timestamp: new Date().toISOString()
      };
      return res.json(response);
    } catch (error) {
      logger.error('Error getting recommendations:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Failed to get recommendations',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
      return;
    }
  });

  // Get system status
  app.get('/api/status', (req: Request, res: Response) => {
    try {
      const systemStatus = processingService.getSystemStatus();
      const response: ApiResponse = {
        success: true,
        data: systemStatus,
        timestamp: new Date().toISOString()
      };
      res.json(response);
    } catch (error) {
      logger.error('Error getting system status:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Failed to get system status',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  });

  // Simulate reading (for testing)
  app.post('/api/simulate', async (req: Request, res: Response) => {
    try {
      const { ph, color } = req.body;
      
      if (typeof ph !== 'number' || !color || 
          typeof color.r !== 'number' || 
          typeof color.g !== 'number' || 
          typeof color.b !== 'number') {
        const response: ApiResponse = {
          success: false,
          error: 'Invalid data format. Expected: { ph: number, color: { r, g, b } }',
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }
      
      await processingService.simulateReading(ph, color);
      
      const response: ApiResponse = {
        success: true,
        data: { message: 'Simulated reading processed' },
        timestamp: new Date().toISOString()
      };
      return res.json(response);
    } catch (error) {
      logger.error('Error simulating reading:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Failed to simulate reading',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
      return;
    }
  });

  // Cluster retraining endpoint removed - Arduino provides health scores directly

  // Get pH buffer statistics
  app.get('/api/ph/buffer', (req: Request, res: Response) => {
    try {
      const bufferStats = processingService.getPhBufferStats();
      const response: ApiResponse = {
        success: true,
        data: bufferStats,
        timestamp: new Date().toISOString()
      };
      res.json(response);
    } catch (error) {
      logger.error('Error getting pH buffer stats:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Failed to get pH buffer statistics',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  });

  // Analytics endpoint
  app.get('/api/analytics', async (req: Request, res: Response) => {
    try {
      const days = parseInt(req.query.days as string) || 7;
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));
      
      const readings = await dbService.getReadingsByDateRange(startDate, endDate);
      
      // Calculate analytics
      const colorScoreDistribution: { [key: number]: number } = {};
      
      // Color score distribution
      for (const reading of readings) {
        const score = reading.colorScore;
        colorScoreDistribution[score] = (colorScoreDistribution[score] || 0) + 1;
      }
      
      const analytics = {
        totalReadings: readings.length,
        avgPh: readings.length > 0 ? 
          readings.reduce((sum, r) => sum + r.phValue, 0) / readings.length : 0,
        colorScoreDistribution,
        trends: {
          ph: readings.map(r => ({ timestamp: r.timestamp, value: r.phValue })),
          colorScore: readings.map(r => ({ timestamp: r.timestamp, value: r.colorScore }))
        }
      };
      
      const response: ApiResponse = {
        success: true,
        data: analytics,
        timestamp: new Date().toISOString()
      };
      res.json(response);
    } catch (error) {
      logger.error('Error getting analytics:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Failed to get analytics',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  });

  // 🎛️ Mock Data Control Endpoints
  app.post('/api/mock-data/enable', (req: Request, res: Response) => {
    try {
      services.serialService.enableMockData();
      
      const response: ApiResponse = {
        success: true,
        data: { enabled: true, message: '🔄 Automatic mock data generation enabled' },
        timestamp: new Date().toISOString()
      };
      res.json(response);
      logger.info('Mock data generation enabled via API');
    } catch (error) {
      logger.error('Error enabling mock data:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Failed to enable mock data generation',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  });

  app.post('/api/mock-data/disable', (req: Request, res: Response) => {
    try {
      services.serialService.disableMockData();
      
      const response: ApiResponse = {
        success: true,
        data: { enabled: false, message: '🚫 Automatic mock data generation disabled' },
        timestamp: new Date().toISOString()
      };
      res.json(response);
      logger.info('Mock data generation disabled via API');
    } catch (error) {
      logger.error('Error disabling mock data:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Failed to disable mock data generation',
        timestamp: new Date().toISOString()  
      };
      res.status(500).json(response);
    }
  });

  app.get('/api/mock-data/status', (req: Request, res: Response) => {
    try {
      const enabled = services.serialService.isMockDataEnabled();
      
      const response: ApiResponse = {
        success: true,
        data: { 
          enabled,
          status: enabled ? 'Mock data generation is running' : 'Mock data generation is stopped'
        },
        timestamp: new Date().toISOString()
      };
      res.json(response);
    } catch (error) {
      logger.error('Error getting mock data status:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Failed to get mock data status',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  });
} 