const STORE_KEY = 'devops_max_2026';

// Load state
let state = {};
try { state = JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); } catch(e){}

function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch(e){} }

const SKILLBOX_COURSES = new Set([
  'intro-skillbox','intro-devops','sql','py1','linux','devops-basic','docker',
  'devops-adv','py2','ai','k8s','siem','agile','consult','dbsec','arch','support','present'
]);
const NETOLOGY_COURSES = new Set([
  'net-intro','net-sql-adv','net-redis','net-git-adv','net-linux','net-bash',
  'net-network','net-security','net-docker','net-cicd','net-ha','net-zabbix',
  'net-prometheus','net-k8s','net-microservices'
]);

function getCourseDoneCount(courseId) {
  const panel = document.getElementById(courseId + '-topics');
  if (!panel) return state['course_' + courseId] ? 999 : 0;
  return panel.querySelectorAll('.topic-item.done').length;
}

function getSourceProgress(courses, sourceSet) {
  return courses
    .filter(c => sourceSet.has(c))
    .reduce((sum, c) => sum + getCourseDoneCount(c), 0);
}

function getSkillSourceStatus(courses, minTopics) {
  const sb = getSourceProgress(courses, SKILLBOX_COURSES);
  const nt = getSourceProgress(courses, NETOLOGY_COURSES);
  return {
    skillbox: sb >= minTopics,
    netology: nt >= minTopics,
    inProgressSkillbox: sb > 0 && sb < minTopics,
    inProgressNetology: nt > 0 && nt < minTopics
  };
}

function applySourceClasses(el, status) {
  const cls = ['mastered-skillbox','mastered-netology','mastered-both',
    'in-progress-skillbox','in-progress-netology','in-progress-both',
    'mastered','in-progress'];
  el.classList.remove(...cls);
  if (status.skillbox && status.netology) el.classList.add('mastered-both');
  else if (status.skillbox) el.classList.add('mastered-skillbox');
  else if (status.netology) el.classList.add('mastered-netology');
  else if (status.inProgressSkillbox && status.inProgressNetology) el.classList.add('in-progress-both');
  else if (status.inProgressSkillbox) el.classList.add('in-progress-skillbox');
  else if (status.inProgressNetology) el.classList.add('in-progress-netology');
  return status.skillbox || status.netology;
}

// Course-to-total-topics map
const courseTotals = {
  'intro-skillbox':7, 'intro-devops':5,
  sql:11, py1:10, linux:25, 'devops-basic':13, docker:6,
  'devops-adv':10, py2:10, ai:4, k8s:11, siem:8,
  agile:4, consult:5, dbsec:5, arch:17, support:3
};
// override with actual counts from DOM
function getTopicCount(courseId) {
  const panel = document.getElementById(courseId + '-topics');
  if (!panel) return courseTotals[courseId] || 0;
  return panel.querySelectorAll('.topic-item').length;
}

function init() {
  // Restore topic states
  document.querySelectorAll('.topic-item').forEach(item => {
    const course = item.dataset.course;
    const idx = item.dataset.idx;
    const key = course + '_' + idx;
    if (state[key]) {
      item.classList.add('done');
      item.querySelector('.topic-cb').textContent = '✓';
    }
    updateTopicProgress(course);
  });
  // Restore course states
  document.querySelectorAll('.course-card').forEach(card => {
    const id = card.dataset.id;
    if (state['course_' + id]) {
      card.classList.add('completed');
      const cb = card.querySelector('.course-checkbox');
      if (cb) cb.textContent = '✓';
    }
  });
  // Restore project states
  document.querySelectorAll('.project-item').forEach(p => {
    if (state['project_' + p.id]) {
      p.classList.add('done');
      const cb = p.querySelector('.project-cb');
      if (cb) cb.textContent = '✓';
    }
  });
  initProjects();
  updateGlobalProgress();
  updateSkills();
  updateTools();
}

