import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { logger } from './utils/logger';
import { DatabaseService } from './services/DatabaseService';
import { SerialService } from './services/SerialService';
import { ColorClassificationService } from './services/ColorClassificationService';
import { DataProcessingService } from './services/DataProcessingService';
import { setupRoutes } from './routes';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());

// Services
let dbService: DatabaseService;
let serialService: SerialService;
let colorService: ColorClassificationService;
let processingService: DataProcessingService;

// Initialize services
async function initializeServices() {
  try {
    // Initialize database
    dbService = new DatabaseService();
    await dbService.initialize();
    logger.info('Database service initialized');

    // Initialize color classification
    colorService = new ColorClassificationService();
    await colorService.initialize();
    
    // Load clusters from database
    const clusters = await dbService.getColorClusters();
    colorService.setClusters(clusters);
    logger.info('Color classification service initialized');

    // Initialize data processing
    processingService = new DataProcessingService(dbService, colorService, io);
    logger.info('Data processing service initialized');

    // Initialize serial communication (Arduino)
    serialService = new SerialService(processingService, colorService);
    await serialService.initialize();
    logger.info('Serial service initialized');

    logger.info('All services initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize services:', error);
    process.exit(1);
  }
}

// Socket.io connection handling
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);
  
  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });

  // Send latest reading to newly connected client
  socket.on('requestLatestData', async () => {
    try {
      const latestReading = await dbService.getLatestReading();
      socket.emit('latestData', latestReading);
    } catch (error) {
      logger.error('Error sending latest data:', error);
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
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

// Start server
async function startServer() {
  await initializeServices();
  
  // Setup API routes after services are initialized
  setupRoutes(app, { dbService, colorService, processingService, serialService });
  
  server.listen(PORT, () => {
    logger.info(`🚀 PUMA Backend Server running on port ${PORT}`);
    logger.info(`📊 Health check: http://localhost:${PORT}/health`);
  });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  if (serialService) await serialService.close();
  if (dbService) await dbService.close();
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully');
  if (serialService) await serialService.close();
  if (dbService) await dbService.close();
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

startServer().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
}); 