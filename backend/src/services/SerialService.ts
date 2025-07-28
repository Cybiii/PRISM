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
    try {
      if (this.config.autoDetect) {
        await this.detectArduinoPort();
      }
      
      await this.connectToArduino();
      logger.info(`Serial service initialized on port ${this.config.port}`);
    } catch (error) {
      logger.error('Serial service initialization failed:', error);
      
      // In development, we might want to continue without Arduino
      if (process.env.NODE_ENV === 'development') {
        logger.warn('Running in development mode without Arduino connection');
        this.startMockDataGeneration();
        return;
      }
      
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
      // Expected format: "PH:7.2,R:255,G:200,B:100" or JSON format
      
      // Try JSON format first
      if (data.startsWith('{')) {
        const parsed = JSON.parse(data);
        return {
          ph: parsed.ph || parsed.pH,
          color: {
            r: parsed.r || parsed.red,
            g: parsed.g || parsed.green,
            b: parsed.b || parsed.blue
          },
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

      // Validate ranges
      if (values.PH < 0 || values.PH > 14) {
        logger.warn('pH value out of range:', values.PH);
        return null;
      }

      if (values.R < 0 || values.R > 255 || 
          values.G < 0 || values.G > 255 || 
          values.B < 0 || values.B > 255) {
        logger.warn('RGB values out of range:', { r: values.R, g: values.G, b: values.B });
        return null;
      }

      return {
        ph: values.PH,
        color: {
          r: Math.round(values.R),
          g: Math.round(values.G),
          b: Math.round(values.B)
        },
        timestamp: Date.now()
      };
    } catch (error) {
      logger.error('Error parsing Arduino data:', error);
      return null;
    }
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
    logger.info('Starting mock data generation for development');
    
    // Generate realistic mock data every 2 seconds
    setInterval(() => {
      const mockData: ArduinoData = {
        ph: 5.5 + Math.random() * 3, // pH between 5.5 and 8.5
        color: {
          r: Math.floor(180 + Math.random() * 75), // Yellow-ish colors
          g: Math.floor(150 + Math.random() * 105),
          b: Math.floor(50 + Math.random() * 100)
        },
        timestamp: Date.now()
      };

      logger.debug('Mock Arduino data:', mockData);
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