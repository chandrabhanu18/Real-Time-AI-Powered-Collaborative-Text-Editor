import express from 'express';
import { IntentEngine } from '../ai/intentEngine.js';
import llmProvider from '../ai/llmProvider.js';
import logger from '../utils/logger.js';

const router = express.Router();

router.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

router.post('/ai/complete', async (req, res) => {
  try {
    const {
      documentContent,
      cursorPosition,
      precedingText,
      followingText,
      intent,
      selectedText
    } = req.body;

    // Validate request
    IntentEngine.validateContext({
      intent,
      documentContent,
      cursorPosition
    });

    if (!intent) {
      return res.status(400).json({ error: 'Intent is required' });
    }

    const context = {
      precedingText: precedingText || '',
      followingText: followingText || '',
      selectedText: selectedText || '',
      documentContent
    };

    const prompt = IntentEngine.getPrompt(intent, context);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    logger.info(`AI completion request: intent=${intent}, docLength=${documentContent.length}`);

    let buffer = '';

    await llmProvider.streamCompletion(prompt, (chunk) => {
      buffer += chunk;
      res.write(`data: ${JSON.stringify({ token: chunk })}\n\n`);
    });

    res.write('data: [DONE]\n\n');
    res.end();

    logger.info(`AI completion completed: ${buffer.length} characters generated`);
  } catch (error) {
    logger.error(`AI completion error: ${error.message}`);

    if (!res.headersSent) {
      res.status(500).json({
        error: 'Failed to generate completion',
        message: error.message
      });
    } else {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  }
});

export default router;
