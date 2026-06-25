import React, { useState } from 'react';
import Editor from './components/Editor';
import AIStatsPanel from './components/AIStatsPanel';
import AIContextPanel from './components/AIContextPanel';
import './App.css';

function App() {
  const [docId] = useState('default-document');

  return (
    <div className="app">
      <header className="app-header">
        <h1>Real-Time Collaborative Text Editor with AI</h1>
        <p className="subtitle">Powered by Yjs, WebSockets & LLM Integration</p>
      </header>

      <div className="app-container">
        <div className="main-content">
          <Editor docId={docId} />
        </div>

        <aside className="sidebar">
          <AIStatsPanel />
          <AIContextPanel />

          <div className="sidebar-section">
            <h3>Keyboard Shortcuts</h3>
            <ul>
              <li><kbd>/</kbd> - Open command palette</li>
              <li><kbd>Tab</kbd> - Accept AI suggestion</li>
              <li><kbd>Esc</kbd> - Reject AI suggestion</li>
              <li><kbd>Type</kbd> - Type over suggestion</li>
            </ul>
          </div>

          <div className="sidebar-section">
            <h3>Commands</h3>
            <ul>
              <li>/expand - Expand selected text</li>
              <li>/summarise - Summarize text</li>
              <li>/rewrite - Rewrite selected text</li>
              <li>/todo - Generate TODO list</li>
              <li>/translate - Translate text</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default App;
