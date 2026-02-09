import React from 'react';

export default function ChatHeader({ activeTab, setActiveTab }) {
    return (
        <header className="chat-header">
            <div className={`tab ${activeTab === 'Assistant' ? 'active' : ''}`} onClick={() => setActiveTab('Assistant')}>Assistant</div>
            <div className={`tab ${activeTab === 'Discovery' ? 'active' : ''}`} onClick={() => setActiveTab('Discovery')}>Discovery</div>
           
        </header>
    );
}
