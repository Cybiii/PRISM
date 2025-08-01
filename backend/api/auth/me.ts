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
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    // Get user profile
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    return res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          emailConfirmed: user.email_confirmed_at ? true : false
        },
        profile: profile || {
          id: user.id,
          full_name: user.user_metadata?.full_name || 'User',
          email: user.email
        }
      }
    });

  } catch (error: any) {
    console.error('Get current user error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get user information'
    });
  }
}