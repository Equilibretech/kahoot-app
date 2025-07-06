const socket = io();

let currentGameCode = '';
let playerScore = 0;
let answeredCurrentQuestion = false;

function showScreen(screenId) {
    const screens = ['join-screen', 'waiting-screen', 'game-screen', 'result-screen'];
    screens.forEach(id => {
        document.getElementById(id).classList.add('hidden');
    });
    document.getElementById(screenId).classList.remove('hidden');
}

function showError(message) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
    setTimeout(() => {
        errorDiv.classList.add('hidden');
    }, 5000);
}

function joinGame() {
    const gameCode = document.getElementById('game-code').value.trim().toUpperCase();
    const playerName = document.getElementById('player-name').value.trim();
    
    if (!gameCode || !playerName) {
        showError('Veuillez remplir tous les champs');
        return;
    }
    
    if (gameCode.length !== 6) {
        showError('Le code du jeu doit contenir 6 caractères');
        return;
    }
    
    currentGameCode = gameCode;
    socket.emit('join-game', { gameCode, playerName });
}

function selectAnswer(answerIndex) {
    if (answeredCurrentQuestion) return;
    
    answeredCurrentQuestion = true;
    socket.emit('answer', { gameCode: currentGameCode, answer: answerIndex });
    
    const buttons = document.querySelectorAll('.answer-btn');
    buttons.forEach((btn, index) => {
        btn.disabled = true;
        if (index === answerIndex) {
            btn.style.background = '#ffc107';
            btn.style.color = 'white';
        }
    });
}

socket.on('joined-game', (data) => {
    document.getElementById('game-code-display').textContent = `Code: ${data.gameCode}`;
    showScreen('waiting-screen');
});

socket.on('player-joined', (data) => {
    document.getElementById('players-count').textContent = data.totalPlayers;
});

socket.on('player-left', (data) => {
    document.getElementById('players-count').textContent = data.totalPlayers;
});

socket.on('game-started', () => {
    showScreen('game-screen');
    document.getElementById('player-score').textContent = playerScore;
});

socket.on('question', (data) => {
    answeredCurrentQuestion = false;
    
    document.getElementById('question-number').textContent = data.questionNumber;
    document.getElementById('total-questions').textContent = data.totalQuestions;
    document.getElementById('question-text').textContent = data.question;
    
    const buttons = document.querySelectorAll('.answer-btn');
    buttons.forEach((btn, index) => {
        btn.textContent = data.options[index];
        btn.disabled = false;
        btn.style.background = '';
        btn.style.color = '';
        btn.classList.remove('correct', 'incorrect');
    });
});

socket.on('answer-result', (data) => {
    if (data.correct) {
        playerScore += 100;
        document.getElementById('player-score').textContent = playerScore;
    }
    
    const buttons = document.querySelectorAll('.answer-btn');
    buttons.forEach((btn, index) => {
        if (btn.textContent === data.correctAnswer) {
            btn.classList.add('correct');
        } else if (btn.style.background === 'rgb(255, 193, 7)') {
            if (!data.correct) {
                btn.classList.add('incorrect');
            }
        }
    });
});

socket.on('game-ended', (data) => {
    document.getElementById('final-score').textContent = playerScore;
    
    const leaderboardList = document.getElementById('leaderboard-list');
    leaderboardList.innerHTML = '';
    
    data.leaderboard.forEach((player, index) => {
        const item = document.createElement('div');
        item.className = 'leaderboard-item';
        item.innerHTML = `
            <span>${index + 1}. ${player.name}</span>
            <span>${player.score} pts</span>
        `;
        leaderboardList.appendChild(item);
    });
    
    showScreen('result-screen');
});

socket.on('error', (message) => {
    showError(message);
});

document.getElementById('game-code').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('player-name').focus();
    }
});

document.getElementById('player-name').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        joinGame();
    }
});

document.getElementById('game-code').addEventListener('input', (e) => {
    e.target.value = e.target.value.toUpperCase();
});