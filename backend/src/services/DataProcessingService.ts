import { Server } from 'socket.io';
import { ArduinoData, PHBuffer, ProcessedData, UrineReading } from '../types';
import { DatabaseService } from './DatabaseService';
import { ColorClassificationService } from './ColorClassificationService';
import { supabaseService } from './SupabaseService';
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
   * Process incoming Arduino data - only saves to Supabase with valid authentication
   */
  async processArduinoData(data: ArduinoData, userId?: string): Promise<void> {
    try {
      logger.debug('Processing Arduino data:', data);

      // Add pH value to buffer
      this.addPhToBuffer(data.ph, data.timestamp);

      // Use Arduino's color score directly (no ML classification needed)
      const colorScore = data.colorScore;

      // Get current averaged pH
      const averagePh = this.calculateAveragePh();

      // Create processed data
      const processedData: ProcessedData = {
        phValue: averagePh,
        colorScore: colorScore,
        colorRgb: data.color,
        timestamp: new Date(data.timestamp),
        confidence: 1.0 // Arduino analysis is always confident
      };

      // Only save to Supabase if we have a valid authenticated user UUID
      if (userId && this.isValidUUID(userId)) {
        try {
          logger.info(`Processing Arduino data for user: ${userId}`);
          logger.info(`Arduino data:`, { ph: data.ph, colorScore: data.colorScore, rgb: data.color });
          
          // Convert to Supabase format
          const healthReading = supabaseService.processedDataToHealthReading(
            userId,
            processedData,
            'arduino-tcs34725'
          );
          
          // Add recommendations based on Arduino score
          healthReading.recommendations = this.getHealthRecommendations(colorScore);
          
          logger.info(`Converted to health reading format, attempting to save...`);
          await supabaseService.saveHealthReading(healthReading);
          logger.info(`✅ Saved reading to Supabase for user: ${userId}`);

          // Emit real-time data to connected clients
          this.io.emit('newReading', {
            id: `reading_${Date.now()}`,
            timestamp: processedData.timestamp,
            phValue: processedData.phValue,
            colorRgb: processedData.colorRgb,
            colorScore: processedData.colorScore,
            deviceId: 'arduino-001',
            processed: true,
            userId: userId,
            recommendations: this.getHealthRecommendations(colorScore)
          });

          // Check for alerts
          this.checkForAlerts(processedData, userId);
          
        } catch (supabaseError) {
          logger.error('❌ Failed to save to Supabase:', supabaseError);
          throw supabaseError; // Don't fallback to SQLite, require proper saving
        }
      } else {
        if (!userId) {
          // Background Arduino data - silently ignore (expected behavior)
          logger.debug('Background Arduino data received (not saved - no user context)');
        } else {
          logger.warn(`⚠️ Invalid UUID format: ${userId} - data not saved.`);
        }
      }

    } catch (error) {
      logger.error('Error processing Arduino data:', error);
      throw error;
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
  private checkForAlerts(data: ProcessedData, userId?: string): void {
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
        userId: userId || undefined, // Pass userId if available
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

      // No longer using K-means clusters - Arduino provides scores directly
      logger.info('Cluster retraining skipped - Arduino provides health scores directly');

    } catch (error) {
      logger.error('Error during cluster retraining:', error);
    }
  }

  /**
   * Get real-time system status
   */
  getSystemStatus() {
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
  async simulateReading(phValue: number, rgbColor: { r: number; g: number; b: number }, userId?: string): Promise<void> {
    const mockData: ArduinoData = {
      ph: phValue,
      color: rgbColor,
      colorScore: 7, // Default fair score for simulated data
      timestamp: Date.now()
    };

    await this.processArduinoData(mockData, userId);
  }

  /**
   * Validate if a string is a valid UUID
   */
  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Get health recommendations based on numeric score (1-10)
   */
  private getHealthRecommendations(score: number): string[] {
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
} 