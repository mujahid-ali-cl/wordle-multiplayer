import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const rooms = pgTable("rooms", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  word: text("word").notNull(),
  status: text("status").notNull().default("waiting"), // waiting, playing, finished
  maxPlayers: integer("max_players").notNull().default(8),
  timeLimit: integer("time_limit").notNull().default(300), // 5 minutes in seconds
  createdAt: timestamp("created_at").defaultNow().notNull(),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
});

export const players = pgTable("players", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").notNull(),
  name: text("name").notNull(),
  isHost: boolean("is_host").notNull().default(false),
  status: text("status").notNull().default("waiting"), // waiting, playing, finished, disconnected
  guesses: json("guesses").$type<string[]>().notNull().default([]),
  currentGuess: text("current_guess").notNull().default(""),
  solved: boolean("solved").notNull().default(false),
  attempts: integer("attempts").notNull().default(0),
  timeElapsed: integer("time_elapsed").notNull().default(0), // in seconds
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export const insertRoomSchema = createInsertSchema(rooms).omit({
  id: true,
  createdAt: true,
  startedAt: true,
  endedAt: true,
});

export const insertPlayerSchema = createInsertSchema(players).omit({
  id: true,
  joinedAt: true,
});

export type Room = typeof rooms.$inferSelect;
export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type Player = typeof players.$inferSelect;
export type InsertPlayer = z.infer<typeof insertPlayerSchema>;

// Game state types
export type GameState = {
  room: Room;
  players: Player[];
  timeRemaining: number;
};

export type GuessResult = {
  word: string;
  result: ('correct' | 'present' | 'absent')[];
  isValid: boolean;
  isWin: boolean;
};

export type LeaderboardEntry = {
  player: Player;
  rank: number;
  score: number;
};
