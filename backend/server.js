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

const allowedOrigins = new Set([
  "http://localhost:5173",
  "https://colle-two.vercel.app",
]);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);               // allow curl/postman
    if (origin.endsWith(".vercel.app")) return cb(null, true); // allow preview URLs
    if (allowedOrigins.has(origin)) return cb(null, true);
    return cb(new Error("Not allowed by CORS: " + origin), false);
  },
  methods: ["GET", "POST", "OPTIONS"],
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
  related: [],
  discoveries: []
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
  if (!Array.isArray(data.discoveries)) data.discoveries = [];
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
REFS: [{"sectionRef": "Section heading", "quote": "exact phrase from paper", "explanation":"..."}]`;

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
      if (dataUrl && typeof dataUrl === 'string') items.push({ type: 'image', value: dataUrl });
    });

    const results = await Promise.all(
      items.map((item) =>
        item.type === 'text'
          ? discoverRelatedContent(paperText, item.value, { isImage: false })
          : discoverRelatedContent(paperText, null, {
              isImage: true,
              inlineData: dataUrlToInlineData(item.value)
            })
      )
    );

    const userData = await readUserData();
    if (!Array.isArray(userData.discoveries)) userData.discoveries = [];
    results.forEach((r, i) => {
      const item = items[i];
      const refs = (r.refs || []).map((ref) => ({
        sectionRef: ref.sectionRef || ref.section_ref || '',
        quote: ref.quote || '',
        explanation: ref.explanation || ref.reason || '',
        liked: null
      }));
      userData.discoveries.push({
        selectionType: item.type,
        selectionContent: item.value,
        related: { text: r.text || '', refs }
      });
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

const FLASHCARD_PROMPT = `You are creating a VISUAL THINKING CARD from the user's reading session. The user has provided:
1) Selected text excerpts they highlighted from the paper
2) Screenshot images they captured from the paper
3) Their assistant chat (questions and answers)
4) For each selection, "related" passages (why other parts of the paper connect to it)

Your task: Generate ONE image that illustrates the most important take-aways from this session.

CRITICAL RULES:
- Do NOT redraw, replace, or alter the user's original screenshots or selected text. They must appear in your output exactly as provided (same content, same layout where possible).
- ADD annotations, coloring, and overlays ON the provided material: highlights, underlines, circles, arrows, callout boxes, labels, and short captions to emphasize key concepts, connections, and main take-aways.
- Use a consistent visual language: soft colors (e.g. light green, sky blue, yellow, pink) for highlights and annotations so the original content stays readable.
- Integrate the selected text excerpts into the layout (as quote blocks or panels) and add coloring or underlining to stress important phrases.
- If multiple screenshots are provided, include them in the card and add annotations on each to show what matters and how it links to the rest.
- Summarize the main take-aways from the assistant chat and related content as short labels or a small "Key points" area, with arrows or numbers pointing to the relevant parts of the screenshots/text.
- Keep the overall layout clear and scannable (e.g. horizontal 3:4). Use white or very light background. Make it feel like an annotated study sheet, not a replacement of the source material.`;

app.post('/flashcard', upload.single('imageFile'), async (req, res) => {
  try {
    const userData = await readUserData();

    const textParts = [];
    const imageParts = [];

    const screenshots = userData.screenshots || [];
    const discoveries = userData.discoveries || [];
    const assistantChats = userData.assistantChats || [];
    const highlights = userData.highlights || [];

    discoveries.forEach((d, i) => {
      const related = d.related || { text: '', refs: [] };
      const refs = related.refs || [];
      textParts.push(
        `[Selection ${i + 1}] ${d.selectionType === 'text' ? 'Selected text' : 'Screenshot'}:`
      );
      if (d.selectionType === 'text') {
        textParts.push(`"${(d.selectionContent || '').slice(0, 500)}"`);
      }
      textParts.push(`Related: ${related.text || '(none)'}`);
      refs.forEach((r) => {
        textParts.push(`  - ${r.sectionRef || ''}: "${(r.quote || '').slice(0, 80)}"`);
      });
    });

    if (highlights.length) {
      textParts.push('\n--- Additional highlights from the paper ---');
      highlights.slice(0, 20).forEach((h) => {
        const t = typeof h === 'string' ? h : (h.text || h.content || '');
        if (t) textParts.push(`- ${t.slice(0, 200)}`);
      });
    }

    if (assistantChats.length) {
      textParts.push('\n--- Assistant chat (Q&A) ---');
      assistantChats.slice(-12).forEach((m) => {
        textParts.push(`${m.role === 'user' ? 'Q' : 'A'}: ${(m.text || '').slice(0, 300)}`);
      });
    }

    const contextBlock = textParts.join('\n');
    const prompt = `${FLASHCARD_PROMPT}\n\nContext from the user's session:\n${contextBlock}`;

    const seenUrls = new Set();
    screenshots.forEach((s) => {
      const url = s.imageDataUrl || s.screenshotDataUrl;
      if (url && !seenUrls.has(url)) {
        seenUrls.add(url);
        const inline = dataUrlToInlineData(url);
        if (inline) imageParts.push(inline);
      }
    });
    discoveries.forEach((d) => {
      if (d.selectionType === 'image' && d.selectionContent && d.selectionContent.startsWith('data:') && !seenUrls.has(d.selectionContent)) {
        seenUrls.add(d.selectionContent);
        const inline = dataUrlToInlineData(d.selectionContent);
        if (inline) imageParts.push(inline);
      }
    });

    const parts = [{ text: prompt }, ...imageParts];

    const response = await callGemini({
      model: FLASHCARD_MODEL,
      contents: [{ role: 'user', parts }]
    });
    const result = extractGeminiParts(response);

    userData.flashcards = userData.flashcards || [];
    userData.flashcards.push({
      id: `flashcard-${Date.now()}`,
      imageDataUrl: result.images?.[0] || '',
      text: result.text || '',
      metadata: { fromUserData: true }
    });
    await writeUserData(userData);

    res.json({ text: result.text, images: result.images });
  } catch (error) {
    console.error('flashcard:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

