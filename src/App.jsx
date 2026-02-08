import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import PaperPanel from './components/PaperPanel';
import ChatPanel from './components/ChatPanel';
import './App.css';

export default function AcademicAssistant() {
  const [inputText, setInputText] = useState('');
  const [mode, setMode] = useState(null);
  const [selectedText, setSelectedText] = useState('');
  const [screenshotImages, setScreenshotImages] = useState([]);

  const [chatWidth, setChatWidth] = useState(420);

  const handleCopySelection = (cleanedText) => {
    setSelectedText(cleanedText);
  };

  const handleModeChange = (newMode) => setMode(newMode);

  const handleTempScreenshot = (imageData) => {
    setScreenshotImages((prev) => [...prev, imageData]);
  };

  const clearSelectedText = () => setSelectedText('');

  const removeScreenshotImage = (index) => {
    setScreenshotImages((prev) => prev.filter((_, i) => i !== index));
  };

  
  const startResize = (e) => {
    e.preventDefault();

    const startX = e.clientX;
    const startWidth = chatWidth;


    document.body.classList.add('no-select');

    const onMouseMove = (moveEvent) => {
      const delta = startX - moveEvent.clientX; 
      const newWidth = Math.min(800, Math.max(300, startWidth + delta));
      setChatWidth(newWidth);
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.classList.remove('no-select');
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
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

      {/* ✅ 关键：分隔条必须在这里 */}
      <div className="resize-handle" onMouseDown={startResize} />

      <ChatPanel
        style={{ width: chatWidth }}
        inputText={inputText}
        setInputText={setInputText}
        mode={mode}
        selectedText={selectedText}
        onClearSelectedText={clearSelectedText}
        screenshotImages={screenshotImages}
        onRemoveScreenshotImage={removeScreenshotImage}
      />
    </div>
  );
}