function toggleTopic(item) {
  const course = item.dataset.course;
  const idx = item.dataset.idx;
  const key = course + '_' + idx;
  const isDone = item.classList.toggle('done');
  item.querySelector('.topic-cb').textContent = isDone ? '✓' : '';
  state[key] = isDone;
  save();
  updateTopicProgress(course);
  // Auto-check course if all topics done
  autoCheckCourse(course);
  updateGlobalProgress();
  updateSkills();
  updateTools();
}

function updateTopicProgress(course) {
  const panel = document.getElementById(course + '-topics');
  if (!panel) return;
  const items = panel.querySelectorAll('.topic-item');
  const done = panel.querySelectorAll('.topic-item.done').length;
  const total = items.length;
  const pct = total ? (done / total) * 100 : 0;
  const fill = document.getElementById('tf-' + course);
  const label = document.getElementById('tl-' + course);
  if (fill) fill.style.width = pct + '%';
  if (label) label.textContent = done + ' / ' + total;
}

function autoCheckCourse(course) {
  const panel = document.getElementById(course + '-topics');
  if (!panel) return;
  const items = panel.querySelectorAll('.topic-item');
  const done = panel.querySelectorAll('.topic-item.done').length;
  const card = document.getElementById('course-' + course);
  if (!card) return;
  const cb = card.querySelector('.course-checkbox');
  const allDone = done === items.length && items.length > 0;
  card.classList.toggle('completed', allDone);
  if (cb) cb.textContent = allDone ? '✓' : '';
  state['course_' + course] = allDone;
  updateStepCircles();
  save();
}

function toggleCourse(id) {
  const card = document.getElementById('course-' + id);
  if (!card) return;
  const isDone = card.classList.toggle('completed');
  const cb = card.querySelector('.course-checkbox');
  if (cb) cb.textContent = isDone ? '✓' : '';
  state['course_' + id] = isDone;
  // Sync all topic checkboxes
  const panel = document.getElementById(id + '-topics');
  if (panel) {
    panel.querySelectorAll('.topic-item').forEach(item => {
      const key = id + '_' + item.dataset.idx;
      item.classList.toggle('done', isDone);
      item.querySelector('.topic-cb').textContent = isDone ? '✓' : '';
      state[key] = isDone;
    });
    updateTopicProgress(id);
  }
  updateStepCircles();
  updateGlobalProgress();
  updateSkills();
  updateTools();
  save();
}

function updateStepCircles() {
  const steps = [
    ['sc-0',  ['intro-skillbox','intro-devops','net-intro']],
    ['sc-1',  ['sql','py1','net-sql-adv','net-redis','net-git-adv']],
    ['sc-2',  ['linux','net-linux','net-bash','net-network','net-security']],
    ['sc-3',  ['devops-basic','docker','net-docker','net-cicd','net-ha']],
    ['sc-4',  ['devops-adv','net-zabbix','net-prometheus']],
    ['sc-5',  ['py2','ai']],
    ['sc-6',  ['k8s','net-k8s','net-microservices']],
    ['sc-7',  ['siem','agile']],
    ['sc-8',  ['consult']],
    ['sc-9',  ['dbsec']],
    ['sc-10', ['arch']],
    ['sc-11', ['support']],
    ['sc-bonus', ['present']],
  ];
  steps.forEach(([circleId, courses]) => {
    // A step is done when ALL its courses are marked complete
    const allDone = courses.every(c => state['course_' + c]);
    const circle = document.getElementById(circleId);
    if (!circle) return;
    if (allDone) {
      circle.classList.add('done-circle');
      circle.textContent = '✓';
    } else {
      circle.classList.remove('done-circle');
      const label = circleId === 'sc-bonus' ? '★' : circleId.replace('sc-','').padStart(2,'0');
      circle.textContent = label;
    }
  });
}

