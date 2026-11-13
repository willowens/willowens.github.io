
import { setupChessViewer, USER, TIME_CONTROLS, STATS_ENDPOINT, ARCHIVES_ENDPOINT } from '../chess-common.js';

let chartInstance = null;
let selectedTimeControl = 'rapid';
let selectedArchiveUrl = null;
let allArchivesList = [];
let chessViewer = null;

const currentDate = new Date();
let selectedYear = currentDate.getFullYear();
let selectedMonth = currentDate.getMonth() + 1;

async function fetchArchives() {
    const archivesResponse = await fetch(ARCHIVES_ENDPOINT);
    if (!archivesResponse.ok) throw new Error('Bad Network Request');
    const archivesData = await archivesResponse.json();

    if (!archivesData.archives || archivesData.archives.length === 0) {
        throw new Error('No game archives found');
    }

    allArchivesList = archivesData.archives;

    const targetPath = `/${selectedYear}/${String(selectedMonth).padStart(2, '0')}`;
    const matchingArchive = allArchivesList.find(url => url.includes(targetPath));

    selectedArchiveUrl = matchingArchive || allArchivesList[allArchivesList.length - 1];

    const parts = selectedArchiveUrl.split('/');
    selectedYear = parseInt(parts[parts.length - 2]);
    selectedMonth = parseInt(parts[parts.length - 1]);

    await loadGamesForArchive(selectedArchiveUrl, selectedTimeControl);
}

async function loadGamesForArchive(archiveUrl, timeControl) {
    let filteredGames = [];
    try {
        const res = await fetch(archiveUrl);
        if (res.ok) {
            const data = await res.json();
            if (data.games) {
                filteredGames = data.games.filter(g => {
                    return g.time_class === timeControl || (g.time_control && g.time_control.includes(timeControl));
                });
            }
        }
    } catch (err) {
        console.error('Error fetching archive games:', err);
    }

    filteredGames.sort((a, b) => a.end_time - b.end_time);
    renderChart(filteredGames, timeControl);
}

