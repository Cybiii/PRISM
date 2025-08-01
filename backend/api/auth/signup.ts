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
    const { email, password, fullName, age, gender, medicalConditions, medications } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    // Create user with admin API to skip email confirmation
    const { data: adminUserData, error: adminError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName
      }
    });

    if (adminError || !adminUserData.user) {
      return res.status(400).json({
        success: false,
        error: adminError?.message || 'Failed to create user'
      });
    }

    // Create user profile
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        id: adminUserData.user.id,
        email: adminUserData.user.email,
        full_name: fullName,
        age,
        gender,
        medical_conditions: medicalConditions || [],
        medications: medications || []
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
    }

    // Sign in to get session tokens
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (signInError || !signInData.user || !signInData.session) {
      return res.status(400).json({
        success: false,
        error: signInError?.message || 'Failed to sign in after registration'
      });
    }

    // Get the created profile
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', signInData.user.id)
      .single();

    return res.status(201).json({
      success: true,
      data: {
        user: {
          id: signInData.user.id,
          email: signInData.user.email,
          emailConfirmed: signInData.user.email_confirmed_at ? true : false
        },
        profile: profile || {
          id: signInData.user.id,
          full_name: fullName || 'User',
          email: signInData.user.email
        },
        accessToken: signInData.session.access_token,
        refreshToken: signInData.session.refresh_token
      }
    });

  } catch (error: any) {
    console.error('Signup error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Registration failed'
    });
  }
}