import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import { Extension } from '@tiptap/core';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { Plugin } from '@tiptap/pm/state';
import * as Y from 'yjs';
import { v4 as uuidv4 } from 'uuid';

import useEditorStore from '../store/editorStore';
import { WSProvider } from '../utils/wsProvider';
import AIService from '../services/aiService';
import PresenceCursors from './PresenceCursors';
import GhostText from './GhostText';
import SlashCommandMenu from './SlashCommandMenu';
import AIPresenceIndicator from './AIPresenceIndicator';
import AISuggestionMark from '../extensions/AISuggestionMark';

const getPlainTextCursorPosition = (editor) => {
  const { selection, doc } = editor.state;
  const position = selection.empty ? selection.from : selection.to;
  return doc.textBetween(0, position, '\n').length;
};

const getPlainTextSelectedText = (editor) => {
  const { selection, doc } = editor.state;
  return selection.empty ? '' : doc.textBetween(selection.from, selection.to, '\n');
};

// Ghost Text Handler Extension
const GhostTextHandler = Extension.create({
  name: 'ghostTextHandler',
  addKeyboardShortcuts() {
    return {
      Tab: ({ editor }) => {
        const { ghostText, setGhostText, incrementAccepted, setAIPresence } = useEditorStore.getState();
        if (!ghostText) return false;
        
        const { $anchor } = editor.state.selection;
        const startPos = $anchor.pos;
        
        editor.chain()
          .insertContent(ghostText)
          .run();
        
        // Apply AI suggestion mark to the inserted content
        const endPos = startPos + ghostText.length;
        editor.chain()
          .setTextSelection({ from: startPos, to: endPos })
          .setMark('aiSuggestion')
          .setTextSelection(endPos)
          .run();

        setGhostText('');
        incrementAccepted();
        setAIPresence(false);
        return true;
      },
      Escape: ({ editor }) => {
        const { ghostText, setGhostText, incrementRejected } = useEditorStore.getState();
        if (!ghostText) return false;
        
        setGhostText('');
        incrementRejected();
        return true;
      }
    };
  },
  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handleKeyDown: (view, event) => {
            const { ghostText, setGhostText } = useEditorStore.getState();
            
            // Dismiss ghost text on any printable character or editing key
            if (ghostText && (event.key.length === 1 || event.key === 'Backspace' || event.key === 'Delete' || event.key === 'Enter')) {
              setGhostText('');
            }
            
            return false;
          }
        }
      })
    ];
  }
});

// Ghost Text Extension using Tiptap Decorations
const GhostTextExtension = Extension.create({
  name: 'ghostText',
  addStorage() {
    return {
      decorations: DecorationSet.empty
    };
  },
  addProseMirrorPlugins() {
    const ext = this;
    return [
      new Plugin({
        props: {
          decorations(state) {
            const { ghostText } = useEditorStore.getState();
            if (!ghostText) return DecorationSet.empty;
            
            const { $cursor } = state.selection;
            if (!$cursor) return DecorationSet.empty;
            
            const deco = Decoration.inline($cursor.pos, $cursor.pos, {
              class: 'ghost-text-decoration'
            }, { ghostText });
            return DecorationSet.create(state.doc, [deco]);
          }
        }
      })
    ];
  }
});

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];

