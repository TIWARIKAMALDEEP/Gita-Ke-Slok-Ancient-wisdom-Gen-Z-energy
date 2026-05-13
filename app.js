/**
 * GitaVibes — app.js
 * Ancient Wisdom · Gen Z Energy
 * ================================
 * Handles: data loading, routing, search, quiz, audio, streaks, particles
 */

'use strict';

/* ============================================================
   STATE
============================================================ */
let shlokas       = [];   // all shlokas from data.json
let filtered      = [];   // current filter/search results
let currentCat    = 'All';
let searchQuery   = '';
let dailyIndex    = 0;    // index used for "daily" shloka
let dailyBrowse   = 0;    // index for nav in daily section

// Quiz state
let quizQueue     = [];
let quizCurrent   = 0;
let quizScore     = 0;
let quizAnswered  = false;

// Streak
let streakKey = 'gitavibes_streak';
let lastVisitKey = 'gitavibes_lastvisit';

/* ============================================================
   INIT
============================================================ */
document.addEventListener('DOMContentLoaded', async () => {
  await loadData();
  initStreak();
  initParticles();
  initNavbar();
  initSearch();
  renderHomeDaily();
  renderExplore();
  observeFadeUps();
  showSection('home');
  initHamburger();
});

/* ============================================================
   DATA LOADING
============================================================ */
async function loadData() {
  try {
    const res = await fetch('data.json');
    shlokas = await res.json();
    filtered = [...shlokas];
    // Pick daily index based on day of year (deterministic)
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    dailyIndex = dayOfYear % shlokas.length;
    dailyBrowse = dailyIndex;
  } catch (e) {
    console.error('Failed to load shlokas:', e);
    showToast('⚠️ Could not load data. Check data.json');
  }
}

/* ============================================================
   STREAK
============================================================ */
function initStreak() {
  const today = new Date().toDateString();
  const lastVisit = localStorage.getItem(lastVisitKey);
  let streak = parseInt(localStorage.getItem(streakKey) || '0');

  if (lastVisit === today) {
    // same day, no change
  } else if (lastVisit === new Date(Date.now() - 86400000).toDateString()) {
    // consecutive day
    streak++;
    localStorage.setItem(streakKey, streak);
    localStorage.setItem(lastVisitKey, today);
  } else {
    // streak broken or first time
    streak = 1;
    localStorage.setItem(streakKey, streak);
    localStorage.setItem(lastVisitKey, today);
  }
  document.getElementById('streak-count').textContent = streak;
}

/* ============================================================
   SECTION ROUTING
============================================================ */
function showSection(name) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => {
    l.classList.toggle('active', l.dataset.section === name);
  });

  const el = document.getElementById(`section-${name}`);
  if (el) el.classList.add('active');

  // Close hamburger
  document.getElementById('nav-links').classList.remove('open');

  // Section-specific init
  if (name === 'daily') renderDailySection();
  if (name === 'quiz')  initQuiz();

  window.scrollTo({ top: 0, behavior: 'smooth' });
  setTimeout(observeFadeUps, 60);
}

/* ============================================================
   NAVBAR SCROLL EFFECT
============================================================ */
function initNavbar() {
  const nav = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });
}

function initHamburger() {
  const btn = document.getElementById('hamburger');
  const links = document.getElementById('nav-links');
  btn.addEventListener('click', () => links.classList.toggle('open'));
}

/* ============================================================
   HOME — DAILY CARD
============================================================ */
function renderHomeDaily() {
  const container = document.getElementById('home-daily-card');
  if (!shlokas.length) return;
  const s = shlokas[dailyIndex];
  container.innerHTML = buildDailyCardHTML(s, true);
}

function buildDailyCardHTML(s, compact = false) {
  return `
    <div class="dc-chapter">Chapter ${s.chapter} · Verse ${s.verse} · ${s.category}</div>
    <div class="dc-sanskrit">${s.sanskrit.replace(/\n/g, '<br/>')}</div>
    <div class="dc-english">${s.english}</div>
    <div class="dc-hinglish">${s.hinglish}</div>
    <div class="dc-actions">
      <button class="audio-btn" onclick="playAudio(${s.id}, this)" aria-label="Play shloka">
        <span class="audio-icon">▶</span> Listen
      </button>
      <button class="btn-focus btn-sm" onclick="openFocusMode(${s.id})" aria-label="Focus mode">
        🧘 Focus
      </button>
      <button class="btn-share btn-sm" onclick="openShare(${s.id})" aria-label="Share shloka">
        📸 Share
      </button>
      ${compact ? `<button class="btn-ghost btn-sm" onclick="showSection('daily')" style="margin-left:auto">See Full →</button>` : ''}
    </div>
  `;
}

