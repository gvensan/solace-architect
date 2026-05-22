/* Solace Architect Dashboard */

let state = { projects: [], active: null, current: null, data: null, reportPacks: null };

/**
 * Default report packs — used as fallback if /api/report-packs is unreachable.
 * The canonical definition lives in scripts/report-packs.yaml.
 */
const DEFAULT_REPORT_PACKS = [
  { id: 'blueprint', label: 'Master Architecture View', description: 'Comprehensive engineering deliverable.', audience: 'Architects, platform leads', filters: {} }
];

/**
 * Fetch and parse report-packs.yaml from the server. Cached on state.reportPacks.
 */
async function loadReportPacks() {
  if (state.reportPacks) return state.reportPacks;
  try {
    const res = await fetch('/api/report-packs');
    if (!res.ok) throw new Error('packs endpoint failed');
    const text = await res.text();
    const parsed = parseYaml(text);
    if (parsed && Array.isArray(parsed.packs) && parsed.packs.length > 0) {
      state.reportPacks = parsed.packs;
      return parsed.packs;
    }
  } catch (e) {
    console.warn('Could not load report-packs.yaml, using defaults:', e.message);
  }
  state.reportPacks = DEFAULT_REPORT_PACKS;
  return DEFAULT_REPORT_PACKS;
}

/**
 * Match a single artifact path against a pack's filter rules.
 * Returns true if the path should be included in the pack's report.
 *
 * Blueprint (empty filters) matches everything.
 * Other packs match if path is under one of `dirs`, or in `files`, or matches a glob.
 */
