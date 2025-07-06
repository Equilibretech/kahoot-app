#!/bin/bash
# Render build script

echo "Starting Render build..."

# Install dependencies
npm install

# Install production dependencies if not already included
npm install helmet express-rate-limit dotenv

# Create data directory if it doesn't exist
mkdir -p data

# Initialize quiz store if it doesn't exist
if [ ! -f data/quiz-store.json ]; then
  echo '{"quizzes":[]}' > data/quiz-store.json
fi

echo "Build completed successfully!"