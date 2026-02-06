# Backend API Manual

## Overview

The backend is a Node.js/Express server that provides AI-powered endpoints for the ACM Paper Assistant Chrome extension. It uses the Google Gemini API for text generation, image description, and flashcard image generation, and persists user data to a local JSON file.

## Prerequisites

- **Node.js** v18 or later (v22 recommended)
- A **Google Gemini API key** (obtain from [Google AI Studio](https://aistudio.google.com/apikey))

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file in the project root:

```
genai_api_key=YOUR_GEMINI_API_KEY_HERE
```

The server reads the API key from environment variables in this order: `GEMINI_API_KEY`, `genai_api_key`, `API_KEY`. Only one needs to be set.

3. Start the server:

```bash
node server.js
```

The server runs on `http://localhost:3000`.

## Files

| File | Description |
|------|-------------|
| `server.js` | Main Express server with all API endpoints |
| `gemini-utils.js` | Helper to extract text and images from Gemini API responses |
| `package.json` | Dependencies |
| `.env` | API key configuration (not committed) |
| `data/users/default.json` | Auto-created user data store |

## API Endpoints

### 1. GET `/user-data`

Retrieve all saved user data.

**Response:**

```json
{
  "highlights": [],
  "screenshots": [],
  "assistantChats": [],
  "notes": [],
  "figures": [],
  "flashcards": []
}
```

---

### 2. POST `/user-data`

Save or patch user data.

**Content-Type:** `application/json`

**Request body:**

```json
{
  "mode": "patch",
  "data": {
    "notes": [{ "id": "note-1", "highlightId": "h-1", "highlightText": "...", "annotation": "..." }]
  }
}
```

- `mode`: `"patch"` merges incoming fields into existing data. Omit or use any other value to replace entirely.
- `data`: The user data object (any subset of fields).

**Response:** The saved user data object.

---

### 3. POST `/assistant-chat`

Send a question to the AI assistant. The assistant is prompted to focus on the user's context and embed inline paper references in `[ref: Heading]` format.

**Content-Type:** `multipart/form-data`

**Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `prompt` | string | Yes | The user's question. May include `Context: ...` prefix with highlighted text. |
| `refs` | string (JSON) | No | JSON array of reference objects from the extension. |
| `imageFile` | file | No | An image file to include as context. |
| `imageDataUrl` | string | No | Base64 data URL of an image (alternative to file upload). |

**Response:**

```json
{
  "text": "The paper discusses... [ref: Abstract] ...",
  "images": [],
  "refs": []
}
```

- `text`: The AI response. May contain `[ref: Heading]` markers that the frontend renders as navigable buttons.
- `images`: Array of base64 data URLs (typically empty for text responses).
- `refs`: Echo of the input refs.

---

### 4. POST `/figure-description`

Generate an AI description of a paper figure for accessibility.

**Content-Type:** `multipart/form-data`

**Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `caption` | string | No | The figure's caption text from the paper. |
| `imageFile` | file | No | The figure image file. One of `imageFile` or `imageDataUrl` is required. |
| `imageDataUrl` | string | No | Base64 data URL of the figure image. |

**Response:**

```json
{
  "text": "This figure shows a bar chart illustrating...",
  "images": []
}
```

---

### 5. POST `/flashcard`

Generate a visual flashcard infographic from paper content, highlights, and notes.

**Content-Type:** `multipart/form-data`

**Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `highlighted_figure` | string (JSON) | No | JSON object of the selected figure. |
| `highlighted_text` | string | No | Text the user highlighted in the paper. |
| `user_note` | string | No | The user's most recent note/annotation. |
| `user_ai_interaction` | string | No | The most recent assistant message. |
| `paper` | string | No | Paper content or metadata. |
| `imageFile` | file | No | An image file (e.g., the selected figure). |
| `imageDataUrl` | string | No | Base64 data URL of an image. |

**Response:**

```json
{
  "text": "Key concepts summary...",
  "images": ["data:image/png;base64,..."]
}
```

- `text`: Text summary extracted by the model.
- `images`: Array of generated infographic images as base64 data URLs.

## AI Models

| Purpose | Model | Configured In |
|---------|-------|---------------|
| Assistant chat | `gemini-3-flash-preview` | `TEXT_MODEL` in `server.js` |
| Figure description | `gemini-3-flash-preview` | `TEXT_MODEL` in `server.js` |
| Flashcard generation | `gemini-3-pro-image-preview` | `FLASHCARD_MODEL` in `server.js` |

To change models, edit the `TEXT_MODEL` and `FLASHCARD_MODEL` constants at the top of `server.js`.

## Data Storage

User data is stored as a single JSON file at `data/users/default.json`. The file is auto-created on first request. The data schema:

```json
{
  "highlights": [
    { "id": "highlight-...", "text": "...", "anchor": { "type": "text", "highlightId": "..." }, "createdAt": "..." }
  ],
  "screenshots": [
    { "id": "screenshot-...", "imageDataUrl": "data:image/png;base64,...", "anchor": { "type": "screenshot", "rect": {} }, "createdAt": "..." }
  ],
  "assistantChats": [
    { "role": "user|assistant", "text": "...", "refs": [] }
  ],
  "notes": [
    { "id": "note-...", "highlightId": "...", "highlightText": "...", "annotation": "...", "createdAt": "..." }
  ],
  "figures": [
    { "id": "figure-0", "src": "https://...", "caption": "...", "aiDescription": "..." }
  ],
  "flashcards": [
    { "id": "flashcard-...", "imageDataUrl": "data:image/png;base64,...", "text": "...", "metadata": {} }
  ]
}
```

## Error Handling

All endpoints return errors in this format:

```json
{
  "error": "Error description"
}
```

Common errors:
- `400` -- Missing required fields (e.g., no prompt, no image).
- `500` -- Server error or Gemini API failure.
- `429` (from Gemini) -- Rate limit exceeded. Retry after the delay indicated in the error message.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Google Gemini API key (highest priority) |
| `genai_api_key` | Google Gemini API key (second priority) |
| `API_KEY` | Fallback API key |
