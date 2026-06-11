// ============================================
// MEMORY TRAINER AI - Main Application Logic
// ============================================

// STATE MANAGEMENT
const state = {
    currentScreen: 'home',
    currentTopic: '',
    currentSession: null,
    difficulty: 'NORMAL',
    allSessions: [],
    readingContent: '',
    questions: [],
    userAnswers: [],
    userWriting: '',
    feedback: '',
    score: 0,
    isReviewMode: false,
    currentReviewIndex: 0
};

// STORAGE KEYS
const STORAGE_KEY = 'memoryTrainerSessions';
const REVIEW_KEY = 'memoryTrainerReview';

// KNOWLEDGE BASE - Academic Explanations
const knowledgeBase = {
    'Photosynthesis': {
        reading: `Photosynthesis is the process by which plants convert light energy into chemical energy stored in glucose. It occurs primarily in the leaves, specifically in structures called chloroplasts. The process has two main stages: the light-dependent reactions, which occur in the thylakoid membrane and require sunlight, and the light-independent reactions (Calvin cycle), which occur in the stroma and don't require direct light. During the light-dependent reactions, water molecules are split, releasing oxygen as a byproduct, while the light-independent reactions use the energy products from the first stage to convert carbon dioxide into glucose. This glucose serves as food for the plant and is the basis of nearly all life on Earth, as it provides energy for most organisms.`,
        questions: [
            "What are the two main stages of photosynthesis and where do they occur?",
            "Why is photosynthesis essential for life on Earth?",
            "Explain the role of chloroplasts in photosynthesis.",
            "What happens to water molecules during the light-dependent reactions?"
        ]
    },
    'DNA Structure': {
        reading: `DNA, or deoxyribonucleic acid, is the molecule that carries genetic instructions for life. It has a double helix structure consisting of two complementary strands twisted together. Each strand is made up of nucleotides, which contain a sugar (deoxyribose), a phosphate group, and a nitrogenous base. There are four types of bases: adenine (A), thymine (T), guanine (G), and cytosine (C). Adenine always pairs with thymine, and guanine always pairs with cytosine, following Chargaff's rules. The two strands are held together by hydrogen bonds between these base pairs. DNA is found primarily in the cell nucleus (nuclear DNA) and also in mitochondria and chloroplasts. The sequence of these bases encodes genetic information and determines the characteristics and functions of living organisms.`,
        questions: [
            "Describe the basic structure of a DNA molecule.",
            "What are the base pairing rules in DNA?",
            "Name the three components of a nucleotide.",
            "Where is DNA primarily located in a cell?"
        ]
    },
    'Neural Networks': {
        reading: `Neural networks are computational models inspired by how biological neurons work in the brain. They consist of interconnected nodes (neurons) organized in layers: an input layer, hidden layers, and an output layer. Each connection between neurons has a weight that determines how strongly one neuron influences another. During training, neural networks learn by adjusting these weights based on errors in their predictions. This process is called backpropagation. Activation functions introduce non-linearity, allowing networks to learn complex patterns. Neural networks excel at tasks like image recognition, natural language processing, and pattern detection. Deep learning refers to neural networks with many hidden layers, enabling them to learn increasingly abstract representations of data.`,
        questions: [
            "What are the main components of a neural network?",
            "Explain what backpropagation does in a neural network.",
            "What is the purpose of activation functions?",
            "How do weights in a neural network affect its behavior?"
        ]
    },
    'Mitochondria': {
        reading: `Mitochondria are often called the "powerhouses" of the cell because they produce energy in the form of ATP (adenosine triphosphate). These organelles have a unique double membrane structure: an outer membrane and an inner membrane with many folds called cristae. Mitochondria contain their own DNA and ribosomes, suggesting they originated from ancient bacteria through endosymbiosis. The process of producing ATP involves two main stages: the Krebs cycle (also called the citric acid cycle) and the electron transport chain. During these processes, organic molecules like glucose are broken down, and their energy is used to add phosphate groups to ADP, forming ATP. A single cell can contain hundreds or thousands of mitochondria, with the number varying based on the cell's energy demands.`,
        questions: [
            "Why are mitochondria called the powerhouses of cells?",
            "Describe the structure of a mitochondrion.",
            "What evidence suggests that mitochondria were once independent organisms?",
            "Explain the basic process of ATP production in mitochondria."
        ]
    },
    'Climate Change': {
        reading: `Climate change refers to long-term shifts in global temperatures and weather patterns, primarily driven by human activities. The main cause is the emission of greenhouse gases, particularly carbon dioxide (CO₂), methane (CH₄), and nitrous oxide (N₂O). These gases trap heat in the atmosphere, preventing it from radiating back into space—a process called the greenhouse effect. Since the Industrial Revolution, atmospheric CO₂ levels have increased by over 40%, primarily from burning fossil fuels. Climate change causes rising sea levels, more frequent extreme weather events, ecosystem disruption, and threats to food security. Mitigation strategies include reducing emissions, increasing renewable energy use, protecting forests, and improving energy efficiency. Adaptation strategies help communities adjust to unavoidable climate changes.`,
        questions: [
            "What are the primary causes of climate change?",
            "Name three greenhouse gases and their sources.",
            "Explain the greenhouse effect and its role in climate change.",
            "What are the differences between mitigation and adaptation strategies?"
        ]
    }
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

function getRandomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function generateQuestionsForTopic(topic) {
    const kb = knowledgeBase[topic];
    if (!kb) return generateDefaultQuestions(topic);
    
    // Return 3-4 random questions from the knowledge base
    const shuffled = kb.questions.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, getRandomInt(3, 5));
}

