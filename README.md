# 🎮 Wordle Multiplayer

A real-time multiplayer version of the popular word-guessing game Wordle, built with React, Express, and WebSocket technology.

## ✨ Features

- **Real-time Multiplayer**: Play Wordle with friends in real-time
- **Room-based Gameplay**: Create or join rooms with unique codes
- **Live Leaderboard**: See how you rank against other players in real-time
- **Time-limited Games**: 5-minute time limit adds excitement and urgency

## 🏗️ Tech Stack

### Frontend
- **React 18** - Modern React with hooks
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Accessible component primitives
- **Framer Motion** - Smooth animations
- **Wouter** - Lightweight routing
- **TanStack Query** - Server state management

### Backend
- **Express.js** - Fast, unopinionated web framework
- **WebSocket** - Real-time bidirectional communication
- **Drizzle ORM** - Type-safe database queries
- **PostgreSQL** - Robust relational database
- **Passport.js** - Authentication middleware

### Development
- **Vite** - Fast build tool and dev server
- **ESBuild** - Lightning-fast bundler
- **Drizzle Kit** - Database migrations and schema management

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd wordle-multiplayer
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL=postgresql://username:password@localhost:5432/wordle_multiplayer
   PORT=3000
   SESSION_SECRET=your-session-secret-here
   ```

4. **Set up the database**
   ```bash
   npm run db:push
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:3000`

## 📁 Project Structure

```
wordle-multiplayer/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   └── lib/           # Utility functions
│   └── index.html
├── server/                 # Express backend
│   ├── index.ts           # Server entry point
│   ├── routes.ts          # API routes
│   ├── storage.ts         # Database operations
│   └── vite.ts            # Vite integration
├── shared/                 # Shared code
│   ├── schema.ts          # Database schema
│   └── wordle-*.txt       # Word lists
└── dist/                   # Build output
```

## 🛠️ Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run check` - TypeScript type checking
- `npm run db:push` - Push database schema changes

## 🌐 Deployment

### Environment Variables
Make sure to set these environment variables in production:

- `DATABASE_URL` - PostgreSQL connection string
- `PORT` - Server port (default: 80)
- `SESSION_SECRET` - Secret for session encryption
- `BASE_URL` - Your application's base URL
- `ENABLE_SELF_PING` - Enable/disable self-ping (default: true)
- `PING_INTERVAL` - Self-ping interval in milliseconds (default: 600000)

### Build and Deploy
```bash
npm run build
npm start
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

**Happy Wordling! 🎯** 