function updateGlobalProgress() {
  const allCourses = [
    'intro-skillbox','intro-devops','net-intro',
    'sql','py1','net-sql-adv','net-redis','net-git-adv',
    'linux','net-linux','net-bash','net-network','net-security',
    'devops-basic','docker','net-docker','net-cicd','net-ha',
    'devops-adv','net-zabbix','net-prometheus',
    'py2','ai',
    'k8s','net-k8s','net-microservices',
    'siem','agile','consult','dbsec','arch','support','present'
  ];
  const doneCourses = allCourses.filter(c => state['course_' + c]).length;
  const total = allCourses.length;
  const pct = Math.round((doneCourses / total) * 100);
  document.getElementById('progress-fill').style.width = pct + '%';
  document.getElementById('progress-pct').textContent = pct + '%';
  document.getElementById('done-courses').textContent = doneCourses + ' / ' + total;
}

function toggleTopics(panelId, btn) {
  const panel = document.getElementById(panelId);
  const isOpen = panel.classList.toggle('open');
  btn.classList.toggle('open', isOpen);
  btn.querySelector('.expand-arrow').style.transform = isOpen ? 'rotate(90deg)' : '';
}

function toggleProject(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const isDone = el.classList.toggle('done');
  const cb = el.querySelector('.project-cb');
  if (cb) cb.textContent = isDone ? '✓' : '';
  state['project_' + id] = isDone;
  save();
}

function toggleAddProjectForm() {
  document.getElementById('add-project-form').classList.toggle('open');
}

function addCustomProject() {
  const name = document.getElementById('new-project-name').value.trim();
  const desc = document.getElementById('new-project-desc').value.trim();
  if (!name) return;
  if (!state.customProjects) state.customProjects = [];
  const id = 'custom-' + Date.now();
  state.customProjects.push({ id, name, desc, comments: [] });
  document.getElementById('new-project-name').value = '';
  document.getElementById('new-project-desc').value = '';
  toggleAddProjectForm();
  save();
  renderCustomProjects();
}

function deleteCustomProject(id) {
  if (!confirm('Удалить этот проект?')) return;
  state.customProjects = (state.customProjects || []).filter(p => p.id !== id);
  delete state['project_' + id];
  delete state['comments_' + id];
  save();
  renderCustomProjects();
}

function renderCustomProjects() {
  document.querySelectorAll('.project-item.custom').forEach(el => el.remove());
  const list = document.getElementById('projects-list');
  const projects = state.customProjects || [];
  projects.forEach((p, i) => {
    const num = String(projects.length > 9 ? i + 6 : '0' + (i + 6)).slice(-2);
    const el = document.createElement('div');
    el.className = 'project-item custom' + (state['project_' + p.id] ? ' done' : '');
    el.id = p.id;
    el.dataset.projectId = p.id;
    el.innerHTML = `
      <div class="project-num">${num}</div>
      <div class="project-main">
        <div class="project-body" onclick="toggleProject('${p.id}')">
          <div class="project-name">${escapeHtml(p.name)} <span style="font-size:10px;color:var(--orange);">· свой проект</span></div>
          <div class="project-desc">${escapeHtml(p.desc || 'Без описания')}</div>
        </div>
        <div class="project-comments" onclick="event.stopPropagation()">
          <div class="project-comments-title">Комментарии</div>
          <div class="comment-list" id="comments-${p.id}"></div>
          <div class="comment-form">
            <textarea class="comment-input" id="comment-input-${p.id}" placeholder="Добавить заметку..." rows="2"></textarea>
            <button type="button" class="comment-btn" onclick="addProjectComment('${p.id}')">Добавить</button>
          </div>
          <button type="button" class="delete-project-btn" onclick="deleteCustomProject('${p.id}')">Удалить проект</button>
        </div>
      </div>
      <div class="project-cb" onclick="toggleProject('${p.id}')">${state['project_' + p.id] ? '✓' : ''}</div>
    `;
    list.appendChild(el);
    renderProjectComments(p.id);
  });
}

function escapeHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function getProjectComments(id) {
  if (!state['comments_' + id]) state['comments_' + id] = [];
  return state['comments_' + id];
}

function renderProjectComments(id) {
  const listEl = document.getElementById('comments-' + id);
  if (!listEl) return;
  const comments = getProjectComments(id);
  listEl.innerHTML = comments.length
    ? comments.map(c => `<div class="comment-item"><div class="comment-meta">${escapeHtml(c.date)}</div>${escapeHtml(c.text)}</div>`).join('')
    : '<div class="comment-item" style="opacity:.55;font-style:italic;">Комментариев пока нет</div>';
}

