// ========== 电脑版主逻辑 ==========

// ---- 数据键名 ----
const KEYS = {
  planList: 'planList',
  history: 'history',
  reviewDay: 'review_day',
  reviewWeek: 'review_week',
  reviewMonth: 'review_month',
  combState: 'combState',
  userProfile: 'userProfile',
  aiConfig: 'ai_config'
};

// ---- 初始化 ----
document.addEventListener('DOMContentLoaded', () => {
  loadProfile();
  renderTasks();
  renderComb();
  renderCountdown();
  bindEvents();
  checkDayReset();
});

// ---- 设置 ----
function loadProfile() {
  const raw = localStorage.getItem(KEYS.userProfile);
  const profile = raw ? JSON.parse(raw) : { nick: '咕', goal: '广州大学·新传·400+', deadline: '2026-12-21', slogan: '上海跨年见' };
  document.getElementById('nick').textContent = profile.nick || '咕';
  document.getElementById('goal').textContent = profile.goal || '';
  document.getElementById('slogan').textContent = profile.slogan || '上海跨年见';
  document.getElementById('setNick').value = profile.nick || '咕';
  document.getElementById('setGoal').value = profile.goal || '';
  document.getElementById('setDeadline').value = profile.deadline || '';
  // AI 设置
  const aiRaw = localStorage.getItem(KEYS.aiConfig);
  if (aiRaw) {
    const ai = JSON.parse(aiRaw);
    document.getElementById('setBase').value = ai.base || 'https://open.bigmodel.cn/api/paas/v4/';
    document.getElementById('setModel').value = ai.model || 'glm-4.7-flash';
    document.getElementById('setKey').value = ai.key || '';
  }
}

function saveSettings() {
  const profile = {
    nick: document.getElementById('setNick').value || '咕',
    goal: document.getElementById('setGoal').value || '广州大学·新传·400+',
    deadline: document.getElementById('setDeadline').value || '2026-12-21',
    slogan: document.getElementById('setSlogan') ? document.getElementById('setSlogan').value : '上海跨年见'
  };
  localStorage.setItem(KEYS.userProfile, JSON.stringify(profile));
  const aiConfig = {
    base: document.getElementById('setBase').value || 'https://open.bigmodel.cn/api/paas/v4/',
    model: document.getElementById('setModel').value || 'glm-4.7-flash',
    key: document.getElementById('setKey').value || ''
  };
  localStorage.setItem(KEYS.aiConfig, JSON.stringify(aiConfig));
  loadProfile();
  alert('设置已保存');
}

// ---- 倒计时 ----
function renderCountdown() {
  const raw = localStorage.getItem(KEYS.userProfile);
  if (!raw) return;
  const profile = JSON.parse(raw);
  if (!profile.deadline) return;
  const d = new Date(profile.deadline);
  const now = new Date();
  const diff = Math.ceil((d - now) / (1000 * 60 * 60 * 24));
  document.getElementById('countdown').textContent = diff > 0 ? `${diff} 天` : '已过线';
}

