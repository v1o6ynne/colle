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
  selectedText,
  setSelectedText,
  screenshotImage,
  setScreenshotImage
}) {
  const [activeTab, setActiveTab] = useState('assistant');

  // for simplicity, we keep all messages in this component. In a more complex app, you might want to use a state management library or context.
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "Hello! I'm ready to analyze this paper." }
  ]);

  const addAssistant = (text) => {
    setMessages((prev) => [...prev, { role: 'assistant', text }]);
  };

  const addUser = (text) => {
    setMessages((prev) => [...prev, { role: 'user', text }]);
  };

  return (
    <aside className="chat-panel">
      <ChatHeader activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="chat-content">
        <HelperCards activeTab={activeTab} />
        <Messages activeTab={activeTab} messages={messages} />
      </div>

      <div className="chat-input-area">
        <SelectTextBox selectedText={selectedText} onClear={() => setSelectedText('')} />
        <SelectImagesBox screenshotImage={screenshotImage} onClear={() => setScreenshotImage('')} />
        <UserInput
          inputText={inputText}
          setInputText={setInputText}
          selectedText={selectedText}
          screenshotImage={screenshotImage}
          onUserMessage={addUser}
          onResponse={addAssistant}
        />
      </div>
    </aside>
  );
}
