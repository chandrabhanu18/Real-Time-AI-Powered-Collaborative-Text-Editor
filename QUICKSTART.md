# Quick Start Guide

## Prerequisites
- Docker and Docker Compose installed
- Or Node.js 18+ and npm for local development
- LLM API key (OpenAI recommended for testing)

## Option 1: Docker Compose (Recommended)

### Step 1: Setup Environment
```bash
cd collaborative-editor
cp .env.example .env
```

### Step 2: Add Your LLM API Key
Edit `.env`:
```env
LLM_API_KEY=sk-your-openai-api-key-here
LLM_API_PROVIDER=openai
LLM_MODEL=gpt-3.5-turbo
```

### Step 3: Start Services
```bash
docker-compose up --build -d
```

### Step 4: Access Application
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- Health Check: http://localhost:3001/api/health

### Step 5: Test Real-Time Collaboration
1. Open http://localhost:5173 in two browser windows
2. Type in one window, see it appear instantly in the other
3. Type `/` to see slash commands
4. Use Tab to accept AI suggestions, Escape to reject

## Option 2: Local Development

### Backend Setup
```bash
cd backend
npm install
# Create ../.env with your LLM_API_KEY
npm run dev
# Runs on http://localhost:3001
```

### Frontend Setup (new terminal)
```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

## Testing AI Features

### 1. Enable AI Completion
Ensure your `.env` has a valid LLM_API_KEY:
```env
LLM_API_KEY=sk-xxx
LLM_API_PROVIDER=openai
LLM_MODEL=gpt-3.5-turbo
```

### 2. Test Slash Commands
1. Type some text in the editor
2. Press Enter to create a new line
3. Type `/` and select a command:
   - `/expand` - Expand selected text
   - `/summarise` - Summarize content above cursor
   - `/rewrite` - Rewrite selected text
   - `/todo` - Generate TODO list
   - `/translate` - Translate selected text

### 3. Use AI Suggestions
- Watch ghost text (gray, italic) appear as AI generates
- Press **Tab** to accept the suggestion (marks it with yellow background)
- Press **Escape** to reject and clear the suggestion
- Start typing to discard suggestion and continue normally

### 4. Monitor Statistics
- Watch "AI Statistics" panel in sidebar update
- Track accepted vs rejected suggestions
- See real-time context size in "AI Context" panel

## Docker Troubleshooting

### Check Container Status
```bash
docker-compose ps
```

### View Logs
```bash
# All services
docker-compose logs -f

# Backend only
docker-compose logs -f backend

# Frontend only
docker-compose logs -f frontend
```

### Common Issues

**Backend won't start:**
```
ERROR: LLM_API_KEY not set
```
Solution: Add LLM_API_KEY to .env file

**Frontend can't connect to backend:**
Check VITE_API_BASE_URL in docker-compose.yml - should be `http://backend:3001` for Docker

**WebSocket connection fails:**
Check that backend is running: `docker-compose logs backend`

### Rebuild and Restart
```bash
# Stop all services
docker-compose down

# Clean volumes
docker-compose down -v

# Rebuild and start
docker-compose up --build -d
```

## Features Overview

### Real-Time Collaboration
- Text changes sync across all connected clients instantly
- Cursor positions show other users' current location
- User names and colors distinguish participants

### AI Assistant
- **Ghost Text**: Preview AI suggestions before accepting
- **Intent Detection**: Context-aware prompts for different tasks
- **Tracked Changes**: Accepted AI text visually marked
- **Statistics**: Track AI suggestion acceptance rate

### Keyboard Shortcuts
| Key | Action |
|-----|--------|
| `/` | Open command palette |
| `Tab` | Accept AI suggestion |
| `Esc` | Reject AI suggestion |
| `Type` | Type over suggestion (discard) |

## Supported LLM Providers

### OpenAI (Recommended)
```env
LLM_API_PROVIDER=openai
LLM_API_KEY=sk-...
LLM_MODEL=gpt-3.5-turbo
```

### Anthropic Claude
```env
LLM_API_PROVIDER=anthropic
LLM_API_KEY=sk-ant-...
LLM_MODEL=claude-3-sonnet-20240229
```

### Google Gemini
```env
LLM_API_PROVIDER=google
LLM_API_KEY=...
LLM_MODEL=gemini-pro
```

### Local Ollama
```env
LLM_API_PROVIDER=ollama
LLM_API_BASE_URL=http://localhost:11434/v1
LLM_MODEL=mistral
```

## Production Deployment

### Database Setup (Optional)
For persistent documents across server restarts:
```bash
# Create PostgreSQL database
createdb collaborative_editor

# Run migrations
psql collaborative_editor < schema.sql
```

### Environment Variables
Set these in production:
```env
NODE_ENV=production
LLM_API_KEY=your_production_key
PORT=3001
FRONTEND_PORT=5173
```

### SSL/TLS
Use Nginx reverse proxy with Let's Encrypt for production

### Scaling
For multiple users:
- Use Redis for Socket.io pub/sub
- Set up load balancer
- Store documents in database with snapshots

## Development Workflow

### Adding Features
1. Create feature branch: `git checkout -b feature/my-feature`
2. Make changes in backend and/or frontend
3. Test locally before committing
4. Submit pull request

### Running Tests
```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

### Code Formatting
All code uses existing style conventions. Run linters before committing.

## Support

For issues or questions:
1. Check PROJECT_VALIDATION.md for verification checklist
2. Review README.md for detailed documentation
3. Check docker logs for error details
4. Verify .env file has correct API key

---

**Ready to start?**
```bash
cp .env.example .env
# Edit .env with your API key
docker-compose up --build -d
# Open http://localhost:5173
```
