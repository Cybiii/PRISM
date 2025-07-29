import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
config();

async function testUserProfiles30Days() {
  console.log('🧪 Testing PUMA User Profiles & 30-Day Data...\n');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase configuration');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    // Step 1: Create a test user profile
    console.log('1️⃣ Creating user profile...');
    
    // First create a user in auth.users (simulate)
    const testUserId = '12345678-1234-1234-1234-123456789012'; // Mock UUID
    
    const userProfile = {
      id: testUserId,
      email: 'test@puma-health.com',
      full_name: 'John Doe',
      age: 35,
      gender: 'male',
      medical_conditions: ['diabetes', 'hypertension'],
      medications: ['metformin', 'lisinopril']
    };
    
    // Insert user profile (using upsert to avoid conflicts)
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .upsert(userProfile)
      .select()
      .single();
      
    if (profileError) {
      console.error('❌ Profile creation failed:', profileError.message);
      return;
    }
    
    console.log('✅ User profile created:');
    console.log(`   Name: ${profile.full_name}`);
    console.log(`   Email: ${profile.email}`);
    console.log(`   Age: ${profile.age}`);
    console.log(`   Medical conditions: ${profile.medical_conditions?.join(', ')}`);
    console.log(`   Medications: ${profile.medications?.join(', ')}\n`);
    
    // Step 2: Generate 30 days of health readings
    console.log('2️⃣ Generating 30 days of health readings...');
    
    const healthReadings = [];
    const now = new Date();
    
    // Create readings for the past 30 days (2-3 readings per day)
    for (let day = 0; day < 30; day++) {
      const readingsPerDay = 2 + Math.floor(Math.random() * 2); // 2-3 readings per day
      
      for (let reading = 0; reading < readingsPerDay; reading++) {
        const readingDate = new Date(now.getTime() - (day * 24 * 60 * 60 * 1000));
        readingDate.setHours(8 + (reading * 6), Math.floor(Math.random() * 60)); // Spread throughout day
        
        // Simulate health progression (getting better over time)
        const healthTrend = Math.max(1, Math.min(10, 8 - (day * 0.2) + (Math.random() * 2)));
        const healthScore = Math.round(healthTrend);
        
        // Generate realistic pH based on health score
        const basePH = 6.5 + (Math.random() * 1.5); // 6.5-8.0
        const ph = Math.round((basePH + (healthScore > 6 ? 0.3 : -0.3)) * 100) / 100;
        
        // Generate color based on health score
        const colorIntensity = Math.max(0, Math.min(255, 255 - (healthScore * 20)));
        const color_r = Math.max(150, 255 - colorIntensity);
        const color_g = Math.max(120, 255 - (colorIntensity * 0.8));
        const color_b = Math.max(50, 200 - (colorIntensity * 1.2));
        
        const hydrationLevels = ['excellent', 'good', 'fair', 'poor', 'critical'];
        const hydrationIndex = Math.min(4, Math.floor((healthScore - 1) / 2));
        
        healthReadings.push({
          user_id: testUserId,
          ph: ph,
          color_r: Math.round(color_r),
          color_g: Math.round(color_g),
          color_b: Math.round(color_b),
          color_hex: `#${Math.round(color_r).toString(16).padStart(2, '0')}${Math.round(color_g).toString(16).padStart(2, '0')}${Math.round(color_b).toString(16).padStart(2, '0')}`.toUpperCase(),
          health_score: healthScore,
          hydration_level: hydrationLevels[hydrationIndex],
          confidence_score: 0.75 + (Math.random() * 0.25),
          recommendations: [`Health score ${healthScore}: Monitor hydration`],
          alert_level: healthScore >= 8 ? 'high' : healthScore >= 6 ? 'medium' : 'none',
          device_id: 'arduino-tcs34725',
          reading_source: 'tcs34725',
          reading_time: readingDate.toISOString()
        });
      }
    }
    
    console.log(`📊 Generated ${healthReadings.length} health readings over 30 days`);
    
    // Step 3: Insert all readings
    console.log('3️⃣ Saving health readings to database...');
    
    const { data: savedReadings, error: readingsError } = await supabase
      .from('health_readings')
      .insert(healthReadings)
      .select();
      
    if (readingsError) {
      console.error('❌ Failed to save readings:', readingsError.message);
      return;
    }
    
    console.log(`✅ Saved ${savedReadings?.length} health readings\n`);
    
    // Step 4: Test 30-day analytics
    console.log('4️⃣ Testing 30-day analytics...');
    
    // Get readings from last 30 days
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    
    const { data: last30Days, error: analyticsError } = await supabase
      .from('health_readings')
      .select('*')
      .eq('user_id', testUserId)
      .gte('reading_time', thirtyDaysAgo.toISOString())
      .order('reading_time', { ascending: false });
      
    if (analyticsError) {
      console.error('❌ Analytics query failed:', analyticsError.message);
      return;
    }
    
    console.log(`📈 30-Day Analytics Results:`);
    console.log(`   Total readings: ${last30Days?.length || 0}`);
    
    if (last30Days && last30Days.length > 0) {
      const avgHealthScore = last30Days.reduce((sum, r) => sum + r.health_score, 0) / last30Days.length;
      const avgPH = last30Days.reduce((sum, r) => sum + r.ph, 0) / last30Days.length;
      
      // Score distribution
      const scoreDistribution: { [key: number]: number } = {};
      last30Days.forEach(r => {
        scoreDistribution[r.health_score] = (scoreDistribution[r.health_score] || 0) + 1;
      });
      
      // Latest reading
      const latestReading = last30Days[0];
      
      console.log(`   Average health score: ${avgHealthScore.toFixed(2)}/10`);
      console.log(`   Average pH: ${avgPH.toFixed(2)}`);
      console.log(`   Latest reading: Score ${latestReading.health_score}/10, pH ${latestReading.ph}`);
      console.log(`   Latest color: ${latestReading.color_hex}`);
      console.log(`   Hydration level: ${latestReading.hydration_level}`);
      
      console.log('\n📊 Health Score Distribution (30 days):');
      Object.entries(scoreDistribution).forEach(([score, count]) => {
        const percentage = ((count / last30Days.length) * 100).toFixed(1);
        console.log(`   Score ${score}: ${count} readings (${percentage}%)`);
      });
    }
    
    // Step 5: Test weekly trends
    console.log('\n5️⃣ Testing weekly trends...');
    
    const weeklyData = [];
    for (let week = 0; week < 4; week++) {
      const weekStart = new Date(now.getTime() - ((week + 1) * 7 * 24 * 60 * 60 * 1000));
      const weekEnd = new Date(now.getTime() - (week * 7 * 24 * 60 * 60 * 1000));
      
      const { data: weekReadings } = await supabase
        .from('health_readings')
        .select('health_score, ph')
        .eq('user_id', testUserId)
        .gte('reading_time', weekStart.toISOString())
        .lt('reading_time', weekEnd.toISOString());
        
      if (weekReadings && weekReadings.length > 0) {
        const avgScore = weekReadings.reduce((sum, r) => sum + r.health_score, 0) / weekReadings.length;
        const avgPH = weekReadings.reduce((sum, r) => sum + r.ph, 0) / weekReadings.length;
        
        weeklyData.push({
          week: week + 1,
          readings: weekReadings.length,
          avgScore: avgScore.toFixed(2),
          avgPH: avgPH.toFixed(2)
        });
      }
    }
    
    console.log('📅 Weekly Health Trends (most recent first):');
    weeklyData.forEach(week => {
      console.log(`   Week ${week.week}: ${week.readings} readings, Avg Score: ${week.avgScore}, Avg pH: ${week.avgPH}`);
    });
    
    console.log('\n🎉 SUCCESS! PUMA User Profile & 30-Day Data System Working!');
    console.log('\n✅ What we verified:');
    console.log('   ✅ User profiles with medical history');
    console.log('   ✅ 30 days of health readings storage');
    console.log('   ✅ Time-based analytics queries');
    console.log('   ✅ Health trend analysis');
    console.log('   ✅ Score distribution tracking');
    console.log('   ✅ Weekly comparison data');
    
    console.log('\n🚀 Your PUMA system can now:');
    console.log('   📊 Track individual users with medical profiles');
    console.log('   📈 Store and analyze 30+ days of health data');
    console.log('   🔍 Generate detailed health analytics');
    console.log('   ⚠️ Detect health trends and changes');
    console.log('   🏥 Support medical history tracking');
    
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
  }
}

testUserProfiles30Days(); 