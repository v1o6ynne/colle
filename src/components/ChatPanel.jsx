import React, { useState } from 'react';
import ChatHeader from './ChatPanel/ChatHeader';
import HelperCards from './ChatPanel/HelperCards';
import Messages from './ChatPanel/Messages';
import SelectTextBox from './ChatPanel/SelectTextBox';
import SelectImagesBox from './ChatPanel/SelectImagesBox';
import UserInput from './ChatPanel/UserInput';

export default function ChatPanel({
  style,
  inputText,
  setInputText,
  selectedText,
  onClearSelectedText,
  screenshotId,
  screenshotImage,
  onClearScreenshotImage
}) {
  const [activeTab, setActiveTab] = useState('Assistant');

  const [messages, setMessages] = useState([
    { role: 'assistant', text: "Hello! I'm ready to analyze this paper." }
  ]);

  const [pinnedHeight, setPinnedHeight] = useState(180); 

  const addAssistant = (text) => {
    setMessages((prev) => [...prev, { role: 'assistant', text }]);
  };

  const addUser = (text) => {
    setMessages((prev) => [...prev, { role: 'user', text }]);
  };

  const hasSelection = (!!selectedText) || !!screenshotImage;

   const startResizePinned = (e) => {
    e.preventDefault();

    const startY = e.clientY;
    const startH = pinnedHeight;

    document.body.classList.add('no-select');

    const onMove = (ev) => {
      const delta = ev.clientY - startY; 
      const next = Math.min(360, Math.max(80, startH + delta));
      setPinnedHeight(next);
    };

    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.classList.remove('no-select');
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  return (
    <aside className="chat-panel" style={style}>
      <ChatHeader activeTab={activeTab} setActiveTab={setActiveTab} />

        {hasSelection && (
        <>
          <div
            className="chat-pinned-selections"
            style={{ maxHeight: pinnedHeight }} 
          >
            <div className="chat-pinned-selections-label">Pinned context</div>
            <div className="chat-pinned-selections-inner">
              {selectedText && (
                <SelectTextBox
                  key={`text-0`}
                  selectedText={selectedText}
                  onClear={onClearSelectedText}
                />
              )}
              {screenshotImage && (
                <SelectImagesBox
                  key={`image-0`}
                  screenshotImage={screenshotImage}
                  onClear={onClearScreenshotImage}
                />
              )}
            </div>
          </div>

        
          <div className="resize-handle-y" onMouseDown={startResizePinned} />
        </>
      )}

      <div className="chat-content">
        <HelperCards activeTab={activeTab} />
        <Messages activeTab={activeTab} messages={messages} />
      </div>

      <div className="chat-input-area">
        <UserInput
          inputText={inputText}
          setInputText={setInputText}
          selectedText={selectedText}
          screenshotId={screenshotId} 
          screenshotImage={screenshotImage}
          onUserMessage={addUser}
          onResponse={addAssistant}
        />
      </div>
    </aside>
  );
}
