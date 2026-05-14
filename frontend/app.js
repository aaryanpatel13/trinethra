
// DOM References
// Grab all elements we'll need upfront
const transcriptEl   = document.getElementById('transcript');
const analyzeBtn     = document.getElementById('analyze-btn');
const clearBtn       = document.getElementById('clear-btn');
const statusBar      = document.getElementById('status-bar');
const statusMsg      = document.getElementById('status-message');
const outputSection  = document.getElementById('output-section');

// Score card
const scoreValue         = document.getElementById('score-value');
const scoreLabel         = document.getElementById('score-label');
const scoreBand          = document.getElementById('score-band');
const scoreJustification = document.getElementById('score-justification');

// List containers
const evidenceList  = document.getElementById('evidence-list');
const kpiList       = document.getElementById('kpi-list');
const gapList       = document.getElementById('gap-list');
const questionList  = document.getElementById('question-list');



// STATUS HELPERS
// One function to update the status bar
// instead of repeating classes everywhere
function setStatus(message, type) {
  // type: 'loading' | 'error' | 'success'
  statusBar.className = type;           // applies the right color via CSS
  statusMsg.textContent = message;
  statusBar.classList.remove('hidden');
}

function hideStatus() {
  statusBar.classList.add('hidden');
  statusBar.className = 'hidden';
}



// RENDER FUNCTIONS
// One function per output card.
// Each takes the relevant slice of the
// API response and builds the HTML.


function renderScore(score) {
  scoreValue.textContent         = score.score;
  scoreLabel.textContent         = score.label;
  scoreBand.textContent          = score.band;
  scoreJustification.textContent = score.justification;
}

function renderEvidence(evidenceArr) {
  evidenceList.innerHTML = '';

  if (!evidenceArr || evidenceArr.length === 0) {
    evidenceList.innerHTML = '<p style="color:#888;font-size:0.88rem;">No evidence extracted.</p>';
    return;
  }

  evidenceArr.forEach(item => {
    const sentiment = (item.sentiment || 'neutral').toLowerCase();

    const div = document.createElement('div');
    div.className = `evidence-item ${sentiment}`;

    div.innerHTML = `
      <p class="evidence-quote">"${item.quote}"</p>
      <div class="evidence-meta">
        <span class="tag ${sentiment}">${sentiment}</span>
        <span class="evidence-dimension">${item.dimension || ''}</span>
      </div>
    `;

    evidenceList.appendChild(div);
  });
}

function renderKpis(kpiArr) {
  kpiList.innerHTML = '';

  if (!kpiArr || kpiArr.length === 0) {
    kpiList.innerHTML = '<p style="color:#888;font-size:0.88rem;">No KPIs identified.</p>';
    return;
  }

  kpiArr.forEach(item => {
    const div = document.createElement('div');
    div.className = 'kpi-item';

    div.innerHTML = `
      <span class="kpi-name">${item.kpi}</span>
      <span class="kpi-evidence">${item.evidence}</span>
    `;

    kpiList.appendChild(div);
  });
}

function renderGaps(gapArr) {
  gapList.innerHTML = '';

  if (!gapArr || gapArr.length === 0) {
    gapList.innerHTML = '<p style="color:#888;font-size:0.88rem;">No major gaps detected.</p>';
    return;
  }

  gapArr.forEach(item => {
    const div = document.createElement('div');
    div.className = 'gap-item';

    div.innerHTML = `
      <p class="gap-dimension">${item.dimension}</p>
      <p class="gap-reason">${item.reason}</p>
    `;

    gapList.appendChild(div);
  });
}

function renderQuestions(questionArr) {
  questionList.innerHTML = '';

  if (!questionArr || questionArr.length === 0) {
    questionList.innerHTML = '<p style="color:#888;font-size:0.88rem;">No follow-up questions generated.</p>';
    return;
  }

  questionArr.forEach((item, index) => {
    const div = document.createElement('div');
    div.className = 'question-item';

    div.innerHTML = `
      <p class="question-text">Q${index + 1}. ${item.question}</p>
      <p class="question-target">Targets gap: ${item.targets_gap}</p>
    `;

    questionList.appendChild(div);
  });
}

// Master render — calls all 5 render functions
function renderOutput(data) {
  renderScore(data.rubric_score);
  renderEvidence(data.extracted_evidence);
  renderKpis(data.kpi_mapping);
  renderGaps(data.gap_analysis);
  renderQuestions(data.followup_questions);

  // Show the output section (was hidden by default)
  outputSection.classList.remove('hidden');

  // Scroll smoothly to the output
  outputSection.scrollIntoView({ behavior: 'smooth' });
}


// MAIN: RUN ANALYSIS
// Called when intern clicks "Run Analysis"

async function runAnalysis() {
  const transcript = transcriptEl.value.trim();

  // Basic validation before hitting the backend
  if (!transcript) {
    setStatus('Please paste a transcript before running analysis.', 'error');
    return;
  }

  if (transcript.length < 50) {
    setStatus('Transcript too short — paste the full supervisor conversation.', 'error');
    return;
  }

  // Disable button so intern doesn't click twice
  analyzeBtn.disabled = true;
  analyzeBtn.textContent = 'Analyzing...';
  outputSection.classList.add('hidden');  // hide old results if any
  setStatus('Sending to Ollama — this takes 30–60 seconds...', 'loading');

  try {
    const response = await fetch('http://localhost:5000/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript })
    });

    const data = await response.json();

    if (!response.ok) {
      // Backend returned an error (4xx / 5xx)
      setStatus(`Error: ${data.error || 'Something went wrong.'}`, 'error');
      return;
    }

    // Success — render everything
    setStatus('Analysis complete. Review each section carefully.', 'success');
    renderOutput(data);

  } catch (err) {
    // Network error — Ollama or Flask not running
    setStatus(
      'Could not reach the backend. Is Flask running on localhost:5000?',
      'error'
    );
  } finally {
    // Always re-enable the button
    analyzeBtn.disabled = false;
    analyzeBtn.textContent = 'Run Analysis';
  }
}


// CLEAR BUTTON
// Resets everything back to blank state

function clearAll() {
  transcriptEl.value = '';
  outputSection.classList.add('hidden');
  hideStatus();
  transcriptEl.focus();
}

// EVENT LISTENERS

analyzeBtn.addEventListener('click', runAnalysis);
clearBtn.addEventListener('click', clearAll);