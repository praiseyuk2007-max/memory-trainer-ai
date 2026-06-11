// ============================================
// MEMORY TRAINER AI - Online integration: Google CSE + Gemini + grader
// Added: performOnlineGeneration now performs live Google CSE & Gemini calls when keys exist
// Added: evaluateAnswer uses Gemini for online grading when available, otherwise offline heuristic
// Note: API keys are read from localStorage via the key manager. Do NOT hard-code keys here.
// ============================================

// Keep previous helper functions and state loaded from app.js / other bundles

async function performOnlineGeneration(topic){
  // Purpose: return { reading, questions, sources }
  // 1) Try Google CSE (if key available) to gather sources/snippets
  // 2) Try Gemini Generative API (if key available) to generate reading & questions
  // 3) Fallback to synthesizeOfflineReading / knowledgeBase

  const keys = loadKeys();
  const googleKey = keys.find(k => k.type === 'google');
  const genKey = keys.find(k => k.type === 'gen');
  const model = getSavedModel();

  let sources = [];
  // 1) Google CSE
  if(googleKey && googleKey.value && googleKey.extra){
    try{
      const apiKey = encodeURIComponent(googleKey.value.trim());
      const cseId = encodeURIComponent(googleKey.extra.trim());
      const q = encodeURIComponent(topic);
      const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cseId}&q=${q}&num=5`;
      const res = await fetch(url);
      if(res.ok){
        const json = await res.json();
        if(json.items && json.items.length){
          json.items.forEach(it => {
            sources.push({ source: it.displayLink || it.title || 'Search', title: it.title || '', excerpt: (it.snippet||''), url: it.link || it.formattedUrl });
          });
        }
      } else {
        console.warn('Google CSE failed', res.status);
      }
    }catch(e){ console.warn('Google CSE error', e); }
  }

  // 2) Gemini (Generative) - build a prompt and call model if key exists
  if(genKey && genKey.value){
    try{
      // Build the prompt: ask for a 5-8 sentence reading + 4 recall questions + list of sources used
      const system = `You are an educational assistant. Produce a concise 5-8 sentence reading passage about the topic, followed by 4 active-recall questions (short open-ended). Include a JSON block with keys: reading (string), questions (array of strings), sources (array of objects with name and url if available). Answer in JSON only.`;
      const user = `Topic: ${topic}\nPlease respond with a JSON object: {"reading": "...", "questions": ["..."], "sources": [{"name":"...","url":"..."}]}`;

      // Use Google Generative API REST endpoint form. Many deployments accept API key as query param. If different auth is required, the request may fail and we fallback.
      const apiKey = genKey.value.trim();
      const modelId = encodeURIComponent(model || 'gemini-3.1-flash-lite');
      const url = `https://generativelanguage.googleapis.com/v1beta2/models/${modelId}:generateText?key=${encodeURIComponent(apiKey)}`;

      const body = {
        "prompt": {
          "text": system + "\n\n" + user
        },
        "temperature": 0.2,
        "maxOutputTokens": 600
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if(res.ok){
        const data = await res.json();
        // attempt to extract generated text
        const text = (data?.candidates && data.candidates[0] && data.candidates[0].output) || data?.output?.[0]?.content?.[0]?.text || data?.candidates?.[0]?.content?.text || null;
        let parsed = null;
        if(text){
          // Try to find JSON substring
          const jStart = text.indexOf('{');
          const jEnd = text.lastIndexOf('}');
          if(jStart >=0 && jEnd>jStart){
            const substr = text.slice(jStart, jEnd+1);
            try{ parsed = JSON.parse(substr); } catch(e){ console.warn('Could not parse JSON from model output', e); }
          }
        }
        if(parsed){
          const reading = parsed.reading || (parsed.text || '');
          const questions = parsed.questions || parsed.qs || [];
          const modelSources = (parsed.sources || []).map(s => ({ title: s.name || s.title || s.source, excerpt: s.excerpt || '', url: s.url || '' }));
          // merge sources (google + modelSources)
          const mergedSources = [...modelSources];
          sources.forEach(s => { if(!mergedSources.find(ms => ms.url === s.url)) mergedSources.push(s); });
          // cache relevant excerpts
          mergedSources.forEach(s => { if(s.excerpt){ addToCache(topic, s.excerpt); } });
          return { reading, questions, sources: mergedSources };
        } else {
          // fallback to text as reading and use CSE sources
          const readingText = data?.candidates?.[0]?.content?.map(c=>c.text||'').join('\n') || 'AI generated reading.';
          return { reading: readingText, questions: generateQuestionsForTopic(topic), sources };
        }
      } else {
        console.warn('Gemini API call failed', res.status);
      }

    } catch(e){ console.warn('Gemini call error', e); }
  }

  // 3) Fallback
  // If we have Google CSE sources, try to construct a reading from snippet + knowledgeBase
  if(sources && sources.length){
    const snippet = sources[0].excerpt || sources[0].title || '';
    const reading = synthesizeOfflineReading(topic) || (knowledgeBase[topic] && knowledgeBase[topic].reading) || snippet || `Overview of ${topic}.`;
    const questions = generateQuestionsForTopic(topic);
    // cache first snippet
    if(sources[0].excerpt) addToCache(topic, sources[0].excerpt);
    return { reading, questions, sources };
  }

  // 4) Last fallback: knowledgeBase or synthesized offline
  const kb = knowledgeBase[topic];
  const reading = synthesizeOfflineReading(topic) || (kb && kb.reading) || `No summary available for ${topic}.`;
  const questions = generateQuestionsForTopic(topic);
  const kbSources = (kb && kb.sources) ? kb.sources.map(n=>({title:n,url:SOURCE_URLS[n]||'#'})) : [];
  return { reading, questions, sources: kbSources };
}

