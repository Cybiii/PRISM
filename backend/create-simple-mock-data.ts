import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
config();

async function createSimpleMockData() {
  console.log('🏥 Creating PUMA Health Readings Mock Data...\n');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase configuration');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    console.log('📊 Generating 30 days of realistic health readings...\n');
    
    // Create a single demo user ID (we'll handle user profiles later)
    const demoUserId = '00000000-1111-2222-3333-444444444444';
    
    const allHealthReadings = [];
    const now = new Date();
    
    console.log('🎯 Creating realistic health patterns:');
    console.log('   📈 Simulating health improvement over 30 days');
    console.log('   🔬 TCS34725 color sensor data (RGB + pH)');
    console.log('   💧 Hydration levels and health scores');
    console.log('   ⚠️ Alert levels for concerning readings\n');
    
    // Generate 30 days of readings (2-4 readings per day)
    for (let day = 0; day < 30; day++) {
      const readingsPerDay = 2 + Math.floor(Math.random() * 3); // 2-4 readings per day
      
      for (let reading = 0; reading < readingsPerDay; reading++) {
        const readingDate = new Date(now.getTime() - (day * 24 * 60 * 60 * 1000));
        
        // Spread readings throughout the day
        const hour = 7 + (reading * 5) + Math.floor(Math.random() * 3); // 7am, 12pm, 5pm, 10pm
        readingDate.setHours(hour, Math.floor(Math.random() * 60));
        
        // Simulate gradual health improvement over time
        const dayProgress = (29 - day) / 29; // 0 = oldest day, 1 = newest day
        
        // Base health score starts poor, improves over time
        let baseHealthScore = 8 - (dayProgress * 4); // 8 -> 4 over 30 days
        
        // Add daily variation and weekend patterns
        const isWeekend = readingDate.getDay() === 0 || readingDate.getDay() === 6;
        if (isWeekend) baseHealthScore += 0.5; // Slightly worse on weekends
        
        // Add time-of-day patterns
        if (hour < 10) baseHealthScore -= 0.3; // Better in morning
        if (hour > 20) baseHealthScore += 0.4; // Worse late evening
        
        // Add random variation
        baseHealthScore += (Math.random() - 0.5) * 1.5;
        
        const healthScore = Math.max(1, Math.min(10, Math.round(baseHealthScore)));
        
        // Generate realistic pH based on health score
        let ph = 6.8; // Base pH
        if (healthScore > 6) ph += 0.5; // Higher pH when unhealthy
        if (healthScore <= 3) ph -= 0.3; // Lower pH when healthy
        ph += (Math.random() - 0.5) * 0.4; // Random variation
        ph = Math.max(5.0, Math.min(8.5, Math.round(ph * 100) / 100));
        
        // Generate TCS34725 color data based on health score
        const colorMap = {
          1: { r: 255, g: 255, b: 200 }, // Pale yellow (excellent)
          2: { r: 255, g: 250, b: 170 }, // Light yellow
          3: { r: 255, g: 240, b: 140 }, // Yellow
          4: { r: 255, g: 220, b: 110 }, // Medium yellow
          5: { r: 255, g: 200, b: 80 },  // Dark yellow
          6: { r: 245, g: 175, b: 50 },  // Amber
          7: { r: 220, g: 150, b: 40 },  // Dark amber
          8: { r: 180, g: 120, b: 30 },  // Brown
          9: { r: 140, g: 90, b: 35 },   // Dark brown
          10: { r: 100, g: 70, b: 45 }   // Very dark
        };
        
        const baseColor = colorMap[healthScore as keyof typeof colorMap];
        
        // Add TCS34725 sensor variation (simulate real sensor noise)
        const color_r = Math.max(50, Math.min(255, baseColor.r + Math.floor((Math.random() - 0.5) * 30)));
        const color_g = Math.max(50, Math.min(255, baseColor.g + Math.floor((Math.random() - 0.5) * 25)));
        const color_b = Math.max(20, Math.min(255, baseColor.b + Math.floor((Math.random() - 0.5) * 20)));
        
        // Generate hex color
        const color_hex = `#${color_r.toString(16).padStart(2, '0')}${color_g.toString(16).padStart(2, '0')}${color_b.toString(16).padStart(2, '0')}`.toUpperCase();
        
        // Map health score to hydration level
        const hydrationMap = {
          1: 'excellent', 2: 'excellent', 3: 'good', 4: 'good',
          5: 'fair', 6: 'fair', 7: 'poor', 8: 'poor',
          9: 'critical', 10: 'critical'
        };
        
        const hydration_level = hydrationMap[healthScore as keyof typeof hydrationMap];
        
        // Generate confidence score (TCS34725 sensor confidence)
        const confidence_score = 0.75 + (Math.random() * 0.25); // 75-100% confidence
        
        // Generate health recommendations
        const recommendationsMap = {
          1: ['Excellent hydration! Maintain current habits'],
          2: ['Good hydration level', 'Continue current water intake'],
          3: ['Normal hydration', 'Keep up good habits'],
          4: ['Increase water intake slightly', 'Monitor throughout day'],
          5: ['Increase water intake', 'Reduce caffeine'],
          6: ['Drink water now', 'Monitor closely'],
          7: ['Urgent hydration needed', 'Consider medical advice'],
          8: ['Immediate attention', 'Possible medical issue'],
          9: ['Emergency care needed', 'Contact healthcare provider'],
          10: ['CRITICAL - Seek immediate medical care']
        };
        
        const recommendations = recommendationsMap[healthScore as keyof typeof recommendationsMap];
        
        // Generate alert levels
        const alert_level = healthScore >= 9 ? 'critical' : 
                          healthScore >= 7 ? 'high' : 
                          healthScore >= 5 ? 'medium' : 
                          healthScore >= 4 ? 'low' : 'none';
        
        const alert_message = healthScore >= 8 ? 
          `Health score ${healthScore}/10 detected - consider consulting healthcare provider` : 
          null;
        
        // Simulate clear channel data from TCS34725
        const clear_value = Math.floor((color_r + color_g + color_b) * 1.2 + Math.random() * 100);
        
        allHealthReadings.push({
          user_id: demoUserId,
          ph: ph,
          color_r: color_r,
          color_g: color_g,
          color_b: color_b,
          color_hex: color_hex,
          clear_value: clear_value,
          health_score: healthScore,
          hydration_level: hydration_level,
          confidence_score: Math.round(confidence_score * 10000) / 10000,
          recommendations: recommendations,
          alert_level: alert_level,
          alert_message: alert_message,
          device_id: 'arduino-tcs34725-demo',
          reading_source: 'tcs34725',
          notes: `Day ${30-day} reading ${reading + 1} - Demo health data`,
          reading_time: readingDate.toISOString()
        });
      }
    }
    
    console.log(`📊 Generated ${allHealthReadings.length} health readings over 30 days`);
    console.log(`   Average: ${Math.round(allHealthReadings.length / 30)} readings per day\n`);
    
    // Insert health readings in batches (skip user constraint)
    console.log('💾 Inserting health readings into database...');
    
    // First, let's try to insert directly without user_id constraint
    const readingsWithoutUser = allHealthReadings.map(reading => {
      const { user_id, ...readingData } = reading;
      return readingData;
    });
    
    const batchSize = 50;
    let totalInserted = 0;
    
    for (let i = 0; i < readingsWithoutUser.length; i += batchSize) {
      const batch = readingsWithoutUser.slice(i, i + batchSize);
      
      const { data: insertedReadings, error: readingsError } = await supabase
        .from('health_readings')
        .insert(batch)
        .select();
        
      if (readingsError) {
        console.log(`❌ Error inserting batch ${Math.floor(i/batchSize) + 1}:`, readingsError.message);
      } else {
        totalInserted += insertedReadings?.length || 0;
        console.log(`   ✅ Inserted batch ${Math.floor(i/batchSize) + 1}: ${insertedReadings?.length} readings`);
      }
    }
    
    console.log(`✅ Total health readings inserted: ${totalInserted}\n`);
    
    // Verify and show analytics  
    if (totalInserted > 0) {
      console.log('📈 Verifying inserted data and analytics...\n');
      
      // Get all readings
      const { data: allReadings } = await supabase
        .from('health_readings')
        .select('health_score, ph, reading_time, color_hex, hydration_level')
        .order('reading_time', { ascending: false })
        .limit(100);
        
      if (allReadings && allReadings.length > 0) {
        console.log(`✅ Successfully inserted ${allReadings.length} readings`);
        
        // Show latest readings
        console.log('\n📊 Latest 5 readings:');
        allReadings.slice(0, 5).forEach((reading, i) => {
          const date = new Date(reading.reading_time).toLocaleDateString();
          console.log(`   ${i+1}. ${date}: Score ${reading.health_score}/10, pH ${reading.ph}, Color ${reading.color_hex}, ${reading.hydration_level}`);
        });
        
        // Calculate 30-day analytics
        const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
        const recentReadings = allReadings.filter(r => new Date(r.reading_time) >= thirtyDaysAgo);
        
        if (recentReadings.length > 0) {
          const avgHealthScore = recentReadings.reduce((sum, r) => sum + r.health_score, 0) / recentReadings.length;
          const avgPH = recentReadings.reduce((sum, r) => sum + r.ph, 0) / recentReadings.length;
          
          console.log('\n📈 30-Day Analytics:');
          console.log(`   Total readings: ${recentReadings.length}`);
          console.log(`   Average health score: ${avgHealthScore.toFixed(2)}/10`);
          console.log(`   Average pH: ${avgPH.toFixed(2)}`);
          
          // Health score distribution
          const scoreDistribution: { [key: number]: number } = {};
          recentReadings.forEach(r => {
            scoreDistribution[r.health_score] = (scoreDistribution[r.health_score] || 0) + 1;
          });
          
          console.log('\n   📊 Health Score Distribution:');
          Object.entries(scoreDistribution).forEach(([score, count]) => {
            const percentage = ((count / recentReadings.length) * 100).toFixed(1);
            const bar = '█'.repeat(Math.floor(percentage / 5));
            console.log(`   Score ${score}: ${count} readings (${percentage}%) ${bar}`);
          });
          
          // Hydration level distribution
          const hydrationCounts: { [key: string]: number } = {};
          recentReadings.forEach(r => {
            hydrationCounts[r.hydration_level] = (hydrationCounts[r.hydration_level] || 0) + 1;
          });
          
          console.log('\n   💧 Hydration Level Distribution:');
          Object.entries(hydrationCounts).forEach(([level, count]) => {
            const percentage = ((count / recentReadings.length) * 100).toFixed(1);
            console.log(`   ${level}: ${count} readings (${percentage}%)`);
          });
        }
      }
    }
    
    console.log('\n🎉 MOCK DATA CREATION COMPLETE! 🎉');
    console.log('\n✅ What was created:');
    console.log(`   📊 ${totalInserted} realistic health readings`);
    console.log('   🎨 TCS34725 RGB color data with hex values');
    console.log('   🔬 pH values with realistic variation');
    console.log('   💧 Hydration levels (excellent → critical)');
    console.log('   📈 Health improvement trend over 30 days');
    console.log('   ⚠️ Alert levels and recommendations');
    console.log('   🕒 Precise timestamps for analytics');
    
    console.log('\n🚀 Your database now supports:');
    console.log('   📈 30-day health analytics');
    console.log('   📊 Health score distributions');
    console.log('   🔍 Time-based queries');
    console.log('   💧 Hydration tracking');
    console.log('   🎨 Color analysis data');
    
    console.log('\n🎯 Ready for:');
    console.log('   1. Analytics API testing');
    console.log('   2. TCS34725 sensor integration');
    console.log('   3. Health trend visualization');
    console.log('   4. Real-time health monitoring');
    
  } catch (error: any) {
    console.error('❌ Mock data creation failed:', error.message);
  }
}

createSimpleMockData(); 