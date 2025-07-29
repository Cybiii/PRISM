import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
config();

async function createMockData() {
  console.log('🏥 Creating PUMA Mock Data & Sending to Supabase...\n');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase configuration');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    // Step 1: Create mock users
    console.log('1️⃣ Creating mock user profiles...');
    
    const mockUsers = [
      {
        id: '11111111-1111-1111-1111-111111111111',
        email: 'john.doe@puma-health.com',
        full_name: 'John Doe',
        age: 35,
        gender: 'male',
        medical_conditions: ['diabetes', 'hypertension'],
        medications: ['metformin', 'lisinopril']
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        email: 'jane.smith@puma-health.com',
        full_name: 'Jane Smith',
        age: 28,
        gender: 'female',
        medical_conditions: ['kidney_stones'],
        medications: ['potassium_citrate']
      },
      {
        id: '33333333-3333-3333-3333-333333333333',
        email: 'mike.johnson@puma-health.com',
        full_name: 'Mike Johnson',
        age: 42,
        gender: 'male',
        medical_conditions: ['chronic_dehydration'],
        medications: ['electrolyte_supplements']
      },
      {
        id: '44444444-4444-4444-4444-444444444444',
        email: 'sarah.davis@puma-health.com',
        full_name: 'Sarah Davis',
        age: 31,
        gender: 'female',
        medical_conditions: [],
        medications: []
      }
    ];

    // First, create auth users (simulate auth.users entries)
    console.log('   Creating auth entries...');
    for (const user of mockUsers) {
      try {
        // Insert into auth.users using admin API simulation
        const { error: authError } = await supabase.auth.admin.createUser({
          user_id: user.id,
          email: user.email,
          password: 'TempPassword123!',
          email_confirm: true,
          user_metadata: {
            full_name: user.full_name
          }
        });
        
        if (authError && !authError.message.includes('already registered')) {
          console.log(`   ⚠️ Auth user creation note for ${user.email}:`, authError.message);
        }
      } catch (e: any) {
        console.log(`   📝 Note: Auth handling for ${user.email}`);
      }
    }

    // Insert user profiles
    console.log('   Inserting user profiles...');
    const { data: insertedProfiles, error: profileError } = await supabase
      .from('user_profiles')
      .upsert(mockUsers)
      .select();
      
    if (profileError) {
      console.log('❌ Error creating user profiles:', profileError.message);
      console.log('📝 Note: This may be due to auth.users constraint. Continuing with readings...\n');
    } else {
      console.log(`✅ Created ${insertedProfiles?.length || mockUsers.length} user profiles`);
      insertedProfiles?.forEach(profile => {
        console.log(`   👤 ${profile.full_name} (${profile.email})`);
        console.log(`      Age: ${profile.age}, Conditions: ${profile.medical_conditions?.join(', ') || 'None'}`);
      });
    }

    // Step 2: Generate 30 days of health readings for each user
    console.log('\n2️⃣ Generating 30 days of health readings...');
    
    const allHealthReadings = [];
    const now = new Date();

    for (const user of mockUsers) {
      console.log(`   📊 Generating data for ${user.full_name}...`);
      
      // Create user-specific health pattern
      const userHealthProfile = {
        baseHealthScore: user.medical_conditions.length > 0 ? 6 : 3, // Worse if has conditions
        phTrend: user.gender === 'female' ? 6.8 : 7.2, // Slightly different pH patterns
        variability: user.age > 40 ? 0.8 : 0.5 // More variability with age
      };

      // Generate readings for 30 days (2-3 readings per day)
      for (let day = 0; day < 30; day++) {
        const readingsPerDay = 2 + Math.floor(Math.random() * 2); // 2-3 readings per day
        
        for (let reading = 0; reading < readingsPerDay; reading++) {
          const readingDate = new Date(now.getTime() - (day * 24 * 60 * 60 * 1000));
          
          // Spread readings throughout the day (morning, afternoon/evening)
          const hourOffset = reading === 0 ? 8 : (reading === 1 ? 14 : 20);
          readingDate.setHours(hourOffset + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60));
          
          // Simulate health improvement over time (treatment working)
          const dayProgress = (29 - day) / 29; // 0 = oldest, 1 = newest
          const improvementFactor = 0.3 * dayProgress; // Gradual improvement
          
          // Calculate health score with trends
          let healthScore = userHealthProfile.baseHealthScore - improvementFactor;
          healthScore += (Math.random() - 0.5) * userHealthProfile.variability;
          healthScore = Math.max(1, Math.min(10, Math.round(healthScore)));
          
          // Generate realistic pH based on health score and user profile
          let ph = userHealthProfile.phTrend;
          if (healthScore > 6) ph += 0.4; // Higher pH when unhealthy
          if (healthScore < 3) ph -= 0.2; // Lower pH when very healthy
          ph += (Math.random() - 0.5) * 0.6; // Random variation
          ph = Math.max(5.0, Math.min(8.5, Math.round(ph * 100) / 100));
          
          // Generate color based on health score (yellow to brown scale)
          const healthColorMap = {
            1: { r: 255, g: 255, b: 200 }, // Pale yellow (excellent)
            2: { r: 255, g: 250, b: 150 }, // Light yellow
            3: { r: 255, g: 235, b: 120 }, // Yellow
            4: { r: 255, g: 215, b: 90 },  // Medium yellow
            5: { r: 255, g: 195, b: 60 },  // Dark yellow
            6: { r: 255, g: 165, b: 40 },  // Amber
            7: { r: 200, g: 130, b: 30 },  // Dark amber
            8: { r: 160, g: 100, b: 20 },  // Brown
            9: { r: 120, g: 80, b: 40 },   // Dark brown
            10: { r: 80, g: 60, b: 60 }    // Very dark/red
          };
          
          const baseColor = healthColorMap[healthScore as keyof typeof healthColorMap];
          const color_r = Math.max(0, Math.min(255, baseColor.r + Math.floor((Math.random() - 0.5) * 40)));
          const color_g = Math.max(0, Math.min(255, baseColor.g + Math.floor((Math.random() - 0.5) * 40)));
          const color_b = Math.max(0, Math.min(255, baseColor.b + Math.floor((Math.random() - 0.5) * 40)));
          
          // Map health score to hydration level
          const hydrationLevels = ['excellent', 'good', 'fair', 'poor', 'critical'];
          const hydrationIndex = Math.min(4, Math.floor((healthScore - 1) / 2));
          
          // Generate recommendations based on health score
          const recommendations = [
            healthScore <= 3 ? 'Maintain current hydration level' : 
            healthScore <= 5 ? 'Increase water intake' :
            healthScore <= 7 ? 'Monitor hydration closely' : 
            'Seek medical attention if persistent'
          ];
          
          allHealthReadings.push({
            user_id: user.id,
            ph: ph,
            color_r: color_r,
            color_g: color_g,
            color_b: color_b,
            color_hex: `#${color_r.toString(16).padStart(2, '0')}${color_g.toString(16).padStart(2, '0')}${color_b.toString(16).padStart(2, '0')}`.toUpperCase(),
            health_score: healthScore,
            hydration_level: hydrationLevels[hydrationIndex],
            confidence_score: 0.7 + (Math.random() * 0.3), // 70-100% confidence
            recommendations: recommendations,
            alert_level: healthScore >= 8 ? 'high' : healthScore >= 6 ? 'medium' : 'none',
            alert_message: healthScore >= 8 ? `Critical health score ${healthScore}/10 - consult healthcare provider` : null,
            device_id: 'arduino-tcs34725-demo',
            reading_source: 'tcs34725',
            notes: `Day ${day + 1} reading ${reading + 1} - ${user.full_name}`,
            reading_time: readingDate.toISOString()
          });
        }
      }
    }

    console.log(`📊 Generated ${allHealthReadings.length} health readings across ${mockUsers.length} users`);
    console.log(`   Average: ${Math.round(allHealthReadings.length / mockUsers.length)} readings per user over 30 days`);

    // Step 3: Insert health readings in batches
    console.log('\n3️⃣ Inserting health readings into database...');
    
    const batchSize = 50; // Insert in batches to avoid timeout
    let totalInserted = 0;
    
    for (let i = 0; i < allHealthReadings.length; i += batchSize) {
      const batch = allHealthReadings.slice(i, i + batchSize);
      
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

    console.log(`✅ Total health readings inserted: ${totalInserted}`);

    // Step 4: Verify the inserted data
    console.log('\n4️⃣ Verifying inserted data...');
    
    for (const user of mockUsers) {
      const { data: userReadings, error: verifyError } = await supabase
        .from('health_readings')
        .select('id, health_score, ph, reading_time')
        .eq('user_id', user.id)
        .order('reading_time', { ascending: false })
        .limit(5);
        
      if (!verifyError && userReadings) {
        console.log(`   📊 ${user.full_name}: ${userReadings.length > 0 ? 'Data verified' : 'No data found'}`);
        if (userReadings.length > 0) {
          const avgScore = userReadings.reduce((sum, r) => sum + r.health_score, 0) / userReadings.length;
          const avgPH = userReadings.reduce((sum, r) => sum + r.ph, 0) / userReadings.length;
          console.log(`      Latest readings - Avg Score: ${avgScore.toFixed(1)}/10, Avg pH: ${avgPH.toFixed(2)}`);
        }
      }
    }

    // Step 5: Show analytics examples
    console.log('\n5️⃣ Sample Analytics Queries...');
    
    // Total readings in last 7 days
    const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    const { data: weekReadings } = await supabase
      .from('health_readings')
      .select('user_id, health_score')
      .gte('reading_time', sevenDaysAgo.toISOString());
      
    if (weekReadings) {
      console.log(`   📈 Last 7 days: ${weekReadings.length} total readings`);
      
      // Health score distribution
      const scoreDistribution: { [key: number]: number } = {};
      weekReadings.forEach(r => {
        scoreDistribution[r.health_score] = (scoreDistribution[r.health_score] || 0) + 1;
      });
      
      console.log('   📊 Health Score Distribution (7 days):');
      Object.entries(scoreDistribution).forEach(([score, count]) => {
        const percentage = ((count / weekReadings.length) * 100).toFixed(1);
        console.log(`      Score ${score}: ${count} readings (${percentage}%)`);
      });
    }

    console.log('\n🎉 MOCK DATA CREATION COMPLETE! 🎉');
    console.log('\n✅ What was created:');
    console.log(`   👥 ${mockUsers.length} user profiles with medical histories`);
    console.log(`   📊 ${totalInserted} health readings over 30 days`);
    console.log('   🎨 Realistic TCS34725 color and pH data');
    console.log('   📈 Health trends showing improvement over time');
    console.log('   ⚠️ Alert levels and health recommendations');
    
    console.log('\n🚀 Your database now contains:');
    console.log('   🏥 Realistic patient data for testing');
    console.log('   📊 30 days of health analytics');
    console.log('   🔬 TCS34725 sensor simulation data');
    console.log('   📈 Time-based trends and patterns');
    
    console.log('\n🎯 Next steps:');
    console.log('   1. Test analytics APIs with real data');
    console.log('   2. Connect your TCS34725 sensor');
    console.log('   3. Build frontend dashboards');
    console.log('   4. Start collecting real health data!');

  } catch (error: any) {
    console.error('❌ Mock data creation failed:', error.message);
  }
}

createMockData(); 