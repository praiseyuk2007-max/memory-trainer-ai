// ============================================
// MEMORY TRAINER AI - Main Application Logic (updated UI interactions)
// ============================================

// STATE MANAGEMENT
const state = {
    currentScreen: 'home',
    currentTopic: '',
    currentSession: null,
    difficulty: 'NORMAL',
    readingContent: '',
    questions: [],
    userAnswers: [],
    userWriting: '',
    feedback: '',
    score: 0,
    isReviewMode: false
};

// STORAGE KEYS
const STORAGE_KEY = 'memoryTrainerSessions';
const REVIEW_KEY = 'memoryTrainerReview';

// Knowledge base (same as before)
const knowledgeBase = {
    'Photosynthesis': {
        reading: `Photosynthesis is the process by which plants convert light energy into chemical energy stored in glucose. It occurs primarily in the leaves, specifically in structures called chloroplasts. The process has two main stages: the light-dependent reactions, which occur in the thylakoid membrane and require sunlight, and the light-independent reactions (Calvin cycle), which occur in the stroma and don't require direct light. During the light-dependent reactions, water molecules are split, releasing oxygen as a byproduct, while the light-independent reactions use the energy products from the first stage to convert carbon dioxide into glucose. This glucose serves as food for the plant and is the basis of nearly all life on Earth, as it provides energy for most organisms.`,
        questions: [
            "What are the two main stages of photosynthesis and where do they occur?",
            "Why is photosynthesis essential for life on Earth?",
            "Explain the role of chloroplasts in photosynthesis.",
            "What happens to water molecules during the light-dependent reactions?"
        ],
        sources: ['Wikipedia','Khan Academy','Britannica']
    },
    'DNA Structure': {
        reading: `DNA, or deoxyribonucleic acid, is the molecule that carries genetic instructions for life. It has a double helix structure consisting of two complementary strands twisted together. Each strand is made up of nucleotides, which contain a sugar (deoxyribose), a phosphate group, and a nitrogenous base. There are four types of bases: adenine (A), thymine (T), guanine (G), and cytosine (C). Adenine always pairs with thymine, and guanine always pairs with cytosine, following Chargaff's rules. The two strands are held together by hydrogen bonds between these base pairs. DNA is found primarily in the cell nucleus (nuclear DNA) and also in mitochondria and chloroplasts. The sequence of these bases encodes genetic information and determines the characteristics and functions of living organisms.`,
        questions: [
            "Describe the basic structure of a DNA molecule.",
            "What are the base pairing rules in DNA?",
            "Name the three components of a nucleotide.",
            "Where is DNA primarily located in a cell?"
        ],
        sources: ['Wikipedia','Britannica','Scholar']
    },
    'Neural Networks': {
        reading: `Neural networks are computational models inspired by how biological neurons work in the brain. They consist of interconnected nodes (neurons) organized in layers: an input layer, hidden layers, and an output layer. Each connection between neurons has a weight that determines how strongly one neuron influences another. During training, neural networks learn by adjusting these weights based on errors in their predictions. This process is called backpropagation. Activation functions introduce non-linearity, allowing networks to learn complex patterns. Neural networks excel at tasks like image recognition, natural language processing, and pattern detection. Deep learning refers to neural networks with many hidden layers, enabling them to learn increasingly abstract representations of data.`,
        questions: [
            "What are the main components of a neural network?",
            "Explain what backpropagation does in a neural network.",
            "What is the purpose of activation functions?",
            "How do weights in a neural network affect its behavior?"
        ],
        sources: ['Wikipedia','Verywell','Khan Academy']
    },
    'Mitochondria': {
        reading: `Mitochondria are often called the "powerhouses" of the cell because they produce energy in the form of ATP (adenosine triphosphate). These organelles have a unique double membrane structure: an outer membrane and an inner membrane with many folds called cristae. Mitochondria contain their own DNA and ribosomes, suggesting they originated from ancient bacteria through endosymbiosis. The process of producing ATP involves two main stages: the Krebs cycle (also called the citric acid cycle) and the electron transport chain. During these processes, organic molecules like glucose are broken down, and their energy is used to add phosphate groups to ADP, forming ATP. A single cell can contain hundreds or thousands of mitochondria, with the number varying based on the cell's energy demands.`,
        questions: [
            "Why are mitochondria called the powerhouses of cells?",
            "Describe the structure of a mitochondrion.",
            "What evidence suggests that mitochondria were once independent organisms?",
            "Explain the basic process of ATP production in mitochondria."
        ],
        sources: ['Wikipedia','Britannica']
    },
    'Climate Change': {
        reading: `Climate change refers to long-term shifts in global temperatures and weather patterns, primarily driven by human activities. The main cause is the emission of greenhouse gases, particularly carbon dioxide (CO₂), methane (CH₄), and nitrous oxide (N₂O). These gases trap heat in the atmosphere, preventing it from radiating back into space—a process called the greenhouse effect. Since the Industrial Revolution, atmospheric CO₂ levels have increased by over 40%, primarily from burning fossil fuels. Climate change causes rising sea levels, more frequent extreme weather events, ecosystem disruption, and threats to food security. Mitigation strategies include reducing emissions, increasing renewable energy use, protecting forests, and improving energy efficiency. Adaptation strategies help communities adjust to unavoidable climate changes.`,
        questions: [
            "What are the primary causes of climate change?",
            "Name three greenhouse gases and their sources.",
            "Explain the greenhouse effect and its role in climate change.",
            "What are the differences between mitigation and adaptation strategies?"
        ],
        sources: ['Wikipedia','Britannica','APA']
    }
};

