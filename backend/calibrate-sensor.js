// Sensor calibration helper for TCS34725
// This will help you understand what colors your sensor is actually reading

console.log('🔧 TCS34725 Sensor Calibration Guide\n');

console.log('📋 Expected vs Actual Readings:');
console.log('┌─────────────────────┬─────────────────────┬─────────────────────┐');
console.log('│ Sample Type         │ Expected RGB        │ Your Actual RGB     │');
console.log('├─────────────────────┼─────────────────────┼─────────────────────┤');
console.log('│ Clear Water         │ (240,245,250)       │ (88,100,77) ❌      │');
console.log('│ Light Yellow        │ (255,245,180)       │ ???                 │');
console.log('│ Dark Yellow         │ (255,200,80)        │ ???                 │');
console.log('└─────────────────────┴─────────────────────┴─────────────────────┘');

console.log('\n🔍 Troubleshooting Steps:');
console.log('1. Check if sensor is reading ambient light instead of sample');
console.log('2. Ensure proper lighting conditions (consistent white light)');
console.log('3. Verify sensor is close enough to the sample');
console.log('4. Check if sensor needs white balance calibration');

console.log('\n⚙️ Arduino Code Adjustments Needed:');
console.log('1. Add white balance calibration on startup');
console.log('2. Use integrationTime and gain settings for your lighting');
console.log('3. Take multiple readings and average them');
console.log('4. Add ambient light compensation');

console.log('\n🎯 Quick Test:');
console.log('Place sensor over:');
console.log('- White paper → Should read ~(240,240,240)');
console.log('- Yellow paper → Should read ~(255,245,180)'); 
console.log('- Your current reading → (88,100,77) suggests dark/green environment');