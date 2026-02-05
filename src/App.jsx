import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import PaperPanel from './components/PaperPanel';
import ChatPanel from './components/ChatPanel';

import './App.css';

export default function AcademicAssistant() {
    const [inputText, setInputText] = useState('');

    const handleCopySelection = (cleanedText) => {
        setInputText((prev) => prev + `"${cleanedText}" `);
    };

    return (
        <div className="app-container">
            <Sidebar />
            <PaperPanel onCopySelection={handleCopySelection} />
            <ChatPanel inputText={inputText} setInputText={setInputText} />
        </div>
    );
}