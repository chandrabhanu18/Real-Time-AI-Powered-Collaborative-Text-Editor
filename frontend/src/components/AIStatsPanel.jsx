import React from 'react';
import useEditorStore from '../store/editorStore';

const AIStatsPanel = () => {
  const aiStatsAccepted = useEditorStore((state) => state.aiStatsAccepted);
  const aiStatsRejected = useEditorStore((state) => state.aiStatsRejected);

  return (
    <div
      className="ai-stats-panel"
      style={{
        padding: '16px',
        background: '#f9f9f9',
        border: '1px solid #ddd',
        borderRadius: '8px',
        marginBottom: '16px'
      }}
    >
      <h3 style={{ marginTop: 0, marginBottom: '12px' }}>AI Statistics</h3>
      <div style={{ display: 'flex', gap: '20px' }}>
        <div>
          <span style={{ color: '#666', fontSize: '12px' }}>Accepted</span>
          <div data-testid="ai-stats-accepted" style={{ fontSize: '24px', fontWeight: 'bold' }}>
            {aiStatsAccepted}
          </div>
        </div>
        <div>
          <span style={{ color: '#666', fontSize: '12px' }}>Rejected</span>
          <div data-testid="ai-stats-rejected" style={{ fontSize: '24px', fontWeight: 'bold' }}>
            {aiStatsRejected}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIStatsPanel;
