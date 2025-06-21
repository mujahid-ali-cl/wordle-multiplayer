import { cn } from "@/lib/utils";
import type { LetterState } from "@/lib/wordle-utils";
import { Button } from "@/components/ui/button";
import { Delete } from "lucide-react";

interface VirtualKeyboardProps {
  onKeyPress: (key: string) => void;
  onEnter: () => void;
  onBackspace: () => void;
  keyboardState: Record<string, LetterState>;
  disabled?: boolean;
}

const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
];

export function VirtualKeyboard({
  onKeyPress,
  onEnter,
  onBackspace,
  keyboardState,
  disabled = false
}: VirtualKeyboardProps) {
  const getKeyStyles = (letter: string) => {
    const state = keyboardState[letter] || 'unknown';
    const baseStyles = "w-10 h-12 rounded font-semibold text-sm transition-colors";
    
    switch (state) {
      case 'correct':
        return cn(baseStyles, "bg-wordle-correct text-white");
      case 'present':
        return cn(baseStyles, "bg-wordle-present text-white");
      case 'absent':
        return cn(baseStyles, "bg-wordle-absent text-white");
      default:
        return cn(baseStyles, "bg-gray-200 text-gray-900 hover:bg-gray-300");
    }
  };

  return (
    <div className="space-y-2">
      {KEYBOARD_ROWS.map((row, rowIndex) => (
        <div key={rowIndex} className="flex justify-center space-x-1">
          {rowIndex === 2 && (
            <Button
              onClick={onEnter}
              disabled={disabled}
              className="px-3 h-12 bg-[var(--game-primary)] text-white rounded font-semibold text-xs hover:bg-indigo-600 transition-colors mr-1"
            >
              ENTER
            </Button>
          )}
          
          {row.map((letter) => (
            <Button
              key={letter}
              onClick={() => onKeyPress(letter)}
              disabled={disabled}
              className={getKeyStyles(letter)}
            >
              {letter}
            </Button>
          ))}
          
          {rowIndex === 2 && (
            <Button
              onClick={onBackspace}
              disabled={disabled}
              className="px-3 h-12 bg-gray-400 text-white rounded font-semibold text-xs hover:bg-gray-500 transition-colors ml-1"
            >
              <Delete className="w-4 h-4" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
