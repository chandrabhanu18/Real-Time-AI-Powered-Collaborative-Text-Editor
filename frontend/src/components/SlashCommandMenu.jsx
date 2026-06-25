import React, { useState, useEffect } from 'react';
import useEditorStore from '../store/editorStore';

const COMMANDS = [
  { id: 'expand', label: '/expand', description: 'Expand selected text' },
  { id: 'summarise', label: '/summarise', description: 'Summarize above text' },
  { id: 'rewrite', label: '/rewrite', description: 'Rewrite selected text' },
  { id: 'todo', label: '/todo', description: 'Generate TODO list' },
  { id: 'translate', label: '/translate', description: 'Translate text' }
];

const SlashCommandMenu = ({ editor, onCommandSelect }) => {
  const { slashMenuOpen, slashMenuPosition } = useEditorStore();
  const [filtered, setFiltered] = useState(COMMANDS);
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    if (slashMenuOpen && editor) {
      const { $anchor } = editor.state.selection;
      const text = editor.getText();
        const beforeCursor = text.substring(0, $anchor.pos);
      const lastNewline = beforeCursor.lastIndexOf('\n');
      const textAfterLastNewline = beforeCursor.substring(lastNewline + 1);

      const match = textAfterLastNewline.match(/^\/(\w*)$/);
      const query = match ? match[1].toLowerCase() : '';

      const filteredCommands = COMMANDS.filter((cmd) =>
        cmd.id.toLowerCase().includes(query)
      );

      setFiltered(filteredCommands);
      setSelected(0);
    }
  }, [slashMenuOpen, editor]);

  const handleSelectCommand = (command) => {
    if (editor) {
      const intentMap = {
        expand: 'expand',
        summarise: 'summarise',
        rewrite: 'rewrite_selection',
        todo: 'todo',
        translate: 'translate'
      };

      const { $anchor } = editor.state.selection;
      const text = editor.getText();
      const beforeCursor = text.substring(0, $anchor.pos);
      const lastNewline = beforeCursor.lastIndexOf('\n');

      // Remove the slash command
      const slashPos = lastNewline + 1;
      editor.chain()
        .setTextSelection({ from: slashPos, to: $anchor.pos })
        .deleteSelection()
        .run();

      useEditorStore.setState({ slashMenuOpen: false });

      // Trigger AI completion
      onCommandSelect(intentMap[command.id]);
    }
  };

  if (!slashMenuOpen || !editor) return null;

  // Calculate position based on cursor
  let menuTop = '20px';
  let menuLeft = '0px';
  try {
    const { $anchor } = editor.state.selection;
    const coords = editor.view.coordsAtPos($anchor.pos);
    const editorContainer = document.querySelector('.ProseMirror');
    if (editorContainer) {
      const containerRect = editorContainer.getBoundingClientRect();
      menuTop = (coords.top - containerRect.top + 24) + 'px';
      menuLeft = (coords.left - containerRect.left) + 'px';
    }
  } catch (e) {
    // Fallback to default position
  }

  return (
    <div
      data-testid="slash-command-menu"
      className="slash-command-menu"
      style={{
        position: 'absolute',
        top: menuTop,
        left: menuLeft,
        background: 'white',
        border: '1px solid #ccc',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        zIndex: 1000,
        minWidth: '250px',
        maxHeight: '300px',
        overflow: 'auto'
      }}
    >
      {filtered.map((cmd, idx) => (
        <div
          key={cmd.id}
          data-testid={`slash-cmd-${cmd.id}`}
          className={`slash-command-item ${idx === selected ? 'selected' : ''}`}
          onClick={() => handleSelectCommand(cmd)}
          style={{
            padding: '12px 16px',
            cursor: 'pointer',
            backgroundColor: idx === selected ? '#f0f0f0' : 'white',
            borderBottom: idx < filtered.length - 1 ? '1px solid #eee' : 'none'
          }}
        >
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{cmd.label}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>{cmd.description}</div>
        </div>
      ))}
    </div>
  );
};

export default SlashCommandMenu;
