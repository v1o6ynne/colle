import React, { useState } from 'react';
import { ArrowUp, Highlighter, Image as ImageIcon } from 'lucide-react';

export default function ChatPanel({ 
    inputText, 
    setInputText, 
    mode, 
    selectedText,
    screenshotImage
}) {
    const [activeTab, setActiveTab] = useState('assistant');
    return (
        <aside className="chat-panel">
            <header className="chat-header">
                <div className={`tab ${activeTab === 'assistant' ? 'active' : ''}`} onClick={() => setActiveTab('assistant')}>Assistant</div>
                <div className={`tab ${activeTab === 'figure' ? 'active' : ''}`} onClick={() => setActiveTab('figure')}>Figure</div>
                <div className={`tab ${activeTab === 'note' ? 'active' : ''}`} onClick={() => setActiveTab('note')}>Note</div>
            </header>
            
            <div className="chat-content">
                {activeTab === 'assistant' && (
                    <>
                        <div className="helper-cards">
                            <div className="card">
                                <div className="card-header">
                                    <div className="card-icon-wrapper">
                                        <Highlighter size={24} className="card-icon" />
                                    </div>
                                    <div className="card-text">
                                        <h3>Highlight and Ask</h3>
                                        <p>Select text or areas to get instant insights</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="messages-container">
                            <div className="message ai-message">
                                Hello! I'm ready to analyze this paper.
                            </div>
                        </div>
                    </>
                )}
                {activeTab === 'figure' && (
                    <>
                        <div className="helper-cards">
                            <div className="card">
                                <div className="card-header">
                                    <div className="card-icon-wrapper">
                                        <ImageIcon size={24} className="card-icon" />
                                    </div>
                                    <div className="card-text">
                                        <h3>Figures & Images</h3>
                                        <p>Select, view, and edit images from the paper</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="messages-container">
                            <div style={{ color: '#6b7280', fontSize: '13px', padding: '20px', textAlign: 'center' }}>
                                No figures selected
                            </div>
                        </div>
                    </>
                )}
                {activeTab === 'note' && (
                    <>
                        <div className="helper-cards">
                            <div className="card">
                                <div className="card-header">
                                    <div className="card-icon-wrapper" style={{ background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)' }}>
                                        <svg size={24} className="card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                        </svg>
                                    </div>
                                    <div className="card-text">
                                        <h3>Notes</h3>
                                        <p>Save and organize your research notes</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="messages-container">
                            <div style={{ color: '#6b7280', fontSize: '13px', padding: '20px', textAlign: 'center' }}>
                                No notes yet
                            </div>
                        </div>
                    </>
                )}
            </div>

            <div className="chat-input-area">
                {selectedText && (
                    <div className="selected-text-box">
                        <strong>Selected:</strong>
                        <p>{selectedText}</p>
                    </div>
                )}
                {screenshotImage && (
                    <div className="screenshot-preview-box">
                        <img src={screenshotImage} alt="Screenshot" />
                    </div>
                )}
                <div className="input-container">
                    <textarea 
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Ask questions about the paper..." 
                        rows="1" 
                    />
                    <button className="send-btn"><ArrowUp size={18} /></button>
                </div>
            </div>
        </aside>
    );
}