const Editor = ({ docId = 'default-doc' }) => {
  const ydoc = useRef(new Y.Doc());
  const [userName] = useState(`User${Math.floor(Math.random() * 10000)}`);
  const [userColor] = useState(COLORS[Math.floor(Math.random() * COLORS.length)]);
  const provider = useRef(new WSProvider(docId, ydoc.current, userName, userColor));
  const lastKnownGhostTextRef = useRef('');
  const [isReady, setIsReady] = useState(false);

  const {
    ghostText,
    setGhostText,
    incrementAccepted,
    incrementRejected,
    setRemoteCursors,
    setContext,
    setAIPresence,
    slashMenuOpen,
    slashMenuPosition,
    setSlashMenuOpen,
    setUserInfo
  } = useEditorStore();

  const editor = useEditor({
    extensions: [
      StarterKit,
      Collaboration.configure({
        document: ydoc.current
      }),
      AISuggestionMark,
      GhostTextExtension,
      GhostTextHandler
    ],
    content: '<p>Start typing or type "/" to open AI commands...</p>',
    editorProps: {
      attributes: {
        class: 'ProseMirror'
      }
    },
    onUpdate: ({ editor: ed }) => {
      updateContext(ed);
      handleSlashCommand(ed);
    },
    onSelectionUpdate: ({ editor: ed }) => {
      updateContext(ed);
    }
  });

  useEffect(() => {
    const initProvider = async () => {
      try {
        setUserInfo(userName, userColor);

        await provider.current.connect();

        provider.current.onUserAssigned(({ userName: assignedName, color: assignedColor }) => {
          setUserInfo(assignedName, assignedColor);
        });

        provider.current.onAwareness(({ type, data }) => {
          if (type === 'awareness' && Array.isArray(data)) {
            const cursors = {};
            data.forEach((client) => {
              if (client.id && client.name) {
                cursors[`user-cursor-${client.name}`] = {
                  position: client.cursor,
                  name: client.name,
                  color: client.color
                };
              }
            });
            setRemoteCursors(cursors);
          }
        });

        setIsReady(true);
      } catch (error) {
        console.error('Provider init error:', error);
      }
    };

    if (editor) {
      initProvider();

      return () => {
        if (provider.current) {
          provider.current.disconnect();
        }
      };
    }
  }, [editor, docId, setRemoteCursors]);

  

  const updateContext = useCallback((ed) => {
    const text = ed.state.doc.textContent;
    const cursorPosition = getPlainTextCursorPosition(ed);
    const contextWindowSize = 500;
    const start = Math.max(0, cursorPosition - contextWindowSize);
    const end = Math.min(text.length, cursorPosition + contextWindowSize);
    const precedingText = text.substring(start, cursorPosition);
    const followingText = text.substring(cursorPosition, end);
    setContext('continue_paragraph', precedingText.length + followingText.length);

    if (provider.current && isReady) {
      provider.current.updateAwareness({
        cursor: cursorPosition,
        name: provider.current.userName || userName,
        color: provider.current.userColor || userColor
      });
    }
  }, [isReady, setContext, userName, userColor]);

  const handleSlashCommand = (ed) => {
    const { selection } = ed.state;
    if (!selection) {
      setSlashMenuOpen(false);
      return;
    }

    const docText = ed.state.doc.textContent;
    const cursorPosition = getPlainTextCursorPosition(ed);
    const beforeCursor = docText.substring(0, cursorPosition);

    const lastNewline = beforeCursor.lastIndexOf('\n');
    const textAfterLastNewline = beforeCursor.substring(lastNewline + 1);

    const match = textAfterLastNewline.match(/^\/(\w*)$/);
    if (match) {
      setSlashMenuOpen(true, { pos: $anchor.pos });
    } else {
      setSlashMenuOpen(false);
    }
  };

  const triggerAICompletion = async (intent) => {
    if (!editor) return;

    const documentContent = editor.state.doc.textContent;
    const cursorPos = getPlainTextCursorPosition(editor);

    const contextWindowSize = 500;
    const precedingStart = Math.max(0, cursorPos - contextWindowSize);
    const followingEnd = Math.min(documentContent.length, cursorPos + contextWindowSize);

    const precedingText = documentContent.substring(precedingStart, cursorPos);
    const followingText = documentContent.substring(cursorPos, followingEnd);

    const selectedText = getPlainTextSelectedText(editor);

    setGhostText('');
    lastKnownGhostTextRef.current = '';
    setContext(intent, precedingText.length + followingText.length + selectedText.length);
    setAIPresence(true, cursorPos);

    try {
      await AIService.streamCompletion(
        {
          documentContent,
          cursorPosition: cursorPos,
          precedingText,
          followingText,
          selectedText,
          intent
        },
        (token) => {
          lastKnownGhostTextRef.current += token;
          setGhostText(lastKnownGhostTextRef.current);
        },
        () => {
          setAIPresence(true, cursorPos);
        },
        (error) => {
          console.error('AI error:', error);
          setGhostText('');
          incrementRejected();
          setAIPresence(false);
        }
      );
    } catch (error) {
      console.error('Stream error:', error);
      incrementRejected();
      setAIPresence(false);
    }
  };

  // Accept the currently shown ghost text (used by keyboard shortcut and tests)
  const acceptGhostText = useCallback(() => {
    const { ghostText, setGhostText, incrementAccepted, setAIPresence } = useEditorStore.getState();
    if (!editor || !ghostText) return;

    const { $anchor } = editor.state.selection;
    const startPos = $anchor ? $anchor.pos : null;
    if (startPos === null) return;

    editor.chain()
      .insertContent(ghostText)
      .run();

    const endPos = startPos + ghostText.length;
    editor.chain()
      .setTextSelection({ from: startPos, to: endPos })
      .setMark('aiSuggestion')
      .setTextSelection(endPos)
      .run();

    setGhostText('');
    incrementAccepted();
    setAIPresence(false);
  }, [editor]);

  // Ensure test hooks are exposed after functions are defined
  useEffect(() => {
    if (typeof window !== 'undefined' && editor) {
      window.__EDITOR_TEST_HOOKS__ = window.__EDITOR_TEST_HOOKS__ || {};
      window.__EDITOR_TEST_HOOKS__.editor = editor;
      window.__EDITOR_TEST_HOOKS__.setGhostText = setGhostText;
      window.__EDITOR_TEST_HOOKS__.triggerAICompletion = (intent) => triggerAICompletion(intent);
      window.__EDITOR_TEST_HOOKS__.acceptGhostText = acceptGhostText;
      window.__EDITOR_TEST_HOOKS__.setAIPresence = setAIPresence;
      window.__EDITOR_TEST_HOOKS__.getGhostText = () => {
        try {
          return useEditorStore.getState().ghostText || '';
        } catch (e) {
          return '';
        }
      };
    }
    return () => {};
  }, [editor, setGhostText, triggerAICompletion, acceptGhostText, setAIPresence]);

  if (!editor || !isReady) {
    return (
      <div className="editor-loading" style={{ padding: '20px', textAlign: 'center' }}>
        Loading editor...
      </div>
    );
  }

  return (
    <div className="editor-container" style={{ position: 'relative' }}>
      <PresenceCursors editor={editor} />
      <EditorContent editor={editor} className="editor-content" data-testid="editor-content" />
      <GhostText editor={editor} />
      <SlashCommandMenu editor={editor} onCommandSelect={triggerAICompletion} />
      <AIPresenceIndicator editor={editor} />
    </div>
  );
};

export default Editor;
