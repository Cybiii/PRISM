/*
 * PUMA TCS34725 Color Sensor Integration
 * Photosensitive Urinary Monitoring Apparatus
 * 
 * Hardware connections:
 * TCS34725 -> Arduino Uno
 * VCC -> 3.3V (NOT 5V!)
 * GND -> GND
 * SDA -> A4
 * SCL -> A5
 * 
 * pH Sensor -> Arduino Uno
 * VCC -> 5V
 * GND -> GND
 * OUT -> A0
 */

#include <Wire.h>
#include "Adafruit_TCS34725.h"

// Initialize TCS34725 with integration time and gain
// TCS34725_INTEGRATIONTIME_154MS: Balanced speed and accuracy
// TCS34725_GAIN_16X: Good for normal lighting conditions
Adafruit_TCS34725 tcs = Adafruit_TCS34725(TCS34725_INTEGRATIONTIME_154MS, TCS34725_GAIN_16X);

// pH sensor pin (analog)
#define PH_SENSOR_PIN A0
#define LED_PIN 13  // Built-in LED to show activity

// Variables for pH calibration (adjust these based on your sensor)
float PH_NEUTRAL_VOLTAGE = 2.5;  // Voltage at pH 7
float PH_ACID_VOLTAGE = 2.032;   // Voltage at pH 4

void setup() {
  Serial.begin(9600);
  pinMode(LED_PIN, OUTPUT);
  
  // Flash LED to show startup
  for(int i = 0; i < 3; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(200);
    digitalWrite(LED_PIN, LOW);
    delay(200);
  }
  
  Serial.println("PUMA TCS34725 Color Sensor Starting...");
  
  if (tcs.begin()) {
    Serial.println("TCS34725 sensor found and initialized");
    
    // Flash LED twice to confirm sensor found
    for(int i = 0; i < 2; i++) {
      digitalWrite(LED_PIN, HIGH);
      delay(500);
      digitalWrite(LED_PIN, LOW);
      delay(500);
    }
  } else {
    Serial.println("ERROR: No TCS34725 found! Check connections:");
    Serial.println("- VCC to 3.3V (NOT 5V!)");
    Serial.println("- GND to GND");
    Serial.println("- SDA to A4");
    Serial.println("- SCL to A5");
    
    // Flash LED rapidly to show error
    while (1) {
      digitalWrite(LED_PIN, HIGH);
      delay(100);
      digitalWrite(LED_PIN, LOW);
      delay(100);
    }
  }
  
  delay(1000); // Allow sensor to stabilize
  Serial.println("Ready to send data to PUMA backend...");
}

void loop() {
  uint16_t r, g, b, c;
  float ph;
  
  // Flash LED briefly to show activity
  digitalWrite(LED_PIN, HIGH);
  
  // Read color data from TCS34725 (16-bit values)
  tcs.getRawData(&r, &g, &b, &c);
  
  // Read pH sensor
  ph = readPH();
  
  // Send data in PUMA backend expected format
  Serial.print("PH:");
  Serial.print(ph, 2);        // 2 decimal places
  Serial.print(",R:");
  Serial.print(r);            // 16-bit red value
  Serial.print(",G:");
  Serial.print(g);            // 16-bit green value
  Serial.print(",B:");
  Serial.print(b);            // 16-bit blue value
  Serial.print(",C:");
  Serial.println(c);          // 16-bit clear value
  
  digitalWrite(LED_PIN, LOW);
  
  // Wait 2 seconds before next reading
  delay(2000);
}

float readPH() {
  // Read multiple samples for stability
  long sum = 0;
  for(int i = 0; i < 10; i++) {
    sum += analogRead(PH_SENSOR_PIN);
    delay(10);
  }
  
  float avgReading = sum / 10.0;
  float voltage = (avgReading * 5.0) / 1024.0;  // Convert to voltage
  
  // Convert voltage to pH using linear approximation
  // This is a basic calibration - you may need to adjust for your specific sensor
  float ph;
  if (voltage > PH_NEUTRAL_VOLTAGE) {
    // Basic range (pH > 7)
    ph = 7.0 - ((voltage - PH_NEUTRAL_VOLTAGE) / 0.18);
  } else {
    // Acidic range (pH < 7)  
    ph = 7.0 + ((PH_NEUTRAL_VOLTAGE - voltage) / 0.18);
  }
  
  // Constrain pH to realistic range
  ph = constrain(ph, 0.0, 14.0);
  
  return ph;
}

// Alternative: Simulate pH if no sensor connected
float simulatePH() {
  // Generate realistic urine pH values (4.5 - 8.5)
  static float basePH = 6.5;
  static long lastChange = 0;
  
  // Slowly drift pH value for realistic simulation
  if (millis() - lastChange > 10000) {  // Change every 10 seconds
    basePH += random(-20, 21) / 100.0;  // ±0.2 pH change
    basePH = constrain(basePH, 4.5, 8.5);
    lastChange = millis();
  }
  
  // Add small random variation
  float ph = basePH + random(-5, 6) / 100.0;  // ±0.05 variation
  return constrain(ph, 4.5, 8.5);
}

/*
 * Alternative data formats (uncomment if needed):
 * 
 * JSON format:
 * Serial.print("{\"ph\":");
 * Serial.print(ph, 2);
 * Serial.print(",\"r\":");
 * Serial.print(r);
 * Serial.print(",\"g\":");
 * Serial.print(g);
 * Serial.print(",\"b\":");
 * Serial.print(b);
 * Serial.print(",\"c\":");
 * Serial.print(c);
 * Serial.println("}");
 */ 