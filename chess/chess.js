import { setupChessViewer, USER, TIME_CONTROLS, STATS_ENDPOINT, ARCHIVES_ENDPOINT } from './chess-common.js';

const viewer = setupChessViewer();

async function getLastGame() {
    const archivesResponse = await fetch(ARCHIVES_ENDPOINT);
    if (!archivesResponse.ok) throw new Error('Bad Network Request');
    const archivesData = await archivesResponse.json();

    if (!archivesData.archives || archivesData.archives.length === 0) {
        throw new Error('No game archives found');
    }

    const latestArchiveUrl = archivesData.archives[archivesData.archives.length - 1];
    const gamesResponse = await fetch(latestArchiveUrl);
    if (!gamesResponse.ok) throw new Error('Bad Network Request');
    const gamesData = await gamesResponse.json();

    if (!gamesData.games || gamesData.games.length === 0) {
        throw new Error('No games found in the latest archive');
    }

    const lastGame = gamesData.games[gamesData.games.length - 1];
    const isBlack = lastGame.black.username.toLowerCase() === USER.toLowerCase();

    viewer.loadGame(lastGame.pgn, isBlack);
}

async function getChessStats(){
    const response = await fetch(STATS_ENDPOINT);
    if(!response.ok) throw new Error('Bad Network Request');

    const chessStats = await response.json();
    for (const control of TIME_CONTROLS) {
        if (chessStats[`chess_${control}`]?.last) {
            const rating = chessStats[`chess_${control}`].last.rating;
            const ratingEl = document.querySelector(`.${control}-rating`);
            if(ratingEl) ratingEl.textContent = `${control}: ${rating}`;
        }
    }
}

getChessStats().catch((error) => console.error('Fetch error:', error));
getLastGame().catch((error) => console.error('Fetch error:', error));
