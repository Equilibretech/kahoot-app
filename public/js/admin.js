const socket = io();

let currentGameCode = '';
let gameState = 'setup';
let currentQuestionIndex = 0;
let totalQuestions = 3;
let availableQuizzes = [];
let selectedQuiz = null;
let currentGameQuestions = [];

function showScreen(screenId) {
    const screens = ['setup-screen', 'game-lobby', 'game-control', 'game-results'];
    screens.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.classList.add('hidden');
        }
    });
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.remove('hidden');
    }
}

async function loadQuizzes() {
    try {
        const response = await fetch('/api/quizzes');
        const quizzes = await response.json();
        availableQuizzes = quizzes;
        
        const selector = document.getElementById('quiz-selector');
        selector.innerHTML = '<option value="">Sélectionner un quiz...</option>';
        
        quizzes.forEach(quiz => {
            const option = document.createElement('option');
            option.value = quiz.id;
            option.textContent = quiz.title;
            selector.appendChild(option);
        });
        
        if (quizzes.length === 0) {
            selector.innerHTML = '<option value="">Aucun quiz disponible - Créez-en un !</option>';
        }
    } catch (error) {
        console.error('Erreur lors du chargement des quiz:', error);
        document.getElementById('quiz-selector').innerHTML = '<option value="">Erreur de chargement</option>';
    }
}

function showQuizSelection() {
    console.log('showQuizSelection called');
    const quizSelection = document.getElementById('quiz-selection');
    if (quizSelection) {
        quizSelection.classList.remove('hidden');
        console.log('Quiz selection shown');
        loadQuizzes();
    } else {
        console.error('quiz-selection element not found');
    }
}

function showQuizList() {
    document.getElementById('quiz-list-admin').classList.remove('hidden');
    document.getElementById('setup-screen').style.display = 'none';
    loadQuizzesForList();
}

function hideQuizList() {
    document.getElementById('quiz-list-admin').classList.add('hidden');
    document.getElementById('setup-screen').style.display = 'block';
}

async function loadQuizzesForList() {
    try {
        const response = await fetch('/api/quizzes');
        const quizzes = await response.json();
        displayQuizListAdmin(quizzes);
    } catch (error) {
        console.error('Erreur lors du chargement des quiz:', error);
    }
}

function displayQuizListAdmin(quizzes) {
    const container = document.getElementById('admin-quiz-list-container');
    container.innerHTML = '';
    
    if (quizzes.length === 0) {
        container.innerHTML = '<p>Aucun quiz créé pour le moment.</p>';
        return;
    }
    
    quizzes.forEach(quiz => {
        const quizCard = document.createElement('div');
        quizCard.style.cssText = `
            background: white;
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 15px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        `;
        
        quizCard.innerHTML = `
            <h4 style="margin: 0 0 10px 0; color: #333;">${quiz.title}</h4>
            <p style="margin: 0 0 15px 0; color: #666;">${quiz.description || 'Pas de description'}</p>
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #888; font-size: 0.9em;">
                    ${quiz.questions.length} questions • 
                    Créé le ${new Date(quiz.createdAt).toLocaleDateString()}
                </span>
                <div>
                    <button onclick="selectQuizForGame('${quiz.id}')" style="background: #667eea; color: white; border: none; padding: 8px 12px; border-radius: 4px; margin-right: 5px; cursor: pointer;">
                        Utiliser ce quiz
                    </button>
                </div>
            </div>
        `;
        
        container.appendChild(quizCard);
    });
}

function selectQuizForGame(quizId) {
    // Retourner à la sélection et pré-sélectionner le quiz
    hideQuizList();
    showQuizSelection();
    
    // Pré-sélectionner le quiz dans le dropdown
    setTimeout(() => {
        const selector = document.getElementById('quiz-selector');
        if (selector) {
            selector.value = quizId;
            onQuizSelected();
        }
    }, 500);
}

function onQuizSelected() {
    const selector = document.getElementById('quiz-selector');
    const quizId = selector.value;
    const createBtn = document.getElementById('create-game-btn');
    
    if (!quizId) {
        createBtn.disabled = true;
        document.getElementById('quiz-preview').classList.add('hidden');
        selectedQuiz = null;
        return;
    }
    
    selectedQuiz = availableQuizzes.find(q => q.id === quizId);
    
    if (selectedQuiz) {
        document.getElementById('quiz-title-preview').textContent = selectedQuiz.title;
        document.getElementById('quiz-description-preview').textContent = selectedQuiz.description || 'Pas de description';
        document.getElementById('quiz-questions-count').textContent = `${selectedQuiz.questions.length} questions`;
        document.getElementById('quiz-preview').classList.remove('hidden');
        createBtn.disabled = false;
    }
}