// =========================
// Utilities
// =========================
function getRandomInt(min,max){return Math.floor(Math.random()*(max-min+1))+min}
function getRandomItem(arr){return arr[Math.floor(Math.random()*arr.length)]}

function calculateScore(userWriting){
    let score=5;
    if(userWriting.length>150) score+=2;
    if(userWriting.length>220) score+=1;
    const words = userWriting.toLowerCase().split(/\s+/).filter(Boolean);
    const unique = new Set(words);
    if(words.length && unique.size/words.length>0.6) score+=1;
    if(userWriting.length<50) score=Math.max(0,score-3);
    score+=getRandomInt(-1,1);
    return Math.max(0,Math.min(10,score));
}

function getNextReviewTime(score){ if(score>=8) return {days:7,label:'7+ days'}; if(score>=5) return {days:2,label:'2-3 days'}; return {days:0,label:'Next session'}}

// storage helpers
function saveSession(topic,score,difficulty){
    const session={id:Date.now(),topic,score,difficulty,timestamp:new Date().toISOString(),nextReview:new Date(Date.now()+getNextReviewTime(score).days*24*60*60*1000).toISOString()}
    const sessions=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');sessions.push(session);localStorage.setItem(STORAGE_KEY,JSON.stringify(sessions));updateReviewList(topic,score);return session}

function updateReviewList(topic,score){const reviews=JSON.parse(localStorage.getItem(REVIEW_KEY)||'{}');if(!reviews[topic])reviews[topic]={scores:[],averageScore:0,lastReview:null,nextReview:null};reviews[topic].scores.push(score);reviews[topic].averageScore=reviews[topic].scores.reduce((a,b)=>a+b,0)/reviews[topic].scores.length;reviews[topic].lastReview=new Date().toISOString();reviews[topic].nextReview=new Date(Date.now()+getNextReviewTime(score).days*24*60*60*1000).toISOString();localStorage.setItem(REVIEW_KEY,JSON.stringify(reviews))}

function getWeakTopics(){const reviews=JSON.parse(localStorage.getItem(REVIEW_KEY)||'{}');const now=new Date();return Object.entries(reviews).filter(([t,d])=>new Date(d.nextReview)<=now).slice(0,5)}

function updateReviewBanner(){const weak=getWeakTopics();const banner=document.getElementById('reviewBanner');if(!banner) return; if(weak.length) banner.classList.remove('hidden'); else banner.classList.add('hidden')}

// =========================
// UI helpers
// =========================
function showScreen(id){document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));const el=document.getElementById(id);if(el) el.classList.add('active');state.currentScreen=id}

