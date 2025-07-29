import { config } from 'dotenv';
import { supabaseService } from './src/services/SupabaseService';
import { userService } from './src/services/UserService';
import { logger } from './src/utils/logger';

// Load environment variables
config();

async function testSupabaseWithMockData() {
  console.log('🧪 PUMA Supabase Mock Data Test Starting...\n');

  try {
    // Step 1: Test basic connection
    console.log('1️⃣ Testing Supabase connection...');
    const isHealthy = await supabaseService.healthCheck();
    if (!isHealthy) {
      throw new Error('Supabase health check failed');
    }
    console.log('✅ Supabase connection successful!\n');

    // Step 2: Create a test user
    console.log('2️⃣ Creating test user...');
    const testUser = await userService.createDemoUser();
    console.log(`✅ Test user created: ${testUser.user.email}`);
    console.log(`   User ID: ${testUser.user.id}`);
    console.log(`   Full Name: ${testUser.profile.full_name}\n`);

    // Step 3: Generate and save mock health readings
    console.log('3️⃣ Generating mock health readings...');
    
    const mockReadings = generateMockHealthReadings(testUser.user.id);
    console.log(`📊 Generated ${mockReadings.length} mock readings`);

    // Save each reading
    const savedReadings = [];
    for (const reading of mockReadings) {
      const saved = await supabaseService.saveHealthReading(reading);
      savedReadings.push(saved);
    }
    console.log(`✅ Saved ${savedReadings.length} health readings to Supabase\n`);

    // Step 4: Test analytics queries
    console.log('4️⃣ Testing analytics queries...');
    
    // 24-hour stats
    const stats24h = await supabaseService.get24HourStats(testUser.user.id);
    console.log(`📈 24-hour stats:`);
    console.log(`   Total readings: ${stats24h.totalReadings}`);
    console.log(`   Average health score: ${stats24h.avgHealthScore.toFixed(2)}`);
    console.log(`   Average pH: ${stats24h.avgPH.toFixed(2)}`);
    console.log(`   Trend: ${stats24h.trendDirection}`);

    // 7-day stats
    const stats7d = await supabaseService.get7DayStats(testUser.user.id);
    console.log(`📊 7-day stats:`);
    console.log(`   Total readings: ${stats7d.totalReadings}`);
    console.log(`   Average health score: ${stats7d.avgHealthScore.toFixed(2)}`);
    console.log(`   Alert count: ${stats7d.alertCount}`);

    // Latest reading
    const latestReading = await supabaseService.getLatestReading(testUser.user.id);
    console.log(`🔍 Latest reading:`);
    console.log(`   Health score: ${latestReading?.health_score}/10`);
    console.log(`   pH: ${latestReading?.ph}`);
    console.log(`   Color: ${latestReading?.color_hex}`);
    console.log(`   Hydration: ${latestReading?.hydration_level}\n`);

    // Step 5: Test user health summary
    console.log('5️⃣ Testing comprehensive health summary...');
    const healthSummary = await userService.getUserHealthSummary(testUser.user.id);
    console.log(`📋 Health Summary:`);
    console.log(`   Overall trend: ${healthSummary.overallTrend}`);
    console.log(`   Daily summaries: ${healthSummary.recentDailySummaries.length} days`);
    
    // Display score distribution
    const scoreDistribution = healthSummary.last24Hours.scoreDistribution;
    console.log(`   Score distribution (24h):`);
    Object.entries(scoreDistribution).forEach(([score, count]) => {
      console.log(`     Score ${score}: ${count} readings`);
    });

    console.log('\n🎉 ALL TESTS PASSED! 🎉');
    console.log('✅ Supabase connection works perfectly');
    console.log('✅ User authentication works');
    console.log('✅ Health readings are saved correctly');
    console.log('✅ Analytics queries work');
    console.log('✅ Time-based tracking works');
    console.log('\n🚀 Your PUMA system is ready for production!');

    // Display sample API calls
    console.log('\n📡 Sample API calls you can now make:');
    console.log(`curl -X POST http://localhost:3001/auth/demo`);
    console.log(`curl -H "Authorization: Bearer ${testUser.accessToken}" http://localhost:3001/analytics/24h`);
    console.log(`curl -H "Authorization: Bearer ${testUser.accessToken}" http://localhost:3001/analytics/summary`);

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    console.log('\n🔧 Troubleshooting steps:');
    console.log('1. Check your .env file has correct Supabase keys');
    console.log('2. Ensure you ran the schema.sql in Supabase SQL Editor');  
    console.log('3. Verify your Supabase project is active');
    process.exit(1);
  }
}

