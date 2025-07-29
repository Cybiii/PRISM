import { kmeans } from 'ml-kmeans';
import { RGBColor, LABColor, ColorCluster } from '../types';
import { logger } from '../utils/logger';

export class ColorClassificationService {
  private clusters: ColorCluster[] = [];
  private initialized = false;

  async initialize(): Promise<void> {
    try {
      // Clusters will be loaded from database in the main app
      this.initialized = true;
      logger.info('Color classification service initialized');
    } catch (error) {
      logger.error('Color classification initialization failed:', error);
      throw error;
    }
  }

  setClusters(clusters: ColorCluster[]): void {
    this.clusters = clusters.sort((a, b) => a.score - b.score);
    logger.info(`Updated color clusters: ${clusters.length} clusters loaded`);
  }

  /**
   * Convert RGB color to LAB color space for better perceptual uniformity
   */
  rgbToLab(rgb: RGBColor): LABColor {
    // First convert RGB to XYZ
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

    return { l, a, b: bVal };
  }

  /**
   * Calculate Euclidean distance between two LAB colors
   */
  calculateColorDistance(color1: LABColor, color2: LABColor): number {
    const deltaE = Math.sqrt(
      Math.pow(color1.l - color2.l, 2) +
      Math.pow(color1.a - color2.a, 2) +
      Math.pow(color1.b - color2.b, 2)
    );
    return deltaE;
  }

  /**
   * Classify a color into a health score (1-10) based on nearest cluster
   */
  classifyColor(rgb: RGBColor): { score: number; confidence: number; lab: LABColor } {
    if (!this.initialized || this.clusters.length === 0) {
      throw new Error('Color classification service not properly initialized');
    }

    const lab = this.rgbToLab(rgb);
    let nearestCluster = this.clusters[0];
    let minDistance = this.calculateColorDistance(lab, nearestCluster.centroid);

    // Find the nearest cluster
    for (const cluster of this.clusters) {
      const distance = this.calculateColorDistance(lab, cluster.centroid);
      if (distance < minDistance) {
        minDistance = distance;
        nearestCluster = cluster;
      }
    }

    // Calculate confidence based on distance (closer = higher confidence)
    // Using a sigmoid function to map distance to confidence (0-1)
    const maxDistance = 100; // Maximum expected Delta E distance
    const normalizedDistance = Math.min(minDistance / maxDistance, 1);
    const confidence = 1 / (1 + Math.exp(10 * (normalizedDistance - 0.5)));

    logger.debug(`Color classification: RGB(${rgb.r},${rgb.g},${rgb.b}) -> Score ${nearestCluster.score}, Distance: ${minDistance.toFixed(2)}, Confidence: ${confidence.toFixed(3)}`);

    return {
      score: nearestCluster.score,
      confidence,
      lab
    };
  }

  /**
   * Update cluster centroids based on new training data
   * This could be used for adaptive learning based on user feedback
   */
  async updateClustersWithNewData(trainingData: { lab: LABColor; score: number }[]): Promise<ColorCluster[]> {
    if (trainingData.length === 0) {
      return this.clusters;
    }

    // Group training data by score
    const scoreGroups: { [score: number]: LABColor[] } = {};
    for (const data of trainingData) {
      if (!scoreGroups[data.score]) {
        scoreGroups[data.score] = [];
      }
      scoreGroups[data.score].push(data.lab);
    }

    // Update centroids for scores with new data
    const updatedClusters = this.clusters.map(cluster => {
      const newData = scoreGroups[cluster.score];
      if (!newData || newData.length === 0) {
        return cluster;
      }

      // Calculate new centroid as weighted average
      const totalSamples = cluster.sampleCount + newData.length;
      const weight1 = cluster.sampleCount / totalSamples;
      const weight2 = newData.length / totalSamples;

      // Calculate average of new data points
      const avgNewData = newData.reduce(
        (acc, lab) => ({
          l: acc.l + lab.l / newData.length,
          a: acc.a + lab.a / newData.length,
          b: acc.b + lab.b / newData.length
        }),
        { l: 0, a: 0, b: 0 }
      );

      // Update centroid with weighted average
      const newCentroid: LABColor = {
        l: cluster.centroid.l * weight1 + avgNewData.l * weight2,
        a: cluster.centroid.a * weight1 + avgNewData.a * weight2,
        b: cluster.centroid.b * weight1 + avgNewData.b * weight2
      };

      return {
        ...cluster,
        centroid: newCentroid,
        sampleCount: totalSamples,
        lastUpdated: new Date()
      };
    });

    this.clusters = updatedClusters;
    logger.info(`Updated ${Object.keys(scoreGroups).length} clusters with ${trainingData.length} new data points`);

    return updatedClusters;
  }

  /**
   * Generate color recommendations based on current score
   */
  getHealthRecommendations(score: number): string[] {
    const recommendations: { [key: number]: string[] } = {
      1: ["Excellent hydration! Keep up the good work."],
      2: ["Very good hydration level."],
      3: ["Good hydration. Continue drinking water regularly."],
      4: ["Adequate hydration. Consider increasing water intake slightly."],
      5: ["Fair hydration. Increase water consumption."],
      6: ["Getting dehydrated. Drink more water throughout the day."],
      7: ["Concerning dehydration. Increase fluid intake immediately."],
      8: ["Severely dehydrated. Seek medical attention if symptoms persist.", "Drink water immediately and monitor closely."],
      9: ["Critical dehydration or possible medical condition.", "Consult healthcare provider immediately."],
      10: ["Emergency: Severe dehydration or medical condition.", "Seek immediate medical attention."]
    };

    return recommendations[score] || ["Consult healthcare provider for interpretation."];
  }

  getClusters(): ColorCluster[] {
    return [...this.clusters];
  }

  isInitialized(): boolean {
    return this.initialized && this.clusters.length > 0;
  }
} 