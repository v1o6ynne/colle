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
  const [screenshotClearTick, setScreenshotClearTick] = useState(0);

  const [chatWidth, setChatWidth] = useState(420);

  const [screenshotId, setScreenshotId] = useState('');

  const handleCopySelection = (cleanedText) => {
    setSelectedText(cleanedText);
  };

  const handleModeChange = (newMode) => setMode(newMode);

 const handleTempScreenshot = async (imageDataUrl) => {
  const id = `screenshot-${Date.now()}`;  
  setScreenshotId(id);
  setScreenshotImage(imageDataUrl);


  const screenshotObj = {
    id,
    imageDataUrl,
    anchor: { type: "screenshot" },
    createdAt: new Date().toISOString()
  };

//   try {
//     const currentRes = await fetch("http://localhost:3000/user-data");
//     const current = await currentRes.json();

//     const nextScreenshots = [...(current.screenshots || []), screenshotObj];

//     const saveRes = await fetch("http://localhost:3000/user-data", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({
//         mode: "patch",
//         data: { screenshots: nextScreenshots }
//       })
//     });

//     if (!saveRes.ok) {
//       const raw = await saveRes.text();
//       console.error("save screenshot failed:", raw);
//     }
//   } catch (e) {
//     console.error("save screenshot failed:", e);
//   }
};


  const clearSelectedText = () => setSelectedText('');

  const clearScreenshotImage = () => {
    setScreenshotImage('');
    setScreenshotId('');
    setScreenshotClearTick((prev) => prev + 1);
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
        selectedText={selectedText}
        screenshotImage={screenshotImage}
        screenshotClearTick={screenshotClearTick}
      />

      {/* ✅ 关键：分隔条必须在这里 */}
      <div className="resize-handle" onMouseDown={startResize} />

      <ChatPanel
        style={{ width: chatWidth }}
        inputText={inputText}
        setInputText={setInputText}
        selectedText={selectedText}
        screenshotId={screenshotId} 
        onClearSelectedText={clearSelectedText}
        screenshotImage={screenshotImage}
        onClearScreenshotImage={clearScreenshotImage}
      />
    </div>
  );
}
