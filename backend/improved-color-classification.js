// Improved K-Means Color Classification System
const { kmeans } = require('ml-kmeans');

class ImprovedColorClassificationService {
  constructor() {
    this.clusters = [];
    this.initialized = false;
  }

  // Convert RGB to feature vector for k-means
  rgbToFeatureVector(rgb) {
    // Normalize RGB to 0-1 range
    return [rgb.r / 255.0, rgb.g / 255.0, rgb.b / 255.0];
  }

  // Train k-means with actual data samples
  async trainWithRealData(colorSamples) {
    console.log('🤖 Training K-Means with real color data...');
    
    // Convert RGB samples to feature vectors
    const data = colorSamples.map(sample => this.rgbToFeatureVector(sample.rgb));
    const labels = colorSamples.map(sample => sample.healthScore);
    
    // Perform k-means clustering
    const k = 10; // 10 health score levels
    const result = kmeans(data, k, {
      initialization: 'kmeans++',
      maxIterations: 100
    });
    
    console.log(`✅ K-Means clustering completed with ${k} clusters`);
    console.log(`📊 Centroids:`, result.centroids);
    
    return result;
  }

  // Classify color using trained k-means model
  classifyColorWithKMeans(rgb, trainedModel) {
    const featureVector = this.rgbToFeatureVector(rgb);
    
    // Find nearest centroid
    let minDistance = Infinity;
    let nearestCluster = 0;
    
    trainedModel.centroids.forEach((centroid, index) => {
      const distance = this.euclideanDistance(featureVector, centroid);
      if (distance < minDistance) {
        minDistance = distance;
        nearestCluster = index;
      }
    });
    
    // Map cluster to health score (1-10)
    const healthScore = 10 - nearestCluster; // Invert if needed
    
    return {
      score: healthScore,
      confidence: 1 / (1 + minDistance),
      clusterIndex: nearestCluster,
      distance: minDistance
    };
  }

  euclideanDistance(vec1, vec2) {
    return Math.sqrt(
      vec1.reduce((sum, val, i) => sum + Math.pow(val - vec2[i], 2), 0)
    );
  }

  // Adaptive clustering - retrain with new data
  async adaptiveLearning(newSamples, existingModel) {
    console.log('🧠 Performing adaptive learning...');
    
    // Combine existing centroids with new samples
    const combinedData = [
      ...existingModel.centroids,
      ...newSamples.map(s => this.rgbToFeatureVector(s.rgb))
    ];
    
    // Re-cluster with combined data
    const updatedModel = kmeans(combinedData, 10, {
      initialization: 'kmeans++',
      maxIterations: 50
    });
    
    console.log('✅ Model updated with new data');
    return updatedModel;
  }

  // Better calibration system
  calibrateWithKnownSamples() {
    console.log('🎯 Calibrating with known health samples...');
    
    // Define known good samples for different health levels
    const knownSamples = [
      // Excellent hydration (Score 10)
      { rgb: { r: 255, g: 255, b: 230 }, healthScore: 10, description: 'Clear/very pale' },
      { rgb: { r: 250, g: 250, b: 235 }, healthScore: 10, description: 'Nearly clear' },
      
      // Good hydration (Score 8-9)
      { rgb: { r: 255, g: 245, b: 180 }, healthScore: 9, description: 'Light yellow' },
      { rgb: { r: 255, g: 240, b: 160 }, healthScore: 8, description: 'Pale yellow' },
      
      // Fair hydration (Score 6-7)
      { rgb: { r: 255, g: 220, b: 120 }, healthScore: 7, description: 'Medium yellow' },
      { rgb: { r: 255, g: 200, b: 100 }, healthScore: 6, description: 'Yellow' },
      
      // Poor hydration (Score 3-5)
      { rgb: { r: 255, g: 180, b: 60 }, healthScore: 5, description: 'Dark yellow' },
      { rgb: { r: 220, g: 160, b: 40 }, healthScore: 4, description: 'Amber' },
      { rgb: { r: 200, g: 140, b: 30 }, healthScore: 3, description: 'Dark amber' },
      
      // Critical (Score 1-2)
      { rgb: { r: 160, g: 100, b: 20 }, healthScore: 2, description: 'Brown' },
      { rgb: { r: 120, g: 70, b: 15 }, healthScore: 1, description: 'Dark brown' }
    ];
    
    return knownSamples;
  }

  // Handle unusual colors (like your greenish reading)
  handleUnusualColors(rgb) {
    const { r, g, b } = rgb;
    
    // Check if color is outside expected urine color range
    const isGreenish = g > r && g > b;
    const isDarkOverall = (r + g + b) / 3 < 120;
    const isBlueish = b > r && b > g;
    
    if (isGreenish || isBlueish) {
      console.log('⚠️ Unusual color detected - possible sensor calibration issue');
      return {
        score: null,
        confidence: 0,
        warning: 'Sensor may need calibration - unusual color detected',
        suggestedAction: 'Check lighting conditions and sensor positioning'
      };
    }
    
    return null;
  }
}

// Test with your actual data
const service = new ImprovedColorClassificationService();
const testRgb = { r: 88, g: 100, b: 77 };

console.log('🧪 Testing Improved Color Classification\n');
console.log(`📊 Input: RGB(${testRgb.r}, ${testRgb.g}, ${testRgb.b})`);

// Check for unusual colors first
const unusualCheck = service.handleUnusualColors(testRgb);
if (unusualCheck) {
  console.log('⚠️ UNUSUAL COLOR DETECTED');
  console.log(`   Warning: ${unusualCheck.warning}`);
  console.log(`   Action: ${unusualCheck.suggestedAction}`);
} else {
  console.log('✅ Color appears to be in normal range');
}

// Show calibration samples
const knownSamples = service.calibrateWithKnownSamples();
console.log('\n📋 Known Calibration Samples:');
knownSamples.forEach(sample => {
  console.log(`   Score ${sample.healthScore}: RGB(${sample.rgb.r},${sample.rgb.g},${sample.rgb.b}) - ${sample.description}`);
});

console.log('\n💡 RECOMMENDATIONS:');
console.log('1. Calibrate your TCS34725 sensor with known color samples');
console.log('2. Implement proper lighting conditions (consistent white light)');
console.log('3. Add white paper reference for calibration');
console.log('4. Consider environmental factors (ambient light)');
console.log('5. Use the improved k-means implementation for better accuracy');