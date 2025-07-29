import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';
import { ArduinoData, RGBColor, SerialConfig } from '../types';
import { logger } from '../utils/logger';
import { DataProcessingService } from './DataProcessingService';

export class SerialService {
  private port: SerialPort | null = null;
  private parser: ReadlineParser | null = null;
  private config: SerialConfig;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 5000; // 5 seconds

  constructor(private dataProcessor: DataProcessingService) {
    this.config = {
      port: process.env.ARDUINO_PORT || 'COM3', // Default Windows port
      baudRate: parseInt(process.env.ARDUINO_BAUD_RATE || '9600'),
      autoDetect: process.env.ARDUINO_AUTO_DETECT === 'true'
    };
  }

  async initialize(): Promise<void> {
    // In development, check environment first
    if (process.env.NODE_ENV === 'development') {
      logger.info('Development mode detected - checking Arduino connection...');
      
      try {
        if (this.config.autoDetect) {
          await this.detectArduinoPort();
        }
        
        await this.connectToArduino();
        logger.info(`Serial service initialized on port ${this.config.port}`);
        return;
      } catch (error) {
        logger.warn('Arduino connection failed in development mode, using mock data:', error);
        this.startMockDataGeneration();
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
      // TCS34725: "PH:7.2,R:1234,G:2345,B:3456,C:4567" (16-bit values)
      // Standard: "PH:7.2,R:255,G:200,B:100" (8-bit values)
      // JSON: {"ph": 7.2, "r": 1234, "g": 2345, "b": 3456, "c": 4567}
      
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

      // Parse key-value format
      const pairs = data.split(',');
      const values: { [key: string]: number } = {};

      for (const pair of pairs) {
        const [key, value] = pair.split(':');
        if (key && value) {
          values[key.trim().toUpperCase()] = parseFloat(value.trim());
        }
      }

      // Validate required fields
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