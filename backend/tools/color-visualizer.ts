#!/usr/bin/env tsx

/**
 * PUMA TCS34725 Color Visualizer
 * A standalone tool to visualize colors from the TCS34725 sensor in real-time
 */

import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { ColorClassificationService } from '../src/services/ColorClassificationService';
import { RGBColor, ArduinoData } from '../src/types';

interface ColorReading {
  rgb: RGBColor;
  hex: string;
  health: {
    score: number;
    description: string;
    confidence: number;
  };
  timestamp: Date;
  raw?: {
    r: number;
    g: number;
    b: number;
    c: number;
  };
}

class ColorVisualizer {
  private port: SerialPort | null = null;
  private parser: ReadlineParser | null = null;
  private colorService: ColorClassificationService;
  private app: express.Application;
  private server: any;
  private io: Server;
  private mockMode: boolean = false;

  constructor() {
    this.colorService = new ColorClassificationService();
    this.app = express();
    this.server = createServer(this.app);
    this.io = new Server(this.server, {
      cors: { origin: "*", methods: ["GET", "POST"] }
    });

    this.setupWebServer();
    this.setupSocketHandlers();
  }

  async initialize(): Promise<void> {
    console.log('🎨 PUMA Color Visualizer Starting...\n');
    
    // Initialize color classification service
    await this.colorService.initialize();
    
    // Load default clusters for health scoring
    const defaultClusters = [
      { id: 1, score: 1, centroid: { l: 95, a: -2, b: 8 }, sampleCount: 0, description: "Excellent - Very pale yellow", lastUpdated: new Date() },
      { id: 2, score: 2, centroid: { l: 90, a: -1, b: 15 }, sampleCount: 0, description: "Excellent - Pale yellow", lastUpdated: new Date() },
      { id: 3, score: 3, centroid: { l: 85, a: 0, b: 25 }, sampleCount: 0, description: "Good - Light yellow", lastUpdated: new Date() },
      { id: 4, score: 4, centroid: { l: 80, a: 2, b: 35 }, sampleCount: 0, description: "Good - Yellow", lastUpdated: new Date() },
      { id: 5, score: 5, centroid: { l: 75, a: 5, b: 45 }, sampleCount: 0, description: "Fair - Dark yellow", lastUpdated: new Date() },
      { id: 6, score: 6, centroid: { l: 70, a: 8, b: 55 }, sampleCount: 0, description: "Fair - Amber", lastUpdated: new Date() },
      { id: 7, score: 7, centroid: { l: 60, a: 15, b: 65 }, sampleCount: 0, description: "Concerning - Dark amber", lastUpdated: new Date() },
      { id: 8, score: 8, centroid: { l: 45, a: 25, b: 45 }, sampleCount: 0, description: "Concerning - Orange/Brown", lastUpdated: new Date() },
      { id: 9, score: 9, centroid: { l: 35, a: 35, b: 25 }, sampleCount: 0, description: "Alarming - Dark brown", lastUpdated: new Date() },
      { id: 10, score: 10, centroid: { l: 25, a: 30, b: 15 }, sampleCount: 0, description: "Critical - Very dark/Red", lastUpdated: new Date() }
    ];
    
    this.colorService.setClusters(defaultClusters);

    // Try to connect to Arduino
    try {
      await this.connectToArduino();
      console.log('✅ Connected to TCS34725 sensor via Arduino on COM12');
      console.log('🎨 Expecting real-time color data from your sensor...');
    } catch (error) {
      console.log(`⚠️  Arduino not found on COM12: ${error.message}`);
      console.log('🔄 Starting mock data for demonstration');
      this.mockMode = true;
      this.startMockData();
    }

    // Start web server
    this.server.listen(3002, () => {
      console.log('\n🌐 Color Visualizer Web Interface:');
      console.log('   👉 http://localhost:3002');
      console.log('\n📊 Real-time color readings will appear below:\n');
    });
  }

  private async connectToArduino(): Promise<void> {
    // Use COM12 since we know the Arduino is connected there
    const arduinoPath = 'COM12';

    this.port = new SerialPort({
      path: arduinoPath,
      baudRate: 9600,
      autoOpen: false
    });

    this.parser = this.port.pipe(new ReadlineParser({ delimiter: '\n' }));

    return new Promise((resolve, reject) => {
      this.port!.on('open', () => {
        this.setupArduinoDataHandler();
        resolve();
      });

      this.port!.on('error', reject);
      this.port!.open();
    });
  }

