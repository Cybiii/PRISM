import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
config();

async function testConnection() {
  console.log('🔗 Testing Supabase connection...');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  console.log('Environment variables:');
  console.log('- SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
  console.log('- SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅ Set' : '❌ Missing');
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing environment variables');
    return;
  }
  
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Test basic connection
    const { data, error } = await supabase.from('color_clusters').select('*').limit(1);
    
    if (error) {
      if (error.message.includes('relation "color_clusters" does not exist')) {
        console.log('⚠️  Database tables not created yet');
        console.log('✅ Supabase connection works!');
        console.log('📋 Next step: Run the schema.sql in your Supabase SQL Editor');
        return true;
      } else {
        console.error('❌ Connection error:', error.message);
        return false;
      }
    }
    
    console.log('✅ Supabase connection successful!');
    console.log('✅ Database tables exist!');
    console.log(`📊 Found ${data?.length || 0} color clusters`);
    return true;
    
  } catch (err: any) {
    console.error('❌ Connection failed:', err.message);
    return false;
  }
}

testConnection(); 