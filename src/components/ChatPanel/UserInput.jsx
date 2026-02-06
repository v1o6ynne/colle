import React from 'react';
import { ArrowUp } from 'lucide-react';

export default function UserInput({ inputText, setInputText }) {
    return (
        <div className="input-container">
            <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Ask questions about the paper..."
                rows="1"
            />
            <button className="send-btn"><ArrowUp size={18} /></button>
        </div>
    );
}
