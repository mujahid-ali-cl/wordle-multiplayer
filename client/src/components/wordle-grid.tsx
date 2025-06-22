import { cn } from "@/lib/utils";
import type { LetterState } from "@/lib/wordle-utils";

interface WordleGridProps {
  guesses: string[];
  currentGuess: string;
  evaluations: LetterState[][];
  maxAttempts?: number;
}

export function WordleGrid({ 
  guesses, 
  currentGuess, 
  evaluations, 
  maxAttempts = 6 
}: WordleGridProps) {
  const rows = Array.from({ length: maxAttempts }, (_, index) => {
    if (index < guesses.length) {
      // Completed guess
      return {
        letters: guesses[index].split(''),
        states: evaluations[index] || Array(5).fill('unknown'),
        isComplete: true
      };
    } else if (index === guesses.length) {
      // Current guess row
      const letters = currentGuess.split('').concat(Array(5 - currentGuess.length).fill(''));
      return {
        letters,
        states: Array(5).fill('unknown'),
        isComplete: false,
        isCurrent: true
      };
    } else {
      // Empty row
      return {
        letters: Array(5).fill(''),
        states: Array(5).fill('unknown'),
        isComplete: false
      };
    }
  });

  const getTileStyles = (state: LetterState, isComplete: boolean, isCurrent: boolean, hasLetter: boolean) => {
    const baseStyles = "w-12 h-12 border-2 rounded-md flex items-center justify-center font-mono font-semibold text-lg transition-colors";
    
    if (isComplete) {
      switch (state) {
        case 'correct':
          return cn(baseStyles, "border-wordle-correct bg-wordle-correct text-white");
        case 'present':
          return cn(baseStyles, "border-wordle-present bg-wordle-present text-white");
        case 'absent':
          return cn(baseStyles, "border-wordle-absent bg-wordle-absent text-white");
        default:
          return cn(baseStyles, "border-gray-300 bg-white text-gray-900");
      }
    } else if (isCurrent && hasLetter) {
      return cn(baseStyles, "border-gray-500 bg-white text-gray-900 animate-pulse");
    } else {
      return cn(baseStyles, "border-gray-300 bg-white text-gray-900 hover:border-gray-400");
    }
  };

  return (
    <div className="mx-auto space-y-2" style={{maxWidth: '18rem'}}>
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} className="grid grid-cols-5 gap-0.5">
          {row.letters.map((letter, colIndex) => (
            <div
              key={colIndex}
              className={getTileStyles(
                row.states[colIndex],
                row.isComplete,
                row.isCurrent || false,
                !!letter
              )}
            >
              {letter}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
