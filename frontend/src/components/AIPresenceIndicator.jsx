import React, { useEffect, useRef } from 'react';
import useEditorStore from '../store/editorStore';

const AIPresenceIndicator = ({ editor }) => {
  const aiPresenceActive = useEditorStore((state) => state.aiPresenceActive);
  const aiPresencePosition = useEditorStore((state) => state.aiPresencePosition);
  const indicatorRef = useRef(null);

  useEffect(() => {
    if (!aiPresenceActive || !editor || aiPresencePosition === null) {
      return;
    }

    try {
      const coords = editor.view.coordsAtPos(aiPresencePosition);
      if (indicatorRef.current) {
        indicatorRef.current.style.top = coords.top + 'px';
        indicatorRef.current.style.left = coords.left + 'px';
      }
    } catch (error) {
      // Ignore coordinate calculation errors
    }
  }, [aiPresenceActive, aiPresencePosition, editor]);

  if (!aiPresenceActive) {
    return null;
  }

  return (
    <div
      ref={indicatorRef}
      data-testid="ai-presence-indicator"
      className="ai-presence-indicator"
      style={{
        position: 'absolute',
        width: '3px',
        height: '1.2em',
        background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
        animation: 'pulse 1.5s infinite',
        pointerEvents: 'none',
        borderRadius: '2px',
        zIndex: 1000
      }}
    />
  );
};

export default AIPresenceIndicator;
