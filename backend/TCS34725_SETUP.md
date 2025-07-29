# TCS34725 Color Sensor Setup Guide

## 🔬 TCS34725 Integration with PUMA Backend

The TCS34725 is a digital RGB color sensor with I2C interface, perfect for accurate urine color analysis in the PUMA system.

### 📋 Hardware Requirements

- **Adafruit TCS34725 RGB Color Sensor**
- **Arduino Uno/Nano/ESP32**
- **pH Sensor** (analog)
- **Jumper wires**
- **Breadboard** (optional)

### 🔌 Wiring Connections

#### TCS34725 to Arduino

```
TCS34725    Arduino Uno    Arduino Nano    ESP32
--------    -----------    ------------    -----
VCC    →    3.3V          3.3V            3.3V
GND    →    GND           GND             GND
SDA    →    A4            A4              GPIO21
SCL    →    A5            A5              GPIO22
LED    →    D2 (optional) D2 (optional)   GPIO2
```

⚠️ **Important**: Use 3.3V power, NOT 5V! The TCS34725 is a 3.3V device.

#### pH Sensor to Arduino

```
pH Sensor   Arduino
---------   -------
VCC    →    5V
GND    →    GND
OUT    →    A0
```

### 💻 Arduino Code

Use this code on your Arduino to interface with the PUMA backend:

```cpp
#include <Wire.h>
#include "Adafruit_TCS34725.h"

// TCS34725 with 154ms integration time and 16x gain
Adafruit_TCS34725 tcs = Adafruit_TCS34725(TCS34725_INTEGRATIONTIME_154MS, TCS34725_GAIN_16X);

#define PH_SENSOR_PIN A0

void setup() {
  Serial.begin(9600);

  if (tcs.begin()) {
    Serial.println("TCS34725 found");
  } else {
    Serial.println("TCS34725 NOT found");
    while(1);
  }
}

void loop() {
  uint16_t r, g, b, c;
  float ph;

  // Read color sensor (16-bit values)
  tcs.getRawData(&r, &g, &b, &c);

  // Read pH sensor
  int phRaw = analogRead(PH_SENSOR_PIN);
  ph = map(phRaw, 0, 1023, 0.0, 14.0);

  // Send to PUMA backend
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

  delay(2000);
}
```

### 📊 Data Format

The PUMA backend expects TCS34725 data in this format:

**Serial Format:**

```
PH:7.2,R:45123,G:50234,B:20156,C:55000
```

**JSON Format (alternative):**

```json
{ "ph": 7.2, "r": 45123, "g": 50234, "b": 20156, "c": 55000 }
```

### ⚙️ Sensor Configuration

#### Integration Time Options

| Setting | Duration        | Use Case                |
| ------- | --------------- | ----------------------- |
| 2.4ms   | Fastest         | High frequency sampling |
| 154ms   | **Recommended** | Balanced accuracy/speed |
| 700ms   | Slowest         | Maximum accuracy        |

#### Gain Settings

| Gain | Multiplier      | Use Case             |
| ---- | --------------- | -------------------- |
| 1x   | No gain         | Bright conditions    |
| 16x  | **Recommended** | Normal conditions    |
| 60x  | High gain       | Low light conditions |

### 🎯 Calibration Process

#### 1. White Balance Calibration

```cpp
// Point sensor at white reference (white paper)
uint16_t r, g, b, c;
tcs.getRawData(&r, &g, &b, &c);
// Record these values as white balance reference
```

#### 2. Dark Calibration

```cpp
// Cover sensor completely (block all light)
uint16_t r, g, b, c;
tcs.getRawData(&r, &g, &b, &c);
// Record these values as dark reference
```

### 🔧 Backend Configuration

The PUMA backend automatically handles TCS34725 data:

✅ **16-bit to 8-bit conversion** for consistent processing  
✅ **Clear channel normalization** for lighting compensation  
✅ **Range validation** and error handling  
✅ **Mock data generation** for development without hardware

### 📈 Expected Values

#### Healthy Urine Colors (TCS34725 16-bit values)

| Color         | R Value     | G Value     | B Value     | Health Score     |
| ------------- | ----------- | ----------- | ----------- | ---------------- |
| Pale Yellow   | 45000-50000 | 50000-55000 | 20000-25000 | 1-2 (Excellent)  |
| Normal Yellow | 40000-45000 | 45000-50000 | 15000-20000 | 3-4 (Good)       |
| Dark Yellow   | 35000-40000 | 38000-43000 | 12000-17000 | 5-6 (Fair)       |
| Amber         | 30000-35000 | 32000-37000 | 8000-13000  | 7-8 (Concerning) |
| Dark Brown    | 25000-30000 | 20000-25000 | 5000-10000  | 9-10 (Critical)  |

### 🛠️ Troubleshooting

#### Common Issues

**"TCS34725 NOT found"**

- Check 3.3V power (not 5V!)
- Verify I2C connections (SDA/SCL)
- Try different I2C address: `tcs.begin(0x29)`

**Inconsistent readings**

- Shield from ambient light
- Ensure stable positioning
- Allow sensor warm-up time
- Check for loose connections

**Very low/high values**

- Adjust gain setting
- Change integration time
- Verify lighting conditions
- Recalibrate white balance

#### Serial Communication Issues

- Check baud rate (9600)
- Verify COM port in backend config
- Enable development mode for mock data
- Check Arduino IDE Serial Monitor first

### 📝 Advanced Features

#### Ambient Light Compensation

The backend calculates color temperature and lux values for environmental compensation.

#### Multiple Sensor Support

Configure multiple TCS34725 sensors with different I2C addresses for redundancy.

#### Real-time Calibration

The system can adapt color clusters based on environmental conditions.

### 🔗 Resources

- [Adafruit TCS34725 Guide](https://learn.adafruit.com/adafruit-color-sensors)
- [TCS34725 Datasheet](https://cdn-shop.adafruit.com/datasheets/TCS34725.pdf)
- [Arduino I2C Scanner](https://playground.arduino.cc/Main/I2cScanner/)

---

**For support, check the PUMA backend logs or enable debug mode in the Arduino code.**