function renderChart(games, timeControl) {
    const container = document.querySelector('.chess-container');

    const archiveOptions = allArchivesList.map(url => {
        const parts = url.split('/');
        const y = parts[parts.length - 2];
        const m = parts[parts.length - 1];
        const dateObj = new Date(y, m - 1);
        const label = dateObj.toLocaleString('default', { month: 'long', year: 'numeric' });
        return { url, label, y: parseInt(y), m: parseInt(m) };
    }).reverse();

    container.innerHTML = `
        <div class="plot-section" style="width: 100%; max-width: 750px; display: flex; flex-direction: column; align-items: center;">
            <div class="controls-toolbar" style="margin-bottom: 1rem; display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center; justify-content: center; width: 100%;">
                <div class="time-control-selector" style="display: flex; gap: 0.4rem;">
                    ${TIME_CONTROLS.map(tc => `
                        <button class="btn tc-btn ${tc === timeControl ? 'active-tc' : ''}" data-tc="${tc}">${tc}</button>
                    `).join('')}
                </div>
                <div class="archive-selector" style="display: flex; align-items: center; gap: 0.5rem;">
                    <select class="archiveDropdown btn" style="cursor: pointer; padding: 0.4rem 0.6rem;"></select>
                </div>
                <button class="btn reset-zoom-btn">Reset Zoom</button>
            </div>
            <div style="width: 100%; position: relative;">
                <canvas id="historyChart"></canvas>
            </div>
        </div>
    `;

    const archiveDropdown = document.querySelector('.archiveDropdown');
    archiveDropdown.innerHTML = archiveOptions.map(opt => `
        <option value="${opt.url}" ${opt.url === selectedArchiveUrl ? 'selected' : ''}>${opt.label}</option>
    `).join('');

    document.querySelectorAll('.tc-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            selectedTimeControl = e.target.dataset.tc;
            loadGamesForArchive(selectedArchiveUrl, selectedTimeControl);
        });
    });

    archiveDropdown.addEventListener('change', (e) => {
        selectedArchiveUrl = e.target.value;
        loadGamesForArchive(selectedArchiveUrl, selectedTimeControl);
    });

    const labels = games.map((g) => {
        const date = new Date(g.end_time * 1000);
        return date.toLocaleDateString();
    });

    const dataPoints = games.map(g => {
        const isWhite = g.white.username.toLowerCase() === USER.toLowerCase();
        return isWhite ? g.white.rating : g.black.rating;
    });

    const pointColors = games.map(g => {
        const isWhite = g.white.username.toLowerCase() === USER.toLowerCase();
        const playerResult = isWhite ? g.white.result : g.black.result;
        if (playerResult === 'win') {
            return 'rgb(46, 139, 87)';
        } else if (['resigned', 'checkmated', 'timeout', 'abandoned', 'lose'].includes(playerResult)) {
            return 'rgb(180, 50, 50)';
        } else {
            return 'rgb(80, 80, 80)';
        }
    });

    const ctx = document.getElementById('historyChart').getContext('2d');

    if(chartInstance) { chartInstance.destroy(); }

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: `${timeControl} Elo`,
                data: dataPoints,
                borderColor: 'var(--link)',
                backgroundColor: 'rgba(139, 69, 19, 0.05)',
                tension: 0.1,
                fill: true,
                pointRadius: 4,
                pointHoverRadius: 7,
                pointBackgroundColor: pointColors,
                pointBorderColor: pointColors
            }]
        },
        options: {
            responsive: true,
            onClick: (event, elements) => {
                if (elements.length > 0) {
                    const clickedIndex = elements[0].index;
                    loadGameViewer(games[clickedIndex]);
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        title: () => '',
                        label: function(context) {
                            return ` Rating: ${context.parsed.y}`;
                        }
                    }
                },
                zoom: {
                    pan: {
                        enabled: true,
                        mode: 'x',
                        threshold: 5,
                    },
                    zoom: {
                        wheel: { enabled: true },
                        pinch: { enabled: true },
                        mode: 'x',
                    }
                }
            },
            scales: {
                x: {
                    ticks: { color: 'var(--link)', font: { family: 'ui-monospace, monospace', size: 10 } },
                    grid: { color: 'rgba(139, 69, 19, 0.1)' }
                },
                y: {
                    ticks: { color: 'var(--link)', font: { family: 'ui-monospace, monospace', size: 10 } },
                    grid: { color: 'rgba(139, 69, 19, 0.1)' }
                }
            }
        }
    });

    document.querySelector('.reset-zoom-btn').addEventListener('click', () => {
        chartInstance.resetZoom();
    });
}

function loadGameViewer(gameData) {
    chessViewer = setupChessViewer('../img/chesspieces/wikipedia/{piece}.png');

    const isBlack = gameData.black.username.toLowerCase() === USER.toLowerCase();
    const playerRating = isBlack ? gameData.black.rating : gameData.white.rating;

    const gameDate = new Date(gameData.end_time * 1000);
    const formattedDate = gameDate.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });

    const boardSection = document.querySelector('.board-section');
    const board = document.getElementById('board');

    const gameHeader = document.createElement('div');
    gameHeader.classList.add('game-meta-header');

    gameHeader.innerHTML = `
        <span style="color: var(--link);">${formattedDate}</span>
        <span style="color: var(--ink); font-weight: 400;">elo: ${playerRating}</span>
    `;

    boardSection.insertBefore(gameHeader, board);

    chessViewer.loadGame(gameData.pgn, isBlack);

    const resetBtn = document.querySelector('.reset-btn');
    resetBtn.textContent = 'Back to Plot';
    resetBtn.addEventListener('click', () => {
        loadGamesForArchive(selectedArchiveUrl, selectedTimeControl);
    });
}
fetchArchives().catch((error) => console.error('Failed fetching archives:', error));