function createGame() {
    if (!selectedQuiz) {
        alert('Veuillez sélectionner un quiz avant de créer le jeu');
        return;
    }
    
    const hostName = document.getElementById('host-name').value.trim() || 'Admin';
    
    fetch('/api/create-game', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
            host: hostName,
            quizId: selectedQuiz.id
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            alert(data.error);
            return;
        }
        
        currentGameCode = data.gameCode;
        currentGameQuestions = selectedQuiz.questions;
        totalQuestions = selectedQuiz.questions.length;
        
        document.getElementById('display-game-code').textContent = data.gameCode;
        showScreen('game-lobby');
        
        socket.emit('admin-join', currentGameCode);
    })
    .catch(error => {
        console.error('Erreur lors de la création du jeu:', error);
        alert('Erreur lors de la création du jeu');
    });
}

function startGame() {
    if (currentGameCode) {
        socket.emit('start-game', currentGameCode);
        gameState = 'playing';
        showScreen('game-control');
        
        setTimeout(() => {
            displayCurrentQuestion();
        }, 2000);
    }
}

function displayCurrentQuestion() {
    if (!currentGameQuestions || currentQuestionIndex >= currentGameQuestions.length) {
        console.error('Questions non disponibles');
        return;
    }
    
    const question = currentGameQuestions[currentQuestionIndex];
    document.getElementById('admin-question-text').textContent = question.question;
    document.getElementById('admin-question-number').textContent = currentQuestionIndex + 1;
    document.getElementById('admin-total-questions').textContent = totalQuestions;
    
    const optionsList = document.getElementById('admin-options-list');
    optionsList.innerHTML = '';
    
    question.options.forEach((option, index) => {
        const li = document.createElement('li');
        li.textContent = option;
        if (index === question.correct) {
            li.classList.add('correct-answer');
        }
        optionsList.appendChild(li);
    });
}

function nextQuestion() {
    currentQuestionIndex++;
    
    if (currentQuestionIndex >= totalQuestions) {
        gameState = 'finished';
        showScreen('game-results');
        return;
    }
    
    socket.emit('next-question', currentGameCode);
    
    setTimeout(() => {
        displayCurrentQuestion();
    }, 1000);
}

function endGame() {
    if (confirm('Êtes-vous sûr de vouloir terminer le jeu ?')) {
        gameState = 'finished';
        showScreen('game-results');
    }
}

function updatePlayersDisplay(players, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '';
    
    players.forEach(player => {
        const playerCard = document.createElement('div');
        playerCard.className = 'player-card';
        playerCard.innerHTML = `
            <div style="font-weight: bold;">${player.name}</div>
            <div style="color: #666; font-size: 0.9em;">Score: ${player.score || 0}</div>
        `;
        container.appendChild(playerCard);
    });
}

socket.on('player-joined', (data) => {
    document.getElementById('admin-players-count').textContent = data.totalPlayers;
    
    if (gameState === 'waiting') {
        const mockPlayers = Array.from({length: data.totalPlayers}, (_, i) => ({
            name: `Joueur ${i + 1}`,
            score: 0
        }));
        updatePlayersDisplay(mockPlayers, 'players-grid');
    }
});

socket.on('player-left', (data) => {
    document.getElementById('admin-players-count').textContent = data.totalPlayers;
});

socket.on('game-started', () => {
    gameState = 'playing';
});

socket.on('game-ended', (data) => {
    const leaderboard = document.getElementById('final-leaderboard');
    leaderboard.innerHTML = '';
    
    data.leaderboard.forEach((player, index) => {
        const item = document.createElement('div');
        item.className = 'leaderboard-item';
        item.innerHTML = `
            <span>${index + 1}. ${player.name}</span>
            <span>${player.score} pts</span>
        `;
        leaderboard.appendChild(item);
    });
    
    showScreen('game-results');
});

socket.on('connect', () => {
    console.log('Connecté au serveur');
});

socket.on('disconnect', () => {
    console.log('Déconnecté du serveur');
});

document.getElementById('host-name').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        createGame();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    showQuizSelection();
    
    const quizSelector = document.getElementById('quiz-selector');
    if (quizSelector) {
        quizSelector.addEventListener('change', onQuizSelected);
    }
});