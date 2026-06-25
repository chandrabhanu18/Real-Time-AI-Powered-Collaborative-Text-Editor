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
import AISuggestionMark from '../extensions/AISuggestionMark';

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
  const provider = useRef(new WSProvider(docId, ydoc.current));
  const [userName] = useState(`User${Math.random().toString(36).substr(2, 5)}`);
  const [userColor] = useState(COLORS[Math.floor(Math.random() * COLORS.length)]);
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
    slashMenuPosition
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
        // Connect to WebSocket server
        await provider.current.connect();

        provider.current.onAwareness(({ type, data }) => {
          if (type === 'awareness' && data) {
            const cursors = {};
            data.forEach((client) => {
              cursors[`user-cursor-${client.name}`] = {
                position: client.cursor,
                name: client.name,
                color: client.color
              };
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
    const { $anchor } = ed.state.selection;
    const text = ed.getText();
    setContext('continue_paragraph', text.length);

    if (provider.current && isReady) {
      provider.current.updateAwareness({
        cursor: $anchor.pos,
        name: userName,
        color: userColor
      });
    }
  }, [isReady, setContext, userName, userColor]);

  const handleSlashCommand = (ed) => {
    const { $anchor } = ed.state.selection;
    const docText = ed.getText();
    const beforeCursor = docText.substring(0, $anchor.pos);

    const lastNewline = beforeCursor.lastIndexOf('\n');
    const textAfterLastNewline = beforeCursor.substring(lastNewline + 1);

    if (textAfterLastNewline.match(/^\/\w*$/)) {
      useEditorStore.setState({
        slashMenuOpen: true,
        slashMenuPosition: { line: $anchor.pos }
      });
    } else {
      useEditorStore.setState({ slashMenuOpen: false });
    }
  };

  const triggerAICompletion = async (intent) => {
    if (!editor) return;

    const documentContent = editor.getText();
    const { $anchor } = editor.state.selection;
    const cursorPos = $anchor.pos;

    const contextWindowSize = 500;
    const precedingStart = Math.max(0, cursorPos - contextWindowSize);
    const followingEnd = Math.min(documentContent.length, cursorPos + contextWindowSize);

    const precedingText = documentContent.substring(precedingStart, cursorPos);
    const followingText = documentContent.substring(cursorPos, followingEnd);

    const selection = editor.state.selection;
    const selectedText =
      selection.from !== selection.to
        ? documentContent.substring(selection.from, selection.to)
        : '';

    setGhostText('');
    lastKnownGhostTextRef.current = '';
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
          console.log('AI completion finished');
          setAIPresence(false);
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

  // Ensure test hooks are exposed after functions are defined
  useEffect(() => {
    if (typeof window !== 'undefined' && editor) {
      window.__EDITOR_TEST_HOOKS__ = window.__EDITOR_TEST_HOOKS__ || {};
      window.__EDITOR_TEST_HOOKS__.editor = editor;
      window.__EDITOR_TEST_HOOKS__.setGhostText = setGhostText;
      window.__EDITOR_TEST_HOOKS__.triggerAICompletion = (intent) => triggerAICompletion(intent);
      window.__EDITOR_TEST_HOOKS__.acceptGhostText = acceptGhostText;
      window.__EDITOR_TEST_HOOKS__.setAIPresence = setAIPresence;
      window.__EDITOR_TEST_HOOKS__.getGhostText = () => window.__EDITOR_TEST_HOOKS__.editor ? window.__EDITOR_TEST_HOOKS__.editor.getText() : '';
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