/* ============================================================
   DAILY SECTION — Full card with navigation
============================================================ */
function renderDailySection() {
  const container = document.getElementById('daily-full-card');
  const s = shlokas[dailyBrowse];
  if (!s) return;

  container.innerHTML = `
    <div class="daily-full-card glass-card">
      <div class="dfc-nav">
        <button class="dfc-nav-btn" onclick="navDaily(-1)">← Prev</button>
        <span class="dfc-day">${dailyBrowse + 1} / ${shlokas.length}</span>
        <button class="dfc-nav-btn" onclick="navDaily(1)">Next →</button>
      </div>

      <div class="dfc-chapter-label">Chapter ${s.chapter} · Verse ${s.verse} · ${s.category}</div>

      <div class="dfc-sanskrit">${s.sanskrit.replace(/\n/g, '<br/>')}</div>
      <div class="dfc-transliteration">${s.transliteration.replace(/\n/g, '<br/>')}</div>

      <div class="dfc-divider"></div>

      <div class="dfc-label">English Meaning</div>
      <div class="dfc-english">${s.english}</div>

      <div class="dfc-label">Hinglish Vibe 😎</div>
      <div class="dfc-hinglish">${s.hinglish}</div>

      <div class="dfc-actions">
        <button class="audio-btn" onclick="playAudio(${s.id}, this)">
          <span class="audio-icon">▶</span> Listen
        </button>
        <button class="btn-focus" onclick="openFocusMode(${s.id})">🧘 Focus Mode</button>
        <button class="btn-share" onclick="openShare(${s.id})">📸 Share</button>
        <button class="btn-primary btn-sm" onclick="openModal(${s.id})" style="margin-left:auto">Read Full →</button>
      </div>
    </div>
  `;
}

function navDaily(dir) {
  dailyBrowse = (dailyBrowse + dir + shlokas.length) % shlokas.length;
  renderDailySection();
}

/* ============================================================
   EXPLORE — Shloka Grid
============================================================ */
function renderExplore() {
  applyFilters();
}

function applyFilters() {
  const q = searchQuery.toLowerCase().trim();
  filtered = shlokas.filter(s => {
    const matchCat = currentCat === 'All' || s.category === currentCat;
    const matchQ   = !q || [s.sanskrit, s.english, s.hinglish, ...(s.tags || [])].some(t => t.toLowerCase().includes(q));
    return matchCat && matchQ;
  });

  renderGrid();
  document.getElementById('results-count').textContent =
    filtered.length === shlokas.length
      ? `Showing all ${shlokas.length} shlokas`
      : `${filtered.length} shloka${filtered.length !== 1 ? 's' : ''} found`;
}

