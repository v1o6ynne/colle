
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
  figures: [],
  flashcards: []
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
  return JSON.parse(raw);
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
4. Only add references when they genuinely help the reader locate supporting content in the paper. Do not over-reference.
5. Keep answers clear and concise. Use bullet points or short paragraphs when appropriate.`;

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
    res.json({ text: result.text, images: result.images, refs });
  } catch (error) {
    console.error("ASSISTANT_CHAT_ERROR:", error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

app.post('/figure-description', upload.single('imageFile'), async (req, res) => {
  try {
    if (!req.file && !req.body.imageDataUrl) {
      return res.status(400).json({ error: 'Missing image' });
    }
    const caption = req.body.caption || '';
    const parts = [
      { text: `Generate a concise description of the figure in one-paragraph for low-vision readers. Caption: ${caption}` }
    ];

    if (req.file) {
      parts.push({
        inlineData: {
          mimeType: req.file.mimetype,
          data: req.file.buffer.toString('base64')
        }
      });
    } else {
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
    res.json({ text: result.text, images: result.images });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/flashcard', upload.single('imageFile'), async (req, res) => {
  try {
    const highlightedFigure = req.body.highlighted_figure || '';
    const highlightedText = req.body.highlighted_text || '';
    const userNote = req.body.user_note || '';
    const userAiInteraction = req.body.user_ai_interaction || '';
    const paper = req.body.paper || '';

    const prompt = `Please extract the core theme and key points from the input PDF, highlighted content and the notes, and generate an infographic in a cute digital cartoon style:
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

paper:${paper}
metadata:${JSON.stringify({
      highlighted_figure: highlightedFigure,
      highlighted_text: highlightedText,
      user_note: userNote,
      user_ai_interaction: userAiInteraction
    })}`;

    const parts = [{ text: prompt }];
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
      model: FLASHCARD_MODEL,
      contents: [{ role: 'user', parts }]
    });
    const result = extractGeminiParts(response);
    res.json({ text: result.text, images: result.images });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
