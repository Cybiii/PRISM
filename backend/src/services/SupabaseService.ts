import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { logger } from '../utils/logger';
import { 
  UrineReading, 
  ColorCluster, 
  ProcessedData, 
  ArduinoData 
} from '../types';

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  age?: number;
  gender?: 'male' | 'female' | 'other';
  medical_conditions?: string[];
  medications?: string[];
  created_at: string;
  updated_at: string;
}

export interface HealthReading {
  id?: string;
  user_id: string;
  ph: number;
  color_r: number;
  color_g: number;
  color_b: number;
  color_hex: string;
  clear_value?: number;
  health_score: number;
  hydration_level: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  color_temperature?: number;
  confidence_score?: number;
  recommendations?: string[];
  alert_level?: 'none' | 'low' | 'medium' | 'high' | 'critical';
  alert_message?: string;
  device_id?: string;
  reading_source?: 'tcs34725' | 'manual' | 'calibration';
  notes?: string;
  reading_time: string;
  created_at?: string;
}

export interface DailySummary {
  id?: string;
  user_id: string;
  summary_date: string;
  reading_count: number;
  avg_ph?: number;
  avg_health_score?: number;
  dominant_hydration_level?: string;
  score_1_count?: number;
  score_2_count?: number;
  score_3_count?: number;
  score_4_count?: number;
  score_5_count?: number;
  score_6_count?: number;
  score_7_count?: number;
  score_8_count?: number;
  score_9_count?: number;
  score_10_count?: number;
  total_alerts?: number;
  critical_alerts?: number;
  created_at?: string;
  updated_at?: string;
}

export interface TimeRangeStats {
  totalReadings: number;
  avgHealthScore: number;
  avgPH: number;
  dominantHydrationLevel: string;
  scoreDistribution: { [key: number]: number };
  alertCount: number;
  trendDirection: 'improving' | 'declining' | 'stable';
}

