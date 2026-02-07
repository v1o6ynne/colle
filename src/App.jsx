import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import PaperPanel from './components/PaperPanel';
import ChatPanel from './components/ChatPanel';

import './App.css';

export default function AcademicAssistant() {
    const [inputText, setInputText] = useState('');
    const [mode, setMode] = useState(null);
    const [selectedTexts, setSelectedTexts] = useState([]);
    const [screenshotImages, setScreenshotImages] = useState([]);

    const handleCopySelection = (cleanedText) => {
        setSelectedTexts((prev) => [...prev, cleanedText]);
    };

    const handleModeChange = (newMode) => {
        setMode(newMode);
    };

    const handleTempScreenshot = (imageData) => {
        setScreenshotImages((prev) => [...prev, imageData]);
    };

    const removeSelectedText = (index) => {
        setSelectedTexts((prev) => prev.filter((_, i) => i !== index));
    };

    const removeScreenshotImage = (index) => {
        setScreenshotImages((prev) => prev.filter((_, i) => i !== index));
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
                selectedTexts={selectedTexts}
                onRemoveSelectedText={removeSelectedText}
                screenshotImages={screenshotImages}
                onRemoveScreenshotImage={removeScreenshotImage}
            />
        </div>
    );
}