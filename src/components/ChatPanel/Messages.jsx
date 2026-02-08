import React from 'react';

export default function Messages({ activeTab, messages = [] }) {
  if (activeTab === 'Assistant') {
    return (
      <div className="messages-container">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`message ${m.role === 'assistant' ? 'ai-message' : 'user-message'}`}
          >
            {m.text}
          </div>
        ))}
      </div>
    );
  }

  if (activeTab === 'Discovery') {
    return (
      <div className="messages-container">
        <div style={{ color: '#6b7280', fontSize: '13px', padding: '20px', textAlign: 'center' }}>
          No figures selected
        </div>
      </div>
    );
  }

  return (
    <div className="messages-container">
      <div style={{ color: '#6b7280', fontSize: '13px', padding: '20px', textAlign: 'center' }}>
        No notes yet
      </div>
    </div>
  );
}
