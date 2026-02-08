import React, { useState } from 'react';
import { ArrowUp } from 'lucide-react';

export default function UserInput({
  inputText,
  setInputText,
  onResponse,
  onUserMessage,
  selectedText = '',
  selectedTextId = '',     
  screenshotId = '',
  screenshotImage = ''
}) {
  const [loading, setLoading] = useState(false);

  // ✅ 只给 LLM 用的 prompt（不会被存）
  const buildPromptForLLM = (question) => {
    if (!selectedText) return question;

    return `Context:\n\n${selectedText}\n\nUser question:\n${question}`;
  };

  // ✅ 只在“问 AI”时存截图（方案 B）
  const saveScreenshotIfNeeded = async () => {
    if (!screenshotId || !screenshotImage) return;

    const screenshotObj = {
      id: screenshotId,
      imageDataUrl: screenshotImage,
      anchor: { type: 'screenshot' },
      createdAt: new Date().toISOString()
    };

    const currentRes = await fetch('http://localhost:3000/user-data');
    const current = await currentRes.json();

    const exists = (current.screenshots || []).some(
      (s) => s.id === screenshotId
    );
    if (exists) return;

    await fetch('http://localhost:3000/user-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'patch',
        data: {
          screenshots: [...(current.screenshots || []), screenshotObj]
        }
      })
    });
  };

  const sendMessage = async () => {
    const question = inputText.trim();
    if (!question || loading) return;

    // ✅ 1. 先存“纯用户问题”（会进入 assistantChats）
    onUserMessage?.(question);

    setInputText('');
    setLoading(true);

    try {
      // ✅ 2. 问 AI 时才存截图
      await saveScreenshotIfNeeded();

      const form = new FormData();

      // ✅ 3. prompt = 给 LLM 的（含 Context）
      form.append('prompt', buildPromptForLLM(question));

      // ✅ 4. refs = Context 的结构化版本
      const refs = [];

      if (selectedText && selectedTextId) {
        refs.push({
          id: selectedTextId,
          label: selectedText,
          anchor: {
            type: 'text',
            highlightId: selectedTextId
          }
        });
      }

      if (screenshotId && screenshotImage) {
        refs.push({
          id: screenshotId,
          label: 'Screenshot',
          anchor: { type: 'screenshot' }
        });

        form.append('imageDataUrl', screenshotImage);
      }

      form.append('refs', JSON.stringify(refs));

      const res = await fetch('http://localhost:3000/assistant-chat', {
        method: 'POST',
        body: form
      });

      const raw = await res.text();
      let data;
      try {
        data = JSON.parse(raw);
      } catch {
        throw new Error(raw || `Server error ${res.status}`);
      }

      if (!res.ok) {
        throw new Error(data?.error || `Server error ${res.status}`);
      }

      onResponse?.(data.text || '(No response)');
    } catch (err) {
      console.error(err);
      onResponse?.('⚠️ Failed to reach assistant.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="input-container">
      <textarea
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={loading ? 'Waiting for response...' : 'Ask questions about the paper...'}
        rows="1"
      />
      <button className="send-btn" onClick={sendMessage} disabled={loading}>
        <ArrowUp size={18} />
      </button>
    </div>
  );
}
