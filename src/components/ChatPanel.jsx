import React, { useState } from 'react';
import ChatHeader from './ChatPanel/ChatHeader';
import HelperCards from './ChatPanel/HelperCards';
import Messages from './ChatPanel/Messages';
import SelectTextBox from './ChatPanel/SelectTextBox';
import SelectImagesBox from './ChatPanel/SelectImagesBox';
import UserInput from './ChatPanel/UserInput';

export default function ChatPanel({
  inputText,
  setInputText,
  mode,
  selectedTexts,
  onRemoveSelectedText,
  screenshotImages,
  onRemoveScreenshotImage
}) {
  const [activeTab, setActiveTab] = useState('assistant');

  const [messages, setMessages] = useState([
    { role: 'assistant', text: "Hello! I'm ready to analyze this paper." }
  ]);

  const addAssistant = (text) => {
    setMessages((prev) => [...prev, { role: 'assistant', text }]);
  };

  const addUser = (text) => {
    setMessages((prev) => [...prev, { role: 'user', text }]);
  };

  const hasSelection = selectedTexts.length > 0 || screenshotImages.length > 0;

  return (
    <aside className="chat-panel">
      <ChatHeader activeTab={activeTab} setActiveTab={setActiveTab} />

      {hasSelection && (
        <div className="chat-pinned-selections">
          <div className="chat-pinned-selections-label">Pinned context</div>
          <div className="chat-pinned-selections-inner">
            {selectedTexts.map((text, index) => (
              <SelectTextBox
                key={`text-${index}`}
                selectedText={text}
                onClear={() => onRemoveSelectedText(index)}
              />
            ))}
            {screenshotImages.map((image, index) => (
              <SelectImagesBox
                key={`image-${index}`}
                screenshotImage={image}
                onClear={() => onRemoveScreenshotImage(index)}
              />
            ))}
          </div>
        </div>
      )}

      <div className="chat-content">
        <HelperCards activeTab={activeTab} />
        <Messages activeTab={activeTab} messages={messages} />
      </div>

      <div className="chat-input-area">
        <UserInput
          inputText={inputText}
          setInputText={setInputText}
          selectedTexts={selectedTexts}
          screenshotImages={screenshotImages}
          onUserMessage={addUser}
          onResponse={addAssistant}
        />
      </div>
    </aside>
  );
}
