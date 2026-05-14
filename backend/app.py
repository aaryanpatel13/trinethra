import json
import os
import re

import requests
from flask import Flask, jsonify, render_template, request
from flask_cors import CORS

# ─────────────────────────────────────────
# APP SETUP
# Pointing Flask to the frontend folder
# so we can serve index.html directly
# from localhost:5000
# ─────────────────────────────────────────
app = Flask(
    __name__,
    template_folder=os.path.join(os.path.dirname(__file__), '..', 'frontend'),
    static_folder=os.path.join(os.path.dirname(__file__), '..', 'frontend'),
    static_url_path=''
)
CORS(app)  # allows the browser to call our API from any origin

OLLAMA_URL   = "http://localhost:11434/api/generate"
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "llama3.2")

# ─────────────────────────────────────────
# LOAD RUBRIC AT STARTUP
# We load rubric.json once when the server
# starts — no need to read the file on
# every request
# ─────────────────────────────────────────
RUBRIC_PATH = os.path.join(os.path.dirname(__file__), 'rubric.json')
with open(RUBRIC_PATH, 'r') as f:
    RUBRIC = json.load(f)


# ─────────────────────────────────────────
# ROUTES
# ─────────────────────────────────────────

@app.route('/')
def index():
    # Serve the frontend directly from Flask
    return app.send_static_file('index.html')


@app.route('/api/health', methods=['GET'])
def health():
    """
    Quick check — is Ollama reachable?
    Intern can hit /api/health in the browser
    to confirm setup is working before pasting
    a transcript.
    """
    try:
        r = requests.get("http://localhost:11434/api/tags", timeout=5)
        models = [m['name'] for m in r.json().get('models', [])]
        return jsonify({
            "status": "ok",
            "ollama": "connected",
            "model": OLLAMA_MODEL,
            "available_models": models
        })
    except Exception:
        return jsonify({
            "status": "degraded",
            "ollama": "not reachable — run: ollama serve"
        }), 503


@app.route('/api/analyze', methods=['POST'])
def analyze():
    """
    Main route. Receives a transcript, sends it
    to Ollama with a structured prompt, parses
    the response, and returns the analysis.
    """
    from prompt import build_prompt
    from parser import parse_llm_response

    data       = request.get_json()
    transcript = data.get('transcript', '').strip()

    # ── Validation ──────────────────────────
    if not transcript:
        return jsonify({"error": "Transcript is empty."}), 400

    if len(transcript) < 50:
        return jsonify({
            "error": "Transcript too short — paste the full supervisor conversation."
        }), 400

    # ── Build prompt ─────────────────────────
    prompt = build_prompt(transcript, RUBRIC)

    # ── Call Ollama ──────────────────────────
    try:
        ollama_resp = requests.post(
            OLLAMA_URL,
            json={
                "model":  OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.2,   # low = consistent structured output
                    "num_predict": 2048
                }
            },
            timeout=120   # transcripts can be long; give Ollama time
        )
        ollama_resp.raise_for_status()

    except requests.exceptions.ConnectionError:
        return jsonify({
            "error": "Cannot connect to Ollama. Run: ollama serve"
        }), 503

    except requests.exceptions.Timeout:
        return jsonify({
            "error": "Ollama timed out. Try a shorter transcript or a smaller model."
        }), 504

    # ── Parse response ───────────────────────
    raw_text = ollama_resp.json().get('response', '')
    parsed   = parse_llm_response(raw_text)

    if 'parse_error' in parsed:
        return jsonify({
            "error": "Could not parse LLM output.",
            "raw":   parsed.get('raw_response', '')
        }), 500

    return jsonify(parsed)


# ─────────────────────────────────────────
# RUN
# ─────────────────────────────────────────
if __name__ == '__main__':
    print(f"  Model : {OLLAMA_MODEL}")
    print(f"  Ollama: {OLLAMA_URL}")
    print()
    app.run(debug=True, port=5000)