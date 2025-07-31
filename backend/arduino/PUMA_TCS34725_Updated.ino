#include <Wire.h>
#include "Adafruit_TCS34725.h"

// ----- Color Sensor -----
Adafruit_TCS34725 tcs = Adafruit_TCS34725(TCS34725_INTEGRATIONTIME_614MS, TCS34725_GAIN_1X);

// ----- pH Sensor -----
const int pH_pin = A0;
float voltage;
float pH;

// Calibration variables for pH sensor
float neutralVoltage = 3.392;  // Voltage measured in tap water (pH ~7)
float slope = 0.18;            // Voltage change per pH (adjust if needed)

void setup() {
  Serial.begin(9600);

  // Initialize TCS34725
  if (!tcs.begin()) {
    Serial.println("No TCS34725 found ... check your connections");
    while (1);
  }

  Serial.println("Starting PUMA urine analysis system...");
  delay(1000);
}

void loop() {
  // ===== COLOR SENSOR READING =====
  uint16_t r, g, b, c;
  tcs.getRawData(&r, &g, &b, &c);

  // Convert to 8-bit RGB values for K-means analysis
  float R = (float)r / c * 255.0;
  float G = (float)g / c * 255.0;
  float B = (float)b / c * 255.0;
  
  // Ensure values are within 0-255 range
  int rgb_r = constrain((int)R, 0, 255);
  int rgb_g = constrain((int)G, 0, 255);
  int rgb_b = constrain((int)B, 0, 255);

  // Calculate HSV for hydration status
  float h, s, v;
  RGBtoHSV(R, G, B, &h, &s, &v);
  String hydration = getHydrationStatus(h, s);

  // ===== PH SENSOR READING =====
  int rawValue = analogRead(pH_pin);
  voltage = rawValue * (5.0 / 1023.0);  // Convert ADC to voltage
  pH = 7 + ((neutralVoltage - voltage) / slope);  // Calibrated pH formula

  // ===== OUTPUT FOR PUMA BACKEND =====
  // Format: "Hydration: [status] | Raw ADC: [value] | Voltage: [value] V | pH: [value] | RGB: [r],[g],[b]"
  Serial.print("Hydration: ");
  Serial.print(hydration);
  Serial.print(" | Raw ADC: ");
  Serial.print(rawValue);
  Serial.print(" | Voltage: ");
  Serial.print(voltage, 3);
  Serial.print(" V | pH: ");
  Serial.print(pH, 2);
  Serial.print(" | RGB: ");
  Serial.print(rgb_r);
  Serial.print(",");
  Serial.print(rgb_g);
  Serial.print(",");
  Serial.println(rgb_b);

  delay(1000);
}

// ------------------- FUNCTIONS -------------------
void RGBtoHSV(float r, float g, float b, float *h, float *s, float *v) {
  r /= 255.0; g /= 255.0; b /= 255.0;
  float maxVal = max(r, max(g, b));
  float minVal = min(r, min(g, b));
  float delta = maxVal - minVal;
  *v = maxVal;

  if (delta == 0) { *h = 0; *s = 0; return; }
  *s = delta / maxVal;

  if (maxVal == r)      *h = 60 * fmod(((g - b) / delta), 6);
  else if (maxVal == g) *h = 60 * (((b - r) / delta) + 2);
  else                  *h = 60 * (((r - g) / delta) + 4);

  if (*h < 0) *h += 360;
}

String getHydrationStatus(float h, float s) {
  s *= 100; // convert to %
  if (h > 50 && s < 20) return "Over Hydrated";
  if (h > 50 && s < 35) return "Good";
  if (h > 48 && s < 50) return "Fair";
  if (h > 45 && s < 65) return "Light Dehydrated";
  if (h > 38 && s < 75) return "Dehydrated";
  if (h > 33 && s < 85) return "Very Dehydrated";
  return "Severe Dehydrated";
}