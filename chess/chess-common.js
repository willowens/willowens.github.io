import { Chess } from 'https://cdn.jsdelivr.net/npm/chess.js@1.0.0-beta.6/+esm';

export const USER = "snewolliw";
export const TIME_CONTROLS = ['rapid', 'blitz', 'bullet'];
export const STATS_ENDPOINT = `https://api.chess.com/pub/player/${USER}/stats`;
export const ARCHIVES_ENDPOINT = `https://api.chess.com/pub/player/${USER}/games/archives`;

export function setupChessViewer(customPieceTheme = null) {
    const container = document.querySelector('.chess-container');

    container.innerHTML = `
        <div class="board-section">
            <div id="board" style="width: 400px"></div>
            <div class="chess-controls">
                <button class="prev-btn btn">&lt; Prev</button>
                <button class="reset-btn btn">Reset</button>
                <button class="next-btn btn">Next &gt;</button>
            </div>
        </div>
        <div class="move-list-container">
            <h3>Move List</h3>
            <div class="move-list"></div>
        </div>
    `;

    const boardConfig = {
        position: 'start',
        draggable: false
    };
    if (customPieceTheme) {
        boardConfig.pieceTheme = customPieceTheme;
    }

    const board = Chessboard('board', boardConfig);
    const game = new Chess();
    let history = [];
    let currentIndex = -1;

    function renderMoveList() {
        const moveList = document.querySelector('.move-list');
        if (!moveList) return;
        moveList.replaceChildren();

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

            moveList.appendChild(row);
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

    function nextMove() {
        if (currentIndex < history.length - 1) {
            jumpToMove(currentIndex + 1);
        }
    }

    function prevMove() {
        if (currentIndex >= -1) {
            jumpToMove(currentIndex - 1);
        }
    }

    document.querySelector('.next-btn')?.addEventListener('click', nextMove);
    document.querySelector('.prev-btn')?.addEventListener('click', prevMove);

    window.addEventListener('keydown', (event) => {
        switch (event.key) {
            case ' ':
                jumpToMove(-1);
                break;
            case 'ArrowLeft':
                prevMove();
                break;
            case 'ArrowRight':
                nextMove();
                break;
            default:
                return;
        }
        event.preventDefault();
    });

    return {
        board,
        game,
        loadGame(pgn, isBlack = false) {
            board.orientation(isBlack ? 'black' : 'white');
            game.loadPgn(pgn);
            history = game.history({ verbose: true });
            game.reset();
            currentIndex = -1;
            board.position('start');
            renderMoveList();
        },
        resetToStart() {
            jumpToMove(-1);
        }
    };
}
