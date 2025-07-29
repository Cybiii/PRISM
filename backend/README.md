# PUMA Backend

**Photosensitive Urinary Monitoring Apparatus - Backend API**

A Node.js/TypeScript backend system that processes real-time data from Arduino sensors to monitor urine pH and color for health analysis.

## 🔬 System Overview

The PUMA backend receives data from Arduino via serial communication and uses machine learning to classify urine color into health scores (1-10 scale).

### Key Features

- **Real-time Data Processing**: Arduino serial communication with automatic reconnection
- **pH Averaging**: 10-second rolling average for stable pH readings
- **K-Means Color Classification**: ML-based color scoring (1=excellent, 10=critical)
- **WebSocket Real-time Updates**: Live data streaming to frontend
- **SQLite Database**: Persistent storage of readings and clusters
- **Health Alerts**: Automatic notifications for concerning readings
- **REST API**: Comprehensive endpoints for data access and analytics

## 🏗️ Architecture

```
Arduino → Serial/I2C → Backend → Processing → Database
                        ↓
Frontend ← WebSocket ← API Endpoints ← ML Classification
```

### Core Services

1. **SerialService**: Arduino communication and data parsing
2. **DataProcessingService**: pH buffering and data coordination
3. **ColorClassificationService**: K-means clustering for color scoring
4. **DatabaseService**: SQLite operations and data persistence

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Arduino connected via USB (or mock data for development)

### Installation

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Start development server
npm run dev

# Or start production server
npm start
```

### Environment Configuration

Create a `.env` file:

```env
# Server Configuration
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Arduino/Serial Configuration
ARDUINO_PORT=COM3
ARDUINO_BAUD_RATE=9600
ARDUINO_AUTO_DETECT=true

