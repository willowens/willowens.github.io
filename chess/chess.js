import { Chess } from 'https://cdn.jsdelivr.net/npm/chess.js@1.0.0-beta.6/+esm';

const board = Chessboard('board', {
    position: 'start',
    draggable: true
});

const game = new Chess();
let history = [];
let currentIndex = -1;

const TIME_CONTROLS = ['rapid', 'blitz', 'bullet'];
const USER = "snewolliw";
const STATS_ENDPOINT = `https://api.chess.com/pub/player/${USER}/stats`;
const ARCHIVES_ENDPOINT = `https://api.chess.com/pub/player/${USER}/games/archives`;

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
    board.orientation(isBlack ? 'black' : 'white');

    game.loadPgn(lastGame.pgn);
    history = game.history({ verbose: true });

    game.reset();
    currentIndex = -1;
    board.position('start');

    renderMoveList();
}

function renderMoveList() {
    const moveListEl = document.querySelector('.move-list');
    moveListEl.innerHTML = '';

    for (let i = 0; i < history.length; i += 2) {
        const moveNumber = Math.floor(i / 2) + 1;
        const whiteMove = history[i];
        const blackMove = history[i + 1];

        const row = document.createElement('div');
        row.className = 'move-row';

        const numSpan = document.createElement('span');
        numSpan.className = 'move-number';
        numSpan.textContent = `${moveNumber}.`;
        row.appendChild(numSpan);

        const whiteSpan = document.createElement('span');
        whiteSpan.className = 'move-item';
        whiteSpan.textContent = whiteMove.san;
        whiteSpan.dataset.index = i;
        whiteSpan.addEventListener('click', () => jumpToMove(i));
        row.appendChild(whiteSpan);

        if (blackMove) {
            const blackSpan = document.createElement('span');
            blackSpan.className = 'move-item';
            blackSpan.textContent = blackMove.san;
            blackSpan.dataset.index = i + 1;
            blackSpan.addEventListener('click', () => jumpToMove(i + 1));
            row.appendChild(blackSpan);
        }

        moveListEl.appendChild(row);
    }
}

function jumpToMove(targetIndex) {
    game.reset();
    currentIndex = targetIndex;
    for (let i = 0; i <= currentIndex; i++) {
        game.move(history[i].san);
    }
    board.position(currentIndex === -1 ? 'start' : game.fen());
    updateMoveListHighlight();
}

function updateMoveListHighlight() {
    document.querySelectorAll('.move-item').forEach(el => {
        const idx = parseInt(el.dataset.index);
        if (idx === currentIndex) {
            el.classList.add('active');
            el.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'nearest'
            });
        } else {
            el.classList.remove('active');
        }
    });
}

document.querySelector('.next-btn').addEventListener('click', () => {
    if (currentIndex < history.length - 1) {
        jumpToMove(currentIndex + 1);
    }
});

document.querySelector('.prev-btn').addEventListener('click', () => {
    if (currentIndex >= -1) {
        jumpToMove(currentIndex - 1);
    }
});

document.querySelector('.reset-btn').addEventListener('click', () => {
    jumpToMove(-1);
});

async function getChessStats(){
    const response = await fetch(STATS_ENDPOINT);
    if(!response.ok) throw new Error('Bad Network Request');

    const chessStats = await response.json();
    for (const control of TIME_CONTROLS) {
        if (chessStats[`chess_${control}`]?.last) {
            const rating = chessStats[`chess_${control}`].last.rating;
            const ratingEl = document.querySelector(`.${control}-rating`);
            if (ratingEl) ratingEl.textContent = `${control}: ${rating}`;
        }
    }
}

getChessStats().catch((error) => console.error('Fetch error:', error));
getLastGame().catch((error) => console.error('Fetch error:', error));