function renderGrid() {
  const grid = document.getElementById('shloka-grid');
  if (!filtered.length) {
    grid.innerHTML = `
      <div class="no-results">
        <div class="no-results-emoji">🔭</div>
        <div class="no-results-text">No shlokas found. Try a different keyword!</div>
      </div>`;
    return;
  }

  grid.innerHTML = filtered.map((s, i) => `
    <div class="shloka-card" onclick="openModal(${s.id})"
         style="animation-delay: ${i * 0.05}s"
         onmousemove="cardTilt(event, this)"
         onmouseleave="cardReset(this)">
      <div class="sc-header">
        <div class="sc-chapter">Ch ${s.chapter} · V ${s.verse}</div>
        <span class="sc-cat-badge cat-badge-${s.category}">${s.category}</span>
      </div>
      <div class="sc-sanskrit">${s.sanskrit.split('\n')[0]}</div>
      <div class="sc-english">${s.english}</div>
      <div class="sc-tags">${(s.tags || []).slice(0, 3).map(t => `<span class="sc-tag">#${t}</span>`).join('')}</div>
      <div class="sc-footer">
        <span class="sc-read-btn">Read More →</span>
      </div>
    </div>
  `).join('');
}

/* Card 3D tilt on hover */
function cardTilt(e, el) {
  const rect = el.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * 100;
  const y = ((e.clientY - rect.top) / rect.height) * 100;
  el.style.setProperty('--mx', x + '%');
  el.style.setProperty('--my', y + '%');
  const rotX = ((e.clientY - rect.top) / rect.height - .5) * -6;
  const rotY = ((e.clientX - rect.left) / rect.width - .5) * 6;
  el.style.transform = `translateY(-4px) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
}
function cardReset(el) {
  el.style.transform = '';
}

/* ============================================================
   SEARCH
============================================================ */
function initSearch() {
  const input  = document.getElementById('search-input');
  const clear  = document.getElementById('search-clear');

  input.addEventListener('input', () => {
    searchQuery = input.value;
    clear.classList.toggle('visible', searchQuery.length > 0);
    applyFilters();
  });
}

function clearSearch() {
  const input = document.getElementById('search-input');
  const clear = document.getElementById('search-clear');
  input.value = '';
  searchQuery = '';
  clear.classList.remove('visible');
  applyFilters();
}

function filterCategory(cat) {
  currentCat = cat;
  // Update pills
  document.querySelectorAll('.pill').forEach(p => {
    p.classList.toggle('active', p.dataset.cat === cat);
  });
  applyFilters();
  // Switch to explore section if not already there
  if (!document.getElementById('section-explore').classList.contains('active')) {
    showSection('explore');
  }
}

/* ============================================================
   MODAL — Full shloka detail
============================================================ */
function openModal(id) {
  const s = shlokas.find(x => x.id === id);
  if (!s) return;

  document.getElementById('modal-body').innerHTML = `
    <div class="dfc-chapter-label" style="margin-bottom:12px">Chapter ${s.chapter} · Verse ${s.verse} · <span style="color:var(--saffron)">${s.category}</span></div>

    <div class="dfc-sanskrit" style="margin-bottom:8px">${s.sanskrit.replace(/\n/g, '<br/>')}</div>
    <div class="dfc-transliteration" style="margin-bottom:20px">${s.transliteration.replace(/\n/g, '<br/>')}</div>

    <div class="dfc-divider"></div>

    <div class="dfc-label">English Meaning</div>
    <div class="dfc-english">${s.english}</div>

    <div class="dfc-label">Hinglish Vibe 😎</div>
    <div class="dfc-hinglish">${s.hinglish}</div>

    <div class="dfc-label">Tags</div>
    <div class="sc-tags" style="margin-bottom:24px">${(s.tags || []).map(t => `<span class="sc-tag">#${t}</span>`).join('')}</div>

    <div class="dfc-actions">
      <button class="audio-btn" onclick="playAudio(${s.id}, this)">
        <span class="audio-icon">▶</span> Listen
      </button>
      <button class="btn-focus" onclick="closeThen(() => openFocusMode(${s.id}))">🧘 Focus</button>
      <button class="btn-share" onclick="closeThen(() => openShare(${s.id}))">📸 Share</button>
    </div>
  `;

  document.getElementById('modal-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

function closeThen(fn) { closeModal(); setTimeout(fn, 200); }

/* ============================================================
   AUDIO FEATURE (placeholder using SpeechSynthesis)
============================================================ */
let audioPlaying = false;
let speechUtt = null;

function playAudio(id, btn) {
  const s = shlokas.find(x => x.id === id);
  if (!s) return;

  // Cancel existing
  if (speechUtt) {
    window.speechSynthesis.cancel();
    document.querySelectorAll('.audio-btn').forEach(b => {
      b.classList.remove('playing');
      b.querySelector('.audio-icon').textContent = '▶';
    });
    if (audioPlaying) { audioPlaying = false; return; }
  }

  // Try speech synthesis
  if ('speechSynthesis' in window) {
    speechUtt = new SpeechSynthesisUtterance(s.transliteration);
    speechUtt.lang = 'hi-IN';
    speechUtt.rate = 0.75;
    speechUtt.pitch = 1;

    btn.classList.add('playing');
    btn.querySelector('.audio-icon').textContent = '⏸';
    audioPlaying = true;

    speechUtt.onend = () => {
      btn.classList.remove('playing');
      btn.querySelector('.audio-icon').textContent = '▶';
      audioPlaying = false;
      speechUtt = null;
    };

    window.speechSynthesis.speak(speechUtt);
    showToast('🎵 Playing shloka pronunciation...');
  } else {
    showToast('🔇 Audio not supported in this browser');
  }
}

/* ============================================================
   FOCUS MODE
============================================================ */
function openFocusMode(id) {
  const s = shlokas.find(x => x.id === id);
  if (!s) return;

  document.getElementById('focus-content').innerHTML = `
    <div class="fc-label">Chapter ${s.chapter} · Verse ${s.verse}</div>
    <div class="fc-sanskrit">${s.sanskrit.replace(/\n/g, '<br/>')}</div>
    <div class="dfc-divider" style="margin:24px auto;max-width:200px"></div>
    <div class="fc-english">${s.english}</div>
  `;

  document.getElementById('focus-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeFocusMode() {
  document.getElementById('focus-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

/* ============================================================
   SHARE CARD
============================================================ */
function openShare(id) {
  const s = shlokas.find(x => x.id === id);
  if (!s) return;

  document.getElementById('share-preview').innerHTML = `
    <div class="sp-brand">☸ GitaVibes · Ch ${s.chapter}.${s.verse}</div>
    <div class="sp-sanskrit">${s.sanskrit.replace(/\n/g, '<br/>')}</div>
    <div class="sp-english">${s.english}</div>
    <div class="sp-hinglish">${s.hinglish}</div>
  `;

  document.getElementById('share-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';

  // Store for copy
  document.getElementById('share-overlay').dataset.copyText =
    `☸ GitaVibes | Bhagavad Gita Ch ${s.chapter}.${s.verse}\n\n${s.sanskrit}\n\n${s.english}\n\n${s.hinglish}\n\n#GitaVibes #BhagavadGita #AncientWisdom`;
}

function closeShare() {
  document.getElementById('share-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

function copyShareText() {
  const text = document.getElementById('share-overlay').dataset.copyText || '';
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => showToast('📋 Copied to clipboard!'));
  } else {
    showToast('✅ Text ready to share!');
  }
}

/* ============================================================
   QUIZ
============================================================ */
function initQuiz() {
  quizScore = 0;
  quizCurrent = 0;
  quizAnswered = false;
  // Shuffle shlokas for quiz
  quizQueue = [...shlokas].sort(() => Math.random() - .5).slice(0, 5);
  renderQuiz();
}

function renderQuiz() {
  const wrap = document.getElementById('quiz-wrap');

  if (quizCurrent >= quizQueue.length) {
    renderQuizScore(wrap);
    return;
  }

  const s = quizQueue[quizCurrent];
  const q = s.quiz;
  const pct = (quizCurrent / quizQueue.length) * 100;
  const letters = ['A', 'B', 'C', 'D'];

  wrap.innerHTML = `
    <div class="quiz-card glass-card">
      <div class="quiz-progress">
        <div class="qp-label">Question ${quizCurrent + 1} of ${quizQueue.length}</div>
        <div class="qp-bar"><div class="qp-fill" style="width:${pct}%"></div></div>
      </div>

      <div class="quiz-shloka">${s.sanskrit.split('\n')[0]}...</div>
      <div class="quiz-question">${q.question}</div>

      <div class="quiz-options" id="quiz-opts">
        ${q.options.map((opt, i) => `
          <button class="quiz-opt" onclick="answerQuiz(${i}, ${q.answer})" id="opt-${i}">
            <span class="quiz-opt-letter">${letters[i]}</span>
            ${opt}
          </button>
        `).join('')}
      </div>

      <div id="quiz-feedback"></div>

      <div class="quiz-next-row" id="quiz-next-row" style="display:none">
        <button class="btn-primary" onclick="nextQuestion()">
          ${quizCurrent + 1 < quizQueue.length ? 'Next Question →' : 'See Score 🎉'}
        </button>
      </div>
    </div>
  `;
}

function answerQuiz(chosen, correct) {
  if (quizAnswered) return;
  quizAnswered = true;

  const opts = document.querySelectorAll('.quiz-opt');
  opts.forEach(o => o.disabled = true);

  opts[correct].classList.add('correct');
  if (chosen !== correct) {
    opts[chosen].classList.add('wrong');
  } else {
    quizScore++;
  }

  const feedback = document.getElementById('quiz-feedback');
  feedback.className = 'quiz-feedback ' + (chosen === correct ? 'correct' : 'wrong');
  feedback.textContent = chosen === correct
    ? '✅ Sahi jawab bhai! Ekdum solid! 🔥'
    : `❌ Galat! Correct answer tha: "${quizQueue[quizCurrent].quiz.options[correct]}"`;

  document.getElementById('quiz-next-row').style.display = 'flex';
}

function nextQuestion() {
  quizCurrent++;
  quizAnswered = false;
  renderQuiz();
}

function renderQuizScore(wrap) {
  const total = quizQueue.length;
  const pct   = Math.round((quizScore / total) * 100);
  let emoji = '😅', msg = 'Keep learning!';
  if (pct >= 80) { emoji = '🏆'; msg = 'Gyaan ka sagar! Absolutely crushing it!'; }
  else if (pct >= 60) { emoji = '🔥'; msg = 'Solid bhai! Teri wisdom grow ho rahi hai!'; }
  else if (pct >= 40) { emoji = '📚'; msg = 'Not bad! Keep reading those shlokas!'; }

  wrap.innerHTML = `
    <div class="quiz-score-card glass-card">
      <div class="qs-emoji">${emoji}</div>
      <div class="qs-title">${msg}</div>
      <div class="qs-score">
        You scored <span class="qs-big-score">${quizScore}/${total}</span>
        (${pct}%)
      </div>
      <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
        <button class="btn-primary" onclick="initQuiz()">🔄 Try Again</button>
        <button class="btn-ghost" onclick="showSection('explore')">📚 Read More</button>
      </div>
    </div>
  `;
}

/* ============================================================
   TOAST NOTIFICATIONS
============================================================ */
let toastTimer;
function showToast(msg, dur = 2800) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), dur);
}

