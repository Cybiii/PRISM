# PUMA Development Guide

## Quick Start - Run Both Servers

### 🚀 Start Development (Both Backend + Frontend)

```bash
npm run dev
```

This command starts both servers simultaneously:

- **Backend**: http://localhost:3001 (auto-recompiles on changes)
- **Frontend**: http://localhost:3000 (auto-recompiles on changes)

### 📁 Individual Server Commands

```bash
# Backend only
npm run backend

# Frontend only
npm run frontend
```

### 🔧 Other Commands

```bash
# Install all dependencies (root + backend + frontend)
npm run install-all

# Build both projects
npm run build

# Start production servers
npm run start
```

## Development Features

✅ **Auto-Recompilation**: Both servers automatically restart/rebuild when you make changes
✅ **Colored Output**: Backend (blue) and Frontend (green) logs are clearly distinguished  
✅ **Concurrent Running**: Both servers run simultaneously in one terminal
✅ **Development Mode**: Includes authentication bypasses and mock data for development

## Project Structure

```
PUMA/
├── package.json          # Root - runs both servers
├── backend/              # Node.js/Express API
│   ├── package.json
│   └── src/             # TypeScript source
└── frontend/            # Next.js React app
    ├── package.json
    └── app/             # Next.js app directory
```

## Development Workflow

1. **Start Development**: `npm run dev`
2. **Make Changes**: Edit files in `backend/src/` or `frontend/app/`
3. **Auto-Reload**: Servers automatically restart/rebuild
4. **Test Changes**: Visit http://localhost:3000

## Stopping Servers

Press `Ctrl+C` to stop both servers at once.
