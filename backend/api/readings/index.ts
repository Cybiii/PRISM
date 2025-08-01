import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// CORS helper
function setCORS(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCORS(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.toString().split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No access token provided'
      });
    }

    // Verify token with Supabase
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    // Get query parameters
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    // Get readings for user
    const { data: readings, error } = await supabaseAdmin
      .from('health_readings')
      .select('*')
      .eq('user_id', user.id)
      .order('reading_time', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch readings'
      });
    }

    // Transform readings to frontend format
    const transformedReadings = (readings || []).map(reading => ({
      id: reading.id,
      timestamp: reading.reading_time,
      ph: reading.ph,
      color_score: reading.color_score || reading.health_score,
      health_score: reading.health_score,
      hydration_level: reading.hydration_level,
      hydration_ml: reading.hydration_ml || 250,
      confidence_score: reading.confidence_score,
      recommendations: reading.recommendations || [],
      alert_level: reading.alert_level || 'none',
      color_hex: reading.color_hex,
      device_id: reading.device_id,
      reading_source: reading.reading_source
    }));

    return res.json({
      success: true,
      data: {
        readings: transformedReadings,
        total: transformedReadings.length,
        limit,
        offset
      }
    });

  } catch (error: any) {
    console.error('Readings fetch error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch readings'
    });
  }
}