# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Running the Application
```bash
npm start              # Start production server
npm run dev           # Start development server with nodemon
```

### Quick Development Setup
```bash
npm install           # Install dependencies
npm start            # Server runs on http://localhost:3000
```

## Architecture Overview

### Core Application Structure
This is a real-time quiz application (Kahoot clone) with three main user interfaces:

1. **Player Interface** (`/`) - Mobile-first interface for participants
2. **Admin Interface** (`/admin`) - Game host controls and quiz selection
3. **Quiz Builder** (`/quiz-builder`) - Quiz creation and management

### Real-time Communication Architecture
- **WebSocket Implementation**: Socket.IO for bidirectional real-time communication
- **Game State Management**: In-memory Maps for active games and players
- **Event-driven Architecture**: Socket events handle game flow (join, start, answer, next-question)

### Data Flow
1. **Quiz Creation**: Quiz Builder → JSON file storage → Admin selection
2. **Game Creation**: Admin selects quiz → generates 6-digit code → creates game room
3. **Game Play**: Players join room → real-time question/answer flow → scoring → leaderboard

### Key Technical Components

#### Backend (`server/app.js`)
- **Express.js server** with Socket.IO integration
- **RESTful API** for quiz CRUD operations (`/api/quizzes`, `/api/quiz/:id`)
- **Game management** with unique room codes and player state tracking
- **Auto-initialization** of data directory and default quizzes for deployment

#### Frontend Architecture
- **Vanilla JavaScript** with Socket.IO client
- **Mobile-first responsive CSS** with progressive enhancement
- **State management** through DOM manipulation and Socket events
- **Real-time UI updates** for game state changes

#### Data Persistence
- **JSON file storage** in `data/quiz-store.json` for quiz library
- **Ephemeral game state** in server memory (games reset on restart)
- **Auto-creation** of data directory and default content for fresh deployments

### Critical Files for Functionality

#### Server Side
- `server/app.js` - Main application server with Socket.IO and API routes
- `data/quiz-store.json` - Quiz library storage (auto-created if missing)

#### Client Side
- `public/js/app.js` - Player game logic and WebSocket handling
- `public/js/admin.js` - Host interface with quiz selection and game control
- `public/js/quiz-builder.js` - Quiz creation interface with validation

#### Templates
- `views/index.html` - Player interface with responsive design
- `views/admin.html` - Host interface with quiz management
- `views/quiz-builder.html` - Quiz creation interface

### Socket.IO Events Architecture

#### Client → Server Events
- `join-game` - Player joins with game code and name
- `start-game` - Admin starts the quiz game
- `answer` - Player submits answer to current question
- `next-question` - Admin advances to next question

#### Server → Client Events
- `joined-game` - Confirmation of successful game join
- `player-joined/left` - Real-time player count updates
- `game-started` - Game begins notification
- `question` - New question data broadcast
- `answer-result` - Individual answer feedback
- `game-ended` - Final results and leaderboard

### Deployment Considerations

#### File Storage Requirements
- `data/` directory must be persistent for quiz storage
- Server auto-creates directory and default quizzes if missing
- For ephemeral hosting, quiz data resets on restart

#### WebSocket Configuration
- Socket.IO handles protocol negotiation (websocket/polling fallback)
- CORS must be configured for cross-origin deployments
- Works with reverse proxies when properly configured

#### Environment Variables
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment mode
- `ALLOWED_ORIGINS` - CORS origins for production

### Game Flow Logic
1. **Quiz Selection Phase**: Admin selects from available quiz library
2. **Lobby Phase**: Players join using 6-digit code, admin sees real-time count
3. **Game Phase**: Sequential questions with timed responses and real-time scoring
4. **Results Phase**: Final leaderboard display and game cleanup

### Quiz Data Structure
```json
{
  "id": "unique-id",
  "title": "Quiz Title",
  "description": "Optional description",
  "questions": [
    {
      "id": 1,
      "question": "Question text",
      "options": ["A", "B", "C", "D"],
      "correct": 0,
      "timeLimit": 30
    }
  ]
}
```

## Development Notes

### Adding New Features
- **Quiz Management**: Extend API routes in `server/app.js` and update `quiz-builder.js`
- **Game Mechanics**: Modify Socket.IO event handlers for new game features
- **UI Components**: Update corresponding HTML templates and JavaScript files

### Testing Locally
- Use multiple browser tabs/windows to simulate multiplayer scenarios
- Test WebSocket connections across different networks
- Verify mobile responsiveness on actual devices

### Data Management
- Quiz data persists in JSON file - backup before major changes
- Game state is ephemeral - players disconnect on server restart
- No user authentication - games are anonymous with display names only