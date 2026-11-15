import { Chess } from 'https://cdn.jsdelivr.net/npm/chess.js@1.0.0-beta.6/+esm';
import { evaluateFen, cancelEvaluation } from './engine/engine-bridge.js';

export const USER = "snewolliw";
export const TIME_CONTROLS = ['rapid', 'blitz', 'bullet'];
export const STATS_ENDPOINT = `https://api.chess.com/pub/player/${USER}/stats`;
export const ARCHIVES_ENDPOINT = `https://api.chess.com/pub/player/${USER}/games/archives`;

const MATE_THRESHOLD = 90000;
let viewerKeyAbort = null;

function formatScore(score) {
    if (score == null) return '…';
    if (Math.abs(score) >= MATE_THRESHOLD) {
        return score > 0 ? 'M+' : 'M-';
    }
    const pawns = (score / 100).toFixed(1);
    return score > 0 ? `+${pawns}` : pawns;
}

function scoreToBarPercent(score) {
    if (score == null) return 50;
    if (score >= MATE_THRESHOLD) return 100;
    if (score <= -MATE_THRESHOLD) return 0;
    const clamped = Math.max(-800, Math.min(800, score));
    return 50 + (clamped / 800) * 45;
}

export function setupChessViewer(customPieceTheme = null) {
    const container = document.querySelector('.chess-container');

    container.innerHTML = `
        <div class="board-section">
            <div class="board-with-eval">
                <div class="eval-bar" aria-label="position evaluation">
                    <div class="eval-bar-fill"></div>
                    <div class="eval-bar-label">0.0</div>
                </div>
                <div id="board" style="width: 400px"></div>
            </div>
            <div class="chess-controls">
                <button type="button" class="prev-btn btn">&lt; Prev</button>
                <button type="button" class="reset-btn btn">Reset</button>
                <button type="button" class="next-btn btn">Next &gt;</button>
                <button type="button" class="return-game-btn btn" hidden>Return to game</button>
            </div>
        </div>
        <div class="move-list-container">
            <h3>Move List</h3>
            <div class="move-list"></div>
        </div>
    `;

    const evalFill = container.querySelector('.eval-bar-fill');
    const evalLabel = container.querySelector('.eval-bar-label');
    const evalBar = container.querySelector('.eval-bar');
    const returnBtn = container.querySelector('.return-game-btn');

    let orientation = 'white';
    let mainline = [];
    let history = [];
    let currentIndex = -1;
    let exploring = false;
    let branchIndex = -1;
    let evalDebounce = null;

    const game = new Chess();

    function tryMove(spec) {
        try {
            return game.move(spec);
        } catch {
            return null;
        }
    }

    function onDrop(source, target) {
        if (!target || target === 'offboard' || source === target) {
            return 'snapback';
        }

        const attempt = tryMove({
            from: source,
            to: target,
            promotion: 'q'
        });
        if (!attempt) return 'snapback';

        const nextMain = !exploring && currentIndex + 1 < mainline.length
            ? mainline[currentIndex + 1]
            : null;
        const followsMain = nextMain &&
            nextMain.from === attempt.from &&
            nextMain.to === attempt.to &&
            (nextMain.promotion || 'q') === (attempt.promotion || 'q');

        if (!exploring && !followsMain) {
            exploring = true;
            branchIndex = currentIndex;
            history = history.slice(0, currentIndex + 1);
            returnBtn.hidden = false;
        }

        if (exploring || !followsMain) {
            history.push(attempt);
            currentIndex = history.length - 1;
        } else {
            currentIndex += 1;
            history = mainline.slice();
        }

        renderMoveList();
        updateMoveListHighlight();
        scheduleEval();
        return undefined;
    }

    function onDragStart(source, piece) {
        if (game.isGameOver()) return false;
        if (game.turn() === 'w' && piece.startsWith('b')) return false;
        if (game.turn() === 'b' && piece.startsWith('w')) return false;
        return true;
    }

    function onSnapEnd() {
        board.position(game.fen());
    }

    const boardConfig = {
        position: 'start',
        draggable: true,
        onDragStart,
        onDrop,
        onSnapEnd
    };
    if (customPieceTheme) {
        boardConfig.pieceTheme = customPieceTheme;
    }

    const board = Chessboard('board', boardConfig);

    function renderMoveList() {
        const moveList = document.querySelector('.move-list');
        if (!moveList) return;
        moveList.replaceChildren();

        const renderLine = (moves, startOffset, variation) => {
            for (let i = 0; i < moves.length; i += 2) {
                const absWhite = startOffset + i;
                const moveNumber = Math.floor(absWhite / 2) + 1;
                const whiteMove = moves[i];
                const blackMove = moves[i + 1];

                const row = document.createElement('div');
                row.className = variation ? 'move-row variation-row' : 'move-row';

                const numSpan = document.createElement('span');
                numSpan.className = 'move-number';
                numSpan.textContent = `${moveNumber}.`;
                row.appendChild(numSpan);

                const whiteSpan = document.createElement('span');
                whiteSpan.className = variation ? 'move-item variation-move' : 'move-item';
                whiteSpan.textContent = whiteMove.san;
                whiteSpan.dataset.index = String(absWhite);
                whiteSpan.addEventListener('click', () => jumpToMove(absWhite));
                row.appendChild(whiteSpan);

                if (blackMove) {
                    const blackSpan = document.createElement('span');
                    blackSpan.className = variation ? 'move-item variation-move' : 'move-item';
                    blackSpan.textContent = blackMove.san;
                    blackSpan.dataset.index = String(absWhite + 1);
                    blackSpan.addEventListener('click', () => jumpToMove(absWhite + 1));
                    row.appendChild(blackSpan);
                }

                moveList.appendChild(row);
            }
        };

        if (!exploring) {
            renderLine(history, 0, false);
            return;
        }

        const shared = mainline.slice(0, branchIndex + 1);
        const variation = history.slice(branchIndex + 1);

        if (shared.length) {
            renderLine(shared, 0, false);
        }

        if (variation.length) {
            const header = document.createElement('div');
            header.className = 'variation-label';
            header.textContent = 'variation';
            moveList.appendChild(header);

            let i = 0;
            while (i < variation.length) {
                const absIndex = branchIndex + 1 + i;
                const isWhite = absIndex % 2 === 0;
                const moveNumber = Math.floor(absIndex / 2) + 1;

                const row = document.createElement('div');
                row.className = 'move-row variation-row';

                const numSpan = document.createElement('span');
                numSpan.className = 'move-number';
                if (isWhite) {
                    numSpan.textContent = `${moveNumber}.`;
                } else {
                    numSpan.textContent = `${moveNumber}...`;
                }
                row.appendChild(numSpan);

                if (!isWhite) {
                    const blackSpan = document.createElement('span');
                    blackSpan.className = 'move-item variation-move';
                    blackSpan.textContent = variation[i].san;
                    blackSpan.dataset.index = String(absIndex);
                    blackSpan.addEventListener('click', () => jumpToMove(absIndex));
                    row.appendChild(blackSpan);
                    moveList.appendChild(row);
                    i += 1;
                    continue;
                }

                const whiteSpan = document.createElement('span');
                whiteSpan.className = 'move-item variation-move';
                whiteSpan.textContent = variation[i].san;
                whiteSpan.dataset.index = String(absIndex);
                whiteSpan.addEventListener('click', () => jumpToMove(absIndex));
                row.appendChild(whiteSpan);

                if (i + 1 < variation.length) {
                    const blackSpan = document.createElement('span');
                    blackSpan.className = 'move-item variation-move';
                    blackSpan.textContent = variation[i + 1].san;
                    blackSpan.dataset.index = String(absIndex + 1);
                    blackSpan.addEventListener('click', () => jumpToMove(absIndex + 1));
                    row.appendChild(blackSpan);
                    i += 2;
                } else {
                    i += 1;
                }
                moveList.appendChild(row);
            }
        }
    }

    function jumpToMove(targetIndex) {
        game.reset();
        currentIndex = targetIndex;
        for (let i = 0; i <= currentIndex; i++) {
            const m = history[i];
            if (!m) break;
            const played = tryMove(m.san) || tryMove({
                from: m.from,
                to: m.to,
                promotion: m.promotion
            });
            if (!played) break;
        }
        board.position(currentIndex === -1 ? 'start' : game.fen());
        updateMoveListHighlight();
        scheduleEval();
    }

    function updateMoveListHighlight() {
        document.querySelectorAll('.move-item').forEach(el => {
            const idx = parseInt(el.dataset.index, 10);
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

    function updateEvalBar(score) {
        const pct = scoreToBarPercent(score);
        evalFill.style.height = `${pct}%`;
        if (orientation === 'white') {
            evalFill.style.bottom = '0';
            evalFill.style.top = 'auto';
        } else {
            evalFill.style.top = '0';
            evalFill.style.bottom = 'auto';
        }
        evalLabel.textContent = formatScore(score);
        evalBar.classList.toggle('eval-black-better', score < 0);
        evalBar.classList.toggle('eval-white-better', score > 0);
    }

    function scheduleEval() {
        cancelEvaluation();
        evalLabel.textContent = '…';
        clearTimeout(evalDebounce);
        evalDebounce = setTimeout(runEval, 100);
    }

    async function runEval() {
        const fen = game.fen();
        try {
            const result = await evaluateFen(fen, 4);
            if (!result) return;
            updateEvalBar(result.score);
        } catch (err) {
            console.error('Engine eval failed:', err);
            evalLabel.textContent = '—';
        }
    }

    function nextMove() {
        if (currentIndex < history.length - 1) {
            jumpToMove(currentIndex + 1);
        }
    }

    function prevMove() {
        if (currentIndex >= 0) {
            jumpToMove(currentIndex - 1);
        }
    }

    function returnToGame() {
        exploring = false;
        history = mainline.slice();
        currentIndex = Math.min(branchIndex, history.length - 1);
        branchIndex = -1;
        returnBtn.hidden = true;
        renderMoveList();
        jumpToMove(currentIndex);
    }

    document.querySelector('.next-btn')?.addEventListener('click', nextMove);
    document.querySelector('.prev-btn')?.addEventListener('click', prevMove);
    document.querySelector('.reset-btn')?.addEventListener('click', () => jumpToMove(-1));
    returnBtn.addEventListener('click', returnToGame);

    if (viewerKeyAbort) viewerKeyAbort.abort();
    viewerKeyAbort = new AbortController();
    window.addEventListener('keydown', (event) => {
        if (event.target && (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' || event.target.tagName === 'SELECT')) {
            return;
        }
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
            case 'Escape':
                if (exploring) returnToGame();
                break;
            default:
                return;
        }
        event.preventDefault();
    }, { signal: viewerKeyAbort.signal });

    scheduleEval();

    return {
        board,
        game,
        loadGame(pgn, isBlack = false) {
            orientation = isBlack ? 'black' : 'white';
            board.orientation(orientation);
            game.loadPgn(pgn);
            mainline = game.history({ verbose: true });
            history = mainline.slice();
            game.reset();
            currentIndex = -1;
            exploring = false;
            branchIndex = -1;
            returnBtn.hidden = true;
            board.position('start');
            renderMoveList();
            scheduleEval();
        },
        resetToStart() {
            jumpToMove(-1);
        },
        returnToGame
    };
}