  private setupArduinoDataHandler(): void {
    if (!this.parser) return;

    this.parser.on('data', (data: string) => {
      try {
        const arduinoData = this.parseArduinoData(data.trim());
        if (arduinoData) {
          this.processColorReading(arduinoData);
        }
      } catch (error) {
        console.error('Error processing Arduino data:', error);
      }
    });
  }

  private parseArduinoData(data: string): ArduinoData | null {
    try {
      // Handle current Arduino RGB format: "RGB: 77, 102, 79  HEX: #4D664F"
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

      // Handle PUMA format: "PH:7.2,R:45123,G:50234,B:20156,C:55000"
      const pairs = data.split(',');
      const values: { [key: string]: number } = {};

      for (const pair of pairs) {
        const [key, value] = pair.split(':');
        if (key && value) {
          values[key.trim().toUpperCase()] = parseFloat(value.trim());
        }
      }

      if (typeof values.R !== 'number' || typeof values.G !== 'number' || typeof values.B !== 'number') {
        return null;
      }

      // Check if 16-bit values (convert to 8-bit for display)
      const is16Bit = values.R > 255 || values.G > 255 || values.B > 255;
      const r = is16Bit ? Math.round((values.R / 65535) * 255) : values.R;
      const g = is16Bit ? Math.round((values.G / 65535) * 255) : values.G;
      const b = is16Bit ? Math.round((values.B / 65535) * 255) : values.B;

      return {
        ph: values.PH || 7.0,
        color: { r, g, b },
        timestamp: Date.now()
      };
    } catch {
      return null;
    }
  }

  private startMockData(): void {
    // This shouldn't be called when using real Arduino, but just in case
    console.log('⚠️  Using mock data - real Arduino should be connected');
    
    // Generate realistic TCS34725 mock data for demonstration
    const scenarios = [
      { r: 255, g: 255, b: 150, name: "Pale Yellow (Healthy)" },
      { r: 255, g: 235, b: 120, name: "Light Yellow (Good)" },
      { r: 255, g: 215, b: 90, name: "Yellow (Normal)" },
      { r: 255, g: 195, b: 60, name: "Dark Yellow (Mild Dehydration)" },
      { r: 255, g: 165, b: 40, name: "Amber (Concerning)" },
      { r: 200, g: 130, b: 30, name: "Dark Amber (Dehydrated)" },
      { r: 160, g: 100, b: 20, name: "Brown (Critical)" }
    ];

    let currentIndex = 0;

    setInterval(() => {
      const scenario = scenarios[currentIndex % scenarios.length];
      
      // Add some variation
      const r = Math.max(0, Math.min(255, scenario.r + (Math.random() - 0.5) * 20));
      const g = Math.max(0, Math.min(255, scenario.g + (Math.random() - 0.5) * 20));
      const b = Math.max(0, Math.min(255, scenario.b + (Math.random() - 0.5) * 20));

      const mockData: ArduinoData = {
        ph: 6.5 + Math.random() * 1.5,
        color: { r: Math.round(r), g: Math.round(g), b: Math.round(b) },
        timestamp: Date.now()
      };

      this.processColorReading(mockData);
      currentIndex++;
    }, 3000); // Change color every 3 seconds
  }

  private processColorReading(data: ArduinoData): void {
    const classification = this.colorService.classifyColor(data.color);
    const hex = this.rgbToHex(data.color);
    
    const reading: ColorReading = {
      rgb: data.color,
      hex,
      health: {
        score: classification.score,
        description: this.getScoreDescription(classification.score),
        confidence: classification.confidence
      },
      timestamp: new Date(data.timestamp)
    };

    // Display in terminal with color
    this.displayInTerminal(reading);
    
    // Send to web interface
    this.io.emit('colorReading', reading);
  }

  private displayInTerminal(reading: ColorReading): void {
    const { r, g, b } = reading.rgb;
    const colorBlock = `\x1b[48;2;${r};${g};${b}m    \x1b[0m`; // ANSI color block
    
    console.log(`${colorBlock} RGB(${r},${g},${b}) ${reading.hex} | Health Score: ${reading.health.score}/10 | ${reading.health.description}`);
  }

