// --- Settings ---
    const levelSettings = {
        easy:   { grid: 2, pairs: 2, hints: 1 },
        medium: { grid: 4, pairs: 8, hints: 2 },
        hard:   { grid: 6, pairs: 15, hints: 3 }
    };
    const allCards = [
        '🍎', '🍌', '🍒', '🍓', '🍊', '🍋', '🍉', '🍇',
        '🥝', '🍍', '🥥', '🍑', '🍈', '🍏', '🍐', '🍔', '🍟', '🍕', '🍪', '🍫'
    ];

    // --- State ---
    let level = localStorage.getItem('memory-level') || 'easy';
    let soundOn = localStorage.getItem('sound-enabled') !== 'off';
    let darkMode = localStorage.getItem('theme') === 'dark';
    let grid = levelSettings[level].grid;
    let pairs = levelSettings[level].pairs;
    let hintMax = levelSettings[level].hints;
    let cards = allCards.slice(0, pairs);
    let gameCards = [];
    let flippedCards = [];
    let matchedPairs = 0;
    let score = 0;
    let timer = null;
    let seconds = 0;
    let gameStarted = false;
    let paused = false;
    let hintsLeft = hintMax;

    // --- DOM ---
    const gameBoard = document.getElementById('game-board');
    const scoreDisplay = document.getElementById('score');
    const timerDisplay = document.getElementById('timer');
    const resetBtn = document.getElementById('reset-btn');
    const winMessage = document.getElementById('win-message');
    const finalTime = document.getElementById('final-time');
    const finalScore = document.getElementById('final-score');
    const playAgainBtn = document.getElementById('play-again-btn');
    const levelSelect = document.getElementById('level-select');
    const soundBtn = document.getElementById('sound-btn');
    const modeBtn = document.getElementById('mode-btn');
    const flipSound = document.getElementById('flip-sound');
    const pauseBtn = document.getElementById('pause-btn');
    const hintBtn = document.getElementById('hint-btn');
    const hintCount = document.getElementById('hint-count');
    const leaderboardBtn = document.getElementById('leaderboard-btn');
    const leaderboardModal = document.getElementById('leaderboard-modal');
    const leaderboardList = document.getElementById('leaderboard-list');
    const closeLeaderboardBtn = document.getElementById('close-leaderboard-btn');
    const showLeaderboardBtn = document.getElementById('show-leaderboard-btn');
    const confettiCanvas = document.getElementById('confetti');

    // --- UI INIT ---
    function setModeUI() {
        if (darkMode) {
            document.body.classList.add('dark-mode');
            modeBtn.innerHTML = '<i class="fas fa-sun"></i>';
        } else {
            document.body.classList.remove('dark-mode');
            modeBtn.innerHTML = '<i class="fas fa-moon"></i>';
        }
    }

    // Set initial mode
    setModeUI();

    // Mode toggle event
    modeBtn.onclick = function() {
        darkMode = !darkMode;
        localStorage.setItem('theme', darkMode ? 'dark' : 'light');
        setModeUI();
    };

    soundBtn.innerHTML = soundOn
        ? '<i class="fas fa-volume-up"></i>'
        : '<i class="fas fa-volume-mute"></i>';
    levelSelect.value = level;

    // --- Event Listeners ---
    levelSelect.onchange = function() {
        level = this.value;
        localStorage.setItem('memory-level', level);
        grid = levelSettings[level].grid;
        pairs = levelSettings[level].pairs;
        hintMax = levelSettings[level].hints;
        cards = allCards.slice(0, pairs);
        hintsLeft = hintMax;
        hintCount.textContent = hintsLeft;
        initGame();
    };
    soundBtn.onclick = function() {
        soundOn = !soundOn;
        localStorage.setItem('sound-enabled', soundOn ? 'on' : 'off');
        soundBtn.innerHTML = soundOn
            ? '<i class="fas fa-volume-up"></i>'
            : '<i class="fas fa-volume-mute"></i>';
    };
    resetBtn.onclick = initGame;
    playAgainBtn.onclick = initGame;
    pauseBtn.onclick = function() {
        if (!gameStarted) return;
        paused = !paused;
        if (paused) {
            pauseBtn.innerHTML = '<i class="fas fa-play mr-2"></i> Resume';
            pauseTimer();
            gameBoard.classList.add('pointer-events-none', 'opacity-50');
        } else {
            pauseBtn.innerHTML = '<i class="fas fa-pause mr-2"></i> Pause';
            resumeTimer();
            gameBoard.classList.remove('pointer-events-none', 'opacity-50');
        }
    };
    hintBtn.onclick = function() {
        if (hintsLeft > 0 && !paused && gameStarted) {
            useHint();
        }
    };
    leaderboardBtn.onclick = showLeaderboard;
    showLeaderboardBtn.onclick = showLeaderboard;
    closeLeaderboardBtn.onclick = function() {
        leaderboardModal.classList.add('hidden');
    };

    // --- Game Logic ---
    function initGame() {
        // Reset state
        gameBoard.innerHTML = '';
        flippedCards = [];
        matchedPairs = 0;
        score = 0;
        scoreDisplay.textContent = score;
        gameStarted = false;
        if (timer) clearInterval(timer);
        seconds = 0;
        updateTimerDisplay();
        winMessage.classList.add('hidden');
        paused = false;
        pauseBtn.innerHTML = '<i class="fas fa-pause mr-2"></i> Pause';
        gameBoard.classList.remove('pointer-events-none', 'opacity-50');
        hintsLeft = hintMax;
        hintCount.textContent = hintsLeft;
        // Set grid columns
        gameBoard.className = `grid gap-4 mb-8 justify-items-center max-w-2xl mx-auto grid-cols-${grid}`;
        // Create and shuffle cards
        gameCards = shuffleArray([...cards, ...cards]);
        // Render cards
        gameCards.forEach((emoji, index) => {
            const card = document.createElement('div');
            card.className = 'card';
            card.dataset.index = index;
            const cardInner = document.createElement('div');
            cardInner.className = 'card-inner';
            const cardFront = document.createElement('div');
            cardFront.className = 'card-front';
            const cardBack = document.createElement('div');
            cardBack.className = 'card-back';
            cardBack.textContent = emoji;
            cardBack.dataset.value = emoji;
            cardInner.appendChild(cardFront);
            cardInner.appendChild(cardBack);
            card.appendChild(cardInner);
            card.addEventListener('click', flipCard);
            gameBoard.appendChild(card);
        });
    }

    function flipCard() {
        if (paused) return;
        if (this.classList.contains('flipped') || flippedCards.length >= 2) return;
        // Play sound
        if (soundOn && flipSound) {
            flipSound.currentTime = 0;
            flipSound.play();
        }
        // Start timer on first move
        if (!gameStarted) {
            startTimer();
            gameStarted = true;
        }
        // Flip the card
        this.classList.add('flipped');
        flippedCards.push(this);
        // Check for match if two cards are flipped
        if (flippedCards.length === 2) {
            checkForMatch();
        }
    }

    function checkForMatch() {
        const [card1, card2] = flippedCards;
        const emoji1 = card1.querySelector('.card-back').dataset.value;
        const emoji2 = card2.querySelector('.card-back').dataset.value;
        score++;
        scoreDisplay.textContent = score;
        if (emoji1 === emoji2) {
            matchedPairs++;
            card1.removeEventListener('click', flipCard);
            card2.removeEventListener('click', flipCard);
            card1.classList.add('matched');
            card2.classList.add('matched');
            flippedCards = [];
            if (matchedPairs === cards.length) {
                endGame();
            }
        } else {
            setTimeout(() => {
                card1.classList.remove('flipped');
                card2.classList.remove('flipped');
                flippedCards = [];
            }, 900);
        }
    }

    function startTimer() {
        timer = setInterval(() => {
            if (!paused) {
                seconds++;
                updateTimerDisplay();
            }
        }, 1000);
    }
    function pauseTimer() {
        if (timer) clearInterval(timer);
    }
    function resumeTimer() {
        startTimer();
    }
    function updateTimerDisplay() {
        const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
        const remainingSeconds = (seconds % 60).toString().padStart(2, '0');
        timerDisplay.textContent = `${minutes}:${remainingSeconds}`;
    }
    function endGame() {
        clearInterval(timer);
        finalTime.textContent = timerDisplay.textContent;
        finalScore.textContent = score;
        winMessage.classList.remove('hidden');
        winMessage.classList.add('flex');
        saveLeaderboard();
        launchConfetti();
    }
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // --- Hint System ---
    function useHint() {
        // Find a pair not matched
        let unmatched = [];
        gameBoard.querySelectorAll('.card:not(.matched)').forEach(card => {
            unmatched.push(card);
        });
        if (unmatched.length < 2) return;
        // Find a pair
        let pair = null;
        outer: for (let i = 0; i < unmatched.length; i++) {
            for (let j = i + 1; j < unmatched.length; j++) {
                let v1 = unmatched[i].querySelector('.card-back').dataset.value;
                let v2 = unmatched[j].querySelector('.card-back').dataset.value;
                if (v1 === v2) {
                    pair = [unmatched[i], unmatched[j]];
                    break outer;
                }
            }
        }
        if (!pair) return;
        // Temporarily flip both
        pair.forEach(card => card.classList.add('flipped', 'hinted'));
        hintsLeft--;
        hintCount.textContent = hintsLeft;
        hintBtn.disabled = hintsLeft === 0;
        setTimeout(() => {
            pair.forEach(card => {
                if (!card.classList.contains('matched')) card.classList.remove('flipped');
                card.classList.remove('hinted');
            });
        }, 1200);
    }

    // --- Leaderboard ---
    function saveLeaderboard() {
        // Ask for name if not already set for this score
        let playerName = localStorage.getItem('memory-player-name') || '';
        while (!playerName || playerName.trim().length < 2) {
            playerName = prompt("Enter your name for the leaderboard (min 2 characters):", playerName || "");
            if (playerName === null) return; // User cancelled prompt
        }
        playerName = playerName.trim().substring(0, 16);
        localStorage.setItem('memory-player-name', playerName);

        // Save best 5 by time for this level
        let board = JSON.parse(localStorage.getItem('memory-leaderboard') || '{}');
        if (!board[level]) board[level] = [];
        board[level].push({ name: playerName, time: seconds, moves: score });
        // Sort by time, then moves
        board[level].sort((a, b) => a.time - b.time || a.moves - b.moves);
        board[level] = board[level].slice(0, 5);
        localStorage.setItem('memory-leaderboard', JSON.stringify(board));
    }

    function showLeaderboard() {
        leaderboardModal.classList.remove('hidden');
        let board = JSON.parse(localStorage.getItem('memory-leaderboard') || '{}');
        let arr = (board[level] || []);
        if (arr.length === 0) {
            leaderboardList.innerHTML = `<div class="text-gray-500">No scores yet for this level.</div>`;
        } else {
            leaderboardList.innerHTML = `
                <table class="w-full text-left">
                    <thead>
                        <tr>
                            <th class="py-1">#</th>
                            <th class="py-1">Name</th>
                            <th class="py-1">Time</th>
                            <th class="py-1">Moves</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${arr.map((item, i) => `
                            <tr>
                                <td class="py-1">${i+1}</td>
                                <td class="py-1">${item.name ? item.name : 'Player'}</td>
                                <td class="py-1">${Math.floor(item.time/60).toString().padStart(2,'0')}:${(item.time%60).toString().padStart(2,'0')}</td>
                                <td class="py-1">${item.moves}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }
    }

    function launchConfetti() {
        // Simple confetti effect
        const colors = ['#ff0', '#0f0', '#00f', '#f00', '#ff0'];
        const count = 30;
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                const confetto = document.createElement('div');
                confetto.className = 'confetto';
                confetto.style.position = 'absolute';
                confetto.style.width = '10px';
                confetto.style.height = '10px';
                confetto.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
                confetto.style.opacity = '0.8';
                confetto.style.pointerEvents = 'none';
                confetto.style.zIndex = '1000';
                confetto.style.left = Math.random() * 100 + 'vw';
                confetto.style.top = Math.random() * 100 + 'vh';
                document.body.appendChild(confetto);
                setTimeout(() => {
                    confetto.remove();
                }, 2000);
            }, i * 100);
        }
    }

    // --- Init ---
    initGame();