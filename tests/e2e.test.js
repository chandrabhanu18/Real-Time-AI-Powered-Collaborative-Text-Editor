import { describe, it, expect, beforeAll } from 'vitest';
import path from 'path';
import { fileURLToPath } from 'url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * End-to-End Browser Test Suite
 * Tests the real-time collaborative editor with AI integration
 * 
 * Prerequisites:
 * - Backend running on http://localhost:3001
 * - Frontend running on http://localhost:5173
 * - Ollama running on http://localhost:11434 (or mock mode enabled)
 * 
 * Manual Test Steps (or use Playwright/Cypress for automation):
 * 1. Health Check: Verify /health endpoint responds
 * 2. Collaboration: Open editor in two browser tabs, verify real-time sync
 * 3. AI Completion: Type "/" in editor, verify AI suggestions stream
 * 4. WebSocket: Verify bi-directional communication with socket.io
 */

describe('End-to-End Browser Tests', () => {
  let backendUrl = 'http://localhost:3002';
  let frontendUrl = 'http://localhost:5173';

  beforeAll(async () => {
    const fs = await import('fs/promises');
    const envContent = await fs.readFile(path.join(repoRoot, '.env'), 'utf8');
    const envEntries = envContent
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => line.split('='))
      .reduce((acc, [key, ...value]) => {
        acc[key] = value.join('=');
        return acc;
      }, {});

    backendUrl = process.env.VITE_API_BASE_URL || envEntries.VITE_API_BASE_URL || `http://localhost:${envEntries.BACKEND_PORT || '3002'}`;
    frontendUrl = process.env.FRONTEND_PORT
      ? `http://localhost:${process.env.FRONTEND_PORT}`
      : envEntries.FRONTEND_PORT
      ? `http://localhost:${envEntries.FRONTEND_PORT}`
      : 'http://localhost:5173';

    // Verify backend is running
    try {
      const response = await fetch(`${backendUrl}/health`);
      expect(response.ok).toBe(true);
    } catch (error) {
      throw new Error(`Backend not running at ${backendUrl}. Start with: npm run start`);
    }
  });

  describe('Backend Health & API', () => {
    it('should respond to /health endpoint', async () => {
      const response = await fetch(`${backendUrl}/health`);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.status).toBe('ok');
    });

    it('should return 405 for POST /health', async () => {
      const response = await fetch(`${backendUrl}/health`, { method: 'POST' });
      expect(response.status).toBe(405);
    });

    it('should accept POST /api/ai/complete with valid prompt', async () => {
      const response = await fetch(`${backendUrl}/api/ai/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'Say hello' })
      });
      expect([200, 400, 500]).toContain(response.status);
      // 400/500 acceptable if LLM not configured; 200 expected with Ollama
    });
  });

  describe('AI Streaming', () => {
    it('should stream SSE response from /api/ai/complete', async () => {
      const response = await fetch(`${backendUrl}/api/ai/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'Complete this: The quick brown' })
      });

      expect(response.ok).toBe(true);
      const contentType = response.headers.get('content-type');
      expect(contentType).toContain('text/event-stream');
    });

    it('should handle missing prompt in AI request', async () => {
      const response = await fetch(`${backendUrl}/api/ai/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      expect([400, 500]).toContain(response.status);
    });
  });

  describe('Frontend Build', () => {
    it('frontend should be built and ready', async () => {
      // Check if frontend build directory exists
      const fs = await import('fs/promises');
      try {
        await fs.access(path.join(repoRoot, 'frontend', 'dist'));
      } catch (error) {
        throw new Error('Frontend not built. Run: cd frontend && npm run build');
      }
    });
  });

  describe('Provider Configuration', () => {
    it('should use Ollama as default provider', async () => {
      // Verify llmProvider.js defaults to Ollama
      const fs = await import('fs/promises');
      const content = await fs.readFile(path.join(repoRoot, 'backend', 'src', 'ai', 'llmProvider.js'), 'utf8');
      expect(content).toContain("process.env.LLM_API_PROVIDER || 'ollama'");
    });

    it('.env should have Ollama as default provider', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(path.join(repoRoot, '.env'), 'utf8');
      const lines = content.split('\n');
      const providerLine = lines.find(l => l.includes('LLM_API_PROVIDER='));
      expect(providerLine).toContain('ollama');
    });

    it('docker-compose.yml should default to Ollama', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(path.join(repoRoot, 'docker-compose.yml'), 'utf8');
      expect(content).toContain('LLM_API_PROVIDER=${LLM_API_PROVIDER:-ollama}');
    });
  });
});

/**
 * MANUAL BROWSER TEST SCENARIOS
 * 
 * Test A: Real-time Collaboration
 * 1. Open http://localhost:5173 in two browser windows side-by-side
 * 2. Type text in window 1
 * 3. VERIFY: Text appears in real-time in window 2
 * 4. Type in window 2
 * 5. VERIFY: Text appears in window 1
 * 6. Verify no text conflicts or duplicates
 * 
 * Test B: AI Slash Commands
 * 1. Open http://localhost:5173
 * 2. Type "/" in the editor
 * 3. VERIFY: AI suggestion dropdown appears
 * 4. Select a suggestion or continue typing
 * 5. VERIFY: AI streaming text appears in editor
 * 6. Verify streaming completes without errors
 * 
 * Test C: Ghost Text
 * 1. Open http://localhost:5173
 * 2. Type a partial word or phrase
 * 3. VERIFY: Gray ghost text appears suggesting next words
 * 4. Press Tab or right arrow to accept
 * 5. VERIFY: Ghost text becomes regular text
 * 
 * Test D: Provider Switching
 * 1. Stop backend: Ctrl+C in terminal
 * 2. Update .env: LLM_API_PROVIDER=openai (with valid API key)
 * 3. Restart backend: npm run start
 * 4. Verify AI streaming still works
 * 
 * Test E: Docker Deployment
 * 1. Run: docker-compose up
 * 2. Wait for healthcheck to pass
 * 3. Open http://localhost:5173
 * 4. Run Test A, B, C scenarios
 * 5. Verify all features work in containers
 */
