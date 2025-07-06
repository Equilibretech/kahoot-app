// Production-ready version of app.js with security enhancements

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Configure Socket.IO with CORS for production
const io = socketIo(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : "*",
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: 'Too many API requests from this IP, please try again later.'
});

// Apply rate limiting
app.use('/api/', apiLimiter);

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Middleware
app.use(express.static('public'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - ${req.ip}`);
    next();
  });
}

// Game storage
const games = new Map();
const players = new Map();

// Data persistence path
const DATA_PATH = process.env.DATA_PATH || path.join(__dirname, '../data');
const QUIZ_STORE_PATH = path.join(DATA_PATH, 'quiz-store.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_PATH)) {
  fs.mkdirSync(DATA_PATH, { recursive: true });
}

// Initialize quiz store if it doesn't exist
if (!fs.existsSync(QUIZ_STORE_PATH)) {
  fs.writeFileSync(QUIZ_STORE_PATH, JSON.stringify({ quizzes: [] }, null, 2));
}

function loadQuizzes() {
  try {
    const data = fs.readFileSync(QUIZ_STORE_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading quizzes:', error);
    return { quizzes: [] };
  }
}

function saveQuizzes(quizData) {
  try {
    fs.writeFileSync(QUIZ_STORE_PATH, JSON.stringify(quizData, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving quizzes:', error);
    return false;
  }
}

// Clean up old games periodically
setInterval(() => {
  const now = Date.now();
  for (const [code, game] of games.entries()) {
    if (now - game.lastActivity > 3600000) { // 1 hour
      games.delete(code);
      console.log(`Cleaned up inactive game: ${code}`);
    }
  }
}, 600000); // Check every 10 minutes

// Routes
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

// API Routes
app.get('/api/quizzes', (req, res) => {
  try {
    const quizData = loadQuizzes();
    res.json(quizData.quizzes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load quizzes' });
  }
});

app.get('/api/quiz/:id', (req, res) => {
  try {
    const quizData = loadQuizzes();
    const quiz = quizData.quizzes.find(q => q.id === req.params.id);
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }
    res.json(quiz);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load quiz' });
  }
});

// Input validation helper
function validateQuizInput(req, res, next) {
  const { title, questions } = req.body;
  
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return res.status(400).json({ error: 'Valid title is required' });
  }
  
  if (!Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ error: 'At least one question is required' });
  }
  
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (!q.question || typeof q.question !== 'string' || q.question.trim().length === 0) {
      return res.status(400).json({ error: `Question ${i + 1}: Valid question text is required` });
    }
    
    if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 4) {
      return res.status(400).json({ error: `Question ${i + 1}: Between 2 and 4 options are required` });
    }
    
    if (typeof q.correct !== 'number' || q.correct < 0 || q.correct >= q.options.length) {
      return res.status(400).json({ error: `Question ${i + 1}: Valid correct answer index is required` });
    }
  }
  
  next();
}

app.post('/api/quiz', validateQuizInput, (req, res) => {
  try {
    const { title, description, questions } = req.body;
    
    const quizData = loadQuizzes();
    const newQuiz = {
      id: Date.now().toString(),
      title: title.trim(),
      description: (description || '').trim(),
      createdAt: new Date().toISOString(),
      questions: questions.map((q, index) => ({
        id: index + 1,
        question: q.question.trim(),
        options: q.options.map(opt => opt.trim()),
        correct: q.correct,
        timeLimit: q.timeLimit || 30
      }))
    };
    
    quizData.quizzes.push(newQuiz);
    
    if (saveQuizzes(quizData)) {
      res.json(newQuiz);
    } else {
      res.status(500).json({ error: 'Failed to save quiz' });
    }
  } catch (error) {
    console.error('Error creating quiz:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/quiz/:id', (req, res) => {
  try {
    const quizData = loadQuizzes();
    const quizIndex = quizData.quizzes.findIndex(q => q.id === req.params.id);
    
    if (quizIndex === -1) {
      return res.status(404).json({ error: 'Quiz not found' });
    }
    
    quizData.quizzes.splice(quizIndex, 1);
    
    if (saveQuizzes(quizData)) {
      res.json({ success: true });
    } else {
      res.status(500).json({ error: 'Failed to delete quiz' });
    }
  } catch (error) {
    console.error('Error deleting quiz:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/create-game', (req, res) => {
  try {
    const { host, quizId } = req.body;
    
    if (!quizId) {
      return res.status(400).json({ error: 'Quiz ID is required' });
    }
    
    const quizData = loadQuizzes();
    const selectedQuiz = quizData.quizzes.find(q => q.id === quizId);
    
    if (!selectedQuiz) {
      return res.status(404).json({ error: 'Quiz not found' });
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
      scores: {},
      lastActivity: Date.now()
    };
    
    games.set(gameCode, game);
    res.json({ gameCode, quizTitle: selectedQuiz.title });
  } catch (error) {
    console.error('Error creating game:', error);
    res.status(500).json({ error: 'Failed to create game' });
  }
});

// Socket.IO event handlers
io.on('connection', (socket) => {
  console.log('New connection:', socket.id);

  socket.on('join-game', (data) => {
    try {
      const { gameCode, playerName } = data;
      
      if (!gameCode || !playerName) {
        socket.emit('error', 'Game code and player name are required');
        return;
      }
      
      const game = games.get(gameCode);
      
      if (!game) {
        socket.emit('error', 'Game not found');
        return;
      }
      
      if (game.state !== 'waiting') {
        socket.emit('error', 'Game already started');
        return;
      }
      
      // Check for duplicate names
      if (game.players.some(p => p.name === playerName)) {
        socket.emit('error', 'Player name already taken');
        return;
      }
      
      const player = {
        id: socket.id,
        name: playerName,
        score: 0
      };
      
      game.players.push(player);
      game.lastActivity = Date.now();
      players.set(socket.id, { gameCode, playerName });
      
      socket.join(gameCode);
      socket.emit('joined-game', { gameCode, playerName });
      
      io.to(gameCode).emit('player-joined', {
        player: player,
        totalPlayers: game.players.length
      });
    } catch (error) {
      console.error('Error joining game:', error);
      socket.emit('error', 'Failed to join game');
    }
  });

  socket.on('start-game', (gameCode) => {
    try {
      const game = games.get(gameCode);
      if (!game) return;
      
      if (game.players.length === 0) {
        socket.emit('error', 'No players in game');
        return;
      }
      
      game.state = 'playing';
      game.currentQuestion = 0;
      game.lastActivity = Date.now();
      
      io.to(gameCode).emit('game-started');
      
      setTimeout(() => {
        io.to(gameCode).emit('question', {
          question: game.questions[0].question,
          options: game.questions[0].options,
          questionNumber: 1,
          totalQuestions: game.questions.length,
          timeLimit: game.questions[0].timeLimit || 30
        });
      }, 2000);
    } catch (error) {
      console.error('Error starting game:', error);
      socket.emit('error', 'Failed to start game');
    }
  });

  socket.on('answer', (data) => {
    try {
      const { gameCode, answer } = data;
      const game = games.get(gameCode);
      const playerData = players.get(socket.id);
      
      if (!game || !playerData) return;
      
      game.lastActivity = Date.now();
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
    } catch (error) {
      console.error('Error processing answer:', error);
    }
  });

  socket.on('next-question', (gameCode) => {
    try {
      const game = games.get(gameCode);
      if (!game) return;
      
      game.currentQuestion++;
      game.lastActivity = Date.now();
      
      if (game.currentQuestion >= game.questions.length) {
        game.state = 'finished';
        const leaderboard = game.players
          .sort((a, b) => b.score - a.score)
          .slice(0, 5);
        
        io.to(gameCode).emit('game-ended', { leaderboard });
        
        // Clean up game after 5 minutes
        setTimeout(() => {
          games.delete(gameCode);
        }, 300000);
        return;
      }
      
      const question = game.questions[game.currentQuestion];
      io.to(gameCode).emit('question', {
        question: question.question,
        options: question.options,
        questionNumber: game.currentQuestion + 1,
        totalQuestions: game.questions.length,
        timeLimit: question.timeLimit || 30
      });
    } catch (error) {
      console.error('Error moving to next question:', error);
    }
  });

  socket.on('disconnect', () => {
    try {
      const playerData = players.get(socket.id);
      if (playerData) {
        const game = games.get(playerData.gameCode);
        if (game) {
          game.players = game.players.filter(p => p.id !== socket.id);
          game.lastActivity = Date.now();
          io.to(playerData.gameCode).emit('player-left', {
            playerName: playerData.playerName,
            totalPlayers: game.players.length
          });
        }
        players.delete(socket.id);
      }
    } catch (error) {
      console.error('Error handling disconnect:', error);
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Kahoot server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = { app, server };