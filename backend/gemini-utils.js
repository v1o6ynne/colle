function extractGeminiParts(payload) {
  const parts = payload?.parts || payload?.candidates?.[0]?.content?.parts || [];
  const text = parts
    .filter((part) => part.text)
    .map((part) => part.text)
    .join('\n');
  const images = parts
    .map((part) => part.inlineData || part.inline_data)
    .filter((inline) => inline?.data)
    .map((inline) => {
      const mimeType = inline.mimeType || inline.mime_type;
      return `data:${mimeType};base64,${inline.data}`;
    });
  return { text, images };
}

module.exports = { extractGeminiParts };
