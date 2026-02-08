
import React, { useEffect, useRef, useState } from 'react';
import ChatHeader from './ChatPanel/ChatHeader';
import HelperCards from './ChatPanel/HelperCards';
import Messages from './ChatPanel/Messages';
import SelectTextBox from './ChatPanel/SelectTextBox';
import SelectImagesBox from './ChatPanel/SelectImagesBox';
import UserInput from './ChatPanel/UserInput';
import DiscoveryList from './ChatPanel/DiscoveryList';

export default function ChatPanel({
  style,
  inputText,
  setInputText,
  selectedTextId,
  selectedText,
  onClearSelectedText,
  screenshotId,
  screenshotImage,
  onClearScreenshotImage,
  paperText = ''
}) {
  const [activeTab, setActiveTab] = useState('Assistant');

  const [messages, setMessages] = useState([
    { role: 'assistant', text: "Hello! I'm ready to analyze this paper." }
  ]);

  const [pinnedHeight, setPinnedHeight] = useState(180);

 
  const historyLoadedRef = useRef(false);
  useEffect(() => {
    if (activeTab !== 'Assistant') return;
    if (historyLoadedRef.current) return;

    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch('http://localhost:3000/user-data', {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`GET /user-data failed: ${res.status}`);
        const data = await res.json();

        const history = data.assistantChats || [];

        setMessages((prev) => {
          if (history.length > 0) return history;
          return prev;
        });

        historyLoadedRef.current = true;
      } catch (e) {
        if (e.name !== 'AbortError') console.error('Failed to load chat history:', e);
      }
    })();

    return () => controller.abort();
  }, [activeTab]);

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
        {activeTab === 'Discovery' ? (
          <DiscoveryList />
        ) : (
          <>
            <HelperCards activeTab={activeTab} />
            <Messages activeTab={activeTab} messages={messages} />
          </>
        )}
      </div>

      {activeTab !== 'Discovery' && (
      <div className="chat-input-area">
        <UserInput
          inputText={inputText}
          setInputText={setInputText}
          selectedTextId={selectedTextId}
          selectedText={selectedText}
          screenshotId={screenshotId}
          screenshotImage={screenshotImage}
          onUserMessage={addUser}
          onResponse={addAssistant}
          paperText={paperText}
        />
      </div>
      )}
    </aside>
  );
}
