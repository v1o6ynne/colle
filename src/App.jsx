import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import PaperPanel from './components/PaperPanel';
import ChatPanel from './components/ChatPanel';

import './App.css';

export default function AcademicAssistant() {
    const [inputText, setInputText] = useState('');
    const [mode, setMode] = useState(null);
    const [selectedText, setSelectedText] = useState('');

    const handleCopySelection = (cleanedText) => {
        setSelectedText(cleanedText);
    };

    const handleModeChange = (newMode) => {
        setMode(newMode);
    };

    return (
        <div className="app-container">
            <Sidebar />
            <PaperPanel onCopySelection={handleCopySelection} onModeChange={handleModeChange} />
            <ChatPanel inputText={inputText} setInputText={setInputText} mode={mode} selectedText={selectedText} />
        </div>
    );
}