function addProjectComment(id) {
  const input = document.getElementById('comment-input-' + id);
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  const comments = getProjectComments(id);
  comments.push({
    text,
    date: new Date().toLocaleString('ru-RU', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })
  });
  input.value = '';
  save();
  renderProjectComments(id);
}

function initProjects() {
  ['proj-1','proj-2','proj-3','proj-4','proj-5'].forEach(renderProjectComments);
  renderCustomProjects();
}

function scrollToId(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Nav dots
const navSections = ['top','progress-sec','modules','skills-map','tools','projects'];
const navDots = document.querySelectorAll('.nav-dot');
const obs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      const idx = navSections.indexOf(e.target.id);
      navDots.forEach((d,i) => d.classList.toggle('active', i === idx));
    }
  });
}, { threshold: 0.3 });
navSections.forEach(id => { const el = document.getElementById(id); if(el) obs.observe(el); });


// ── SKILLS MAP ──
const skillsMap = [
  // ── Linux & Bash ──
  { label: 'SLI0A: основы Linux и IT-систем', courses: ['linux','net-linux'], minTopics: 2, course: 'net-linux' },
  { label: 'Linux: командная строка и файловая система', courses: ['linux','net-linux'], minTopics: 3, course: 'linux' },
  { label: 'Vim',                    courses: ['linux'], minTopics: 3, course: 'linux' },
  { label: 'Bash-скриптинг (основы)',courses: ['linux','net-bash'], minTopics: 5, course: 'linux' },
  { label: 'Bash: Regexp, sed, awk', courses: ['linux','net-bash'], minTopics: 3, course: 'net-bash' },
  { label: 'Процессы и память Linux',courses: ['net-linux'], minTopics: 2, course: 'net-linux' },
  { label: 'Systemd / init',         courses: ['linux','net-linux'], minTopics: 10, course: 'net-linux' },
  { label: 'Ядро ОС, загрузка',      courses: ['net-linux'], minTopics: 6, course: 'net-linux' },
  { label: 'Компьютерные сети (OSI, TCP/IP)', courses: ['linux','net-network'], minTopics: 8, course: 'linux' },
  { label: 'L2/L3/L4 протоколы',    courses: ['net-network'], minTopics: 4, course: 'net-network' },
  { label: 'DNS, DHCP, HTTP/HTTPS',  courses: ['linux','net-network'], minTopics: 6, course: 'net-network' },
  { label: 'IPv6',                   courses: ['net-network'], minTopics: 11, course: 'net-network' },
  { label: 'NAT / VPN',             courses: ['linux','net-network'], minTopics: 5, course: 'net-network' },
  { label: 'Firewall / iptables',    courses: ['linux','net-network'], minTopics: 22, course: 'linux' },
  { label: 'Troubleshooting сети',   courses: ['net-network'], minTopics: 8, course: 'net-network' },
  { label: 'Криптография, HTTPS/TLS',courses: ['linux'], minTopics: 11, course: 'linux' },
  { label: 'Виртуализация',         courses: ['linux','net-docker'], minTopics: 23, course: 'linux' },

  // ── Безопасность ──
  { label: 'Уязвимости и атаки (OWASP)', courses: ['net-security'], minTopics: 1, course: 'net-security' },
  { label: 'Защита хоста (hardening)', courses: ['net-security'], minTopics: 2, course: 'net-security' },
  { label: 'DevSecOps / защита сети', courses: ['net-security'], minTopics: 4, course: 'net-security' },

  // ── SQL и Базы данных ──
  { label: 'SQL основы (SELECT, JOIN, GROUP)', courses: ['sql','net-sql-adv'], minTopics: 3, course: 'sql' },
  { label: 'PostgreSQL',             courses: ['sql','dbsec','net-sql-adv'], minTopics: 3, course: 'sql' },
  { label: 'DDL / DML',             courses: ['net-sql-adv'], minTopics: 2, course: 'net-sql-adv' },
  { label: 'Индексы, EXPLAIN ANALYZE', courses: ['net-sql-adv'], minTopics: 5, course: 'net-sql-adv' },
  { label: 'Репликация БД',         courses: ['net-sql-adv'], minTopics: 6, course: 'net-sql-adv' },
  { label: 'Резервное копирование БД', courses: ['net-sql-adv','net-ha'], minTopics: 7, course: 'net-sql-adv' },
  { label: 'MongoDB / NoSQL',       courses: ['dbsec'], minTopics: 3, course: 'dbsec' },
  { label: 'Безопасность БД',       courses: ['dbsec'], minTopics: 5, course: 'dbsec' },
  { label: 'Redis / Memcached',     courses: ['net-redis'], minTopics: 1, course: 'net-redis' },
  { label: 'RabbitMQ / очереди',    courses: ['net-redis'], minTopics: 2, course: 'net-redis' },
  { label: 'Облачные БД',           courses: ['net-sql-adv'], minTopics: 8, course: 'net-sql-adv' },

  // ── Git ──
  { label: 'Git основы',            courses: ['net-cicd','net-git-adv'], minTopics: 4, course: 'net-cicd' },
  { label: 'Git: ветвление, merge, rebase', courses: ['net-git-adv'], minTopics: 2, course: 'net-git-adv' },
  { label: 'Git: stash, hooks, submodules', courses: ['net-git-adv'], minTopics: 3, course: 'net-git-adv' },

  // ── Python ──
  { label: 'Python основы',         courses: ['py1'], minTopics: 5, course: 'py1' },
  { label: 'Python функции, циклы', courses: ['py1'], minTopics: 9, course: 'py1' },
  { label: 'Python ООП',            courses: ['py2'], minTopics: 6, course: 'py2' },
  { label: 'Python декораторы',     courses: ['py2'], minTopics: 8, course: 'py2' },
  { label: 'Python: работа с данными', courses: ['py2'], minTopics: 10, course: 'py2' },

  // ── DevOps Core ──
  { label: 'Введение в DevOps / культура', courses: ['devops-basic','net-intro'], minTopics: 2, course: 'devops-basic' },
  { label: 'CI/CD концепции',       courses: ['devops-basic','net-cicd'], minTopics: 4, course: 'devops-basic' },
  { label: 'GitLab CI/CD',          courses: ['devops-basic','net-cicd'], minTopics: 4, course: 'net-cicd' },
  { label: 'Jenkins',               courses: ['devops-adv','net-cicd'], minTopics: 5, course: 'net-cicd' },
  { label: 'TeamCity',              courses: ['net-cicd'], minTopics: 8, course: 'net-cicd' },
  { label: 'IaC (Terraform)',       courses: ['devops-basic','net-cicd'], minTopics: 6, course: 'devops-basic' },
  { label: 'Terraform продвинутый', courses: ['net-cicd'], minTopics: 2, course: 'net-cicd' },
  { label: 'Ansible основы',        courses: ['devops-basic','net-cicd'], minTopics: 9, course: 'devops-basic' },
  { label: 'Ansible Advanced (Roles, Molecule)', courses: ['devops-adv','net-cicd'], minTopics: 3, course: 'devops-adv' },

  // ── Docker ──
  { label: 'Docker основы',         courses: ['docker','net-docker'], minTopics: 2, course: 'docker' },
  { label: 'Dockerfile',            courses: ['docker','net-docker'], minTopics: 3, course: 'docker' },
  { label: 'Docker Compose',        courses: ['docker','net-docker'], minTopics: 5, course: 'docker' },
  { label: 'Docker Swarm',          courses: ['net-docker'], minTopics: 2, course: 'net-docker' },
  { label: 'Docker: сети и volumes',courses: ['net-docker'], minTopics: 2, course: 'net-docker' },

  // ── Отказоустойчивость ──
  { label: 'Кластеризация / HA',    courses: ['net-ha'], minTopics: 1, course: 'net-ha' },
  { label: 'Балансировка нагрузки', courses: ['net-ha'], minTopics: 1, course: 'net-ha' },
  { label: 'Disaster Recovery',     courses: ['net-ha','net-docker'], minTopics: 2, course: 'net-ha' },
  { label: 'Резервное копирование', courses: ['net-ha'], minTopics: 3, course: 'net-ha' },

  // ── Мониторинг ──
  { label: 'Мониторинг (Prometheus)', courses: ['devops-basic','net-prometheus'], minTopics: 11, course: 'devops-basic' },
  { label: 'Node Exporter / Alertmanager', courses: ['net-prometheus'], minTopics: 3, course: 'net-prometheus' },
  { label: 'Grafana',               courses: ['net-prometheus'], minTopics: 2, course: 'net-prometheus' },
  { label: 'Zabbix',                courses: ['net-zabbix'], minTopics: 2, course: 'net-zabbix' },
  { label: 'ELK Stack',             courses: ['devops-adv','net-prometheus'], minTopics: 7, course: 'net-prometheus' },
  { label: 'Sentry',                courses: ['net-prometheus'], minTopics: 7, course: 'net-prometheus' },
  { label: 'Инцидент-менеджмент',   courses: ['net-prometheus'], minTopics: 8, course: 'net-prometheus' },

  // ── AI ──
  { label: 'ИИ-инструменты для DevOps', courses: ['ai'], minTopics: 2, course: 'ai' },

  // ── Kubernetes ──
  { label: 'Kubernetes основы',     courses: ['k8s','net-k8s'], minTopics: 2, course: 'k8s' },
  { label: 'K8s: Pods, Deployments, Services', courses: ['k8s','net-k8s'], minTopics: 2, course: 'net-k8s' },
  { label: 'K8s: сетевое взаимодействие', courses: ['k8s','net-k8s'], minTopics: 3, course: 'net-k8s' },
  { label: 'K8s: хранение данных',  courses: ['net-k8s'], minTopics: 4, course: 'net-k8s' },
  { label: 'K8s RBAC & Security',   courses: ['k8s','net-k8s'], minTopics: 5, course: 'net-k8s' },
  { label: 'Helm',                  courses: ['k8s','net-k8s'], minTopics: 6, course: 'net-k8s' },
  { label: 'kubeadm / kubespray',   courses: ['net-k8s'], minTopics: 8, course: 'net-k8s' },
  { label: 'Istio / Service Mesh',  courses: ['k8s','net-microservices'], minTopics: 9, course: 'k8s' },
  { label: 'K8s: Troubleshooting',  courses: ['net-k8s'], minTopics: 10, course: 'net-k8s' },
  { label: 'K8s CI/CD',             courses: ['k8s'], minTopics: 10, course: 'k8s' },

  // ── Микросервисы ──
  { label: 'Микросервисная архитектура', courses: ['arch','net-microservices'], minTopics: 3, course: 'net-microservices' },
  { label: '12-факторное приложение', courses: ['net-microservices'], minTopics: 2, course: 'net-microservices' },
  { label: 'Service Discovery',     courses: ['devops-adv','net-microservices'], minTopics: 2, course: 'net-microservices' },
  { label: 'Облачные провайдеры',   courses: ['devops-adv','net-microservices'], minTopics: 6, course: 'net-microservices' },

  // ── SIEM / Безопасность ──
  { label: 'SIEM & Playbook',       courses: ['siem'], minTopics: 5, course: 'siem' },
  { label: 'Incident Response',     courses: ['siem'], minTopics: 8, course: 'siem' },

  // ── Управление ──
  { label: 'Agile / Scrum',         courses: ['agile'], minTopics: 2, course: 'agile' },
  { label: 'Kanban',                courses: ['agile'], minTopics: 3, course: 'agile' },

  // ── Архитектура ──
  { label: 'Архитектура ПО',        courses: ['arch'], minTopics: 3, course: 'arch' },
  { label: 'API Design',            courses: ['arch'], minTopics: 8, course: 'arch' },
  { label: 'Cloud Native',          courses: ['arch','net-microservices'], minTopics: 16, course: 'arch' },
  { label: 'Observability',         courses: ['arch','net-prometheus'], minTopics: 15, course: 'arch' },

  // ── Финал ──
  { label: 'Презентация проектов',  courses: ['present'], minTopics: 1, course: 'present' },
];

