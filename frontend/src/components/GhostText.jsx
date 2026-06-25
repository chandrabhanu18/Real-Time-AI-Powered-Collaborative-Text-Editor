import React, { useEffect, useRef } from 'react';
import useEditorStore from '../store/editorStore';

const GhostText = ({ editor }) => {
  const ghostText = useEditorStore((state) => state.ghostText);
  const ghostTextRef = useRef(null);

  useEffect(() => {
    if (!editor || !ghostText) return;

    try {
      const { $anchor } = editor.state.selection;
      const coords = editor.view.coordsAtPos($anchor.pos);
      
      if (ghostTextRef.current) {
        ghostTextRef.current.style.top = coords.top + 'px';
        ghostTextRef.current.style.left = coords.left + 'px';
      }
    } catch (error) {
      // Ignore coordinate calculation errors
    }
  }, [ghostText, editor]);

  if (!ghostText) {
    return null;
  }

  return (
    <div
      ref={ghostTextRef}
      data-testid="ghost-text"
      className="ghost-text-overlay"
      style={{
        position: 'absolute',
        pointerEvents: 'none',
        userSelect: 'none',
        color: '#999',
        opacity: 0.6,
        fontStyle: 'italic',
        zIndex: 999,
        whiteSpace: 'pre-wrap',
        wordWrap: 'break-word',
        maxWidth: '400px'
      }}
    >
      {ghostText}
    </div>
  );
};

export default GhostText;
