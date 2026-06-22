import { Mark } from '@tiptap/core';

const AISuggestionMark = Mark.create({
  name: 'aiSuggestion',

  parseDOM() {
    return [
      {
        tag: 'span[data-ai-suggestion]',
        getAttrs(dom) {
          return {
            // Capture any attributes if needed
          };
        }
      }
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      {
        'data-testid': 'ai-suggestion-accepted',
        'data-ai-suggestion': 'true',
        style: 'background-color: #fffacd; padding: 0 2px; border-radius: 2px;',
        ...HTMLAttributes
      },
      0
    ];
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-a': () => {
        return this.editor.commands.toggleMark(this.name);
      }
    };
  },

  addStorage() {
    return {
      parseOptions: {
        preserveWhitespace: true
      }
    };
  }
});

export default AISuggestionMark;