# Development Settings
ENABLE_MOCK_DATA=true
```

## 📊 Arduino Data Format

The backend expects Arduino data in one of these formats:

**Key-Value Format:**

```
PH:7.2,R:255,G:200,B:100
```

**JSON Format:**

```json
{ "ph": 7.2, "r": 255, "g": 200, "b": 100 }
```

### Data Validation

- **pH Range**: 0-14 (values outside this range are rejected)
- **RGB Range**: 0-255 for each color component
- **Frequency**: Accepts data every 100ms or slower

## 🎯 Health Scoring System

### Color Classification (1-10 Scale)

| Score | Description | Color Range           | Health Status           |
| ----- | ----------- | --------------------- | ----------------------- |
| 1-2   | Excellent   | Very pale/pale yellow | Optimal hydration       |
| 3-4   | Good        | Light/normal yellow   | Good hydration          |
| 5-6   | Fair        | Dark yellow/amber     | Mild dehydration        |
| 7-8   | Concerning  | Dark amber/orange     | Significant dehydration |
| 9-10  | Critical    | Brown/red tones       | Severe condition        |

### pH Analysis

- **Normal Range**: 4.5-8.5
- **Averaging**: 10-second rolling window
- **Alerts**: Triggered for values < 4.5 or > 8.5

## 🔧 API Endpoints

### Health & Status

- `GET /health` - System health check
- `GET /api/status` - Detailed system status

### Data Retrieval

- `GET /api/readings/latest` - Most recent reading
- `GET /api/readings?limit=100&offset=0` - Paginated readings
- `GET /api/readings/range?start=2024-01-01&end=2024-01-02` - Date range query

### Analytics

- `GET /api/analytics?days=7` - Analytics for specified days
- `GET /api/ph/buffer` - Current pH buffer statistics
- `GET /api/clusters` - Color classification clusters

### Recommendations

- `GET /api/recommendations/:score` - Health recommendations for score

### Testing & Administration

- `POST /api/simulate` - Simulate reading (development)
- `POST /api/clusters/retrain` - Retrain color clusters

## 🔌 WebSocket Events

### Client → Server

- `requestLatestData` - Request latest reading

### Server → Client

- `newReading` - New processed reading with recommendations
- `healthAlert` - Health concern notifications
- `clustersUpdated` - Updated ML clusters

## 🗄️ Database Schema

### Readings Table

```sql
CREATE TABLE readings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp DATETIME NOT NULL,
  ph_value REAL NOT NULL,
  color_r INTEGER NOT NULL,
  color_g INTEGER NOT NULL,
  color_b INTEGER NOT NULL,
  color_l REAL NOT NULL,     -- LAB color space
  color_a REAL NOT NULL,
  color_b_val REAL NOT NULL,
  color_score INTEGER NOT NULL,
  device_id TEXT,
  processed BOOLEAN DEFAULT 0
);
```

### Color Clusters Table

```sql
CREATE TABLE color_clusters (
  id INTEGER PRIMARY KEY,
  score INTEGER NOT NULL UNIQUE,
  centroid_l REAL NOT NULL,
  centroid_a REAL NOT NULL,
  centroid_b REAL NOT NULL,
  sample_count INTEGER DEFAULT 0,
  description TEXT NOT NULL,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 🧠 Machine Learning

### K-Means Color Classification

1. **Color Space Conversion**: RGB → LAB for perceptual uniformity
2. **Distance Calculation**: Euclidean distance in LAB space
3. **Cluster Assignment**: Nearest centroid classification
4. **Confidence Scoring**: Distance-based confidence metrics
5. **Adaptive Learning**: Optional cluster updates with new data

### Default Clusters

The system initializes with 10 predefined color clusters representing the health spectrum from excellent (pale yellow) to critical (dark brown/red).

## 🚨 Health Alerts

### Automatic Triggers

- **pH Alerts**: < 4.5 (very acidic) or > 8.5 (very alkaline)
- **Color Alerts**: Score ≥ 6 (concerning) or ≥ 8 (critical)
- **Confidence Alerts**: < 0.5 (poor sensor readings)

### Alert Format

```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "alerts": ["Critical dehydration detected..."],
  "data": {
    "ph": 6.8,
    "colorScore": 8,
    "confidence": 0.85
  }
}
```

## 🔧 Development

### Scripts

```bash
npm run dev      # Development with hot reload
npm run build    # TypeScript compilation
npm start        # Production server
npm test         # Run tests
```

### Mock Data

In development mode, the system generates realistic mock data if Arduino connection fails:

- pH: 5.5-8.5 range
- Colors: Yellow-ish spectrum
- Frequency: Every 2 seconds

### Logging

Comprehensive logging with Winston:

- Console output (colorized)
- File logging (`logs/combined.log`, `logs/error.log`)
- Configurable log levels

## 🛠️ Troubleshooting

### Arduino Connection Issues

1. **Port Detection**: Enable `ARDUINO_AUTO_DETECT=true`
2. **Manual Port**: Set `ARDUINO_PORT=COM3` (Windows) or `/dev/ttyUSB0` (Linux)
3. **Baud Rate**: Ensure Arduino and backend match (`ARDUINO_BAUD_RATE=9600`)

### Common Issues

- **Build Errors**: Ensure all dependencies installed (`npm install`)
- **Database Issues**: Check write permissions in `data/` directory
- **Port Conflicts**: Change `PORT` in environment variables

## 📈 Performance

### Optimizations

- **Database Indexing**: Timestamp and score indexes for fast queries
- **Buffer Management**: Efficient pH rolling window with automatic cleanup
- **Connection Pooling**: SQLite with proper connection management
- **Real-time Processing**: Minimal latency for live updates

### Scalability

- **Concurrent Connections**: Handles multiple WebSocket clients
- **Data Retention**: Configurable cleanup of old readings
- **Cluster Updates**: Batch processing for ML retraining

## 🔒 Security Considerations

- **Input Validation**: All Arduino data validated before processing
- **SQL Injection**: Parameterized queries throughout
- **CORS Configuration**: Restricted to frontend domain
- **Rate Limiting**: Consider implementing for production

## 📝 License

MIT License - See LICENSE file for details.

---

**PUMA Team** - Advancing healthcare through innovative IoT monitoring solutions.
