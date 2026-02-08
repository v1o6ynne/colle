import React, { useState } from 'react';
import { ArrowUp } from 'lucide-react';

export default function UserInput({
  inputText,
  setInputText,
  onResponse,
  onUserMessage,
  selectedText = '',
  screenshotId = '',
  screenshotImage = ''
}) {
  const [loading, setLoading] = useState(false);

  const buildPrompt = (prompt) => {
    if (!selectedText) return prompt;
    return `Context:\n\n${selectedText}\n\n-------------------------\n\nUser question:\n${prompt}\n`;
  };

  // ✅ 只在“问 AI”时把截图写进 user-data（并且用 screenshotId，保证一致）
  const saveScreenshotIfNeeded = async () => {
    // 没有截图就不存
    if (!screenshotId || !screenshotImage) return;

    const screenshotObj = {
      id: screenshotId, // ✅ ID 一致（和 refs 里用同一个）
      imageDataUrl: screenshotImage,
      anchor: { type: 'screenshot' },
      createdAt: new Date().toISOString()
    };

    const currentRes = await fetch('http://localhost:3000/user-data');
    const current = await currentRes.json();

    // ✅ 避免重复存同一张（按 id 去重）
    const exists = (current.screenshots || []).some((s) => s.id === screenshotId);
    if (exists) return;

    const nextScreenshots = [...(current.screenshots || []), screenshotObj];

    const saveRes = await fetch('http://localhost:3000/user-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'patch',
        data: { screenshots: nextScreenshots }
      })
    });

    if (!saveRes.ok) {
      const raw = await saveRes.text();
      throw new Error(raw || 'save screenshot failed');
    }
  };

  const sendMessage = async () => {
    const prompt = inputText.trim();
    if (!prompt || loading) return;

    onUserMessage?.(prompt);
    setInputText('');
    setLoading(true);

    try {
      // ✅ 先存截图（只在问 AI 时）
      await saveScreenshotIfNeeded();

      const form = new FormData();

      // ✅ prompt
      form.append('prompt', buildPrompt(prompt));

      // ✅ refs（截图 ref 的 id = screenshotId，和 screenshots[].id 一致）
      const refs = [];
      if (selectedText) {
        refs.push({
          id: `ctx-text-${Date.now()}`,
          label: selectedText.slice(0, 60),
          anchor: { type: 'text' }
        });
      }
      if (screenshotImage && screenshotId) {
        refs.push({
          id: screenshotId, // ✅ 一致
          label: 'Screenshot',
          anchor: { type: 'screenshot' }
        });
        // ✅ image
        form.append('imageDataUrl', screenshotImage);
      }
      form.append('refs', JSON.stringify(refs));

      const res = await fetch('http://localhost:3000/assistant-chat', {
        method: 'POST',
        body: form
      });

      // ✅ 避免 500 时 res.json() 报 Unexpected end of JSON input
      const raw = await res.text();
      let data = {};
      try {
        data = JSON.parse(raw);
      } catch {
        throw new Error(raw || `Server error ${res.status}`);
      }

      if (!res.ok) throw new Error(data?.error || `Server error ${res.status}`);

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
