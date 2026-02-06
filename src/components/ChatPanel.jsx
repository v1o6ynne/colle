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
    screenshotImage
}) {
    const [activeTab, setActiveTab] = useState('assistant');

    return (
        <aside className="chat-panel">
            <ChatHeader activeTab={activeTab} setActiveTab={setActiveTab} />

            <div className="chat-content">
                <HelperCards activeTab={activeTab} />
                <Messages activeTab={activeTab} />
            </div>

            <div className="chat-input-area">
                <SelectTextBox selectedText={selectedText} />
                <SelectImagesBox screenshotImage={screenshotImage} />
                <UserInput inputText={inputText} setInputText={setInputText} />
            </div>
        </aside>
    );
}
