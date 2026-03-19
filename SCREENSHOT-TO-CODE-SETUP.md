# Screenshot-to-Code Setup for Edgeless Lab

**Status:** Running
**Date:** 2026-03-13

---

## Quick Start

Both services are installed and configured. To start them:

### Backend (FastAPI, port 7001)
```bash
cd /Users/djm/claude-projects/screenshot-to-code/backend
/Users/djm/claude-projects/.venv/bin/poetry run uvicorn main:app --reload --port 7001
```

### Frontend (React/Vite, port 5173)
```bash
cd /Users/djm/claude-projects/screenshot-to-code/frontend
yarn dev
```

### Access
- **UI:** http://localhost:5173
- **Backend API:** http://localhost:7001

---

## How to Use for Edgeless Lab

### Workflow

1. **Create mockups** - Use Figma, Excalidraw, or hand-drawn sketches of Edgeless Lab pages
2. **Screenshot the mockup** - Take a screenshot of the design
3. **Upload to screenshot-to-code** - Open http://localhost:5173, upload the screenshot
4. **Select stack** - Choose "React + Tailwind" for closest match to our Next.js + Tailwind stack
5. **Select model** - Use Gemini 3 Flash (free tier) or Claude Opus 4.5 for best quality
6. **Generate** - Get the code output
7. **Iterate** - Use the "update" feature to refine the generated code with follow-up instructions
8. **Extract** - Copy useful patterns into the Edgeless Lab project

### Best Practices

- Upload mockups at 1x resolution, not retina (smaller files, faster processing)
- Include the dark background in your mockup, it helps the AI understand the palette
- Use the "React + Tailwind" output stack, then adapt to Next.js App Router patterns
- For complex layouts (bento grid), break into individual card mockups first
- The tool excels at layout and structure, you will still need to tune animations and interactions manually

### API Keys Configured
- Keys copied from project `.env` to `screenshot-to-code/backend/.env`
- Available: OpenAI, Anthropic, Gemini
- Note: Anthropic has $0 credits. Use Gemini or OpenAI for generation.

---

## Mock Mode (No API Credits)

To test without using API credits:
```bash
cd /Users/djm/claude-projects/screenshot-to-code/backend
MOCK=true /Users/djm/claude-projects/.venv/bin/poetry run uvicorn main:app --reload --port 7001
```

This streams a pre-recorded response for testing the UI.