function renderSources(sources){const container=document.getElementById('sourcesList');if(!container) return;container.innerHTML='';sources.forEach(s=>{const chip=document.createElement('div');chip.className='source-chip';chip.innerHTML=`<span class="icon">${s.charAt(0)}</span><span>${s}</span>`;container.appendChild(chip)})}

// =========================
// Core flow
// =========================
function startSession(topic){state.currentTopic=topic;state.isReviewMode=false;state.currentSession={topic,startTime:Date.now()};showReading(topic)}
function startReviewSession(topic){state.currentTopic=topic;state.isReviewMode=true;showReading(topic)}

function showReading(topic){const kb=knowledgeBase[topic]||Object.values(knowledgeBase)[0];state.readingContent=kb.reading;state.questions=kb.questions.slice(0, getRandomInt(3,5));document.getElementById('readingContent').innerHTML=`<p>${state.readingContent}</p>`;renderSources(kb.sources||['Wikipedia','Khan Academy','Britannica']);updateDifficulty(state.difficulty);showScreen('readingScreen')}

function updateDifficulty(level){state.difficulty=level;document.getElementById('difficultyBadge')?.textContent=level;document.querySelectorAll('.difficulty-card').forEach(c=>{c.classList.toggle('selected', c.dataset.difficulty && c.dataset.difficulty.toUpperCase()===level.toUpperCase())})}

function showRecall(){const container=document.getElementById('questionsContainer');container.innerHTML='';state.userAnswers=[];state.questions.forEach((q,i)=>{const item=document.createElement('div');item.className='question-item';item.innerHTML=`<div class="question-label">Question ${i+1} of ${state.questions.length}</div><div class="question-text">${q}</div><textarea class="question-input" placeholder="Your answer..." data-index="${i}"></textarea>`;container.appendChild(item)});showScreen('recallScreen');document.querySelectorAll('.question-input').forEach(i=>i.addEventListener('input',validateRecallAnswers));}

function validateRecallAnswers(){const inputs=document.querySelectorAll('.question-input');const all=Array.from(inputs).every(i=>i.value.trim().length>0);document.getElementById('submitRecall').disabled=!all}

function collectRecallAnswers(){const inputs=document.querySelectorAll('.question-input');state.userAnswers=Array.from(inputs).map(i=>i.value);showWriting()}

function showWriting(){document.getElementById('writingInput').value='';document.getElementById('charCount').textContent='0';document.getElementById('submitWriting').disabled=true;document.getElementById('writingInput').addEventListener('input',e=>{const l=e.target.value.length;document.getElementById('charCount').textContent=l;document.getElementById('submitWriting').disabled=l<50});showScreen('writingScreen')}

function collectWriting(){state.userWriting=document.getElementById('writingInput').value;showFeedback()}

function showFeedback(){const score=calculateScore(state.userWriting);state.score=score;const reviewTime=getNextReviewTime(score);const feedbackHTML=`<div class="feedback-section"><h3>✅ Your Explanation</h3><p>${state.userWriting}</p></div><div class="feedback-section"><h3>📚 Key Concept (Feynman Style)</h3><p>${generateFeynman(state.currentTopic)}</p></div><div class="feedback-section"><h3>💡 Weak Points</h3>${generateWeakPoints(score)}</div><div class="feedback-section"><h3>🎯 Suggestions</h3><p>${generateSuggestions(score)}</p></div>`;document.getElementById('feedbackContent').innerHTML=feedbackHTML;document.getElementById('scoreValue').textContent=score;document.getElementById('nextReviewText').textContent=`Next review scheduled: ${reviewTime.label}`;saveSession(state.currentTopic,score,state.difficulty);updateReviewBanner();showScreen('feedbackScreen')}