function packIncludesArtifact(packFilters, artifactPath) {
  if (!packFilters || Object.keys(packFilters).length === 0) return true;  // blueprint
  const norm = artifactPath.replace(/^artifacts\//, '');
  if (Array.isArray(packFilters.dirs)) {
    for (const dir of packFilters.dirs) {
      if (norm === dir || norm.startsWith(dir + '/')) return true;
    }
  }
  if (Array.isArray(packFilters.files)) {
    for (const file of packFilters.files) {
      if (norm === file) return true;
    }
  }
  if (Array.isArray(packFilters.globs)) {
    for (const glob of packFilters.globs) {
      // Convert simple glob to regex: ** -> .*, * -> [^/]*, ? -> .
      const re = new RegExp('^' + glob
        .replace(/[.+^${}()|[\]\\]/g, '\\$&')
        .replace(/\*\*/g, '__GLOBSTAR__')
        .replace(/\*/g, '[^/]*')
        .replace(/__GLOBSTAR__/g, '.*')
        .replace(/\?/g, '.') + '$');
      if (re.test(norm)) return true;
    }
  }
  return false;
}

/**
 * Filter a decisions/findings list by allowed source skills.
 * - undefined source_skills field → return original list unchanged
 * - empty array → return empty list (caller should hide the section)
 * - non-empty array → keep only items whose .skill (or .source) is in the list
 */
function filterByPackSkills(items, allowedSkills) {
  if (allowedSkills === undefined) return items;
  if (!Array.isArray(allowedSkills)) return items;
  if (allowedSkills.length === 0) return [];
  return items.filter(it => {
    const skill = it.skill || it.source || '';
    return allowedSkills.includes(skill);
  });
}

/**
 * Check whether a top-level section should be rendered for a pack.
 * undefined top_sections → all sections allowed.
 */
function packIncludesSection(packFilters, sectionId) {
  if (!packFilters || !Array.isArray(packFilters.top_sections)) return true;
  return packFilters.top_sections.includes(sectionId);
}

const SKILL_ORDER = [
  'solace-discovery', 'solace-plan', 'solace-topic-design', 'solace-broker-select',
  'solace-sam-design', 'solace-protocol-select', 'solace-mesh-design', 'solace-ha-dr',
  'solace-integration', 'solace-migration', 'solace-event-portal', 'solace-ep-provision',
  'solace-architect-review', 'solace-ops-review',
  'solace-security-review', 'solace-dev-review', 'solace-validate', 'solace-blueprint',
  'solace-architecture-blueprint', 'solace-executive', 'solace-diagrams'
];

const SKILL_LABELS = {
  'solace-discovery': 'Discovery', 'solace-plan': 'Execution',
  'solace-topic-design': 'Topic Design', 'solace-broker-select': 'Broker Selection',
  'solace-sam-design': 'SAM Design', 'solace-protocol-select': 'Protocol Selection',
  'solace-mesh-design': 'Mesh Design', 'solace-ha-dr': 'HA/DR',
  'solace-integration': 'Integration', 'solace-migration': 'Migration', 'solace-event-portal': 'Event Portal',
  'solace-ep-provision': 'EP Provisioning',
  'solace-architect-review': 'Architect Review', 'solace-ops-review': 'Ops Review',
  'solace-security-review': 'Security Review', 'solace-dev-review': 'Dev Review',
  'solace-validate': 'Validation', 'solace-blueprint': 'Technical Blueprint',
  'solace-architecture-blueprint': 'Architecture Blueprint (4+1)',
  'solace-executive': 'Business Case', 'solace-diagrams': 'Diagrams'
};

const SKILL_PHASES = {
  'solace-discovery': 'Discovery', 'solace-plan': 'Planning',
  'solace-topic-design': 'Design', 'solace-broker-select': 'Design',
  'solace-sam-design': 'Design', 'solace-protocol-select': 'Design',
  'solace-mesh-design': 'Design', 'solace-ha-dr': 'Design',
  'solace-integration': 'Design', 'solace-migration': 'Design', 'solace-event-portal': 'Design',
  'solace-ep-provision': 'Design',
  'solace-architect-review': 'Review', 'solace-ops-review': 'Review',
  'solace-security-review': 'Review', 'solace-dev-review': 'Review',
  'solace-validate': 'Finalize', 'solace-blueprint': 'Finalize',
  'solace-architecture-blueprint': 'Finalize',
  'solace-executive': 'Finalize', 'solace-diagrams': 'Utility'
};

const SKILL_GROUPS = [
  { phase: 'discovery', label: 'Discovery', skills: ['solace-discovery'] },
  { phase: 'design', label: 'Design', skills: ['solace-topic-design', 'solace-broker-select', 'solace-sam-design', 'solace-protocol-select', 'solace-mesh-design', 'solace-ha-dr', 'solace-integration', 'solace-migration', 'solace-event-portal', 'solace-ep-provision'] },
  { phase: 'review', label: 'Review', skills: ['solace-architect-review', 'solace-ops-review', 'solace-security-review', 'solace-dev-review'] },
  { phase: 'finalize', label: 'Finalize', skills: ['solace-validate', 'solace-blueprint', 'solace-architecture-blueprint', 'solace-executive'] },
  { phase: 'utility', label: 'Utility', skills: ['solace-diagrams'] },
];

const SKIP_REASONS = {
  'solace-sam-design': 'No Agent Mesh components in scope',
  'solace-mesh-design': 'Single-site topology',
  'solace-ha-dr': 'Not in MVP scope',
  'solace-migration': 'Greenfield project, no migration needed',
  'solace-ep-provision': 'Provisioning not requested in intake (preferences.provision_event_portal=false)'
};

function fmtTime(sec) {
  if (!sec && sec !== 0) return '--';
  if (sec < 60) return `${Math.round(sec)}s`;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function parseYaml(text) {
  if (!text) return null;
  try { return jsyaml.load(text); } catch { return null; }
}

// Status precedence for dedup: complete wins over partial/interrupted/blocked, etc.
// Lower number = higher precedence (kept when multiple entries share a skill name).
const STATUS_RANK = {
  complete: 0,
  'in-progress': 1,
  partial: 2,
  interrupted: 3,
  skipped: 4,
  blocked: 5,
};

function getSkills(progress) {
  if (!progress?.progress) return [];
  const all = progress.progress;
  // Deduplicate entries with the same skill name. Earlier failed attempts
  // (blocked/interrupted/partial) get superseded by a later complete run.
  // Tiebreak by `started` timestamp (newest wins).
  const bySkill = new Map();
  for (let i = 0; i < all.length; i++) {
    const entry = { ...all[i], _idx: i };
    const key = entry.skill;
    const existing = bySkill.get(key);
    if (!existing) {
      bySkill.set(key, entry);
      continue;
    }
    const rA = STATUS_RANK[entry.status] ?? 99;
    const rB = STATUS_RANK[existing.status] ?? 99;
    if (rA < rB) {
      bySkill.set(key, entry);
    } else if (rA === rB) {
      const tA = Date.parse(entry.started || '') || 0;
      const tB = Date.parse(existing.started || '') || 0;
      if (tA >= tB) bySkill.set(key, entry);
    }
  }
  // Preserve the original ordering by the kept entry's original index.
  return [...bySkill.values()].sort((a, b) => a._idx - b._idx);
}

function getDecisions(decisions) {
  if (!decisions) return { mode: 'interactive', items: [] };
  return {
    mode: decisions.execution_mode || 'interactive',
    items: decisions.decisions || []
  };
}

function getSkipList(progress) {
  const plan = progress?.progress?.find(s => s.skill === 'solace-plan');
  return plan?.skipped_skills || [];
}

// Effective skipped set = explicit skips (from /solace-plan) plus skills the
// intake gate left out of the engagement. /solace-ep-provision is opt-in only
// (preferences.provision_event_portal: true). When the gate is off, treat it
// as skipped so completion counters, "next step" hints, and group progress
// don't keep pointing the user at a step they never asked for.
function getEffectiveSkipped(progress, decisions) {
  const explicit = getSkipList(progress);
  const wantEpProvision = decisions?.provision_event_portal === true;
  const set = new Set(explicit);
  if (!wantEpProvision) set.add('solace-ep-provision');
  return [...set];
}

function getOpenItems(openItems) {
  return openItems?.open_items || [];
}

const SEV_BADGE = { blocking: 'badge-critical', high: 'badge-important', medium: 'badge-review', advisory: 'badge-advisory' };
const STATUS_BADGE = { open: 'badge-open', 'in-progress': 'badge-in-progress', resolved: 'badge-complete' };

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/* ─── DATA LOADING ─── */

async function loadData() {
  const res = await fetch(`/api/projects?t=${Date.now()}`);
  const data = await res.json();
  state.projects = data.projects;
  state.active = data.active;
  if (state.projects.length === 0) {
    document.getElementById('view').innerHTML = `
      <div class="empty">
        <h2>No Projects Found</h2>
        <p>Run /solace-discovery to start your first project.</p>
      </div>`;
    return;
  }
  const current = state.projects.find(p => p.slug === state.active) || state.projects[0];
  selectProject(current);
}

function pollFingerprint() {
  if (!state.current) return '';
  return [state.current.progress, state.current.decisions, state.current.context,
    (state.current.artifactFiles || []).length].join('|');
}

let _lastFingerprint = '';
async function pollData() {
  try {
    const res = await fetch(`/api/projects?t=${Date.now()}`);
    const data = await res.json();
    const activeSlug = data.active?.trim() || null;

    state.projects = data.projects;
    state.active = activeSlug;

    if (!state.current) return;

    // Only refresh the page when viewing the currently running project
    if (state.current.slug !== activeSlug) {
      renderProjectSelector();
      return;
    }

    const current = data.projects.find(p => p.slug === activeSlug);
    if (!current) return;

    const prev = _lastFingerprint;
    state.current = current;
    state.data = {
      context: parseYaml(current.context),
      progress: parseYaml(current.progress),
      decisions: parseYaml(current.decisions),
      openItems: parseYaml(current.openItems),
      files: current.artifactFiles
    };
    _lastFingerprint = pollFingerprint();
    if (_lastFingerprint !== prev) {
      const main = document.getElementById('content');
      const scrollTop = main.scrollTop;
      const activeSection = document.querySelector('#rightSidebar .toc-link.active')?.dataset?.section;
      const activePath = document.querySelector('#rightSidebar .artifact-link.active')?.dataset?.path;

      renderProjectSelector();
      navigateTo(location.hash.slice(1) || 'overview');

      if (activeSection) {
        document.querySelectorAll('#view [data-section]').forEach(el => {
          el.style.display = el.dataset.section === activeSection ? '' : 'none';
        });
        document.querySelectorAll('#rightSidebar .toc-link[data-section]').forEach(l => {
          l.classList.toggle('active', l.dataset.section === activeSection);
        });
      }
      if (activePath) {
        const link = document.querySelector(`#rightSidebar .artifact-link[data-path="${activePath}"]`);
        if (link) link.click();
      }
      main.scrollTop = scrollTop;
    }
  } catch {}
}

setInterval(pollData, 10000);

function selectProject(proj) {
  state.current = proj;
  state.data = {
    context: parseYaml(proj.context),
    progress: parseYaml(proj.progress),
    decisions: parseYaml(proj.decisions),
    openItems: parseYaml(proj.openItems),
    files: proj.artifactFiles
  };
  renderProjectSelector();
  navigateTo(location.hash.slice(1) || 'overview');
}

function renderProjectSelector() {
  const el = document.getElementById('projectSelector');
  if (state.projects.length <= 1) {
    const name = state.data?.context?.display_name || state.current.slug;
    el.innerHTML = `<div style="padding:4px 0;font-weight:600;font-size:14px;color:var(--text)">${name}</div>`;
    return;
  }
  el.innerHTML = `<select class="project-select" id="projSelect">
    ${state.projects.map(p => `<option value="${p.slug}" ${p.slug === state.current.slug ? 'selected' : ''}>${p.slug}</option>`).join('')}
  </select>`;
  document.getElementById('projSelect').addEventListener('change', e => {
    const proj = state.projects.find(p => p.slug === e.target.value);
    if (proj) selectProject(proj);
  });
}

/* ─── NAVIGATION ─── */

function navigateTo(view) {
  if (!view || !views[view]) view = 'overview';
  location.hash = view;
  document.querySelectorAll('.nav-link').forEach(el => {
    el.classList.toggle('active', el.dataset.view === view);
  });
  views[view]();
  updateRightSidebar();
  updateStatusBar();
}

document.getElementById('navLinks').addEventListener('click', e => {
  const link = e.target.closest('.nav-link');
  if (link) { e.preventDefault(); navigateTo(link.dataset.view); }
});

/* ─── RIGHT SIDEBAR (ON THIS PAGE) ─── */

function updateRightSidebar() {
  const sidebar = document.getElementById('rightSidebar');
  const view = document.getElementById('view');
  const main = document.getElementById('content');

  if (main._tocScroll) {
    main.removeEventListener('scroll', main._tocScroll);
    main._tocScroll = null;
  }

  if (view.dataset.tocManaged === 'true') {
    delete view.dataset.tocManaged;
    return;
  }

  const raw = [];

  view.querySelectorAll('[data-toc]').forEach(el => {
    raw.push({ el, text: el.dataset.toc });
  });

  view.querySelectorAll(':scope > .section h2').forEach(el => {
    if (el.closest('.split-layout') || el.closest('.split-content')) return;
    raw.push({ el, text: el.textContent.trim() });
  });

  view.querySelectorAll(':scope > .exec-summary-section').forEach(section => {
    const header = section.querySelector('.exec-summary-header');
    if (!header) return;
    const overline = header.querySelector('.overline');
    const h3 = header.querySelector('h3');
    let text;
    if (overline) {
      const t = overline.textContent.trim();
      text = t === t.toUpperCase() && t.length > 3
        ? t.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
        : t;
    } else {
      text = h3 ? h3.textContent.trim() : '';
    }
    if (text) raw.push({ el: section, text });
  });

  raw.sort((a, b) => {
    const pos = a.el.compareDocumentPosition(b.el);
    return pos & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
  });

  const items = raw.map((r, i) => {
    const id = `toc-${i}`;
    r.el.id = id;
    return { id, text: r.text.replace(/\s*\(.*\)$/, ''), el: r.el };
  });

  if (items.length < 2) {
    sidebar.classList.add('hidden');
    return;
  }

  sidebar.classList.remove('hidden');
  sidebar.innerHTML = `
    <div class="overline" style="margin-bottom:12px">ON THIS PAGE</div>
    <ul class="toc-list">
      ${items.map(h => `<li><a href="#${h.id}" class="toc-link">${escHtml(h.text)}</a></li>`).join('')}
    </ul>`;

  sidebar.querySelectorAll('.toc-link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const target = document.getElementById(link.getAttribute('href').slice(1));
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  const onScroll = () => {
    let current = items[0]?.id;
    for (const h of items) {
      if (h.el.getBoundingClientRect().top <= 100) current = h.id;
    }
    sidebar.querySelectorAll('.toc-link').forEach(link => {
      link.classList.toggle('active', link.getAttribute('href') === `#${current}`);
    });
  };
  if (main._tocScroll) main.removeEventListener('scroll', main._tocScroll);
  main._tocScroll = onScroll;
  main.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* ─── STATUS BAR ─── */

function updateStatusBar() {
  const bar = document.getElementById('statusBar');
  const main = document.getElementById('content');
  if (!state.data?.progress) {
    bar.classList.add('hidden');
    main.classList.remove('has-status-bar');
    return;
  }

  const skills = getSkills(state.data.progress);
  const running = skills.filter(s => s.status === 'in-progress');

  if (running.length === 0) {
    bar.classList.add('hidden');
    main.classList.remove('has-status-bar');
    return;
  }

  bar.classList.remove('hidden');
  main.classList.add('has-status-bar');

  bar.innerHTML = running.map(s => {
    const label = SKILL_LABELS[s.skill] || s.skill;
    const phase = SKILL_PHASES[s.skill] || '';
    const step = s.step_reached || 'running';
    const started = s.started ? new Date(s.started) : null;
    const elapsed = started ? Math.max(0, Math.floor((Date.now() - started.getTime()) / 1000)) : 0;
    return `
      <span class="status-pulse">●</span>
      <span style="color:var(--text-muted)">Phase:</span> <strong style="color:var(--text)">${phase}</strong>
      <span style="color:var(--text-muted)">· Step:</span> <strong style="color:var(--accent)">${label}</strong>
      <span style="color:var(--text-muted)">—</span>
      <span>${step}</span>
      ${elapsed > 0 ? `<span class="skill-timing" style="margin-left:auto">${fmtTime(elapsed)} elapsed</span>` : ''}
    `;
  }).join('');
}

/* ─── THEME ─── */

function initTheme() {
  const saved = localStorage.getItem('sa-theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('sa-theme', next);
  updateThemeIcon();
  const mTheme = next === 'dark' ? 'dark' : 'base';
  mermaid.initialize({ startOnLoad: false, theme: mTheme, themeVariables: next === 'dark' ? {
    primaryColor: '#093B5F', primaryTextColor: '#fff', primaryBorderColor: '#00C895',
    lineColor: '#00C895', secondaryColor: '#03213B', tertiaryColor: '#093B5F'
  } : {
    primaryColor: '#e8f4f8', primaryTextColor: '#093B5F', primaryBorderColor: '#093B5F',
    lineColor: '#5A7A94', secondaryColor: '#f0fdf9', tertiaryColor: '#f8fafc'
  }});
}

function updateThemeIcon() {
  const btn = document.getElementById('themeToggle');
  if (!btn) return;
  const isDark = (document.documentElement.getAttribute('data-theme') || 'dark') === 'dark';
  btn.innerHTML = isDark ? '&#9788;' : '&#9790;';
}

/* ─── VIEWS ─── */

const views = { overview, timeline, decisions, openitems: openItemsView, artifacts, stats, export: exportView };

async function overview() {
  const { progress, decisions: dec, files, context } = state.data;
  const skills = getSkills(progress);
  const { mode, items } = getDecisions(dec);
  const skipped = getEffectiveSkipped(progress, dec);
  const wantEpProvision = dec?.provision_event_portal === true;
  const epProvisionEntry = skills.find(s => s.skill === 'solace-ep-provision');

  const totalWall = skills.reduce((a, s) => a + (s.timing?.wall_sec || 0), 0);
  const totalExec = skills.reduce((a, s) => a + (s.timing?.execution_sec || 0), 0);
  const totalWait = skills.reduce((a, s) => a + (s.timing?.user_wait_sec || 0), 0);
  const userDecisions = items.filter(d => d.id || (d.skill && !d.source));
  const reviewFindings = items.filter(d => d.source);
  const completedSkills = skills.filter(s => s.status === 'complete');
  const totalArtifacts = files?.length || 0;
  const openItems = getOpenItems(state.data.openItems);
  const openCount = openItems.filter(i => (i.status||'open') !== 'resolved').length;

  const discoveryFile = (files || []).find(f => f.includes('discovery') && f.endsWith('.md'));
  let systemsList = [];
  const discoveryInputs = { messaging: '', protocols: '', eventTypes: [], refArch: '', requirements: {}, goals: {} };
  if (discoveryFile) {
    try {
      const dRes = await fetch(`/api/projects/${state.current.slug}/artifact?path=${encodeURIComponent(discoveryFile)}`);
      if (dRes.ok) {
        const dText = await dRes.text();
        const lines = dText.split('\n');
        let inSystems = false;
        let inEvents = false;
        let currentField = '';
        let currentSection = '';
        for (let i = 0; i < lines.length; i++) {
          const ln = lines[i];
          if (/^## System landscape/i.test(ln)) { currentSection = 'landscape'; continue; }
          if (/^## Requirements/i.test(ln)) { currentSection = 'requirements'; continue; }
          if (/^## Goals/i.test(ln)) { currentSection = 'goals'; continue; }
          if (/^## /.test(ln)) { currentSection = ''; inSystems = false; inEvents = false; continue; }

          if (/^\s*-\s+\*\*Systems:\*\*/.test(ln)) { inSystems = true; inEvents = false; continue; }
          if (/^\s*-\s+\*\*Existing messaging:\*\*\s*(.+)/i.test(ln)) {
            discoveryInputs.messaging = ln.match(/\*\*Existing messaging:\*\*\s*(.+)/i)[1].trim();
            inSystems = false; inEvents = false; continue;
          }
          if (/^\s*-\s+\*\*Protocols in play:\*\*\s*(.+)/i.test(ln)) {
            discoveryInputs.protocols = ln.match(/\*\*Protocols in play:\*\*\s*(.+)/i)[1].trim();
            inSystems = false; inEvents = false; continue;
          }
          if (/^\s*-\s+\*\*Event types/i.test(ln)) { inEvents = true; inSystems = false; continue; }
          if (/^\s*-\s+\*\*Matched reference architecture:\*\*\s*(.+)/i.test(ln)) {
            discoveryInputs.refArch = ln.match(/\*\*Matched reference architecture:\*\*\s*(.+)/i)[1].trim();
            inEvents = false; continue;
          }
          if (/^\s*-\s+\*\*Micro-Integration/i.test(ln)) { inEvents = false; continue; }

          if (inSystems) {
            const m = ln.match(/^\s{2,}-\s+(.+?)(?:\s+—\s+(.+))?$/);
            if (m) {
              const nameRole = m[1];
              const desc = m[2] || '';
              const rm = nameRole.match(/^(.+?)\s*\(([^)]+)\)$/);
              systemsList.push({ name: rm ? rm[1].trim() : nameRole.trim(), role: rm ? rm[2] : '', description: desc });
            } else if (!/^\s/.test(ln) || /^\s*-\s+\*\*/.test(ln)) {
              inSystems = false;
            }
          }
          if (inEvents) {
            const em = ln.match(/^\s{2,}-\s+(.+?)(?:\s+—\s+(.+))?$/);
            if (em) { discoveryInputs.eventTypes.push(em[1].trim()); }
            else if (!/^\s/.test(ln) || /^\s*-\s+\*\*/.test(ln)) { inEvents = false; }
          }

          if (currentSection === 'requirements') {
            const rm = ln.match(/^\s*-\s+\*\*(.+?):\*\*\s*(.+)/);
            if (rm) discoveryInputs.requirements[rm[1].trim()] = rm[2].trim();
          }
          if (currentSection === 'goals') {
            const gm = ln.match(/^\s*-\s+\*\*(.+?):\*\*\s*(.+)/);
            if (gm) discoveryInputs.goals[gm[1].trim()] = gm[2].trim();
          }
        }
      }
    } catch {}
  }

  const discoverySummary = skills.find(s => s.skill === 'solace-discovery')?.summary || '';
  const nextStep = SKILL_ORDER.find(sk => {
    if (sk === 'solace-discovery' || sk === 'solace-plan') return false;
    if (skipped.includes(sk)) return false;
    const entry = skills.find(s => s.skill === sk);
    return !entry || entry.status !== 'complete';
  });
  const allDone = !nextStep;

  const planEntry = skills.find(s => s.skill === 'solace-plan');
  const planRunning = planEntry?.status === 'in-progress';
  const planDone = planEntry?.status === 'complete';
  const planTotal = SKILL_ORDER.length - 2;
  const planCompleted = skills.filter(s => s.skill !== 'solace-plan' && s.skill !== 'solace-discovery' && s.status === 'complete').length + skipped.length;

  let execGroupIdx = -1;
  let execSkillLabel = '';
  if (planRunning) {
    const runningSkill = skills.find(s => s.skill !== 'solace-plan' && s.status === 'in-progress');
    if (runningSkill) {
      execSkillLabel = SKILL_LABELS[runningSkill.skill] || runningSkill.skill;
      execGroupIdx = SKILL_GROUPS.findIndex(g => g.skills.includes(runningSkill.skill));
    } else {
      execGroupIdx = SKILL_GROUPS.findIndex(g =>
        g.skills.some(sk => !skills.find(s => s.skill === sk) && !skipped.includes(sk))
      );
      if (execGroupIdx >= 0) {
        const nextSk = SKILL_GROUPS[execGroupIdx].skills.find(sk => !skills.find(s => s.skill === sk) && !skipped.includes(sk));
        execSkillLabel = SKILL_LABELS[nextSk] || nextSk || '';
      }
    }
  }

  const defaultGroup = execGroupIdx >= 0 ? execGroupIdx : (allDone ? SKILL_GROUPS.length - 1 : 0);

  function getSkillStatus(sk) {
    const entry = skills.find(s => s.skill === sk);
    const isSkipped = skipped.includes(sk);
    if (isSkipped) return 'skipped';
    if (entry?.status === 'complete') return 'complete';
    if (entry?.status === 'in-progress') return 'in-progress';
    // Treat real failure statuses as failures so the icon logic can flag them
    // distinctly from "not yet started" (which is a benign state for any
    // conditional skill that simply doesn't apply to this project).
    if (entry && ['blocked', 'partial', 'interrupted'].includes(entry.status)) return 'failed';
    return 'not-started';
  }

  // Group status colors carry meaning. We use orange ONLY when something failed
  // — never as a "partial progress" indicator. Conditional design skills that
  // a project doesn't need (e.g. SAM/Mesh/HA-DR on a single-site, non-AI build)
  // would otherwise drag the parent group to orange, which reads as "concern"
  // even though the project is healthy. Rules:
  //   - any failure (blocked/partial/interrupted)  → orange (real concern)
  //   - anything in-progress                        → running dot
  //   - at least one complete (and no failure)      → green (group is healthy)
  //   - nothing started yet                         → dimmed gray (idle)
  function getGroupStatusIcon(group) {
    const statuses = group.skills.map(sk => getSkillStatus(sk));
    const hasFailure = statuses.includes('failed');
    const hasRunning = statuses.includes('in-progress');
    const hasComplete = statuses.includes('complete');
    if (hasFailure) return '<span style="color:var(--orange)" title="failure in this phase">&#9679;</span>';
    if (hasRunning) return '<span class="tree-running-dot"></span>';
    if (hasComplete) return '<span style="color:var(--classic-green)">&#10003;</span>';
    return '<span style="color:var(--text-muted);opacity:0.4">&#9679;</span>';
  }

  function getSkillStatusIcon(sk) {
    const st = getSkillStatus(sk);
    if (st === 'complete') return '<span style="color:var(--classic-green)">&#10003;</span>';
    if (st === 'failed') return '<span style="color:var(--orange)" title="needs attention">!</span>';
    if (st === 'in-progress') return '<span class="tree-running-dot"></span>';
    if (st === 'skipped') return '<span style="color:var(--text-muted)">&#8212;</span>';
    return '<span style="color:var(--text-muted);opacity:0.3">&#9675;</span>';
  }

  const view = document.getElementById('view');
  view.innerHTML = `
    <div class="section">
      <span class="overline">${mode.toUpperCase()} MODE</span>
      <h1>${context?.display_name || state.current.slug}</h1>
      ${discoverySummary ? `<p style="color:var(--text-dim);margin-top:4px;max-width:720px;line-height:1.6">${escHtml(discoverySummary)}</p>` : ''}
    </div>
    <div class="card-grid">
      <div class="card">
        <div class="card-label">Skills Completed</div>
        <div class="card-value">${completedSkills.length}<span style="font-size:16px;color:var(--text-muted);font-weight:400"> / ${SKILL_ORDER.length}</span></div>
        <div class="card-sub">${skipped.length} skipped</div>
      </div>
      ${systemsList.length > 0 ? `<div class="card card-clickable" data-nav="openitems" title="View connected systems">
        <div class="card-label">Connected Systems</div>
        <div class="card-value">${systemsList.length}</div>
        <div class="card-sub">${systemsList.filter(s => /producer/.test(s.role)).length} producers · ${systemsList.filter(s => /consumer/.test(s.role)).length} consumers</div>
      </div>` : ''}
      <div class="card">
        <div class="card-label">Artifacts</div>
        <div class="card-value">${totalArtifacts}</div>
        <div class="card-sub">files generated</div>
      </div>
      <div class="card card-clickable" data-nav="decisions" title="View decisions">
        <div class="card-label">Decisions</div>
        <div class="card-value">${userDecisions.length}</div>
        <div class="card-sub">${reviewFindings.length} review findings</div>
      </div>
      ${openItems.length > 0 ? `<div class="card card-clickable" data-nav="openitems" title="View open items">
        <div class="card-label">Open Items</div>
        <div class="card-value">${openCount}</div>
        <div class="card-sub">${openItems.length - openCount} resolved</div>
      </div>` : ''}
      <div class="card">
        <div class="card-label">Execution Time</div>
        <div class="card-value">${fmtTime(totalExec)}</div>
        <div class="card-sub">${fmtTime(totalWait)} user wait / ${fmtTime(totalWall)} wall</div>
      </div>
      ${(() => {
        // Live-tenant Event Portal provisioning status card.
        // Visible when the user either (a) opted in at intake, or (b) ran the
        // skill ad hoc. Always tell the user what state Solace Cloud is in.
        if (!wantEpProvision && !epProvisionEntry) return '';
        const asyncapiCount = (files || []).filter(f => f.includes('13-event-portal/asyncapi/')).length;
        const provisionedFile = (files || []).find(f => f === '13-event-portal/provisioned.yaml');
        if (!epProvisionEntry) {
          return `<div class="card" title="Opt-in via preferences.provision_event_portal at intake">
            <div class="card-label">EP Provisioning</div>
            <div class="card-value" style="font-size:18px;color:var(--text-muted)">Pending</div>
            <div class="card-sub">Run /solace-ep-provision to write to your Solace Cloud tenant</div>
          </div>`;
        }
        const st = epProvisionEntry.status;
        if (st === 'complete') {
          return `<div class="card card-clickable" data-nav="artifacts" title="${provisionedFile ? escHtml(provisionedFile) : 'Event Portal artifacts'}">
            <div class="card-label">EP Provisioning</div>
            <div class="card-value" style="font-size:18px;color:var(--classic-green)">Live</div>
            <div class="card-sub">${asyncapiCount} AsyncAPI ${asyncapiCount === 1 ? 'spec' : 'specs'} exported · tenant updated</div>
          </div>`;
        }
        if (st === 'blocked' || st === 'interrupted' || st === 'partial') {
          const reason = (epProvisionEntry.summary || epProvisionEntry.step_reached || st).split('\n')[0].slice(0, 80);
          return `<div class="card" style="border-left:3px solid var(--orange)" title="${escHtml(epProvisionEntry.summary || '')}">
            <div class="card-label">EP Provisioning</div>
            <div class="card-value" style="font-size:18px;color:var(--orange)">${st.charAt(0).toUpperCase() + st.slice(1)}</div>
            <div class="card-sub">${escHtml(reason)}</div>
          </div>`;
        }
        if (st === 'in-progress') {
          return `<div class="card">
            <div class="card-label">EP Provisioning</div>
            <div class="card-value" style="font-size:18px;color:var(--orange)">Running</div>
            <div class="card-sub">${escHtml(epProvisionEntry.step_reached || 'In progress')}</div>
          </div>`;
        }
        return '';
      })()}
    </div>
    ${systemsList.length > 0 ? `
    <div class="section" style="margin-top:8px">
      <h2 style="font-size:16px;margin-bottom:12px">Connected Systems (${systemsList.length})</h2>
      <div class="table-wrap"><table>
        <thead><tr><th>System</th><th>Role</th><th>Description</th></tr></thead>
        <tbody>${systemsList.map(s => `<tr>
          <td style="font-weight:600;color:var(--text);white-space:nowrap">${escHtml(s.name)}</td>
          <td style="font-size:12px;font-family:'Space Mono',monospace;color:var(--text-dim)">${escHtml(s.role)}</td>
          <td style="font-size:13px;color:var(--text-dim)">${escHtml(s.description)}</td>
        </tr>`).join('')}</tbody>
      </table></div>
    </div>` : ''}
    <div id="overviewGroupContent"></div>
    <div id="skillDetailContainer"></div>`;

  const sidebar = document.getElementById('rightSidebar');
  sidebar.classList.remove('hidden');
  sidebar.innerHTML = `
    <div class="overline" style="margin-bottom:12px">SKILLS</div>
    <ul class="skill-tree" id="skillTree">
      <li><a href="#" class="skill-tree-overview active" data-action="overview">Overview</a></li>
      ${SKILL_GROUPS.map((g, gi) => `
        <li class="skill-tree-group">
          <a href="#" class="skill-tree-group-link" data-group="${gi}">
            ${getGroupStatusIcon(g)}
            <span>${g.label}</span>
          </a>
          <ul class="skill-tree-items">
            ${g.skills.map(sk => `
              <li>
                <a href="#" class="skill-tree-item" data-skill="${sk}" data-group="${gi}">
                  ${getSkillStatusIcon(sk)}
                  <span>${SKILL_LABELS[sk] || sk}</span>
                </a>
              </li>
            `).join('')}
          </ul>
        </li>
      `).join('')}
    </ul>`;

  view.dataset.tocManaged = 'true';

  view.querySelectorAll('.card-clickable').forEach(card => {
    card.style.cursor = 'pointer';
    card.addEventListener('click', () => {
      const nav = card.dataset.nav;
      if (nav) navigateTo(nav);
    });
  });

  function renderAllGroups() {
    const container = document.getElementById('overviewGroupContent');
    container.innerHTML = SKILL_GROUPS.map((group, gi) => {
      const groupComplete = group.skills.filter(sk => getSkillStatus(sk) === 'complete' || getSkillStatus(sk) === 'skipped').length;

      let separator = '';
      if (planRunning && gi === execGroupIdx) {
        separator = `<div class="execution-separator orchestrating">
          <div class="execution-line"></div>
          <div class="execution-label">
            <span class="execution-name">Execution</span>
            <span class="badge badge-orchestrating">RUNNING ${planCompleted}/${planTotal}</span>
            ${execSkillLabel ? `<span class="execution-detail">Executing <strong>${execSkillLabel}</strong></span>` : ''}
          </div>
          <div class="execution-line"></div>
        </div>`;
      } else if (planDone && gi === 0) {
        separator = `<div class="execution-separator complete">
          <div class="execution-line"></div>
          <div class="execution-label">
            <span class="execution-name">Execution</span>
            <span class="badge badge-complete">COMPLETE</span>
            ${planEntry?.timing ? `<span class="execution-timing">${fmtTime(planEntry.timing.execution_sec)}</span>` : ''}
          </div>
          <div class="execution-line"></div>
        </div>`;
      }

      return `${separator}
      <div class="skill-group" data-phase="${group.phase}">
        <div class="skill-group-header">
          <span class="skill-group-label">${group.label}</span>
          <span class="skill-group-progress">${groupComplete}/${group.skills.length}</span>
        </div>
        <div class="skill-grid">
          ${group.skills.map(sk => {
            const entry = skills.find(s => s.skill === sk);
            const isSkipped = skipped.includes(sk);
            let cls = 'not-started', badge = '', timing = '', artifactCount = '', skipReason = '';
            if (isSkipped) {
              cls = 'skipped';
              skipReason = SKIP_REASONS[sk] || 'Not applicable';
              badge = '<span class="badge badge-skipped">N/A</span>';
            } else if (entry?.status === 'complete') {
              cls = 'complete clickable';
              badge = '<span class="badge badge-complete">COMPLETE</span>';
              timing = entry.timing ? fmtTime(entry.timing.execution_sec) : '';
              const ac = entry.artifacts?.length || 0;
              if (ac > 0) artifactCount = `${ac} artifact${ac > 1 ? 's' : ''}`;
            } else if (entry?.status === 'in-progress') {
              cls = 'in-progress clickable';
              badge = `<span class="badge badge-in-progress">${entry.step_reached || 'IN PROGRESS'}</span>`;
            }
            return `<div class="skill-card ${cls}" data-skill="${sk}" data-group="${gi}">
              <div class="skill-name">${SKILL_LABELS[sk] || sk}</div>
              <div class="skill-status">${badge}</div>
              ${skipReason ? `<div class="skill-skip-reason">${escHtml(skipReason)}</div>` : ''}
              ${timing || artifactCount ? `<div class="skill-timing">${[timing, artifactCount].filter(Boolean).join(' · ')}</div>` : ''}
            </div>`;
          }).join('')}
        </div>
      </div>`;
    }).join('');

    container.addEventListener('click', e => {
      const card = e.target.closest('.skill-card.clickable');
      if (!card) return;
      const sk = card.dataset.skill;
      const gi = parseInt(card.dataset.group);
      selectGroup(gi);
      showSkillDetail(sk, gi);
    });
  }

  function renderGroupTiles(gi, selectedSkill) {
    const group = SKILL_GROUPS[gi];
    const groupComplete = group.skills.filter(sk => getSkillStatus(sk) === 'complete' || getSkillStatus(sk) === 'skipped').length;
    const container = document.getElementById('overviewGroupContent');
    container.innerHTML = `
      <div class="skill-group" data-phase="${group.phase}" id="skillGrid">
        <div class="skill-group-header">
          <span class="skill-group-label">${group.label}</span>
          <span class="skill-group-progress">${groupComplete}/${group.skills.length}</span>
        </div>
        <div class="skill-grid">
          ${group.skills.map(sk => {
            const entry = skills.find(s => s.skill === sk);
            const isSkipped = skipped.includes(sk);
            let cls = 'not-started', badge = '', timing = '', artifactCount = '', skipReason = '';
            if (isSkipped) {
              cls = 'skipped';
              skipReason = SKIP_REASONS[sk] || 'Not applicable';
              badge = '<span class="badge badge-skipped">N/A</span>';
            } else if (entry?.status === 'complete') {
              cls = 'complete clickable';
              badge = '<span class="badge badge-complete">COMPLETE</span>';
              timing = entry.timing ? fmtTime(entry.timing.execution_sec) : '';
              const ac = entry.artifacts?.length || 0;
              if (ac > 0) artifactCount = `${ac} artifact${ac > 1 ? 's' : ''}`;
            } else if (entry?.status === 'in-progress') {
              cls = 'in-progress clickable';
              badge = `<span class="badge badge-in-progress">${entry.step_reached || 'IN PROGRESS'}</span>`;
            }
            if (selectedSkill === sk) cls += ' expanded';
            return `<div class="skill-card ${cls}" data-skill="${sk}">
              <div class="skill-name">${SKILL_LABELS[sk] || sk}</div>
              <div class="skill-status">${badge}</div>
              ${skipReason ? `<div class="skill-skip-reason">${escHtml(skipReason)}</div>` : ''}
              ${timing || artifactCount ? `<div class="skill-timing">${[timing, artifactCount].filter(Boolean).join(' · ')}</div>` : ''}
            </div>`;
          }).join('')}
        </div>
      </div>`;

    document.getElementById('skillGrid').addEventListener('click', e => {
      const card = e.target.closest('.skill-card.clickable');
      if (!card) return;
      const sk = card.dataset.skill;
      showSkillDetail(sk, gi);
    });
  }

  function showSkillDetail(sk, gi) {
    const entry = skills.find(s => s.skill === sk);
    if (!entry) return;

    document.querySelectorAll('.skill-tree-item').forEach(el => el.classList.remove('active'));
    const treeItem = document.querySelector(`.skill-tree-item[data-skill="${sk}"]`);
    if (treeItem) treeItem.classList.add('active');

    renderGroupTiles(gi, sk);

    const container = document.getElementById('skillDetailContainer');
    const t = entry.timing;
    const entryArtifacts = entry.artifacts || [];
    const steps = t?.steps || [];

    container.innerHTML = `
      <div class="skill-detail-panel">
        <h3>${SKILL_LABELS[sk] || sk}</h3>
        ${entry.summary ? `<div class="detail-summary">${escHtml(entry.summary)}</div>` : ''}
        <div style="display:flex;gap:24px;flex-wrap:wrap;margin-bottom:16px">
          ${t ? `
            <div><div class="card-label">Execution</div><div style="font-weight:600;color:var(--accent)">${fmtTime(t.execution_sec)}</div></div>
            ${t.user_wait_sec > 0 ? `<div><div class="card-label">User Wait</div><div style="font-weight:600;color:var(--text-dim)">${fmtTime(t.user_wait_sec)}</div></div>` : ''}
            <div><div class="card-label">Wall Time</div><div style="font-weight:600;color:var(--text-dim)">${fmtTime(t.wall_sec)}</div></div>
          ` : ''}
          <div><div class="card-label">Status</div><div style="font-weight:600;color:var(--accent)">${entry.step_reached || entry.status}</div></div>
        </div>
        ${steps.length > 0 ? `
          <div class="detail-section">
            <div class="detail-section-title">Steps</div>
            <div class="timeline-steps">${steps.map(st =>
              `<span class="timeline-step">${st.label || 'Step ' + st.step} <span class="timeline-step-time">${fmtTime(st.execution_sec)}</span></span>`
            ).join('')}</div>
          </div>
        ` : ''}
        ${entryArtifacts.length > 0 ? `
          <div class="detail-section">
            <div class="detail-section-title">Artifacts</div>
            <ul class="detail-artifacts">
              ${entryArtifacts.map(a => `<li><strong style="color:var(--text)">${a.path.split('/').pop()}</strong> — ${a.description || a.type || ''}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
      </div>`;

    setTimeout(() => {
      const panel = container.querySelector('.skill-detail-panel');
      const scrollParent = document.getElementById('content');
      const panelTop = panel.getBoundingClientRect().top - scrollParent.getBoundingClientRect().top + scrollParent.scrollTop;
      scrollParent.scrollTo({ top: panelTop - 16, behavior: 'smooth' });
    }, 50);
  }

  function clearTreeSelection() {
    document.querySelectorAll('.skill-tree-group-link').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.skill-tree-items').forEach(el => el.classList.remove('expanded'));
    document.querySelectorAll('.skill-tree-item').forEach(el => el.classList.remove('active'));
    document.querySelector('.skill-tree-overview')?.classList.remove('active');
  }

  function selectOverview() {
    clearTreeSelection();
    document.querySelector('.skill-tree-overview')?.classList.add('active');
    document.getElementById('skillDetailContainer').innerHTML = '';
    renderAllGroups();
    document.getElementById('content').scrollTo({ top: 0, behavior: 'smooth' });
  }

  function selectGroup(gi) {
    clearTreeSelection();
    const groupLink = document.querySelector(`.skill-tree-group-link[data-group="${gi}"]`);
    if (groupLink) {
      groupLink.classList.add('active');
      groupLink.closest('.skill-tree-group').querySelector('.skill-tree-items').classList.add('expanded');
    }
    document.getElementById('skillDetailContainer').innerHTML = '';
    renderGroupTiles(gi, null);
    document.getElementById('content').scrollTo({ top: 0, behavior: 'smooth' });
  }

  document.getElementById('skillTree').addEventListener('click', e => {
    e.preventDefault();
    const overviewLink = e.target.closest('.skill-tree-overview');
    const groupLink = e.target.closest('.skill-tree-group-link');
    const itemLink = e.target.closest('.skill-tree-item');

    if (overviewLink) {
      selectOverview();
      return;
    }
    if (itemLink) {
      const gi = parseInt(itemLink.dataset.group);
      const sk = itemLink.dataset.skill;
      selectGroup(gi);
      showSkillDetail(sk, gi);
      return;
    }
    if (groupLink) {
      selectGroup(parseInt(groupLink.dataset.group));
    }
  });

  selectOverview();
}

/* ─── TIMELINE ─── */

function timeline() {
  const skills = getSkills(state.data.progress).filter(s => s.timing);
  const maxWall = Math.max(...skills.map(s => s.timing?.wall_sec || 0), 1);
  const totalExec = skills.reduce((a, s) => a + (s.timing?.execution_sec || 0), 0);
  const totalWait = skills.reduce((a, s) => a + (s.timing?.user_wait_sec || 0), 0);
  const totalWall = skills.reduce((a, s) => a + (s.timing?.wall_sec || 0), 0);

  document.getElementById('view').innerHTML = `
    <div class="section">
      <span class="overline">EXECUTION TIMELINE</span>
      <h1>Timeline</h1>
      <p style="color:var(--text-dim);margin-top:8px">${skills.length} skills executed. ${fmtTime(totalExec)} execution / ${fmtTime(totalWait)} user wait / ${fmtTime(totalWall)} wall time.</p>
    </div>
    <div class="split-layout">
      <div class="split-sidebar" id="tlSidebar">
        <div class="split-sidebar-group">Skills</div>
        <div class="split-sidebar-item active" data-skill="all">All Skills</div>
        ${skills.map(s => `<div class="split-sidebar-item" data-skill="${s.skill}">
          ${SKILL_LABELS[s.skill] || s.skill}
          <div style="font-family:'Space Mono',monospace;font-size:10px;color:var(--text-muted);margin-top:2px">${fmtTime(s.timing.execution_sec)}</div>
        </div>`).join('')}
      </div>
      <div class="split-content" id="tlContent">
        ${renderTimelineAll(skills, maxWall)}
      </div>
    </div>`;

  document.getElementById('tlSidebar').addEventListener('click', e => {
    const item = e.target.closest('.split-sidebar-item');
    if (!item) return;
    document.querySelectorAll('#tlSidebar .split-sidebar-item').forEach(el => el.classList.remove('active'));
    item.classList.add('active');
    const sk = item.dataset.skill;
    const content = document.getElementById('tlContent');
    if (sk === 'all') {
      content.innerHTML = renderTimelineAll(skills, maxWall);
    } else {
      const entry = skills.find(s => s.skill === sk);
      if (entry) content.innerHTML = renderTimelineDetail(entry);
    }
  });
}

function renderTimelineAll(skills, maxWall) {
  return `
    <h2 style="margin-top:0">All Skills</h2>
    <div class="timeline-container">
      ${skills.map(s => {
        const t = s.timing;
        const execPct = ((t.execution_sec / maxWall) * 100).toFixed(1);
        const waitPct = ((t.user_wait_sec / maxWall) * 100).toFixed(1);
        return `<div class="timeline-entry">
          <div class="timeline-row">
            <div class="timeline-label">${SKILL_LABELS[s.skill] || s.skill}</div>
            <div class="timeline-bar-wrap">
              <div class="timeline-bar exec" style="width:${execPct}%">
                ${t.execution_sec > 10 ? `<span class="timeline-bar-text">${fmtTime(t.execution_sec)}</span>` : ''}
              </div>
              ${t.user_wait_sec > 0 ? `<div class="timeline-bar wait" style="left:${execPct}%;width:${waitPct}%"></div>` : ''}
            </div>
            <div class="timeline-time">${fmtTime(t.wall_sec)}</div>
          </div>
        </div>`;
      }).join('')}
    </div>
    <div style="display:flex;gap:20px;margin-top:16px">
      <div style="display:flex;align-items:center;gap:6px">
        <div style="width:14px;height:14px;border-radius:3px;background:var(--classic-green);opacity:0.85"></div>
        <span style="font-size:13px;color:var(--text-dim)">Execution time</span>
      </div>
      <div style="display:flex;align-items:center;gap:6px">
        <div style="width:14px;height:14px;border-radius:3px;background:var(--orange);opacity:0.4"></div>
        <span style="font-size:13px;color:var(--text-dim)">User wait time</span>
      </div>
    </div>`;
}

function renderTimelineDetail(entry) {
  const t = entry.timing;
  const steps = t?.steps || [];
  const questions = t?.questions || [];
  return `
    <h2 style="margin-top:0">${SKILL_LABELS[entry.skill] || entry.skill}</h2>
    ${entry.summary ? `<p style="color:var(--text-dim);margin-bottom:16px;line-height:1.6">${escHtml(entry.summary)}</p>` : ''}
    <div style="display:flex;gap:24px;flex-wrap:wrap;margin-bottom:24px">
      <div><div class="card-label">Execution</div><div style="font-size:22px;font-weight:700;color:var(--accent)">${fmtTime(t.execution_sec)}</div></div>
      ${t.user_wait_sec > 0 ? `<div><div class="card-label">User Wait</div><div style="font-size:22px;font-weight:700;color:var(--orange)">${fmtTime(t.user_wait_sec)}</div></div>` : ''}
      <div><div class="card-label">Wall Time</div><div style="font-size:22px;font-weight:700;color:var(--text-dim)">${fmtTime(t.wall_sec)}</div></div>
      <div><div class="card-label">Status</div><div style="font-size:14px;font-weight:600;color:var(--accent);margin-top:6px">${entry.step_reached || entry.status}</div></div>
    </div>
    ${steps.length > 0 ? `
      <h3>Steps</h3>
      <div class="table-wrap"><table>
        <thead><tr><th>#</th><th>Step</th><th>Execution</th></tr></thead>
        <tbody>
          ${steps.map(st => `<tr>
            <td>${st.step}</td>
            <td style="color:var(--text)">${st.label || 'Step ' + st.step}</td>
            <td><span class="skill-timing">${fmtTime(st.execution_sec)}</span></td>
          </tr>`).join('')}
        </tbody>
      </table></div>
    ` : ''}
    ${questions.length > 0 ? `
      <h3>Questions</h3>
      <div class="table-wrap"><table>
        <thead><tr><th>ID</th><th>Question</th><th>Wait Time</th></tr></thead>
        <tbody>
          ${questions.map(q => `<tr>
            <td>${q.id}</td>
            <td style="color:var(--text)">${q.label || q.id}</td>
            <td><span class="skill-timing">${fmtTime(q.wait_sec)}</span></td>
          </tr>`).join('')}
        </tbody>
      </table></div>
    ` : ''}
    ${entry.artifacts?.length > 0 ? `
      <h3>Artifacts</h3>
      <ul style="list-style:none;padding:0">
        ${entry.artifacts.map(a => `<li style="padding:6px 0;border-bottom:1px solid var(--border);font-size:13px;color:var(--text-dim)">
          <strong style="color:var(--text)">${a.path.split('/').pop()}</strong> — ${a.description || a.type || ''}
        </li>`).join('')}
      </ul>
    ` : ''}`;
}

/* ─── DECISIONS ─── */

function decisions() {
  const { items, mode } = getDecisions(state.data.decisions);

  const userDecs = items.filter(d => d.id || (d.skill && !d.source));
  const findings = items.filter(d => d.source);

  const decBySkill = {};
  userDecs.forEach(d => {
    const sk = d.skill || 'unknown';
    if (!decBySkill[sk]) decBySkill[sk] = [];
    decBySkill[sk].push(d);
  });

  const findBySource = {};
  findings.forEach(d => {
    const src = d.source || 'unknown';
    if (!findBySource[src]) findBySource[src] = [];
    findBySource[src].push(d);
  });

  const view = document.getElementById('view');
  view.innerHTML = `
    <div class="section">
      <span class="overline">${mode.toUpperCase()} MODE</span>
      <h1>Decisions</h1>
    </div>
    <div class="split-layout">
      <div class="split-sidebar" id="decSidebar">
        ${userDecs.length > 0 ? `<div class="split-sidebar-group">User Decisions</div>` : ''}
        ${userDecs.length > 0 ? `<div class="split-sidebar-item active" data-section="all-decisions">All (${userDecs.length})</div>` : ''}
        ${Object.keys(decBySkill).map(sk =>
          `<div class="split-sidebar-item" data-section="dec-${sk}">${SKILL_LABELS[sk] || sk} (${decBySkill[sk].length})</div>`
        ).join('')}
        ${findings.length > 0 ? `<div class="split-sidebar-group">Review Findings</div>` : ''}
        ${findings.length > 0 ? `<div class="split-sidebar-item" data-section="all-findings">All (${findings.length})</div>` : ''}
        ${Object.keys(findBySource).map(src =>
          `<div class="split-sidebar-item" data-section="find-${src}">${SKILL_LABELS[src] || src} (${findBySource[src].length})</div>`
        ).join('')}
      </div>
      <div class="split-content" id="decContent">
        ${renderDecisionTable(userDecs, 'All User Decisions')}
      </div>
    </div>`;

  document.getElementById('decSidebar').addEventListener('click', e => {
    const item = e.target.closest('.split-sidebar-item');
    if (!item) return;
    document.querySelectorAll('#decSidebar .split-sidebar-item').forEach(el => el.classList.remove('active'));
    item.classList.add('active');
    const section = item.dataset.section;
    const content = document.getElementById('decContent');

    if (section === 'all-decisions') {
      content.innerHTML = renderDecisionTable(userDecs, 'All User Decisions');
    } else if (section === 'all-findings') {
      content.innerHTML = renderFindingsTable(findings, 'All Review Findings');
    } else if (section.startsWith('dec-')) {
      const sk = section.slice(4);
      content.innerHTML = renderDecisionTable(decBySkill[sk] || [], SKILL_LABELS[sk] || sk);
    } else if (section.startsWith('find-')) {
      const src = section.slice(5);
      content.innerHTML = renderFindingsTable(findBySource[src] || [], SKILL_LABELS[src] || src);
    }
  });
}

function dashSkillLink(skill) {
  const label = SKILL_LABELS[skill] || skill || '';
  return label ? `<a href="#artifacts" class="xref-link" onclick="navigateTo('artifacts');return false;">${label}</a>` : '';
}

function renderDecisionTable(decs, title) {
  if (decs.length === 0) return `<div class="empty"><p>No decisions recorded</p></div>`;
  return `
    <h2 style="margin-top:0">${title}</h2>
    <div class="table-wrap"><table>
      <thead><tr><th>Decision</th><th>Skill</th><th>Value</th><th>Rationale</th></tr></thead>
      <tbody>
        ${decs.map(d => `<tr>
          <td><span class="badge badge-user">${escHtml(d.id || d.decision || '')}</span></td>
          <td>${dashSkillLink(d.skill)}</td>
          <td style="color:var(--text)">${escHtml(d.label || d.value || d.choice || '')}</td>
          <td style="color:var(--text-dim);font-size:13px">${escHtml(d.question || d.rationale || '')}</td>
        </tr>`).join('')}
      </tbody>
    </table></div>`;
}

function renderFindingsTable(findings, title) {
  if (findings.length === 0) return `<div class="empty"><p>No findings</p></div>`;
  return `
    <h2 style="margin-top:0">${title}</h2>
    <div class="table-wrap"><table>
      <thead><tr><th>Source</th><th>Severity</th><th>Decision</th><th>Status</th></tr></thead>
      <tbody>
        ${findings.map(d => {
          const sev = d.severity || 'advisory';
          return `<tr>
            <td>${dashSkillLink(d.source)}</td>
            <td><span class="badge badge-${sev}">${sev.toUpperCase()}</span></td>
            <td style="color:var(--text)">${escHtml(d.decision || '')}</td>
            <td>${escHtml(d.action || '')}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table></div>`;
}

/* ─── OPEN ITEMS ─── */

function openItemsView() {
  const items = getOpenItems(state.data.openItems);

  if (items.length === 0) {
    const view = document.getElementById('view');
    view.innerHTML = `<div class="section"><h1>Open Items</h1></div><div class="empty"><p>No open items tracked for this project.</p></div>`;
    const sidebar = document.getElementById('rightSidebar');
    sidebar.classList.add('hidden');
    return;
  }

  const openCount = items.filter(i => (i.status||'open') !== 'resolved').length;
  const bySev = {};
  items.forEach(i => { const s = (i.severity||'advisory').toLowerCase(); bySev[s] = (bySev[s]||0) + 1; });
  const bySource = {};
  items.forEach(i => { const s = i.source || 'unknown'; if (!bySource[s]) bySource[s] = []; bySource[s].push(i); });
  const byStatus = {};
  items.forEach(i => { const s = (i.status||'open').toLowerCase(); byStatus[s] = (byStatus[s]||0) + 1; });

  const view = document.getElementById('view');
  view.innerHTML = `
    <div class="section">
      <h1>Open Items</h1>
      <p style="color:var(--text-dim);margin-top:4px">${openCount} of ${items.length} items remain open or in progress</p>
      <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
        ${['blocking','high','medium','advisory'].filter(s => bySev[s]).map(s =>
          `<span class="badge ${SEV_BADGE[s]}">${bySev[s]} ${s}</span>`
        ).join('')}
      </div>
    </div>
    <div class="split-layout">
      <div class="split-sidebar" id="oiSidebar">
        <div class="split-sidebar-group">By Status</div>
        <div class="split-sidebar-item active" data-filter="all">All (${items.length})</div>
        ${['open','in-progress','resolved'].filter(s => byStatus[s]).map(s =>
          `<div class="split-sidebar-item" data-filter="status-${s}">${s.charAt(0).toUpperCase()+s.slice(1)} (${byStatus[s]})</div>`
        ).join('')}
        <div class="split-sidebar-group">By Severity</div>
        ${['blocking','high','medium','advisory'].filter(s => bySev[s]).map(s =>
          `<div class="split-sidebar-item" data-filter="sev-${s}">${s.charAt(0).toUpperCase()+s.slice(1)} (${bySev[s]})</div>`
        ).join('')}
        <div class="split-sidebar-group">By Source</div>
        ${Object.keys(bySource).map(src =>
          `<div class="split-sidebar-item" data-filter="src-${src}">${SKILL_LABELS[src]||src} (${bySource[src].length})</div>`
        ).join('')}
      </div>
      <div class="split-content" id="oiContent">
        ${renderOpenItemsTable(items, 'All Open Items')}
      </div>
    </div>`;

  document.getElementById('oiSidebar').addEventListener('click', e => {
    const item = e.target.closest('.split-sidebar-item');
    if (!item) return;
    document.querySelectorAll('#oiSidebar .split-sidebar-item').forEach(el => el.classList.remove('active'));
    item.classList.add('active');
    const f = item.dataset.filter;
    const content = document.getElementById('oiContent');

    if (f === 'all') {
      content.innerHTML = renderOpenItemsTable(items, 'All Open Items');
    } else if (f.startsWith('status-')) {
      const st = f.slice(7);
      const filtered = items.filter(i => (i.status||'open').toLowerCase() === st);
      content.innerHTML = renderOpenItemsTable(filtered, st.charAt(0).toUpperCase()+st.slice(1) + ' Items');
    } else if (f.startsWith('sev-')) {
      const sv = f.slice(4);
      const filtered = items.filter(i => (i.severity||'advisory').toLowerCase() === sv);
      content.innerHTML = renderOpenItemsTable(filtered, sv.charAt(0).toUpperCase()+sv.slice(1) + ' Severity');
    } else if (f.startsWith('src-')) {
      const src = f.slice(4);
      content.innerHTML = renderOpenItemsTable(bySource[src] || [], SKILL_LABELS[src] || src);
    }
  });
}

function renderOpenItemsTable(items, title) {
  if (items.length === 0) return `<div class="empty"><p>No items match this filter</p></div>`;
  return `
    <h2 style="margin-top:0">${title}</h2>
    <div class="table-wrap"><table>
      <thead><tr><th>ID</th><th>Severity</th><th>Description</th><th>Source</th><th>Resolution Path</th><th>Status</th></tr></thead>
      <tbody>
        ${items.map(item => {
          const sev = (item.severity||'advisory').toLowerCase();
          const st = (item.status||'open').toLowerCase();
          return `<tr>
            <td><span class="badge badge-user">${escHtml(item.id)}</span></td>
            <td><span class="badge ${SEV_BADGE[sev]||'badge-advisory'}">${sev}</span></td>
            <td style="color:var(--text)">${escHtml(item.description)}</td>
            <td>${dashSkillLink(item.source)}</td>
            <td style="color:var(--text-dim);font-size:13px">${escHtml(item.resolution||'')}</td>
            <td><span class="badge ${STATUS_BADGE[st]||'badge-open'}">${st}</span></td>
          </tr>`;
        }).join('')}
      </tbody>
    </table></div>`;
}

/* ─── ARTIFACTS ─── */

// Map a file's basename to a human-readable title. Pattern-based first; falls
// back to title-cased filename without the extension.
function artifactTitleFor(path) {
  const file = path.split('/').pop() || path;
  const base = file.replace(/\.[^.]+$/, '');
  const known = {
    'discovery-brief': 'Discovery Brief',
    'topic-taxonomy': 'Topic Taxonomy',
    'wildcard-subscriptions': 'Wildcard Subscriptions',
    'antipattern-report': 'Antipattern Report',
    'broker-recommendation': 'Broker Recommendation',
    'protocol-map': 'Protocol Map',
    'sam-design': 'SAM Design',
    'mesh-design': 'Mesh Design',
    'ha-dr-plan': 'HA/DR Plan',
    'ha-dr-design': 'HA/DR Design',
    'migration-plan': 'Migration Plan',
    'integration-strategy': 'Integration Strategy',
    'event-portal-design': 'Event Portal Design',
    'provisioning-plan': 'Provisioning Plan',
    'provisioned': 'Provisioned Objects',
    'provisioning-report': 'Provisioning Report',
    'architect-review': 'Architect Review',
    'ops-review': 'Operations Review',
    'security-review': 'Security Review',
    'dev-review': 'Developer Review',
    'validation-report': 'Validation Report',
    'architecture': 'Architecture Document',
    'runbook': 'Operations Runbook',
    'provisioning-params': 'Provisioning Parameters',
    'executive-summary': 'Executive Summary',
    'business-architecture': 'Business Architecture',
    'roi-framework': 'ROI Framework',
    'README': 'Diagram Index',
  };
  if (known[base]) return known[base];
  // AsyncAPI: e.g. e-commerce-backend.yaml under asyncapi/
  if (path.includes('/asyncapi/')) {
    return `AsyncAPI — ${base.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')}`;
  }
  // Numbered mermaid diagrams: 01-system-context.mermaid → "01 · System Context"
  const numbered = base.match(/^(\d+)-(.+)$/);
  if (numbered) {
    const [, n, rest] = numbered;
    return `${n} · ${rest.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')}`;
  }
  return base.split(/[-_]/).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
}

// When no description exists in progress.yaml, build a sensible fallback from
// the file's location (skill group) and extension.
function artifactDefaultDescription(path) {
  const group = path.split('/')[0] || '';
  const ext = path.split('.').pop();
  const groupLabel = group.replace(/^\d+-/, '');
  const groupHumans = {
    '01-discovery': 'Discovery',
    '02-topic-design': 'Topic Design',
    '03-broker-select': 'Broker Selection',
    '04-sam-design': 'SAM Design',
    '05-protocol-select': 'Protocol Selection',
    '06-mesh-design': 'Mesh Design',
    '07-ha-dr': 'HA/DR',
    '08-integration': 'Integration',
    '09-migration': 'Migration',
    '10-reviews': 'Reviews',
    '11-validation': 'Validation',
    '12-blueprint': 'Blueprint',
    '13-event-portal': 'Event Portal',
    '14-executive': 'Executive',
  };
  const skillHuman = groupHumans[group] || groupLabel;
  if (ext === 'mermaid' || ext === 'mmd') return `Mermaid diagram from the ${skillHuman} step.`;
  if (ext === 'yaml' || ext === 'yml') return `Configuration produced by the ${skillHuman} step.`;
  if (ext === 'md') return `Document produced by the ${skillHuman} step.`;
  return `Artifact produced by the ${skillHuman} step.`;
}

function artifacts() {
  const files = state.data.files || [];
  const skills = getSkills(state.data.progress);
  const artDescMap = {};
  for (const sk of skills) {
    if (!sk.artifacts) continue;
    for (const a of sk.artifacts) {
      const key = a.path.replace(/^artifacts\//, '');
      if (a.description) artDescMap[key] = a.description;
    }
  }

  const groups = {};
  files.forEach(f => {
    const parts = f.split('/');
    const group = parts[0] || 'root';
    if (!groups[group]) groups[group] = [];
    groups[group].push(f);
  });

  const view = document.getElementById('view');
  view.innerHTML = `
    <div class="section">
      <span class="overline">${files.length} FILES</span>
      <h1>Artifacts</h1>
    </div>
    <div class="artifact-content" id="artifactContent" style="min-height:calc(100vh - 220px)">
      ${(() => {
        const exts = {};
        files.forEach(f => { const e = f.split('.').pop(); exts[e] = (exts[e] || 0) + 1; });
        const groupEntries = Object.entries(groups);
        return `
          <h2 style="margin-top:0">Artifact Summary</h2>
          <p style="color:var(--text-dim);margin-bottom:20px">${files.length} files across ${groupEntries.length} skill groups. Select a file from the sidebar to view its contents.</p>
          <div class="card-grid" style="margin-bottom:24px">
            ${Object.entries(exts).map(([ext, count]) => `
              <div class="card">
                <div class="card-label">.${ext}</div>
                <div class="card-value">${count}</div>
                <div class="card-sub">file${count !== 1 ? 's' : ''}</div>
              </div>
            `).join('')}
          </div>
          <h3>By Skill</h3>
          <div style="display:flex;flex-direction:column;gap:6px;margin-top:12px">
            ${groupEntries.map(([group, gFiles]) => `
              <div style="display:flex;align-items:center;gap:12px">
                <div style="width:140px;min-width:140px;font-size:13px;text-align:right;color:var(--text-dim)">${group.replace(/^\d+-/, '')}</div>
                <div style="flex:1;height:20px;background:rgba(255,255,255,0.04);border-radius:4px;overflow:hidden">
                  <div style="height:100%;width:${((gFiles.length / files.length) * 100).toFixed(1)}%;background:var(--accent);opacity:0.7;border-radius:4px;min-width:2px"></div>
                </div>
                <div style="width:50px;min-width:50px;font-family:'Space Mono',monospace;font-size:12px;color:var(--text-muted);text-align:right">${gFiles.length}</div>
              </div>
            `).join('')}
          </div>`;
      })()}
    </div>`;

  const sidebar = document.getElementById('rightSidebar');
  sidebar.classList.remove('hidden');
  sidebar.innerHTML = `
    <div class="overline" style="margin-bottom:8px">FILES</div>
    ${Object.entries(groups).map(([group, items]) => `
      <div style="margin-bottom:4px">
        <div style="font-family:'Space Mono',monospace;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--text-muted);padding:8px 0 2px">${group.replace(/^\d+-/, '')}</div>
        ${items.map(f => `<a href="#" class="toc-link artifact-link" data-path="${f}" title="${f}" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:12px;padding:4px 12px">${f.split('/').pop()}</a>`).join('')}
      </div>
    `).join('')}`;

  sidebar.querySelectorAll('.artifact-link').forEach(link => {
    link.addEventListener('click', async e => {
      e.preventDefault();
      sidebar.querySelectorAll('.artifact-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      const path = link.dataset.path;
      const content = document.getElementById('artifactContent');
      content.innerHTML = '<p style="color:var(--text-muted)">Loading...</p>';

      const res = await fetch(`/api/projects/${state.current.slug}/artifact?path=${encodeURIComponent(path)}`);
      if (!res.ok) { content.innerHTML = '<p>Failed to load artifact</p>'; return; }
      const text = await res.text();
      const ext = path.split('.').pop();

      const title = artifactTitleFor(path);
      const description = artDescMap[path] || artifactDefaultDescription(path);
      const headerHtml = `
        <div class="artifact-header">
          <div class="artifact-header-text">
            <h2 class="artifact-title">${escHtml(title)}</h2>
            <code class="artifact-path">${escHtml(path)}</code>
            ${description ? `<p class="artifact-description">${escHtml(description)}</p>` : ''}
          </div>
          <button class="btn btn-outline btn-copy" type="button" data-copy-target="artifactRawText" title="Copy raw source to clipboard">
            <span class="btn-copy-label">Copy</span>
          </button>
          <textarea id="artifactRawText" class="artifact-raw" readonly aria-hidden="true">${escHtml(text)}</textarea>
        </div>`;
      const bodyId = 'artifactBody';
      let bodyHtml;

      if (ext === 'md') {
        bodyHtml = `<div id="${bodyId}">${marked.parse(text)}</div>`;
      } else if (ext === 'yaml' || ext === 'yml') {
        bodyHtml = `<div id="${bodyId}"><pre><code>${escHtml(text)}</code></pre></div>`;
      } else if (ext === 'mermaid' || ext === 'mmd') {
        const desc = artDescMap[path] || '';
        bodyHtml = `<div id="${bodyId}"><div class="mermaid">${escHtml(text)}</div>${desc ? `<p class="diagram-desc">${escHtml(desc)}</p>` : ''}</div>`;
      } else {
        bodyHtml = `<div id="${bodyId}"><pre><code>${escHtml(text)}</code></pre></div>`;
      }

      content.innerHTML = headerHtml + bodyHtml;

      // Post-process markdown (mermaid blocks) after insertion so DOM exists.
      if (ext === 'md') {
        const body = document.getElementById(bodyId);
        body.querySelectorAll('pre code').forEach(block => {
          const lang = block.className?.match(/language-(\w+)/)?.[1];
          if (lang === 'mermaid' || block.textContent.trim().startsWith('graph ') || block.textContent.trim().startsWith('sequenceDiagram')) {
            const div = document.createElement('div');
            div.className = 'mermaid';
            div.textContent = block.textContent;
            block.closest('pre').replaceWith(div);
          }
        });
        if (body.querySelector('.mermaid')) {
          mermaid.run({ nodes: body.querySelectorAll('.mermaid') });
        }
      } else if (ext === 'mermaid' || ext === 'mmd') {
        mermaid.run({ nodes: content.querySelectorAll('.mermaid') });
      }

      // Wire the copy button.
      const btn = content.querySelector('.btn-copy');
      const label = btn?.querySelector('.btn-copy-label');
      btn?.addEventListener('click', async () => {
        try {
          if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
          } else {
            const ta = document.getElementById('artifactRawText');
            ta.select();
            document.execCommand('copy');
          }
          if (label) {
            label.textContent = 'Copied';
            btn.classList.add('btn-copy-done');
            setTimeout(() => {
              label.textContent = 'Copy';
              btn.classList.remove('btn-copy-done');
            }, 1500);
          }
        } catch (err) {
          if (label) {
            label.textContent = 'Copy failed';
            setTimeout(() => { label.textContent = 'Copy'; }, 1500);
          }
        }
      });
    });
  });

  view.dataset.tocManaged = 'true';
}

/* ─── STATS ─── */

function stats() {
  const skills = getSkills(state.data.progress).filter(s => s.timing);
  const maxWall = Math.max(...skills.map(s => s.timing?.wall_sec || 0), 1);
  const totalExec = skills.reduce((a, s) => a + (s.timing?.execution_sec || 0), 0);
  const totalWait = skills.reduce((a, s) => a + (s.timing?.user_wait_sec || 0), 0);
  const totalWall = skills.reduce((a, s) => a + (s.timing?.wall_sec || 0), 0);
  const totalQuestions = skills.reduce((a, s) => a + (s.timing?.questions?.length || 0), 0);
  const totalSteps = skills.reduce((a, s) => a + (s.timing?.steps?.length || 0), 0);
  const allSteps = skills.flatMap(s => (s.timing?.steps || []).map(st => ({ skill: s.skill, ...st })));
  const allQuestions = skills.flatMap(s => (s.timing?.questions || []).map(q => ({ skill: s.skill, ...q })));

  if (skills.length === 0) {
    document.getElementById('view').innerHTML = `
      <div class="section">
        <span class="overline">PERFORMANCE</span>
        <h1>Stats</h1>
      </div>
      <div class="empty" style="padding:80px 20px">
        <h2>No timing data available</h2>
        <p>Skills need to be executed with timing instrumentation to show performance metrics.</p>
      </div>`;
    return;
  }

  const execPct = totalWall > 0 ? Math.round((totalExec/totalWall)*100) : 0;

  const statsSections = [
    { id: 'summary', label: 'Summary' },
    { id: 'chart', label: 'Execution Chart' }
  ];
  if (allSteps.length > 0) statsSections.push({ id: 'steps', label: `Steps (${allSteps.length})` });
  statsSections.push({ id: 'questions', label: `Questions (${allQuestions.length})` });

  document.getElementById('view').innerHTML = `
    <div class="section">
      <span class="overline">PERFORMANCE</span>
      <h1>Stats</h1>
      <p style="color:var(--text-dim);margin-top:4px">${skills.length} skills tracked. ${execPct}% of wall time spent on execution.</p>
    </div>
    <div class="split-layout">
      <div class="split-sidebar" id="statsSidebar">
        <div class="split-sidebar-group">Sections</div>
        ${statsSections.map((s, i) => `<div class="split-sidebar-item${i === 0 ? ' active' : ''}" data-section="${s.id}">${s.label}</div>`).join('')}
        <div class="split-sidebar-group" style="margin-top:16px">Per Skill</div>
        ${skills.map(s => `<div class="split-sidebar-item" data-section="skill-${s.skill}">${SKILL_LABELS[s.skill] || s.skill}</div>`).join('')}
      </div>
      <div class="split-content" id="statsContent">
        ${renderStatsSummary(totalWall, totalExec, totalWait, execPct, totalQuestions, totalSteps, skills)}
      </div>
    </div>`;

  document.getElementById('statsSidebar').addEventListener('click', e => {
    const item = e.target.closest('.split-sidebar-item');
    if (!item) return;
    document.querySelectorAll('#statsSidebar .split-sidebar-item').forEach(el => el.classList.remove('active'));
    item.classList.add('active');
    const section = item.dataset.section;
    const content = document.getElementById('statsContent');

    if (section === 'summary') {
      content.innerHTML = renderStatsSummary(totalWall, totalExec, totalWait, execPct, totalQuestions, totalSteps, skills);
    } else if (section === 'chart') {
      content.innerHTML = renderStatsChart(skills, maxWall);
    } else if (section === 'steps') {
      content.innerHTML = renderStatsSteps(allSteps);
    } else if (section === 'questions') {
      content.innerHTML = renderStatsQuestions(allQuestions);
    } else if (section.startsWith('skill-')) {
      const sk = section.slice(6);
      const entry = skills.find(s => s.skill === sk);
      if (entry) content.innerHTML = renderTimelineDetail(entry);
    }
  });
}

function renderStatsSummary(totalWall, totalExec, totalWait, execPct, totalQuestions, totalSteps, skills) {
  const sorted = [...skills].sort((a, b) => (b.timing?.execution_sec || 0) - (a.timing?.execution_sec || 0));
  const fastest = [...skills].sort((a, b) => (a.timing?.execution_sec || 0) - (b.timing?.execution_sec || 0))[0];
  const slowest = sorted[0];
  const avgExec = skills.length > 0 ? totalExec / skills.length : 0;
  const maxExec = sorted[0]?.timing?.execution_sec || 1;

  const designSkills = skills.filter(s =>
    !['solace-discovery', 'solace-plan', 'solace-validate', 'solace-blueprint', 'solace-architecture-blueprint', 'solace-executive', 'solace-diagrams'].includes(s.skill) &&
    !s.skill.endsWith('-review')
  );
  const reviewSkills = skills.filter(s => s.skill.endsWith('-review'));
  const otherSkills = skills.filter(s =>
    ['solace-discovery', 'solace-plan', 'solace-validate', 'solace-blueprint', 'solace-architecture-blueprint'].includes(s.skill)
  );
  const phaseExec = (list) => list.reduce((a, s) => a + (s.timing?.execution_sec || 0), 0);
  const designExec = phaseExec(designSkills);
  const reviewExec = phaseExec(reviewSkills);
  const otherExec = phaseExec(otherSkills);
  const phaseMax = Math.max(designExec, reviewExec, otherExec, 1);

  return `
    <h2 style="margin-top:0">Summary</h2>
    <div class="card-grid">
      <div class="card">
        <div class="card-label">Wall Time</div>
        <div class="card-value">${fmtTime(totalWall)}</div>
      </div>
      <div class="card">
        <div class="card-label">Execution</div>
        <div class="card-value">${fmtTime(totalExec)}</div>
        <div class="card-sub">${execPct}% of wall time</div>
      </div>
      <div class="card">
        <div class="card-label">User Wait</div>
        <div class="card-value dim">${fmtTime(totalWait)}</div>
        <div class="card-sub">${totalQuestions} question${totalQuestions !== 1 ? 's' : ''} asked</div>
      </div>
      <div class="card">
        <div class="card-label">Steps Executed</div>
        <div class="card-value dim">${totalSteps}</div>
        <div class="card-sub">across ${skills.length} skill${skills.length !== 1 ? 's' : ''}</div>
      </div>
    </div>

    <h3 style="margin-top:24px">Top Skills by Execution Time</h3>
    <div style="display:flex;flex-direction:column;gap:8px;margin-top:12px">
      ${sorted.slice(0, 5).map(s => {
        const sec = s.timing?.execution_sec || 0;
        const pct = ((sec / maxExec) * 100).toFixed(1);
        const pctOfTotal = totalExec > 0 ? Math.round((sec / totalExec) * 100) : 0;
        return `<div style="display:flex;align-items:center;gap:12px">
          <div style="width:130px;min-width:130px;font-size:13px;text-align:right;color:var(--text-dim)">${SKILL_LABELS[s.skill] || s.skill}</div>
          <div style="flex:1;height:20px;background:rgba(255,255,255,0.04);border-radius:4px;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,var(--classic-green),var(--bright-green));border-radius:4px;display:flex;align-items:center;padding-left:6px">
              ${sec > 15 ? `<span style="font-family:'Space Mono',monospace;font-size:10px;font-weight:700;color:var(--dark-blue);white-space:nowrap">${fmtTime(sec)}</span>` : ''}
            </div>
          </div>
          <div style="width:70px;min-width:70px;font-family:'Space Mono',monospace;font-size:12px;color:var(--text-muted);text-align:right">${pctOfTotal}%</div>
        </div>`;
      }).join('')}
    </div>

    <h3 style="margin-top:28px">Phase Breakdown</h3>
    <div style="display:flex;flex-direction:column;gap:8px;margin-top:12px">
      ${[
        { label: 'Design', sec: designExec, count: designSkills.length },
        { label: 'Review', sec: reviewExec, count: reviewSkills.length },
        { label: 'Orchestration', sec: otherExec, count: otherSkills.length },
      ].filter(p => p.count > 0).map(p => {
        const pct = ((p.sec / phaseMax) * 100).toFixed(1);
        return `<div style="display:flex;align-items:center;gap:12px">
          <div style="width:130px;min-width:130px;font-size:13px;text-align:right;color:var(--text-dim)">${p.label} <span style="color:var(--text-muted)">(${p.count})</span></div>
          <div style="flex:1;height:20px;background:rgba(255,255,255,0.04);border-radius:4px;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:var(--accent);opacity:0.7;border-radius:4px;display:flex;align-items:center;padding-left:6px">
              ${p.sec > 10 ? `<span style="font-family:'Space Mono',monospace;font-size:10px;font-weight:700;color:var(--dark-blue);white-space:nowrap">${fmtTime(p.sec)}</span>` : ''}
            </div>
          </div>
          <div style="width:70px;min-width:70px;font-family:'Space Mono',monospace;font-size:12px;color:var(--text-muted);text-align:right">${fmtTime(p.sec)}</div>
        </div>`;
      }).join('')}
    </div>

    <h3 style="margin-top:28px">Insights</h3>
    <div style="display:flex;flex-direction:column;gap:8px;margin-top:12px">
      <div style="display:flex;gap:16px;flex-wrap:wrap">
        <div class="card" style="flex:1;min-width:180px">
          <div class="card-label">Slowest Skill</div>
          <div style="font-size:16px;font-weight:600;color:var(--text)">${SKILL_LABELS[slowest?.skill] || slowest?.skill || '--'}</div>
          <div class="card-sub">${fmtTime(slowest?.timing?.execution_sec)} execution</div>
        </div>
        <div class="card" style="flex:1;min-width:180px">
          <div class="card-label">Fastest Skill</div>
          <div style="font-size:16px;font-weight:600;color:var(--text)">${SKILL_LABELS[fastest?.skill] || fastest?.skill || '--'}</div>
          <div class="card-sub">${fmtTime(fastest?.timing?.execution_sec)} execution</div>
        </div>
        <div class="card" style="flex:1;min-width:180px">
          <div class="card-label">Avg per Skill</div>
          <div style="font-size:16px;font-weight:600;color:var(--text)">${fmtTime(avgExec)}</div>
          <div class="card-sub">execution time</div>
        </div>
      </div>
    </div>`;
}

function renderStatsChart(skills, maxWall) {
  return `
    <h2 style="margin-top:0">Execution Time by Skill</h2>
    <div class="bar-chart">
      ${skills.map(s => {
        const t = s.timing;
        const execPct = ((t.execution_sec / maxWall) * 100).toFixed(1);
        const waitPct = ((t.user_wait_sec / maxWall) * 100).toFixed(1);
        return `<div class="bar-row">
          <div class="bar-label">${SKILL_LABELS[s.skill] || s.skill}</div>
          <div class="bar-track">
            <div class="bar-fill exec" style="width:${execPct}%">
              ${t.execution_sec > 15 ? `<span class="bar-val">${fmtTime(t.execution_sec)}</span>` : ''}
            </div>
            ${t.user_wait_sec > 0 ? `<div class="bar-fill wait" style="width:${waitPct}%"></div>` : ''}
          </div>
          <div class="bar-total">${fmtTime(t.wall_sec)}</div>
        </div>`;
      }).join('')}
    </div>
    <div style="display:flex;gap:20px;margin-top:12px">
      <div style="display:flex;align-items:center;gap:6px">
        <div style="width:14px;height:14px;border-radius:3px;background:var(--classic-green)"></div>
        <span style="font-size:13px;color:var(--text-dim)">Execution</span>
      </div>
      <div style="display:flex;align-items:center;gap:6px">
        <div style="width:14px;height:14px;border-radius:3px;background:var(--orange);opacity:0.5"></div>
        <span style="font-size:13px;color:var(--text-dim)">User wait</span>
      </div>
    </div>`;
}

function renderStatsSteps(allSteps) {
  return `
    <h2 style="margin-top:0">Step Breakdown</h2>
    <div class="table-wrap"><table>
      <thead><tr><th>Skill</th><th>Step</th><th>Execution</th></tr></thead>
      <tbody>
        ${allSteps.map(st => `<tr>
          <td>${SKILL_LABELS[st.skill] || st.skill}</td>
          <td style="color:var(--text)">${st.label || 'Step ' + st.step}</td>
          <td><span class="skill-timing">${fmtTime(st.execution_sec)}</span></td>
        </tr>`).join('')}
      </tbody>
    </table></div>`;
}

function renderStatsQuestions(allQuestions) {
  if (allQuestions.length === 0) {
    return `
      <h2 style="margin-top:0">Questions Asked</h2>
      <p style="color:var(--text-muted);padding:16px 0">No user questions recorded (auto mode).</p>`;
  }
  return `
    <h2 style="margin-top:0">Questions Asked</h2>
    <div class="table-wrap"><table>
      <thead><tr><th>Skill</th><th>Question</th><th>Wait Time</th></tr></thead>
      <tbody>
        ${allQuestions.map(q => `<tr>
          <td>${SKILL_LABELS[q.skill] || q.skill}</td>
          <td style="color:var(--text)">${q.label || q.id}</td>
          <td><span class="skill-timing">${fmtTime(q.wait_sec)}</span></td>
        </tr>`).join('')}
      </tbody>
    </table></div>`;
}

/* ─── EXPORT ─── */

async function exportView() {
  const skills = getSkills(state.data.progress);
  const { items } = getDecisions(state.data.decisions);
  const context = state.data.context;
  const files = state.data.files || [];
  const skipped = getEffectiveSkipped(state.data.progress, state.data.decisions);
  const totalExec = skills.reduce((a, s) => a + (s.timing?.execution_sec || 0), 0);
  const totalWall = skills.reduce((a, s) => a + (s.timing?.wall_sec || 0), 0);
  const completedSkills = skills.filter(s => s.status === 'complete');
  const discoverySummary = skills.find(s => s.skill === 'solace-discovery')?.summary || '';
  const userDecs = items.filter(d => d.id);
  const findings = items.filter(d => d.source);
  const criticalFindings = findings.filter(f => f.severity === 'critical').length;
  const importantFindings = findings.filter(f => f.severity === 'important').length;

  const designSkills = skills.filter(s =>
    s.status === 'complete' &&
    !['solace-discovery', 'solace-plan', 'solace-validate', 'solace-blueprint', 'solace-architecture-blueprint', 'solace-executive', 'solace-diagrams'].includes(s.skill) &&
    !s.skill.endsWith('-review')
  );

  const systemsList = [];
  const discoveryInputs = { messaging: '', protocols: '', eventTypes: [], refArch: '', requirements: {}, goals: {} };
  const discoveryFile = (files || []).find(f => f.includes('discovery') && f.endsWith('.md'));
  if (discoveryFile) {
    try {
      const dRes = await fetch(`/api/projects/${state.current.slug}/artifact?path=${encodeURIComponent(discoveryFile)}`);
      if (dRes.ok) {
        const dText = await dRes.text();
        const lines = dText.split('\n');
        let inSystems = false, inEvents = false, currentSection = '';
        for (const ln of lines) {
          if (/^## System landscape/i.test(ln)) { currentSection = 'landscape'; continue; }
          if (/^## Requirements/i.test(ln)) { currentSection = 'requirements'; continue; }
          if (/^## Goals/i.test(ln)) { currentSection = 'goals'; continue; }
          if (/^## /.test(ln)) { currentSection = ''; inSystems = false; inEvents = false; continue; }
          if (/^\s*-\s+\*\*Systems:\*\*/.test(ln)) { inSystems = true; inEvents = false; continue; }
          if (/^\s*-\s+\*\*Existing messaging:\*\*\s*(.+)/i.test(ln)) { discoveryInputs.messaging = ln.match(/\*\*Existing messaging:\*\*\s*(.+)/i)[1].trim(); inSystems = false; inEvents = false; continue; }
          if (/^\s*-\s+\*\*Protocols in play:\*\*\s*(.+)/i.test(ln)) { discoveryInputs.protocols = ln.match(/\*\*Protocols in play:\*\*\s*(.+)/i)[1].trim(); inSystems = false; inEvents = false; continue; }
          if (/^\s*-\s+\*\*Event types/i.test(ln)) { inEvents = true; inSystems = false; continue; }
          if (/^\s*-\s+\*\*Matched reference architecture:\*\*\s*(.+)/i.test(ln)) { discoveryInputs.refArch = ln.match(/\*\*Matched reference architecture:\*\*\s*(.+)/i)[1].trim(); inEvents = false; continue; }
          if (/^\s*-\s+\*\*Micro-Integration/i.test(ln)) { inEvents = false; continue; }
          if (inSystems) {
            const m = ln.match(/^\s{2,}-\s+(.+?)(?:\s+—\s+(.+))?$/);
            if (m) { const nr = m[1]; const d = m[2]||''; const rm = nr.match(/^(.+?)\s*\(([^)]+)\)$/); systemsList.push({ name: rm?rm[1].trim():nr.trim(), role: rm?rm[2]:'', description: d }); }
            else if (!/^\s/.test(ln) || /^\s*-\s+\*\*/.test(ln)) { inSystems = false; }
          }
          if (inEvents) {
            const em = ln.match(/^\s{2,}-\s+(.+?)(?:\s+—\s+(.+))?$/);
            if (em) discoveryInputs.eventTypes.push(em[1].trim());
            else if (!/^\s/.test(ln) || /^\s*-\s+\*\*/.test(ln)) inEvents = false;
          }
          if (currentSection === 'requirements') { const rm = ln.match(/^\s*-\s+\*\*(.+?):\*\*\s*(.+)/); if (rm) discoveryInputs.requirements[rm[1].trim()] = rm[2].trim(); }
          if (currentSection === 'goals') { const gm = ln.match(/^\s*-\s+\*\*(.+?):\*\*\s*(.+)/); if (gm) discoveryInputs.goals[gm[1].trim()] = gm[2].trim(); }
        }
      }
    } catch {}
  }

  const sections = [
    { id: 'overview', label: 'Project Overview', html: `
      <span class="overline" style="color:var(--accent)">PROJECT OVERVIEW</span>
      <h3 style="margin-top:4px">${context?.display_name || state.current.slug}</h3>
      ${discoverySummary ? `<p style="color:var(--text-dim);line-height:1.7;margin-bottom:16px">${escHtml(discoverySummary)}</p>` : ''}
      <div style="display:flex;gap:24px;flex-wrap:wrap">
        <div><div class="card-label">Skills</div><div style="font-size:22px;font-weight:700;color:var(--accent)">${completedSkills.length}<span style="font-size:14px;color:var(--text-muted)"> / ${SKILL_ORDER.length}</span></div></div>
        <div><div class="card-label">Artifacts</div><div style="font-size:22px;font-weight:700;color:var(--accent)">${files.length}</div></div>
        <div><div class="card-label">Decisions</div><div style="font-size:22px;font-weight:700;color:var(--accent)">${userDecs.length}</div></div>
        <div><div class="card-label">Execution</div><div style="font-size:22px;font-weight:700;color:var(--accent)">${fmtTime(totalExec)}</div></div>
        <div><div class="card-label">Wall Time</div><div style="font-size:22px;font-weight:700;color:var(--text-dim)">${fmtTime(totalWall)}</div></div>
      </div>` },
  ];

  const hasDiscovery = systemsList.length > 0 || Object.keys(discoveryInputs.goals).length > 0 || Object.keys(discoveryInputs.requirements).length > 0;
  if (hasDiscovery) {
    const scopeRows = [];
    const reqPairs = [
      ['Delivery guarantee', discoveryInputs.requirements['Delivery guarantee']],
      ['Ordering', discoveryInputs.requirements['Ordering']],
      ['Latency target', discoveryInputs.requirements['Latency target']],
      ['Scale', discoveryInputs.requirements['Scale']],
      ['Topology', discoveryInputs.requirements['Topology']],
      ['Processing guarantee', discoveryInputs.requirements['Processing guarantee']],
      ['Data residency', discoveryInputs.requirements['Data residency']],
    ].filter(([,v]) => v);
    const goalPairs = [
      ['Project type', discoveryInputs.goals['Project type']],
      ['Driver', discoveryInputs.goals['Driver']],
      ['Timeline', discoveryInputs.goals['Timeline']],
      ['Budget', discoveryInputs.goals['Budget']],
      ['Team', discoveryInputs.goals['Team']],
      ['Constraints', discoveryInputs.goals['Constraints']],
      ['Observability', discoveryInputs.goals['Observability']],
      ['CI/CD', discoveryInputs.goals['CI/CD']],
    ].filter(([,v]) => v);

    const roleClass = (r) => { const rl = (r||'').toLowerCase(); if (/both|producer.*consumer|consumer.*producer/.test(rl)) return 'role-both'; if (/producer/.test(rl)) return 'role-producer'; return 'role-consumer'; };
    const fmtEvt = (e) => { const m = e.match(/^(.+?)\s*\(([^)]+)\)\s*$/); return m ? `<span class="scope-event-name">${escHtml(m[1])}</span><span class="scope-event-rate">${escHtml(m[2])}</span>` : escHtml(e); };
    sections.push({ id: 'scope', label: 'Scope & Inputs', html: `
      <h3 style="margin-top:0">Scope & Inputs</h3>
      <p style="color:var(--text-dim);font-size:13px;margin-bottom:16px">Key inputs captured during discovery that drive all downstream architecture decisions.</p>
      <div class="scope-grid">
        ${systemsList.length > 0 ? `<div class="scope-card scope-card-wide">
          <div class="scope-card-header"><span class="scope-icon">&#9881;</span>Connected Systems<span class="scope-count">${systemsList.length} systems</span></div>
          <div class="scope-card-body"><div class="scope-systems-grid">
            ${systemsList.map(s => `<div class="scope-system"><span class="scope-sys-name">${escHtml(s.name)}</span>${s.role ? `<span class="scope-sys-role ${roleClass(s.role)}">${escHtml(s.role)}</span>` : ''}</div>`).join('')}
          </div></div>
        </div>` : ''}
        ${discoveryInputs.messaging || discoveryInputs.protocols ? `<div class="scope-card scope-landscape">
          <div class="scope-card-header"><span class="scope-icon">&#9783;</span>Current Landscape</div>
          <div class="scope-card-body">
            ${discoveryInputs.messaging ? `<div class="scope-field"><span class="scope-field-label">Existing messaging</span><span class="scope-field-value">${escHtml(discoveryInputs.messaging)}</span></div>` : ''}
            ${discoveryInputs.protocols ? `<div class="scope-field"><span class="scope-field-label">Protocols</span><span class="scope-field-value">${escHtml(discoveryInputs.protocols)}</span></div>` : ''}
            ${discoveryInputs.refArch ? `<div class="scope-field"><span class="scope-field-label">Reference architecture</span><span class="scope-field-value">${escHtml(discoveryInputs.refArch)}</span></div>` : ''}
          </div>
        </div>` : ''}
        ${discoveryInputs.eventTypes.length > 0 ? `<div class="scope-card scope-events">
          <div class="scope-card-header"><span class="scope-icon">&#9889;</span>Event Types<span class="scope-count">${discoveryInputs.eventTypes.length} types</span></div>
          <div class="scope-card-body"><div class="scope-events-grid">
            ${discoveryInputs.eventTypes.map(e => `<div class="scope-event">${fmtEvt(e)}</div>`).join('')}
          </div></div>
        </div>` : ''}
        ${reqPairs.length > 0 ? `<div class="scope-card scope-requirements">
          <div class="scope-card-header"><span class="scope-icon">&#9745;</span>Requirements</div>
          <div class="scope-card-body">
            ${reqPairs.map(([k,v]) => `<div class="scope-field"><span class="scope-field-label">${escHtml(k)}</span><span class="scope-field-value">${escHtml(v)}</span></div>`).join('')}
          </div>
        </div>` : ''}
        ${goalPairs.length > 0 ? `<div class="scope-card scope-goals">
          <div class="scope-card-header"><span class="scope-icon">&#9873;</span>Goals & Constraints</div>
          <div class="scope-card-body">
            ${goalPairs.map(([k,v]) => `<div class="scope-field"><span class="scope-field-label">${escHtml(k)}</span><span class="scope-field-value">${escHtml(v)}</span></div>`).join('')}
          </div>
        </div>` : ''}
      </div>` });
  }

  sections.push({ id: 'design', label: 'Design Decisions', html: `
      <h3 style="margin-top:0">Design Decisions (${designSkills.length} skills)</h3>
      ${designSkills.map(s => `
        <div style="padding:8px 0;border-bottom:1px solid var(--border)">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <strong style="font-size:14px">${SKILL_LABELS[s.skill] || s.skill}</strong>
            <span class="skill-timing">${fmtTime(s.timing?.execution_sec)}</span>
          </div>
          ${s.summary ? `<div style="font-size:13px;color:var(--text-dim);margin-top:4px;line-height:1.5">${escHtml(s.summary)}</div>` : ''}
        </div>
      `).join('')}` });

  if (userDecs.length > 0) sections.push({ id: 'user-decs', label: 'User Decisions', html: `
    <h3 style="margin-top:0">User Decisions (${userDecs.length})</h3>
    <div class="table-wrap"><table>
      <thead><tr><th>ID</th><th>Skill</th><th>Question</th><th>Choice</th></tr></thead>
      <tbody>
        ${userDecs.map(d => `<tr>
          <td><span class="badge badge-user">${d.id}</span></td>
          <td>${SKILL_LABELS[d.skill] || d.skill || ''}</td>
          <td style="color:var(--text)">${d.question || ''}</td>
          <td>${d.label || d.value || d.choice || ''}</td>
        </tr>`).join('')}
      </tbody>
    </table></div>` });

  if (findings.length > 0) sections.push({ id: 'findings', label: 'Review Findings', html: `
    <h3 style="margin-top:0">Review Findings (${findings.length}${criticalFindings > 0 ? ` — ${criticalFindings} critical` : ''}${importantFindings > 0 ? `, ${importantFindings} important` : ''})</h3>
    <div class="table-wrap"><table>
      <thead><tr><th>Source</th><th>Severity</th><th>Decision</th><th>Status</th></tr></thead>
      <tbody>
        ${findings.map(d => `<tr>
          <td>${SKILL_LABELS[d.source] || d.source || ''}</td>
          <td><span class="badge badge-${d.severity || 'advisory'}">${(d.severity || 'advisory').toUpperCase()}</span></td>
          <td style="color:var(--text)">${d.decision || ''}</td>
          <td>${d.action || ''}</td>
        </tr>`).join('')}
      </tbody>
    </table></div>` });

  const oiItems = getOpenItems(state.data.openItems);
  if (oiItems.length > 0) {
    const oiOpen = oiItems.filter(i => i.status !== 'resolved').length;
    const oiBySev = {};
    oiItems.forEach(i => { const s = (i.severity||'advisory').toLowerCase(); oiBySev[s] = (oiBySev[s]||0) + 1; });
    sections.push({ id: 'open-items', label: `Open Items (${oiOpen})`, html: `
      <h3 style="margin-top:0">Open Items</h3>
      <p style="margin-bottom:12px;color:var(--text-dim)">${oiOpen} of ${oiItems.length} items remain open or in progress.</p>
      <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
        ${['blocking','high','medium','advisory'].filter(s => oiBySev[s]).map(s =>
          `<span class="badge ${SEV_BADGE[s]}">${oiBySev[s]} ${s}</span>`
        ).join('')}
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>ID</th><th>Severity</th><th>Description</th><th>Source</th><th>Resolution Path</th><th>Status</th></tr></thead>
        <tbody>
          ${oiItems.map(item => {
            const sev = (item.severity||'advisory').toLowerCase();
            const st = (item.status||'open').toLowerCase();
            return `<tr>
              <td><span class="badge badge-user">${escHtml(item.id)}</span></td>
              <td><span class="badge ${SEV_BADGE[sev]||'badge-advisory'}">${sev}</span></td>
              <td style="color:var(--text)">${escHtml(item.description)}</td>
              <td>${SKILL_LABELS[item.source]||item.source||''}</td>
              <td style="color:var(--text-dim);font-size:13px">${escHtml(item.resolution||'')}</td>
              <td><span class="badge ${STATUS_BADGE[st]||'badge-open'}">${st}</span></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table></div>` });
  }

  if (skipped.length > 0) sections.push({ id: 'skipped', label: 'Skipped Skills', html: `
    <h3 style="margin-top:0">Skipped Skills (${skipped.length})</h3>
    ${skipped.map(sk => `
      <div style="padding:6px 0;font-size:13px;color:var(--text-dim);display:flex;justify-content:space-between">
        <span>${SKILL_LABELS[sk] || sk}</span>
        <span style="color:var(--text-muted)">${SKIP_REASONS[sk] || 'Not applicable'}</span>
      </div>
    `).join('')}` });

  sections.push({ id: 'artifacts', label: 'Artifacts', html: `
    <h3 style="margin-top:0">Artifacts (${files.length} files)</h3>
    ${(() => {
      const groups = {};
      files.forEach(f => {
        const group = f.split('/')[0] || 'root';
        if (!groups[group]) groups[group] = [];
        groups[group].push(f);
      });
      return Object.entries(groups).map(([group, gFiles]) => `
        <div style="margin-bottom:12px">
          <div style="font-family:'Space Mono',monospace;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--text-muted);padding:0 0 4px">${group.replace(/^\d+-/, '')}</div>
          ${gFiles.map(f => `<div style="font-size:13px;color:var(--text-dim);padding:2px 0 2px 12px">${f.split('/').pop()}</div>`).join('')}
        </div>
      `).join('');
    })()}` });

  const reportPacks = await loadReportPacks();

  document.getElementById('view').innerHTML = `
    <div class="section export-controls no-print">
      <span class="overline">EXPORT</span>
      <h1>Export Report</h1>
      <p style="color:var(--text-dim);margin-bottom:20px">Choose an audience-specific report below. Each pack filters the full architecture into a focused view. Print / Save as PDF is available inside the generated HTML report.</p>
      <div class="pack-tiles">
        ${reportPacks.map(p => `
          <div class="pack-tile pack-${p.id}">
            <div class="pack-tile-audience">${escHtml(p.audience || '')}</div>
            <h3 class="pack-tile-title">${escHtml(p.label)}</h3>
            <p class="pack-tile-description">${escHtml(p.description || '')}</p>
            <button class="btn" data-pack="${p.id}">View / Download HTML Report</button>
          </div>
        `).join('')}
      </div>
    </div>
    ${sections.map((s, i) => `
      <div class="export-section" data-section="${s.id}"${i > 0 ? ' style="display:none"' : ''}>
        <div class="exec-summary-section">
          <div style="padding:16px 20px">${s.html}</div>
        </div>
      </div>
    `).join('')}`;

  const sidebar = document.getElementById('rightSidebar');
  sidebar.classList.remove('hidden');
  sidebar.innerHTML = `
    <div class="overline" style="margin-bottom:12px">ON THIS PAGE</div>
    <ul class="toc-list">
      ${sections.map((s, i) => `<li><a href="#" class="toc-link${i === 0 ? ' active' : ''}" data-section="${s.id}">${s.label}</a></li>`).join('')}
    </ul>`;

  sidebar.querySelectorAll('.toc-link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      document.querySelectorAll('.export-section').forEach(el => el.style.display = 'none');
      const target = document.querySelector(`.export-section[data-section="${link.dataset.section}"]`);
      if (target) target.style.display = '';
      sidebar.querySelectorAll('.toc-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      document.getElementById('content').scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  document.getElementById('view').dataset.tocManaged = 'true';

  document.querySelectorAll('.pack-tile button[data-pack]').forEach(btn => {
    btn.addEventListener('click', () => {
      const packId = btn.dataset.pack;
      const pack = reportPacks.find(p => p.id === packId);
      if (!pack) {
        console.warn('Unknown pack:', packId);
        return;
      }
      generateReport(pack, skills, items, files);
    });
  });
}

/* ─── REPORT GENERATION ─── */

async function generateReport(pack, skills, items, files) {
  // Backward-compat: legacy callers passed (skills, items, files). Detect and shift.
  if (Array.isArray(pack)) {
    files = items;
    items = skills;
    skills = pack;
    pack = { id: 'blueprint', label: 'Master Architecture View', filters: {} };
  }
  if (!pack) pack = { id: 'blueprint', label: 'Master Architecture View', filters: {} };
  const packFilters = pack.filters || {};
  const packLabel = pack.label || 'Master Architecture View';
  const packId = pack.id || 'blueprint';

  const context = state.data.context;
  const totalExec = skills.reduce((a, s) => a + (s.timing?.execution_sec || 0), 0);
  const totalWait = skills.reduce((a, s) => a + (s.timing?.user_wait_sec || 0), 0);
  const discoverySummary = skills.find(s => s.skill === 'solace-discovery')?.summary || '';

  const GROUP_LABELS = {
    'discovery': 'Discovery',
    'topic-design': 'Topic Design',
    'broker-select': 'Broker Selection',
    'sam-design': 'SAM Design',
    'protocol-select': 'Protocol Selection',
    'mesh-design': 'Mesh Design',
    'ha-dr': 'High Availability / Disaster Recovery',
    'integration': 'Integration',
    'migration': 'Migration',
    'event-portal': 'Event Portal',
    'reviews': 'Reviews',
    'validation': 'Validation',
    'blueprint': 'Technical Blueprint',
    'arch-blueprint': 'Architecture Blueprint (4+1)',
    'executive': 'Business Case',
    'diagrams': 'Diagrams'
  };
  const grpLabel = (g) => GROUP_LABELS[g] || g.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const artifactDescriptions = {};
  for (const sk of skills) {
    if (!sk.artifacts) continue;
    for (const a of sk.artifacts) {
      const key = a.path.replace(/^artifacts\//, '');
      if (a.description) artifactDescriptions[key] = a.description;
    }
  }

  const artifactExts = ['.md', '.mermaid', '.mmd', '.yaml', '.yml'];
  const docFiles = files.filter(f => artifactExts.some(ext => f.endsWith(ext)) && packIncludesArtifact(packFilters, f));

  const rptSystemsList = [];
  const rptInputs = { messaging: '', protocols: '', eventTypes: [], refArch: '', requirements: {}, goals: {} };
  const discoveryFile = docFiles.find(f => f.includes('discovery') && f.endsWith('.md'));
  if (discoveryFile) {
    try {
      const dRes = await fetch(`/api/projects/${state.current.slug}/artifact?path=${encodeURIComponent(discoveryFile)}`);
      if (dRes.ok) {
        const dText = await dRes.text();
        const lines = dText.split('\n');
        let inSystems = false, inEvents = false, currentSection = '';
        for (let i = 0; i < lines.length; i++) {
          const ln = lines[i];
          if (/^## System landscape/i.test(ln)) { currentSection = 'landscape'; continue; }
          if (/^## Requirements/i.test(ln)) { currentSection = 'requirements'; continue; }
          if (/^## Goals/i.test(ln)) { currentSection = 'goals'; continue; }
          if (/^## /.test(ln)) { currentSection = ''; inSystems = false; inEvents = false; continue; }
          if (/^\s*-\s+\*\*Systems:\*\*/.test(ln)) { inSystems = true; inEvents = false; continue; }
          if (/^\s*-\s+\*\*Existing messaging:\*\*\s*(.+)/i.test(ln)) { rptInputs.messaging = ln.match(/\*\*Existing messaging:\*\*\s*(.+)/i)[1].trim(); inSystems = false; inEvents = false; continue; }
          if (/^\s*-\s+\*\*Protocols in play:\*\*\s*(.+)/i.test(ln)) { rptInputs.protocols = ln.match(/\*\*Protocols in play:\*\*\s*(.+)/i)[1].trim(); inSystems = false; inEvents = false; continue; }
          if (/^\s*-\s+\*\*Event types/i.test(ln)) { inEvents = true; inSystems = false; continue; }
          if (/^\s*-\s+\*\*Matched reference architecture:\*\*\s*(.+)/i.test(ln)) { rptInputs.refArch = ln.match(/\*\*Matched reference architecture:\*\*\s*(.+)/i)[1].trim(); inEvents = false; continue; }
          if (/^\s*-\s+\*\*Micro-Integration/i.test(ln)) { inEvents = false; continue; }
          if (inSystems) {
            const m = ln.match(/^\s{2,}-\s+(.+?)(?:\s+—\s+(.+))?$/);
            if (m) { const nr = m[1]; const d = m[2]||''; const rm = nr.match(/^(.+?)\s*\(([^)]+)\)$/); rptSystemsList.push({ name: rm?rm[1].trim():nr.trim(), role: rm?rm[2]:'', description: d }); }
            else if (!/^\s/.test(ln) || /^\s*-\s+\*\*/.test(ln)) { inSystems = false; }
          }
          if (inEvents) {
            const em = ln.match(/^\s{2,}-\s+(.+?)(?:\s+—\s+(.+))?$/);
            if (em) rptInputs.eventTypes.push(em[1].trim());
            else if (!/^\s/.test(ln) || /^\s*-\s+\*\*/.test(ln)) inEvents = false;
          }
          if (currentSection === 'requirements') { const rm = ln.match(/^\s*-\s+\*\*(.+?):\*\*\s*(.+)/); if (rm) rptInputs.requirements[rm[1].trim()] = rm[2].trim(); }
          if (currentSection === 'goals') { const gm = ln.match(/^\s*-\s+\*\*(.+?):\*\*\s*(.+)/); if (gm) rptInputs.goals[gm[1].trim()] = gm[2].trim(); }
        }
      }
    } catch {}
  }
  const systemsList = rptSystemsList;

  const SKILL_TO_GROUP = {'solace-discovery':'discovery','solace-topic-design':'topic-design','solace-broker-select':'broker-select','solace-sam-design':'sam-design','solace-protocol-select':'protocol-select','solace-mesh-design':'mesh-design','solace-ha-dr':'ha-dr','solace-integration':'integration','solace-migration':'migration','solace-event-portal':'event-portal','solace-architect-review':'reviews','solace-ops-review':'reviews','solace-security-review':'reviews','solace-dev-review':'reviews','solace-validate':'validation','solace-blueprint':'blueprint','solace-architecture-blueprint':'arch-blueprint','solace-executive':'executive','solace-diagrams':'diagrams'};
  const xref = (text, anchor) => `<a href="#${anchor}" class="xref-link">${text}</a>`;
  const skillLink = (skill) => { const g = SKILL_TO_GROUP[skill]; const label = SKILL_LABELS[skill]||skill||''; return g ? xref(label, 'grp-' + g) : label; };
  const artRefLink = (ref) => { if (!ref) return ''; const id = 'art-' + ref.replace(/^artifacts\//, '').replace(/[^a-z0-9]/gi, '-').replace(/-+/g, '-').toLowerCase(); return xref('source', id); };

  // Every artifact embedded in a report gets the same title / path / brief
  // description / copy-button treatment as the in-app Artifacts page, so the
  // standalone HTML report is fully self-describing and shareable.
  let _copySeq = 0;
  function reportArtifactHeader(filePath, rawText, fallbackDesc) {
    const title = (typeof artifactTitleFor === 'function') ? artifactTitleFor(filePath) : filePath;
    const desc = (artifactDescriptions[filePath] || (typeof artifactDefaultDescription === 'function' ? artifactDefaultDescription(filePath) : '') || fallbackDesc || '');
    const copyId = `rpt-copy-${++_copySeq}`;
    return `<div class="report-artifact-header">
      <div class="report-artifact-text">
        <h4 class="report-artifact-title">${escHtml(title)}</h4>
        <code class="report-artifact-path">${escHtml(filePath)}</code>
        ${desc ? `<p class="report-artifact-desc">${escHtml(desc)}</p>` : ''}
      </div>
      <button class="report-copy-btn" type="button" data-copy-target="${copyId}" title="Copy raw source to clipboard">
        <span class="report-copy-label">Copy</span>
      </button>
      <textarea id="${copyId}" class="report-copy-raw" readonly aria-hidden="true">${escHtml(rawText)}</textarea>
    </div>`;
  }

  const sections = [];
  let prevGroup = null;
  for (const f of docFiles) {
    const res = await fetch(`/api/projects/${state.current.slug}/artifact?path=${encodeURIComponent(f)}`);
    if (!res.ok) continue;
    const text = await res.text();
    const groupName = f.split('/')[0].replace(/^\d+-/, '');
    const isNewGroup = groupName !== prevGroup;
    prevGroup = groupName;
    const ext = f.split('.').pop();
    let html;
    if (ext === 'mermaid' || ext === 'mmd') {
      const desc = artifactDescriptions[f] || '';
      html = `${reportArtifactHeader(f, text)}<div class="mermaid">${escHtml(text)}</div>${desc ? `<p class="diagram-desc">${escHtml(desc)}</p>` : ''}`;
    } else if (ext === 'yaml' || ext === 'yml') {
      html = `${reportArtifactHeader(f, text)}<pre><code class="language-yaml">${escHtml(text)}</code></pre>`;
    } else if (f.endsWith('roi-framework.md')) {
      const roiRows = { c: [], p: [], v: [] };
      const indicators = [];
      const ROI_GUIDE = {};
      let roiSect = '';
      const lines = text.split('\n');
      for (let li = 0; li < lines.length; li++) {
        const line = lines[li];
        if (line.includes('Section 1:')) roiSect = 'c';
        else if (line.includes('Section 2:')) roiSect = 'p';
        else if (line.includes('Section 3:')) roiSect = 'v';
        else if (line.includes('Section 4:')) roiSect = '';
        else if (line.includes('Section 6:')) roiSect = 'ind';
        if (roiSect === 'ind' && line.startsWith('| ')) {
          const cols = line.split('|').map(c => c.trim()).filter(Boolean);
          if (cols.length >= 3 && !/^-+$/.test(cols[0]) && cols[0] !== 'Indicator') {
            indicators.push({ label: cols[0], value: cols[1], impact: cols[2] });
          }
        }
        const guideMatch = line.match(/^\*\*([CPV]\d)\s/);
        if (guideMatch) {
          const gid = guideMatch[1];
          const askParts = [];
          const cleaned = line.replace(/^\*\*[CPV]\d\s.*?\.\*\*\s*/, '');
          if (cleaned) askParts.push(cleaned);
          for (let j = li + 1; j < lines.length; j++) {
            const nl = lines[j];
            if (nl.startsWith('*Example:') || nl.startsWith('**') || nl.startsWith('| ') || nl.startsWith('##') || nl.trim() === '') break;
            askParts.push(nl);
          }
          let ex = '';
          for (let j = li + 1; j < Math.min(li + 8, lines.length); j++) {
            const exMatch = lines[j].match(/^\*Example:\s*(.+)\*$/);
            if (exMatch) { ex = exMatch[1]; break; }
          }
          ROI_GUIDE[gid] = { ask: askParts.join(' ').replace(/\s+/g, ' ').trim(), ex };
        }
        if (!roiSect || roiSect === 'ind' || !line.startsWith('| ')) continue;
        const cols = line.split('|').map(c => c.trim()).filter(Boolean);
        if (cols.length < 3 || !/^[CPV]\d/.test(cols[0])) continue;
        roiRows[roiSect].push({ id: cols[0], label: cols[1], basis: cols[cols.length - 1] });
      }

      const AUTO_V = { V1: { from: 'C1', pct: 90, label: 'Auto: 90% of C1 (downtime eliminated)' }, V2: { from: 'C2', pct: 80, label: 'Auto: 80% of C2 (FTEs redirected)' }, V4: { from: 'C4', pct: 100, label: 'Auto: 100% of C4 (compliance replaced)' }, V6: { from: 'C3', pct: 95, label: 'Auto: 95% of C3 (transactions recovered)' } };
      function exampleAmount(ex) {
        if (!ex) return '';
        const eqMatch = ex.match(/[=→]\s*\$?([\d,]+)/);
        if (eqMatch) { const n = parseInt(eqMatch[1].replace(/,/g, ''), 10); return isNaN(n) ? '' : String(n); }
        const matches = ex.match(/\$[\d,]+/g);
        if (!matches || matches.length === 0) return '';
        const n = parseInt(matches[matches.length - 1].replace(/[$,]/g, ''), 10);
        return isNaN(n) ? '' : String(n);
      }
      const roiInput = (r, g) => {
        const guide = ROI_GUIDE[r.id] || {};
        const autoRule = AUTO_V[r.id];
        const autoAttr = autoRule ? ` data-auto-from="${autoRule.from}" data-auto-pct="${autoRule.pct}"` : '';
        const autoHint = autoRule ? `<div class="roi-auto-hint" data-hint-for="${r.id}"><span class="roi-auto-tag">auto-filled</span> ${escHtml(autoRule.label)}. Edit to override; double-click to restore.</div>` : '';
        const prefill = !autoRule ? exampleAmount(guide.ex) : '';
        const valAttr = prefill ? ` value="${prefill}"` : '';
        return `<tr><td style="font-weight:700;color:#093B5F;vertical-align:top;padding-top:12px">${r.id}</td><td style="vertical-align:top;padding-top:12px"><div>${escHtml(r.label)}</div>${autoHint}<div class="roi-guide"><span class="roi-ask">${escHtml(guide.ask || '')}</span>${guide.ex ? '<br><span class="roi-ex">Example: ' + escHtml(guide.ex) + '</span>' : ''}</div></td><td style="vertical-align:top;padding-top:10px"><input type="number" class="roi-input" aria-label="${escHtml(r.id + ' ' + r.label)}" data-group="${g}" data-id="${r.id}"${autoAttr}${valAttr} min="0" step="1000" placeholder="0"></td><td style="font-size:12px;color:#5A7A94;vertical-align:top;padding-top:12px">${xref(escHtml(r.basis), 'decisions')}</td></tr>`;
      };
      const roiSum = (label, g) => `<tr class="roi-total"><td></td><td><strong>${label}</strong></td><td><strong class="roi-sum" data-sum="${g}">$0</strong></td><td></td></tr>`;

      const sysInd = indicators.find(i => /systems?\s*connected/i.test(i.label));
      const sysCount = sysInd ? parseInt(sysInd.value) || 12 : 12;

      const indCards = indicators.map(ind => {
        const isSystems = /systems?\s*connected/i.test(ind.label) && systemsList.length > 0;
        const anchor = isSystems ? 'connected-systems' : 'decisions';
        const val = `<a href="#${anchor}" class="xref-link">${escHtml(ind.value)}</a>`;
        const lbl = isSystems ? `<a href="#connected-systems" class="xref-link">${escHtml(ind.label)}</a>` : escHtml(ind.label);
        return `<div class="roi-ind-card"><div class="roi-ind-value">${val}</div><div class="roi-ind-label">${lbl}</div><div class="roi-ind-impact">${escHtml(ind.impact)}</div></div>`;
      }).join('\n');

      html = `<h3 style="margin-top:0">ROI Discussion Guide</h3>
<p class="roi-intro">This guide walks you through building a business case in five steps. Architecture-derived values are pre-filled from your design. Fill in your organization's cost data to calculate ROI automatically.</p>

<div class="roi-step-header"><span class="roi-step-num">Foundation</span><span class="roi-step-title">Architecture Indicators</span></div>
<p class="roi-step-desc">These values are derived from the architecture design. They anchor all cost and value estimates below.</p>
<div class="roi-ind-grid">
${indCards}
</div>

<div class="roi-step-header"><span class="roi-step-num">Step 1</span><span class="roi-step-title">Cost of Current State (Annual)</span></div>
<p class="roi-step-desc">Estimate what your organization spends today due to the limitations of your current integration approach. Each row tells you <strong>what to measure</strong>, <strong>who to ask</strong>, and gives a <strong>worked example</strong>.</p>
<table><thead><tr><th style="width:40px">#</th><th>Category</th><th style="width:150px">Estimate ($)</th><th style="width:200px">Architecture Basis</th></tr></thead><tbody>
${roiRows.c.map(r => roiInput(r, 'c')).join('\n')}
${roiSum('Total current state cost', 'c')}
</tbody></table>

<div class="roi-step-header"><span class="roi-step-num">Step 2</span><span class="roi-step-title">Cost of New Platform (Annual)</span></div>
<p class="roi-step-desc">Estimate what the new platform will cost to license, implement, and operate. Contact Solace sales for licensing quotes; use your project manager for implementation scope.</p>
<table><thead><tr><th style="width:40px">#</th><th>Category</th><th style="width:150px">Estimate ($)</th><th style="width:200px">Architecture Basis</th></tr></thead><tbody>
${roiRows.p.map(r => roiInput(r, 'p')).join('\n')}
${roiSum('Total new platform cost', 'p')}
</tbody></table>

<div class="roi-step-header"><span class="roi-step-num">Step 3</span><span class="roi-step-title">Value Delivered (Annual)</span></div>
<p class="roi-step-desc">Values marked <span style="font-family:Space Mono,monospace;font-size:9px;text-transform:uppercase;letter-spacing:0.8px;background:#e6f7f1;color:#00866a;padding:1px 6px;border-radius:3px;font-weight:700">auto-filled</span> are computed from your Step 1 inputs using architecture-derived ratios. Edit any field to override with your own estimate. V3 and V5 require manual input.</p>
<table><thead><tr><th style="width:40px">#</th><th>Category</th><th style="width:150px">Estimate ($)</th><th style="width:200px">Architecture Basis</th></tr></thead><tbody>
${roiRows.v.map(r => roiInput(r, 'v')).join('\n')}
${roiSum('Total annual value', 'v')}
</tbody></table>

<div class="roi-step-header"><span class="roi-step-num">Step 4</span><span class="roi-step-title">Results</span></div>
<p class="roi-step-desc">These metrics are calculated automatically from your inputs above. They update live as you change any value.</p>
<div class="roi-results-grid">
<div class="roi-res-card roi-res-primary"><div class="roi-res-label">Net Annual Benefit</div><div class="roi-res-value" id="roi-net">$0</div><div class="roi-res-detail">Value delivered minus platform cost</div></div>
<div class="roi-res-card"><div class="roi-res-label">Implementation Cost</div><div class="roi-res-value" id="roi-impl">$0</div><div class="roi-res-detail">P2 one-time cost (amortized over 3 years in platform total)</div></div>
<div class="roi-res-card"><div class="roi-res-label">Payback Period</div><div class="roi-res-value" id="roi-payback">--</div><div class="roi-res-detail">Months until implementation cost recovered</div></div>
<div class="roi-res-card"><div class="roi-res-label">3-Year Net Value</div><div class="roi-res-value" id="roi-3yr">$0</div><div class="roi-res-detail">(Net benefit x 3) minus implementation</div></div>
<div class="roi-res-card"><div class="roi-res-label">5-Year Net Value</div><div class="roi-res-value" id="roi-5yr">$0</div><div class="roi-res-detail">(Net benefit x 5) minus impl minus upgrade</div></div>
<div class="roi-res-card"><div class="roi-res-label">ROI Percentage</div><div class="roi-res-value" id="roi-pct">--</div><div class="roi-res-detail">Net benefit / platform cost x 100</div></div>
</div>

<div class="roi-step-header"><span class="roi-step-num">Step 5</span><span class="roi-step-title">What-If Scenarios</span><button class="roi-reset-btn" id="sens-reset-btn" title="Reset all scenarios to defaults">Reset All</button></div>
<p class="roi-step-desc">Each card shows the isolated impact of a single variable change. The <strong>Combined Scenario</strong> card at the bottom compounds all active adjustments together for a realistic view.</p>
<div class="roi-sens-grid">
<div class="roi-sens-card">
<div class="roi-sens-label">Platform licensing change</div>
<div class="roi-sens-hint">What if annual licensing costs more or less than quoted? Adjusts P1 by the selected percentage.</div>
<div class="roi-sens-control"><input type="range" class="roi-slider" id="sens-license" aria-label="Platform licensing change percentage" min="-50" max="50" value="0" step="5"><span class="roi-sens-val" id="sens-license-val">0%</span></div>
<div class="roi-sens-result">Adjusted net benefit: <strong id="sens-license-net">--</strong></div>
<div class="roi-sens-result">Payback shift: <strong id="sens-license-pay">--</strong></div>
</div>
<div class="roi-sens-card">
<div class="roi-sens-label">Value delivered change</div>
<div class="roi-sens-hint">What if realized savings are higher or lower than estimated? Scales total annual value (V1-V6) up or down.</div>
<div class="roi-sens-control"><input type="range" class="roi-slider" id="sens-value" aria-label="Value delivered change percentage" min="-50" max="50" value="0" step="5"><span class="roi-sens-val" id="sens-value-val">0%</span></div>
<div class="roi-sens-result">Adjusted net benefit: <strong id="sens-value-net">--</strong></div>
<div class="roi-sens-result">Payback shift: <strong id="sens-value-pay">--</strong></div>
</div>
<div class="roi-sens-card">
<div class="roi-sens-label">Implementation cost overrun</div>
<div class="roi-sens-hint">What if the build takes more budget than planned? Increases the one-time implementation cost (P2), extending payback.</div>
<div class="roi-sens-control"><input type="range" class="roi-slider" id="sens-impl" aria-label="Implementation cost overrun percentage" min="0" max="100" value="0" step="5"><span class="roi-sens-val" id="sens-impl-val">0%</span></div>
<div class="roi-sens-result">Adjusted payback: <strong id="sens-impl-pay">--</strong></div>
<div class="roi-sens-result">Adjusted 3-yr value: <strong id="sens-impl-3yr">--</strong></div>
</div>
<div class="roi-sens-card">
<div class="roi-sens-label">Timeline delay</div>
<div class="roi-sens-hint">What if the project ships late? Each month adds burn-rate cost and delays when value starts accruing.</div>
<div class="roi-sens-control"><input type="range" class="roi-slider" id="sens-timeline" aria-label="Timeline delay in months" min="0" max="12" value="0" step="1"><span class="roi-sens-val" id="sens-timeline-val">0 mo</span></div>
<div class="roi-sens-result">Added impl cost: <strong id="sens-timeline-cost">--</strong></div>
<div class="roi-sens-result">Delayed value start: <strong id="sens-timeline-delay">--</strong></div>
</div>
<div class="roi-sens-card">
<div class="roi-sens-label">Phased adoption (year 1 systems)</div>
<div class="roi-sens-hint">What if you launch in phases — e.g., hot-path systems first, then the rest later? Fewer of the <a href="#connected-systems" class="xref-link">${sysCount} connected systems</a> live in year 1 means less value realized but also less integration work. Shows year 1 ROI for a partial rollout.</div>
<div class="roi-sens-control"><input type="range" class="roi-slider" id="sens-phase" aria-label="Year 1 system count" min="1" max="${sysCount}" value="${sysCount}" step="1"><span class="roi-sens-val" id="sens-phase-val">${sysCount}</span></div>
<div class="roi-sens-result">Year 1 net benefit: <strong id="sens-phase-net">--</strong></div>
<div class="roi-sens-result">Year 1 payback: <strong id="sens-phase-pay">--</strong></div>
</div>
</div>
<div class="roi-combined-card">
<div class="roi-combined-header"><span class="roi-combined-icon">&#x2194;</span> Combined Scenario</div>
<div class="roi-combined-desc">Compounded impact of all active adjustments above</div>
<div class="roi-combined-grid">
<div class="roi-combined-item roi-combined-primary"><div class="roi-combined-label">Net Annual Benefit</div><div class="roi-combined-value" id="sens-combined-net">--</div><div class="roi-combined-delta" id="sens-combined-net-delta"></div></div>
<div class="roi-combined-item"><div class="roi-combined-label">Implementation Cost</div><div class="roi-combined-value" id="sens-combined-impl">--</div><div class="roi-combined-delta" id="sens-combined-impl-delta"></div></div>
<div class="roi-combined-item"><div class="roi-combined-label">Payback Period</div><div class="roi-combined-value" id="sens-combined-pay">--</div><div class="roi-combined-delta" id="sens-combined-pay-delta"></div></div>
<div class="roi-combined-item"><div class="roi-combined-label">3-Year Net Value</div><div class="roi-combined-value" id="sens-combined-3yr">--</div><div class="roi-combined-delta" id="sens-combined-3yr-delta"></div></div>
<div class="roi-combined-item"><div class="roi-combined-label">5-Year Net Value</div><div class="roi-combined-value" id="sens-combined-5yr">--</div><div class="roi-combined-delta" id="sens-combined-5yr-delta"></div></div>
<div class="roi-combined-item"><div class="roi-combined-label">ROI Percentage</div><div class="roi-combined-value" id="sens-combined-pct">--</div><div class="roi-combined-delta" id="sens-combined-pct-delta"></div></div>
</div>
</div>

<div class="roi-step-header"><span class="roi-step-num">Step 6</span><span class="roi-step-title">Download</span></div>
<p class="roi-step-desc">Export your completed analysis as an Excel workbook with formulas for all calculated fields.</p>
<div style="display:flex;gap:12px;align-items:center;margin-top:8px">
<button class="roi-export-btn" id="roi-excel-btn">Download as Excel (.xlsx)</button>
<span style="font-size:12px;color:#5A7A94">Includes formulas, sensitivity scenarios, and architecture indicators</span>
</div>`;
    } else {
      // All other markdown documents (and any other unhandled type) get the
      // same title / path / description / copy-button header on top of the
      // rendered content. The ROI-framework branch above intentionally keeps
      // its own interactive layout and skips this header.
      html = `${reportArtifactHeader(f, text)}${marked.parse(text)}`;
    }
    sections.push({ group: groupName, isNewGroup, html, file: f, ext });
  }

  const DIAGRAM_REMAP = {
    'topic-hierarchy': 'topic-design',
    'topic-hierarchy-02-operations': 'topic-design',
    'queue-subscriptions': 'topic-design',
    'queue-subscriptions-02-operations': 'topic-design',
    'queue-subscriptions-detail': 'topic-design',
    'protocol-stack': 'protocol-select',
    'mi-connectivity': 'integration',
    'security-boundaries': 'reviews',
    'security-detail': 'reviews',
    'ha-failover': 'ha-dr',
    'failure-modes': 'ha-dr',
    'dmr-topology': 'mesh-design',
  };
  for (const s of sections) {
    if (s.group === 'blueprint') {
      const baseName = s.file.split('/').pop().replace(/\.\w+$/, '');
      if (DIAGRAM_REMAP[baseName]) s.group = DIAGRAM_REMAP[baseName];
    }
  }

  // Pack-filtered subsets of decisions and findings.
  const packFilteredFindings = filterByPackSkills(
    items.filter(d => d.source),
    packFilters.finding_skills
  );
  const packFilteredDecisions = filterByPackSkills(
    items.filter(d => d.id || (d.skill && !d.source)),
    packFilters.decision_skills
  );
  const findingRows = packFilteredFindings.map(d =>
    `<tr><td>${skillLink(d.source)}</td><td>${(d.severity||'advisory').toUpperCase()}</td><td>${escHtml(d.decision||'')}</td><td>${escHtml(d.action||'')}</td></tr>`
  ).join('');

  // Pack-filtered skill and file counts. For restricted packs, these are used
  // in headline stats so we don't reveal the hidden total project scope
  // (Codex adversarial review: leak of metadata via top-line counts).
  const isUnfilteredPack = !packFilters || Object.keys(packFilters).length === 0;
  const packFilteredFileCount = docFiles.length;
  const packFilteredSkillIds = new Set();
  for (const s of skills) {
    if (s.status !== 'complete') continue;
    if (!s.artifacts || s.artifacts.length === 0) {
      if (isUnfilteredPack) packFilteredSkillIds.add(s.skill);
      continue;
    }
    for (const a of s.artifacts) {
      if (packIncludesArtifact(packFilters, a.path)) {
        packFilteredSkillIds.add(s.skill);
        break;
      }
    }
  }
  const packFilteredSkillCount = packFilteredSkillIds.size;

  const GROUP_SORT_ORDER = {
    'discovery': 0, 'topic-design': 10, 'broker-select': 20, 'sam-design': 25, 'protocol-select': 30,
    'mesh-design': 40, 'ha-dr': 50, 'integration': 60, 'migration': 70,
    'event-portal': 75, 'reviews': 80, 'validation': 90, 'blueprint': 100, 'arch-blueprint': 105,
    'executive': 110, 'diagrams': 115
  };
  sections.sort((a, b) => (GROUP_SORT_ORDER[a.group] ?? 999) - (GROUP_SORT_ORDER[b.group] ?? 999));
  let prevG2 = null;
  for (const s of sections) { s.isNewGroup = s.group !== prevG2; prevG2 = s.group; }

  const groups = [];
  const seen = new Set();
  for (const s of sections) {
    if (s.isNewGroup && !seen.has(s.group)) { seen.add(s.group); groups.push(s.group); }
  }

  const rawOpenItems = getOpenItems(state.data.openItems);
  // Pack-filter by source skill (same rule as findings). Open items typically have
  // a `source` field pointing to the review skill that surfaced them.
  const openItems = filterByPackSkills(rawOpenItems, packFilters.finding_skills);
  const openCount = openItems.filter(i => i.status !== 'resolved').length;

  const PHASE_MAP = {
    'discovery': 'Discovery',
    'topic-design': 'Design', 'broker-select': 'Design', 'sam-design': 'Design', 'protocol-select': 'Design',
    'mesh-design': 'Design', 'ha-dr': 'Design', 'integration': 'Design', 'migration': 'Design', 'event-portal': 'Design',
    'reviews': 'Reviews',
    'validation': 'Finalize', 'blueprint': 'Finalize', 'arch-blueprint': 'Finalize',
    'executive': 'Finalize', 'diagrams': 'Finalize'
  };
  const artId = (f) => 'art-' + f.replace(/[^a-z0-9]/gi, '-').replace(/-+/g, '-').toLowerCase();
  const artLabel = (f) => {
    const name = f.split('/').pop().replace(/\.\w+$/, '');
    let label = name.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    label = label.replace(/\b(Dmr|Ha|Dr|Mi|Dlq|Roi|Api|Acl|Sam|Smf|Mqtt)\b/g, m => m.toUpperCase());
    const ext = f.split('.').pop();
    return (ext === 'mermaid' || ext === 'mmd') ? label + ' (diagram)' : label;
  };

  const phaseGroups = {};
  for (const g of groups) {
    const phase = PHASE_MAP[g] || 'Other';
    if (!phaseGroups[phase]) phaseGroups[phase] = [];
    phaseGroups[phase].push(g);
  }

  const tocHtml = (() => {
    let html = '';
    html += '<div class="toc-phase">Overview</div>';
    html += '<a href="#exec-summary">Summary</a>';
    if (rptSystemsList.length > 0 || Object.keys(rptInputs.goals).length > 0) html += '<a href="#scope-inputs">Scope & Inputs</a>';
    html += '<a href="#decisions">Decisions</a>';
    if (findingRows) html += '<a href="#findings">Review Findings</a>';
    if (openItems.length > 0) html += `<a href="#open-items">Open Items (${openCount})</a>`;
    if (systemsList.length > 0) html += `<a href="#connected-systems">Connected Systems (${systemsList.length})</a>`;

    const phaseOrder = ['Discovery', 'Design', 'Reviews', 'Finalize', 'Other'];
    for (const phase of phaseOrder) {
      const pGroups = phaseGroups[phase];
      if (!pGroups || pGroups.length === 0) continue;
      html += `<div class="toc-phase">${phase}</div>`;
      const isSingle = pGroups.length === 1;

      for (const g of pGroups) {
        const groupArts = sections.filter(s => s.group === g);
        const showArts = groupArts.length <= 20 ? groupArts : groupArts.filter(s => s.ext === 'md');

        if (isSingle && showArts.length <= 1) {
          html += `<a href="#grp-${g}">${showArts.length === 1 ? artLabel(showArts[0].file) : grpLabel(g)}</a>`;
        } else if (isSingle) {
          for (const s of showArts) {
            html += `<a href="#${artId(s.file)}">${artLabel(s.file)}</a>`;
          }
        } else {
          html += `<a href="#grp-${g}" class="toc-skill">${grpLabel(g)}</a>`;
          if (showArts.length > 1) {
            for (const s of showArts) {
              html += `<a href="#${artId(s.file)}" class="toc-art">${artLabel(s.file)}</a>`;
            }
          }
        }
      }
    }
    return html;
  })();

  const reportHtml = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<title>${escHtml(context?.display_name || state.current.slug)} — ${escHtml(packLabel)}</title>
<link href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Figtree',sans-serif;font-size:15px;line-height:1.65;color:#1f2937}
a{color:#093B5F;text-decoration:none}
a:hover{color:#00C895}

/* --- Two-column layout --- */
.page-header{background:linear-gradient(135deg,#093B5F,#03213B);color:#fff;padding:32px 40px 24px}
.page-header .eyebrow{font-family:'Space Mono',monospace;font-size:11px;letter-spacing:1.4px;text-transform:uppercase;font-weight:700;color:#00C895}
.page-header h1{font-family:'Figtree',sans-serif;font-size:32px;font-weight:700;color:#fff;margin:6px 0 8px}
.page-header .subtitle{color:#8BA4B8;font-size:14px;line-height:1.5;max-width:720px}
.stat-row{display:flex;gap:32px;margin-top:16px}
.stat-item .stat-label{font-family:'Space Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#8BA4B8;font-weight:700}
.stat-item .stat-value{font-size:22px;font-weight:700;color:#00C895}
.xref-link{color:inherit;text-decoration:none;border-bottom:1px dashed #00C895;transition:border-color 0.15s}
.xref-link:hover{border-bottom-color:#093B5F;color:#093B5F}
.systems-table{font-size:13px}
.systems-table td{vertical-align:top}
.scope-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin-top:12px}
.scope-card-wide{grid-column:1/-1}
.scope-card{border:1px solid #e2eaf0;border-radius:8px;overflow:hidden;border-left:3px solid #00C895}
.scope-card.scope-landscape{border-left-color:#3B82F6}
.scope-card.scope-events{border-left-color:#8B5CF6}
.scope-card.scope-requirements{border-left-color:#F59E0B}
.scope-card.scope-goals{border-left-color:#EF4444}
.scope-card-header{font-family:'Space Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:1.2px;font-weight:700;color:#093B5F;background:#f8fafc;padding:10px 14px;border-bottom:1px solid #e2eaf0;display:flex;align-items:center;gap:8px}
.scope-card-header .scope-icon{font-size:14px;opacity:0.7}
.scope-card-header .scope-count{font-size:10px;color:#5A7A94;font-weight:400;margin-left:auto}
.scope-card-body{padding:12px 14px}
.scope-systems-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px}
.scope-system{display:flex;align-items:center;gap:8px;padding:6px 10px;background:#f8fafc;border-radius:6px;font-size:13px;border:1px solid #eef2f6}
.scope-sys-name{font-weight:600;color:#093B5F;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.scope-sys-role{font-size:10px;color:#fff;padding:2px 8px;border-radius:10px;white-space:nowrap;font-weight:600;letter-spacing:0.3px}
.scope-sys-role.role-producer{background:#3B82F6}
.scope-sys-role.role-consumer{background:#8B5CF6}
.scope-sys-role.role-both{background:#00C895}
.scope-field{padding:8px 0;border-bottom:1px solid #f0f4f8}
.scope-field:last-child{border-bottom:none}
.scope-field-label{display:block;font-family:'Space Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:0.8px;color:#5A7A94;font-weight:700;margin-bottom:3px}
.scope-field-value{display:block;font-size:13px;color:#093B5F;line-height:1.5}
.scope-events-grid{display:flex;flex-wrap:wrap;gap:6px}
.scope-event{font-size:12px;padding:4px 10px;color:#093B5F;background:#f5f3ff;border:1px solid #e9e5f5;border-radius:14px;display:inline-flex;align-items:center;gap:5px}
.scope-event-rate{font-size:10px;color:#8B5CF6;font-family:'Space Mono',monospace;font-weight:600}
.layout{display:flex;min-height:calc(100vh - 140px)}
.sidebar{width:240px;flex-shrink:0;border-right:1px solid #e5e7eb;padding:24px 0;position:sticky;top:48px;align-self:flex-start;height:calc(100vh - 48px);overflow-y:auto}
.sidebar .toc-title{font-family:'Space Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:1.2px;color:#5A7A94;font-weight:700;padding:0 20px;margin-bottom:12px}
.sidebar a{display:block;padding:6px 20px;font-size:13px;font-weight:500;color:#5A7A94;border-left:2px solid transparent;transition:all 0.15s}
.sidebar a:hover,.sidebar a.active{color:#093B5F;background:#f0fdf9;border-left-color:#00C895}
.toc-phase{font-family:'Space Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:1.4px;color:#5A7A94;font-weight:700;padding:12px 20px 4px;margin-top:4px}
.toc-phase:first-child{margin-top:0}
.sidebar a.toc-skill{padding-left:28px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sidebar a.toc-art{padding-left:40px;font-size:11px;font-weight:400;color:#8BA4B8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sidebar a.toc-art:hover,.sidebar a.toc-art.active{color:#093B5F}
.art-section{scroll-margin-top:60px}

/* --- ROI Calculator --- */
.roi-intro{margin-bottom:20px;color:#374151;line-height:1.7}
.roi-step-header{display:flex;align-items:center;gap:12px;margin:32px 0 8px;padding-bottom:8px;border-bottom:2px solid #e5e7eb}
.roi-step-header:first-of-type{margin-top:16px}
.roi-step-num{font-family:'Space Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:1.2px;color:#fff;background:#093B5F;padding:3px 10px;border-radius:12px;font-weight:700;white-space:nowrap}
.roi-step-title{font-size:17px;font-weight:700;color:#093B5F}
.roi-step-desc{font-size:13px;color:#4A6A84;margin-bottom:12px;line-height:1.6}
.roi-ind-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;margin-bottom:8px}
.roi-ind-card{background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;padding:14px 16px}
.roi-ind-value{font-family:'Space Mono',monospace;font-size:18px;font-weight:700;color:#093B5F;margin-bottom:2px}
.roi-ind-label{font-size:12px;font-weight:600;color:#5A7A94;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px}
.roi-ind-impact{font-size:11px;color:#6b7280;line-height:1.4}
.roi-input{width:100%;padding:6px 10px;border:1px solid #d1d5db;border-radius:4px;font-family:'Figtree',sans-serif;font-size:14px;text-align:right;background:#fff;-moz-appearance:textfield}
.roi-input::-webkit-outer-spin-button,.roi-input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
.roi-input:focus{outline:none;border-color:#00C895;box-shadow:0 0 0 2px rgba(0,200,149,0.2)}
.roi-input::placeholder{color:#bbb}
.roi-total td{background:#f0fdf9!important;border-top:2px solid #00C895}
.roi-positive{color:#00C895!important}
.roi-negative{color:#DC2626!important}
.roi-export-btn{font-family:'Figtree',sans-serif;font-size:13px;font-weight:600;padding:8px 20px;border-radius:6px;cursor:pointer;border:none;background:#093B5F;color:#fff;transition:all 0.15s}
.roi-export-btn:hover{background:#00C895;color:#03213B}
.roi-guide{margin-top:4px;line-height:1.5}
.roi-ask{font-size:11px;color:#4A6A84;font-style:italic}
.roi-ex{font-size:11px;color:#00866a;font-weight:500}
.roi-auto-hint{font-size:11px;color:#00866a;margin:3px 0 2px;line-height:1.4;transition:opacity 0.2s}
.roi-auto-hint.roi-overridden{opacity:0.4;text-decoration:line-through}
.roi-auto-tag{font-family:'Space Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:0.8px;background:#e6f7f1;color:#00866a;padding:1px 6px;border-radius:3px;font-weight:700;margin-right:4px}
.roi-input.roi-auto-filled{border-color:#00C895;background:#f0fdf9}
.roi-sum{font-size:15px}
.roi-results-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin:12px 0 8px}
.roi-res-card{background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;padding:16px;text-align:center}
.roi-res-card.roi-res-primary{background:linear-gradient(135deg,#093B5F,#0a4a75);border:none}
.roi-res-card.roi-res-primary .roi-res-label{color:#8BA4B8}
.roi-res-card.roi-res-primary .roi-res-value{color:#00C895;font-size:24px}
.roi-res-card.roi-res-primary .roi-res-detail{color:#6b8fa8}
.roi-res-label{font-family:'Space Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#5A7A94;font-weight:700;margin-bottom:6px}
.roi-res-value{font-size:20px;font-weight:700;color:#093B5F;margin-bottom:4px;transition:color 0.2s;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.roi-res-detail{font-size:11px;color:#6b7280}
.roi-sens-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin:12px 0 8px}
.roi-sens-card{background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;padding:16px}
.roi-sens-label{font-size:13px;font-weight:600;color:#093B5F;margin-bottom:4px}
.roi-sens-hint{font-size:11px;color:#6B7B8D;line-height:1.4;margin-bottom:10px}
.roi-reset-btn{margin-left:auto;padding:4px 12px;font-size:11px;font-weight:600;font-family:'Figtree',sans-serif;color:#5A7A94;background:none;border:1px solid #d1d5db;border-radius:4px;cursor:pointer;letter-spacing:0.02em}
.roi-reset-btn:hover{color:#093B5F;border-color:#093B5F;background:#f8fafc}
.roi-sens-control{display:flex;align-items:center;gap:10px;margin-bottom:12px}
.roi-slider{flex:1;-webkit-appearance:none;height:6px;border-radius:3px;background:#e5e7eb;outline:none}
.roi-slider::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;background:#093B5F;cursor:pointer;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.2)}
.roi-slider::-moz-range-thumb{width:18px;height:18px;border-radius:50%;background:#093B5F;cursor:pointer;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.2)}
.roi-sens-val{font-family:'Space Mono',monospace;font-size:13px;font-weight:700;color:#093B5F;min-width:42px;text-align:right}
.roi-sens-result{font-size:12px;color:#5A7A94;margin-bottom:4px}
.roi-sens-result strong{color:#093B5F}
.roi-combined-card{background:linear-gradient(135deg,#f0fdf9,#e8f4f8);border:2px solid #00C895;border-radius:10px;padding:20px;margin:16px 0 8px}
.roi-combined-header{font-size:15px;font-weight:700;color:#093B5F;margin-bottom:2px;display:flex;align-items:center;gap:8px}
.roi-combined-icon{font-size:18px;color:#00C895}
.roi-combined-desc{font-size:11px;color:#4A6A84;margin-bottom:14px}
.roi-combined-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.roi-combined-item{text-align:center;padding:10px 6px;border-radius:8px;border:1px solid #e2eaf0;background:#fff}
.roi-combined-item.roi-combined-primary{background:linear-gradient(135deg,#093B5F,#0d4a73);border-color:#093B5F}
.roi-combined-item.roi-combined-primary .roi-combined-label{color:rgba(255,255,255,0.8)}
.roi-combined-item.roi-combined-primary .roi-combined-value{color:#00C895}
.roi-combined-item.roi-combined-primary .roi-combined-delta{color:rgba(255,255,255,0.6)}
.roi-combined-item.roi-combined-primary .roi-combined-delta.delta-negative{color:#FF6B6B}
.roi-combined-item.roi-combined-primary .roi-combined-delta.delta-positive{color:#ABFF88}
.roi-combined-item.roi-combined-primary .roi-combined-delta.delta-neutral{color:rgba(255,255,255,0.5)}
.roi-combined-label{font-family:'Space Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#5A7A94;font-weight:700;margin-bottom:4px}
.roi-combined-value{font-size:18px;font-weight:700;color:#093B5F;transition:color 0.2s}
.roi-combined-delta{font-size:10px;margin-top:4px;color:#5A7A94;font-style:italic;min-height:14px;transition:color 0.2s}
.scope-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin-top:12px}
.scope-card-wide{grid-column:1/-1}
.scope-card{border:1px solid var(--border);border-radius:8px;overflow:hidden;border-left:3px solid #00C895}
.scope-card.scope-landscape{border-left-color:#3B82F6}
.scope-card.scope-events{border-left-color:#8B5CF6}
.scope-card.scope-requirements{border-left-color:#F59E0B}
.scope-card.scope-goals{border-left-color:#EF4444}
.scope-card-header{font-family:'Space Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:1.2px;font-weight:700;color:var(--text);background:var(--bg-alt,#f8fafc);padding:10px 14px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px}
.scope-card-header .scope-icon{font-size:14px;opacity:0.7}
.scope-card-header .scope-count{font-size:10px;color:var(--text-muted);font-weight:400;margin-left:auto}
.scope-card-body{padding:12px 14px}
.scope-systems-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px}
.scope-system{display:flex;align-items:center;gap:8px;padding:6px 10px;background:var(--bg-alt,#f8fafc);border-radius:6px;font-size:13px;border:1px solid var(--border)}
.scope-sys-name{font-weight:600;color:var(--text);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.scope-sys-role{font-size:10px;color:#fff;padding:2px 8px;border-radius:10px;white-space:nowrap;font-weight:600;letter-spacing:0.3px}
.scope-sys-role.role-producer{background:#3B82F6}
.scope-sys-role.role-consumer{background:#8B5CF6}
.scope-sys-role.role-both{background:#00C895}
.scope-field{padding:8px 0;border-bottom:1px solid var(--border)}
.scope-field:last-child{border-bottom:none}
.scope-field-label{display:block;font-family:'Space Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:0.8px;color:var(--text-muted);font-weight:700;margin-bottom:3px}
.scope-field-value{display:block;font-size:13px;color:var(--text);line-height:1.5}
.scope-events-grid{display:flex;flex-wrap:wrap;gap:6px}
.scope-event{font-size:12px;padding:4px 10px;color:var(--text);background:#f5f3ff;border:1px solid #e9e5f5;border-radius:14px;display:inline-flex;align-items:center;gap:5px}
.scope-event-rate{font-size:10px;color:#8B5CF6;font-family:'Space Mono',monospace;font-weight:600}
@media print{.roi-input{border:1px solid #ccc;background:#fff}.roi-export-btn{display:none}.roi-reset-btn{display:none}.roi-sens-grid{display:none}.roi-combined-card{display:none}.roi-res-card.roi-res-primary{background:#f0fdf9!important;border:1px solid #00C895;-webkit-print-color-adjust:exact;print-color-adjust:exact}.roi-res-card.roi-res-primary .roi-res-value{color:#093B5F!important}.roi-res-card.roi-res-primary .roi-res-label,.roi-res-card.roi-res-primary .roi-res-detail{color:#5A7A94!important}}

.content{flex:1;min-width:0;max-width:780px;padding:32px 40px 64px;margin:0 auto}

/* --- Article typography --- */
.content h2{font-size:22px;font-weight:700;color:#093B5F;margin:40px 0 16px;padding-bottom:8px;border-bottom:2px solid #00C895;scroll-margin-top:2rem}
.content h3{font-size:17px;font-weight:600;color:#093B5F;margin:28px 0 10px;scroll-margin-top:2rem}
.content h4{font-size:14px;font-weight:600;color:#093B5F;margin:20px 0 8px}
.content p{margin-bottom:12px;line-height:1.75}
.content ul,.content ol{margin-bottom:16px;padding-left:24px}
.content li{margin-bottom:6px;line-height:1.65}
.content li p{margin-bottom:4px}
.content ol li::marker{font-weight:600;color:#093B5F}
.content strong{color:#093B5F}
.content>*+h2{margin-top:48px}
.content blockquote{border-left:3px solid #00C895;padding:8px 16px;margin:16px 0;background:#f0fdf9;border-radius:0 6px 6px 0}
.content img{max-width:100%;border-radius:8px;margin:16px 0}

/* --- Tables: alternating rows, bordered --- */
table{width:100%;border-collapse:collapse;margin:16px 0;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden}
thead{background:#f8fafc}
th{font-family:'Space Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#5A7A94;text-align:left;padding:10px 14px;border-bottom:2px solid #e5e7eb}
td{padding:10px 14px;font-size:13px;border-bottom:1px solid #f1f5f9}
tbody tr:nth-child(even){background:#f8fafc}
tbody tr:hover{background:#f0fdf9}

/* --- Code blocks: dark --- */
code{font-family:'Space Mono',SFMono-Regular,Menlo,monospace;font-size:0.85em;background:#f1f5f9;padding:2px 6px;border-radius:4px;color:#093B5F}
pre{background:#1e293b;color:#e2e8f0;border-radius:8px;padding:16px 20px;margin:16px 0;overflow-x:auto;font-size:13px;line-height:1.5;border:1px solid #334155}
pre code{background:none;padding:0;color:inherit;font-size:inherit}

/* --- Group section markers --- */
.grp-section{margin-top:48px}
.grp-section:first-child{margin-top:0}
.grp-marker{font-family:'Space Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:1.4px;color:#5A7A94;font-weight:700;padding:6px 0;margin-bottom:4px;display:flex;align-items:center;gap:10px}
.grp-marker::after{content:'';flex:1;height:1px;background:#e5e7eb}
.grp-break{page-break-before:always}

/* --- Separator --- */
.section-sep{border:none;border-top:1px solid #e5e7eb;margin:24px 0}

/* --- Footer --- */
.report-footer{text-align:center;color:#9ca3af;font-size:12px;margin-top:48px;padding-top:24px;border-top:1px solid #e5e7eb}

/* --- Mermaid diagrams --- */
.mermaid{background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;padding:24px 16px;margin:20px 0;text-align:center;overflow-x:auto;cursor:zoom-in;transition:box-shadow 0.15s}
.mermaid:hover{box-shadow:0 0 0 2px #00C895}
.mermaid svg{max-width:100%;height:auto!important}
.diagram-desc{font-size:12px;color:#5A7A94;text-align:center;margin:-12px 0 20px;font-style:italic;line-height:1.5}

/* --- Diagram zoom modal --- */
.diagram-zoom-overlay{display:none;position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.88);backdrop-filter:blur(4px)}
.diagram-zoom-overlay.open{display:flex;flex-direction:column}
.diagram-zoom-toolbar{display:flex;align-items:center;justify-content:space-between;padding:10px 20px;background:rgba(3,33,59,0.95);border-bottom:1px solid rgba(255,255,255,0.1);flex-shrink:0}
.diagram-zoom-toolbar .zoom-title{font-family:'Space Mono',monospace;font-size:11px;text-transform:uppercase;letter-spacing:1.2px;color:#8BA4B8;font-weight:700}
.diagram-zoom-toolbar .zoom-actions{display:flex;gap:6px;align-items:center}
.diagram-zoom-toolbar button{font-family:'Figtree',sans-serif;font-size:13px;font-weight:600;padding:5px 12px;border-radius:6px;cursor:pointer;border:1px solid rgba(255,255,255,0.15);background:transparent;color:#8BA4B8;transition:all 0.15s}
.diagram-zoom-toolbar button:hover{background:rgba(255,255,255,0.08);color:#fff}
.diagram-zoom-toolbar .zoom-close{background:transparent;border:none;font-size:24px;line-height:1;padding:4px 8px;color:#8BA4B8;cursor:pointer;margin-left:12px}
.diagram-zoom-toolbar .zoom-close:hover{color:#fff}
.diagram-zoom-toolbar .zoom-level{font-family:'Space Mono',monospace;font-size:12px;color:#00C895;min-width:48px;text-align:center}
.diagram-zoom-viewport{flex:1;overflow:hidden;cursor:grab;display:flex;align-items:center;justify-content:center}
.diagram-zoom-viewport:active{cursor:grabbing}
.diagram-zoom-content{background:#f8fafc;border-radius:8px;padding:24px;box-shadow:0 8px 32px rgba(0,0,0,0.4);transform-origin:center center;line-height:0}
.diagram-zoom-content svg{display:block}
/* --- Download toolbar --- */
.dl-bar{position:fixed;top:0;left:0;right:0;z-index:100;background:rgba(3,33,59,0.95);backdrop-filter:blur(8px);padding:10px 40px;display:flex;align-items:center;justify-content:space-between}
.dl-bar .dl-title{font-family:'Space Mono',monospace;font-size:11px;text-transform:uppercase;letter-spacing:1.2px;color:#8BA4B8;font-weight:700}
.dl-bar .dl-actions{display:flex;gap:10px}
.dl-bar button{font-family:'Figtree',sans-serif;font-size:13px;font-weight:600;padding:6px 16px;border-radius:6px;cursor:pointer;border:none}
.dl-bar .dl-btn{background:#00C895;color:#03213B}
.dl-bar .dl-btn:hover{background:#ABFF88}
.dl-bar .dl-print{background:transparent;border:1px solid rgba(255,255,255,0.2);color:#8BA4B8}
.dl-bar .dl-print:hover{background:rgba(255,255,255,0.08);color:#fff}
.dl-bar .dl-theme-toggle{background:transparent;border:1px solid rgba(255,255,255,0.2);color:#8BA4B8;font-size:16px;width:34px;height:34px;display:flex;align-items:center;justify-content:center;border-radius:6px;cursor:pointer;transition:all 0.15s}
.dl-bar .dl-theme-toggle:hover{background:rgba(255,255,255,0.08);color:#fff}

/* --- Floating nav --- */
.float-nav{position:fixed;bottom:24px;right:24px;z-index:90;display:flex;flex-direction:column;gap:6px}
.float-btn{width:36px;height:36px;border-radius:50%;border:1px solid rgba(9,59,95,0.15);background:rgba(255,255,255,0.92);backdrop-filter:blur(6px);color:#093B5F;font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.1);transition:all 0.15s}
.float-btn:hover{background:#093B5F;color:#fff;border-color:#093B5F}

/* --- Dark theme --- */
body.dark{background:#0d1117;color:#c9d1d9}
body.dark .page-header{background:linear-gradient(135deg,#010409,#0d1117)}
body.dark .layout{background:#0d1117}
body.dark .sidebar{border-right-color:#21262d;background:#0d1117}
body.dark .sidebar a{color:#8b949e}
body.dark .sidebar a:hover,body.dark .sidebar a.active{color:#c9d1d9;background:#161b22;border-left-color:#00C895}
body.dark .toc-phase{color:#8b949e}
body.dark .content{color:#c9d1d9}
body.dark .content h2{color:#c9d1d9;border-bottom-color:#21262d}
body.dark .content h3{color:#c9d1d9}
body.dark a{color:#58a6ff}
body.dark a:hover{color:#00C895}
body.dark .xref-link{border-bottom-color:#30363d}
body.dark table{border-color:#21262d}
body.dark th{background:#161b22;color:#8b949e;border-color:#21262d}
body.dark td{border-color:#21262d;color:#c9d1d9}
body.dark tr:nth-child(even){background:#161b22}
body.dark pre{background:#161b22!important;border-color:#21262d!important;color:#c9d1d9!important}
body.dark pre code{color:#c9d1d9!important}
body.dark .stat-item .stat-label{color:#8b949e}
body.dark .stat-item .stat-value{color:#00C895}
body.dark .grp-section{background:#161b22;border-color:#21262d}
body.dark .section-sep{border-color:#21262d}
body.dark .mermaid{background:#161b22!important;border-color:#21262d!important}
body.dark .scope-card{border-color:#21262d;background:#0d1117}
body.dark .scope-card-header{background:#161b22;color:#c9d1d9;border-color:#21262d}
body.dark .scope-card-body{background:#0d1117}
body.dark .scope-system{background:#161b22;border-color:#21262d}
body.dark .scope-sys-name{color:#c9d1d9}
body.dark .scope-field{border-color:#21262d}
body.dark .scope-field-value{color:#c9d1d9}
body.dark .scope-event{background:#1c1633;border-color:#2d2548;color:#c9d1d9}
body.dark .scope-event-rate{color:#a78bfa}
body.dark .systems-table td{color:#c9d1d9}
body.dark .float-btn{background:rgba(22,27,34,0.92);color:#8b949e;border-color:#21262d}
body.dark .float-btn:hover{background:#00C895;color:#03213B;border-color:#00C895}

/* --- Per-artifact header (title + path + description + copy) --- */
.report-artifact-header{
  display:flex;align-items:flex-start;justify-content:space-between;gap:16px;
  padding:14px 16px;margin:24px 0 16px;
  background:rgba(15,42,68,0.04);border:1px solid #e1e8ef;border-radius:6px;
}
.report-artifact-text{flex:1;min-width:0}
.report-artifact-title{
  font-size:17px;font-weight:700;margin:0 0 4px;color:#093B5F;line-height:1.25;
}
.report-artifact-path{
  display:inline-block;font-family:'SFMono-Regular',Menlo,Monaco,Consolas,monospace;
  font-size:11px;letter-spacing:0.3px;color:#5A7A94;
  background:rgba(15,42,68,0.06);padding:2px 8px;border-radius:4px;margin:2px 0;
}
.report-artifact-desc{
  color:#3F5870;font-size:13px;line-height:1.55;margin:6px 0 0;max-width:80ch;
}
.report-copy-btn{
  flex-shrink:0;padding:6px 14px;font-size:11px;font-weight:600;letter-spacing:0.5px;
  text-transform:uppercase;background:transparent;border:1px solid #cbd5dc;
  border-radius:4px;color:#3F5870;cursor:pointer;font-family:inherit;
  transition:background 0.12s,color 0.12s,border-color 0.12s;
}
.report-copy-btn:hover{background:#093B5F;color:#fff;border-color:#093B5F}
.report-copy-btn.is-copied{background:#00C895;color:#03213B;border-color:#00C895}
.report-copy-raw{
  position:absolute;left:-10000px;top:-10000px;width:1px;height:1px;opacity:0;
  pointer-events:none;
}
body.dark .report-artifact-header{background:rgba(255,255,255,0.03);border-color:#21262d}
body.dark .report-artifact-title{color:#c9d1d9}
body.dark .report-artifact-path{background:rgba(255,255,255,0.06);color:#8b949e}
body.dark .report-artifact-desc{color:#8b949e}
body.dark .report-copy-btn{border-color:#30363d;color:#8b949e}
body.dark .report-copy-btn:hover{background:#00C895;color:#03213B;border-color:#00C895}

/* --- Print --- */
@media print{
  .page-header{background:#093B5F!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .sidebar,.dl-bar,.float-nav{display:none!important}
  .layout{display:block}
  .content{max-width:100%;padding:0}
  body{font-size:12px;padding-top:0!important}
  .report-copy-btn{display:none}
  .report-artifact-header{background:transparent;border-color:#cbd5dc;padding:6px 0;margin:14px 0 8px}
  .content h2{font-size:16px;margin:24px 0 10px}
  .content h3{font-size:13px;margin:16px 0 6px}
  pre{background:#f4f4f4!important;color:#1a1a1a!important;border:1px solid #ddd!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  pre code{color:#1a1a1a!important}
  .grp-break{page-break-before:always}
  tr,pre,.stat-row{page-break-inside:avoid}
  .grp-section{margin-top:20px}
  .section-sep{margin:12px 0}
  table{font-size:11px}
  td,th{padding:5px 8px}
  .mermaid{background:#f4f4f4!important;border-color:#ddd!important}
}
</style></head><body style="padding-top:48px">

<div class="dl-bar">
  <a href="#" class="dl-title" onclick="window.scrollTo({top:0,behavior:'smooth'});return false" style="text-decoration:none;cursor:pointer">${escHtml(packLabel)}</a>
  <div class="dl-actions">
    <button class="dl-theme-toggle" onclick="document.body.classList.toggle('dark');this.textContent=document.body.classList.contains('dark')?'☀':'☾'" title="Toggle dark/light theme">☾</button>
    <button class="dl-print" onclick="window.print()">Print / PDF</button>
    <button class="dl-btn" id="dlBtn">Download HTML</button>
  </div>
</div>
<div class="float-nav">
  <button class="float-btn" onclick="window.scrollTo({top:0,behavior:'smooth'})" title="Go to top">&#x25B2;</button>
  <button class="float-btn" onclick="window.scrollTo({top:document.body.scrollHeight,behavior:'smooth'})" title="Go to bottom">&#x25BC;</button>
</div>

<div class="page-header">
  <p class="eyebrow">${escHtml(packLabel)}</p>
  <h1>${escHtml(context?.display_name||state.current.slug)}</h1>
  <p class="subtitle">${escHtml(discoverySummary)}</p>
  <div class="stat-row">
    <div class="stat-item"><div class="stat-label">Skills</div><div class="stat-value">${packFilteredSkillCount}${isUnfilteredPack ? ` <span style="font-size:14px;color:#8BA4B8;font-weight:400">/ ${skills.length}</span>` : ''}</div></div>
    <div class="stat-item"><div class="stat-label">Artifacts</div><div class="stat-value">${packFilteredFileCount}</div></div>
    <div class="stat-item"><div class="stat-label">Execution</div><div class="stat-value">${fmtTime(totalExec)}</div></div>
    <div class="stat-item"><div class="stat-label">User Wait</div><div class="stat-value">${fmtTime(totalWait)}</div></div>
  </div>
</div>

<div class="layout">
  <nav class="sidebar">
    <div class="toc-title">On this page</div>
    ${tocHtml}
  </nav>

  <article class="content">
    ${packIncludesSection(packFilters, 'summary') ? `
    <h2 id="exec-summary">Summary</h2>
    <p>${escHtml(discoverySummary)}</p>
    <div class="stat-row" style="margin-bottom:24px">
      <div class="stat-item"><div class="stat-label">${isUnfilteredPack ? 'Completed skills' : 'Skills in this pack'}</div><div style="font-size:18px;font-weight:700;color:#093B5F">${packFilteredSkillCount}${isUnfilteredPack ? ` of ${skills.length}` : ''}</div></div>
      <div class="stat-item"><div class="stat-label">${isUnfilteredPack ? 'Total artifacts' : 'Artifacts in this pack'}</div><div style="font-size:18px;font-weight:700;color:#093B5F">${packFilteredFileCount} files</div></div>
      ${systemsList.length > 0 && packIncludesSection(packFilters, 'connected-systems') ? `<div class="stat-item"><a href="#connected-systems" class="xref-link" style="text-decoration:none"><div class="stat-label">Systems</div><div style="font-size:18px;font-weight:700;color:#093B5F">${systemsList.length}</div></a></div>` : ''}
      ${packIncludesSection(packFilters, 'decisions') ? `<div class="stat-item"><a href="#decisions" class="xref-link" style="text-decoration:none"><div class="stat-label">Decisions</div><div style="font-size:18px;font-weight:700;color:#093B5F">${packFilteredDecisions.length}</div></a></div>` : ''}
      ${packIncludesSection(packFilters, 'findings') ? `<div class="stat-item"><a href="#findings" class="xref-link" style="text-decoration:none"><div class="stat-label">Review findings</div><div style="font-size:18px;font-weight:700;color:#093B5F">${packFilteredFindings.length}</div></a></div>` : ''}
      ${openItems.length > 0 && packIncludesSection(packFilters, 'open-items') ? `<div class="stat-item"><a href="#open-items" class="xref-link" style="text-decoration:none"><div class="stat-label">Open items</div><div style="font-size:18px;font-weight:700;color:#093B5F">${openCount}</div></a></div>` : ''}
    </div>` : ''}

    ${packIncludesSection(packFilters, 'scope') && (rptSystemsList.length > 0 || Object.keys(rptInputs.goals).length > 0) ? (() => {
      const rReq = [['Delivery guarantee',rptInputs.requirements['Delivery guarantee']],['Ordering',rptInputs.requirements['Ordering']],['Latency target',rptInputs.requirements['Latency target']],['Scale',rptInputs.requirements['Scale']],['Topology',rptInputs.requirements['Topology']],['Processing guarantee',rptInputs.requirements['Processing guarantee']],['Data residency',rptInputs.requirements['Data residency']]].filter(([,v])=>v);
      const rGoal = [['Project type',rptInputs.goals['Project type']],['Driver',rptInputs.goals['Driver']],['Timeline',rptInputs.goals['Timeline']],['Budget',rptInputs.goals['Budget']],['Team',rptInputs.goals['Team']],['Constraints',rptInputs.goals['Constraints']]].filter(([,v])=>v);
      const roleClass = (r) => { const rl = (r||'').toLowerCase(); if (/both|producer.*consumer|consumer.*producer/.test(rl)) return 'role-both'; if (/producer/.test(rl)) return 'role-producer'; return 'role-consumer'; };
      const fmtEvt = (e) => { const m = e.match(/^(.+?)\s*\(([^)]+)\)\s*$/); return m ? `<span class="scope-event-name">${escHtml(m[1])}</span><span class="scope-event-rate">${escHtml(m[2])}</span>` : escHtml(e); };
      return `<h2 id="scope-inputs" style="margin-top:28px">Scope & Inputs</h2>
      <p style="color:#5A7A94;font-size:13px;margin-bottom:12px">Key inputs from discovery that drive downstream architecture decisions.</p>
      <div class="scope-grid">
        ${rptSystemsList.length > 0 ? `<div class="scope-card scope-card-wide"><div class="scope-card-header"><span class="scope-icon">&#9881;</span>Connected Systems<span class="scope-count">${rptSystemsList.length} systems</span></div><div class="scope-card-body"><div class="scope-systems-grid">${rptSystemsList.map(s=>`<div class="scope-system"><span class="scope-sys-name">${escHtml(s.name)}</span>${s.role?`<span class="scope-sys-role ${roleClass(s.role)}">${escHtml(s.role)}</span>`:''}</div>`).join('')}</div></div></div>` : ''}
        ${rptInputs.messaging||rptInputs.protocols ? `<div class="scope-card scope-landscape"><div class="scope-card-header"><span class="scope-icon">&#9783;</span>Current Landscape</div><div class="scope-card-body">${rptInputs.messaging?`<div class="scope-field"><span class="scope-field-label">Existing messaging</span><span class="scope-field-value">${escHtml(rptInputs.messaging)}</span></div>`:'' }${rptInputs.protocols?`<div class="scope-field"><span class="scope-field-label">Protocols</span><span class="scope-field-value">${escHtml(rptInputs.protocols)}</span></div>`:'' }${rptInputs.refArch?`<div class="scope-field"><span class="scope-field-label">Reference architecture</span><span class="scope-field-value">${escHtml(rptInputs.refArch)}</span></div>`:'' }</div></div>` : ''}
        ${rptInputs.eventTypes.length > 0 ? `<div class="scope-card scope-events"><div class="scope-card-header"><span class="scope-icon">&#9889;</span>Event Types<span class="scope-count">${rptInputs.eventTypes.length} types</span></div><div class="scope-card-body"><div class="scope-events-grid">${rptInputs.eventTypes.map(e=>`<div class="scope-event">${fmtEvt(e)}</div>`).join('')}</div></div></div>` : ''}
        ${rReq.length > 0 ? `<div class="scope-card scope-requirements"><div class="scope-card-header"><span class="scope-icon">&#9745;</span>Requirements</div><div class="scope-card-body">${rReq.map(([k,v])=>`<div class="scope-field"><span class="scope-field-label">${escHtml(k)}</span><span class="scope-field-value">${escHtml(v)}</span></div>`).join('')}</div></div>` : ''}
        ${rGoal.length > 0 ? `<div class="scope-card scope-goals"><div class="scope-card-header"><span class="scope-icon">&#9873;</span>Goals & Constraints</div><div class="scope-card-body">${rGoal.map(([k,v])=>`<div class="scope-field"><span class="scope-field-label">${escHtml(k)}</span><span class="scope-field-value">${escHtml(v)}</span></div>`).join('')}</div></div>` : ''}
      </div>`;
    })() : ''}

    ${(() => {
      // Auto-narrative consumes only pack-filtered decisions/findings so that
      // restricted packs (e.g. Executive) don't leak technical detail.
      const decs = packFilteredDecisions;
      const findings = packFilteredFindings;
      const dec = (name) => { const d = decs.find(x => (x.id || x.decision) === name); return d ? (d.label || d.value || d.choice || '') : ''; };
      const hasDec = (name) => decs.some(x => (x.id || x.decision) === name);

      const brokerType = dec('broker-type');
      const serviceClass = dec('service-class-prod');
      const topology = dec('topology');
      const topicStructure = dec('topic-structure');
      const topicCount = dec('topic-count');
      const queueCount = dec('queue-count');
      const deliveryMode = dec('delivery-mode-split');
      const dmrPattern = dec('dmr-pattern');
      const hubRegion = dec('hub-region');
      const linkCount = dec('link-count');
      const haApproach = dec('ha-approach');
      const drMode = dec('dr-replication-mode');
      const drTopology = dec('dr-topology');
      const drScope = dec('dr-scope');
      const customMi = dec('custom-mi-count');

      const protocols = decs
        .filter(d => (d.id || d.decision || '').endsWith('-protocol'))
        .map(d => ({ name: (d.id || d.decision).replace(/-protocol$/, '').replace(/-/g, ' '), value: d.label || d.value || d.choice }));

      const importantFindings = findings.filter(f => (f.severity || '').toLowerCase() === 'important').length;
      const advisoryFindings = findings.filter(f => (f.severity || '').toLowerCase() === 'advisory').length;
      const appliedFindings = findings.filter(f => (f.action || '').toLowerCase() === 'applied').length;

      const decLink = (val) => val ? xref(escHtml(val), 'decisions') : '';

      let html = '<h3>Recommended Architecture</h3>';

      if (brokerType || topology) {
        html += '<p><strong>Platform:</strong> ';
        html += [brokerType ? decLink(brokerType) : '', serviceClass ? decLink(serviceClass + ' service class') : ''].filter(Boolean).join(', ') + '. ';
        if (topology) html += decLink(topology) + '. ';
        html += '</p>';
      }

      if (topicStructure || topicCount) {
        html += '<p><strong>Topic design:</strong> ';
        if (topicStructure) html += '<code>' + decLink(topicStructure) + '</code>. ';
        if (topicCount) html += decLink(topicCount) + '. ';
        if (queueCount) html += decLink(queueCount) + '. ';
        html += '</p>';
      }

      if (deliveryMode) {
        html += '<p><strong>Delivery modes:</strong> ' + decLink(deliveryMode) + '</p>';
      }

      if (dmrPattern || linkCount) {
        html += '<p><strong>Event mesh:</strong> ';
        if (dmrPattern) html += decLink(dmrPattern) + '. ';
        if (hubRegion) html += 'Hub: ' + decLink(hubRegion) + '. ';
        if (linkCount) html += decLink(linkCount) + '. ';
        html += '</p>';
      }

      if (haApproach || drMode) {
        html += '<p><strong>HA/DR:</strong> ';
        if (haApproach) html += decLink(haApproach) + '. ';
        if (drTopology) html += decLink(drTopology) + '. ';
        if (drMode) html += decLink(drMode) + '. ';
        if (drScope) html += decLink(drScope) + '. ';
        html += '</p>';
      }

      if (protocols.length > 0) {
        html += '<h3>Protocol Stack</h3><table><thead><tr><th>Connection</th><th>Protocol</th></tr></thead><tbody>';
        html += protocols.map(p => '<tr><td style="font-weight:600;text-transform:capitalize">' + escHtml(p.name) + '</td><td>' + decLink(p.value) + '</td></tr>').join('');
        html += '</tbody></table>';
      }

      if (hasDec('ibm-mq-mi') || hasDec('custom-mi-count')) {
        html += '<h3>Integration</h3><ul>';
        if (hasDec('ibm-mq-mi')) html += '<li>' + decLink(dec('ibm-mq-mi')) + '</li>';
        if (customMi) html += '<li>' + decLink(customMi) + '</li>';
        html += '</ul>';
      }

      if (findings.length > 0) {
        const uniqueSources = [...new Set(findings.map(f => f.source))];
        const sourceLinks = uniqueSources.map(s => skillLink(s)).join(', ');
        html += '<h3>Review Outcomes</h3>';
        html += '<p>' + xref(findings.length + ' findings', 'findings') + ' across ' +
          uniqueSources.length + ' reviews (' + sourceLinks + '): ' +
          importantFindings + ' important, ' + advisoryFindings + ' advisory. ' +
          appliedFindings + ' of ' + findings.length + ' applied to the architecture.</p>';
      }

      html += '<h3>Engagement Summary</h3>';
      html += '<table><thead><tr><th>Skill</th><th>Status</th><th>Execution</th><th>Artifacts</th></tr></thead><tbody>';
      // Pack-filtered: only include skills that have at least one artifact passing the pack filter,
      // so restricted packs (Executive, Security, etc.) don't enumerate hidden skills.
      html += skills.filter(s => s.skill !== 'solace-plan' && packFilteredSkillIds.has(s.skill)).map(s => {
        const grp = SKILL_TO_GROUP[s.skill];
        const nameHtml = grp ? xref('<span style="font-weight:600">' + (SKILL_LABELS[s.skill]||s.skill) + '</span>', 'grp-' + grp) : '<span style="font-weight:600">' + (SKILL_LABELS[s.skill]||s.skill) + '</span>';
        const artCount = s.artifacts?.length || 0;
        const artHtml = grp && artCount > 0 ? xref(artCount + ' files', 'grp-' + grp) : artCount + ' files';
        return '<tr><td>' + nameHtml + '</td>' +
        '<td>' + (s.status === 'complete' ? '<span style="color:#00C895;font-weight:600">Complete</span>' : s.status) + '</td>' +
        '<td>' + (s.timing ? fmtTime(s.timing.execution_sec) : '--') + '</td>' +
        '<td>' + artHtml + '</td></tr>';
      }).join('');
      html += '</tbody></table>';

      return html;
    })()}

    ${packIncludesSection(packFilters, 'decisions') ? `
    <h2 id="decisions">Decisions</h2>
    <table><thead><tr><th>Decision</th><th>Skill</th><th>Value</th><th>Rationale</th></tr></thead><tbody>${packFilteredDecisions.map(d =>
      `<tr><td>${escHtml(d.id||d.decision||'')}</td><td>${skillLink(d.skill)}</td><td>${escHtml(d.label||d.value||d.choice||'')}</td><td>${escHtml(d.question||d.rationale||'')}</td></tr>`
    ).join('') || '<tr><td colspan="4" style="color:#9ca3af;text-align:center">No decisions recorded</td></tr>'}</tbody></table>` : ''}

    ${packIncludesSection(packFilters, 'findings') && findingRows ? `<h2 id="findings">Review Findings</h2>
    <table><thead><tr><th>Source</th><th>Severity</th><th>Decision</th><th>Status</th></tr></thead><tbody>${findingRows}</tbody></table>` : ''}

    ${(() => {
      if (openItems.length === 0) return '';
      if (!packIncludesSection(packFilters, 'open-items')) return '';
      const sevColor = { blocking: '#DC2626', high: '#EA580C', medium: '#5A7A94', advisory: '#00C895' };
      const stColor = { open: '#DC2626', 'in-progress': '#EA580C', resolved: '#00C895' };
      const bySev = {};
      openItems.forEach(i => { const s = (i.severity||'advisory').toLowerCase(); bySev[s] = (bySev[s]||0) + 1; });
      return `
    <h2 id="open-items">Open Items</h2>
    <p style="margin-bottom:16px">${openCount} of ${openItems.length} items remain open or in progress.</p>
    <div style="display:flex;gap:16px;margin-bottom:20px;flex-wrap:wrap">
      ${['blocking','high','medium','advisory'].filter(s => bySev[s]).map(s =>
        `<span style="display:inline-block;padding:4px 12px;border-radius:6px;font-size:12px;font-weight:700;font-family:'Space Mono',monospace;text-transform:uppercase;background:${sevColor[s]}15;color:${sevColor[s]};border:1px solid ${sevColor[s]}30">${bySev[s]} ${s}</span>`
      ).join('')}
    </div>
    <table>
      <thead><tr><th style="width:60px">ID</th><th style="width:70px">Severity</th><th>Description</th><th style="width:100px">Source</th><th>Resolution Path</th><th style="width:80px">Status</th></tr></thead>
      <tbody>${openItems.map(item => {
        const sev = (item.severity||'advisory').toLowerCase();
        const st = (item.status||'open').toLowerCase();
        return `<tr>
          <td style="font-weight:700;color:#093B5F;white-space:nowrap">${escHtml(item.id)}</td>
          <td><span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;font-family:'Space Mono',monospace;text-transform:uppercase;background:${sevColor[sev]}15;color:${sevColor[sev]}">${sev}</span></td>
          <td>${escHtml(item.description)}</td>
          <td style="font-size:12px">${skillLink(item.source)}</td>
          <td style="font-size:12px;color:#4B5563">${escHtml(item.resolution||'')}${item.source_ref ? ' ' + artRefLink(item.source_ref) : ''}</td>
          <td><span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;font-family:'Space Mono',monospace;text-transform:uppercase;background:${stColor[st]||stColor.open}15;color:${stColor[st]||stColor.open}">${st}</span></td>
        </tr>`;
      }).join('')}</tbody>
    </table>`;
    })()}

    ${systemsList.length > 0 && packIncludesSection(packFilters, 'connected-systems') ? `
    <h2 id="connected-systems">Connected Systems (${systemsList.length})</h2>
    <table class="systems-table">
      <thead><tr><th>System</th><th>Role</th><th>Description</th></tr></thead>
      <tbody>${systemsList.map(s => `<tr><td style="font-weight:600;color:#093B5F;white-space:nowrap">${escHtml(s.name)}</td><td style="font-size:12px;font-family:'Space Mono',monospace;color:#5A7A94">${escHtml(s.role)}</td><td style="font-size:13px">${escHtml(s.description)}</td></tr>`).join('')}</tbody>
    </table>` : ''}

    ${packIncludesSection(packFilters, 'artifacts') ? (() => {
      const output = [];

      for (let i = 0; i < sections.length; i++) {
        const s = sections[i];
        const nextIsNewGroup = sections[i+1]?.isNewGroup;
        const closeDiv = nextIsNewGroup || i === sections.length - 1 ? '</div>' : '';

        const artWrap = '<div id="' + artId(s.file) + '" class="art-section">' + s.html + '</div>';
        if (s.isNewGroup) {
          const openTag = i === 0
            ? '<div class="grp-section" id="grp-' + s.group + '">'
            : '<div class="grp-section grp-break" id="grp-' + s.group + '">';
          output.push(openTag + '\n      <div class="grp-marker">' + escHtml(grpLabel(s.group)) + '</div>\n      ' + artWrap + closeDiv);
        } else {
          output.push('<hr class="section-sep">' + artWrap + closeDiv);
        }
      }

      return output.join('\n    ');
    })() : ''}

    <div class="report-footer">Generated by Solace Architect (${escHtml(packLabel)}) on ${new Date().toLocaleDateString()}</div>
  </article>
</div>

<script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"><\/script>
<script src="https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js"><\/script>
<script>
mermaid.initialize({startOnLoad:true,theme:'base',themeVariables:{
  primaryColor:'#e8f4f8',primaryTextColor:'#093B5F',primaryBorderColor:'#093B5F',
  lineColor:'#5A7A94',secondaryColor:'#f0fdf9',tertiaryColor:'#f8fafc',
  edgeLabelBackground:'#ffffff',clusterBkg:'#f8fafc',clusterBorder:'#d1d5db',
  fontFamily:'Figtree,sans-serif',fontSize:'13px',
  nodeBorder:'#093B5F',mainBkg:'#e8f4f8',
  actorBkg:'#e8f4f8',actorBorder:'#093B5F',actorTextColor:'#093B5F',
  signalColor:'#5A7A94',signalTextColor:'#093B5F'
},flowchart:{curve:'basis',padding:16},sequence:{mirrorActors:false}});
document.addEventListener('scroll',function(){
  var links=document.querySelectorAll('.sidebar a');
  var sects=[];
  links.forEach(function(a){var t=document.getElementById(a.getAttribute('href').slice(1));if(t)sects.push({el:t,link:a})});
  var current=null;
  sects.forEach(function(s){if(s.el.getBoundingClientRect().top<=80)current=s});
  links.forEach(function(a){a.classList.remove('active')});
  if(current)current.link.classList.add('active');
});
document.getElementById('dlBtn').addEventListener('click',function(){
  var html=document.documentElement.outerHTML;
  var blob=new Blob([html],{type:'text/html'});
  var a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='${state.current.slug}-${packId}.html';
  a.click();
  URL.revokeObjectURL(a.href);
});
(function(){
  var overlay=document.createElement('div');
  overlay.className='diagram-zoom-overlay';
  overlay.innerHTML='<div class="diagram-zoom-toolbar"><span class="zoom-title">Diagram Viewer</span><div class="zoom-actions"><button id="rzOut">\\u2212</button><span class="zoom-level" id="rzLvl">100%</span><button id="rzIn">+</button><button id="rzFit">Fit</button><button id="rzRst">1:1</button><button class="zoom-close" id="rzX">\\u00d7</button></div></div><div class="diagram-zoom-viewport" id="rzVp"><div class="diagram-zoom-content" id="rzC"></div></div>';
  document.body.appendChild(overlay);
  var s=1,px=0,py=0,drag=false,sx=0,sy=0,nw=0,nh=0;
  var c=document.getElementById('rzC'),vp=document.getElementById('rzVp'),lvl=document.getElementById('rzLvl');
  function upd(){c.style.transform='scale('+s+') translate('+px+'px,'+py+'px)';lvl.textContent=Math.round(s*100)+'%'}
  function fit(){if(!nw||!nh)return;var vw=vp.clientWidth-80,vh=vp.clientHeight-80;s=Math.min(vw/nw,vh/nh,3);px=0;py=0;upd()}
  function opn(svgEl){var rect=svgEl.getBoundingClientRect();var cl=svgEl.cloneNode(true);cl.setAttribute('width',rect.width);cl.setAttribute('height',rect.height);cl.style.maxWidth='none';cl.style.width=rect.width+'px';cl.style.height=rect.height+'px';c.innerHTML='';c.appendChild(cl);overlay.classList.add('open');requestAnimationFrame(function(){s=1;px=0;py=0;c.style.transform='scale(1)';requestAnimationFrame(function(){nw=c.scrollWidth;nh=c.scrollHeight;fit()})})}
  function close(){overlay.classList.remove('open');c.innerHTML=''}
  document.getElementById('rzIn').onclick=function(){s=Math.min(s*1.3,8);upd()};
  document.getElementById('rzOut').onclick=function(){s=Math.max(s/1.3,0.1);upd()};
  document.getElementById('rzFit').onclick=fit;
  document.getElementById('rzRst').onclick=function(){s=1;px=0;py=0;upd()};
  document.getElementById('rzX').onclick=close;
  overlay.onclick=function(e){if(e.target===overlay||e.target===vp)close()};
  document.addEventListener('keydown',function(e){if(!overlay.classList.contains('open'))return;if(e.key==='Escape')close();if(e.key==='+'||e.key==='='){s=Math.min(s*1.3,8);upd()}if(e.key==='-'){s=Math.max(s/1.3,0.1);upd()}if(e.key==='0')fit()});
  vp.addEventListener('wheel',function(e){e.preventDefault();var f=e.deltaY<0?1.15:1/1.15;s=Math.min(Math.max(s*f,0.1),8);upd()},{passive:false});
  vp.onmousedown=function(e){if(e.button!==0)return;drag=true;sx=e.clientX-px*s;sy=e.clientY-py*s;e.preventDefault()};
  window.onmousemove=function(e){if(!drag)return;px=(e.clientX-sx)/s;py=(e.clientY-sy)/s;upd()};
  window.onmouseup=function(){drag=false};
  document.addEventListener('click',function(e){var m=e.target.closest('.mermaid');if(!m||overlay.classList.contains('open'))return;var svg=m.querySelector('svg');if(svg)opn(svg)});
})();
(function(){
  var inputs=document.querySelectorAll('.roi-input');
  if(!inputs.length)return;
  function fmt(n){return '$'+(n||0).toLocaleString('en-US',{maximumFractionDigits:0})}
  function cls(el,n){el.className=el.className.replace(/roi-positive|roi-negative/g,'').trim()+' '+(n>=0?'roi-positive':'roi-negative')}
  var baseNet=0,baseImpl=0,basePay=0,baseP=0,baseV=0,baseUpgr=0;
  var userOverrides={};
  var autoInputs=document.querySelectorAll('.roi-input[data-auto-from]');
  autoInputs.forEach(function(inp){
    inp.addEventListener('input',function(){userOverrides[inp.dataset.id]=true;inp.classList.remove('roi-auto-filled');var h=document.querySelector('.roi-auto-hint[data-hint-for="'+inp.dataset.id+'"]');if(h)h.classList.add('roi-overridden')});
    inp.addEventListener('dblclick',function(){delete userOverrides[inp.dataset.id];inp.classList.remove('roi-auto-filled');var h=document.querySelector('.roi-auto-hint[data-hint-for="'+inp.dataset.id+'"]');if(h)h.classList.remove('roi-overridden');update()});
  });
  function autoFillV(){
    autoInputs.forEach(function(inp){
      if(userOverrides[inp.dataset.id])return;
      var src=document.querySelector('.roi-input[data-id="'+inp.dataset.autoFrom+'"]');
      if(!src)return;
      var srcVal=parseFloat(src.value)||0;
      var pct=parseInt(inp.dataset.autoPct)||0;
      var computed=Math.round(srcVal*pct/100);
      if(computed>0){inp.value=computed;inp.classList.add('roi-auto-filled')}
      else{inp.value='';inp.classList.remove('roi-auto-filled')}
    });
  }
  function update(){
    autoFillV();
    var g={c:0,p:0,v:0};
    var p2raw=0;
    inputs.forEach(function(inp){
      var k=inp.dataset.group;var val=parseFloat(inp.value)||0;
      if(inp.dataset.id==='P2'){p2raw=val;g[k]=(g[k]||0)+Math.round(val/3)}
      else{g[k]=(g[k]||0)+val}
    });
    document.querySelectorAll('.roi-sum').forEach(function(el){el.textContent=fmt(g[el.dataset.sum]||0)});
    var net=g.v-g.p;
    var p5=document.querySelector('.roi-input[data-id="P5"]');
    var impl=p2raw;
    var upgr=p5?(parseFloat(p5.value)||0):0;
    baseNet=net;baseImpl=impl;baseP=g.p;baseV=g.v;baseUpgr=upgr;
    basePay=(net>0&&impl>0)?Math.ceil(impl/net*12):0;
    var netEl=document.getElementById('roi-net');
    if(netEl){netEl.textContent=fmt(net);cls(netEl,net)}
    var implEl=document.getElementById('roi-impl');
    if(implEl)implEl.textContent=fmt(impl);
    var payEl=document.getElementById('roi-payback');
    if(payEl)payEl.textContent=basePay?basePay+' months':'--';
    var y3=document.getElementById('roi-3yr');
    if(y3){var v3=net*3-impl;y3.textContent=fmt(v3);cls(y3,v3)}
    var y5=document.getElementById('roi-5yr');
    if(y5){var v5=net*5-impl-upgr;y5.textContent=fmt(v5);cls(y5,v5)}
    var pct=document.getElementById('roi-pct');
    if(pct)pct.textContent=g.p>0?Math.round(net/g.p*100)+'%':'--';
    updateSens();
  }
  function updateSens(){
    var sL=document.getElementById('sens-license');
    var sV=document.getElementById('sens-value');
    var sI=document.getElementById('sens-impl');
    var sT=document.getElementById('sens-timeline');
    var sP=document.getElementById('sens-phase');
    if(!sL||!sV||!sI)return;
    var lPct=parseInt(sL.value)||0;
    var vPct=parseInt(sV.value)||0;
    var iPct=parseInt(sI.value)||0;
    var tMo=sT?parseInt(sT.value)||0:0;
    var pMax=sP?parseInt(sP.max)||12:12;
    var pSys=sP?parseInt(sP.value)||pMax:pMax;
    document.getElementById('sens-license-val').textContent=(lPct>=0?'+':'')+lPct+'%';
    document.getElementById('sens-value-val').textContent=(vPct>=0?'+':'')+vPct+'%';
    document.getElementById('sens-impl-val').textContent='+'+iPct+'%';
    if(sT){var tvEl=document.getElementById('sens-timeline-val');if(tvEl)tvEl.textContent=tMo+' mo'}
    if(sP){var pvEl=document.getElementById('sens-phase-val');if(pvEl)pvEl.textContent=pSys}

    var p1=document.querySelector('.roi-input[data-id="P1"]');
    var p1v=p1?(parseFloat(p1.value)||0):0;

    var licDelta=p1v*(lPct/100);
    var adjNetL=baseNet-licDelta;
    var adjPayL=(adjNetL>0&&baseImpl>0)?Math.ceil(baseImpl/adjNetL*12):0;
    var lNetEl=document.getElementById('sens-license-net');
    var lPayEl=document.getElementById('sens-license-pay');
    if(lNetEl){lNetEl.textContent=fmt(adjNetL);lNetEl.style.color=adjNetL>=0?'#00C895':'#DC2626'}
    if(lPayEl){var diff=adjPayL-basePay;lPayEl.textContent=adjPayL?(diff>=0?'+':'')+diff+' months':'--';lPayEl.style.color=diff>0?'#DC2626':diff<0?'#00C895':'#093B5F'}

    var adjNetV=baseV*(1+vPct/100)-baseP;
    var adjPayV=(adjNetV>0&&baseImpl>0)?Math.ceil(baseImpl/adjNetV*12):0;
    var vNetEl=document.getElementById('sens-value-net');
    var vPayEl=document.getElementById('sens-value-pay');
    if(vNetEl){vNetEl.textContent=fmt(adjNetV);vNetEl.style.color=adjNetV>=0?'#00C895':'#DC2626'}
    if(vPayEl){var diff2=adjPayV-basePay;vPayEl.textContent=adjPayV?(diff2>=0?'+':'')+diff2+' months':'--';vPayEl.style.color=diff2>0?'#DC2626':diff2<0?'#00C895':'#093B5F'}

    var adjImpl=baseImpl*(1+iPct/100);
    var adjPayI=(baseNet>0&&adjImpl>0)?Math.ceil(adjImpl/baseNet*12):0;
    var adj3yr=baseNet*3-adjImpl;
    var iPayEl=document.getElementById('sens-impl-pay');
    var i3yrEl=document.getElementById('sens-impl-3yr');
    if(iPayEl){iPayEl.textContent=adjPayI?adjPayI+' months':'--'}
    if(i3yrEl){i3yrEl.textContent=fmt(adj3yr);i3yrEl.style.color=adj3yr>=0?'#00C895':'#DC2626'}

    var monthlyCost=baseImpl>0?baseImpl/4:0;
    var timelineCost=monthlyCost*tMo;
    var tcEl=document.getElementById('sens-timeline-cost');
    var tdEl=document.getElementById('sens-timeline-delay');
    if(tcEl){tcEl.textContent=tMo>0?fmt(timelineCost):'--';tcEl.style.color=tMo>0?'#DC2626':'#093B5F'}
    if(tdEl){tdEl.textContent=tMo>0?'Value starts '+tMo+' months later':'--'}

    var pRatio=pSys/pMax;
    var phaseNet=baseV*pRatio-baseP*pRatio;
    var phaseImpl=baseImpl*pRatio;
    var phasePay=(phaseNet>0&&phaseImpl>0)?Math.ceil(phaseImpl/phaseNet*12):0;
    var pnEl=document.getElementById('sens-phase-net');
    var ppEl=document.getElementById('sens-phase-pay');
    if(pnEl){pnEl.textContent=pSys<pMax?fmt(phaseNet):'--';pnEl.style.color=phaseNet>=0?'#00C895':'#DC2626'}
    if(ppEl){ppEl.textContent=pSys<pMax&&phasePay?phasePay+' months':'--'}

    var cP1=p1v*(1+lPct/100);
    var cP=baseP-p1v+cP1;
    var cV=baseV*(1+vPct/100);
    var cImpl=baseImpl*(1+iPct/100)+timelineCost;
    var cNet=cV*pRatio-cP*pRatio;
    var cPay=(cNet>0&&cImpl>0)?Math.ceil(cImpl/cNet*12):0;
    var c3yr=cNet*3-cImpl;
    var c5yr=cNet*5-cImpl-baseUpgr;
    var cPct=cP*pRatio>0?Math.round(cNet/(cP*pRatio)*100):0;

    var anyActive=lPct||vPct||iPct||tMo||(pSys<pMax);

    function setCombo(id,val,fmtFn,isInverse){
      var el=document.getElementById('sens-combined-'+id);
      var dEl=document.getElementById('sens-combined-'+id+'-delta');
      if(!el)return;
      el.textContent=anyActive?fmtFn(val):'--';
      if(!isInverse&&typeof val==='number')el.style.color=val>=0?'#00C895':'#DC2626';
      else if(isInverse)el.style.color='#093B5F';
      if(!dEl)return;
      dEl.className='roi-combined-delta';
      if(!anyActive){dEl.textContent='';return}
      var orig=id==='net'?baseNet:id==='impl'?baseImpl:id==='pay'?basePay:id==='3yr'?(baseNet*3-baseImpl):id==='5yr'?(baseNet*5-baseImpl-baseUpgr):id==='pct'?(baseP>0?Math.round(baseNet/baseP*100):0):0;
      var diff=val-orig;
      var good,neutral=false;
      if(id==='pay'){
        if(diff===0){neutral=true}
        else{good=diff<0;dEl.textContent=(diff>0?'▲ +':'▼ ')+Math.abs(diff)+' mo'}
      }else if(id==='pct'){
        if(diff===0){neutral=true}
        else{good=diff>0;dEl.textContent=(diff>0?'▲ +':'▼ ')+diff+'pp'}
      }else{
        if(Math.abs(diff)<0.5){neutral=true}
        else{good=isInverse?(diff<0):(diff>0);dEl.textContent=(diff>0?'▲ +':'▼ ')+fmt(Math.abs(diff))}
      }
      if(neutral){dEl.textContent='no change';dEl.classList.add('delta-neutral');dEl.style.color='#5A7A94'}
      else{dEl.classList.add(good?'delta-positive':'delta-negative');dEl.style.color=good?'#00C895':'#DC2626'}
    }
    setCombo('net',cNet,fmt,false);
    setCombo('impl',cImpl,fmt,true);
    setCombo('pay',cPay,function(v){return v?v+' months':'--'},true);
    setCombo('3yr',c3yr,fmt,false);
    setCombo('5yr',c5yr,fmt,false);
    setCombo('pct',cPct,function(v){return v?v+'%':'--'},false);
  }
  inputs.forEach(function(inp){inp.addEventListener('input',update)});
  var sliders=document.querySelectorAll('.roi-slider');
  sliders.forEach(function(sl){sl.addEventListener('input',updateSens)});
  var resetBtn=document.getElementById('sens-reset-btn');
  if(resetBtn)resetBtn.addEventListener('click',function(){
    sliders.forEach(function(sl){sl.value=sl.defaultValue});
    updateSens();
  });
  var btn=document.getElementById('roi-excel-btn');
  if(btn)btn.addEventListener('click',function(){
    if(typeof XLSX==='undefined'){alert('Excel library not loaded. Check internet connection.');return}
    var title=document.querySelector('.page-header h1');
    var name=title?title.textContent:'ROI Framework';
    var rows=[
      [name+' - ROI Discussion Guide'],
      [],
      ['COST OF CURRENT STATE (Annual)'],
      ['#','Category','Estimate ($)','Architecture Basis']
    ];
    var cStart=5,cCount=0;
    document.querySelectorAll('.roi-input[data-group="c"]').forEach(function(inp){
      var tr=inp.closest('tr');var tds=tr.querySelectorAll('td');
      rows.push([tds[0].textContent,tds[1].textContent,parseFloat(inp.value)||0,tds[3].textContent]);
      cCount++;
    });
    rows.push(['','Total current state cost',{t:'n',f:'SUM(C'+cStart+':C'+(cStart+cCount-1)+')'},'']);
    rows.push([]);
    rows.push(['COST OF NEW PLATFORM (Annual)']);
    rows.push(['#','Category','Estimate ($)','Architecture Basis']);
    var pStart=rows.length+1,pCount=0;
    document.querySelectorAll('.roi-input[data-group="p"]').forEach(function(inp){
      var tr=inp.closest('tr');var tds=tr.querySelectorAll('td');
      rows.push([tds[0].textContent,tds[1].textContent,parseFloat(inp.value)||0,tds[3].textContent]);
      pCount++;
    });
    var pTotalRow=rows.length+1;
    rows.push(['','Total new platform cost',{t:'n',f:'SUM(C'+pStart+':C'+(pStart+pCount-1)+')'},'']);
    rows.push([]);
    rows.push(['VALUE DELIVERED (Annual)']);
    rows.push(['#','Category','Estimate ($)','Architecture Basis']);
    var vStart=rows.length+1,vCount=0;
    document.querySelectorAll('.roi-input[data-group="v"]').forEach(function(inp){
      var tr=inp.closest('tr');var tds=tr.querySelectorAll('td');
      rows.push([tds[0].textContent,tds[1].textContent,parseFloat(inp.value)||0,tds[3].textContent]);
      vCount++;
    });
    var vTotalRow=rows.length+1;
    rows.push(['','Total annual value',{t:'n',f:'SUM(C'+vStart+':C'+(vStart+vCount-1)+')'},'']);
    rows.push([]);
    rows.push(['ROI SUMMARY']);
    rows.push(['Metric','Formula','Value']);
    var netRow=rows.length+1;
    rows.push(['Net annual benefit','Value - Platform',{t:'n',f:'C'+vTotalRow+'-C'+pTotalRow}]);
    var p2Row=pStart,p5Row=pStart;
    for(var ri=pStart;ri<pStart+pCount;ri++){var cell=rows[ri-1];if(cell&&cell[0]==='P2')p2Row=ri;if(cell&&cell[0]==='P5')p5Row=ri}
    rows.push(['Implementation cost (one-time)','P2 (one-time)',{t:'n',f:'C'+p2Row}]);
    var implRow=netRow+1;
    rows.push(['Payback period (months)','Impl / Net x 12',{t:'n',f:'IF(C'+netRow+'>0,C'+implRow+'/C'+netRow+'*12,0)'}]);
    rows.push(['3-year net value','(Net x 3) - Impl',{t:'n',f:'C'+netRow+'*3-C'+implRow}]);
    rows.push(['5-year net value','(Net x 5) - Impl - Upgrade',{t:'n',f:'C'+netRow+'*5-C'+implRow+'-C'+p5Row}]);
    rows.push(['ROI percentage','Net / Platform x 100',{t:'n',f:'IF(C'+pTotalRow+'>0,C'+netRow+'/C'+pTotalRow+'*100,0)'}]);
    rows.push([]);
    rows.push(['SENSITIVITY SCENARIOS']);
    rows.push(['Scenario','Adjusted Value']);
    var sL=document.getElementById('sens-license');
    var sV=document.getElementById('sens-value');
    var sI=document.getElementById('sens-impl');
    if(sL&&parseInt(sL.value))rows.push(['Platform licensing '+(parseInt(sL.value)>0?'+':'')+sL.value+'%',document.getElementById('sens-license-net').textContent+' net benefit']);
    if(sV&&parseInt(sV.value))rows.push(['Value delivered '+(parseInt(sV.value)>0?'+':'')+sV.value+'%',document.getElementById('sens-value-net').textContent+' net benefit']);
    if(sI&&parseInt(sI.value))rows.push(['Implementation overrun +'+sI.value+'%',document.getElementById('sens-impl-pay').textContent+' payback']);
    var sT=document.getElementById('sens-timeline');
    var sP=document.getElementById('sens-phase');
    if(sT&&parseInt(sT.value))rows.push(['Timeline delay +'+sT.value+' months',document.getElementById('sens-timeline-cost').textContent+' added cost']);
    if(sP&&parseInt(sP.value)<parseInt(sP.max))rows.push(['Phased adoption: '+sP.value+' of '+sP.max+' systems',document.getElementById('sens-phase-net').textContent+' year 1 net']);
    var cn=document.getElementById('sens-combined-net');
    if(cn&&cn.textContent!=='--')rows.push([]);rows.push(['COMBINED SCENARIO']);rows.push(['Metric','Value']);
    if(cn&&cn.textContent!=='--'){rows.push(['Combined net benefit',cn.textContent]);rows.push(['Combined impl cost',document.getElementById('sens-combined-impl').textContent]);rows.push(['Combined payback',document.getElementById('sens-combined-pay').textContent]);rows.push(['Combined 3-yr value',document.getElementById('sens-combined-3yr').textContent]);rows.push(['Combined 5-yr value',document.getElementById('sens-combined-5yr').textContent]);rows.push(['Combined ROI %',document.getElementById('sens-combined-pct').textContent])}
    rows.push([]);
    rows.push(['ARCHITECTURE INDICATORS']);
    rows.push(['Indicator','Value','Business Impact']);
    document.querySelectorAll('.roi-ind-card').forEach(function(card){
      var v=card.querySelector('.roi-ind-value');
      var l=card.querySelector('.roi-ind-label');
      var i=card.querySelector('.roi-ind-impact');
      if(v&&l)rows.push([l.textContent,v.textContent,i?i.textContent:'']);
    });
    var ws=XLSX.utils.aoa_to_sheet(rows);
    ws['!cols']=[{wch:8},{wch:36},{wch:18},{wch:50}];
    var wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,'ROI Framework');
    XLSX.writeFile(wb,'roi-framework.xlsx');
  });
  update();
})();
<\/script>
<script>
// Copy-to-clipboard handler for every embedded artifact in this report.
// Uses event delegation so it works regardless of how many artifacts the
// pack produced. Falls back to legacy execCommand for non-secure contexts.
(function(){
  document.addEventListener('click', function(e){
    var btn = e.target.closest && e.target.closest('.report-copy-btn');
    if (!btn) return;
    var targetId = btn.getAttribute('data-copy-target');
    if (!targetId) return;
    var ta = document.getElementById(targetId);
    if (!ta) return;
    var label = btn.querySelector('.report-copy-label');
    var done = function(ok){
      if (label) label.textContent = ok ? 'Copied' : 'Copy failed';
      btn.classList.toggle('is-copied', !!ok);
      setTimeout(function(){
        if (label) label.textContent = 'Copy';
        btn.classList.remove('is-copied');
      }, 1500);
    };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(ta.value).then(function(){ done(true); }, function(){ done(false); });
      } else {
        ta.style.position = 'fixed'; ta.style.left = '0'; ta.style.top = '0'; ta.style.opacity = '1';
        ta.select();
        var ok = document.execCommand('copy');
        ta.style.position = ''; ta.style.left = ''; ta.style.top = ''; ta.style.opacity = '';
        done(ok);
      }
    } catch (err) {
      done(false);
    }
  });
})();
<\/script>
</body></html>`;

  const blob = new Blob([reportHtml], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}

/* ─── DIAGRAM ZOOM MODAL ─── */

function initDiagramZoom() {
  const overlay = document.createElement('div');
  overlay.className = 'diagram-zoom-overlay';
  overlay.id = 'diagramZoomOverlay';
  overlay.innerHTML = `
    <div class="diagram-zoom-toolbar">
      <span class="zoom-title">Diagram Viewer</span>
      <div class="zoom-actions">
        <button id="zoomOut" title="Zoom out (-)">−</button>
        <span class="zoom-level" id="zoomLevel">100%</span>
        <button id="zoomIn" title="Zoom in (+)">+</button>
        <button id="zoomFit" title="Fit to screen">Fit</button>
        <button id="zoomReset" title="Reset to 100%">1:1</button>
        <button class="zoom-close" id="zoomClose" title="Close (Esc)">&times;</button>
      </div>
    </div>
    <div class="diagram-zoom-viewport" id="zoomViewport">
      <div class="diagram-zoom-content" id="zoomContent"></div>
    </div>`;
  document.body.appendChild(overlay);

  let scale = 1, panX = 0, panY = 0, dragging = false, startX = 0, startY = 0;
  let naturalW = 0, naturalH = 0;
  const content = document.getElementById('zoomContent');
  const viewport = document.getElementById('zoomViewport');
  const levelEl = document.getElementById('zoomLevel');

  function updateTransform() {
    content.style.transform = `scale(${scale}) translate(${panX}px, ${panY}px)`;
    levelEl.textContent = Math.round(scale * 100) + '%';
  }

  function fitToScreen() {
    if (!naturalW || !naturalH) return;
    const vw = viewport.clientWidth - 80;
    const vh = viewport.clientHeight - 80;
    scale = Math.min(vw / naturalW, vh / naturalH, 3);
    panX = 0;
    panY = 0;
    updateTransform();
  }

  function openZoom(svgEl) {
    const rect = svgEl.getBoundingClientRect();
    const clone = svgEl.cloneNode(true);
    clone.setAttribute('width', rect.width);
    clone.setAttribute('height', rect.height);
    clone.style.maxWidth = 'none';
    clone.style.width = rect.width + 'px';
    clone.style.height = rect.height + 'px';
    content.innerHTML = '';
    content.appendChild(clone);
    overlay.classList.add('open');

    requestAnimationFrame(() => {
      scale = 1; panX = 0; panY = 0;
      content.style.transform = 'scale(1)';
      requestAnimationFrame(() => {
        naturalW = content.scrollWidth;
        naturalH = content.scrollHeight;
        fitToScreen();
      });
    });
  }

  function closeZoom() {
    overlay.classList.remove('open');
    content.innerHTML = '';
  }

  document.getElementById('zoomIn').addEventListener('click', () => {
    scale = Math.min(scale * 1.3, 8);
    updateTransform();
  });
  document.getElementById('zoomOut').addEventListener('click', () => {
    scale = Math.max(scale / 1.3, 0.1);
    updateTransform();
  });
  document.getElementById('zoomFit').addEventListener('click', fitToScreen);
  document.getElementById('zoomReset').addEventListener('click', () => {
    scale = 1; panX = 0; panY = 0;
    updateTransform();
  });
  document.getElementById('zoomClose').addEventListener('click', closeZoom);

  overlay.addEventListener('click', e => {
    if (e.target === overlay || e.target === viewport) closeZoom();
  });

  document.addEventListener('keydown', e => {
    if (!overlay.classList.contains('open')) return;
    if (e.key === 'Escape') closeZoom();
    if (e.key === '+' || e.key === '=') { scale = Math.min(scale * 1.3, 8); updateTransform(); }
    if (e.key === '-') { scale = Math.max(scale / 1.3, 0.1); updateTransform(); }
    if (e.key === '0') { fitToScreen(); }
  });

  viewport.addEventListener('wheel', e => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    scale = Math.min(Math.max(scale * factor, 0.1), 8);
    updateTransform();
  }, { passive: false });

  viewport.addEventListener('mousedown', e => {
    if (e.button !== 0) return;
    dragging = true;
    startX = e.clientX - panX * scale;
    startY = e.clientY - panY * scale;
    e.preventDefault();
  });
  window.addEventListener('mousemove', e => {
    if (!dragging) return;
    panX = (e.clientX - startX) / scale;
    panY = (e.clientY - startY) / scale;
    updateTransform();
  });
  window.addEventListener('mouseup', () => { dragging = false; });

  document.addEventListener('click', e => {
    const mermaidEl = e.target.closest('.mermaid');
    if (!mermaidEl) return;
    if (overlay.classList.contains('open')) return;
    const svg = mermaidEl.querySelector('svg');
    if (svg) openZoom(svg);
  });
}

/* ─── INIT ─── */

initTheme();

const _initMermaidTheme = (document.documentElement.getAttribute('data-theme') || 'dark') === 'dark' ? 'dark' : 'base';
mermaid.initialize({ startOnLoad: false, theme: _initMermaidTheme, themeVariables: _initMermaidTheme === 'dark' ? {
  primaryColor: '#093B5F', primaryTextColor: '#fff', primaryBorderColor: '#00C895',
  lineColor: '#00C895', secondaryColor: '#03213B', tertiaryColor: '#093B5F'
} : {
  primaryColor: '#e8f4f8', primaryTextColor: '#093B5F', primaryBorderColor: '#093B5F',
  lineColor: '#5A7A94', secondaryColor: '#f0fdf9', tertiaryColor: '#f8fafc'
}});

initDiagramZoom();
loadData().then(() => { _lastFingerprint = pollFingerprint(); });
updateThemeIcon();
