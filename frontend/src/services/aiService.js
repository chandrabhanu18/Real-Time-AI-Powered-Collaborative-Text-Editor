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
        throw new Error(`API error: ${response.statusCode}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') {
              onComplete();
              return;
            }
            if (data) {
              try {
                const parsed = JSON.parse(data);
                if (parsed.token) {
                  onChunk(parsed.token);
                } else if (parsed.error) {
                  onError(new Error(parsed.error));
                  return;
                }
              } catch (e) {
                // Ignore parse errors
              }
            }
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
