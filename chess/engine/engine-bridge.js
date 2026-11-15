import createChessEngine from './engine.js';

const DEFAULT_DEPTH = 10;
const WASM_URL = new URL('./engine.wasm', import.meta.url).href;

let modulePromise = null;
let evalToken = 0;

function loadModule() {
    if (!modulePromise) {
        modulePromise = createChessEngine({
            locateFile(path) {
                if (path.endsWith('.wasm')) return WASM_URL;
                return path;
            }
        }).catch((err) => {
            modulePromise = null;
            throw err;
        });
    }
    return modulePromise;
}

export async function evaluateFen(fen, depth = DEFAULT_DEPTH) {
    const token = ++evalToken;
    const Module = await loadModule();
    if (token !== evalToken) return null;

    await new Promise((r) => setTimeout(r, 0));
    if (token !== evalToken) return null;

    const score = Module.ccall(
        'engine_eval_fen',
        'number',
        ['string', 'number'],
        [fen, depth]
    );

    if (token !== evalToken) return null;

    let bestMove = '';
    try {
        bestMove = Module.ccall('engine_best_move', 'string', [], []) || '';
    } catch {
        bestMove = '';
    }

    return { score, bestMove, depth };
}

export function cancelEvaluation() {
    evalToken++;
}

export { DEFAULT_DEPTH };