/* ============================================================
   SCROLL FADE-UP OBSERVER
============================================================ */
function observeFadeUps() {
  const els = document.querySelectorAll('.fade-up:not(.visible)');
  if (!els.length) return;
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
  els.forEach(el => io.observe(el));
}

/* ============================================================
   PARTICLE CANVAS
============================================================ */
function initParticles() {
  const canvas = document.getElementById('particles-canvas');
  const ctx    = canvas.getContext('2d');
  let W, H, particles = [];

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  const COLORS = ['#ff7e1b', '#f5c842', '#00e5c0', '#a855f7', '#38bdf8'];

  class Particle {
    constructor() { this.reset(true); }
    reset(init = false) {
      this.x    = Math.random() * W;
      this.y    = init ? Math.random() * H : H + 10;
      this.r    = Math.random() * 1.5 + 0.3;
      this.c    = COLORS[Math.floor(Math.random() * COLORS.length)];
      this.vy   = -(Math.random() * 0.4 + 0.1);
      this.vx   = (Math.random() - .5) * 0.2;
      this.life = 0;
      this.maxLife = 200 + Math.random() * 300;
    }
    update() {
      this.x += this.vx; this.y += this.vy; this.life++;
      if (this.life > this.maxLife || this.y < -10) this.reset();
    }
    draw() {
      const alpha = Math.sin((this.life / this.maxLife) * Math.PI) * 0.6;
      ctx.globalAlpha = alpha;
      ctx.fillStyle   = this.c;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const N = 80;
  for (let i = 0; i < N; i++) particles.push(new Particle());

  function loop() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => { p.update(); p.draw(); });
    ctx.globalAlpha = 1;
    requestAnimationFrame(loop);
  }
  loop();
}

