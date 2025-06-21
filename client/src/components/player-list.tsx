import { formatTime } from "@/lib/wordle-utils";
import type { Player } from "@shared/schema";
import { Crown, User } from "lucide-react";

interface PlayerListProps {
  players: Player[];
  currentPlayerId?: number;
}

export function PlayerList({ players, currentPlayerId }: PlayerListProps) {
  const getPlayerStatusColor = (player: Player) => {
    if (player.solved) return "text-green-600";
    if (player.status === "finished") return "text-gray-500";
    if (player.status === "playing") return "text-blue-600";
    return "text-gray-400";
  };

  const getPlayerBgColor = (player: Player) => {
    if (player.solved) return "bg-green-50 border-green-200";
    if (player.id === currentPlayerId) return "bg-blue-50 border-blue-200";
    return "bg-gray-50";
  };

  const getPlayerStatus = (player: Player) => {
    if (player.solved) return "Solved!";
    if (player.status === "finished") return "Finished";
    if (player.status === "playing") {
      if (player.currentGuess) return "Typing...";
      return "Thinking...";
    }
    return "Waiting...";
  };

  const getPlayerInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-3">
      {players.map((player) => (
        <div
          key={player.id}
          className={`flex items-center justify-between p-3 rounded-lg border ${getPlayerBgColor(player)}`}
        >
          <div className="flex items-center space-x-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              player.solved ? 'bg-green-500' : 
              player.id === currentPlayerId ? 'bg-blue-500' : 'bg-gray-400'
            }`}>
              {player.solved ? (
                <Crown className="w-4 h-4 text-white" />
              ) : (
                <span className="text-white text-xs font-semibold">
                  {getPlayerInitials(player.name)}
                </span>
              )}
            </div>
            <div>
              <div className="font-medium text-sm text-gray-900 flex items-center gap-2">
                {player.name}
                {player.isHost && <Crown className="w-3 h-3 text-yellow-500" />}
                {player.id === currentPlayerId && <User className="w-3 h-3 text-blue-500" />}
              </div>
              <div className={`text-xs font-medium ${getPlayerStatusColor(player)}`}>
                {getPlayerStatus(player)}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold text-gray-900">
              {player.attempts}/6
            </div>
            <div className="text-xs text-gray-500">
              {formatTime(player.timeElapsed)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