function generateFeynman(topic){const map={'Photosynthesis':'Plants use sunlight to make food from air and water — think of leaves as tiny factories.','DNA Structure':'A twisted ladder of chemical letters that stores biological instructions.','Neural Networks':'A set of connected units that learn by adjusting links based on errors.','Mitochondria':'Cell structures that convert nutrients into usable energy (ATP).','Climate Change':'Earth warming caused by gases that trap heat from sunlight.'};return map[topic]||'A clear, simple summary of the main idea.'}

function generateWeakPoints(score){if(score>=8) return '<p class="weak-point">🌟 Excellent — clear and accurate.</p>'; if(score>=5) return '<p class="weak-point">⚠️ Some details missing. Focus on definitions and one example.</p>'; return '<p class="weak-point">⚠️ Core points missing. Revisit the reading and try again next session.</p>'}
function generateSuggestions(){const s=['Use a short example to anchor the idea.','Explain it out loud like you would to a friend.','Break it into two smaller parts and practice each.'];return getRandomItem(s)}

function showReviewList(){const weakTopics=Object.entries(JSON.parse(localStorage.getItem(REVIEW_KEY)||'{}'));const reviewList=document.getElementById('reviewList');const noReview=document.getElementById('noReview');if(weakTopics.length===0){reviewList.innerHTML='';noReview.style.display='block'}else{noReview.style.display='none';reviewList.innerHTML=weakTopics.map(([topic,data])=>{const avg=(data.averageScore|| (data.scores? data.scores.reduce((a,b)=>a+b,0)/data.scores.length:0)).toFixed(1);let badge='🔶';return `<div class="review-item" onclick="startReviewSession('${topic.replace(/'/g,"\\'")}')"><div><div style="font-weight:700">${topic}</div><div style="color:var(--subtext);font-size:13px">Avg score: ${avg}/10</div></div><div>${badge}</div></div>`}).join('')}
showScreen('reviewScreen')}

// =========================
// Event wiring
// =========================

document.addEventListener('DOMContentLoaded',()=>{
    updateReviewBanner();
    // start
    document.getElementById('startBtn').addEventListener('click',()=>{const t=document.getElementById('topicInput').value.trim();if(!t){alert('Please enter a topic');return}startSession(t)})
    document.getElementById('topicInput').addEventListener('keypress',e=>{if(e.key==='Enter') document.getElementById('startBtn').click()})
    document.querySelectorAll('.quick-btn').forEach(btn=>btn.addEventListener('click',()=>startSession(btn.dataset.topic)));
    document.getElementById('randomBtn').addEventListener('click',()=>{const topics=Object.keys(knowledgeBase);const pick=getRandomItem(topics);document.getElementById('topicInput').value=pick})
    document.getElementById('reviewBtn').addEventListener('click',showReviewList)

    // difficulty cards
    document.querySelectorAll('.difficulty-card').forEach(card=>{card.addEventListener('click',()=>{document.querySelectorAll('.difficulty-card').forEach(c=>c.classList.remove('selected'));card.classList.add('selected');updateDifficulty(card.dataset.difficulty)})})

    // reading
    document.getElementById('backFromReading').addEventListener('click',()=>showScreen('homeScreen'))
    document.getElementById('continueFromReading').addEventListener('click',showRecall)

    // recall
    document.getElementById('backFromRecall').addEventListener('click',showReading.bind(null,state.currentTopic))
    document.getElementById('submitRecall').addEventListener('click',collectRecallAnswers)

    // hint
    document.getElementById('hintBtn')?.addEventListener('click',()=>{const hint='Recall the main definition and one concrete example — that should guide you.';alert(hint)})

    // writing
    document.getElementById('backFromWriting').addEventListener('click',showRecall)
    document.getElementById('submitWriting').addEventListener('click',collectWriting)

    // feedback
    document.getElementById('nextTopic').addEventListener('click',()=>{document.getElementById('topicInput').value='';showScreen('homeScreen');updateReviewBanner()})
    document.getElementById('reviewAgain').addEventListener('click',()=>showScreen('homeScreen'))

    // review screen
    document.getElementById('backFromReview').addEventListener('click',()=>showScreen('homeScreen'))
});

// initial banner update
updateReviewBanner();