function generateDefaultQuestions(topic) {
    return [
        `What are the main characteristics of ${topic}?`,
        `Explain how ${topic} works or functions.`,
        `Why is ${topic} important in its field?`,
        `What are the key differences or variations within ${topic}?`
    ];
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function calculateScore(userWriting) {
    // Simplified score calculation based on writing quality
    let score = 5; // Base score
    
    // Longer writing = more effort = higher score
    if (userWriting.length > 150) score += 2;
    if (userWriting.length > 200) score += 1;
    
    // Variety of words (simple heuristic)
    const words = userWriting.toLowerCase().split(/\s+/);
    const uniqueWords = new Set(words);
    if (uniqueWords.size > words.length * 0.6) score += 1;
    
    // Penalty for very short responses
    if (userWriting.length < 50) score = Math.max(0, score - 3);
    
    // Random variance for realism (±1 point)
    score += getRandomInt(-1, 1);
    
    return Math.max(0, Math.min(10, score));
}

function getNextReviewTime(score) {
    if (score >= 8) return { days: 7, label: '7+ days' };
    if (score >= 5) return { days: 2, label: '2-3 days' };
    return { days: 0, label: 'Next session' };
}

function saveSession(topic, score, difficulty) {
    const session = {
        id: Date.now(),
        topic,
        score,
        difficulty,
        timestamp: new Date().toISOString(),
        nextReview: new Date(Date.now() + getNextReviewTime(score).days * 24 * 60 * 60 * 1000).toISOString()
    };
    
    const sessions = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    sessions.push(session);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    
    // Update review tracking
    updateReviewList(topic, score);
    
    return session;
}

function updateReviewList(topic, score) {
    const reviews = JSON.parse(localStorage.getItem(REVIEW_KEY) || '{}');
    
    if (!reviews[topic]) {
        reviews[topic] = {
            scores: [],
            averageScore: 0,
            lastReview: null,
            nextReview: null
        };
    }
    
    reviews[topic].scores.push(score);
    reviews[topic].averageScore = reviews[topic].scores.reduce((a, b) => a + b, 0) / reviews[topic].scores.length;
    reviews[topic].lastReview = new Date().toISOString();
    reviews[topic].nextReview = new Date(Date.now() + getNextReviewTime(score).days * 24 * 60 * 60 * 1000).toISOString();
    
    localStorage.setItem(REVIEW_KEY, JSON.stringify(reviews));
}

function getWeakTopics() {
    const reviews = JSON.parse(localStorage.getItem(REVIEW_KEY) || '{}');
    const now = new Date();
    
    return Object.entries(reviews)
        .filter(([topic, data]) => {
            const nextReview = new Date(data.nextReview);
            return nextReview <= now;
        })
        .sort((a, b) => b[1].averageScore - a[1].averageScore)
        .slice(0, 5);
}

function updateReviewBanner() {
    const weakTopics = getWeakTopics();
    const reviewBanner = document.getElementById('reviewBanner');
    
    if (weakTopics.length > 0) {
        reviewBanner.classList.remove('hidden');
    } else {
        reviewBanner.classList.add('hidden');
    }
}

// ============================================
// SCREEN NAVIGATION
// ============================================

function showScreen(screenName) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenName).classList.add('active');
    state.currentScreen = screenName;
}