// Evaluate answer: prefer online model-based grading if Gemini key present
async function evaluateAnswer(topic, userAnswer){
  const keys = loadKeys();
  const genKey = keys.find(k => k.type === 'gen');
  const model = getSavedModel();

  // Offline heuristic grader
  function offlineGrade(topic, answer){
    const kb = knowledgeBase[topic] || {};
    const text = (kb.reading || '').toLowerCase();
    const expected = new Set((text.match(/\b[a-z]{4,}\b/g)||[])); // naive keywords
    const tokens = (answer||'').toLowerCase().match(/\b[a-z]{3,}\b/g)||[];
    const matches = tokens.filter(t=>expected.has(t));
    const score = Math.round(Math.min(10, (matches.length / Math.max(1, expected.size)) * 10));
    const feedback = [];
    if(score < 6) feedback.push('Some key concepts are missing — try including the main definition and one example.');
    else feedback.push('Good: your answer contains several important keywords.');
    return { score, feedback };
  }

  // If we have Gemini key, attempt online grading
  if(genKey && genKey.value){
    try{
      const apiKey = genKey.value.trim();
      const modelId = encodeURIComponent(model || 'gemini-3.1-flash-lite');
      const url = `https://generativelanguage.googleapis.com/v1beta2/models/${modelId}:generateText?key=${encodeURIComponent(apiKey)}`;
      const prompt = `You are an expert grader. Topic: ${topic}. User answer: "${userAnswer}".\nGive a score 0-10 and list 2 brief weak points and a concise explanation of what was missing. Return JSON: {"score": number, "weak_points": ["..."], "explanation":"..."}`;
      const body = { prompt: { text: prompt }, temperature: 0.0, maxOutputTokens: 200 };
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(body) });
      if(res.ok){
        const data = await res.json();
        const text = (data?.candidates?.[0]?.content?.map(c=>c.text).join('')) || data?.candidates?.[0]?.output || null;
        if(text){
          // extract JSON
          const jStart = text.indexOf('{'); const jEnd = text.lastIndexOf('}');
          if(jStart>=0 && jEnd>jStart){
            const substr = text.slice(jStart, jEnd+1);
            try{ const parsed = JSON.parse(substr); return { score: parsed.score||0, feedback: parsed.weak_points||[parsed.explanation||''] } catch(e){ console.warn('grading parse error', e); }
          }
        }
      } else {
        console.warn('Online grading failed', res.status);
      }
    } catch(e){ console.warn('grading error', e); }
  }

  // fallback: offline heuristic
  return offlineGrade(topic, userAnswer);
}

// Hook evaluation into showFeedback path
async function showFeedback(){
  // grade user's writing
  const gradeResult = await evaluateAnswer(state.currentTopic, state.userWriting);
  const score = gradeResult.score || calculateScore(state.userWriting);
  state.score = score;
  const reviewTime = getNextReviewTime(score);
  const feedbackHTML = `
    <div class="feedback-section">
      <h3>✅ Your Explanation</h3>
      <p>${state.userWriting}</p>
    </div>
    <div class="feedback-section">
      <h3>📚 Grader Feedback</h3>
      <p>Score: <strong>${score}</strong>/10</p>
      <ul>${(gradeResult.feedback||[]).map(f=>`<li>${escapeHtml(f)}</li>`).join('')}</ul>
    </div>
    <div class="feedback-section">
      <h3>📚 Key Concept (Feynman Style)</h3>
      <p>${generateFeynman(state.currentTopic)}</p>
    </div>
    <div class="feedback-section">
      <h3>🎯 Suggestions</h3>
      <p>${generateSuggestions()}</p>
    </div>
  `;
  document.getElementById('feedbackContent').innerHTML = feedbackHTML;
  document.getElementById('scoreValue').textContent = score;
  document.getElementById('nextReviewText').textContent = `Next review scheduled: ${reviewTime.label}`;
  saveSession(state.currentTopic, score, state.difficulty);
  updateReviewBanner();
  showScreen('feedbackScreen');
}

// Export some functions for debugging in console
window.performOnlineGeneration = performOnlineGeneration;
window.evaluateAnswer = evaluateAnswer;
