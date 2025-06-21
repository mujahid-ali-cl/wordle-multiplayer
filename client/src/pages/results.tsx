import { useQuery } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatTime } from "@/lib/wordle-utils";
import type { GameState, LeaderboardEntry } from "@shared/schema";
import { 
  Trophy, 
  Home, 
  RefreshCw, 
  Target, 
  Clock, 
  Medal, 
  Crown
} from "lucide-react";

export default function Results() {
  const [match, params] = useRoute("/results/:roomCode");
  const [, setLocation] = useLocation();
  
  const roomCode = params?.roomCode?.toUpperCase();
  const playerId = parseInt(localStorage.getItem("playerId") || "0");

  // Fetch final game state
  const { data: gameState, isLoading } = useQuery<GameState>({
    queryKey: ['/api/rooms', roomCode],
    enabled: !!roomCode,
  });

  // Fetch leaderboard
  const { data: leaderboard, isLoading: leaderboardLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ['/api/rooms', roomCode, 'leaderboard'],
    enabled: !!roomCode,
    queryFn: async () => {
      const response = await fetch(`/api/rooms/${roomCode}/leaderboard`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch leaderboard");
      }
      return response.json();
    },
  });

  const handleNewRoom = () => {
    localStorage.removeItem("playerId");
    localStorage.removeItem("playerName");
    setLocation("/");
  };

  const handlePlayAgain = () => {
    setLocation("/");
  };

  if (isLoading || leaderboardLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <Skeleton className="h-8 w-48" />
            </div>
          </div>
        </header>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-8">
            <div className="text-center">
              <Skeleton className="h-20 w-20 rounded-full mx-auto mb-4" />
              <Skeleton className="h-8 w-64 mx-auto mb-2" />
              <Skeleton className="h-6 w-48 mx-auto" />
            </div>
            <Skeleton className="h-96 w-full max-w-4xl mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  if (!gameState || !leaderboard) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <div className="text-red-500 mb-4">
              <Trophy className="h-12 w-12 mx-auto" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Results Not Found</h1>
            <p className="text-gray-600 mb-4">
              Unable to load game results.
            </p>
            <Button onClick={handleNewRoom} className="w-full">
              Return to Lobby
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentPlayerResult = leaderboard.find(entry => entry.player.id === playerId);
  const winner = leaderboard[0];

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Medal className="w-6 h-6 text-orange-400" />;
      default:
        return (
          <div className="w-8 h-8 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center font-bold text-sm">
            {rank}
          </div>
        );
    }
  };

  const getRankBgColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200";
      case 2:
        return "bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200";
      case 3:
        return "bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200";
      default:
        return "bg-gray-50";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold text-gray-900">
              <Trophy className="inline w-8 h-8 text-[var(--game-primary)] mr-2" />
              Game Results
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          
          {/* Game Results Header */}
          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-wordle-correct rounded-full flex items-center justify-center mx-auto">
              <Trophy className="w-10 h-10 text-white" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-gray-900">Game Complete!</h2>
              <p className="text-lg text-gray-600">
                The word was: <span className="font-bold text-wordle-correct text-2xl">{gameState.room.word}</span>
              </p>
            </div>
          </div>

          {/* Final Leaderboard */}
          <Card className="overflow-hidden max-w-4xl mx-auto">
            <div className="bg-gradient-to-r from-[var(--game-primary)] to-indigo-600 px-8 py-6">
              <h3 className="text-2xl font-bold text-white text-center">Final Results</h3>
            </div>
            
            <CardContent className="p-8 space-y-4">
              {leaderboard.map((entry, index) => (
                <div
                  key={entry.player.id}
                  className={`flex items-center justify-between p-4 rounded-xl border ${getRankBgColor(entry.rank)}`}
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-12 h-12">
                      {getRankIcon(entry.rank)}
                    </div>
                    <div>
                      <div className="font-bold text-lg text-gray-900 flex items-center gap-2">
                        {entry.player.name}
                        {entry.player.id === playerId && (
                          <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">You</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        {entry.rank === 1 ? "Winner!" : `${entry.rank === 2 ? "2nd" : entry.rank === 3 ? "3rd" : `${entry.rank}th`} Place`}
                      </div>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="font-bold text-lg text-gray-900">
                      {entry.player.solved ? `${entry.player.attempts}/6` : "Failed"}
                    </div>
                    <div className="text-sm text-gray-500">{formatTime(entry.player.timeElapsed)}</div>
                    <div className={`text-xs font-medium ${entry.rank === 1 ? "text-yellow-600" : "text-gray-500"}`}>
                      {entry.score} pts
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Personal Statistics */}
          {currentPlayerResult && (
            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <Card className="text-center">
                <CardContent className="p-6">
                  <div className="text-3xl font-bold text-wordle-correct mb-2">
                    <Target className="w-8 h-8 mx-auto mb-2" />
                    {currentPlayerResult.player.solved ? currentPlayerResult.player.attempts : "X"}/6
                  </div>
                  <div className="text-sm text-gray-600">Your Guesses</div>
                </CardContent>
              </Card>
              
              <Card className="text-center">
                <CardContent className="p-6">
                  <div className="text-3xl font-bold text-[var(--game-primary)] mb-2">
                    <Clock className="w-8 h-8 mx-auto mb-2" />
                    {formatTime(currentPlayerResult.player.timeElapsed)}
                  </div>
                  <div className="text-sm text-gray-600">Your Time</div>
                </CardContent>
              </Card>
              
              <Card className="text-center">
                <CardContent className="p-6">
                  <div className="text-3xl font-bold text-[var(--game-warning)] mb-2">
                    <Trophy className="w-8 h-8 mx-auto mb-2" />
                    {currentPlayerResult.rank === 1 ? "1st" : 
                     currentPlayerResult.rank === 2 ? "2nd" : 
                     currentPlayerResult.rank === 3 ? "3rd" : 
                     `${currentPlayerResult.rank}th`}
                  </div>
                  <div className="text-sm text-gray-600">Your Rank</div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-center space-x-4 max-w-md mx-auto">
            <Button 
              onClick={handlePlayAgain}
              className="flex-1 bg-[var(--game-primary)] text-white hover:bg-indigo-600"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Play Again
            </Button>
            <Button 
              onClick={handleNewRoom}
              variant="outline"
              className="flex-1"
            >
              <Home className="w-4 h-4 mr-2" />
              New Room
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
