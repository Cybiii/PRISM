import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);
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

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    // Sign in with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error || !data.user || !data.session) {
      return res.status(401).json({
        success: false,
        error: error?.message || 'Authentication failed'
      });
    }

    // Get user profile
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    return res.json({
      success: true,
      data: {
        user: {
          id: data.user.id,
          email: data.user.email,
          emailConfirmed: data.user.email_confirmed_at ? true : false
        },
        profile: profile || {
          id: data.user.id,
          full_name: data.user.user_metadata?.full_name || 'User',
          email: data.user.email
        },
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token
      }
    });

  } catch (error: any) {
    console.error('Signin error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Authentication failed'
    });
  }
}