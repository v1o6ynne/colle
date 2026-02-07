import React, { useState } from 'react';
import { ArrowUp } from 'lucide-react';

export default function UserInput({
  inputText,
  setInputText,
  onResponse,
  onUserMessage,
  selectedTexts = [],
  screenshotImages = []
}) {

  const [loading, setLoading] = useState(false);

  const buildPrompt = (prompt) => {
    if (!selectedTexts.length) return prompt;

    const contextBlock = selectedTexts
      .map((t, i) => `[Selection ${i + 1}]\n${t}`)
      .join('\n\n');

    return `
Context:

${contextBlock}

-------------------------

User question:
${prompt}
`;
  };

  const sendMessage = async () => {

    const prompt = inputText.trim();
    if (!prompt || loading) return;


    onUserMessage?.(prompt);

    setInputText('');
    setLoading(true);

    try {
      const form = new FormData();

      form.append("prompt", buildPrompt(prompt));

      for (const imageDataUrl of screenshotImages) {
        form.append("imageDataUrl", imageDataUrl);
      }

      const res = await fetch("http://localhost:3000/assistant-chat", {
        method: "POST",
        body: form
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || `Server error ${res.status}`);
      }

      onResponse?.(data.text || "(No response)");

    } catch (err) {
      console.error(err);
      onResponse?.("⚠️ Failed to reach assistant.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
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
        placeholder={loading ? "Waiting for response..." : "Ask questions about the paper..."}
        rows="1"
      />

      <button
        className="send-btn"
        onClick={sendMessage}
        disabled={loading}
      >
        <ArrowUp size={18} />
      </button>

    </div>
  );
}
