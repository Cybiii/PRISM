import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
config();

async function createTables() {
  console.log('🔧 Creating PUMA Database Tables...\n');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase configuration');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    console.log('1️⃣ Creating user_profiles table...');
    
    // Create user_profiles table
    const userProfilesSQL = `
      CREATE TABLE IF NOT EXISTS public.user_profiles (
        id UUID REFERENCES auth.users(id) PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        full_name TEXT,
        avatar_url TEXT,
        age INTEGER,
        gender TEXT CHECK (gender IN ('male', 'female', 'other')),
        medical_conditions TEXT[],
        medications TEXT[],
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    
    console.log('2️⃣ Creating health_readings table...');
    
    // Create health_readings table
    const healthReadingsSQL = `
      CREATE TABLE IF NOT EXISTS public.health_readings (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
        ph DECIMAL(4,2) NOT NULL CHECK (ph >= 0 AND ph <= 14),
        color_r INTEGER NOT NULL CHECK (color_r >= 0 AND color_r <= 255),
        color_g INTEGER NOT NULL CHECK (color_g >= 0 AND color_g <= 255),
        color_b INTEGER NOT NULL CHECK (color_b >= 0 AND color_b <= 255),
        color_hex TEXT NOT NULL,
        clear_value INTEGER,
        health_score INTEGER NOT NULL CHECK (health_score >= 1 AND health_score <= 10),
        hydration_level TEXT NOT NULL CHECK (hydration_level IN ('excellent', 'good', 'fair', 'poor', 'critical')),
        color_temperature INTEGER,
        confidence_score DECIMAL(5,4),
        recommendations TEXT[],
        alert_level TEXT CHECK (alert_level IN ('none', 'low', 'medium', 'high', 'critical')),
        alert_message TEXT,
        device_id TEXT,
        reading_source TEXT DEFAULT 'tcs34725' CHECK (reading_source IN ('tcs34725', 'manual', 'calibration')),
        notes TEXT,
        reading_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    
    console.log('3️⃣ Creating color_clusters table...');
    
    // Create color_clusters table
    const colorClustersSQL = `
      CREATE TABLE IF NOT EXISTS public.color_clusters (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        cluster_number INTEGER NOT NULL CHECK (cluster_number >= 1 AND cluster_number <= 10),
        r_center DECIMAL(8,4) NOT NULL,
        g_center DECIMAL(8,4) NOT NULL,
        b_center DECIMAL(8,4) NOT NULL,
        health_score INTEGER NOT NULL CHECK (health_score >= 1 AND health_score <= 10),
        description TEXT NOT NULL,
        recommendations TEXT[],
        sample_count INTEGER DEFAULT 0,
        last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
        UNIQUE(cluster_number, user_id)
      );
    `;
    
    console.log('4️⃣ Creating daily_summaries table...');
    
    // Create daily_summaries table  
    const dailySummariesSQL = `
      CREATE TABLE IF NOT EXISTS public.daily_summaries (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
        summary_date DATE NOT NULL,
        reading_count INTEGER DEFAULT 0,
        avg_ph DECIMAL(4,2),
        avg_health_score DECIMAL(4,2),
        dominant_hydration_level TEXT,
        score_1_count INTEGER DEFAULT 0,
        score_2_count INTEGER DEFAULT 0,
        score_3_count INTEGER DEFAULT 0,
        score_4_count INTEGER DEFAULT 0,
        score_5_count INTEGER DEFAULT 0,
        score_6_count INTEGER DEFAULT 0,
        score_7_count INTEGER DEFAULT 0,
        score_8_count INTEGER DEFAULT 0,
        score_9_count INTEGER DEFAULT 0,
        score_10_count INTEGER DEFAULT 0,
        total_alerts INTEGER DEFAULT 0,
        critical_alerts INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id, summary_date)
      );
    `;
    
    // Execute table creation (we'll use the REST API approach)
    console.log('\n📋 Unfortunately, we cannot execute raw SQL from this script.');
    console.log('🔧 Please copy and paste the following SQL into your Supabase SQL Editor:\n');
    
    console.log('--- COPY FROM HERE ---');
    console.log(userProfilesSQL);
    console.log(healthReadingsSQL);
    console.log(colorClustersSQL);
    console.log(dailySummariesSQL);
    
    // Insert default color clusters
    console.log(`
-- Insert default color clusters
INSERT INTO public.color_clusters (cluster_number, r_center, g_center, b_center, health_score, description, recommendations) VALUES
(1, 255.0, 255.0, 200.0, 1, 'Pale Yellow (Excellent)', ARRAY['Maintain current hydration', 'Continue healthy habits']),
(2, 255.0, 255.0, 150.0, 2, 'Light Yellow (Very Good)', ARRAY['Good hydration level', 'Keep up the good work']),  
(3, 255.0, 235.0, 120.0, 3, 'Yellow (Good)', ARRAY['Normal hydration', 'Continue regular water intake']),
(4, 255.0, 215.0, 90.0, 4, 'Medium Yellow (Fair)', ARRAY['Increase water intake slightly', 'Monitor throughout day']),
(5, 255.0, 195.0, 60.0, 5, 'Dark Yellow (Concerning)', ARRAY['Increase water intake', 'Avoid excessive caffeine']),
(6, 255.0, 165.0, 40.0, 6, 'Amber (Dehydrated)', ARRAY['Drink water immediately', 'Monitor closely', 'Consider electrolytes']),
(7, 200.0, 130.0, 30.0, 7, 'Dark Amber (Very Dehydrated)', ARRAY['Urgent rehydration needed', 'Seek medical advice if persistent']),
(8, 160.0, 100.0, 20.0, 8, 'Brown (Critical)', ARRAY['Immediate medical attention', 'Severe dehydration or medical issue']),
(9, 120.0, 80.0, 40.0, 9, 'Dark Brown (Emergency)', ARRAY['Emergency medical care', 'Possible kidney/liver issues']),
(10, 80.0, 60.0, 60.0, 10, 'Very Dark/Red (Critical Emergency)', ARRAY['IMMEDIATE EMERGENCY CARE', 'Call emergency services']);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_health_readings_user_time ON public.health_readings(user_id, reading_time DESC);
CREATE INDEX IF NOT EXISTS idx_health_readings_time ON public.health_readings(reading_time DESC);
CREATE INDEX IF NOT EXISTS idx_health_readings_score ON public.health_readings(health_score);
CREATE INDEX IF NOT EXISTS idx_daily_summaries_user_date ON public.daily_summaries(user_id, summary_date DESC);
`);
    
    console.log('--- COPY TO HERE ---');
    console.log('\n📋 Instructions:');
    console.log('1. Go to supabase.com → Your Project → SQL Editor');
    console.log('2. Click "New Query"');
    console.log('3. Copy and paste ALL the SQL above');
    console.log('4. Click "Run" to execute');
    console.log('5. Come back and run: npx tsx test-connection.ts');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

createTables(); 