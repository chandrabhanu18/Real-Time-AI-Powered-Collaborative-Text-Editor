import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export class AIService {
  static async streamCompletion(params, onChunk, onComplete, onError) {
    try {
      const response = await fetch(`${API_BASE}/api/ai/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('Empty response body from AI stream');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      const processLine = (line) => {
        if (!line.startsWith('data: ')) return;
        const data = line.slice(6).trim();
        if (data === '[DONE]') {
          onComplete();
          return true;
        }
        if (!data) return false;

        try {
          const parsed = JSON.parse(data);
          if (parsed.token) {
            onChunk(parsed.token);
          } else if (parsed.error) {
            onError(new Error(parsed.error));
            return true;
          }
        } catch (e) {
          // Ignore parse errors for partial lines
        }
        return false;
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (processLine(line)) {
            return;
          }
        }
      }

      buffer += decoder.decode();
      if (buffer) {
        const lines = buffer.split(/\r?\n/);
        for (const line of lines) {
          if (processLine(line)) {
            return;
          }
        }
      }

      onComplete();
    } catch (error) {
      console.error('AI stream error:', error);
      onError(error);
    }
  }
}

export default AIService;
