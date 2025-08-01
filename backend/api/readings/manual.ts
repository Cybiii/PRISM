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

// Mock color classification (simplified for serverless)
function classifyColor(rgb: { r: number; g: number; b: number }) {
  // Simple color scoring based on yellow intensity
  const { r, g, b } = rgb;
  
  // Calculate yellow intensity and darkness
  const yellowness = (r + g) / 2 - b;
  const brightness = (r + g + b) / 3;
  
  // Score from 1-10 (10 = best hydration, 1 = worst)
  let score: number;
  
  if (brightness > 240 && yellowness < 50) {
    score = 10; // Very pale/clear - excellent hydration
  } else if (brightness > 200 && yellowness < 100) {
    score = 8; // Pale yellow - good hydration
  } else if (brightness > 150 && yellowness < 150) {
    score = 6; // Light yellow - fair hydration
  } else if (brightness > 100 && yellowness < 200) {
    score = 4; // Dark yellow - poor hydration
  } else {
    score = 2; // Very dark - critical dehydration
  }
  
  return {
    score: Math.max(1, Math.min(10, score)),
    confidence: 0.8
  };
}

function getHealthRecommendations(score: number): string[] {
  const recommendations: { [key: number]: string[] } = {
    10: ["Excellent hydration! Keep up the good work."],
    9: ["Very good hydration level."],
    8: ["Good hydration. Continue regular water intake."],
    7: ["Adequate hydration. Consider drinking more water."],
    6: ["Fair hydration. Increase water intake."],
    5: ["Below optimal hydration. Drink more water throughout the day."],
    4: ["Poor hydration. Increase water intake significantly."],
    3: ["Very poor hydration. Drink water immediately and monitor."],
    2: ["Critical dehydration. Seek medical attention if symptoms persist."],
    1: ["Severe dehydration. Seek immediate medical attention."]
  };
  
  return recommendations[score] || recommendations[5];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCORS(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
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

    // Generate mock sensor data (since Arduino won't work in serverless)
    const mockData = {
      ph: 6.5 + Math.random() * 2, // pH 6.5-8.5
      color: {
        r: Math.floor(200 + Math.random() * 55), // Yellowish colors
        g: Math.floor(190 + Math.random() * 65),
        b: Math.floor(100 + Math.random() * 100)
      },
      timestamp: new Date()
    };

    // Classify color
    const colorResult = classifyColor(mockData.color);
    const recommendations = getHealthRecommendations(colorResult.score);

    // Determine hydration level
    const hydrationLevels: { [key: number]: string } = {
      10: 'excellent', 9: 'excellent', 8: 'good', 7: 'good',
      6: 'fair', 5: 'fair', 4: 'poor', 3: 'poor', 2: 'critical', 1: 'critical'
    };

    const alertLevels: { [key: number]: string } = {
      10: 'none', 9: 'none', 8: 'none', 7: 'low', 6: 'low',
      5: 'medium', 4: 'medium', 3: 'high', 2: 'critical', 1: 'critical'
    };

    // Save to Supabase
    const { data: savedReading, error: saveError } = await supabaseAdmin
      .from('health_readings')
      .insert({
        user_id: user.id,
        ph: Math.round(mockData.ph * 100) / 100,
        color_r: mockData.color.r,
        color_g: mockData.color.g,
        color_b: mockData.color.b,
        color_hex: `#${mockData.color.r.toString(16).padStart(2, '0')}${mockData.color.g.toString(16).padStart(2, '0')}${mockData.color.b.toString(16).padStart(2, '0')}`.toUpperCase(),
        health_score: colorResult.score,
        color_score: colorResult.score, // Add color_score field
        hydration_level: hydrationLevels[colorResult.score] || 'fair',
        confidence_score: colorResult.confidence,
        recommendations,
        alert_level: alertLevels[colorResult.score] || 'none',
        device_id: 'serverless-mock',
        reading_source: 'manual',
        reading_time: mockData.timestamp.toISOString(),
        hydration_ml: Math.floor(200 + Math.random() * 300) // Mock hydration amount
      })
      .select()
      .single();

    if (saveError) {
      console.error('Save error:', saveError);
      return res.status(500).json({
        success: false,
        error: 'Failed to save reading'
      });
    }

    return res.json({
      success: true,
      data: {
        averagedReading: {
          ph: mockData.ph,
          color: mockData.color,
          timestamp: mockData.timestamp.getTime()
        },
        colorScore: colorResult.score,
        confidence: colorResult.confidence,
        recommendations,
        readingId: savedReading.id
      }
    });

  } catch (error: any) {
    console.error('Manual reading error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Manual reading failed'
    });
  }
}