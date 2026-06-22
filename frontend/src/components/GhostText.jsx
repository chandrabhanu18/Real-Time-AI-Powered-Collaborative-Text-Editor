import React, { useEffect, useState } from 'react';

const GhostText = ({ text, editor }) => {
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (editor && editor.state) {
      try {
        const { $anchor } = editor.state.selection;
        const coords = editor.view.coordsAtPos($anchor.pos);
        setPosition({
          top: coords.top,
          left: coords.left
        });
      } catch (error) {
        // Ignore coordinate errors
      }
    }
  }, [text, editor]);

  return (
    <span
      data-testid="ghost-text"
      className="ghost-text"
      style={{
        position: 'absolute',
        top: position.top + 'px',
        left: position.left + 'px',
        pointerEvents: 'none'
      }}
    >
      {text}
    </span>
  );
};

export default GhostText;
