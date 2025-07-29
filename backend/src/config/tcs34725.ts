/**
 * TCS34725 Color Sensor Configuration
 * Adafruit TCS34725 RGB Color Sensor with IR filter and White LED
 */

export interface TCS34725Config {
  // Integration time settings (affects sensitivity and speed)
  integrationTime: 'INTEGRATIONTIME_2_4MS' | 'INTEGRATIONTIME_24MS' | 'INTEGRATIONTIME_50MS' | 'INTEGRATIONTIME_101MS' | 'INTEGRATIONTIME_154MS' | 'INTEGRATIONTIME_700MS';
  
  // Gain settings (amplifies signal)
  gain: 'GAIN_1X' | 'GAIN_4X' | 'GAIN_16X' | 'GAIN_60X';
  
  // I2C address (default 0x29)
  i2cAddress: number;
  
  // LED control
  ledEnabled: boolean;
  
  // Calibration settings
  calibration: {
    // White balance calibration values
    whiteBalance: {
      r: number;
      g: number;
      b: number;
      c: number;
    };
    
    // Dark calibration (sensor readings in complete darkness)
    darkCalibration: {
      r: number;
      g: number;
      b: number;
      c: number;
    };
  };
}

// Default TCS34725 configuration optimized for urine color analysis
export const defaultTCS34725Config: TCS34725Config = {
  // Medium integration time for balanced speed/accuracy
  integrationTime: 'INTEGRATIONTIME_154MS',
  
  // Medium gain - adjust based on lighting conditions
  gain: 'GAIN_16X',
  
  // Standard I2C address
  i2cAddress: 0x29,
  
  // Enable LED for consistent lighting
  ledEnabled: true,
  
  calibration: {
    // White balance against white paper or reference white
    whiteBalance: {
      r: 50000,
      g: 55000,
      b: 45000,
      c: 60000
    },
    
    // Dark calibration (cover sensor completely)
    darkCalibration: {
      r: 100,
      g: 120,
      b: 80,
      c: 150
    }
  }
};

// TCS34725 Arduino code constants
export const TCS34725Constants = {
  // Integration time values (for Arduino reference)
  INTEGRATION_TIMES: {
    'INTEGRATIONTIME_2_4MS': 0xFF,  // 2.4ms - fastest
    'INTEGRATIONTIME_24MS': 0xF6,   // 24ms
    'INTEGRATIONTIME_50MS': 0xEB,   // 50ms
    'INTEGRATIONTIME_101MS': 0xD5,  // 101ms
    'INTEGRATIONTIME_154MS': 0xC0,  // 154ms
    'INTEGRATIONTIME_700MS': 0x00   // 700ms - most accurate
  },
  
  // Gain values
  GAINS: {
    'GAIN_1X': 0x00,   // No gain
    'GAIN_4X': 0x01,   // 4x gain
    'GAIN_16X': 0x02,  // 16x gain  
    'GAIN_60X': 0x03   // 60x gain
  },
  
  // Register addresses
  REGISTERS: {
    COMMAND_BIT: 0x80,
    ENABLE: 0x00,
    ATIME: 0x01,
    CONTROL: 0x0F,
    ID: 0x12,
    STATUS: 0x13,
    CDATAL: 0x14,  // Clear data low byte
    CDATAH: 0x15,  // Clear data high byte
    RDATAL: 0x16,  // Red data low byte
    RDATAH: 0x17,  // Red data high byte
    GDATAL: 0x18,  // Green data low byte
    GDATAH: 0x19,  // Green data high byte
    BDATAL: 0x1A,  // Blue data low byte
    BDATAH: 0x1B   // Blue data high byte
  }
};

/**
 * Arduino code template for TCS34725 integration
 */
export const TCS34725ArduinoTemplate = `
/*
 * PUMA TCS34725 Color Sensor Integration
 * Connect TCS34725 to Arduino:
 * - VCC to 3.3V (NOT 5V!)
 * - GND to GND
 * - SDA to A4 (Uno) or SDA pin
 * - SCL to A5 (Uno) or SCL pin
 * - LED pin (optional) to digital pin for LED control
 */

#include <Wire.h>
#include "Adafruit_TCS34725.h"

// Initialize TCS34725 with integration time and gain
Adafruit_TCS34725 tcs = Adafruit_TCS34725(TCS34725_INTEGRATIONTIME_154MS, TCS34725_GAIN_16X);

// pH sensor pin (analog)
#define PH_SENSOR_PIN A0

void setup() {
  Serial.begin(9600);
  
  if (tcs.begin()) {
    Serial.println("TCS34725 sensor found");
  } else {
    Serial.println("No TCS34725 found ... check connections");
    while (1);
  }
}

void loop() {
  uint16_t r, g, b, c;
  float ph;
  
  // Read color data
  tcs.getRawData(&r, &g, &b, &c);
  
  // Read pH sensor
  int phReading = analogRead(PH_SENSOR_PIN);
  ph = map(phReading, 0, 1023, 0, 14); // Convert to pH scale
  
  // Send data in expected format
  Serial.print("PH:");
  Serial.print(ph, 2);
  Serial.print(",R:");
  Serial.print(r);
  Serial.print(",G:");
  Serial.print(g);
  Serial.print(",B:");
  Serial.print(b);
  Serial.print(",C:");
  Serial.println(c);
  
  delay(2000); // 2 second intervals
}
`;

/**
 * Color temperature calculation for TCS34725
 * Useful for ambient light compensation
 */
export function calculateColorTemperature(r: number, g: number, b: number): number {
  // Simplified color temperature calculation
  // Based on McCamy's formula
  const X = (-0.14282 * r + 1.54924 * g + -0.95641 * b) / 1000;
  const Y = (-0.32466 * r + 1.57837 * g + -0.73191 * b) / 1000;
  const Z = (-0.68202 * r + 0.77073 * g + 0.56332 * b) / 1000;
  
  const x = X / (X + Y + Z);
  const y = Y / (X + Y + Z);
  
  const n = (x - 0.3320) / (0.1858 - y);
  const cct = 437 * Math.pow(n, 3) + 3601 * Math.pow(n, 2) + 6861 * n + 5517;
  
  return Math.round(cct);
}

/**
 * Lux calculation for TCS34725
 * Provides ambient light level measurement
 */
export function calculateLux(r: number, g: number, b: number, c: number): number {
  // Approximation formula for lux calculation
  // May need calibration for specific lighting conditions
  const illuminance = (-0.32466 * r + 1.57837 * g + -0.73191 * b);
  return Math.max(0, illuminance);
} 