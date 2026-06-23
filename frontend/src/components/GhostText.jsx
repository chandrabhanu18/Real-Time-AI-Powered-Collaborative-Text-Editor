import React, { useEffect, useState } from 'react';

const GhostText = ({ text, editor }) => {
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (editor && editor.state && text) {
      try {
        const { $anchor } = editor.state.selection;
        const coords = editor.view.coordsAtPos($anchor.pos);
        const editorContainer = document.querySelector('.editor-container');
        const containerRect = editorContainer?.getBoundingClientRect() || { top: 0, left: 0 };
        
        setPosition({
          top: coords.top - containerRect.top,
          left: coords.left - containerRect.left
        });
      } catch (error) {
        console.warn('GhostText position error:', error);
      }
    }
  }, [text, editor]);

  if (!text) return null;

  return (
    <span
      data-testid="ghost-text"
      className="ghost-text"
      style={{
        position: 'absolute',
        top: position.top + 'px',
        left: position.left + 'px',
        pointerEvents: 'none',
        color: '#999',
        opacity: 0.6,
        fontStyle: 'italic',
        userSelect: 'none',
        whiteSpace: 'nowrap',
        zIndex: 10
      }}
    >
      {text}
    </span>
  );
};

export default GhostText;