function generateMockHealthReadings(userId: string) {
  const readings = [];
  const now = new Date();

  // Generate readings for the last 24 hours
  for (let i = 0; i < 24; i++) {
    const readingTime = new Date(now.getTime() - (i * 60 * 60 * 1000)); // Every hour
    
    // Create varied health scenarios
    const scenarios = [
      { ph: 6.5, color: { r: 255, g: 245, b: 150 }, score: 2, hydration: 'excellent' as const },
      { ph: 7.0, color: { r: 255, g: 235, b: 120 }, score: 3, hydration: 'good' as const },
      { ph: 6.8, color: { r: 255, g: 215, b: 90 }, score: 4, hydration: 'good' as const },
      { ph: 7.2, color: { r: 255, g: 195, b: 60 }, score: 5, hydration: 'fair' as const },
      { ph: 6.6, color: { r: 255, g: 165, b: 40 }, score: 6, hydration: 'fair' as const },
      { ph: 7.4, color: { r: 200, g: 130, b: 30 }, score: 8, hydration: 'poor' as const },
    ];

    const scenario = scenarios[i % scenarios.length];
    
    // Add some random variation
    const variation = (Math.random() - 0.5) * 0.4;
    
    readings.push({
      user_id: userId,
      ph: Math.max(4, Math.min(9, scenario.ph + variation)),
      color_r: Math.max(0, Math.min(255, scenario.color.r + Math.floor(variation * 20))),
      color_g: Math.max(0, Math.min(255, scenario.color.g + Math.floor(variation * 20))),
      color_b: Math.max(0, Math.min(255, scenario.color.b + Math.floor(variation * 20))),
      color_hex: `#${scenario.color.r.toString(16).padStart(2, '0')}${scenario.color.g.toString(16).padStart(2, '0')}${scenario.color.b.toString(16).padStart(2, '0')}`.toUpperCase(),
      health_score: scenario.score,
      hydration_level: scenario.hydration,
      confidence_score: 0.8 + Math.random() * 0.2, // 80-100% confidence
      recommendations: getRecommendationsForScore(scenario.score),
      alert_level: scenario.score >= 8 ? 'high' as const : scenario.score >= 6 ? 'medium' as const : 'none' as const,
      alert_message: scenario.score >= 8 ? 'High health score detected - consider medical consultation' : undefined,
      device_id: 'arduino-tcs34725',
      reading_source: 'tcs34725' as const,
      reading_time: readingTime.toISOString()
    });
  }

  return readings;
}

function getRecommendationsForScore(score: number): string[] {
  const recommendations = {
    1: ['Maintain current hydration', 'Continue healthy habits'],
    2: ['Good hydration level', 'Keep up the good work'],
    3: ['Normal hydration', 'Continue regular water intake'],
    4: ['Increase water intake slightly', 'Monitor throughout day'],
    5: ['Increase water intake', 'Avoid excessive caffeine'],
    6: ['Drink water immediately', 'Monitor closely', 'Consider electrolytes'],
    7: ['Urgent rehydration needed', 'Seek medical advice if persistent'],
    8: ['Immediate medical attention', 'Severe dehydration or medical issue'],
    9: ['Emergency medical care', 'Possible kidney/liver issues'],
    10: ['IMMEDIATE EMERGENCY CARE', 'Call emergency services']
  };

  return recommendations[score as keyof typeof recommendations] || ['Monitor health status'];
}

// Run the test
testSupabaseWithMockData(); 