function startSession(topic) {
    state.currentTopic = topic;
    state.isReviewMode = false;
    state.currentSession = {
        topic,
        startTime: Date.now()
    };
    
    showReading(topic);
}

function startReviewSession(topic) {
    state.currentTopic = topic;
    state.isReviewMode = true;
    
    showReading(topic);
}

// ============================================
// SCREEN CONTENT GENERATORS
// ============================================

function showReading(topic) {
    const kb = knowledgeBase[topic] || knowledgeBase['Photosynthesis'];
    state.readingContent = kb.reading;
    state.questions = generateQuestionsForTopic(topic);
    
    document.getElementById('readingContent').innerHTML = `<p>${state.readingContent}</p>`;
    
    // Simulate difficulty selection
    updateDifficulty('NORMAL');
    
    showScreen('readingScreen');
}

function updateDifficulty(level) {
    state.difficulty = level;
    document.getElementById('difficultyBadge').textContent = level;
    document.getElementById('difficultyBadge').className = `badge badge-${level.toLowerCase()}`;
}

function showRecall() {
    const container = document.getElementById('questionsContainer');
    container.innerHTML = '';
    state.userAnswers = [];
    
    state.questions.forEach((question, index) => {
        const questionItem = document.createElement('div');
        questionItem.className = 'question-item';
        questionItem.innerHTML = `
            <div class="question-label">Question ${index + 1} of ${state.questions.length}</div>
            <div class="question-text">${question}</div>
            <textarea class="question-input" placeholder="Your answer..." data-index="${index}"></textarea>
        `;
        container.appendChild(questionItem);
    });
    
    showScreen('recallScreen');
    
    // Enable submit button when all questions have answers
    document.querySelectorAll('.question-input').forEach(input => {
        input.addEventListener('input', validateRecallAnswers);
    });
}

function validateRecallAnswers() {
    const inputs = document.querySelectorAll('.question-input');
    const allAnswered = Array.from(inputs).every(input => input.value.trim().length > 0);
    document.getElementById('submitRecall').disabled = !allAnswered;
}

function collectRecallAnswers() {
    const inputs = document.querySelectorAll('.question-input');
    state.userAnswers = Array.from(inputs).map(input => input.value);
    showWriting();
}

function showWriting() {
    document.getElementById('writingInput').value = '';
    document.getElementById('charCount').textContent = '0';
    document.getElementById('submitWriting').disabled = true;
    
    document.getElementById('writingInput').addEventListener('input', (e) => {
        const length = e.target.value.length;
        document.getElementById('charCount').textContent = length;
        document.getElementById('submitWriting').disabled = length < 50;
    });
    
    showScreen('writingScreen');
}

function collectWriting() {
    state.userWriting = document.getElementById('writingInput').value;
    showFeedback();
}

function showFeedback() {
    const score = calculateScore(state.userWriting);
    state.score = score;
    
    const reviewTime = getNextReviewTime(score);
    
    const feedbackHTML = `
        <div class="feedback-section">
            <h3>✅ Your Explanation</h3>
            <p>${state.userWriting}</p>
        </div>
        
        <div class="feedback-section">
            <h3>📚 Key Concept (Feynman Style)</h3>
            <p>Think of ${state.currentTopic.toLowerCase()} like this: when explaining to a friend, you focus on the essentials without complex terminology. The core idea is: ${generateSimplifiedExplanation(state.currentTopic)}.</p>
        </div>
        
        <div class="feedback-section">
            <h3>💡 Weak Points</h3>
            ${generateWeakPoints(score)}
        </div>
        
        <div class="feedback-section">
            <h3>🎯 Suggestions</h3>
            <p>${generateSuggestions(score)}</p>
        </div>
    `;
    
    document.getElementById('feedbackContent').innerHTML = feedbackHTML;
    document.getElementById('scoreValue').textContent = score;
    document.getElementById('nextReviewText').textContent = `Next review scheduled: ${reviewTime.label}`;
    
    // Save session
    saveSession(state.currentTopic, score, state.difficulty);
    
    showScreen('feedbackScreen');
}

