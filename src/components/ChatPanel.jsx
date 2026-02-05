import React from 'react';
import { ArrowUp, Highlighter } from 'lucide-react';

export default function ChatPanel({ 
    inputText, 
    setInputText, 
    mode, 
    selectedText,
    screenshotImage
}) {
    return (
        <aside className="chat-panel">
            <header className="chat-header">
                <div className="tab active">Assistant</div>
                <div className="tab">Note</div>
            </header>
            
            <div className="chat-content">
                <div className="helper-cards">
                    <div className="card">
                        <Highlighter size={20} className="card-icon" />
                        <strong>Highlight and Ask</strong>
                        <p>Select text on the left and click "Copy Selections"</p>
                    </div>
                </div>
                <div className="messages-container">
                    <div className="message ai-message">
                        Hello! I'm ready to analyze this paper.
                    </div>
                </div>
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
