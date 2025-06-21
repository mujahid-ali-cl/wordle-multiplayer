import { rooms, players, type Room, type Player, type InsertRoom, type InsertPlayer } from "@shared/schema";

export interface IStorage {
  // Room methods
  createRoom(room: InsertRoom): Promise<Room>;
  getRoom(code: string): Promise<Room | undefined>;
  getRoomById(id: number): Promise<Room | undefined>;
  updateRoom(id: number, updates: Partial<Room>): Promise<Room | undefined>;
  deleteRoom(id: number): Promise<void>;

  // Player methods
  createPlayer(player: InsertPlayer): Promise<Player>;
  getPlayer(id: number): Promise<Player | undefined>;
  getPlayersByRoom(roomId: number): Promise<Player[]>;
  updatePlayer(id: number, updates: Partial<Player>): Promise<Player | undefined>;
  removePlayer(id: number): Promise<void>;
  removePlayersByRoom(roomId: number): Promise<void>;
}

export class MemStorage implements IStorage {
  private rooms: Map<number, Room>;
  private players: Map<number, Player>;
  private roomIdCounter: number;
  private playerIdCounter: number;

  constructor() {
    this.rooms = new Map();
    this.players = new Map();
    this.roomIdCounter = 1;
    this.playerIdCounter = 1;
  }

  async createRoom(insertRoom: InsertRoom): Promise<Room> {
    const id = this.roomIdCounter++;
    const room: Room = {
      ...insertRoom,
      id,
      createdAt: new Date(),
      startedAt: null,
      endedAt: null,
    };
    this.rooms.set(id, room);
    return room;
  }

  async getRoom(code: string): Promise<Room | undefined> {
    return Array.from(this.rooms.values()).find(room => room.code === code);
  }

  async getRoomById(id: number): Promise<Room | undefined> {
    return this.rooms.get(id);
  }

  async updateRoom(id: number, updates: Partial<Room>): Promise<Room | undefined> {
    const room = this.rooms.get(id);
    if (!room) return undefined;
    
    const updatedRoom = { ...room, ...updates };
    this.rooms.set(id, updatedRoom);
    return updatedRoom;
  }

  async deleteRoom(id: number): Promise<void> {
    this.rooms.delete(id);
    // Also remove all players in this room
    await this.removePlayersByRoom(id);
  }

  async createPlayer(insertPlayer: InsertPlayer): Promise<Player> {
    const id = this.playerIdCounter++;
    const player: Player = {
      ...insertPlayer,
      id,
      joinedAt: new Date(),
    };
    this.players.set(id, player);
    return player;
  }

  async getPlayer(id: number): Promise<Player | undefined> {
    return this.players.get(id);
  }

  async getPlayersByRoom(roomId: number): Promise<Player[]> {
    return Array.from(this.players.values()).filter(player => player.roomId === roomId);
  }

  async updatePlayer(id: number, updates: Partial<Player>): Promise<Player | undefined> {
    const player = this.players.get(id);
    if (!player) return undefined;
    
    const updatedPlayer = { ...player, ...updates };
    this.players.set(id, updatedPlayer);
    return updatedPlayer;
  }

  async removePlayer(id: number): Promise<void> {
    this.players.delete(id);
  }

  async removePlayersByRoom(roomId: number): Promise<void> {
    const playersToRemove = Array.from(this.players.entries())
      .filter(([_, player]) => player.roomId === roomId)
      .map(([id, _]) => id);
    
    playersToRemove.forEach(id => this.players.delete(id));
  }
}

export const storage = new MemStorage();
