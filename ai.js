// ========== AI 调用模块（智谱 GLM，OpenAI 兼容接口） ==========

const AI_CONFIG_KEY = 'ai_config';

function getAIConfig() {
  try {
    const raw = localStorage.getItem(AI_CONFIG_KEY);
    if (!raw) return { base: 'https://open.bigmodel.cn/api/paas/v4/', model: 'glm-4.7-flash', key: '' };
    const parsed = JSON.parse(raw);
    return {
      base: parsed.base || 'https://open.bigmodel.cn/api/paas/v4/',
      model: parsed.model || 'glm-4.7-flash',
      key: parsed.key || ''
    };
  } catch (e) {
    return { base: 'https://open.bigmodel.cn/api/paas/v4/', model: 'glm-4.7-flash', key: '' };
  }
}

function saveAIConfig(base, model, key) {
  localStorage.setItem(AI_CONFIG_KEY, JSON.stringify({ base, model, key }));
}

async function callAI(messages, opts = {}) {
  const config = getAIConfig();
  if (!config.key) {
    throw new Error('未配置 API Key');
  }

  const base = config.base.replace(/\/+$/, '');
  const url = `${base}/chat/completions`;

  const body = {
    model: config.model,
    messages: messages,
    max_tokens: opts.max_tokens || 800,
    temperature: opts.temperature || 0.7,
    stream: false
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.key}`
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`API 错误 ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

// ========== 本地规则引擎（降级用） ==========

function localReviewSummary(answers, score) {
  const lines = [];
  lines.push(`📊 完成度：${score}/100`);
  lines.push('');

  if (score >= 80) {
    lines.push('🌟 今天状态不错！保持节奏。');
  } else if (score >= 50) {
    lines.push('💪 中规中矩，明天可以调整一下重心。');
  } else {
    lines.push('🌱 今天比较低迷，没关系，重新出发就好。');
  }

  if (answers.q1 && answers.q1.trim()) {
    lines.push(`✅ 做得好的：${answers.q1.trim().slice(0, 60)}${answers.q1.trim().length > 60 ? '…' : ''}`);
  }
  if (answers.q2 && answers.q2.trim()) {
    lines.push(`⚠️ 需改进的：${answers.q2.trim().slice(0, 60)}${answers.q2.trim().length > 60 ? '…' : ''}`);
  }
  if (answers.q3 && answers.q3.trim()) {
    lines.push(`🎯 下一步：${answers.q3.trim().slice(0, 60)}${answers.q3.trim().length > 60 ? '…' : ''}`);
  }

  lines.push('');
  lines.push('（本地小结，未调用 AI）');
  return lines.join('\n');
}

// ========== 复盘 AI 生成 ==========

async function generateReviewAI(answers, score, type) {
  const config = getAIConfig();

  const systemPrompt = `你是一个考研学习副驾驶助手，叫"咕"。用户是考研学生，目标广州大学新闻与传播专业400+分。请根据用户的复盘回答，生成一段温暖、有洞察的总结和建议。不要超过200字。语气像朋友一样，不要说教。`;

  const userPrompt = `复盘类型：${type}
完成度：${score}/100

1. 做得最好的：${answers.q1 || '无'}
2. 没做好：${answers.q2 || '无'}
3. 下一步：${answers.q3 || '无'}

请生成总结。`;

  if (!config.key) {
    return localReviewSummary(answers, score);
  }

  try {
    const reply = await callAI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]);
    return reply || localReviewSummary(answers, score);
  } catch (e) {
    console.error('AI 调用失败:', e);
    return localReviewSummary(answers, score) + `\n\n(AI 调用失败: ${e.message})`;
  }
}