export class SupabaseService {
  private supabase: SupabaseClient;
  private serviceSupabase: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration. Please check your environment variables.');
    }

    // Client for user-authenticated operations
    this.supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Service client for backend operations (bypasses RLS)
    this.serviceSupabase = createClient(supabaseUrl, supabaseServiceKey);

    logger.info('Supabase service initialized');
  }

  // User Management
  async createUserProfile(user: User, profileData: Partial<UserProfile>): Promise<UserProfile> {
    const { data, error } = await this.serviceSupabase
      .from('user_profiles')
      .insert({
        id: user.id,
        email: user.email!,
        ...profileData
      })
      .select()
      .single();

    if (error) {
      logger.error('Error creating user profile:', error);
      throw error;
    }

    logger.info(`User profile created for ${user.email}`);
    return data as UserProfile;
  }

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await this.serviceSupabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // No rows returned
        return null;
      }
      logger.error('Error fetching user profile:', error);
      throw error;
    }

    return data as UserProfile;
  }

  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    const { data, error } = await this.serviceSupabase
      .from('user_profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      logger.error('Error updating user profile:', error);
      throw error;
    }

    return data as UserProfile;
  }

  // Health Readings
  async saveHealthReading(reading: HealthReading): Promise<HealthReading> {
    const { data, error } = await this.serviceSupabase
      .from('health_readings')
      .insert(reading)
      .select()
      .single();

    if (error) {
      logger.error('Error saving health reading:', error);
      throw error;
    }

    logger.info(`Health reading saved for user ${reading.user_id}`);
    return data as HealthReading;
  }

  async getLatestReading(userId: string): Promise<HealthReading | null> {
    const { data, error } = await this.serviceSupabase
      .from('health_readings')
      .select('*')
      .eq('user_id', userId)
      .order('reading_time', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      logger.error('Error fetching latest reading:', error);
      throw error;
    }

    return data as HealthReading;
  }

  async getReadingsByTimeRange(
    userId: string, 
    hours: number, 
    limit?: number
  ): Promise<HealthReading[]> {
    const startTime = new Date();
    startTime.setHours(startTime.getHours() - hours);

    let query = this.serviceSupabase
      .from('health_readings')
      .select('*')
      .eq('user_id', userId)
      .gte('reading_time', startTime.toISOString())
      .order('reading_time', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Error fetching readings by time range:', error);
      throw error;
    }

    return data as HealthReading[];
  }

  // Time-based Analytics
  async get24HourStats(userId: string): Promise<TimeRangeStats> {
    return this.getTimeRangeStats(userId, 24);
  }

  async get7DayStats(userId: string): Promise<TimeRangeStats> {
    return this.getTimeRangeStats(userId, 24 * 7);
  }

  async get30DayStats(userId: string): Promise<TimeRangeStats> {
    return this.getTimeRangeStats(userId, 24 * 30);
  }

  private async getTimeRangeStats(userId: string, hours: number): Promise<TimeRangeStats> {
    const readings = await this.getReadingsByTimeRange(userId, hours);
    
    if (readings.length === 0) {
      return {
        totalReadings: 0,
        avgHealthScore: 0,
        avgPH: 0,
        dominantHydrationLevel: 'unknown',
        scoreDistribution: {},
        alertCount: 0,
        trendDirection: 'stable'
      };
    }

    // Calculate statistics
    const totalReadings = readings.length;
    const avgHealthScore = readings.reduce((sum, r) => sum + r.health_score, 0) / totalReadings;
    const avgPH = readings.reduce((sum, r) => sum + r.ph, 0) / totalReadings;
    
    // Hydration level frequency
    const hydrationCounts: { [key: string]: number } = {};
    readings.forEach(r => {
      hydrationCounts[r.hydration_level] = (hydrationCounts[r.hydration_level] || 0) + 1;
    });
    const dominantHydrationLevel = Object.entries(hydrationCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'unknown';

    // Score distribution
    const scoreDistribution: { [key: number]: number } = {};
    readings.forEach(r => {
      scoreDistribution[r.health_score] = (scoreDistribution[r.health_score] || 0) + 1;
    });

    // Alert count
    const alertCount = readings.filter(r => 
      r.alert_level && r.alert_level !== 'none'
    ).length;

    // Trend calculation (compare first and last quartile)
    const sortedByTime = [...readings].sort((a, b) => 
      new Date(a.reading_time).getTime() - new Date(b.reading_time).getTime()
    );
    const firstQuartile = sortedByTime.slice(0, Math.floor(totalReadings / 4));
    const lastQuartile = sortedByTime.slice(-Math.floor(totalReadings / 4));
    
    let trendDirection: 'improving' | 'declining' | 'stable' = 'stable';
    if (firstQuartile.length > 0 && lastQuartile.length > 0) {
      const firstAvg = firstQuartile.reduce((sum, r) => sum + r.health_score, 0) / firstQuartile.length;
      const lastAvg = lastQuartile.reduce((sum, r) => sum + r.health_score, 0) / lastQuartile.length;
      
      const difference = firstAvg - lastAvg; // Lower scores are better
      if (difference > 0.5) trendDirection = 'improving';
      else if (difference < -0.5) trendDirection = 'declining';
    }

    return {
      totalReadings,
      avgHealthScore,
      avgPH,
      dominantHydrationLevel,
      scoreDistribution,
      alertCount,
      trendDirection
    };
  }

  // Daily Summaries
  async getDailySummaries(userId: string, days: number = 30): Promise<DailySummary[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await this.serviceSupabase
      .from('daily_summaries')
      .select('*')
      .eq('user_id', userId)
      .gte('summary_date', startDate.toISOString().split('T')[0])
      .order('summary_date', { ascending: false });

    if (error) {
      logger.error('Error fetching daily summaries:', error);
      throw error;
    }

    return data as DailySummary[];
  }

  // Color Clusters
  async getColorClusters(userId?: string): Promise<ColorCluster[]> {
    let query = this.serviceSupabase
      .from('color_clusters')
      .select('*')
      .order('cluster_number');

    // Get user-specific clusters if userId provided, otherwise global clusters
    if (userId) {
      query = query.eq('user_id', userId);
    } else {
      query = query.is('user_id', null);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Error fetching color clusters:', error);
      throw error;
    }

    // Convert to internal ColorCluster format
    return data.map(cluster => ({
      id: cluster.cluster_number,
      score: cluster.health_score,
      centroid: {
        l: 0, // LAB values would need to be computed from RGB
        a: 0,
        b: 0
      },
      sampleCount: cluster.sample_count || 0,
      lastUpdated: new Date(cluster.last_updated || Date.now()),
      description: cluster.description
    }));
  }

  async updateColorClusters(clusters: ColorCluster[], userId?: string): Promise<void> {
    // Delete existing clusters
    const { error: deleteError } = await this.serviceSupabase
      .from('color_clusters')
      .delete()
      .eq('user_id', userId || null);

    if (deleteError) {
      logger.error('Error deleting old clusters:', deleteError);
      throw deleteError;
    }

    // Insert new clusters
    const clusterData = clusters.map(cluster => ({
      cluster_number: cluster.id,
      r_center: 0, // Would need RGB values from LAB centroid
      g_center: 0,
      b_center: 0,
      health_score: cluster.score,
      description: cluster.description,
      recommendations: [],
      user_id: userId || null,
      sample_count: cluster.sampleCount
    }));

    const { error: insertError } = await this.serviceSupabase
      .from('color_clusters')
      .insert(clusterData);

    if (insertError) {
      logger.error('Error inserting new clusters:', insertError);
      throw insertError;
    }

    logger.info(`Updated ${clusters.length} color clusters${userId ? ` for user ${userId}` : ' (global)'}`);
  }

  // Convert ProcessedData to HealthReading format
  processedDataToHealthReading(
    userId: string, 
    processedData: ProcessedData, 
    deviceId?: string
  ): HealthReading {
    const hydrationLevels: { [key: number]: 'excellent' | 'good' | 'fair' | 'poor' | 'critical' } = {
      1: 'excellent', 2: 'excellent', 3: 'good', 4: 'good', 
      5: 'fair', 6: 'fair', 7: 'poor', 8: 'poor', 
      9: 'critical', 10: 'critical'
    };

    const alertLevels: { [key: number]: 'none' | 'low' | 'medium' | 'high' | 'critical' } = {
      1: 'none', 2: 'none', 3: 'none', 4: 'low', 5: 'low',
      6: 'medium', 7: 'medium', 8: 'high', 9: 'critical', 10: 'critical'
    };

    return {
      user_id: userId,
      ph: processedData.phValue,
      color_r: processedData.colorRgb.r,
      color_g: processedData.colorRgb.g,
      color_b: processedData.colorRgb.b,
      color_hex: `#${processedData.colorRgb.r.toString(16).padStart(2, '0')}${processedData.colorRgb.g.toString(16).padStart(2, '0')}${processedData.colorRgb.b.toString(16).padStart(2, '0')}`.toUpperCase(),
      health_score: processedData.colorScore,
      hydration_level: hydrationLevels[processedData.colorScore] || 'fair',
      confidence_score: processedData.confidence,
      recommendations: [], // Will be populated by the calling service
      alert_level: alertLevels[processedData.colorScore] || 'none',
      alert_message: processedData.colorScore >= 8 ? 'High health score detected - consider medical consultation' : undefined,
      device_id: deviceId,
      reading_time: processedData.timestamp.toISOString()
    };
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const { data, error } = await this.serviceSupabase
        .from('color_clusters')
        .select('count(*)')
        .limit(1);

      return !error;
    } catch (error) {
      logger.error('Supabase health check failed:', error);
      return false;
    }
  }
}

// Lazy initialization to ensure env vars are loaded first
let _supabaseService: SupabaseService | null = null;

export function getSupabaseService(): SupabaseService {
  if (!_supabaseService) {
    _supabaseService = new SupabaseService();
  }
  return _supabaseService;
}

// For backward compatibility, create a proxy that initializes lazily
export const supabaseService = new Proxy({} as SupabaseService, {
  get(target, prop) {
    const service = getSupabaseService();
    const value = (service as any)[prop];
    return typeof value === 'function' ? value.bind(service) : value;
  }
}); 