import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
config();

async function fixConstraintsAndSeed() {
  console.log('🔧 PUMA Database: Fixing Constraints & Seeding Data...\n');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase configuration');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    // Step 1: Analyze current constraints
    console.log('1️⃣ Analyzing current database constraints...');
    
    // Check if foreign key constraints exist
    const { data: constraints, error: constraintError } = await supabase
      .rpc('get_foreign_keys', {});
    
    if (constraintError) {
      console.log('   📝 Could not query constraints directly, proceeding with fix...');
    }

    // Step 2: Clean existing data
    console.log('\n2️⃣ Cleaning existing data...');
    
    // Delete health readings first (they depend on user_profiles)
    const { error: deleteReadingsError } = await supabase
      .from('health_readings')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (deleteReadingsError) console.log('   📝 Health readings cleanup:', deleteReadingsError.message);
    else console.log('   ✅ Cleared health readings');

    // Delete user profiles
    const { error: deleteProfilesError } = await supabase
      .from('user_profiles')  
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (deleteProfilesError) console.log('   📝 User profiles cleanup:', deleteProfilesError.message);
    else console.log('   ✅ Cleared user profiles');

    // Step 3: Temporarily disable constraints (if possible) or work around them
    console.log('\n3️⃣ Handling foreign key constraints...');
    
    // Try to disable constraints temporarily
    const { error: disableError } = await supabase
      .rpc('disable_user_profile_constraints', {});
    
    if (disableError) {
      console.log('   📝 Cannot disable constraints, using alternative approach...');
    } else {
      console.log('   ✅ Temporarily disabled foreign key constraints');
    }

    // Step 4: Create auth users properly
    console.log('\n4️⃣ Creating auth users...');
    
    const demoUsers = [
      {
        id: '11111111-1111-1111-1111-111111111111',
        email: 'john.doe@puma-health.com',
        full_name: 'John Doe',
        age: 35,
        gender: 'male',
        medical_conditions: ['diabetes', 'hypertension'],
        medications: ['metformin', 'lisinopril'],
        baseHealthScore: 7,
        phBase: 7.1
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        email: 'jane.smith@puma-health.com',
        full_name: 'Jane Smith',
        age: 28,
        gender: 'female',
        medical_conditions: ['kidney_stones'],
        medications: ['potassium_citrate'],
        baseHealthScore: 5,
        phBase: 6.5
      },
      {
        id: '33333333-3333-3333-3333-333333333333',
        email: 'mike.johnson@puma-health.com',
        full_name: 'Mike Johnson',
        age: 42,
        gender: 'male',
        medical_conditions: ['chronic_dehydration'],
        medications: ['electrolyte_supplements'],
        baseHealthScore: 8,
        phBase: 7.3
      },
      {
        id: '44444444-4444-4444-4444-444444444444',
        email: 'sarah.davis@puma-health.com',
        full_name: 'Sarah Davis',
        age: 31,
        gender: 'female',
        medical_conditions: [],
        medications: [],
        baseHealthScore: 3,
        phBase: 6.2
      }
    ];

    const createdAuthUsers = [];

    for (const user of demoUsers) {
      try {
        // Delete existing auth user first
        try {
          await supabase.auth.admin.deleteUser(user.id);
        } catch (e) {
          // User might not exist, that's ok
        }

        // Create new auth user
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
          user_id: user.id,
          email: user.email,
          password: 'DemoPassword123!',
          email_confirm: true,
          user_metadata: {
            full_name: user.full_name,
            demo_user: true
          }
        });
        
        if (authError) {
          console.log(`   ⚠️  Auth user ${user.email}: ${authError.message}`);
          
          // If user already exists, try to get it
          if (authError.message.includes('already registered')) {
            console.log(`   🔄 User ${user.email} already exists, continuing...`);
            createdAuthUsers.push({ user: { id: user.id }, error: null });
          }
        } else {
          console.log(`   ✅ Created auth user: ${user.email} (${user.id})`);
          createdAuthUsers.push({ user: authUser.user, error: null });
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (e: any) {
        console.log(`   ❌ Failed to create auth user ${user.email}:`, e.message);
        createdAuthUsers.push({ user: null, error: e.message });
      }
    }

    console.log(`   📊 Auth users processed: ${createdAuthUsers.length}`);

    // Step 5: Create user profiles with proper error handling
    console.log('\n5️⃣ Creating user profiles...');

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

    // Try inserting profiles one by one for better error handling
    const createdProfiles = [];
    for (const profile of profilesData) {
      try {
        const { data: insertedProfile, error: profileError } = await supabase
          .from('user_profiles')
          .insert(profile)
          .select()
          .single();
          
        if (profileError) {
          console.log(`   ⚠️  Profile ${profile.full_name}: ${profileError.message}`);
          
          // If constraint error, try alternative approach
          if (profileError.message.includes('foreign key')) {
            console.log(`   🔄 Attempting alternative approach for ${profile.full_name}...`);
            
            // Try inserting without the constraint
            const { data: altProfile, error: altError } = await supabase
              .rpc('insert_user_profile_force', {
                p_id: profile.id,
                p_email: profile.email,
                p_full_name: profile.full_name,
                p_age: profile.age,
                p_gender: profile.gender,
                p_medical_conditions: profile.medical_conditions,
                p_medications: profile.medications
              });
              
            if (altError) {
              console.log(`   ❌ Alternative approach failed for ${profile.full_name}`);
            } else {
              console.log(`   ✅ Created profile via alternative: ${profile.full_name}`);
              createdProfiles.push(profile);
            }
          }
        } else {
          console.log(`   ✅ Created profile: ${profile.full_name}`);
          createdProfiles.push(insertedProfile);
        }
      } catch (e: any) {
        console.log(`   ❌ Profile creation failed for ${profile.full_name}:`, e.message);
      }
    }

    console.log(`   📊 User profiles created: ${createdProfiles.length}/${demoUsers.length}`);

    // Step 6: If profiles failed, try without foreign key constraint
    if (createdProfiles.length === 0) {
      console.log('\n🔄 Attempting to create profiles without foreign key constraint...');
      
      // Try to modify the table to make user_id nullable or remove constraint
      const { error: modifyError } = await supabase
        .rpc('modify_user_profiles_constraint', {});
        
      if (!modifyError) {
        console.log('   ✅ Modified constraint, retrying profile creation...');
        
        const { data: retryProfiles, error: retryError } = await supabase
          .from('user_profiles')
          .insert(profilesData)
          .select();
          
        if (!retryError && retryProfiles) {
          console.log(`   ✅ Successfully created ${retryProfiles.length} profiles after constraint modification`);
          createdProfiles.push(...retryProfiles);
        }
      } else {
        console.log('   📝 Could not modify constraints, continuing with health readings...');
      }
    }

    // Step 7: Generate health readings with user associations
    console.log('\n6️⃣ Generating health readings with user associations...');
    
    const allHealthReadings = [];
    const now = new Date();

    // Use either created profiles or fallback IDs
    const usersForReadings = createdProfiles.length > 0 ? 
      createdProfiles.map(p => demoUsers.find(u => u.id === p.id)).filter(Boolean) :
      demoUsers;

    console.log(`   📊 Generating data for ${usersForReadings.length} users...`);

    for (const user of usersForReadings) {
      if (!user) continue;
      
      console.log(`   📈 Creating 30-day data for ${user.full_name}...`);
      
      // Generate 30 days of readings (2-4 per day)
      for (let day = 0; day < 30; day++) {
        const readingsPerDay = 2 + Math.floor(Math.random() * 3);
        
        for (let reading = 0; reading < readingsPerDay; reading++) {
          const readingDate = new Date(now.getTime() - (day * 24 * 60 * 60 * 1000));
          const hour = [8, 13, 18, 22][reading % 4] + Math.floor(Math.random() * 2);
          readingDate.setHours(hour, Math.floor(Math.random() * 60));
          
          // Health improvement over time
          const dayProgress = (29 - day) / 29;
          const improvementFactor = 2 * dayProgress;
          
          let healthScore = user.baseHealthScore - improvementFactor;
          
          // Add patterns
          const isWeekend = readingDate.getDay() === 0 || readingDate.getDay() === 6;
          if (isWeekend) healthScore += 0.3;
          if (hour >= 20) healthScore += 0.4;
          if (hour <= 9) healthScore -= 0.2;
          healthScore += (Math.random() - 0.5) * 1.0;
          healthScore = Math.max(1, Math.min(10, Math.round(healthScore)));
          
          // Generate pH
          let ph = user.phBase;
          if (healthScore > 6) ph += 0.3;
          if (healthScore < 4) ph -= 0.2;
          ph += (Math.random() - 0.5) * 0.3;
          ph = Math.max(5.0, Math.min(8.5, Math.round(ph * 100) / 100));
          
          // Generate TCS34725 color data
          const colorMap = {
            1: { r: 255, g: 255, b: 200 }, 2: { r: 255, g: 250, b: 170 },
            3: { r: 255, g: 240, b: 140 }, 4: { r: 255, g: 220, b: 110 },
            5: { r: 255, g: 200, b: 80 }, 6: { r: 245, g: 175, b: 50 },
            7: { r: 220, g: 150, b: 40 }, 8: { r: 180, g: 120, b: 30 },
            9: { r: 140, g: 90, b: 35 }, 10: { r: 100, g: 70, b: 45 }
          };
          
          const baseColor = colorMap[healthScore as keyof typeof colorMap];
          const color_r = Math.max(50, Math.min(255, baseColor.r + Math.floor((Math.random() - 0.5) * 30)));
          const color_g = Math.max(50, Math.min(255, baseColor.g + Math.floor((Math.random() - 0.5) * 25)));
          const color_b = Math.max(20, Math.min(255, baseColor.b + Math.floor((Math.random() - 0.5) * 20)));
          
          const color_hex = `#${color_r.toString(16).padStart(2, '0')}${color_g.toString(16).padStart(2, '0')}${color_b.toString(16).padStart(2, '0')}`.toUpperCase();
          
          // Hydration and alerts
          const hydrationMap = {
            1: 'excellent', 2: 'excellent', 3: 'good', 4: 'good',
            5: 'fair', 6: 'fair', 7: 'poor', 8: 'poor',
            9: 'critical', 10: 'critical'
          };
          
          const recommendationsMap = {
            1: ['Excellent! Keep it up'], 2: ['Very good hydration'],
            3: ['Good hydration level'], 4: ['Increase water intake slightly'],
            5: ['Increase water intake'], 6: ['Drink water now'],
            7: ['Urgent hydration needed'], 8: ['Seek medical advice'],
            9: ['Emergency - contact doctor'], 10: ['CRITICAL - immediate care']
          };
          
          const alert_level = healthScore >= 9 ? 'critical' : 
                            healthScore >= 7 ? 'high' : 
                            healthScore >= 5 ? 'medium' : 
                            healthScore >= 4 ? 'low' : 'none';
          
          allHealthReadings.push({
            user_id: user.id,
            ph: ph,
            color_r: color_r,
            color_g: color_g,
            color_b: color_b,
            color_hex: color_hex,
            clear_value: Math.floor((color_r + color_g + color_b) * 1.1 + Math.random() * 50),
            health_score: healthScore,
            hydration_level: hydrationMap[healthScore as keyof typeof hydrationMap],
            confidence_score: 0.75 + (Math.random() * 0.25),
            recommendations: recommendationsMap[healthScore as keyof typeof recommendationsMap],
            alert_level: alert_level,
            alert_message: healthScore >= 8 ? `Health score ${healthScore}/10 for ${user.full_name}` : null,
            device_id: `arduino-tcs34725-${user.id.slice(-4)}`,
            reading_source: 'tcs34725',
            notes: `Day ${30-day} reading ${reading + 1} - ${user.full_name}`,
            reading_time: readingDate.toISOString()
          });
        }
      }
    }

    console.log(`   📊 Generated ${allHealthReadings.length} health readings`);

    // Step 8: Insert health readings with user associations
    console.log('\n7️⃣ Inserting health readings with user associations...');
    
    const batchSize = 100;
    let totalInserted = 0;
    let withUserIds = 0;
    
    for (let i = 0; i < allHealthReadings.length; i += batchSize) {
      const batch = allHealthReadings.slice(i, i + batchSize);
      
      // Try inserting with user_id first
      const { data: insertedReadings, error: readingsError } = await supabase
        .from('health_readings')
        .insert(batch)
        .select();
        
      if (readingsError && readingsError.message.includes('user_id')) {
        console.log(`   🔄 Batch ${Math.floor(i/batchSize) + 1}: Foreign key error, trying without user_id...`);
        
        // Fallback: insert without user_id
        const batchWithoutUser = batch.map(({ user_id, ...reading }) => reading);
        const { data: fallbackReadings, error: fallbackError } = await supabase
          .from('health_readings')
          .insert(batchWithoutUser)
          .select();
          
        if (!fallbackError && fallbackReadings) {
          totalInserted += fallbackReadings.length;
          console.log(`   ✅ Batch ${Math.floor(i/batchSize) + 1}: ${fallbackReadings.length} readings (without user_id)`);
        } else {
          console.log(`   ❌ Batch ${Math.floor(i/batchSize) + 1}: Failed completely`);
        }
      } else if (readingsError) {
        console.log(`   ❌ Batch ${Math.floor(i/batchSize) + 1}: ${readingsError.message}`);
      } else if (insertedReadings) {
        totalInserted += insertedReadings.length;
        withUserIds += insertedReadings.length;
        console.log(`   ✅ Batch ${Math.floor(i/batchSize) + 1}: ${insertedReadings.length} readings with user_id`);
      }
    }

    console.log(`   📊 Total inserted: ${totalInserted} readings`);
    console.log(`   👥 With user_id: ${withUserIds} readings`);
    console.log(`   🔄 Without user_id: ${totalInserted - withUserIds} readings`);

    // Step 9: Re-enable constraints if they were disabled
    console.log('\n8️⃣ Re-enabling constraints...');
    
    const { error: enableError } = await supabase
      .rpc('enable_user_profile_constraints', {});
    
    if (enableError) {
      console.log('   📝 Could not re-enable constraints automatically');
    } else {
      console.log('   ✅ Re-enabled foreign key constraints');
    }

    // Step 10: Verify the final result
    console.log('\n9️⃣ Verifying final database state...');
    
    // Check user profiles
    const { data: finalProfiles } = await supabase
      .from('user_profiles')
      .select('id, full_name, email');
      
    console.log(`   👥 User profiles in database: ${finalProfiles?.length || 0}`);
    finalProfiles?.forEach(profile => {
      console.log(`      ✅ ${profile.full_name} (${profile.email})`);
    });

    // Check health readings with user associations
    const { data: readingsWithUsers } = await supabase
      .from('health_readings')
      .select('user_id, health_score, reading_time')
      .not('user_id', 'is', null)
      .limit(10);
      
    console.log(`   📊 Health readings with user_id: ${readingsWithUsers?.length || 0}`);

    // Check total health readings
    const { data: allReadingsCheck } = await supabase
      .from('health_readings')
      .select('id', { count: 'exact' });
      
    console.log(`   📈 Total health readings: ${allReadingsCheck?.length || 0}`);

    // Step 11: Summary and next steps
    console.log('\n🎉 DATABASE SEEDING COMPLETE! 🎉');
    console.log('\n✅ What was accomplished:');
    console.log(`   👥 ${finalProfiles?.length || 0} user profiles created`);
    console.log(`   📊 ${totalInserted} health readings inserted`);
    console.log(`   🔗 ${withUserIds} readings with user associations`);
    console.log('   🎨 Realistic TCS34725 sensor data');
    console.log('   📈 30-day health trends per user');
    console.log('   💊 Medical conditions and medications');
    
    if (withUserIds > 0) {
      console.log('\n🎯 FULLY FUNCTIONAL USER SYSTEM:');
      console.log('   ✅ User-specific analytics ready');
      console.log('   ✅ Per-user 30-day tracking');
      console.log('   ✅ Individual health reports');
      console.log('   ✅ Cross-user comparisons');
    } else {
      console.log('\n⚠️  CONSTRAINT RESOLUTION NEEDED:');
      console.log('   📝 User profiles and readings exist');
      console.log('   📝 But user associations are limited');
      console.log('   🔧 May need manual schema adjustments');
    }

    console.log('\n🚀 Ready for:');
    console.log('   📊 Analytics API testing');
    console.log('   🔬 TCS34725 sensor integration');
    console.log('   🏥 Medical dashboard development');
    console.log('   👥 Multi-user health monitoring');

  } catch (error: any) {
    console.error('❌ Database seeding failed:', error.message);
    console.log('\n🔧 Troubleshooting steps:');
    console.log('   1. Check Supabase connection');
    console.log('   2. Verify SERVICE_ROLE_KEY permissions');  
    console.log('   3. Review foreign key constraints');
    console.log('   4. Consider manual schema adjustments');
  }
}

fixConstraintsAndSeed(); 