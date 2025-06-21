import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { WordleGrid } from "@/components/wordle-grid";
import { VirtualKeyboard } from "@/components/virtual-keyboard";
import { PlayerList } from "@/components/player-list";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatTime, getKeyboardState, evaluateGuess } from "@/lib/wordle-utils";
import type { GameState, GuessResult, Player } from "@shared/schema";
import { 
  Gamepad2, 
  Clock, 
  Copy, 
  Play, 
  Flag, 
  DoorOpen,
  Users,
  Trophy
} from "lucide-react";

export default function Game() {
  const [match, params] = useRoute("/game/:roomCode");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const roomCode = params?.roomCode?.toUpperCase();
  const playerId = parseInt(localStorage.getItem("playerId") || "0");
  const playerName = localStorage.getItem("playerName") || "";

  const [currentGuess, setCurrentGuess] = useState("");
  const [evaluations, setEvaluations] = useState<Array<('correct' | 'present' | 'absent')[]>>([]);

  // Redirect if no player data
  useEffect(() => {
    if (!playerId || !playerName) {
      setLocation("/");
    }
  }, [playerId, playerName, setLocation]);

  // Fetch game state with polling
  const { data: gameState, isLoading, error } = useQuery<GameState>({
    queryKey: ['/api/rooms', roomCode],
    enabled: !!roomCode,
    // refetchInterval: (data) => {
    //   // Poll more frequently during active gameplay
    //   if (data?.room?.status === "playing") return 2000;
    //   if (data?.room?.status === "waiting") return 3000;
    //   return false; // Stop polling when finished
    // },
    refetchInterval: 1000,
    queryFn: async () => {
      const response = await fetch(`/api/rooms/${roomCode}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch game state");
      }
      return response.json();
    },
  });

  const currentPlayer = gameState?.players.find(p => p.id === playerId);

  // Redirect to results when game is finished
  useEffect(() => {
    if (gameState?.room.status === "finished") {
      setTimeout(() => {
        setLocation(`/results/${roomCode}`);
      }, 1000);
    }
  }, [gameState?.room.status, roomCode, setLocation]);

  // Start game mutation
  const startGameMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/rooms/${roomCode}/start`, { playerId });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rooms', roomCode] });
      toast({
        title: "Game Started!",
        description: "The game has begun. Good luck!",
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

  // Submit guess mutation
  const submitGuessMutation = useMutation({
    mutationFn: async (guess: string) => {
      const response = await apiRequest("POST", `/api/rooms/${roomCode}/guess`, { 
        playerId, 
        guess: guess.toUpperCase() 
      });
      return response.json();
    },
    onSuccess: (result: GuessResult) => {
      setEvaluations(prev => [...prev, result.result]);
      setCurrentGuess("");
      queryClient.invalidateQueries({ queryKey: ['/api/rooms', roomCode] });
      
      if (result.isWin) {
        toast({
          title: "Congratulations!",
          description: "You solved the word!",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Invalid Guess",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update current guess mutation (for real-time typing)
  const updateCurrentGuessMutation = useMutation({
    mutationFn: async (guess: string) => {
      await apiRequest("POST", `/api/rooms/${roomCode}/current-guess`, { 
        playerId, 
        currentGuess: guess 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rooms', roomCode] });
    },
  });

  // Leave room mutation
  const leaveRoomMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/rooms/${roomCode}/players/${playerId}`);
    },
    onSuccess: () => {
      localStorage.removeItem("playerId");
      localStorage.removeItem("playerName");
      setLocation("/");
      toast({
        title: "Left Room",
        description: "You have left the game.",
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

  // Keyboard handlers
  const handleKeyPress = useCallback((key: string) => {
    if (currentGuess.length < 5 && !submitGuessMutation.isPending) {
      const newGuess = currentGuess + key;
      setCurrentGuess(newGuess);
      updateCurrentGuessMutation.mutate(newGuess);
    }
  }, [currentGuess, submitGuessMutation.isPending, updateCurrentGuessMutation]);

  const handleBackspace = useCallback(() => {
    if (currentGuess.length > 0 && !submitGuessMutation.isPending) {
      const newGuess = currentGuess.slice(0, -1);
      setCurrentGuess(newGuess);
      updateCurrentGuessMutation.mutate(newGuess);
    }
  }, [currentGuess, submitGuessMutation.isPending, updateCurrentGuessMutation]);

  const handleEnter = useCallback(() => {
    if (currentGuess.length === 5 && !submitGuessMutation.isPending) {
      submitGuessMutation.mutate(currentGuess);
    }
  }, [currentGuess, submitGuessMutation, toast]);

  // Physical keyboard support
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (gameState?.room.status !== "playing" || currentPlayer?.status !== "playing") return;

      const key = event.key.toUpperCase();
      
      if (key === "ENTER") {
        event.preventDefault();
        handleEnter();
      } else if (key === "BACKSPACE") {
        event.preventDefault();
        handleBackspace();
      } else if (/^[A-Z]$/.test(key)) {
        event.preventDefault();
        handleKeyPress(key);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameState?.room.status, currentPlayer?.status, handleKeyPress, handleBackspace, handleEnter]);

  const copyRoomCode = async () => {
    if (roomCode) {
      await navigator.clipboard.writeText(roomCode);
      toast({
        title: "Copied!",
        description: "Room code copied to clipboard.",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-8 w-24" />
            </div>
          </div>
        </header>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid lg:grid-cols-4 gap-8">
            <div className="lg:col-span-3 space-y-6">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-96 w-full" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-60 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !gameState) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <div className="text-red-500 mb-4">
              <Gamepad2 className="h-12 w-12 mx-auto" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Room Not Found</h1>
            <p className="text-gray-600 mb-4">
              {error?.message || "The room you're looking for doesn't exist."}
            </p>
            <Button onClick={() => setLocation("/")} className="w-full">
              Return to Lobby
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { room, players, timeRemaining } = gameState;
  const isHost = currentPlayer?.isHost;
  const canPlay = room.status === "playing" && currentPlayer?.status === "playing" && !currentPlayer.solved;
  const keyboardState = currentPlayer ? getKeyboardState(currentPlayer.guesses, room.word || "") : {};

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
              <span className="bg-[var(--game-primary)] text-white px-3 py-1 rounded-full text-sm font-mono">
                Room: {room.code}
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              {room.status === "playing" && (
                <div className="bg-[var(--game-danger)] text-white px-3 py-1 rounded-full text-sm font-mono">
                  <Clock className="inline w-4 h-4 mr-1" />
                  {formatTime(timeRemaining)}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          
          {/* Game Board */}
          <div className="lg:col-span-3 space-y-6">
            {/* Game Header */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-gray-900">
                    {room.status === "waiting" ? "Waiting for Players" : "Game in Progress"}
                  </h3>
                  <div className="flex items-center space-x-4">
                    {currentPlayer && (
                      <>
                        <div className="text-sm text-gray-500">
                          Guesses: <span className="font-semibold text-gray-900">{currentPlayer.attempts}/6</span>
                        </div>
                        <div className="text-sm text-gray-500">
                          Time: <span className="font-semibold text-[var(--game-danger)]">{formatTime(currentPlayer.timeElapsed)}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                
                {room.status === "playing" && (
                  <Progress value={(currentPlayer?.attempts || 0) / 6 * 100} className="w-full" />
                )}
              </CardContent>
            </Card>

            {room.status === "waiting" ? (
              /* Waiting Screen */
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="space-y-6">
                    <div>
                      <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                        Waiting for Game to Start
                      </h3>
                      <p className="text-gray-600">
                        {players.length} player{players.length !== 1 ? 's' : ''} in the room
                      </p>
                    </div>
                    
                    {isHost && (
                      <Button
                        onClick={() => startGameMutation.mutate()}
                        disabled={startGameMutation.isPending || players.length === 0}
                        className="bg-[var(--game-primary)] text-white hover:bg-indigo-600"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        {startGameMutation.isPending ? "Starting..." : "Start Game"}
                      </Button>
                    )}
                    
                    {!isHost && (
                      <p className="text-sm text-gray-500">
                        Waiting for the host to start the game...
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              /* Game Interface */
              <>
                {/* Wordle Grid */}
                <Card>
                  <CardContent className="p-8">
                    <WordleGrid
                      guesses={currentPlayer?.guesses || []}
                      currentGuess={currentGuess}
                      evaluations={evaluations}
                    />
                  </CardContent>
                </Card>

                {/* Virtual Keyboard */}
                <Card>
                  <CardContent className="p-6">
                    <VirtualKeyboard
                      onKeyPress={handleKeyPress}
                      onEnter={handleEnter}
                      onBackspace={handleBackspace}
                      keyboardState={keyboardState}
                      disabled={!canPlay || submitGuessMutation.isPending}
                    />
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Room Info */}
            <Card>
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  <h3 className="font-semibold text-gray-900">Room {room.code}</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Players:</span>
                      <span className="font-semibold">{players.length}/{room.maxPlayers}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Status:</span>
                      <span className="font-semibold capitalize">{room.status}</span>
                    </div>
                  </div>
                  <Button
                    onClick={copyRoomCode}
                    variant="outline"
                    className="w-full"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Room Code
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Live Players */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-gray-900 mb-4">
                  {room.status === "playing" ? "Live Progress" : "Players"}
                </h3>
                <PlayerList players={players} currentPlayerId={playerId} />
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Actions</h3>
                <div className="space-y-3">
                  {canPlay && currentPlayer.attempts < 6 && (
                    <Button
                      onClick={() => {
                        // Give up current round
                        const emptyGuesses = Array(6 - currentPlayer.attempts).fill("ZZZZZ");
                        emptyGuesses.forEach(() => {
                          submitGuessMutation.mutate("ZZZZZ");
                        });
                      }}
                      variant="outline"
                      className="w-full text-gray-600 border-gray-300 hover:bg-gray-50"
                    >
                      <Flag className="w-4 h-4 mr-2" />
                      Give Up
                    </Button>
                  )}
                  <Button
                    onClick={() => leaveRoomMutation.mutate()}
                    disabled={leaveRoomMutation.isPending}
                    variant="outline"
                    className="w-full border-red-300 text-red-600 hover:bg-red-50"
                  >
                    <DoorOpen className="w-4 h-4 mr-2" />
                    {leaveRoomMutation.isPending ? "Leaving..." : "Leave Room"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