  private rgbToHex(rgb: RGBColor): string {
    const toHex = (n: number) => n.toString(16).padStart(2, '0');
    return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`.toUpperCase();
  }

  private getScoreDescription(score: number): string {
    const descriptions = {
      1: "Excellent - Very pale yellow",
      2: "Excellent - Pale yellow", 
      3: "Good - Light yellow",
      4: "Good - Yellow",
      5: "Fair - Dark yellow",
      6: "Fair - Amber",
      7: "Concerning - Dark amber",
      8: "Concerning - Orange/Brown",
      9: "Alarming - Dark brown",
      10: "Critical - Very dark/Red"
    };
    return descriptions[score] || "Unknown";
  }

  private setupWebServer(): void {
    // Serve static HTML page
    this.app.get('/', (req, res) => {
      res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>PUMA TCS34725 Color Visualizer</title>
    <script src="/socket.io/socket.io.js"></script>
    <style>
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            margin: 0; 
            padding: 20px; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
        }
        .container { 
            max-width: 800px; 
            margin: 0 auto; 
            background: rgba(255,255,255,0.1);
            border-radius: 15px;
            padding: 30px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        }
        h1 { 
            text-align: center; 
            margin-bottom: 30px;
            font-size: 2.5em;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        .color-display { 
            width: 200px; 
            height: 200px; 
            border-radius: 50%; 
            margin: 20px auto; 
            border: 5px solid white;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            transition: all 0.3s ease;
        }
        .info { 
            text-align: center; 
            margin: 10px 0; 
            font-size: 1.2em;
            background: rgba(255,255,255,0.1);
            padding: 15px;
            border-radius: 10px;
            margin: 10px 0;
        }
        .health-score { 
            font-size: 1.5em; 
            font-weight: bold;
            padding: 20px;
            border-radius: 10px;
            margin: 20px 0;
        }
        .score-1, .score-2 { background: rgba(76, 175, 80, 0.8); }
        .score-3, .score-4 { background: rgba(139, 195, 74, 0.8); }
        .score-5, .score-6 { background: rgba(255, 193, 7, 0.8); }
        .score-7, .score-8 { background: rgba(255, 152, 0, 0.8); }
        .score-9, .score-10 { background: rgba(244, 67, 54, 0.8); }
        .status { 
            text-align: center; 
            font-style: italic; 
            margin-top: 20px;
            background: rgba(255,255,255,0.1);
            padding: 10px;
            border-radius: 5px;
        }
        .timestamp { 
            font-size: 0.9em; 
            opacity: 0.8; 
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎨 PUMA TCS34725 Color Visualizer</h1>
        <div id="colorDisplay" class="color-display" style="background-color: #cccccc;"></div>
        <div id="rgbInfo" class="info">RGB: Waiting for data...</div>
        <div id="hexInfo" class="info">HEX: #CCCCCC</div>
        <div id="healthScore" class="health-score score-1">Health Score: Waiting...</div>
        <div id="timestamp" class="info timestamp">Last Update: Never</div>
        <div id="status" class="status">
            📡 Connected to real TCS34725 sensor on COM12
        </div>
    </div>

    <script>
        const socket = io();
        
        socket.on('colorReading', function(data) {
            // Update color display
            document.getElementById('colorDisplay').style.backgroundColor = data.hex;
            
            // Update info
            document.getElementById('rgbInfo').textContent = 
                \`RGB: \${data.rgb.r}, \${data.rgb.g}, \${data.rgb.b}\`;
            document.getElementById('hexInfo').textContent = \`HEX: \${data.hex}\`;
            
            // Update health score
            const healthEl = document.getElementById('healthScore');
            healthEl.textContent = \`Health Score: \${data.health.score}/10 - \${data.health.description}\`;
            healthEl.className = \`health-score score-\${data.health.score}\`;
            
            // Update timestamp
            document.getElementById('timestamp').textContent = 
                \`Last Update: \${new Date(data.timestamp).toLocaleTimeString()}\`;
        });
        
        socket.on('connect', function() {
            document.getElementById('status').innerHTML = 
                '✅ Connected to Color Visualizer';
        });
        
        socket.on('disconnect', function() {
            document.getElementById('status').innerHTML = 
                '❌ Disconnected from Color Visualizer';
        });
    </script>
</body>
</html>
      `);
    });
  }

  private setupSocketHandlers(): void {
    this.io.on('connection', (socket) => {
      console.log('🌐 Web client connected');
      
      socket.on('disconnect', () => {
        console.log('🌐 Web client disconnected');
      });
    });
  }

  async close(): Promise<void> {
    if (this.port && this.port.isOpen) {
      await new Promise<void>((resolve) => {
        this.port!.close(() => resolve());
      });
    }
    this.server.close();
  }
}

// CLI Interface
async function main() {
  const visualizer = new ColorVisualizer();
  
  try {
    await visualizer.initialize();
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n\n🛑 Shutting down Color Visualizer...');
      await visualizer.close();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Error starting Color Visualizer:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
} 