import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';
import { ArduinoData, RGBColor, SerialConfig } from '../types';
import { logger } from '../utils/logger';
import { DataProcessingService } from './DataProcessingService';
import { ColorClassificationService } from './ColorClassificationService';

export class SerialService {
  private port: SerialPort | null = null;
  private parser: ReadlineParser | null = null;
  private config: SerialConfig;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 5000; // 5 seconds

  constructor(
    private dataProcessor: DataProcessingService,
    private colorService: ColorClassificationService
  ) {
    this.config = {
      port: process.env.ARDUINO_PORT || 'COM3', // Default Windows port
      baudRate: parseInt(process.env.ARDUINO_BAUD_RATE || '9600'),
      autoDetect: process.env.ARDUINO_AUTO_DETECT === 'true'
    };
  }

  async initialize(): Promise<void> {
    // In development, check environment first
    logger.info(`NODE_ENV: "${process.env.NODE_ENV}"`);
    logger.info(`NODE_ENV type: ${typeof process.env.NODE_ENV}`);
    logger.info(`NODE_ENV === 'development': ${process.env.NODE_ENV === 'development'}`);
    
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV?.trim() === 'development') {
      logger.info('Development mode detected - checking Arduino connection...');
      
      try {
        if (this.config.autoDetect) {
          await this.detectArduinoPort();
        }
        
        await this.connectToArduino();
        logger.info(`Serial service initialized on port ${this.config.port}`);
        return;
      } catch (error) {
        logger.warn('Arduino connection failed in development mode, switching to mock data:', error);
        this.startMockDataGeneration();
        logger.info('Mock data generation started - SerialService initialized successfully');
        return;
      }
    }