// Course display names for grouping
const courseNames = {
  'linux':        '🐧 Системное администрирование Linux',
  'sql':          '🗄️ SQL и базы данных',
  'py1':          '🐍 Python. Часть 1',
  'py2':          '🐍 Python. Часть 2',
  'devops-basic': '🔄 DevOps-инженер. Основы',
  'docker':       '🐳 DevOps. Docker',
  'devops-adv':   '⚡ DevOps-инженер. Advanced',
  'ai':           '🤖 AI-помощники для IT-специалистов',
  'k8s':          '☸️ Kubernetes',
  'siem':         '🔐 SIEM & Incident Response',
  'agile':        '🏃 Agile / Scrum / Kanban',
  'arch':         '🏗️ Архитектор ПО',
  'dbsec':        '🛡️ Безопасность баз данных',
  'present':      '🎤 Презентация проектов',
  'net-intro':    '🎬 Введение в DevOps (Нетология)',
  'net-linux':    '🐧 Linux углублённо (Нетология)',
  'net-bash':     '⌨️ Bash расширенный (Нетология)',
  'net-network':  '🌐 Компьютерные сети (Нетология)',
  'net-security': '🔐 Информационная безопасность (Нетология)',
  'net-sql-adv':  '🗄️ БД углублённо (Нетология)',
  'net-redis':    '⚡ Redis, RabbitMQ (Нетология)',
  'net-git-adv':  '📦 Git углублённо (Нетология)',
  'net-docker':   '🐳 Docker углублённо (Нетология)',
  'net-ha':       '🛡️ Отказоустойчивость и Backup (Нетология)',
  'net-cicd':     '🔄 CI/CD: Ansible, Terraform, GitLab (Нетология)',
  'net-zabbix':   '📊 Zabbix (Нетология)',
  'net-prometheus':'🔥 Prometheus + Grafana + ELK (Нетология)',
  'net-k8s':      '☸️ Kubernetes углублённо (Нетология)',
  'net-microservices': '🏗️ Микросервисы (Нетология)',
};

