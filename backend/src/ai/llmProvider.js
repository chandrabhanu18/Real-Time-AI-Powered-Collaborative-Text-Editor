import { OpenAI } from 'openai';
import axios from 'axios';
import logger from '../utils/logger.js';

class LLMProvider {
  constructor() {
    this.provider = process.env.LLM_API_PROVIDER || 'openai';
    this.apiKey = process.env.LLM_API_KEY;
    this.baseUrl = process.env.LLM_API_BASE_URL;
    this.model = process.env.LLM_MODEL || 'gpt-3.5-turbo';
    this.client = null;
    this.mockMode = !this.apiKey;

    if (!this.apiKey) {
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
        return await this.streamAnthropic(prompt, onChunk);
      } else if (this.provider === 'ollama') {
        return await this.streamOllama(prompt, onChunk);
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
      await new Promise((resolve) => setTimeout(resolve, 5));
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
    const response = await axios.post(
      `${this.baseUrl}/chat/completions`,
      {
        model: this.model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        stream: true
      },
      {
        responseType: 'stream',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    return new Promise((resolve, reject) => {
      response.data.on('data', (chunk) => {
        const lines = chunk.toString().split('\n');
        for (const line of lines) {
          if (line.trim()) {
            try {
              const event = JSON.parse(line);
              if (event.choices?.[0]?.delta?.content) {
                onChunk(event.choices[0].delta.content);
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
}

export default new LLMProvider();
