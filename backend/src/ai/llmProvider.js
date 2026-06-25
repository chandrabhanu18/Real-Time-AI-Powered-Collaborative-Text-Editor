import { OpenAI } from 'openai';
import axios from 'axios';
import logger from '../utils/logger.js';

class LLMProvider {
  constructor() {
    this.provider = process.env.LLM_API_PROVIDER || 'ollama';
    this.apiKey = process.env.LLM_API_KEY || '';
    this.baseUrl = process.env.LLM_API_BASE_URL || (this.provider === 'ollama' ? 'http://localhost:11434/v1' : '');
    this.model = process.env.LLM_MODEL || (this.provider === 'ollama' ? 'mistral' : 'gpt-3.5-turbo');
    this.client = null;
    this.mockMode = this.provider !== 'ollama' && !this.apiKey;

    if (this.mockMode) {
      logger.warn('LLM_API_KEY not set, falling back to local mock AI responses');
    }

    this.initializeProvider();
  }

  initializeProvider() {
    if (this.provider === 'openai' && this.apiKey) {
      try {
        this.client = new OpenAI({
          apiKey: this.apiKey
        });
      } catch (error) {
        logger.error(`Failed to initialize OpenAI client: ${error.message}`);
      }
    }
  }

  async streamCompletion(prompt, onChunk, options = {}) {
    try {
      if (this.mockMode) {
        return await this.streamMock(prompt, onChunk, options);
      }

      if (this.provider === 'openai') {
        return await this.streamOpenAI(prompt, onChunk);
      } else if (this.provider === 'anthropic') {
        if (!this.apiKey) {
          throw new Error('LLM_API_KEY is required for Anthropic');
        }
        return await this.streamAnthropic(prompt, onChunk);
      } else if (this.provider === 'ollama') {
        if (!this.baseUrl) {
          throw new Error('LLM_API_BASE_URL must be set for Ollama');
        }
        try {
          return await this.streamOllama(prompt, onChunk);
        } catch (error) {
          logger.warn(`Ollama streaming failed: ${error.message}, falling back to mock mode`);
          return await this.streamMock(prompt, onChunk, options);
        }
      } else {
        throw new Error(`Unsupported provider: ${this.provider}`);
      }
    } catch (error) {
      logger.error(`LLM streaming error: ${error.message}`);
      throw error;
    }
  }

  async streamMock(prompt, onChunk) {
    const words = prompt
      .replace(/\s+/g, ' ')
      .split(' ')
      .slice(0, 30);

    const mockResponse = `AI suggestion: ${words.join(' ')}.`;
    for (const char of mockResponse) {
      onChunk(char);
    }
  }

  async streamOpenAI(prompt, onChunk) {
    if (!this.client) {
      throw new Error('OpenAI client not initialized. Check LLM_API_KEY.');
    }

    const stream = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      stream: true,
      temperature: 0.7,
      max_tokens: 500
    });

    for await (const chunk of stream) {
      if (chunk.choices[0]?.delta?.content) {
        onChunk(chunk.choices[0].delta.content);
      }
    }
  }

  async streamAnthropic(prompt, onChunk) {
    const response = await axios.post(
      `${this.baseUrl}/messages`,
      {
        model: this.model,
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        stream: true
      },
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        },
        responseType: 'stream'
      }
    );

    return new Promise((resolve, reject) => {
      response.data.on('data', (chunk) => {
        const lines = chunk.toString().split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6));
              if (event.type === 'content_block_delta' && event.delta?.text) {
                onChunk(event.delta.text);
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      });

      response.data.on('end', resolve);
      response.data.on('error', reject);
    });
  }

  async streamOllama(prompt, onChunk) {
    const chatPayload = {
      model: this.model,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      stream: true
    };

    const completionPayload = {
      model: this.model,
      prompt,
      stream: true
    };

    const requestConfig = {
      responseType: 'stream',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream'
      },
      timeout: 60000
    };

    let response;
    try {
      response = await axios.post(`${this.baseUrl}/chat/completions`, chatPayload, requestConfig);
    } catch (error) {
      const status = error.response?.status;
      if (status === 404 || status === 405 || error.code === 'ECONNABORTED' || error.code === 'ECONNRESET') {
        response = await axios.post(`${this.baseUrl}/completions`, completionPayload, requestConfig);
      } else {
        throw error;
      }
    }

    return new Promise((resolve, reject) => {
      let buffer = '';
      let finished = false;

      const finish = () => {
        if (!finished) {
          finished = true;
          resolve();
        }
      };

      const processLine = (line) => {
        const text = line.trim();
        if (!text) return;
        const jsonText = text.replace(/^data:\s*/, '');
        if (jsonText === '[DONE]') {
          finish();
          return;
        }

        try {
          const event = JSON.parse(jsonText);
          const content =
            event.choices?.[0]?.delta?.content ||
            event.choices?.[0]?.message?.content ||
            event.choices?.[0]?.text ||
            event.output?.[0]?.content?.[0]?.text;

          if (content) {
            onChunk(content);
          }
        } catch (e) {
          // Ignore parse errors from partial or unsupported events
        }
      };

      response.data.on('data', (chunk) => {
        buffer += chunk.toString('utf8');
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() || '';

        for (const line of lines) {
          processLine(line);
        }
      });

      response.data.on('end', () => {
        if (buffer.trim()) {
          const lines = buffer.split(/\r?\n/);
          for (const line of lines) {
            processLine(line);
          }
        }
        finish();
      });

      response.data.on('error', reject);
    });
  }
}

export default new LLMProvider();
