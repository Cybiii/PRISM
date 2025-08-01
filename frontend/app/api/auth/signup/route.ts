import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const { email, password, fullName, age, gender, medicalConditions, medications } = await request.json();

    if (!email || !password) {
      return NextResponse.json({
        success: false,
        error: 'Email and password are required'
      }, { status: 400 });
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
      return NextResponse.json({
        success: false,
        error: adminError?.message || 'Failed to create user'
      }, { status: 400 });
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
      return NextResponse.json({
        success: false,
        error: signInError?.message || 'Failed to sign in after registration'
      }, { status: 400 });
    }

    // Get the created profile
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', signInData.user.id)
      .single();

    return NextResponse.json({
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
    }, { status: 201 });

  } catch (error: any) {
    console.error('Signup error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Registration failed'
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