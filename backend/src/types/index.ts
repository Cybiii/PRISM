export interface UrineReading {
  id?: number;
  timestamp: Date;
  phValue: number;
  colorRgb: RGBColor;
  colorLab: LABColor;
  colorScore: number;
  deviceId?: string;
  processed: boolean;
}

export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

export interface LABColor {
  l: number;
  a: number;
  b: number;
}

export interface ColorCluster {
  id: number;
  score: number; // 1-10 health score
  centroid: LABColor;
  sampleCount: number;
  lastUpdated: Date;
  description: string; // e.g., "Healthy pale yellow", "Concerning dark amber"
}

export interface ArduinoData {
  ph: number;
  color: RGBColor;
  timestamp: number;
  metadata?: {
    hydrationStatus?: string;
    voltage?: number;
    rawADC?: number;
  };
}

export interface PHBuffer {
  values: number[];
  timestamps: number[];
  capacity: number;
}

export interface ProcessedData {
  phValue: number; // 10-second average
  colorScore: number; // 1-10 classification
  colorRgb: RGBColor;
  timestamp: Date;
  confidence: number; // How confident the color classification is
}

export interface SerialConfig {
  port: string;
  baudRate: number;
  autoDetect: boolean;
}

export interface DatabaseConfig {
  filename: string;
  migrationsPath: string;
}

export interface ClusteringConfig {
  k: number; // Number of clusters (10 for scores 1-10)
  maxIterations: number;
  tolerance: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: {
    database: 'running' | 'error' | 'not initialized';
    serial: 'running' | 'error' | 'not initialized';
    colorClassification: 'running' | 'error' | 'not initialized';
  };
  uptime: number;
  lastReading?: Date;
} 