function generateSimplifiedExplanation(topic) {
    const explanations = {
        'Photosynthesis': 'plants use sunlight to make their own food from air and water',
        'DNA Structure': 'a twisted ladder made of chemical letters that stores instructions for life',
        'Neural Networks': 'computer systems that learn patterns by adjusting connections like a brain does',
        'Mitochondria': 'tiny energy factories inside cells that convert food into usable energy',
        'Climate Change': 'long-term warming of Earth caused by gases that trap heat from the sun'
    };
    
    return explanations[topic] || 'the key concept that explains how things work';
}

function generateWeakPoints(score) {
    const points = [
        { score: 0, text: 'Missing core definitions and key terms' },
        { score: 1, text: 'Incomplete understanding of main mechanisms' },
        { score: 2, text: 'Lacking specific examples and details' },
        { score: 3, text: 'Could be more concise and focused' }
    ];
    
    if (score >= 8) return '<p class="weak-point">🌟 Excellent! Your explanation is comprehensive and accurate.</p>';
    
    const relevantPoints = points.filter(p => p.score <= Math.floor((10 - score) / 2.5));
    return relevantPoints.map(p => `<p class="weak-point">⚠️ ${p.text}</p>`).join('');
}

function generateSuggestions(score) {
    const suggestions = [
        'Try using simpler language to explain the concept',
        'Connect this concept to real-world examples',
        'Practice explaining this concept multiple times',
        'Break the concept down into smaller parts',
        'Compare this concept with similar ones'
    ];
    
    return getRandomItem(suggestions);
}

function showReviewList() {
    const weakTopics = getWeakTopics();
    const reviewList = document.getElementById('reviewList');
    const noReview = document.getElementById('noReview');
    
    if (weakTopics.length === 0) {
        reviewList.innerHTML = '';
        noReview.style.display = 'block';
    } else {
        noReview.style.display = 'none';
        reviewList.innerHTML = weakTopics.map(([topic, data]) => {
            let badge = 'badge-soon';
            let urgency = '📚 Review Soon';
            
            if (data.averageScore < 5) {
                badge = 'badge-urgent';
                urgency = '🔴 Review Urgent';
            } else if (data.averageScore < 7) {
                badge = 'badge-soon';
                urgency = '🟡 Review Soon';
            }
            
            return `
                <div class="review-item" onclick="startReviewSession('${topic}')">
                    <div class="review-item-info">
                        <div class="review-item-title">${topic}</div>
                        <div class="review-item-meta">Avg score: ${data.averageScore.toFixed(1)}/10</div>
                    </div>
                    <span class="review-item-badge ${badge}">${urgency}</span>
                </div>
            `;
        }).join('');
    }
    
    showScreen('reviewScreen');
}

// ============================================
// EVENT LISTENERS
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    updateReviewBanner();
    
    // HOME SCREEN
    document.getElementById('startBtn').addEventListener('click', () => {
        const topic = document.getElementById('topicInput').value.trim();
        if (topic) {
            startSession(topic);
        } else {
            alert('Please enter a topic');
        }
    });
    
    document.getElementById('topicInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('startBtn').click();
        }
    });
    
    document.querySelectorAll('.quick-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            startSession(btn.dataset.topic);
        });
    });
    
    document.getElementById('reviewBtn').addEventListener('click', showReviewList);
    
    // READING SCREEN
    document.getElementById('backFromReading').addEventListener('click', () => showScreen('homeScreen'));
    document.getElementById('continueFromReading').addEventListener('click', showRecall);
    
    // RECALL SCREEN
    document.getElementById('backFromRecall').addEventListener('click', showRecall);
    document.getElementById('submitRecall').addEventListener('click', collectRecallAnswers);
    
    // WRITING SCREEN
    document.getElementById('backFromWriting').addEventListener('click', showWriting);
    document.getElementById('submitWriting').addEventListener('click', collectWriting);
    
    // FEEDBACK SCREEN
    document.getElementById('nextTopic').addEventListener('click', () => {
        document.getElementById('topicInput').value = '';
        showScreen('homeScreen');
        updateReviewBanner();
    });
    
    document.getElementById('reviewAgain').addEventListener('click', () => {
        showScreen('homeScreen');
    });
    
    // REVIEW SCREEN
    document.getElementById('backFromReview').addEventListener('click', () => {
        showScreen('homeScreen');
    });
});

// Initial setup
updateReviewBanner();