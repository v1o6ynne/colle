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
  screenshotImage = '',
  paperText = '',
  textAnchor = null,
  screenshotAnchor = null
}) {
  const [loading, setLoading] = useState(false);

  
  const buildPromptForLLM = (question) => {
    if (!selectedText) return question;

    return `Context:\n\n${selectedText}\n\nUser question:\n${question}`;
  };

  const saveScreenshotIfNeeded = async () => {
    if (!screenshotId || !screenshotImage) return;
    console.log("[screenshot anchor debug]",
    { screenshotAnchor, currentPage: window.__pdfCurrentPage}
  );

    const screenshotObj = {
    id: screenshotId,
    imageDataUrl: screenshotImage,
    anchor: screenshotAnchor || { type: "screenshot", pageNumber: window.__pdfCurrentPage || 1 },
    createdAt: new Date().toISOString(),
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

  const saveHighlightIfNeeded = async () => {
    if (!selectedText || !selectedTextId) return;


    const highlightObj = {
      id: selectedTextId,
      text: selectedText,
      anchor: textAnchor || { type: "text" },
      createdAt: new Date().toISOString()
    };

    const currentRes = await fetch('http://localhost:3000/user-data');
    const current = await currentRes.json();

    const exists = (current.highlights || []).some(
      (h) => h.id === selectedTextId
    );
    if (exists) return;

    await fetch('http://localhost:3000/user-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'patch',
        data: {
          highlights: [...(current.highlights || []), highlightObj]
        }
      })
    });
  };

  const sendMessage = async () => {
    const question = inputText.trim();
    if (!question || loading) return;

    // onUserMessage?.(question,refs);
    const refs = [];

    setInputText('');
    setLoading(true);

    try {
      await saveScreenshotIfNeeded();
      await saveHighlightIfNeeded();

      onUserMessage?.(question,refs);

      

      // const form = new FormData();
      // form.append('prompt', buildPromptForLLM(question));


      

      if (selectedText && selectedTextId) {
        refs.push({
          id: selectedTextId,
          label: selectedText.slice(0, 30),
          anchor: {
            type: 'text'
          }
        });
      }

      const form = new FormData();
      form.append('prompt', buildPromptForLLM(question));

      if (screenshotId && screenshotImage) {
        refs.push({
          id: screenshotId,
          label: 'Screenshot',
          anchor: { type: 'screenshot' }
        });

        form.append('imageDataUrl', screenshotImage);
      }

      form.append('refs', JSON.stringify(refs));

      // Find discover-related-content in parallel when we have paper text and selection
      const hasSelection = selectedText?.trim() || screenshotImage;
      if (paperText.trim() && hasSelection) {
        const discoverPayload = {
          paperText: paperText.trim(),
          selectedTexts: selectedText?.trim() ? [selectedText.trim()] : [],
          imageDataUrls: screenshotImage ? [screenshotImage] : []
        };
        fetch('http://localhost:3000/discover-related-content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(discoverPayload)
        }).catch((err) => console.error('discover-related-content:', err));
      }

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

      onResponse?.(data.text || '(No response)', data.refs || refs)
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
