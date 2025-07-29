import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables
config();

async function setupDatabase() {
  console.log('🔧 Setting up PUMA Database...\n');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase configuration');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    // Read the schema file
    const schemaPath = join(__dirname, 'supabase', 'schema.sql');
    console.log('📄 Reading schema from:', schemaPath);
    
    const schemaSQL = readFileSync(schemaPath, 'utf8');
    console.log(`📊 Schema file loaded (${schemaSQL.length} characters)\n`);
    
    // Split the schema into individual statements
    const statements = schemaSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
      .map(stmt => stmt + ';');
    
    console.log(`🔨 Executing ${statements.length} SQL statements...\n`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip comments and empty statements
      if (statement.trim().startsWith('--') || statement.trim() === ';') {
        continue;
      }
      
      console.log(`${i + 1}/${statements.length}: Executing...`);
      
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          console.log(`⚠️  Statement ${i + 1} had an issue:`, error.message);
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`);
        }
      } catch (err: any) {
        console.log(`⚠️  Statement ${i + 1} error:`, err.message);
      }
    }
    
    console.log('\n🎉 Database setup completed!');
    
    // Test the setup
    console.log('\n🧪 Testing database...');
    const { data, error } = await supabase.from('color_clusters').select('*').limit(5);
    
    if (error) {
      console.error('❌ Test failed:', error.message);
    } else {
      console.log(`✅ Database test passed! Found ${data?.length || 0} color clusters`);
      console.log('📊 Sample cluster:', data?.[0]);
    }
    
  } catch (error: any) {
    console.error('❌ Setup failed:', error.message);
    console.log('\n🔧 Manual Setup Instructions:');
    console.log('1. Go to your Supabase project dashboard');
    console.log('2. Click "SQL Editor" in the sidebar');
    console.log('3. Click "New Query"');
    console.log('4. Copy and paste the entire contents of backend/supabase/schema.sql');
    console.log('5. Click "Run" to execute the schema');
  }
}

setupDatabase(); 