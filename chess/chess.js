import { Chess } from 'https://cdn.jsdelivr.net/npm/chess.js@1.0.0-beta.6/+esm';

const board = Chessboard('board', {
    position: 'start',
    draggable: true
});

const game = new Chess();
const samplePgn = '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7';
game.loadPgn(samplePgn);

const history = game.history({ verbose: true });
game.reset();
let currentIndex = -1;

document.querySelector('.next-btn').addEventListener('click', () => {
    if (currentIndex < history.length - 1) {
        currentIndex++;
        game.move(history[currentIndex].san);
        board.position(game.fen());
    }
});

document.querySelector('.prev-btn').addEventListener('click', () => {
    if (currentIndex >= 0) {
        game.undo();
        board.position(game.fen());
        currentIndex--;
    }
});

const TIME_CONTROLS = ['rapid', 'blitz', 'bullet'];

async function getChessStats() {
  const response = await fetch('https://api.chess.com/pub/player/snewolliw/stats');

  if(!response.ok) throw new Error('Network response was not ok');

  const chessStats = await response.json();
  for (const control of TIME_CONTROLS) {
    const rating = chessStats[`chess_${control}`].last.rating;
    document.querySelector(`.${control}-rating`).textContent = `${control}: ${rating}`;
  }
}

getChessStats().catch((error) => console.error('Fetch error:', error));
