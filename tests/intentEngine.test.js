import { IntentEngine } from '../backend/src/ai/intentEngine.js';

describe('IntentEngine', () => {
  describe('validateContext', () => {
    it('should validate correct context', () => {
      const context = {
        intent: 'continue_paragraph',
        documentContent: 'Hello world',
        cursorPosition: 5
      };
      expect(() => IntentEngine.validateContext(context)).not.toThrow();
    });

    it('should throw on missing fields', () => {
      const context = {
        documentContent: 'Hello world'
      };
      expect(() => IntentEngine.validateContext(context)).toThrow();
    });

    it('should throw on invalid cursor position', () => {
      const context = {
        intent: 'continue_paragraph',
        documentContent: 'Hello',
        cursorPosition: 100
      };
      expect(() => IntentEngine.validateContext(context)).toThrow();
    });
  });

  describe('getPrompt', () => {
    it('should generate continue_paragraph prompt', () => {
      const context = {
        precedingText: 'The sky is',
        followingText: 'blue',
        selectedText: ''
      };
      const prompt = IntentEngine.getPrompt('continue_paragraph', context);
      expect(prompt).toContain('The sky is');
      expect(prompt).toContain('blue');
    });

    it('should generate rewrite_selection prompt', () => {
      const context = {
        precedingText: '',
        followingText: '',
        selectedText: 'very very long text'
      };
      const prompt = IntentEngine.getPrompt('rewrite_selection', context);
      expect(prompt).toContain('very very long text');
    });

    it('should handle unknown intent gracefully', () => {
      const context = {
        precedingText: 'text',
        followingText: '',
        selectedText: ''
      };
      const prompt = IntentEngine.getPrompt('unknown_intent', context);
      expect(prompt).toBeDefined();
      expect(prompt.length > 0).toBe(true);
    });
  });

  describe('extractContext', () => {
    it('should extract context around cursor', () => {
      const doc = 'This is a long document with some text that we want to extract context from.';
      const cursor = 20;
      const context = IntentEngine.extractContext(doc, cursor);

      expect(context.precedingText).toBeDefined();
      expect(context.followingText).toBeDefined();
      expect(context.precedingText.includes('This')).toBe(true);
    });

    it('should handle context at start of document', () => {
      const doc = 'Start of document';
      const cursor = 0;
      const context = IntentEngine.extractContext(doc, cursor);

      expect(context.precedingText).toBe('');
      expect(context.followingText).toBeDefined();
    });

    it('should handle selected text', () => {
      const doc = 'selected text';
      const cursor = 8;
      const selected = 'text';
      const context = IntentEngine.extractContext(doc, cursor, selected);

      expect(context.selectedText).toBe(selected);
    });
  });
});
