import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import PaperPanel from './components/PaperPanel';
import ChatPanel from './components/ChatPanel';
import './App.css';

export default function AcademicAssistant() {
  const [inputText, setInputText] = useState('');
  const [mode, setMode] = useState(null);
  const [activeTab, setActiveTab] = useState('Assistant');
  const [selectedText, setSelectedText] = useState('');
  const [screenshotImage, setScreenshotImage] = useState('');
  const [screenshotClearTick, setScreenshotClearTick] = useState(0);

  const [chatWidth, setChatWidth] = useState(420);
  const [paperText, setPaperText] = useState('');

  const [screenshotId, setScreenshotId] = useState('');
  const [selectedTextId, setSelectedTextId] = useState('');

  const [contextImage, setContextImage] = useState(null);

  useEffect(() => {
    window.openContextImage = (imageDataUrl) => {
      setContextImage(imageDataUrl);
    };
    window.closeContextImage = () => setContextImage(null);

    return () => {
      delete window.openContextImage;
      delete window.closeContextImage;
    };
  }, []);

  useEffect(() => {
    fetch('http://localhost:3000/user-data')
      .then((r) => r.json())
      .then((data) => {
        if (data.paperContent && typeof data.paperContent === 'string') {
          setPaperText(data.paperContent);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (activeTab !== 'Assistant') {
      setMode(null);
    }
  }, [activeTab]);

  const handleCopySelection = (cleanedText) => {
    const text = (cleanedText || '').trim();
    setSelectedText(text);

    if (text) {
      const id = `highlight-${Date.now()}`;  
      setSelectedTextId(id);
    } else {
      setSelectedTextId('');
    }
  };

  const handleModeChange = (newMode) => setMode(newMode);

  const handleTempScreenshot = async (imageDataUrl) => {
    const id = `screenshot-${Date.now()}`;  
    setScreenshotId(id);
    setScreenshotImage(imageDataUrl);
    const pageNumber =
    (typeof window.getPdfCurrentPage === "function" ? window.getPdfCurrentPage() : null) ||
    window.__pdfCurrentPage ||
    1;

  // ✅ 抛给 ChatPanel（让它 setScreenshotAnchor）
  window.onPdfScreenshotAnchor?.({
    type: "screenshot",
    pageNumber,
  });

  console.log("[capture screenshot] pageNumber =", pageNumber, {
  hasGet: typeof window.getPdfCurrentPage === "function",
  __pdfCurrentPage: window.__pdfCurrentPage,
});


    

};


 const clearSelectedText = () => {
    setSelectedText('');
    setSelectedTextId('');
  };

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
        onPaperTextExtracted={setPaperText}
        selectedText={selectedText}
        screenshotImage={screenshotImage}
        screenshotClearTick={screenshotClearTick}
        activeTab={activeTab}
      />

   
      {/* <div className="resize-handle" onMouseDown={startResize} /> */}

      <ChatPanel
        // style={{ width: chatWidth }}
        inputText={inputText}
        setInputText={setInputText}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedText={selectedText}
        selectedTextId={selectedTextId}
        screenshotId={screenshotId}
        onClearSelectedText={clearSelectedText}
        screenshotImage={screenshotImage}
        onClearScreenshotImage={clearScreenshotImage}
        paperText={paperText}
      />

      {contextImage && (
        <div
          className="context-image-overlay"
          onClick={() => setContextImage(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="context-image-modal" onClick={(e) => e.stopPropagation()}>
            <button className="context-image-close" onClick={() => setContextImage(null)}>
              ✕
            </button>
            <img src={contextImage} alt="Context screenshot" className="context-image-img" />
          </div>
        </div>
      )}
    </div>

    
  );
}