function buildSkillsGrid() {
  const container = document.getElementById('skills-by-course');
  if (!container) return;
  container.innerHTML = '';

  // Group skills by course
  const groups = {};
  skillsMap.forEach((sk, i) => {
    const cid = sk.course;
    if (!groups[cid]) groups[cid] = [];
    groups[cid].push({ ...sk, idx: i });
  });

  // Render each group
  Object.entries(groups).forEach(([cid, skills]) => {
    const groupDiv = document.createElement('div');
    groupDiv.className = 'skill-group';
    groupDiv.id = 'skill-group-' + cid;

    groupDiv.innerHTML = `
      <div class="skill-group-header">
        <span class="skill-group-label">${courseNames[cid] || cid}</span>
        <span class="skill-group-line"></span>
        <span class="skill-group-progress" id="sgp-${cid}">0 / ${skills.length}</span>
      </div>
      <div class="skills-grid" id="sg-${cid}"></div>
    `;
    container.appendChild(groupDiv);

    const grid = groupDiv.querySelector('#sg-' + cid);
    skills.forEach(sk => {
      const el = document.createElement('div');
      el.className = 'skill-tag';
      el.id = 'sk-' + sk.idx;
      el.innerHTML = '<div class="sk-dot"></div><span>' + sk.label + '</span>';
      grid.appendChild(el);
    });
  });
}

