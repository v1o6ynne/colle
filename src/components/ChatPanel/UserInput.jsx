import React, { useState } from 'react';
import { ArrowUp } from 'lucide-react';

export default function UserInput({
  inputText,
  setInputText,
  onResponse,
  onUserMessage,
  selectedText,
  screenshotImage
}) {

  const [loading, setLoading] = useState(false);

  const buildPrompt = (prompt) => {
    if (!selectedText) return prompt;

    return `
Context from highlighted paper text:

${selectedText}

-------------------------

User question:
${prompt}
`;
  };

  const sendMessage = async () => {

    const prompt = inputText.trim();
    if (!prompt || loading) return;

    // ⭐ 立即显示用户消息
    onUserMessage?.(prompt);

    setInputText('');
    setLoading(true);

    try {
      const form = new FormData();

      // ⭐⭐⭐ 关键：拼上下文
      form.append("prompt", buildPrompt(prompt));

      if (screenshotImage)
        form.append("imageDataUrl", screenshotImage);

      const res = await fetch("http://localhost:3000/assistant-chat", {
        method: "POST",
        body: form
      });

      if (!res.ok)
        throw new Error(`Server error ${res.status}`);

      const data = await res.json();

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
