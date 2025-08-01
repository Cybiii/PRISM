import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return NextResponse.json({
        success: false,
        error: 'No access token provided'
      }, { status: 401 });
    }

    // Verify token with Supabase
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Invalid or expired token'
      }, { status: 401 });
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
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch latest reading'
      }, { status: 500 });
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

    return NextResponse.json({
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
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch latest reading'
    }, { status: 500 });
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}