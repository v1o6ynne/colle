const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs/promises');
const { extractGeminiParts } = require('./gemini-utils');
require('dotenv').config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.genai_api_key || process.env.API_KEY;
const TEXT_MODEL = 'gemini-3-flash-preview';
const FLASHCARD_MODEL = 'gemini-3-pro-image-preview';

const upload = multer({ storage: multer.memoryStorage() });
const app = express();

app.use(cors({
  origin: ['http://localhost:5173'],
  methods: ['GET', 'POST', 'OPTIONS'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const USER_DATA_PATH = path.join(__dirname, 'data', 'users', 'default.json');

const defaultUserData = () => ({
  highlights: [],
  screenshots: [],
  assistantChats: [],
  notes: [],
  noteCards: [],
  flashcards: [],
  related: []
});

async function ensureUserData() {
  await fs.mkdir(path.dirname(USER_DATA_PATH), { recursive: true });
  try {
    await fs.access(USER_DATA_PATH);
  } catch (error) {
    await fs.writeFile(USER_DATA_PATH, JSON.stringify(defaultUserData(), null, 2));
  }
}

async function readUserData() {
  await ensureUserData();
  const raw = await fs.readFile(USER_DATA_PATH, 'utf8');
  const data = JSON.parse(raw);
  if (!Array.isArray(data.related)) data.related = [];
  return data;
}

async function writeUserData(data) {
  await fs.writeFile(USER_DATA_PATH, JSON.stringify(data, null, 2));
  return data;
}

function parseJsonField(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

function dataUrlToInlineData(dataUrl) {
  if (!dataUrl) return null;
  const match = dataUrl.match(/^data:(.+);base64,(.*)$/);
  if (!match) return null;
  return {
    inlineData: {
      mimeType: match[1],
      data: match[2]
    }
  };
}

let genaiClientPromise = null;

async function getGenAIClient() {
  if (!GEMINI_API_KEY) {
    throw new Error('Missing GEMINI_API_KEY or API_KEY in .env');
  }
  if (!genaiClientPromise) {
    genaiClientPromise = import('@google/genai')
      .then(({ GoogleGenAI }) => new GoogleGenAI({ apiKey: GEMINI_API_KEY }));
  }
  return genaiClientPromise;
}

async function callGemini({ model, contents }) {
  const ai = await getGenAIClient();
  return ai.models.generateContent({ model, contents });
}

const DISCOVER_RELATED_PROMPT = (paperText, isImage) => `You are given the full text of an academic paper and one ${isImage ? 'screenshot/figure from the paper' : 'text selection from the paper'}.

Full paper text (by sections):
---
${paperText}
---

User selection: ${isImage ? '[See the attached image]' : '[See below]'}

Your task: Find the 3 most related sections or passages in the paper to this selection. For each of the 3 sections:
1. Identify the section (heading or short label, e.g. "Abstract", "Methodology", "Figure 2").
2. Quote a short exact phrase (8–20 words) from the paper that pinpoints the passage.
3. Explain why it is related: is it the same concept, impact, implementation detail, limitation, definition, or something else?

Format your response as clear prose (reasoning first, then the 3 sections with the above). At the very end, output a single JSON array of refs so we can link to the paper. Use this exact format on the last line:
REFS: [{"sectionRef": "Section heading", "quote": "exact phrase from paper"}]`;

async function discoverRelatedContent(paperText, selection, options = {}) {
  const { isImage = false, inlineData = null } = options;
  const parts = [{ text: DISCOVER_RELATED_PROMPT(paperText, isImage) }];
  if (isImage && inlineData) {
    parts.push(inlineData);
  } else if (!isImage && typeof selection === 'string' && selection.trim()) {
    parts[0].text += `\n\nSelected text:\n"${selection.trim()}"`;
  } else if (isImage) {
    return { text: '', refs: [] };
  }

  const response = await callGemini({
    model: TEXT_MODEL,
    contents: [{ role: 'user', parts }]
  });
  const result = extractGeminiParts(response);
  const text = result.text || '';

  let refs = [];
  const refsMatch = text.match(/REFS:\s*(\[[\s\S]*?\])\s*$/m);
  if (refsMatch) {
    try {
      refs = JSON.parse(refsMatch[1].trim());
    } catch (e) {
      refs = [];
    }
  }

  return { text, refs };
}

app.post('/discover-related-content', async (req, res) => {
  try {
    const paperText = (req.body.paperText || '').trim();
    const selectedTexts = Array.isArray(req.body.selectedTexts) ? req.body.selectedTexts : [];
    const imageDataUrls = Array.isArray(req.body.imageDataUrls) ? req.body.imageDataUrls : [];

    if (!paperText) {
      return res.status(400).json({ error: 'Missing paperText' });
    }
    if (selectedTexts.length === 0 && imageDataUrls.length === 0) {
      return res.status(400).json({ error: 'Provide at least one selectedText or imageDataUrl' });
    }

    const items = [];
    selectedTexts.forEach((t) => {
      if (typeof t === 'string' && t.trim()) items.push({ type: 'text', value: t.trim() });
    });
    imageDataUrls.forEach((dataUrl) => {
      const inlineData = dataUrlToInlineData(dataUrl);
      if (inlineData) items.push({ type: 'image', value: inlineData });
    });

    const results = await Promise.all(
      items.map((item) =>
        item.type === 'text'
          ? discoverRelatedContent(paperText, item.value, { isImage: false })
          : discoverRelatedContent(paperText, null, { isImage: true, inlineData: item.value })
      )
    );

    const userData = await readUserData();
    if (!Array.isArray(userData.related)) userData.related = [];
    results.forEach((r) => {
      userData.related.push({ role: 'assistant', text: r.text || '', refs: r.refs || [] });
    });
    await writeUserData(userData);

    res.json({ ok: true, count: results.length });
  } catch (error) {
    console.error('discover-related-content:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/user-data', async (req, res) => {
  try {
    const data = await readUserData();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/user-data', async (req, res) => {
  try {
    const mode = req.body?.mode;
    const incoming = req.body?.data || req.body;
    const current = await readUserData();
    const next = mode === 'patch' ? { ...current, ...incoming } : incoming;
    const saved = await writeUserData(next);
    res.json(saved);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const ASSISTANT_SYSTEM_PROMPT = `You are a research paper reading assistant. Your role is to help the user understand the paper they are reading.

Rules:
1. Focus on the user's question and any context they provide (highlighted text from the paper). Answer concisely and directly.
2. When your answer refers to specific parts of the paper, insert an inline reference using this exact format: [ref: Short Heading]. The heading should be a concise label (2-5 words) that identifies the relevant section, figure, or concept in the paper. Examples: [ref: Abstract], [ref: Figure 3], [ref: Related Work], [ref: Methodology], [ref: Results Table].
3. Place references naturally within the text, right after the claim or statement they support. Do not group all references at the end.
4. Keep answers clear and concise. Use bullet points or short paragraphs when appropriate.`;

app.post('/assistant-chat', upload.single('imageFile'), async (req, res) => {
  try {
    const prompt = req.body.prompt || req.body.message;
    if (!prompt) {
      return res.status(400).json({ error: 'Missing prompt' });
    }
    const refs = parseJsonField(req.body.refs, []);
    const parts = [{ text: `${ASSISTANT_SYSTEM_PROMPT}\n\n${prompt}` }];

    if (req.file) {
      parts.push({
        inlineData: {
          mimeType: req.file.mimetype,
          data: req.file.buffer.toString('base64')
        }
      });
    } else if (req.body.imageDataUrl) {
      const inlineData = dataUrlToInlineData(req.body.imageDataUrl);
      if (inlineData) {
        parts.push(inlineData);
      }
    }

    const response = await callGemini({
      model: TEXT_MODEL,
      contents: [{ role: 'user', parts }]
    });
    const result = extractGeminiParts(response);

    const userData = await readUserData();
    userData.assistantChats.push({ role: 'user', text: prompt, refs });
    userData.assistantChats.push({ role: 'assistant', text: result.text || '', refs });
    await writeUserData(userData);

    res.json({ text: result.text, images: result.images, refs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/screenshot-analyze', upload.single('imageFile'), async (req, res) => {
  try {
    if (!req.body.imageDataUrl) {
      return res.status(400).json({ error: 'Missing screenshot image' });
    }
    const paperText = req.body.paperText || '[]';
    const parts = [
      { text: `You are a research paper analyst. You are given a screenshot taken from an academic paper and the full text of the paper organized by sections.

Your task: Go through EVERY section of the paper thoroughly. Find all passages that are relevant to, discuss the same topic as, explain, elaborate on, or provide context for the content visible in this screenshot. Think about what concept, method, result, or figure the screenshot shows, then find everywhere in the paper that discusses the same thing.

Consider all types of relevance:
- Passages that define or introduce the concept shown in the screenshot
- Methodology sections that describe how what's shown was done
- Results or findings that relate to the content in the screenshot
- Discussion passages that interpret or contextualize the screenshot content
- Related work that references similar concepts
- Any other passage in the paper that a reader would benefit from reading alongside this screenshot

For each relevant passage, return:
- "text": A 1-3 sentence summary of why this passage is relevant and what it says
- "sectionRef": The exact section heading from the paper where this passage appears
- "quote": An exact short phrase (8-15 words) copied verbatim from the paper text that uniquely identifies where this passage is, so the reader can locate it precisely

Return a JSON array of these objects. Return 3-8 highlights, ordered from most to least relevant. Cover different sections of the paper — do not cluster all highlights from one section.

Return ONLY the JSON array, no other text.

Paper sections:
${paperText}` }
    ];

    const inlineData = dataUrlToInlineData(req.body.imageDataUrl);
    if (inlineData) {
      parts.push(inlineData);
    }

    const response = await callGemini({
      model: TEXT_MODEL,
      contents: [{ role: 'user', parts }]
    });
    const result = extractGeminiParts(response);

    let highlights = [];
    try {
      const cleaned = (result.text || '').replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      highlights = JSON.parse(cleaned);
    } catch (e) {
      highlights = [{ text: result.text || 'No relevant passages found.', sectionRef: 'Unknown' }];
    }

    res.json({ highlights });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/flashcard', upload.single('imageFile'), async (req, res) => {
  try {
    const noteCardsRaw = req.body.noteCards || '[]';
    const noteCards = parseJsonField(noteCardsRaw, []);

    let contextSummary = '';
    const imageParts = [];
    noteCards.forEach((card, i) => {
      const hlTexts = (card.highlights || []).map((h) => h.text).join('\n- ');
      contextSummary += `\n\nNote Card ${i + 1}:\nHighlights:\n- ${hlTexts}\nUser Note: ${card.userNote || '(none)'}`;
      if (card.screenshotDataUrl) {
        const inlineData = dataUrlToInlineData(card.screenshotDataUrl);
        if (inlineData) imageParts.push(inlineData);
      }
    });

    const prompt = `Please extract the core theme and key points from the selected note cards and generate an infographic in a cute digital cartoon style:
1. Visual Style:
Use a digital hand-drawn cartoon illustration style with soft, rounded lines that feel friendly and approachable. The overall visual should be lively, vivid, and suitable for easy-to-understand educational or science communication.
2. Layout and Background:
Use a horizontal (3:4) layout. The background should be pure white or a very light solid color, clean and minimal, highlighting the main information while preserving ample white space.
3. Color Scheme:
Use soft, bright macaron color tones. The primary color should be light green, complemented by sky blue, beige yellow, light orange, light pink, etc. Colors should be harmonious with moderate saturation, avoiding overly vivid or heavy tones.
4. Graphic Elements:
Add a small number of simple cartoon elements and icons with cute expressions or anthropomorphic features (e.g., smiling sun, clouds, chemical molecules) to enhance fun and visual memorability.
Use clear flowcharts, geometric shapes (such as rounded rectangles), and directional arrows to organize and guide information reading.
If there are sensitive individuals or copyrighted content, draw similar cartoon substitute figures instead, but do not refuse to generate.
5. Typography:
All images and text must follow a cartoon style. Use rounded, clear, and easy-to-read sans-serif fonts. Font colors should match the overall color palette, and avoid any realistic or photographic-style visual elements.
6. Information Presentation:
Keep information concise. Use visual design to highlight keywords and core concepts, with generous white space to ensure key points can be grasped at a glance. Emphasize the highlighted content if there is any. Unless otherwise specified, the language should match the language of the input content.

Selected note cards context:${contextSummary}`;

    const parts = [{ text: prompt }, ...imageParts];

    const response = await callGemini({
      model: FLASHCARD_MODEL,
      contents: [{ role: 'user', parts }]
    });
    const result = extractGeminiParts(response);

    const userData = await readUserData();
    userData.flashcards.push({
      id: `flashcard-${Date.now()}`,
      imageDataUrl: result.images?.[0] || '',
      text: result.text || '',
      metadata: { noteCards }
    });
    await writeUserData(userData);

    res.json({ text: result.text, images: result.images });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});