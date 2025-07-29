-- PUMA Database Schema for Supabase
-- Photosensitive Urinary Monitoring Apparatus

-- Enable Row Level Security
ALTER DATABASE postgres SET timezone TO 'UTC';

-- Users table (extends Supabase auth.users)
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

-- Health readings table with time-based partitioning support
CREATE TABLE IF NOT EXISTS public.health_readings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    
    -- Sensor data
    ph DECIMAL(4,2) NOT NULL CHECK (ph >= 0 AND ph <= 14),
    color_r INTEGER NOT NULL CHECK (color_r >= 0 AND color_r <= 255),
    color_g INTEGER NOT NULL CHECK (color_g >= 0 AND color_g <= 255),
    color_b INTEGER NOT NULL CHECK (color_b >= 0 AND color_b <= 255),
    color_hex TEXT NOT NULL,
    clear_value INTEGER, -- TCS34725 clear channel
    
    -- Processed data
    health_score INTEGER NOT NULL CHECK (health_score >= 1 AND health_score <= 10),
    hydration_level TEXT NOT NULL CHECK (hydration_level IN ('excellent', 'good', 'fair', 'poor', 'critical')),
    color_temperature INTEGER, -- Calculated from RGB
    confidence_score DECIMAL(5,4), -- ML confidence (0-1)
    
    -- Recommendations and alerts
    recommendations TEXT[],
    alert_level TEXT CHECK (alert_level IN ('none', 'low', 'medium', 'high', 'critical')),
    alert_message TEXT,
    
    -- Metadata
    device_id TEXT, -- Arduino/sensor identifier
    reading_source TEXT DEFAULT 'tcs34725' CHECK (reading_source IN ('tcs34725', 'manual', 'calibration')),
    notes TEXT,
    
    -- Timestamps
    reading_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Color clusters for ML classification
CREATE TABLE IF NOT EXISTS public.color_clusters (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    cluster_number INTEGER NOT NULL CHECK (cluster_number >= 1 AND cluster_number <= 10),
    
    -- RGB centroid
    r_center DECIMAL(8,4) NOT NULL,
    g_center DECIMAL(8,4) NOT NULL,
    b_center DECIMAL(8,4) NOT NULL,
    
    -- Health mapping
    health_score INTEGER NOT NULL CHECK (health_score >= 1 AND health_score <= 10),
    description TEXT NOT NULL,
    recommendations TEXT[],
    
    -- Cluster statistics
    sample_count INTEGER DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Global clusters (null user_id) or user-specific clusters
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    
    UNIQUE(cluster_number, user_id)
);

-- Daily health summaries for faster analytics
CREATE TABLE IF NOT EXISTS public.daily_summaries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    summary_date DATE NOT NULL,
    
    -- Aggregated metrics
    reading_count INTEGER DEFAULT 0,
    avg_ph DECIMAL(4,2),
    avg_health_score DECIMAL(4,2),
    dominant_hydration_level TEXT,
    
    -- Score distribution
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
    
    -- Alert statistics
    total_alerts INTEGER DEFAULT 0,
    critical_alerts INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, summary_date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_health_readings_user_time ON public.health_readings(user_id, reading_time DESC);
CREATE INDEX IF NOT EXISTS idx_health_readings_time ON public.health_readings(reading_time DESC);
CREATE INDEX IF NOT EXISTS idx_health_readings_score ON public.health_readings(health_score);
CREATE INDEX IF NOT EXISTS idx_health_readings_alert ON public.health_readings(alert_level) WHERE alert_level != 'none';
CREATE INDEX IF NOT EXISTS idx_daily_summaries_user_date ON public.daily_summaries(user_id, summary_date DESC);
CREATE INDEX IF NOT EXISTS idx_color_clusters_user ON public.color_clusters(user_id) WHERE user_id IS NOT NULL;

-- Row Level Security (RLS)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_summaries ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see their own profile
CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

-- Users can only see their own health readings
CREATE POLICY "Users can view own readings" ON public.health_readings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own readings" ON public.health_readings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only see their own daily summaries
CREATE POLICY "Users can view own summaries" ON public.daily_summaries
    FOR SELECT USING (auth.uid() = user_id);

-- Service role can manage all data (for backend operations)
CREATE POLICY "Service role full access" ON public.user_profiles
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access" ON public.health_readings
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access" ON public.daily_summaries
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Color clusters are globally readable, but only service role can modify
CREATE POLICY "Anyone can view color clusters" ON public.color_clusters
    FOR SELECT TO PUBLIC USING (true);

CREATE POLICY "Service role can manage clusters" ON public.color_clusters
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Functions for data aggregation
CREATE OR REPLACE FUNCTION update_daily_summary()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.daily_summaries (
        user_id, 
        summary_date, 
        reading_count,
        avg_ph,
        avg_health_score
    )
    VALUES (
        NEW.user_id,
        DATE(NEW.reading_time),
        1,
        NEW.ph,
        NEW.health_score
    )
    ON CONFLICT (user_id, summary_date)
    DO UPDATE SET
        reading_count = daily_summaries.reading_count + 1,
        avg_ph = (daily_summaries.avg_ph * daily_summaries.reading_count + NEW.ph) / (daily_summaries.reading_count + 1),
        avg_health_score = (daily_summaries.avg_health_score * daily_summaries.reading_count + NEW.health_score) / (daily_summaries.reading_count + 1),
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update daily summaries
CREATE TRIGGER trigger_update_daily_summary
    AFTER INSERT ON public.health_readings
    FOR EACH ROW
    EXECUTE FUNCTION update_daily_summary();

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

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_summaries_updated_at
    BEFORE UPDATE ON public.daily_summaries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 