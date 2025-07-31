// Debug script to test color classification with your actual Arduino data
const { createClient } = require('@supabase/supabase-js');

// Simulate the RGB to LAB conversion (simplified)
function rgbToLab(rgb) {
  let { r, g, b } = rgb;
  
  // Normalize RGB values to 0-1 range
  r = r / 255.0;
  g = g / 255.0;
  b = b / 255.0;

  // Apply gamma correction
  r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
  g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
  b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

  // Convert to XYZ using sRGB matrix
  const x = r * 0.4124564 + g * 0.3575761 + b * 0.1804375;
  const y = r * 0.2126729 + g * 0.7151522 + b * 0.0721750;
  const z = r * 0.0193339 + g * 0.1191920 + b * 0.9503041;

  // Normalize by D65 illuminant
  const xn = x / 0.95047;
  const yn = y / 1.00000;
  const zn = z / 1.08883;

  // Apply LAB transformation
  const fx = xn > 0.008856 ? Math.pow(xn, 1/3) : (7.787 * xn + 16/116);
  const fy = yn > 0.008856 ? Math.pow(yn, 1/3) : (7.787 * yn + 16/116);
  const fz = zn > 0.008856 ? Math.pow(zn, 1/3) : (7.787 * zn + 16/116);

  const l = 116 * fy - 16;
  const a = 500 * (fx - fy);
  const bVal = 200 * (fy - fz);

  return {
    l: isNaN(l) || !isFinite(l) ? 50 : l,
    a: isNaN(a) || !isFinite(a) ? 0 : a,
    b: isNaN(bVal) || !isFinite(bVal) ? 0 : bVal
  };
}

function calculateColorDistance(color1, color2) {
  return Math.sqrt(
    Math.pow(color1.l - color2.l, 2) +
    Math.pow(color1.a - color2.a, 2) +
    Math.pow(color1.b - color2.b, 2)
  );
}

// Test with your actual Arduino data
const testColors = [
  { r: 88, g: 100, b: 77 },   // Your Arduino reading
  { r: 255, g: 255, b: 230 }, // Score 10 cluster
  { r: 120, g: 70, b: 15 }    // Score 1 cluster
];

// Pre-defined clusters from your system
const clusters = [
  { score: 10, rgb: { r: 255, g: 255, b: 230 }, desc: "Excellent - very pale yellow" },
  { score: 9, rgb: { r: 255, g: 250, b: 205 }, desc: "Great - pale yellow" },
  { score: 8, rgb: { r: 255, g: 245, b: 180 }, desc: "Good - light yellow" },
  { score: 7, rgb: { r: 255, g: 235, b: 160 }, desc: "Fair - yellow" },
  { score: 6, rgb: { r: 255, g: 220, b: 120 }, desc: "Adequate - medium yellow" },
  { score: 5, rgb: { r: 255, g: 200, b: 80 }, desc: "Borderline - dark yellow" },
  { score: 4, rgb: { r: 255, g: 180, b: 50 }, desc: "Mild dehydration - amber" },
  { score: 3, rgb: { r: 200, g: 140, b: 30 }, desc: "Moderate dehydration" },
  { score: 2, rgb: { r: 160, g: 100, b: 20 }, desc: "Severe dehydration - brown" },
  { score: 1, rgb: { r: 120, g: 70, b: 15 }, desc: "Critical - dark brown" }
];

console.log('🧪 PUMA Color Classification Debug\n');

// Test Arduino reading
const arduinoColor = { r: 88, g: 100, b: 77 };
const arduinoLab = rgbToLab(arduinoColor);

console.log(`📊 Arduino Reading: RGB(${arduinoColor.r}, ${arduinoColor.g}, ${arduinoColor.b})`);
console.log(`   LAB: L=${arduinoLab.l.toFixed(2)}, A=${arduinoLab.a.toFixed(2)}, B=${arduinoLab.b.toFixed(2)}\n`);

console.log('🎯 Distance to each cluster:');
let minDistance = Infinity;
let nearestCluster = null;

clusters.forEach(cluster => {
  const clusterLab = rgbToLab(cluster.rgb);
  const distance = calculateColorDistance(arduinoLab, clusterLab);
  
  if (distance < minDistance) {
    minDistance = distance;
    nearestCluster = cluster;
  }
  
  console.log(`   Score ${cluster.score.toString().padStart(2)}: Distance=${distance.toFixed(2)} - ${cluster.desc}`);
});

console.log(`\n🏆 RESULT: Nearest cluster is Score ${nearestCluster.score}`);
console.log(`   Distance: ${minDistance.toFixed(2)}`);
console.log(`   Description: ${nearestCluster.desc}`);

console.log('\n🤔 ANALYSIS:');
console.log(`   Your Arduino RGB(88,100,77) is a dark greenish color`);
console.log(`   This doesn't match any typical urine colors in the clusters`);
console.log(`   All clusters are yellow/brown variations`);
console.log(`   Your sensor might be reading ambient light or needs calibration`);

// Calculate confidence
const maxDistance = 100;
const normalizedDistance = Math.min(minDistance / maxDistance, 1);
const confidence = 1 / (1 + Math.exp(10 * (normalizedDistance - 0.5)));

console.log(`\n📈 Confidence: ${(confidence * 100).toFixed(1)}%`);
console.log(`   (Based on distance of ${minDistance.toFixed(2)} vs max expected ${maxDistance})`);