function updateSkills() {
  const groupCounts = {};
  const groupMastered = {};

  skillsMap.forEach((sk, i) => {
    const el = document.getElementById('sk-' + i);
    if (!el) return;
    const cid = sk.course;
    if (!groupCounts[cid]) { groupCounts[cid] = 0; groupMastered[cid] = 0; }
    groupCounts[cid]++;

    const status = getSkillSourceStatus(sk.courses, sk.minTopics);
    const mastered = applySourceClasses(el, status);
    if (mastered) groupMastered[cid]++;
  });

  Object.keys(groupCounts).forEach(cid => {
    const el = document.getElementById('sgp-' + cid);
    if (el) el.textContent = groupMastered[cid] + ' / ' + groupCounts[cid];
  });
}

const toolsMap = {
  python: { courses: ['py1','py2'], minTopics: 3 },
  docker: { courses: ['docker','net-docker'], minTopics: 2 },
  gitlab: { courses: ['devops-basic','net-cicd'], minTopics: 4 },
  kubernetes: { courses: ['k8s','net-k8s'], minTopics: 2 },
  ansible: { courses: ['devops-basic','devops-adv','net-cicd'], minTopics: 3 },
  terraform: { courses: ['devops-basic','net-cicd'], minTopics: 3 },
  prometheus: { courses: ['devops-basic','net-prometheus'], minTopics: 2 },
  grafana: { courses: ['net-prometheus'], minTopics: 2 },
  elk: { courses: ['devops-adv','net-prometheus','net-redis'], minTopics: 1 },
  helm: { courses: ['k8s','net-k8s'], minTopics: 6 },
  postgresql: { courses: ['sql','dbsec','net-sql-adv'], minTopics: 2 },
  mongodb: { courses: ['dbsec'], minTopics: 3 },
  bash: { courses: ['linux','net-bash'], minTopics: 4 },
  linux: { courses: ['linux','net-linux'], minTopics: 3 },
  ai: { courses: ['ai'], minTopics: 2 },
  jenkins: { courses: ['devops-adv','net-cicd'], minTopics: 1 },
  molecule: { courses: ['devops-adv','net-cicd'], minTopics: 3 },
  vim: { courses: ['linux'], minTopics: 3 },
  zabbix: { courses: ['net-zabbix'], minTopics: 2 },
  packettracer: { courses: ['net-network'], minTopics: 10 },
  logstash: { courses: ['devops-adv','net-prometheus'], minTopics: 5 },
  sentry: { courses: ['net-prometheus'], minTopics: 4 },
  redis: { courses: ['net-redis'], minTopics: 1 },
  rabbitmq: { courses: ['net-redis'], minTopics: 2 },
  git: { courses: ['net-git-adv','net-cicd','devops-adv'], minTopics: 2 }
};

