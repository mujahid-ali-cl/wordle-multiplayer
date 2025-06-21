import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Gamepad2, Plus, Users, Clock, Trophy, Target } from "lucide-react";

export default function Lobby() {
  const [, setLocation] = useLocation();
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const { toast } = useToast();

  const createRoomMutation = useMutation({
    mutationFn: async () => {
      if (!playerName.trim()) {
        throw new Error("Player name is required");
      }
      const response = await apiRequest("POST", "/api/rooms", { playerName: playerName.trim() });
      return response.json();
    },
    onSuccess: (data) => {
      localStorage.setItem("playerId", data.player.id.toString());
      localStorage.setItem("playerName", data.player.name);
      setLocation(`/game/${data.room.code}`);
      toast({
        title: "Room Created!",
        description: `Room ${data.room.code} has been created.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const joinRoomMutation = useMutation({
    mutationFn: async () => {
      if (!playerName.trim()) {
        throw new Error("Player name is required");
      }
      if (!roomCode.trim()) {
        throw new Error("Room code is required");
      }
      const response = await apiRequest("POST", `/api/rooms/${roomCode.toUpperCase()}/join`, { 
        playerName: playerName.trim() 
      });
      return response.json();
    },
    onSuccess: (data) => {
      localStorage.setItem("playerId", data.player.id.toString());
      localStorage.setItem("playerName", data.player.name);
      setLocation(`/game/${data.room.code}`);
      toast({
        title: "Joined Room!",
        description: `Welcome to room ${data.room.code}!`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreateRoom = () => {
    createRoomMutation.mutate();
  };

  const handleJoinRoom = () => {
    joinRoomMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">
                <Gamepad2 className="inline w-8 h-8 text-[var(--game-primary)] mr-2" />
                Multiplayer Wordle
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Hero Section */}
          <div className="text-center space-y-6">
            <div className="space-y-2">
              <h2 className="text-4xl font-bold text-gray-900">Challenge Friends to Wordle</h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Create or join a room to compete with friends in real-time Wordle battles. 
                Race to solve the 5-letter word in the fewest guesses!
              </p>
            </div>
            
            {/* Quick Stats */}
            <div className="flex justify-center space-x-8 text-center">
              <div className="space-y-1">
                <div className="text-2xl font-bold text-[var(--game-primary)]">
                  <Target className="w-8 h-8 mx-auto mb-1" />
                  6
                </div>
                <div className="text-sm text-gray-500">Max Guesses</div>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-[var(--game-danger)]">
                  <Clock className="w-8 h-8 mx-auto mb-1" />
                  5:00
                </div>
                <div className="text-sm text-gray-500">Time Limit</div>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-[var(--game-success)]">
                  <Users className="w-8 h-8 mx-auto mb-1" />
                  8
                </div>
                <div className="text-sm text-gray-500">Max Players</div>
              </div>
            </div>
          </div>

          {/* Player Name Input */}
          <div className="max-w-md mx-auto">
            <div className="space-y-2">
              <label htmlFor="playerName" className="block text-sm font-medium text-gray-700">
                Your Name
              </label>
              <Input
                id="playerName"
                type="text"
                placeholder="Enter your name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="text-center"
                maxLength={20}
              />
            </div>
          </div>

          {/* Action Cards */}
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Create Room Card */}
            <Card className="hover:shadow-xl transition-shadow">
              <CardContent className="p-8">
                <div className="text-center space-y-6">
                  <div className="w-16 h-16 bg-[var(--game-primary)]/10 rounded-full flex items-center justify-center mx-auto">
                    <Plus className="w-8 h-8 text-[var(--game-primary)]" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-gray-900">Create New Room</h3>
                    <p className="text-gray-600">Start a new game and invite friends to join</p>
                  </div>
                  <Button 
                    onClick={handleCreateRoom}
                    disabled={!playerName.trim() || createRoomMutation.isPending}
                    className="w-full bg-[var(--game-primary)] text-white hover:bg-indigo-600"
                  >
                    {createRoomMutation.isPending ? "Creating..." : "Create Room"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Join Room Card */}
            <Card className="hover:shadow-xl transition-shadow">
              <CardContent className="p-8">
                <div className="text-center space-y-6">
                  <div className="w-16 h-16 bg-[var(--game-success)]/10 rounded-full flex items-center justify-center mx-auto">
                    <Users className="w-8 h-8 text-[var(--game-success)]" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-gray-900">Join Existing Room</h3>
                    <p className="text-gray-600">Enter a room code to join your friends</p>
                  </div>
                  <div className="space-y-3">
                    <Input 
                      type="text" 
                      placeholder="Enter room code (e.g., ABC123)"
                      value={roomCode}
                      onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                      className="text-center uppercase tracking-wider font-mono"
                      maxLength={6}
                    />
                    <Button 
                      onClick={handleJoinRoom}
                      disabled={!playerName.trim() || !roomCode.trim() || joinRoomMutation.isPending}
                      className="w-full bg-[var(--game-success)] text-white hover:bg-green-600"
                    >
                      {joinRoomMutation.isPending ? "Joining..." : "Join Room"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* How to Play */}
          <Card className="max-w-4xl mx-auto">
            <CardContent className="p-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-6 text-center">How to Play</h3>
              <div className="grid md:grid-cols-3 gap-6 text-center">
                <div className="space-y-3">
                  <div className="w-12 h-12 bg-wordle-correct rounded-full flex items-center justify-center mx-auto">
                    <span className="text-white font-bold">1</span>
                  </div>
                  <h4 className="font-medium text-gray-900">Create or Join</h4>
                  <p className="text-sm text-gray-600">Create a room or join with a room code</p>
                </div>
                <div className="space-y-3">
                  <div className="w-12 h-12 bg-wordle-present rounded-full flex items-center justify-center mx-auto">
                    <span className="text-white font-bold">2</span>
                  </div>
                  <h4 className="font-medium text-gray-900">Guess the Word</h4>
                  <p className="text-sm text-gray-600">Race to guess the 5-letter word in 6 tries</p>
                </div>
                <div className="space-y-3">
                  <div className="w-12 h-12 bg-wordle-absent rounded-full flex items-center justify-center mx-auto">
                    <Trophy className="w-6 h-6 text-white" />
                  </div>
                  <h4 className="font-medium text-gray-900">Compete & Win</h4>
                  <p className="text-sm text-gray-600">Fastest solver with fewest guesses wins!</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
