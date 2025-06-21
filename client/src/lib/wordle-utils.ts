export type LetterState = 'correct' | 'present' | 'absent' | 'unknown';

export function evaluateGuess(guess: string, answer: string): LetterState[] {
  const result: LetterState[] = [];
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

export function getKeyboardState(guesses: string[], answer: string): Record<string, LetterState> {
  const keyboardState: Record<string, LetterState> = {};
  
  guesses.forEach(guess => {
    const evaluation = evaluateGuess(guess, answer);
    guess.split('').forEach((letter, index) => {
      const currentState = keyboardState[letter];
      const newState = evaluation[index];
      
      // Priority: correct > present > absent > unknown
      if (currentState === 'correct') return;
      if (currentState === 'present' && newState === 'absent') return;
      
      keyboardState[letter] = newState;
    });
  });
  
  return keyboardState;
}

export function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
