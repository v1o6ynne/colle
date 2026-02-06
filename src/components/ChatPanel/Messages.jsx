import React from 'react';

export default function Messages({ activeTab }) {
    if (activeTab === 'assistant') {
        return (
            <div className="messages-container">
                <div className="message ai-message">
                    Hello! I'm ready to analyze this paper.
                </div>
            </div>
        );
    }

    if (activeTab === 'figure') {
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
