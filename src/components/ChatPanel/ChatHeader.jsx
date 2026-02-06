import React from 'react';

export default function ChatHeader({ activeTab, setActiveTab }) {
    return (
        <header className="chat-header">
            <div className={`tab ${activeTab === 'assistant' ? 'active' : ''}`} onClick={() => setActiveTab('assistant')}>Assistant</div>
            <div className={`tab ${activeTab === 'figure' ? 'active' : ''}`} onClick={() => setActiveTab('figure')}>Figure</div>
            <div className={`tab ${activeTab === 'note' ? 'active' : ''}`} onClick={() => setActiveTab('note')}>Note</div>
        </header>
    );
}