/* ============================================================
   KEYBOARD SHORTCUTS
============================================================ */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeModal();
    closeShare();
    closeFocusMode();
  }
});
/* ============================================================
   MOOD MAPPING — kaunsa mood → kaunsi categories
============================================================ */
const MOOD_MAP = {
  anxious:     { tags: ['stress','peace','surrender','temporary'], label: '😰 Bohot tension hai — yeh shlokas sun', cats: ['Stress'] },
  lost:        { tags: ['dharma','knowledge','wisdom','self'], label: '🌫️ Confused hai? Krishna explain karte hain', cats: ['Life Lessons'] },
  unmotivated: { tags: ['karma','duty','action','courage','arise'], label: '😔 Uth bhai — yeh shlokas aag laga denge', cats: ['Motivation'] },
  angry:       { tags: ['anger','mind','control','discipline','attachment'], label: '😤 Gussa down karo — ye padho', cats: ['Discipline','Stress'] },
  sad:         { tags: ['soul','eternal','temporary','peace','faith'], label: '💔 Dil dukhi hai — Krishna ke words sun', cats: ['Life Lessons','Stress'] },
  pumped:      { tags: ['karma','action','duty','leadership','strength'], label: '🔥 FIRE mode ON — let\'s gooo!', cats: ['Motivation','Discipline'] },
};

