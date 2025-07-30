# PUMA - Photosensitive Urinary Monitoring Apparatus

## Overview

PUMA (Photosensitive Urinary Monitoring Apparatus) is an innovative health monitoring system that analyzes color and pH levels of urine to provide real-time health insights. The system uses the TCS34725 color sensor and pH sensors connected to Arduino, with a Node.js backend for data processing and a Next.js frontend for visualization.

# Contributors:

- **Design Assistant**: [Sebastian Silva](https://github.com/Cybiii)
- **Fullstack development**: [Nathan Tam](https://github.com/nathandtam)
- **Hardware/Electrical Engineering**: Edmond Ter Pogosyan
- **Technical Research & Analysis**: Anchita Ganesh
- **CAD Modeling & Prototyping**: Ernesto Tellez Perez & Connor McVicker


### Key Health Indicators

- **pH Levels**: Monitor acidity/alkalinity (normal range: 4.5-8.5)
- **Color Analysis**: 10-point health scale (1=excellent, 10=critical)
- **Hydration Status**: Real-time dehydration detection
- **Health Alerts**: Automatic notifications for concerning readings

## Features

### **Core Functionality**

- **Real-time Monitoring**: Continuous sensor data collection
- **Machine Learning**: K-means clustering for color classification
- **pH Averaging**: 10-second rolling buffer for stable readings
- **Health Scoring**: 1-10 scale based on color analysis
- **Alert System**: Automatic health concern notifications

### **Web Platform**

- **Live Dashboard**: Real-time data visualization
- **Historical Analysis**: Trend tracking and analytics
- **WebSocket Updates**: Instant data streaming
- **Responsive Design**: Mobile and desktop compatible
- **Health Recommendations**: Personalized advice based on readings

### **Technical Features**

- **TCS34725 Integration**: 16-bit color sensor support
- **Serial Communication**: Arduino to backend data flow
- **SQLite Database**: Persistent data storage
- **REST API**: Comprehensive data access endpoints
- **TypeScript**: Type-safe development
- **Docker Ready**: Containerized deployment

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│                 │    │                 │    │                 │
│    Hardware     │    │    Backend      │    │    Frontend     │
│                 │    │                 │    │                 │
│  Arduino Uno    │    │  Node.js API    │    │   Next.js Web   │
│  TCS34725       │───▶│  TypeScript     │───▶│   React App     │
│  pH Sensor      │    │  SQLite DB      │    │   Tailwind CSS  │
│                 │    │  WebSocket      │    │   Real-time UI  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
       ↓                       ↓                       ↓
   Serial USB              Port 3001               Port 3000
```

### Data Flow

1. **Arduino** reads TCS34725 color sensor and pH sensor
2. **Serial Communication** sends data to backend via USB
3. **Backend Processing** averages pH, classifies color, stores data
4. **Machine Learning** analyzes color using K-means clustering
5. **WebSocket Streaming** pushes real-time updates to frontend
6. **Dashboard Display** shows live health metrics and trends

## Quick Start

### Prerequisites

- **Node.js 18+** and npm/pnpm
- **Arduino IDE** for hardware programming
- **TCS34725 Color Sensor** and pH sensor (optional for development)

### 1. Clone Repository

```bash
git clone https://github.com/your-username/PUMA.git
cd PUMA
```

### 2. Backend Setup

```bash
cd backend
npm install
npm run build
npm run dev    # Development with mock data
```

The backend will start on http://localhost:3001

### 3. Frontend Setup

```bash
cd ../frontend
npm install
npm run dev  # Development server
```

The frontend will start on http://localhost:3000

### 4. Hardware Setup (Optional)

See [TCS34725 Setup Guide](backend/TCS34725_SETUP.md) for complete hardware integration.

## Project Structure

```
PUMA/
├── README.md                    # This file
├── .gitignore                   # Git ignore rules
├── backend/                     # Node.js/TypeScript Backend
│   ├── src/
│   │   ├── services/
│   │   │   ├── SerialService.ts       # Arduino communication
│   │   │   ├── ColorClassificationService.ts  # ML color analysis
│   │   │   ├── DataProcessingService.ts       # pH averaging & alerts
│   │   │   └── DatabaseService.ts             # SQLite operations
│   │   ├── routes/              # REST API endpoints
│   │   ├── config/              # TCS34725 configuration
│   │   ├── types/               # TypeScript definitions
│   │   └── utils/               # Logging and utilities
│   ├── README.md                # Backend documentation
│   ├── TCS34725_SETUP.md        # Hardware setup guide
│   └── package.json
├── frontend/                    # Next.js React Frontend
│   ├── app/
│   │   ├── dashboard/           # Health monitoring dashboard
│   │   ├── ui/                  # Reusable components
│   │   └── layout.tsx
│   ├── public/                  # Static assets
│   └── package.json
└── hardware/                    # Arduino code (future)
    └── arduino_sensors/
```

## Hardware Requirements

### Required Components

| Component               | Purpose             | Specification           |
| ----------------------- | ------------------- | ----------------------- |
| **Arduino Uno/Nano**    | Microcontroller     | USB connection required |
| **TCS34725 RGB Sensor** | Color measurement   | I2C, 3.3V power         |
| **pH Sensor**           | Acidity measurement | Analog output           |
| **Jumper Wires**        | Connections         | Male-to-male            |
| **USB Cable**           | Data transmission   | Arduino to computer     |

### Wiring Diagram

```
TCS34725    Arduino    pH Sensor
--------    -------    ---------
VCC   →     3.3V       VCC → 5V
GND   →     GND        GND → GND
SDA   →     A4         OUT → A0
SCL   →     A5
```

**Important**: TCS34725 requires 3.3V power, NOT 5V!

## Installation

### Development Setup

1. **Install Dependencies**

   ```bash
   # Backend
   cd backend && npm install

   # Frontend
   cd ../frontend && npm install
   ```

2. **Environment Configuration**

   ```bash
   # Backend environment
   cp backend/.env.example backend/.env
   ```

3. **Database Initialization**
   ```bash
   cd backend
   npm run build
   # Database auto-initializes on first run
   ```

### Production Deployment

1. **Build Applications**

   ```bash
   # Backend
   cd backend && npm run build

   # Frontend
   cd ../frontend && npm run build
   ```

2. **Start Services**

   ```bash
   # Backend (production)
   cd backend && npm start

   # Frontend (production)
   cd ../frontend && npm start
   ```

## Usage

### Development Mode (Mock Data)

Perfect for testing without hardware:

```bash
# Terminal 1: Backend with mock TCS34725 data
cd backend
npm run dev

# Terminal 2: Frontend development server
cd frontend
npm run dev
```

Visit http://localhost:3000 to see the dashboard with simulated health data.

### Production Mode (Real Hardware)

With Arduino connected:

```bash
# Configure Arduino COM port
# Edit backend/.env:
ARDUINO_PORT=COM3                # Windows
# ARDUINO_PORT=/dev/ttyUSB0      # Linux
ARDUINO_AUTO_DETECT=true

# Start backend
cd backend && npm start

# Start frontend
cd frontend && npm start
```

### Using the Dashboard

1. **Real-time Monitoring**: View live pH and color readings
2. **Health Trends**: Analyze historical data patterns
3. **Alert System**: Receive notifications for health concerns
4. **Recommendations**: Get personalized hydration advice

## API Documentation

### Health & Status

```bash
GET /health                    # System health check
GET /api/status               # Detailed system status
```

### Data Retrieval

```bash
GET /api/readings/latest      # Most recent reading
GET /api/readings             # Paginated readings (?limit=100&offset=0)
GET /api/readings/range       # Date range query (?start=2024-01-01&end=2024-01-02)
```

### Analytics

```bash
GET /api/analytics            # Weekly analytics (?days=7)
GET /api/ph/buffer           # Current pH buffer statistics
GET /api/clusters            # Color classification clusters
```

### Health Recommendations

```bash
GET /api/recommendations/:score    # Health advice for score (1-10)
```

### Testing & Administration

```bash
POST /api/simulate            # Simulate reading (development)
POST /api/clusters/retrain    # Retrain ML clusters
```

### WebSocket Events

**Client → Server:**

- `requestLatestData` - Request latest reading

**Server → Client:**

- `newReading` - New processed reading with recommendations
- `healthAlert` - Health concern notifications
- `clustersUpdated` - Updated ML clusters

## Health Scoring System

### Color Classification (1-10 Scale)

| Score | Description | Color                 | Health Status           |
| ----- | ----------- | --------------------- | ----------------------- |
| 1-2   | Excellent   | Very pale/pale yellow | Optimal hydration       |
| 3-4   | Good        | Light/normal yellow   | Good hydration          |
| 5-6   | Fair        | Dark yellow/amber     | Mild dehydration        |
| 7-8   | Concerning  | Dark amber/orange     | Significant dehydration |
| 9-10  | Critical    | Brown/red tones       | Severe condition        |

### pH Analysis

- **Normal Range**: 4.5-8.5
- **Acidic**: < 4.5 (may indicate UTI, ketosis)
- **Alkaline**: > 8.5 (may indicate infection)

## Development

### Adding New Features

1. **Backend**: Add services in `backend/src/services/`
2. **Frontend**: Add components in `frontend/app/ui/`
3. **Database**: Modify schema in `DatabaseService.ts`
4. **API**: Add endpoints in `backend/src/routes/`

### Testing

```bash
# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test
```

### Code Style

- **TypeScript** for type safety
- **ESLint** for code quality
- **Prettier** for formatting

## Documentation

- [Backend API Documentation](backend/README.md)
- [TCS34725 Hardware Setup](backend/TCS34725_SETUP.md)
- [Frontend Component Guide](frontend/README.md)
- [Arduino Integration Guide](hardware/README.md)
