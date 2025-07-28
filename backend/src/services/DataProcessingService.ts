import { Server } from 'socket.io';
import { ArduinoData, PHBuffer, ProcessedData, UrineReading } from '../types';
import { DatabaseService } from './DatabaseService';
import { ColorClassificationService } from './ColorClassificationService';
import { logger } from '../utils/logger';

export class DataProcessingService {
  private phBuffer: PHBuffer;
  private readonly bufferDuration = 10000; // 10 seconds in milliseconds
  private readonly bufferCapacity = 100; // Maximum buffer size

  constructor(
    private dbService: DatabaseService,
    private colorService: ColorClassificationService,
    private io: Server
  ) {
    this.phBuffer = {
      values: [],
      timestamps: [],
      capacity: this.bufferCapacity
    };
  }

  /**
   * Process incoming Arduino data - adds to pH buffer and processes color immediately
   */
  async processArduinoData(data: ArduinoData): Promise<void> {
    try {
      logger.debug('Processing Arduino data:', data);

      // Add pH value to buffer
      this.addPhToBuffer(data.ph, data.timestamp);

      // Process color immediately (no buffering needed)
      const colorResult = this.colorService.classifyColor(data.color);

      // Get current averaged pH
      const averagePh = this.calculateAveragePh();

      // Create processed data
      const processedData: ProcessedData = {
        phValue: averagePh,
        colorScore: colorResult.score,
        colorRgb: data.color,
        timestamp: new Date(data.timestamp),
        confidence: colorResult.confidence
      };

      // Save to database
      const reading: Omit<UrineReading, 'id'> = {
        timestamp: processedData.timestamp,
        phValue: processedData.phValue,
        colorRgb: processedData.colorRgb,
        colorLab: colorResult.lab,
        colorScore: processedData.colorScore,
        deviceId: 'arduino-001',
        processed: true
      };

      const readingId = await this.dbService.saveReading(reading);
      logger.info(`Saved reading ${readingId}: pH=${averagePh.toFixed(2)}, Color Score=${colorResult.score}, Confidence=${colorResult.confidence.toFixed(3)}`);

      // Emit real-time data to connected clients
      this.io.emit('newReading', {
        ...reading,
        id: readingId,
        recommendations: this.colorService.getHealthRecommendations(colorResult.score)
      });

      // Check for alerts
      this.checkForAlerts(processedData);

    } catch (error) {
      logger.error('Error processing Arduino data:', error);
    }
  }

  /**
   * Add pH value to the rolling buffer
   */
  private addPhToBuffer(phValue: number, timestamp: number): void {
    // Add new values
    this.phBuffer.values.push(phValue);
    this.phBuffer.timestamps.push(timestamp);

    // Remove old values outside the time window
    const cutoffTime = timestamp - this.bufferDuration;
    while (this.phBuffer.timestamps.length > 0 && 
           this.phBuffer.timestamps[0] < cutoffTime) {
      this.phBuffer.values.shift();
      this.phBuffer.timestamps.shift();
    }

    // Enforce capacity limit
    while (this.phBuffer.values.length > this.bufferCapacity) {
      this.phBuffer.values.shift();
      this.phBuffer.timestamps.shift();
    }

    logger.debug(`pH buffer updated: ${this.phBuffer.values.length} values, latest pH: ${phValue.toFixed(2)}`);
  }

  /**
   * Calculate average pH from current buffer
   */
  private calculateAveragePh(): number {
    if (this.phBuffer.values.length === 0) {
      return 7.0; // Default neutral pH
    }

    const sum = this.phBuffer.values.reduce((acc, val) => acc + val, 0);
    const average = sum / this.phBuffer.values.length;
    
    return Math.round(average * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Check for health alerts and notify clients
   */
  private checkForAlerts(data: ProcessedData): void {
    const alerts: string[] = [];

    // pH alerts
    if (data.phValue < 4.5) {
      alerts.push('Very acidic urine detected. Consider consulting healthcare provider.');
    } else if (data.phValue > 8.5) {
      alerts.push('Very alkaline urine detected. Consider consulting healthcare provider.');
    }

    // Color score alerts
    if (data.colorScore >= 8) {
      alerts.push('Critical dehydration or health concern detected. Seek medical attention.');
    } else if (data.colorScore >= 6) {
      alerts.push('Concerning hydration level. Increase fluid intake.');
    }

    // Low confidence alerts
    if (data.confidence < 0.5) {
      alerts.push('Color reading has low confidence. Ensure proper lighting and clean sensor.');
    }

    // Send alerts if any
    if (alerts.length > 0) {
      logger.warn('Health alerts triggered:', alerts);
      this.io.emit('healthAlert', {
        timestamp: data.timestamp,
        alerts,
        data: {
          ph: data.phValue,
          colorScore: data.colorScore,
          confidence: data.confidence
        }
      });
    }
  }

  /**
   * Get current pH buffer statistics
   */
  getPhBufferStats(): {
    currentAverage: number;
    bufferSize: number;
    timeSpan: number;
    values: number[];
  } {
    const now = Date.now();
    const oldestTime = this.phBuffer.timestamps.length > 0 ? 
      this.phBuffer.timestamps[0] : now;
    
    return {
      currentAverage: this.calculateAveragePh(),
      bufferSize: this.phBuffer.values.length,
      timeSpan: now - oldestTime,
      values: [...this.phBuffer.values] // Copy array
    };
  }

  /**
   * Process historical data for cluster training (if needed)
   */
  async retrainColorClusters(): Promise<void> {
    try {
      logger.info('Starting color cluster retraining...');
      
      // Get recent readings for training data
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - (7 * 24 * 60 * 60 * 1000)); // Last 7 days
      
      const readings = await this.dbService.getReadingsByDateRange(startDate, endDate);
      
      if (readings.length < 10) {
        logger.warn('Insufficient data for cluster retraining');
        return;
      }

      // Prepare training data
      const trainingData = readings.map(reading => ({
        lab: reading.colorLab,
        score: reading.colorScore
      }));

      // Update clusters
      const updatedClusters = await this.colorService.updateClustersWithNewData(trainingData);

      // Save updated clusters to database
      for (const cluster of updatedClusters) {
        await this.dbService.updateCluster(cluster);
      }

      logger.info(`Cluster retraining completed with ${trainingData.length} data points`);
      
      // Notify clients about updated clusters
      this.io.emit('clustersUpdated', updatedClusters);

    } catch (error) {
      logger.error('Error during cluster retraining:', error);
    }
  }

  /**
   * Get real-time system status
   */
  getSystemStatus(): {
    phBuffer: ReturnType<typeof this.getPhBufferStats>;
    colorService: boolean;
    database: boolean;
    lastProcessed: Date | null;
  } {
    return {
      phBuffer: this.getPhBufferStats(),
      colorService: this.colorService.isInitialized(),
      database: true, // Assume database is working if we're running
      lastProcessed: this.phBuffer.timestamps.length > 0 ? 
        new Date(this.phBuffer.timestamps[this.phBuffer.timestamps.length - 1]) : null
    };
  }

  /**
   * Reset pH buffer (useful for testing or calibration)
   */
  resetPhBuffer(): void {
    this.phBuffer.values = [];
    this.phBuffer.timestamps = [];
    logger.info('pH buffer reset');
  }

  /**
   * Simulate data for testing purposes
   */
  async simulateReading(phValue: number, rgbColor: { r: number; g: number; b: number }): Promise<void> {
    const mockData: ArduinoData = {
      ph: phValue,
      color: rgbColor,
      timestamp: Date.now()
    };

    await this.processArduinoData(mockData);
  }
} 