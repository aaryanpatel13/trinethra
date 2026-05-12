# Trinethra — Supervisor Feedback Analyzer

> Built as part of the DeepThought Software Developer Internship assignment.

Processing supervisor feedback manually takes 45–60 minutes per transcript. This tool brings it down to under 10.

A psychology intern pastes a supervisor's transcript, clicks "Run Analysis," and gets a structured draft — evidence extracted, Fellow scored on the 1–10 rubric, KPIs mapped, gaps flagged, and follow-up questions ready. The intern reviews everything and decides what to keep. The AI suggests; the human decides.

---

## What It Does

Paste a supervisor transcript → click "Run Analysis" → get:

- **Extracted Evidence** — specific quotes from the transcript, tagged positive / negative / neutral
- **Rubric Score** (1–10) — a suggested score with a justification that cites actual evidence, not vibes
- **KPI Mapping** — which of the 8 business KPIs the Fellow's work connects to
- **Gap Analysis** — dimensions the supervisor never mentioned (systems building, change management, etc.)
- **Follow-up Questions** — targeted questions for the next call, each tied to a specific gap

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Vanilla HTML, CSS, JavaScript |
| Backend | Python 3 + Flask |
| LLM | Ollama (llama3.2) — runs entirely on your machine, no API key, no cost |

---

## Setup Instructions

> Assumes you have Python 3 and Git installed. That's it.

### 1. Clone the repo

```bash
git clone https://github.com/aaryanpatel13/trinethra.git
cd trinethra
```

### 2. Set up Ollama

Download from [ollama.com](https://ollama.com), install it, then:

```bash
ollama pull llama3.2
ollama serve        # runs Ollama at localhost:11434
```

First pull takes a few minutes (the model is ~2 GB). After that it's instant.

### 3. Install Python dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 4. Start the backend

```bash
python app.py
# Flask running on http://localhost:5000
```

### 5. Open the app

Visit `http://localhost:5000` in your browser. Paste any of the sample transcripts from `sample-transcripts.json` to test it.

---

## Why llama3.2?

I tested with `mistral` and `phi3` as well. `llama3.2` (3B) gave the most consistent JSON output without needing format corrections. It runs comfortably on 8 GB RAM, takes 30–60 seconds per transcript, and follows structured prompts reliably. For a tool where the output gets reviewed by a human anyway, that tradeoff made sense.

---

## How It Works

```
Browser (index.html)
    │
    │  POST /api/analyze  { transcript: "..." }
    ▼
Flask Backend (app.py)
    │
    │  Builds prompt — rubric.json injected, bias warnings included
    │  POST http://localhost:11434/api/generate
    ▼
Ollama (llama3.2)
    │
    │  Returns structured JSON analysis
    ▼
Flask parses + validates (3 fallback strategies)
    │
    ▼
Browser renders the analysis — score, evidence, gaps, questions
```

---

## Design Challenges I Tackled

### Challenge 2: Structured Output Reliability

LLMs don't always return clean JSON — sometimes they add commentary, wrap output in markdown fences, or skip fields entirely. I handled this with a 3-strategy parser:

1. Direct `json.loads()` — works most of the time
2. Regex extraction — pulls the JSON block out of surrounding text
3. Markdown fence stripping — handles ` ```json ``` ` wrapping

I also set `temperature: 0.2` in the Ollama call. Lower temperature = less creativity = more consistent formatting. For a structured output task, that's exactly what you want.

### Challenge 4: Showing Uncertainty

The biggest risk with an AI-assisted tool is the intern trusting the output blindly. I designed the UI to make it obvious this is a draft:

- The score section has an explicit "AI Suggestion — review before finalizing" label
- Evidence quotes are shown with their raw source text so the intern can verify
- Gap analysis uses language like "transcript did not mention" rather than "Fellow failed at"

The goal is automation assistance, not automation replacement.

---

## What I'd Improve With More Time

- **Side-by-side view** — transcript on the left, analysis on the right, with evidence quotes that scroll to the relevant passage when clicked
- **Confidence range instead of single score** — show "6–7" when the evidence is mixed, rather than forcing false precision
- **Separate prompts for scoring vs. gap detection** — gap detection (reasoning about what's *absent*) is harder for LLMs than extraction; a focused prompt would do it better
- **Inline editing** — let the intern click any finding, edit the text, and export a finalized PDF report

---

## Project Structure

```
trinethra/
├── backend/
│   ├── app.py              # Flask server + API routes
│   ├── prompt.py           # Prompt builder — rubric + KPI injection
│   ├── parser.py           # LLM response parser with 3 fallback strategies
│   ├── rubric.json         # The 1-10 rubric as structured data
│   └── requirements.txt
├── frontend/
│   ├── index.html          # Main UI
│   ├── style.css           # Styling
│   └── app.js              # API calls + render logic
└── README.md
```