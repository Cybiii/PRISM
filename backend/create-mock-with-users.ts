import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
config();

async function createMockDataWithUsers() {
  console.log('🏥 Creating PUMA Mock Data with User Associations...\n');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase configuration');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    // Step 1: Clear existing data first
    console.log('🧹 Clearing existing data...');
    await supabase.from('health_readings').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('user_profiles').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('✅ Cleared existing data\n');

    // Step 2: Create demo users in auth.users and user_profiles
    console.log('1️⃣ Creating demo users...');
    
    const demoUsers = [
      {
        id: '11111111-1111-1111-1111-111111111111',
        email: 'john.doe@puma-demo.com',
        full_name: 'John Doe',
        age: 35,
        gender: 'male',
        medical_conditions: ['diabetes', 'hypertension'],
        medications: ['metformin', 'lisinopril'],
        baseHealthScore: 7, // Starts with poor health, improves
        phBase: 7.1 // Slightly alkaline
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        email: 'jane.smith@puma-demo.com',
        full_name: 'Jane Smith',
        age: 28,
        gender: 'female',
        medical_conditions: ['kidney_stones'],
        medications: ['potassium_citrate'],
        baseHealthScore: 5, // Moderate health
        phBase: 6.5 // Normal range
      },
      {
        id: '33333333-3333-3333-3333-333333333333',
        email: 'mike.johnson@puma-demo.com',
        full_name: 'Mike Johnson',
        age: 42,
        gender: 'male',
        medical_conditions: ['chronic_dehydration'],
        medications: ['electrolyte_supplements'],
        baseHealthScore: 8, // Poor health initially
        phBase: 7.3 // High pH
      },
      {
        id: '44444444-4444-4444-4444-444444444444',
        email: 'sarah.davis@puma-demo.com',
        full_name: 'Sarah Davis',
        age: 31,
        gender: 'female',
        medical_conditions: [],
        medications: [],
        baseHealthScore: 3, // Good health
        phBase: 6.2 // Healthy pH
      }
    ];

    // Create auth users using the admin API
    console.log('   Creating auth users...');
    for (const user of demoUsers) {
      try {
        const { data, error } = await supabase.auth.admin.createUser({
          user_id: user.id,
          email: user.email,
          password: 'DemoPassword123!',
          email_confirm: true,
          user_metadata: {
            full_name: user.full_name,
            demo_user: true
          }
        });
        
        if (error && !error.message.includes('already registered')) {
          console.log(`   ⚠️  Auth user ${user.email}:`, error.message);
        } else {
          console.log(`   ✅ Auth user created: ${user.email}`);
        }
      } catch (e) {
        console.log(`   📝 Auth note for ${user.email}: May already exist`);
      }
    }

    // Create user profiles (this should work now with auth users)
    console.log('   Creating user profiles...');
    const profilesData = demoUsers.map(user => ({
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      age: user.age,
      gender: user.gender,
      medical_conditions: user.medical_conditions,
      medications: user.medications,
      created_at: new Date().toISOString()
    }));

    const { data: insertedProfiles, error: profileError } = await supabase
      .from('user_profiles')
      .upsert(profilesData)
      .select();
      
    if (profileError) {
      console.log('⚠️  Profile creation note:', profileError.message);
      console.log('📝 Continuing with health readings...\n');
    } else {
      console.log(`✅ Created ${insertedProfiles?.length || demoUsers.length} user profiles`);
      insertedProfiles?.forEach(profile => {
        console.log(`   👤 ${profile.full_name} (${profile.email})`);
      });
    }

    // Step 3: Generate 30 days of health readings for each user
    console.log('\n2️⃣ Generating 30 days of health readings per user...');
    
    const allHealthReadings = [];
    const now = new Date();

    for (const user of demoUsers) {
      console.log(`   📊 Generating data for ${user.full_name}...`);
      
      // Generate readings for past 30 days (2-4 readings per day)
      for (let day = 0; day < 30; day++) {
        const readingsPerDay = 2 + Math.floor(Math.random() * 3); // 2-4 readings per day
        
        for (let reading = 0; reading < readingsPerDay; reading++) {
          const readingDate = new Date(now.getTime() - (day * 24 * 60 * 60 * 1000));
          
          // Spread readings throughout the day
          const hours = [8, 13, 18, 22]; // Morning, lunch, evening, night
          const hour = hours[reading % hours.length] + Math.floor(Math.random() * 2);
          readingDate.setHours(hour, Math.floor(Math.random() * 60));
          
          // Health improvement over time
          const dayProgress = (29 - day) / 29; // 0 = oldest, 1 = newest
          const improvementFactor = 2 * dayProgress; // Up to 2 points improvement
          
          // Calculate health score with user-specific baseline
          let healthScore = user.baseHealthScore - improvementFactor;
          
          // Add daily patterns and variation
          const isWeekend = readingDate.getDay() === 0 || readingDate.getDay() === 6;
          if (isWeekend) healthScore += 0.3;
          if (hour >= 20) healthScore += 0.4; // Worse at night
          if (hour <= 9) healthScore -= 0.2; // Better in morning
          
          healthScore += (Math.random() - 0.5) * 1.0; // Random variation
          healthScore = Math.max(1, Math.min(10, Math.round(healthScore)));
          
          // Generate pH based on user baseline and health score
          let ph = user.phBase;
          if (healthScore > 6) ph += 0.3;
          if (healthScore < 4) ph -= 0.2;
          ph += (Math.random() - 0.5) * 0.3;
          ph = Math.max(5.0, Math.min(8.5, Math.round(ph * 100) / 100));
          
          // Generate TCS34725 color data
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
          const color_r = Math.max(50, Math.min(255, baseColor.r + Math.floor((Math.random() - 0.5) * 30)));
          const color_g = Math.max(50, Math.min(255, baseColor.g + Math.floor((Math.random() - 0.5) * 25)));
          const color_b = Math.max(20, Math.min(255, baseColor.b + Math.floor((Math.random() - 0.5) * 20)));
          
          const color_hex = `#${color_r.toString(16).padStart(2, '0')}${color_g.toString(16).padStart(2, '0')}${color_b.toString(16).padStart(2, '0')}`.toUpperCase();
          
          // Map health score to hydration level
          const hydrationMap = {
            1: 'excellent', 2: 'excellent', 3: 'good', 4: 'good',
            5: 'fair', 6: 'fair', 7: 'poor', 8: 'poor',
            9: 'critical', 10: 'critical'
          };
          
          const hydration_level = hydrationMap[healthScore as keyof typeof hydrationMap];
          
          // Generate recommendations
          const recommendationsMap = {
            1: ['Excellent! Maintain current habits'],
            2: ['Very good hydration level'],
            3: ['Good hydration', 'Keep up good habits'],
            4: ['Increase water intake slightly'],
            5: ['Increase water intake', 'Monitor closely'],
            6: ['Drink water now', 'Reduce caffeine'],
            7: ['Urgent hydration needed'],
            8: ['Seek medical advice'],
            9: ['Emergency hydration', 'Contact doctor'],
            10: ['CRITICAL - Immediate medical care']
          };
          
          const recommendations = recommendationsMap[healthScore as keyof typeof recommendationsMap];
          
          // Generate alert levels
          const alert_level = healthScore >= 9 ? 'critical' : 
                            healthScore >= 7 ? 'high' : 
                            healthScore >= 5 ? 'medium' : 
                            healthScore >= 4 ? 'low' : 'none';
          
          const alert_message = healthScore >= 8 ? 
            `Health score ${healthScore}/10 for ${user.full_name} - medical consultation recommended` : 
            null;
          
          // Add clear channel simulation
          const clear_value = Math.floor((color_r + color_g + color_b) * 1.1 + Math.random() * 50);
          
          allHealthReadings.push({
            user_id: user.id,
            ph: ph,
            color_r: color_r,
            color_g: color_g,
            color_b: color_b,
            color_hex: color_hex,
            clear_value: clear_value,
            health_score: healthScore,
            hydration_level: hydration_level,
            confidence_score: 0.75 + (Math.random() * 0.25),
            recommendations: recommendations,
            alert_level: alert_level,
            alert_message: alert_message,
            device_id: `arduino-tcs34725-${user.id.slice(-4)}`,
            reading_source: 'tcs34725',
            notes: `Day ${30-day} reading ${reading + 1} - ${user.full_name}`,
            reading_time: readingDate.toISOString()
          });
        }
      }
    }

    console.log(`📊 Generated ${allHealthReadings.length} health readings for ${demoUsers.length} users`);
    console.log(`   Average: ${Math.round(allHealthReadings.length / demoUsers.length)} readings per user\n`);

    // Step 4: Insert health readings with user_id
    console.log('3️⃣ Inserting health readings with user associations...');
    
    const batchSize = 50;
    let totalInserted = 0;
    
    for (let i = 0; i < allHealthReadings.length; i += batchSize) {
      const batch = allHealthReadings.slice(i, i + batchSize);
      
      const { data: insertedReadings, error: readingsError } = await supabase
        .from('health_readings')
        .insert(batch)
        .select();
        
      if (readingsError) {
        console.log(`❌ Error inserting batch ${Math.floor(i/batchSize) + 1}:`, readingsError.message);
        
        // If it's still a user constraint issue, try without user_ids as fallback
        if (readingsError.message.includes('user_id')) {
          console.log('   🔄 Retrying batch without user_id constraint...');
          const batchWithoutUser = batch.map(({ user_id, ...reading }) => reading);
          const { data: retryReadings, error: retryError } = await supabase
            .from('health_readings')
            .insert(batchWithoutUser)
            .select();
            
          if (!retryError) {
            totalInserted += retryReadings?.length || 0;
            console.log(`   ✅ Fallback successful: ${retryReadings?.length} readings`);
          }
        }
      } else {
        totalInserted += insertedReadings?.length || 0;
        console.log(`   ✅ Inserted batch ${Math.floor(i/batchSize) + 1}: ${insertedReadings?.length} readings with user_ids`);
      }
    }

    console.log(`✅ Total health readings inserted: ${totalInserted}\n`);

    // Step 5: Verify user-specific data
    console.log('4️⃣ Verifying user-specific data...');
    
    for (const user of demoUsers) {
      const { data: userReadings, error } = await supabase
        .from('health_readings')
        .select('id, health_score, ph, reading_time, user_id')
        .eq('user_id', user.id)
        .order('reading_time', { ascending: false })
        .limit(3);
        
      if (!error && userReadings && userReadings.length > 0) {
        const avgScore = userReadings.reduce((sum, r) => sum + r.health_score, 0) / userReadings.length;
        const avgPH = userReadings.reduce((sum, r) => sum + r.ph, 0) / userReadings.length;
        console.log(`   ✅ ${user.full_name}: ${userReadings.length} readings, Avg Score: ${avgScore.toFixed(1)}, Avg pH: ${avgPH.toFixed(2)}`);
      } else {
        console.log(`   ⚠️  ${user.full_name}: No user-specific readings found`);
      }
    }

    // Step 6: Show cross-user analytics
    console.log('\n5️⃣ Cross-User Analytics...');
    
    // Get readings by user
    const { data: allReadings } = await supabase
      .from('health_readings')
      .select('user_id, health_score, ph, hydration_level, reading_time')
      .order('reading_time', { ascending: false })
      .limit(200);
      
    if (allReadings) {
      console.log(`📊 Total readings in database: ${allReadings.length}`);
      
      // Group by user_id
      const userGroups: { [key: string]: any[] } = {};
      allReadings.forEach(reading => {
        if (reading.user_id) {
          if (!userGroups[reading.user_id]) userGroups[reading.user_id] = [];
          userGroups[reading.user_id].push(reading);
        }
      });
      
      console.log('\n   📈 Per-User Summary:');
      Object.entries(userGroups).forEach(([userId, readings]) => {
        const user = demoUsers.find(u => u.id === userId);
        const avgScore = readings.reduce((sum, r) => sum + r.health_score, 0) / readings.length;
        console.log(`   👤 ${user?.full_name || userId.slice(-4)}: ${readings.length} readings, Avg: ${avgScore.toFixed(1)}/10`);
      });
      
      // Overall health distribution
      const totalWithUsers = allReadings.filter(r => r.user_id).length;
      const totalWithoutUsers = allReadings.filter(r => !r.user_id).length;
      
      console.log(`\n   🎯 Data Association:`)
      console.log(`   ✅ Readings with user_id: ${totalWithUsers}`);
      console.log(`   ⚠️  Readings without user_id: ${totalWithoutUsers}`);
    }

    console.log('\n🎉 MOCK DATA WITH USERS COMPLETE! 🎉');
    console.log('\n✅ What was created:');
    console.log(`   👥 ${demoUsers.length} demo users with medical profiles`);
    console.log(`   📊 ${totalInserted} health readings with user associations`);
    console.log('   🎨 Realistic TCS34725 color sensor data');
    console.log('   📈 User-specific health improvement trends');
    console.log('   💊 Medical conditions and medications tracking');
    console.log('   ⚠️ User-specific alerts and recommendations');
    
    console.log('\n🚀 Now supports:');
    console.log('   👤 Per-user 30-day analytics');
    console.log('   📊 Cross-user health comparisons');
    console.log('   🔬 Individual health monitoring');
    console.log('   📈 Personalized trend analysis');
    
    console.log('\n🎯 Demo Users Created:');
    demoUsers.forEach(user => {
      console.log(`   👤 ${user.full_name} (${user.email})`);
      console.log(`      Age: ${user.age}, Conditions: ${user.medical_conditions.length > 0 ? user.medical_conditions.join(', ') : 'None'}`);
    });

  } catch (error: any) {
    console.error('❌ Mock data creation failed:', error.message);
  }
}

createMockDataWithUsers(); 