    // Production mode - Arduino connection required
    try {
      if (this.config.autoDetect) {
        await this.detectArduinoPort();
      }
      
      await this.connectToArduino();
      logger.info(`Serial service initialized on port ${this.config.port}`);
    } catch (error) {
      logger.error('Serial service initialization failed:', error);
      throw error;
    }
  }

  private async detectArduinoPort(): Promise<void> {
    try {
      const ports = await SerialPort.list();
      logger.info('Available serial ports:', ports.map(p => `${p.path} (${p.manufacturer})`));

      // Look for Arduino-like devices
      const arduinoPorts = ports.filter(port => 
        port.manufacturer?.toLowerCase().includes('arduino') ||
        port.manufacturer?.toLowerCase().includes('ch340') ||
        port.manufacturer?.toLowerCase().includes('cp210') ||
        port.vendorId === '2341' // Arduino VID
      );

      if (arduinoPorts.length > 0) {
        this.config.port = arduinoPorts[0].path;
        logger.info(`Auto-detected Arduino on port: ${this.config.port}`);
      } else {
        logger.warn('No Arduino ports detected, using configured port:', this.config.port);
      }
    } catch (error) {
      logger.error('Port detection failed:', error);
    }
  }

  private async connectToArduino(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.port = new SerialPort({
        path: this.config.port,
        baudRate: this.config.baudRate,
        autoOpen: false
      });

      this.parser = this.port.pipe(new ReadlineParser({ delimiter: '\n' }));

      // Set up event handlers
      this.port.on('open', () => {
        logger.info(`Connected to Arduino on ${this.config.port} at ${this.config.baudRate} baud`);
        this.reconnectAttempts = 0;
        this.setupDataHandling();
        resolve();
      });

      this.port.on('error', (error) => {
        logger.error('Serial port error:', error);
        if (this.reconnectAttempts === 0) {
          reject(error);
        } else {
          this.handleReconnection();
        }
      });

      this.port.on('close', () => {
        logger.warn('Serial port closed');
        this.handleReconnection();
      });

      // Open the port
      this.port.open();
    });
  }

  private setupDataHandling(): void {
    if (!this.parser) return;

    this.parser.on('data', (data: string) => {
      try {
        const trimmedData = data.trim();
        if (!trimmedData) return;

        logger.debug('Raw Arduino data:', trimmedData);

        // Parse Arduino data format: "PH:7.2,R:255,G:200,B:100"
        const arduinoData = this.parseArduinoData(trimmedData);
        if (arduinoData) {
          this.dataProcessor.processArduinoData(arduinoData);
        }
      } catch (error) {
        logger.error('Error processing Arduino data:', error);
      }
    });
  }

  private parseArduinoData(data: string): ArduinoData | null {
    try {
      // Expected formats:
      // PUMA format: "PH:7.2,R:45123,G:50234,B:20156,C:55000"
      // Current Arduino format: "RGB: 77, 102, 79  HEX: #4D664F"
      // JSON format: {"ph": 7.2, "r": 1234, "g": 2345, "b": 3456, "c": 4567}
      
      // Handle current Arduino RGB format
      if (data.includes('RGB:') && data.includes('HEX:')) {
        const rgbMatch = data.match(/RGB:\s*(\d+),\s*(\d+),\s*(\d+)/);
        if (rgbMatch) {
          const r = parseInt(rgbMatch[1]);
          const g = parseInt(rgbMatch[2]);
          const b = parseInt(rgbMatch[3]);
          
          return {
            ph: 7.0 + (Math.random() - 0.5) * 2, // Simulate pH 6-8
            color: { r, g, b },
            timestamp: Date.now()
          };
        }
      }
      
      // Try JSON format first
      if (data.startsWith('{')) {
        const parsed = JSON.parse(data);
        const rgbData = this.processTCS34725Data({
          r: parsed.r || parsed.red,
          g: parsed.g || parsed.green,
          b: parsed.b || parsed.blue,
          c: parsed.c || parsed.clear
        });
        
        return {
          ph: parsed.ph || parsed.pH,
          color: rgbData,
          timestamp: Date.now()
        };
      }

      // Parse PUMA key-value format
      const pairs = data.split(',');
      const values: { [key: string]: number } = {};

      for (const pair of pairs) {
        const [key, value] = pair.split(':');
        if (key && value) {
          values[key.trim().toUpperCase()] = parseFloat(value.trim());
        }
      }

      // Validate required fields for PUMA format
      if (typeof values.PH !== 'number' || 
          typeof values.R !== 'number' || 
          typeof values.G !== 'number' || 
          typeof values.B !== 'number') {
        logger.warn('Invalid Arduino data format:', data);
        return null;
      }

      // Validate pH range
      if (values.PH < 0 || values.PH > 14) {
        logger.warn('pH value out of range:', values.PH);
        return null;
      }

      // Process TCS34725 data (handle both 8-bit and 16-bit ranges)
      const rgbData = this.processTCS34725Data({
        r: values.R,
        g: values.G,
        b: values.B,
        c: values.C || 0
      });

      return {
        ph: values.PH,
        color: rgbData,
        timestamp: Date.now()
      };
    } catch (error) {
      logger.error('Error parsing Arduino data:', error);
      return null;
    }
  }

  /**
   * Process TCS34725 color sensor data
   * Handles 16-bit values and converts to 8-bit RGB for consistency
   */
  private processTCS34725Data(rawData: { r: number; g: number; b: number; c?: number }): RGBColor {
    let { r, g, b, c } = rawData;

    // Detect if values are 16-bit (TCS34725) or 8-bit (standard)
    const is16Bit = r > 255 || g > 255 || b > 255;

    if (is16Bit) {
      // TCS34725 provides 16-bit values (0-65535)
      // Convert to 8-bit (0-255) for consistent processing
      
      // Method 1: Simple scaling
      r = Math.round((r / 65535) * 255);
      g = Math.round((g / 65535) * 255);
      b = Math.round((b / 65535) * 255);

      // Alternative: Use clear channel for normalization if available
      if (c && c > 0) {
        // Normalize against clear channel for better color accuracy
        r = Math.min(255, Math.round((r / c) * 255));
        g = Math.min(255, Math.round((g / c) * 255));
        b = Math.min(255, Math.round((b / c) * 255));
      }

      logger.debug(`TCS34725 data processed: 16-bit to 8-bit conversion`, {
        original: rawData,
        converted: { r, g, b }
      });
    } else {
      // Already 8-bit values, validate range
      r = Math.max(0, Math.min(255, Math.round(r)));
      g = Math.max(0, Math.min(255, Math.round(g)));
      b = Math.max(0, Math.min(255, Math.round(b)));
    }

    return { r, g, b };
  }

  private handleReconnection(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error(`Max reconnection attempts (${this.maxReconnectAttempts}) exceeded`);
      return;
    }

    this.reconnectAttempts++;
    logger.info(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${this.reconnectDelay}ms...`);

    setTimeout(async () => {
      try {
        await this.connectToArduino();
      } catch (error) {
        logger.error('Reconnection failed:', error);
      }
    }, this.reconnectDelay);
  }

  private startMockDataGeneration(): void {
    logger.info('Starting TCS34725 mock data generation for development');
    
    // Simulate TCS34725 sensor readings every 2 seconds
    setInterval(() => {
      // Simulate TCS34725 16-bit color values for urine analysis
      // Different scenarios: healthy yellow to concerning dark colors
      const scenarios = [
        // Healthy pale yellow (good hydration)
        { r: 45000, g: 50000, b: 20000, c: 55000, ph: 6.0 + Math.random() * 1.5 },
        // Normal yellow 
        { r: 40000, g: 45000, b: 15000, c: 50000, ph: 6.5 + Math.random() * 1.0 },
        // Dark yellow (mild dehydration)
        { r: 35000, g: 38000, b: 12000, c: 45000, ph: 7.0 + Math.random() * 0.8 },
        // Amber (concerning)
        { r: 30000, g: 32000, b: 8000, c: 40000, ph: 7.5 + Math.random() * 0.6 },
        // Dark amber/brown (critical)
        { r: 25000, g: 20000, b: 5000, c: 35000, ph: 8.0 + Math.random() * 0.5 }
      ];

      // Randomly select a scenario (weighted toward healthier readings)
      const weights = [0.4, 0.3, 0.15, 0.1, 0.05]; // 40% healthy, 30% normal, etc.
      let random = Math.random();
      let selectedScenario = scenarios[0];
      
      for (let i = 0; i < weights.length; i++) {
        if (random < weights.slice(0, i + 1).reduce((a, b) => a + b, 0)) {
          selectedScenario = scenarios[i];
          break;
        }
      }

      // Add some noise to the selected scenario
      const mockData: ArduinoData = {
        ph: Math.max(4.0, Math.min(9.0, selectedScenario.ph + (Math.random() - 0.5) * 0.2)),
        color: {
          r: Math.max(0, selectedScenario.r + Math.floor((Math.random() - 0.5) * 5000)),
          g: Math.max(0, selectedScenario.g + Math.floor((Math.random() - 0.5) * 5000)),
          b: Math.max(0, selectedScenario.b + Math.floor((Math.random() - 0.5) * 2000))
        },
        timestamp: Date.now()
      };

      logger.debug('Mock TCS34725 data:', mockData);
      this.dataProcessor.processArduinoData(mockData);
    }, 2000);
  }

  async sendCommand(command: string): Promise<void> {
    if (!this.port || !this.port.isOpen) {
      throw new Error('Serial port not connected');
    }

    return new Promise((resolve, reject) => {
      this.port!.write(command + '\n', (error) => {
        if (error) {
          logger.error('Error sending command:', error);
          reject(error);
        } else {
          logger.debug('Command sent:', command);
          resolve();
        }
      });
    });
  }

  isConnected(): boolean {
    return this.port?.isOpen || false;
  }

  getConnectionInfo(): { connected: boolean; port: string; baudRate: number } {
    return {
      connected: this.isConnected(),
      port: this.config.port,
      baudRate: this.config.baudRate
    };
  }

  /**
   * Trigger a comprehensive manual sensor reading with 5-second data collection
   * @param userId - The authenticated user's ID for data storage
   * @returns Promise with the processed reading result
   */
  async triggerManualReading(userId?: string): Promise<{
    success: boolean;
    data?: {
      averagedReading: ArduinoData;
      colorScore: number;
      confidence: number;
      recommendations: string[];
      readingId?: string;
    };
    error?: string;
  }> {
    logger.info('Comprehensive manual reading triggered', { userId });
    
    try {
      // Step 1: Check Arduino device connection
      const isConnected = await this.checkArduinoConnection();
      logger.info(`Arduino connection status: ${isConnected ? 'Connected' : 'Disconnected'}`);
      
      // Step 2: Collect readings for 5 seconds
      const readings = await this.collectReadingsFor5Seconds(isConnected);
      
      if (readings.length === 0) {
        return {
          success: false,
          error: 'No readings collected during 5-second period'
        };
      }
      
      logger.info(`Collected ${readings.length} readings over 5 seconds`);
      
      // Step 3: Average the collected data
      const averagedReading = this.averageReadings(readings);
      logger.info('Averaged reading:', averagedReading);
      
      // Step 4: Process through k-means algorithm and get rating
      const colorResult = this.colorService.classifyColor(averagedReading.color);
      logger.info(`K-means classification: Score=${colorResult.score}, Confidence=${colorResult.confidence.toFixed(3)}`);
      
      // Step 5: Get health recommendations
      const recommendations = this.colorService.getHealthRecommendations(colorResult.score);
      
      // Step 6: Store in Supabase with userId and date
      const readingId = await this.storeProcessedReading(averagedReading, colorResult, userId, recommendations);
      
      logger.info(`Manual reading completed successfully. Reading ID: ${readingId}`);
      
      return {
        success: true,
        data: {
          averagedReading,
          colorScore: colorResult.score,
          confidence: colorResult.confidence,
          recommendations,
          readingId
        }
      };
      
    } catch (error) {
      logger.error('Error in comprehensive manual reading:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Check if Arduino device is properly connected
   */
  private async checkArduinoConnection(): Promise<boolean> {
    if (!this.port) {
      return false;
    }
    
    try {
      return this.port.isOpen;
    } catch (error) {
      logger.warn('Error checking Arduino connection:', error);
      return false;
    }
  }

  /**
   * Collect multiple readings over a 5-second period
   */
  private async collectReadingsFor5Seconds(isConnected: boolean): Promise<ArduinoData[]> {
    const readings: ArduinoData[] = [];
    const startTime = Date.now();
    const duration = 5000; // 5 seconds
    const targetReadings = 10; // Aim for ~2 readings per second
    
    logger.info('Starting 5-second data collection...');
    
    if (isConnected && this.port?.isOpen) {
      // Real Arduino data collection
      return new Promise((resolve) => {
        const tempReadings: ArduinoData[] = [];
        
        const dataHandler = (data: Buffer) => {
          const parsed = this.parseArduinoData(data.toString());
          if (parsed) {
            tempReadings.push(parsed);
            logger.debug(`Reading ${tempReadings.length}: pH=${parsed.ph.toFixed(2)}, RGB=(${parsed.color.r},${parsed.color.g},${parsed.color.b})`);
          }
        };
        
        // Add temporary data handler
        this.port!.on('data', dataHandler);
        
        // Request continuous readings
        const readingInterval = setInterval(() => {
          if (this.port?.isOpen) {
            this.port.write('READ\n');
          }
        }, 500); // Request reading every 500ms
        
        // Stop after 5 seconds
        setTimeout(() => {
          clearInterval(readingInterval);
          this.port!.removeListener('data', dataHandler);
          logger.info(`Collected ${tempReadings.length} real Arduino readings`);
          resolve(tempReadings);
        }, duration);
      });
    } else {
      // Mock data collection for development
      for (let i = 0; i < targetReadings; i++) {
        const mockReading = this.generateSingleMockReadingData();
        readings.push(mockReading);
        
        logger.debug(`Mock reading ${i + 1}: pH=${mockReading.ph.toFixed(2)}, RGB=(${mockReading.color.r},${mockReading.color.g},${mockReading.color.b})`);
        
        // Small delay to simulate real timing
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      logger.info(`Generated ${readings.length} mock readings`);
    }
    
    return readings;
  }

  /**
   * Average multiple readings into a single representative reading
   */
  private averageReadings(readings: ArduinoData[]): ArduinoData {
    if (readings.length === 0) {
      throw new Error('Cannot average empty readings array');
    }
    
    const avgPh = readings.reduce((sum, r) => sum + r.ph, 0) / readings.length;
    const avgR = Math.round(readings.reduce((sum, r) => sum + r.color.r, 0) / readings.length);
    const avgG = Math.round(readings.reduce((sum, r) => sum + r.color.g, 0) / readings.length);
    const avgB = Math.round(readings.reduce((sum, r) => sum + r.color.b, 0) / readings.length);
    
    const averagedReading: ArduinoData = {
      ph: Math.round(avgPh * 100) / 100, // Round to 2 decimal places
      color: {
        r: Math.max(0, Math.min(255, avgR)),
        g: Math.max(0, Math.min(255, avgG)),
        b: Math.max(0, Math.min(255, avgB))
      },
      timestamp: Date.now()
    };
    
    logger.info(`Averaged ${readings.length} readings: pH=${averagedReading.ph}, RGB=(${averagedReading.color.r},${averagedReading.color.g},${averagedReading.color.b})`);
    
    return averagedReading;
  }

  /**
   * Store the processed reading with full context
   */
  private async storeProcessedReading(
    reading: ArduinoData, 
    colorResult: any, 
    userId?: string, 
    recommendations?: string[]
  ): Promise<string | undefined> {
    try {
      // Use the existing data processor with user context
      await this.dataProcessor.processArduinoData(reading, userId);
      
      // Return a simple identifier
      return `manual_${Date.now()}`;
    } catch (error) {
      logger.error('Error storing processed reading:', error);
      throw error;
    }
  }

  /**
   * Generate a single mock reading (enhanced for manual reading)
   */
  private generateSingleMockReadingData(): ArduinoData {
    // More realistic scenarios for manual testing
    const scenarios = [
      // Healthy pale yellow (good hydration)
      { r: 45000, g: 50000, b: 20000, c: 55000, ph: 6.0 + Math.random() * 1.5 },
      // Normal yellow 
      { r: 40000, g: 45000, b: 15000, c: 50000, ph: 6.5 + Math.random() * 1.0 },
      // Dark yellow (mild dehydration)
      { r: 35000, g: 38000, b: 12000, c: 45000, ph: 7.0 + Math.random() * 0.8 },
      // Amber (concerning)
      { r: 30000, g: 32000, b: 8000, c: 40000, ph: 7.5 + Math.random() * 0.6 },
      // Dark amber/brown (critical)
      { r: 25000, g: 20000, b: 5000, c: 35000, ph: 8.0 + Math.random() * 0.5 }
    ];

    // Weighted selection toward healthier readings
    const weights = [0.4, 0.3, 0.15, 0.1, 0.05];
    let random = Math.random();
    let selectedScenario = scenarios[0];
    
    for (let i = 0; i < weights.length; i++) {
      if (random < weights.slice(0, i + 1).reduce((a, b) => a + b, 0)) {
        selectedScenario = scenarios[i];
        break;
      }
    }

    // Add realistic noise variation
    const noiseLevel = 0.1;
    return {
      ph: Math.max(4.0, Math.min(9.0, selectedScenario.ph + (Math.random() - 0.5) * noiseLevel)),
      color: {
        r: Math.max(0, Math.min(255, Math.round(selectedScenario.r / 256) + (Math.random() - 0.5) * 10)),
        g: Math.max(0, Math.min(255, Math.round(selectedScenario.g / 256) + (Math.random() - 0.5) * 10)), 
        b: Math.max(0, Math.min(255, Math.round(selectedScenario.b / 256) + (Math.random() - 0.5) * 10))
      },
      timestamp: Date.now()
    };
  }

  /**
   * Generate a single mock reading for development/testing
   */
  private generateSingleMockReading(): void {
    logger.info('Generating single mock reading');
    
    // Simulate TCS34725 sensor readings - similar to automatic generation but single reading
    const scenarios = [
      // Healthy pale yellow (good hydration)
      { r: 45000, g: 50000, b: 20000, c: 55000, ph: 6.0 + Math.random() * 1.5 },
      // Normal yellow 
      { r: 40000, g: 45000, b: 15000, c: 50000, ph: 6.5 + Math.random() * 1.0 },
      // Dark yellow (mild dehydration)
      { r: 35000, g: 38000, b: 12000, c: 45000, ph: 7.0 + Math.random() * 0.8 },
      // Amber (concerning)
      { r: 30000, g: 32000, b: 8000, c: 40000, ph: 7.5 + Math.random() * 0.6 },
      // Dark amber/brown (critical)
      { r: 25000, g: 20000, b: 5000, c: 35000, ph: 8.0 + Math.random() * 0.5 }
    ];

    // Randomly select a scenario (weighted toward healthier readings)
    const weights = [0.4, 0.3, 0.15, 0.1, 0.05]; // 40% healthy, 30% normal, etc.
    let random = Math.random();
    let selectedScenario = scenarios[0];
    
    for (let i = 0; i < weights.length; i++) {
      if (random < weights.slice(0, i + 1).reduce((a, b) => a + b, 0)) {
        selectedScenario = scenarios[i];
        break;
      }
    }

    // Add some noise to the selected scenario
    const mockData: ArduinoData = {
      ph: Math.max(4.0, Math.min(9.0, selectedScenario.ph + (Math.random() - 0.5) * 0.2)),
      color: {
        r: Math.max(0, Math.min(255, Math.round(selectedScenario.r / 256))),
        g: Math.max(0, Math.min(255, Math.round(selectedScenario.g / 256))),
        b: Math.max(0, Math.min(255, Math.round(selectedScenario.b / 256)))
      },
      timestamp: Date.now()
    };

    // Process the mock data
    this.dataProcessor.processArduinoData(mockData);
    logger.info(`Manual mock reading generated: pH=${mockData.ph.toFixed(2)}, RGB=(${mockData.color.r},${mockData.color.g},${mockData.color.b})`);
  }

  async close(): Promise<void> {
    if (this.port && this.port.isOpen) {
      return new Promise((resolve) => {
        this.port!.close(() => {
          logger.info('Serial port closed');
          resolve();
        });
      });
    }
  }
} 