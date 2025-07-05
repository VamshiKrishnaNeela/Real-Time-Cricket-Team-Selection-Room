# Cricket Team Selection Room

A real-time multiplayer cricket team selection application built with React and Node.js.

## Project Structure

\\\`
cricket-team-selection/
├── server/                 # Backend Node.js application
│   ├── models/            # MongoDB models
│   ├── routes/            # Express routes
│   ├── socket/            # Socket.IO handlers
│   ├── config/            # Configuration files
│   ├── utils/             # Utility functions
│   └── server.js          # Main server file
└── client/                # Frontend React application
    ├── src/
    │   ├── components/    # React components
    │   ├── services/      # API services
    │   ├── utils/         # Utility functions
    │   └── App.js         # Main App component
    └── public/            # Static files
\\\`

## Features

- Real-time multiplayer team selection
- Turn-based gameplay with 10-second timer
- Auto-selection when time runs out
- Room creation and management
- User authentication
- Responsive design

## Setup Instructions

### Server Setup
1. Navigate to server directory: cd server
2. Install dependencies: npm install
3. Start development server: npm run dev
4. Server runs on http://localhost:5000

### Client Setup
1. Navigate to client directory: cd client
2. Install dependencies: npm install
3. Start development server: npm start
4. Client runs on http://localhost:3000

## Game Flow

1. Users register/login
2. Create or join a room
3. Host starts the game
4. Players take turns selecting cricket players
5. Each player gets 10 seconds per turn
6. Game ends when everyone has 5 players

## Technologies Used

- *Backend*: Node.js, Express.js, Socket.IO, MongoDB
- *Frontend*: React, CSS, Socket.IO Client
- *Database*: MongoDB Atlas
