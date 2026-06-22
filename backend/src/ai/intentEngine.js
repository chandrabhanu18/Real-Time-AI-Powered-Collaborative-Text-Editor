import logger from '../utils/logger.js';

const intentTemplates = {
  continue_paragraph: (context) => `You are a helpful writing assistant. The user is currently writing a document.

Here is the text before their cursor:
"""${context.precedingText}"""

Here is the text after their cursor:
"""${context.followingText}"""

Your task is to continue the sentence seamlessly. DO NOT repeat any of the existing text. ONLY output the continuation. Do not output conversational filler. Keep the continuation concise and natural.`,

  rewrite_selection: (context) => `You are a professional editor. The user has selected the following text:
"""${context.selectedText}"""

Rewrite this text to be more concise and professional. Return ONLY the rewritten text without any explanation.`,

  expand: (context) => `You are a helpful writing assistant. The user wants to expand the following text:
"""${context.selectedText}"""

Expand this text with more details, examples, or explanation. Maintain the original tone and style. Return ONLY the expanded text.`,

  summarise: (context) => `You are a professional summarizer. The user wants you to summarize the following text:
"""${context.precedingText}"""

Provide a concise summary that captures the main points. Return ONLY the summary, without any explanation or preamble.`,

  todo: (context) => `You are a helpful assistant. Based on the following text:
"""${context.precedingText}"""

Generate a bulleted TODO list of actionable items. Return ONLY the TODO list in markdown format, without any explanation.`,

  translate: (context) => `You are a professional translator. Translate the following text to English:
"""${context.selectedText}"""

Return ONLY the translated text without any explanation.`
};

export class IntentEngine {
  static getPrompt(intent, context) {
    const template = intentTemplates[intent];
    if (!template) {
      logger.warn(`Unknown intent: ${intent}, using continue_paragraph`);
      return intentTemplates.continue_paragraph(context);
    }
    return template(context);
  }

  static validateContext(context) {
    const required = ['intent', 'documentContent', 'cursorPosition'];
    for (const field of required) {
      if (!(field in context)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    if (typeof context.cursorPosition !== 'number' || context.cursorPosition < 0) {
      throw new Error('Invalid cursor position');
    }

    if (context.cursorPosition > context.documentContent.length) {
      throw new Error('Cursor position exceeds document length');
    }

    return true;
  }

  static extractContext(documentContent, cursorPosition, selectedText = null) {
    const contextWindowSize = 1000;

    const precedingStart = Math.max(0, cursorPosition - contextWindowSize);
    const precedingText = documentContent.substring(precedingStart, cursorPosition);

    const followingEnd = Math.min(
      documentContent.length,
      cursorPosition + contextWindowSize
    );
    const followingText = documentContent.substring(cursorPosition, followingEnd);

    return {
      precedingText,
      followingText,
      selectedText: selectedText || ''
    };
  }
}

export default IntentEngine;
