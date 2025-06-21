import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertRoomSchema, insertPlayerSchema, type GuessResult } from "@shared/schema";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Word list for the game
const WORD_LIST: string[] = [];
const VALID_WORDS = new Set<string>();

// Load words from files
function loadWords() {
  try {
    // Load words that can be the word of the day (La words)
    const laWordsPath = path.join(__dirname, "../shared/wordle-La.txt");
    const laWords = fs.readFileSync(laWordsPath, "utf-8")
      .split("\n")
      .map(word => word.trim().toUpperCase())
      .filter(word => word.length === 5);

    // Load words that can only be guessed (Ta words)
    const taWordsPath = path.join(__dirname, "../shared/wordle-Ta.txt");
    const taWords = fs.readFileSync(taWordsPath, "utf-8")
      .split("\n")
      .map(word => word.trim().toUpperCase())
      .filter(word => word.length === 5);

    // Add La words to both WORD_LIST and VALID_WORDS
    laWords.forEach(word => {
      WORD_LIST.push(word);
      VALID_WORDS.add(word);
    });
    
    // Add Ta words only to VALID_WORDS (not to WORD_LIST since they can't be the word of the day)
    taWords.forEach(word => {
      VALID_WORDS.add(word);
    });

    console.log(`Loaded ${WORD_LIST.length} words for word of the day`);
    console.log(`Loaded ${VALID_WORDS.size} total valid words for guessing`);
  } catch (error) {
    console.error("Error loading word files:", error);
    // Fallback to some basic words if files can't be loaded
    const fallbackWords = ["HELLO", "WORLD", "GAMES", "PLAYS", "FUNNY"];
    fallbackWords.forEach(word => {
      WORD_LIST.push(word);
      VALID_WORDS.add(word);
    });
  }
}

// Load words on module initialization
loadWords();

function generateRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function getRandomWord(): string {
  return WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)];
}