// ---- 任务 ----
function getTasks() {
  const raw = localStorage.getItem(KEYS.planList);
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

function saveTasks(tasks) {
  localStorage.setItem(KEYS.planList, JSON.stringify(tasks));
}

function addTask() {
  const input = document.getElementById('taskInput');
  const text = input.value.trim();
  if (!text) return;
  const tasks = getTasks();
  const sub = detectSubject(text);
  tasks.push({ id: Date.now(), text, done: false, subject: sub, date: todayStr() });
  saveTasks(tasks);
  input.value = '';
  renderTasks();
}

function toggleTask(id) {
  const tasks = getTasks();
  const t = tasks.find(t => t.id === id);
  if (t) { t.done = !t.done; saveTasks(tasks); renderTasks(); }
}

function detectSubject(text) {
  const t = text.toLowerCase();
  if (t.includes('英语') || t.includes('english') || t.includes('单词') || t.includes('阅读') || t.includes('作文')) return '英语';
  if (t.includes('政治') || t.includes('马原') || t.includes('毛中特') || t.includes('思修') || t.includes('近代史')) return '政治';
  if (t.includes('专业课') || t.includes('新闻') || t.includes('传播') || t.includes('实务') || t.includes('史论')) return '专业课';
  return '其他';
}

function renderTasks() {
  const tasks = getTasks().filter(t => t.date === todayStr());
  const list = document.getElementById('taskList');
  list.innerHTML = '';
  let doneCount = 0;
  tasks.forEach(t => {
    if (t.done) doneCount++;
    const div = document.createElement('div');
    div.className = 'task-item';
    div.innerHTML = `
      <div class="task-check ${t.done ? 'checked' : ''}" onclick="toggleTask(${t.id})"></div>
      <div class="task-content ${t.done ? 'done' : ''}">
        <span class="task-subject sub-${t.subject}">${t.subject}</span>${t.text}
      </div>
    `;
    list.appendChild(div);
  });
  // 进度
  const total = tasks.length;
  const pct = total ? Math.round(doneCount / total * 100) : 0;
  document.getElementById('progBar').style.width = pct + '%';
  document.getElementById('progTxt').textContent = `${doneCount}/${total}`;
}

// ---- 梳子 ----
function renderComb() {
  const raw = localStorage.getItem(KEYS.combState);
  const state = raw ? JSON.parse(raw) : { mood: 0, focus: 0, energy: 0 };
  ['mood', 'focus', 'energy'].forEach(k => {
    const stars = document.querySelectorAll(`.stars[data-k="${k}"]`);
    if (!stars.length) return;
    stars[0].innerHTML = [1,2,3,4,5].map(i => `<span class="${i <= (state[k]||0) ? 'on' : ''}" onclick="rateStar('${k}',${i})">★</span>`).join('');
  });
}

function rateStar(k, v) {
  const raw = localStorage.getItem(KEYS.combState) || '{"mood":0,"focus":0,"energy":0}';
  const state = JSON.parse(raw);
  state[k] = v;
  localStorage.setItem(KEYS.combState, JSON.stringify(state));
  renderComb();
}

function saveComb() {
  alert('梳子已保存');
}

// ---- 复盘 ----
function saveReview() {
  const type = document.querySelector('.review-tab.on')?.dataset.type || 'day';
  const answers = {
    q1: document.getElementById('rq1').value,
    q2: document.getElementById('rq2').value,
    q3: document.getElementById('rq3').value
  };
  const score = parseInt(document.getElementById('rscore').value);
  const record = {
    date: todayStr(),
    type,
    answers,
    score,
    ts: Date.now()
  };
  const histRaw = localStorage.getItem(KEYS.history) || '[]';
  const hist = JSON.parse(histRaw);
  hist.unshift(record);
  localStorage.setItem(KEYS.history, JSON.stringify(hist));
  // 生成 AI 小结
  const btn = event.target;
  const origText = btn.textContent;
  btn.textContent = '生成中...';
  btn.disabled = true;
  generateReviewAI(answers, score, type).then(summary => {
    document.getElementById('aiResult').textContent = summary;
    btn.textContent = origText;
    btn.disabled = false;
  });
}

function toggleHist() {
  const box = document.getElementById('histList');
  if (box.style.display === 'none') {
    box.style.display = 'block';
    renderHist();
  } else {
    box.style.display = 'none';
  }
}

function renderHist() {
  const histRaw = localStorage.getItem(KEYS.history) || '[]';
  const hist = JSON.parse(histRaw);
  const list = document.getElementById('histList');
  list.innerHTML = '';
  hist.slice(0, 20).forEach(h => {
    const div = document.createElement('div');
    div.className = 'hist-item';
    div.innerHTML = `<b>${h.date} · ${h.type}</b><br>完成度 ${h.score}/100<br>${h.answers.q1 ? '✅ ' + h.answers.q1.slice(0,40) + '<br>' : ''}${h.answers.q3 ? '🎯 ' + h.answers.q3.slice(0,40) : ''}`;
    list.appendChild(div);
  });
}

// ---- 跨天重置 ----
function checkDayReset() {
  const lastDate = localStorage.getItem('lastActiveDate');
  const today = todayStr();
  if (lastDate && lastDate !== today) {
    // 新的一天，旧任务标记过期但不删
    const tasks = getTasks();
    tasks.forEach(t => { if (t.date === lastDate && !t.done) t.expired = true; });
    saveTasks(tasks);
  }
  localStorage.setItem('lastActiveDate', today);
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// ---- 绑定事件 ----
function bindEvents() {
  // 回车加任务
  document.getElementById('taskInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') addTask();
  });
  // 复盘 tab
  document.querySelectorAll('.review-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.review-tab').forEach(t => t.classList.remove('on'));
      tab.classList.add('on');
    });
  });
  // 分数滑块
  const slider = document.getElementById('rscore');
  if (slider) {
    slider.addEventListener('input', () => {
      document.getElementById('rscoreVal').textContent = slider.value;
    });
  }
}

// ---- AI 测试 ----
async function testAI() {
  const config = getAIConfig();
  if (!config.key) { alert('请先填 API Key'); return; }
  const btn = event.target;
  btn.textContent = '测试中...';
  btn.disabled = true;
  try {
    const reply = await callAI([{ role: 'user', content: '你好，回复"连接成功"即可' }], { max_tokens: 20 });
    alert(reply || '连接成功（但返回为空）');
  } catch (e) {
    alert('连接失败: ' + e.message);
  }
  btn.textContent = '测试连接';
  btn.disabled = false;
}

// ---- 导出/导入 ----
function exportData() {
  const data = {};
  Object.values(KEYS).forEach(k => {
    data[k] = localStorage.getItem(k);
  });
  data.lastActiveDate = localStorage.getItem('lastActiveDate');
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `kaoyan-backup-${todayStr()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importData() {
  const text = prompt('粘贴之前导出的 JSON 数据：');
  if (!text) return;
  try {
    const data = JSON.parse(text);
    Object.entries(data).forEach(([k, v]) => {
      if (v !== null && v !== undefined) localStorage.setItem(k, v);
    });
    alert('导入成功，刷新页面生效');
    location.reload();
  } catch (e) {
    alert('导入失败：数据格式不对');
  }
}

// ---- 诊断 ----
function diag() {
  const box = document.getElementById('diagBox');
  box.style.display = 'block';
  const lines = [];
  lines.push('=== 存储诊断 ===');
  lines.push('localStorage 可用: ' + (typeof Storage !== 'undefined'));
  lines.push('');
  Object.values(KEYS).forEach(k => {
    const v = localStorage.getItem(k);
    lines.push(`${k}: ${v ? (v.length > 80 ? v.slice(0,80)+'...' : v) : '(空)'}`);
  });
  lines.push('');
  lines.push('planList 任务数: ' + getTasks().length);
  const histRaw = localStorage.getItem(KEYS.history);
  lines.push('history 记录数: ' + (histRaw ? JSON.parse(histRaw).length : 0));
  box.textContent = lines.join('\n');
}