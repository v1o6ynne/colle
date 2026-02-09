import React from 'react';
import ReactMarkdown from 'react-markdown';

export default function Messages({ activeTab, messages = [] }) {
  if (activeTab === 'Assistant') {
    return (
      <div className="messages-container">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`message ${m.role === 'assistant' ? 'ai-message' : 'user-message'}`}
          >
            {m.role === 'assistant' ? (
              <ReactMarkdown
                components={{
                  p: ({ children }) => <p style={{ margin: '8px 0' }}>{children}</p>,
                  ul: ({ children }) => <ul style={{ margin: '8px 0 8px 18px' }}>{children}</ul>,
                  li: ({ children }) => <li style={{ margin: '4px 0' }}>{children}</li>,
                }}
              >
                {m.text}
              </ReactMarkdown>
            ) : (
              m.text
            )}
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
