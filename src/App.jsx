import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import PaperPanel from './components/PaperPanel';
import ChatPanel from './components/ChatPanel';

import './App.css';

export default function AcademicAssistant() {
    const [inputText, setInputText] = useState('');
    const [mode, setMode] = useState(null);
    const [selectedText, setSelectedText] = useState('');
    const [screenshotImage, setScreenshotImage] = useState('');

    const handleCopySelection = (cleanedText) => {
        setSelectedText(cleanedText);
    };

    const handleModeChange = (newMode) => {
        setMode(newMode);
    };

    const handleTempScreenshot = (imageData) => {
        // Auto-confirm screenshot, no manual buttons
        setScreenshotImage(imageData);
    };

    return (
        <div className="app-container">
            <Sidebar />
            <PaperPanel 
                mode={mode}
                onCopySelection={handleCopySelection} 
                onModeChange={handleModeChange}
                onTempScreenshot={handleTempScreenshot}
            />
            <ChatPanel 
                inputText={inputText} 
                setInputText={setInputText} 
                mode={mode} 
                selectedText={selectedText}
                setSelectedText={setSelectedText}
                screenshotImage={screenshotImage}
                setScreenshotImage={setScreenshotImage}
            />
        </div>
    );
}