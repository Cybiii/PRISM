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

    // Get latest reading for user
    const { data: reading, error } = await supabaseAdmin
      .from('health_readings')
      .select('*')
      .eq('user_id', user.id)
      .order('reading_time', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch latest reading'
      });
    }

    // Calculate average pH and color score
    const { data: allReadings } = await supabaseAdmin
      .from('health_readings')
      .select('ph, color_score')
      .eq('user_id', user.id)
      .order('reading_time', { ascending: false })
      .limit(30); // Last 30 readings for average

    let avgPh = 6.72;
    let avgColorScore = 1.0;

    if (allReadings && allReadings.length > 0) {
      avgPh = allReadings.reduce((sum, r) => sum + (r.ph || 0), 0) / allReadings.length;
      avgColorScore = allReadings.reduce((sum, r) => sum + (r.color_score || 0), 0) / allReadings.length;
    }

    return res.json({
      success: true,
      data: {
        lastReading: reading ? {
          id: reading.id,
          ph: reading.ph,
          color_score: reading.color_score || reading.health_score,
          hydration_ml: reading.hydration_ml || 250,
          timestamp: reading.reading_time
        } : null,
        avgPh: Math.round(avgPh * 100) / 100,
        avgColorScore: Math.round(avgColorScore * 10) / 10,
        totalReadings: allReadings?.length || 0,
        phTrend: 'stable'
      }
    });

  } catch (error: any) {
    console.error('Latest reading error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch latest reading'
    });
  }
}