function updateTools() {
  document.querySelectorAll('[data-tool]').forEach(el => {
    const cfg = toolsMap[el.dataset.tool];
    if (!cfg) return;
    const status = getSkillSourceStatus(cfg.courses, cfg.minTopics);
    el.classList.remove('mastered-skillbox','mastered-netology','mastered-both');
    if (status.skillbox && status.netology) el.classList.add('mastered-both');
    else if (status.skillbox) el.classList.add('mastered-skillbox');
    else if (status.netology) el.classList.add('mastered-netology');
  });
}


// ── THEME ──
function toggleTheme() {
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  const next = isLight ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  try { localStorage.setItem('devops_theme', next); } catch(e){}
}
function applyTheme() {
  let saved = 'dark';
  try { saved = localStorage.getItem('devops_theme') || 'dark'; } catch(e){}
  document.documentElement.setAttribute('data-theme', saved);
}
applyTheme();

buildSkillsGrid();
init();
updateSkills();
updateTools();

// ── FILE TOOLTIPS ──
(function(){
  document.querySelectorAll('[data-files]').forEach(item => {
    const txt = item.getAttribute('data-files');
    if (!txt) return;
    const tip = document.createElement('div');
    tip.className = 'file-tooltip';
    const lines = txt.split('&#10;').join('\n').split('\n');
    tip.innerHTML = '<span class="tooltip-title">📁 Файлы Нетологии:</span>' +
      lines.map(l => l.trim()).filter(Boolean).map(l => `<div>• ${l}</div>`).join('');
    item.appendChild(tip);
  });
})();
