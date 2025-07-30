import { Express, Request, Response } from 'express';
import { DatabaseService } from '../services/DatabaseService';
import { ColorClassificationService } from '../services/ColorClassificationService';
import { DataProcessingService } from '../services/DataProcessingService';
import { ApiResponse } from '../types';
import { logger } from '../utils/logger';
import authRoutes from './auth';
import analyticsRoutes from './analytics';

interface Services {
  dbService: DatabaseService;
  colorService: ColorClassificationService;
  processingService: DataProcessingService;
  serialService?: any; // Add serial service for manual readings
}

export function setupRoutes(app: Express, services: Services): void {
  const { dbService, colorService, processingService, serialService } = services;

  // Mount authentication routes
  app.use('/api/auth', authRoutes);
  
  // Mount analytics routes
  app.use('/api/analytics', analyticsRoutes);

  // Trigger comprehensive manual sensor reading
  app.post('/api/readings/manual', async (req: Request, res: Response) => {
    try {
      if (!serialService) {
        const response: ApiResponse = {
          success: false,
          error: 'Serial service not available',
          timestamp: new Date().toISOString()
        };
        return res.status(503).json(response);
      }

      // Extract user ID from Authorization header
      const authHeader = req.headers.authorization;
      let userId: string | undefined;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          // TODO: Implement proper JWT verification to extract user ID
          // For now, we'll extract from request body or use a demo user
          userId = req.body.userId || 'demo-user-' + Date.now();
          logger.info('Manual reading requested by user:', userId);
        } catch (authError) {
          logger.warn('Failed to extract user ID from token:', authError);
          userId = 'anonymous-user-' + Date.now();
        }
      } else {
        // No auth header - use demo/anonymous user
        userId = 'demo-user-' + Date.now();
        logger.info('Manual reading requested without authentication, using demo user:', userId);
      }

      // Trigger comprehensive manual reading
      const result = await serialService.triggerManualReading(userId);
      
      if (result.success) {
        const response: ApiResponse = {
          success: true,
          data: {
            message: 'Manual reading completed successfully',
            readingData: result.data,
            collectionTime: '5 seconds',
            processedBy: 'k-means algorithm'
          },
          timestamp: new Date().toISOString()
        };
        res.json(response);
      } else {
        const response: ApiResponse = {
          success: false,
          error: result.error || 'Manual reading failed',
          timestamp: new Date().toISOString()
        };
        res.status(500).json(response);
      }
      
    } catch (error) {
      logger.error('Error in manual reading endpoint:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Failed to process manual reading request',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
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
        return res.status(400).json(response);
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
      return res.status(500).json(response);
    }
  });

  // Get color clusters
  app.get('/api/clusters', async (req: Request, res: Response) => {
    try {
      const clusters = await dbService.getColorClusters();
      const response: ApiResponse = {
        success: true,
        data: clusters,
        timestamp: new Date().toISOString()
      };
      res.json(response);
    } catch (error) {
      logger.error('Error getting clusters:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Failed to get color clusters',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  });

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
        return res.status(400).json(response);
      }
      
      const recommendations = colorService.getHealthRecommendations(score);
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
      return res.status(500).json(response);
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
        return res.status(400).json(response);
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
      return res.status(500).json(response);
    }
  });

  // Retrain color clusters
  app.post('/api/clusters/retrain', async (req: Request, res: Response) => {
    try {
      await processingService.retrainColorClusters();
      
      const response: ApiResponse = {
        success: true,
        data: { message: 'Cluster retraining initiated' },
        timestamp: new Date().toISOString()
      };
      res.json(response);
    } catch (error) {
      logger.error('Error retraining clusters:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Failed to retrain clusters',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  });

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
} 