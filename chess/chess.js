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