function selectMood(btn) {
  const mood = btn.dataset.mood;
  const map  = MOOD_MAP[mood];
  if (!map) return;

  // Highlight selected
  document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');

  // Filter shlokas
  const results = shlokas.filter(s =>
    map.cats.includes(s.category) ||
    (s.tags || []).some(t => map.tags.includes(t))
  ).slice(0, 4);

  // Show results
  const resultDiv  = document.getElementById('mood-result');
  const labelDiv   = document.getElementById('mood-result-label');
  const cardsDiv   = document.getElementById('mood-result-cards');

  labelDiv.textContent = map.label;
  cardsDiv.innerHTML = results.map(s => `
    <div class="shloka-card" onclick="openModal(${s.id})" style="cursor:pointer">
      <div class="sc-header">
        <div class="sc-chapter">Ch ${s.chapter} · V ${s.verse}</div>
        <span class="sc-cat-badge cat-badge-${s.category}">${s.category}</span>
      </div>
      <div class="sc-sanskrit">${s.sanskrit.split('\n')[0]}</div>
      <div class="sc-english">${s.english}</div>
      <div class="sc-footer">
        <span class="sc-read-btn">Read More →</span>
      </div>
    </div>
  `).join('');

  document.getElementById('mood-grid').style.display = 'none';
  resultDiv.style.display = 'block';
  showToast(`${map.label.split('—')[0].trim()} — ${results.length} shlokas mili! 🙏`);
}

function resetMood() {
  document.getElementById('mood-grid').style.display = 'grid';
  document.getElementById('mood-result').style.display = 'none';
  document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));
}

/* ============================================================
   SHLOKA OF THE MOMENT — Click / Shake
============================================================ */
function drawMomentShloka() {
  const orb = document.getElementById('moment-orb');
  const card = document.getElementById('moment-card');

  // Shake animation
  orb.classList.remove('shaking');
  void orb.offsetWidth; // reflow
  orb.classList.add('shaking');
  setTimeout(() => orb.classList.remove('shaking'), 500);

  // Pick random shloka (different from last)
  const last = parseInt(orb.dataset.last || '-1');
  let idx;
  do { idx = Math.floor(Math.random() * shlokas.length); } while (idx === last && shlokas.length > 1);
  orb.dataset.last = idx;

  const s = shlokas[idx];

  card.style.display = 'none';
  setTimeout(() => {
    card.innerHTML = `
      <div class="dfc-chapter-label">Chapter ${s.chapter} · Verse ${s.verse} · ${s.category}</div>
      <div class="dfc-sanskrit">${s.sanskrit.replace(/\n/g,'<br/>')}</div>
      <div class="dfc-transliteration">${s.transliteration.replace(/\n/g,'<br/>')}</div>
      <div class="dfc-divider"></div>
      <div class="dfc-label">English Meaning</div>
      <div class="dfc-english">${s.english}</div>
      <div class="dfc-label">Hinglish Vibe 😎</div>
      <div class="dfc-hinglish">${s.hinglish}</div>
      <div class="dfc-actions" style="margin-top:8px">
        <button class="audio-btn" onclick="playAudio(${s.id},this)"><span class="audio-icon">▶</span> Listen</button>
        <button class="btn-focus" onclick="openFocusMode(${s.id})">🧘 Focus</button>
        <button class="btn-share" onclick="openShare(${s.id})">📸 Share</button>
        <button class="btn-primary btn-sm" onclick="drawMomentShloka()" style="margin-left:auto">🎴 Next →</button>
      </div>
    `;
    card.style.display = 'block';
  }, 300);
}

// Phone shake detection
if (window.DeviceMotionEvent) {
  let lastShake = 0;
  window.addEventListener('devicemotion', (e) => {
    const acc = e.accelerationIncludingGravity;
    if (!acc) return;
    const total = Math.abs(acc.x) + Math.abs(acc.y) + Math.abs(acc.z);
    const now = Date.now();
    if (total > 25 && now - lastShake > 1500) {
      lastShake = now;
      // Only trigger if moment section is active
      if (document.getElementById('section-moment').classList.contains('active')) {
        drawMomentShloka();
        showToast('📱 Shake detected! New shloka! ✨');
      }
    }
  });
}