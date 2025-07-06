const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));
app.use(express.json());

const games = new Map();
const players = new Map();

function loadQuizzes() {
  try {
    const data = fs.readFileSync(path.join(__dirname, '../data/quiz-store.json'), 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Erreur lors du chargement des quiz:', error);
    return { quizzes: [] };
  }
}

function saveQuizzes(quizData) {
  try {
    fs.writeFileSync(path.join(__dirname, '../data/quiz-store.json'), JSON.stringify(quizData, null, 2));
    return true;
  } catch (error) {
    console.error('Erreur lors de la sauvegarde des quiz:', error);
    return false;
  }
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/admin.html'));
});

app.get('/game/:code', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/game.html'));
});

app.get('/quiz-builder', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/quiz-builder.html'));
});

app.get('/api/quizzes', (req, res) => {
  const quizData = loadQuizzes();
  res.json(quizData.quizzes);
});

app.get('/api/quiz/:id', (req, res) => {
  const quizData = loadQuizzes();
  const quiz = quizData.quizzes.find(q => q.id === req.params.id);
  if (!quiz) {
    return res.status(404).json({ error: 'Quiz non trouvé' });
  }
  res.json(quiz);
});

app.post('/api/quiz', (req, res) => {
  const { title, description, questions } = req.body;
  
  if (!title || !questions || questions.length === 0) {
    return res.status(400).json({ error: 'Titre et questions requis' });
  }
  
  const quizData = loadQuizzes();
  const newQuiz = {
    id: Date.now().toString(),
    title,
    description: description || '',
    createdAt: new Date().toISOString(),
    questions: questions.map((q, index) => ({
      id: index + 1,
      question: q.question,
      options: q.options,
      correct: q.correct,
      timeLimit: q.timeLimit || 30
    }))
  };
  
  quizData.quizzes.push(newQuiz);
  
  if (saveQuizzes(quizData)) {
    res.json(newQuiz);
  } else {
    res.status(500).json({ error: 'Erreur lors de la sauvegarde' });
  }
});

app.delete('/api/quiz/:id', (req, res) => {
  const quizData = loadQuizzes();
  const quizIndex = quizData.quizzes.findIndex(q => q.id === req.params.id);
  
  if (quizIndex === -1) {
    return res.status(404).json({ error: 'Quiz non trouvé' });
  }
  
  quizData.quizzes.splice(quizIndex, 1);
  
  if (saveQuizzes(quizData)) {
    res.json({ success: true });
  } else {
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
});

app.post('/api/create-game', (req, res) => {
  const { host, quizId } = req.body;
  
  if (!quizId) {
    return res.status(400).json({ error: 'ID du quiz requis' });
  }
  
  const quizData = loadQuizzes();
  const selectedQuiz = quizData.quizzes.find(q => q.id === quizId);
  
  if (!selectedQuiz) {
    return res.status(404).json({ error: 'Quiz non trouvé' });
  }
  
  const gameCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  const game = {
    code: gameCode,
    host: host || 'Admin',
    players: [],
    quiz: selectedQuiz,
    questions: selectedQuiz.questions,
    currentQuestion: -1,
    state: 'waiting',
    scores: {}
  };
  
  games.set(gameCode, game);
  res.json({ gameCode, quizTitle: selectedQuiz.title });
});

io.on('connection', (socket) => {
  console.log('Nouvelle connexion:', socket.id);

  socket.on('join-game', (data) => {
    const { gameCode, playerName } = data;
    const game = games.get(gameCode);
    
    if (!game) {
      socket.emit('error', 'Jeu introuvable');
      return;
    }
    
    if (game.state !== 'waiting') {
      socket.emit('error', 'Jeu déjà commencé');
      return;
    }
    
    const player = {
      id: socket.id,
      name: playerName,
      score: 0
    };
    
    game.players.push(player);
    players.set(socket.id, { gameCode, playerName });
    
    socket.join(gameCode);
    socket.emit('joined-game', { gameCode, playerName });
    
    io.to(gameCode).emit('player-joined', {
      player: player,
      totalPlayers: game.players.length
    });
  });

  socket.on('start-game', (gameCode) => {
    const game = games.get(gameCode);
    if (!game) return;
    
    game.state = 'playing';
    game.currentQuestion = 0;
    
    io.to(gameCode).emit('game-started');
    
    setTimeout(() => {
      io.to(gameCode).emit('question', {
        question: game.questions[0].question,
        options: game.questions[0].options,
        questionNumber: 1,
        totalQuestions: game.questions.length
      });
    }, 2000);
  });

  socket.on('answer', (data) => {
    const { gameCode, answer } = data;
    const game = games.get(gameCode);
    const playerData = players.get(socket.id);
    
    if (!game || !playerData) return;
    
    const currentQ = game.questions[game.currentQuestion];
    const isCorrect = answer === currentQ.correct;
    
    if (isCorrect) {
      const player = game.players.find(p => p.id === socket.id);
      if (player) {
        player.score += 100;
      }
    }
    
    socket.emit('answer-result', { 
      correct: isCorrect,
      correctAnswer: currentQ.options[currentQ.correct]
    });
  });

  socket.on('next-question', (gameCode) => {
    const game = games.get(gameCode);
    if (!game) return;
    
    game.currentQuestion++;
    
    if (game.currentQuestion >= game.questions.length) {
      game.state = 'finished';
      const leaderboard = game.players
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
      
      io.to(gameCode).emit('game-ended', { leaderboard });
      return;
    }
    
    const question = game.questions[game.currentQuestion];
    io.to(gameCode).emit('question', {
      question: question.question,
      options: question.options,
      questionNumber: game.currentQuestion + 1,
      totalQuestions: game.questions.length
    });
  });

  socket.on('disconnect', () => {
    const playerData = players.get(socket.id);
    if (playerData) {
      const game = games.get(playerData.gameCode);
      if (game) {
        game.players = game.players.filter(p => p.id !== socket.id);
        io.to(playerData.gameCode).emit('player-left', {
          playerName: playerData.playerName,
          totalPlayers: game.players.length
        });
      }
      players.delete(socket.id);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Serveur Kahoot en cours d'exécution sur le port ${PORT}`);
});