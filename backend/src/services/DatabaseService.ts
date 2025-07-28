import sqlite3 from 'sqlite3';
import { Database, open } from 'sqlite';
import path from 'path';
import { UrineReading, ColorCluster, RGBColor, LABColor } from '../types';
import { logger } from '../utils/logger';

export class DatabaseService {
  private db: Database<sqlite3.Database, sqlite3.Statement> | null = null;
  private readonly dbPath: string;

  constructor() {
    this.dbPath = path.join(process.cwd(), 'data', 'puma.db');
  }

  async initialize(): Promise<void> {
    try {
      // Ensure data directory exists
      const dataDir = path.dirname(this.dbPath);
      const fs = await import('fs');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      // Open database connection
      this.db = await open({
        filename: this.dbPath,
        driver: sqlite3.Database
      });

      await this.createTables();
      await this.initializeDefaultClusters();
      
      logger.info(`Database initialized: ${this.dbPath}`);
    } catch (error) {
      logger.error('Database initialization failed:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Readings table
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS readings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME NOT NULL,
        ph_value REAL NOT NULL,
        color_r INTEGER NOT NULL,
        color_g INTEGER NOT NULL,
        color_b INTEGER NOT NULL,
        color_l REAL NOT NULL,
        color_a REAL NOT NULL,
        color_b_val REAL NOT NULL,
        color_score INTEGER NOT NULL,
        device_id TEXT,
        processed BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Color clusters table
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS color_clusters (
        id INTEGER PRIMARY KEY,
        score INTEGER NOT NULL UNIQUE,
        centroid_l REAL NOT NULL,
        centroid_a REAL NOT NULL,
        centroid_b REAL NOT NULL,
        sample_count INTEGER DEFAULT 0,
        description TEXT NOT NULL,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for performance
    await this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_readings_timestamp ON readings(timestamp);
      CREATE INDEX IF NOT EXISTS idx_readings_color_score ON readings(color_score);
      CREATE INDEX IF NOT EXISTS idx_clusters_score ON color_clusters(score);
    `);
  }

  private async initializeDefaultClusters(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Check if clusters already exist
    const existingClusters = await this.db.get('SELECT COUNT(*) as count FROM color_clusters');
    if (existingClusters.count > 0) {
      logger.info('Color clusters already initialized');
      return;
    }

    // Default color clusters based on urine color health scale
    const defaultClusters: Omit<ColorCluster, 'lastUpdated'>[] = [
      { id: 1, score: 1, centroid: { l: 95, a: -2, b: 8 }, sampleCount: 0, description: "Excellent - Very pale yellow" },
      { id: 2, score: 2, centroid: { l: 90, a: -1, b: 15 }, sampleCount: 0, description: "Excellent - Pale yellow" },
      { id: 3, score: 3, centroid: { l: 85, a: 0, b: 25 }, sampleCount: 0, description: "Good - Light yellow" },
      { id: 4, score: 4, centroid: { l: 80, a: 2, b: 35 }, sampleCount: 0, description: "Good - Yellow" },
      { id: 5, score: 5, centroid: { l: 75, a: 5, b: 45 }, sampleCount: 0, description: "Fair - Dark yellow" },
      { id: 6, score: 6, centroid: { l: 70, a: 8, b: 55 }, sampleCount: 0, description: "Fair - Amber" },
      { id: 7, score: 7, centroid: { l: 60, a: 15, b: 65 }, sampleCount: 0, description: "Concerning - Dark amber" },
      { id: 8, score: 8, centroid: { l: 45, a: 25, b: 45 }, sampleCount: 0, description: "Concerning - Orange/Brown" },
      { id: 9, score: 9, centroid: { l: 35, a: 35, b: 25 }, sampleCount: 0, description: "Alarming - Dark brown" },
      { id: 10, score: 10, centroid: { l: 25, a: 30, b: 15 }, sampleCount: 0, description: "Critical - Very dark/Red" }
    ];

    for (const cluster of defaultClusters) {
      await this.db.run(`
        INSERT INTO color_clusters (id, score, centroid_l, centroid_a, centroid_b, sample_count, description)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        cluster.id, cluster.score, 
        cluster.centroid.l, cluster.centroid.a, cluster.centroid.b,
        cluster.sampleCount, cluster.description
      ]);
    }

    logger.info('Default color clusters initialized');
  }

  async saveReading(reading: Omit<UrineReading, 'id'>): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.run(`
      INSERT INTO readings (
        timestamp, ph_value, color_r, color_g, color_b, 
        color_l, color_a, color_b_val, color_score, device_id, processed
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      reading.timestamp.toISOString(),
      reading.phValue,
      reading.colorRgb.r, reading.colorRgb.g, reading.colorRgb.b,
      reading.colorLab.l, reading.colorLab.a, reading.colorLab.b,
      reading.colorScore,
      reading.deviceId || null,
      reading.processed ? 1 : 0
    ]);

    return result.lastID!;
  }

  async getLatestReading(): Promise<UrineReading | null> {
    if (!this.db) throw new Error('Database not initialized');

    const row = await this.db.get(`
      SELECT * FROM readings 
      ORDER BY timestamp DESC 
      LIMIT 1
    `);

    return row ? this.mapRowToReading(row) : null;
  }

  async getReadings(limit: number = 100, offset: number = 0): Promise<UrineReading[]> {
    if (!this.db) throw new Error('Database not initialized');

    const rows = await this.db.all(`
      SELECT * FROM readings 
      ORDER BY timestamp DESC 
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    return rows.map(row => this.mapRowToReading(row));
  }

  async getReadingsByDateRange(startDate: Date, endDate: Date): Promise<UrineReading[]> {
    if (!this.db) throw new Error('Database not initialized');

    const rows = await this.db.all(`
      SELECT * FROM readings 
      WHERE timestamp BETWEEN ? AND ?
      ORDER BY timestamp DESC
    `, [startDate.toISOString(), endDate.toISOString()]);

    return rows.map(row => this.mapRowToReading(row));
  }

  async getColorClusters(): Promise<ColorCluster[]> {
    if (!this.db) throw new Error('Database not initialized');

    const rows = await this.db.all('SELECT * FROM color_clusters ORDER BY score');
    
    return rows.map(row => ({
      id: row.id,
      score: row.score,
      centroid: { l: row.centroid_l, a: row.centroid_a, b: row.centroid_b_val },
      sampleCount: row.sample_count,
      description: row.description,
      lastUpdated: new Date(row.last_updated)
    }));
  }

  async updateCluster(cluster: ColorCluster): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.run(`
      UPDATE color_clusters 
      SET centroid_l = ?, centroid_a = ?, centroid_b = ?, 
          sample_count = ?, last_updated = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      cluster.centroid.l, cluster.centroid.a, cluster.centroid.b,
      cluster.sampleCount, cluster.id
    ]);
  }

  private mapRowToReading(row: any): UrineReading {
    return {
      id: row.id,
      timestamp: new Date(row.timestamp),
      phValue: row.ph_value,
      colorRgb: { r: row.color_r, g: row.color_g, b: row.color_b },
      colorLab: { l: row.color_l, a: row.color_a, b: row.color_b_val },
      colorScore: row.color_score,
      deviceId: row.device_id,
      processed: Boolean(row.processed)
    };
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
      logger.info('Database connection closed');
    }
  }
} 