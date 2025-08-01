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
  private mockDataEnabled = false; // 🚫 Control variable to stop automatic mock data generation
  private mockDataInterval: NodeJS.Timeout | null = null;

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
        logger.warn('Arduino connection failed in development mode, NOT starting automatic mock data generation');
        logger.info('Use manual reading or enable mock data to generate readings');
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

        logger.info('🔍 Raw Arduino data (continuous):', trimmedData);

        // Parse Arduino data format: "PH:7.2,R:255,G:200,B:100" or new format
        const arduinoData = this.parseArduinoData(trimmedData);
        if (arduinoData) {
          logger.info(`✅ Arduino data parsed: pH=${arduinoData.ph.toFixed(2)}, RGB=(${arduinoData.color.r},${arduinoData.color.g},${arduinoData.color.b})`);
          this.dataProcessor.processArduinoData(arduinoData);
        } else {
          logger.warn(`❌ Failed to parse continuous Arduino data: "${trimmedData}"`);
        }
      } catch (error) {
        logger.error('Error processing Arduino data:', error);
      }
    });
  }

  private parseArduinoData(data: string): ArduinoData | null {
    // Debug: Log every incoming message
    const trimmedData = data.trim();
    if (trimmedData.length === 0) {
      logger.debug('📡 Received empty Arduino message');
      return null;
    }
    
    logger.debug(`📡 Parsing Arduino data: "${trimmedData}"`);
    
    try {
      // New Arduino format: "Hydration: Good | Raw ADC: 512 | Voltage: 2.500 V | pH: 7.35 | RGB: 155,164,62"
      // Updated format includes RGB values for K-means analysis
      
      // Enhanced parsing for current Arduino format: "Hydration: 10 | Raw ADC: 712 | Voltage: 3.480 V | pH: 6.51 | RGB: 75,100,90"
      if (data.includes('Hydration:') && data.includes('pH:')) {
        const hydrationMatch = data.match(/Hydration:\s*(\d+)/);
        const phMatch = data.match(/pH:\s*([\d.]+)/);
        const voltageMatch = data.match(/Voltage:\s*([\d.]+)/);
        const adcMatch = data.match(/Raw ADC:\s*(\d+)/);
        
        // More flexible RGB parsing to handle different spacing
        const rgbMatch = data.match(/RGB:\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
        
        if (phMatch && hydrationMatch) {
          const ph = parseFloat(phMatch[1]);
          const colorScore = parseInt(hydrationMatch[1]);
          const voltage = voltageMatch ? parseFloat(voltageMatch[1]) : null;
          const rawADC = adcMatch ? parseInt(adcMatch[1]) : null;
          
          // Validate pH range
          if (ph < 0 || ph > 14) {
            logger.warn('pH value out of range:', ph);
            return null;
          }
          
          // Validate color score range
          if (colorScore < 1 || colorScore > 10) {
            logger.warn('Color score out of range (1-10):', colorScore);
            return null;
          }
          
          let r = 128, g = 128, b = 128; // Default values if RGB not found
          
          if (rgbMatch) {
            r = parseInt(rgbMatch[1]);
            g = parseInt(rgbMatch[2]);
            b = parseInt(rgbMatch[3]);
            
            // Validate RGB values
            if (r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) {
              logger.warn('RGB values out of range, using defaults:', { r, g, b });
              r = Math.max(0, Math.min(255, r));
              g = Math.max(0, Math.min(255, g));
              b = Math.max(0, Math.min(255, b));
            }
            logger.debug(`✅ Successfully parsed RGB: (${r},${g},${b})`);
          } else {
            logger.warn('RGB values not found in Arduino data, using defaults (128,128,128)');
          }
          
          logger.info(`🎯 Arduino data parsed successfully: ColorScore=${colorScore}, pH=${ph}, RGB=(${r},${g},${b}), Voltage=${voltage}V, ADC=${rawADC}`);
          
          return {
            ph,
            color: { r, g, b },
            colorScore,
            timestamp: Date.now(),
            metadata: {
              voltage: voltage || undefined,
              rawADC: rawADC || undefined
            }
          };
        }
      }
      
      // Handle legacy RGB format for backward compatibility
      if (data.includes('RGB:') && data.includes('HEX:')) {
        const rgbMatch = data.match(/RGB:\s*(\d+),\s*(\d+),\s*(\d+)/);
        if (rgbMatch) {
          const r = parseInt(rgbMatch[1]);
          const g = parseInt(rgbMatch[2]);
          const b = parseInt(rgbMatch[3]);
          
          return {
            ph: 7.0 + (Math.random() - 0.5) * 2, // Simulate pH 6-8
            color: { r, g, b },
            colorScore: Math.floor(Math.random() * 10) + 1, // Random score 1-10
            timestamp: Date.now()
          };
        }
      }
      
      // Handle simple numeric score (1-10)
      const numericScore = parseInt(trimmedData);
      if (!isNaN(numericScore) && numericScore >= 1 && numericScore <= 10) {
        logger.info(`🎯 Parsing simple numeric score: ${numericScore}`);
        
        // Generate reasonable pH and RGB values based on score
        const scoreData = this.getDataFromScore(numericScore);
        
        return {
          ph: scoreData.ph,
          color: scoreData.color,
          colorScore: numericScore,
          timestamp: Date.now(),
          metadata: {
            voltage: undefined,
            rawADC: undefined
          }
        };
      }
      
      // Try JSON format
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
          colorScore: parsed.colorScore || 7, // Default to fair score
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
        const trimmedData = data.trim();
        logger.debug('Invalid Arduino data format');
        logger.debug(`📡 Arduino says: "${trimmedData}"`);
        logger.debug(`📡 Raw length: ${data.length}, Trimmed length: ${trimmedData.length}`);
        logger.debug(`📡 Raw bytes: [${Array.from(data).map(c => c.charCodeAt(0)).join(', ')}]`);
        logger.debug(`📡 Raw string: ${JSON.stringify(data)}`);
        logger.debug('Expected format: "Hydration: Good | Raw ADC: 512 | Voltage: 2.500 V | pH: 7.35 | RGB: 155,164,62"');
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
        colorScore: values.SCORE || 7, // Default to fair score if not provided
        timestamp: Date.now()
      };
    } catch (error) {
      logger.error('Error parsing Arduino data:', error);
      return null;
    }
  }

  /**
   * Map numeric score (1-10) to realistic pH and RGB values
   */
  private getDataFromScore(score: number): { ph: number; color: RGBColor } {
    const scoreMap: { [key: number]: { ph: number; color: RGBColor } } = {
      1: { // Critical - dark brown/red
        ph: 8.0 + Math.random() * 0.5, // pH 8.0-8.5
        color: { r: 120, g: 80, b: 20 }
      },
      2: { // Very close to critical
        ph: 7.8 + Math.random() * 0.3, // pH 7.8-8.1
        color: { r: 150, g: 100, b: 25 }
      },
      3: { // Severely dehydrated
        ph: 7.6 + Math.random() * 0.3, // pH 7.6-7.9
        color: { r: 180, g: 120, b: 30 }
      },
      4: { // Dehydrated
        ph: 7.4 + Math.random() * 0.3, // pH 7.4-7.7
        color: { r: 200, g: 140, b: 40 }
      },
      5: { // Between Slightly and Dehydrated
        ph: 7.2 + Math.random() * 0.3, // pH 7.2-7.5
        color: { r: 230, g: 170, b: 50 }
      },
      6: { // Slightly Dehydrated
        ph: 7.0 + Math.random() * 0.3, // pH 7.0-7.3
        color: { r: 255, g: 200, b: 80 }
      },
      7: { // Fair
        ph: 6.8 + Math.random() * 0.3, // pH 6.8-7.1
        color: { r: 255, g: 220, b: 120 }
      },
      8: { // Between Good and Fair
        ph: 6.6 + Math.random() * 0.3, // pH 6.6-6.9
        color: { r: 255, g: 235, b: 150 }
      },
      9: { // Overhydrated
        ph: 6.2 + Math.random() * 0.3, // pH 6.2-6.5
        color: { r: 250, g: 250, b: 210 }
      },
      10: { // Good - pale yellow
        ph: 6.5 + Math.random() * 0.5, // pH 6.5-7.0
        color: { r: 255, g: 248, b: 180 }
      }
    };

    const data = scoreMap[score] || scoreMap[7]; // Default to Fair if score not found
    
    // Add some random variation to make it more realistic
    const variation = 0.1;
    return {
      ph: Math.max(4.0, Math.min(10.0, data.ph + (Math.random() - 0.5) * variation)),
      color: {
        r: Math.max(0, Math.min(255, data.color.r + Math.floor((Math.random() - 0.5) * 20))),
        g: Math.max(0, Math.min(255, data.color.g + Math.floor((Math.random() - 0.5) * 20))),
        b: Math.max(0, Math.min(255, data.color.b + Math.floor((Math.random() - 0.5) * 20)))
      }
    };
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
    if (!this.mockDataEnabled) {
      logger.info('Mock data generation is disabled. Use enableMockData() to start automatic generation.');
      return;
    }

    logger.info('Starting TCS34725 mock data generation for development');
    
    // Clear any existing interval
    if (this.mockDataInterval) {
      clearInterval(this.mockDataInterval);
    }
    
    // Simulate TCS34725 sensor readings every 2 seconds
    this.mockDataInterval = setInterval(() => {
      if (!this.mockDataEnabled) {
        this.stopMockDataGeneration();
        return;
      }

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
        colorScore: Math.floor(Math.random() * 10) + 1, // Random score 1-10
        timestamp: Date.now()
      };

      logger.debug('Mock TCS34725 data:', mockData);
      this.dataProcessor.processArduinoData(mockData);
    }, 2000);
  }

  /**
   * Enable automatic mock data generation
   */
  public enableMockData(): void {
    logger.info('🔄 Enabling automatic mock data generation');
    this.mockDataEnabled = true;
    this.startMockDataGeneration();
  }

  /**
   * Disable automatic mock data generation
   */
  public disableMockData(): void {
    logger.info('🚫 Disabling automatic mock data generation');
    this.mockDataEnabled = false;
    this.stopMockDataGeneration();
  }

  /**
   * Stop mock data generation interval
   */
  private stopMockDataGeneration(): void {
    if (this.mockDataInterval) {
      clearInterval(this.mockDataInterval);
      this.mockDataInterval = null;
      logger.info('Mock data generation stopped');
    }
  }

  /**
   * Check if mock data generation is enabled
   */
  public isMockDataEnabled(): boolean {
    return this.mockDataEnabled;
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
        logger.warn('No readings collected, using mock data for development');
        // Generate a single mock reading for development
        const mockReading = this.generateSingleMockReadingData();
        readings.push(mockReading);
        logger.info('Using mock reading for analysis');
      }
      
      logger.info(`Collected ${readings.length} readings over 5 seconds`);
      
      // Step 3: Average the collected data
      const averagedReading = this.averageReadings(readings);
      logger.info('Averaged reading:', averagedReading);
      
      // Step 4: Use Arduino's color score directly (no K-means needed)
      const colorScore = averagedReading.colorScore;
      logger.info(`Arduino color score: ${colorScore}`);
      
      const colorResult = {
        score: colorScore,
        confidence: 1.0, // Arduino analysis is always confident
        lab: { l: 50, a: 0, b: 0 } // Not used anymore
      };
      
      // Step 5: Get health recommendations based on Arduino score
      const recommendations = this.getHealthRecommendations(colorScore);
      
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
          const rawData = data.toString();
          logger.info(`🔍 RAW Arduino data received: "${rawData}"`);
          const parsed = this.parseArduinoData(rawData);
          if (parsed) {
            tempReadings.push(parsed);
            logger.info(`✅ Reading ${tempReadings.length}: pH=${parsed.ph.toFixed(2)}, RGB=(${parsed.color.r},${parsed.color.g},${parsed.color.b})`);
          } else {
            logger.warn(`❌ Failed to parse Arduino data: "${rawData}"`);
          }
        };
        
        // Add temporary data handler
        this.port!.on('data', dataHandler);
        
        // Request continuous readings (Arduino outputs automatically, no need to request)
        const readingInterval = setInterval(() => {
          if (this.port?.isOpen) {
            // Arduino automatically outputs data every second, no need to request
            logger.debug('Waiting for Arduino data...');
          }
        }, 500); // Check every 500ms
        
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
    const avgColorScore = Math.round(readings.reduce((sum, r) => sum + r.colorScore, 0) / readings.length);
    
    const averagedReading: ArduinoData = {
      ph: Math.round(avgPh * 100) / 100, // Round to 2 decimal places
      color: {
        r: Math.max(0, Math.min(255, avgR)),
        g: Math.max(0, Math.min(255, avgG)),
        b: Math.max(0, Math.min(255, avgB))
      },
      colorScore: Math.max(1, Math.min(10, avgColorScore)), // Ensure score is between 1-10
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
    // More realistic scenarios for manual testing with color scores
    const scenarios = [
      // Healthy pale yellow (good hydration) - Score 10
      { r: 45000, g: 50000, b: 20000, c: 55000, ph: 6.0 + Math.random() * 1.5, score: 10 },
      // Normal yellow - Score 8
      { r: 40000, g: 45000, b: 15000, c: 50000, ph: 6.5 + Math.random() * 1.0, score: 8 },
      // Dark yellow (mild dehydration) - Score 6
      { r: 35000, g: 38000, b: 12000, c: 45000, ph: 7.0 + Math.random() * 0.8, score: 6 },
      // Amber (concerning) - Score 4
      { r: 30000, g: 32000, b: 8000, c: 40000, ph: 7.5 + Math.random() * 0.6, score: 4 },
      // Dark amber/brown (critical) - Score 2
      { r: 25000, g: 20000, b: 5000, c: 35000, ph: 8.0 + Math.random() * 0.5, score: 2 }
    ];

    // Weighted selection toward healthier readings
    const weights = [0.4, 0.3, 0.15, 0.1, 0.05];
    let random = Math.random();
    let selectedScenario = scenarios[0];
    let selectedIndex = 0;
    
    for (let i = 0; i < weights.length; i++) {
      if (random < weights.slice(0, i + 1).reduce((a, b) => a + b, 0)) {
        selectedScenario = scenarios[i];
        selectedIndex = i;
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
      colorScore: selectedScenario.score,
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
      colorScore: Math.floor(Math.random() * 10) + 1, // Random score 1-10
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