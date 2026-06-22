import React from 'react';
import useEditorStore from '../store/editorStore';

const AIContextPanel = () => {
  const contextIntent = useEditorStore((state) => state.contextIntent);
  const contextChars = useEditorStore((state) => state.contextChars);

  return (
    <div
      className="ai-context-panel"
      style={{
        padding: '16px',
        background: '#f0f7ff',
        border: '1px solid #b3d9ff',
        borderRadius: '8px'
      }}
    >
      <h3 style={{ marginTop: 0, marginBottom: '12px', color: '#0066cc' }}>AI Context</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div>
          <span style={{ color: '#666', fontSize: '12px' }}>Current Intent</span>
          <div
            data-testid="ai-context-intent"
            style={{ fontSize: '14px', fontWeight: '600', marginTop: '4px' }}
          >
            {contextIntent}
          </div>
        </div>
        <div>
          <span style={{ color: '#666', fontSize: '12px' }}>Context Size</span>
          <div
            data-testid="ai-context-chars"
            style={{ fontSize: '14px', fontWeight: '600', marginTop: '4px' }}
          >
            {contextChars} characters
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIContextPanel;