function evaluateGuess(guess: string, answer: string): ('correct' | 'present' | 'absent')[] {
  const result: ('correct' | 'present' | 'absent')[] = [];
  const answerArray = answer.split('');
  const guessArray = guess.split('');
  
  // First pass: mark correct positions
  for (let i = 0; i < 5; i++) {
    if (guessArray[i] === answerArray[i]) {
      result[i] = 'correct';
      answerArray[i] = ''; // Mark as used
    }
  }
  
  // Second pass: mark present and absent
  for (let i = 0; i < 5; i++) {
    if (result[i] === 'correct') continue;
    
    const letterIndex = answerArray.indexOf(guessArray[i]);
    if (letterIndex !== -1) {
      result[i] = 'present';
      answerArray[letterIndex] = ''; // Mark as used
    } else {
      result[i] = 'absent';
    }
  }
  
  return result;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Create room
  app.post("/api/rooms", async (req, res) => {
    try {
      const { playerName } = req.body;
      if (!playerName || typeof playerName !== 'string') {
        return res.status(400).json({ message: "Player name is required" });
      }

      const roomCode = generateRoomCode();
      const word = getRandomWord();
      
      const room = await storage.createRoom({
        code: roomCode,
        word,
        status: "waiting",
        maxPlayers: 8,
        timeLimit: 300
      });

      // Create host player
      const player = await storage.createPlayer({
        roomId: room.id,
        name: playerName,
        isHost: true,
        status: "waiting",
        guesses: [],
        currentGuess: "",
        solved: false,
        attempts: 0,
        timeElapsed: 0
      });

      res.json({ room, player });
    } catch (error) {
      console.error("Error creating room:", error);
      res.status(500).json({ message: "Failed to create room" });
    }
  });

  // Join room
  app.post("/api/rooms/:code/join", async (req, res) => {
    try {
      const { code } = req.params;
      const { playerName } = req.body;

      if (!playerName || typeof playerName !== 'string') {
        return res.status(400).json({ message: "Player name is required" });
      }

      const room = await storage.getRoom(code.toUpperCase());
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }

      if (room.status !== "waiting") {
        return res.status(400).json({ message: "Game has already started" });
      }

      const existingPlayers = await storage.getPlayersByRoom(room.id);
      if (existingPlayers.length >= room.maxPlayers) {
        return res.status(400).json({ message: "Room is full" });
      }

      // Check if player name already exists in room
      if (existingPlayers.some(p => p.name === playerName)) {
        return res.status(400).json({ message: "Player name already taken" });
      }

      const player = await storage.createPlayer({
        roomId: room.id,
        name: playerName,
        isHost: false,
        status: "waiting",
        guesses: [],
        currentGuess: "",
        solved: false,
        attempts: 0,
        timeElapsed: 0
      });

      res.json({ room, player });
    } catch (error) {
      console.error("Error joining room:", error);
      res.status(500).json({ message: "Failed to join room" });
    }
  });

  // Get game state
  app.get("/api/rooms/:code", async (req, res) => {
    try {
      const { code } = req.params;
      const room = await storage.getRoom(code.toUpperCase());
      
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }

      const players = await storage.getPlayersByRoom(room.id);
      
      let timeRemaining = 0;
      if (room.status === "playing" && room.startedAt) {
        const elapsed = Math.floor((Date.now() - room.startedAt.getTime()) / 1000);
        timeRemaining = Math.max(0, room.timeLimit - elapsed);
        
        // Auto-end game if time is up
        if (timeRemaining === 0 && room.status === "playing") {
          await storage.updateRoom(room.id, { status: "finished", endedAt: new Date() });
        }
      }

      const gameState = {
        room: {
          ...room,
          word: room.status === "finished" ? room.word : undefined // Only reveal word when game is finished
        },
        players,
        timeRemaining
      };

      res.json(gameState);
    } catch (error) {
      console.error("Error getting game state:", error);
      res.status(500).json({ message: "Failed to get game state" });
    }
  });

  // Start game
  app.post("/api/rooms/:code/start", async (req, res) => {
    try {
      const { code } = req.params;
      const { playerId } = req.body;

      const room = await storage.getRoom(code.toUpperCase());
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }

      const player = await storage.getPlayer(playerId);
      if (!player || player.roomId !== room.id || !player.isHost) {
        return res.status(403).json({ message: "Only the host can start the game" });
      }

      if (room.status !== "waiting") {
        return res.status(400).json({ message: "Game has already started" });
      }

      const players = await storage.getPlayersByRoom(room.id);
      if (players.length < 1) {
        return res.status(400).json({ message: "Need at least 1 player to start" });
      }

      // Start the game
      await storage.updateRoom(room.id, { 
        status: "playing", 
        startedAt: new Date() 
      });

      // Update all players to playing status
      for (const p of players) {
        await storage.updatePlayer(p.id, { status: "playing" });
      }

      res.json({ message: "Game started" });
    } catch (error) {
      console.error("Error starting game:", error);
      res.status(500).json({ message: "Failed to start game" });
    }
  });

  // Submit guess
  app.post("/api/rooms/:code/guess", async (req, res) => {
    try {
      const { code } = req.params;
      const { playerId, guess } = req.body;

      if (!guess || typeof guess !== 'string' || guess.length !== 5) {
        return res.status(400).json({ message: "Guess must be a 5-letter word" });
      }

      const guessUpper = guess.toUpperCase();
      if (!VALID_WORDS.has(guessUpper)) {
        return res.status(400).json({ message: "Not a valid word" });
      }

      const room = await storage.getRoom(code.toUpperCase());
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }

      if (room.status !== "playing") {
        return res.status(400).json({ message: "Game is not in progress" });
      }

      const player = await storage.getPlayer(playerId);
      if (!player || player.roomId !== room.id) {
        return res.status(403).json({ message: "Player not in this room" });
      }

      if (player.solved || player.attempts >= 6) {
        return res.status(400).json({ message: "Player has already finished" });
      }

      // Check if word was already guessed
      if (player.guesses.includes(guessUpper)) {
        return res.status(400).json({ message: "Word already guessed" });
      }

      // Evaluate the guess
      const result = evaluateGuess(guessUpper, room.word);
      const isWin = result.every(r => r === 'correct');
      
      // Update player
      const newGuesses = [...player.guesses, guessUpper];
      const newAttempts = player.attempts + 1;
      const timeElapsed = room.startedAt ? 
        Math.floor((Date.now() - room.startedAt.getTime()) / 1000) : 0;

      await storage.updatePlayer(player.id, {
        guesses: newGuesses,
        attempts: newAttempts,
        solved: isWin,
        timeElapsed: isWin ? timeElapsed : player.timeElapsed,
        status: isWin || newAttempts >= 6 ? "finished" : "playing",
        currentGuess: ""
      });

      // Check if game should end (all players finished or someone won)
      const allPlayers = await storage.getPlayersByRoom(room.id);
      const allFinished = allPlayers.every(p => p.solved || p.attempts >= 6 || p.status === "finished");
      
      if (allFinished) {
        await storage.updateRoom(room.id, { 
          status: "finished", 
          endedAt: new Date() 
        });
      }

      const guessResult: GuessResult = {
        word: guessUpper,
        result,
        isValid: true,
        isWin
      };

      res.json(guessResult);
    } catch (error) {
      console.error("Error submitting guess:", error);
      res.status(500).json({ message: "Failed to submit guess" });
    }
  });

  // Update current guess (for real-time typing)
  app.post("/api/rooms/:code/current-guess", async (req, res) => {
    try {
      const { code } = req.params;
      const { playerId, currentGuess } = req.body;

      const room = await storage.getRoom(code.toUpperCase());
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }

      const player = await storage.getPlayer(playerId);
      if (!player || player.roomId !== room.id) {
        return res.status(403).json({ message: "Player not in this room" });
      }

      await storage.updatePlayer(player.id, { currentGuess: currentGuess || "" });
      res.json({ message: "Current guess updated" });
    } catch (error) {
      console.error("Error updating current guess:", error);
      res.status(500).json({ message: "Failed to update current guess" });
    }
  });

  // Leave room
  app.delete("/api/rooms/:code/players/:playerId", async (req, res) => {
    try {
      const { code, playerId } = req.params;

      const room = await storage.getRoom(code.toUpperCase());
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }

      const player = await storage.getPlayer(parseInt(playerId));
      if (!player || player.roomId !== room.id) {
        return res.status(403).json({ message: "Player not in this room" });
      }

      await storage.removePlayer(player.id);

      // If host left, assign new host or delete room
      const remainingPlayers = await storage.getPlayersByRoom(room.id);
      if (remainingPlayers.length === 0) {
        await storage.deleteRoom(room.id);
      } else if (player.isHost) {
        // Assign host to first remaining player
        const newHost = remainingPlayers[0];
        await storage.updatePlayer(newHost.id, { isHost: true });
      }

      res.json({ message: "Left room successfully" });
    } catch (error) {
      console.error("Error leaving room:", error);
      res.status(500).json({ message: "Failed to leave room" });
    }
  });

  // Get leaderboard
  app.get("/api/rooms/:code/leaderboard", async (req, res) => {
    try {
      const { code } = req.params;
      const room = await storage.getRoom(code.toUpperCase());
      
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }

      const players = await storage.getPlayersByRoom(room.id);
      
      // Calculate scores and sort
      const leaderboard = players
        .map(player => {
          let score = 0;
          if (player.solved) {
            // Base score for solving + bonus for fewer attempts + bonus for speed
            score = 100 + (6 - player.attempts) * 10 + Math.max(0, 300 - player.timeElapsed);
          } else if (player.attempts > 0) {
            // Partial credit for attempting
            score = player.attempts * 5;
          }
          return { player, score };
        })
        .sort((a, b) => {
          // Sort by solved first, then by score, then by time
          if (a.player.solved !== b.player.solved) {
            return a.player.solved ? -1 : 1;
          }
          if (a.score !== b.score) {
            return b.score - a.score;
          }
          return a.player.timeElapsed - b.player.timeElapsed;
        })
        .map((entry, index) => ({
          ...entry,
          rank: index + 1
        }));

      res.json(leaderboard);
    } catch (error) {
      console.error("Error getting leaderboard:", error);
      res.status(500).json({ message: "Failed to get leaderboard" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
