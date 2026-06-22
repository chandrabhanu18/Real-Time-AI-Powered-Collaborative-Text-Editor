import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import * as Y from 'yjs';
import { v4 as uuidv4 } from 'uuid';

import useEditorStore from '../store/editorStore';
import { WSProvider } from '../utils/wsProvider';
import AIService from '../services/aiService';
import PresenceCursors from './PresenceCursors';
import GhostText from './GhostText';
import SlashCommandMenu from './SlashCommandMenu';
import AISuggestionMark from '../extensions/AISuggestionMark';

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];

const Editor = ({ docId = 'default-doc' }) => {
  const ydoc = useRef(new Y.Doc());
  const provider = useRef(null);
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
    setAIPresence
  } = useEditorStore();

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        history: { depth: 100 }
      }),
      Collaboration.configure({
        document: ydoc.current
      }),
      CollaborationCursor.configure({
        provider: undefined,
        user: {
          name: userName,
          color: userColor
        }
      }),
      AISuggestionMark
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
        provider.current = new WSProvider(docId, ydoc.current);
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
    const beforeCursor = docText.substring(0, $anchor.pos - 1);

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

  const handleKeyDown = (event) => {
    if (ghostText) {
      if (event.key === 'Tab') {
        event.preventDefault();
        acceptGhostText();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        setGhostText('');
        incrementRejected();
      } else if (!/^(Meta|Control|Shift|Alt)$/.test(event.key)) {
        setGhostText('');
      }
    }
  };

  const acceptGhostText = () => {
    if (!editor) return;

    const content = ghostText;
    const { $anchor } = editor.state.selection;

    editor.chain()
      .insertContent(content)
      .setMark('aiSuggestion')
      .run();

    setGhostText('');
    incrementAccepted();
    setAIPresence(false);
  };

  const triggerAICompletion = async (intent) => {
    if (!editor) return;

    const documentContent = editor.getText();
    const { $anchor } = editor.state.selection;
    const cursorPos = $anchor.pos - 1;

    const contextWindowSize = 500;
    const precedingStart = Math.max(0, cursorPos - contextWindowSize);
    const followingEnd = Math.min(documentContent.length, cursorPos + contextWindowSize);

    const precedingText = documentContent.substring(precedingStart, cursorPos);
    const followingText = documentContent.substring(cursorPos, followingEnd);

    const selection = editor.state.selection;
    const selectedText =
      selection.from !== selection.to
        ? documentContent.substring(selection.from - 1, selection.to - 1)
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

  if (!editor || !isReady) {
    return (
      <div className="editor-loading" style={{ padding: '20px', textAlign: 'center' }}>
        Loading editor...
      </div>
    );
  }

  return (
    <div className="editor-container" onKeyDown={handleKeyDown} style={{ position: 'relative' }}>
      <PresenceCursors editor={editor} />
      <EditorContent editor={editor} className="editor-content" data-testid="editor-content" />
      {ghostText && <GhostText text={ghostText} editor={editor} />}
      <SlashCommandMenu editor={editor} onCommandSelect={triggerAICompletion} />
    </div>
  );
};

export default Editor;
