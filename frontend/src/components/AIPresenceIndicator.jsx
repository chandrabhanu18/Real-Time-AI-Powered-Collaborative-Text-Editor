import React from 'react';
import useEditorStore from '../store/editorStore';

const AIPresenceIndicator = () => {
  const aiPresenceActive = useEditorStore((state) => state.aiPresenceActive);

  if (!aiPresenceActive) return null;

  return (
    <div
      data-testid="ai-presence-indicator"
      className="ai-presence-indicator"
      style={{
        position: 'absolute',
        width: '3px',
        height: '1.2em',
        background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
        animation: 'pulse 1.5s infinite',
        pointerEvents: 'none',
        borderRadius: '2px'
      }}
    />
  );
};

export default AIPresenceIndicator;
