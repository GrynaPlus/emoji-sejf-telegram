document.addEventListener("DOMContentLoaded", function() {
  console.log("DOM fully loaded and parsed");

  // UWAGA:
  // Funkcja show_9087151() musi być załadowana z Monetag SDK.
  // Nie definiujemy jej tutaj – korzystamy z kodu dostarczonego przez Monetag.

  // ===============================
  // KONFIGURACJA GRY
  // ===============================
  const boardSize = 5;
  const emojis = [
    "🍌", "🍎", "🍓", "🍇", "🍒", "🍊", "🍍", "🥝", "🍑", "🍉",
    "🍏", "🥭", "🍐", "🍋", "🥥", "🍅", "🥑", "🍆", "🌽", "🥕",
    "🍔", "🍟", "🍕", "🌭", "🥪", "🍜", "🍣", "🍩", "🍪", "☕"
  ];
  const OBSTACLE = "🧱";
  
  function getTargetForLevel(level) {
    return Math.floor(3 + (level - 1) * (100 - 3) / (1000 - 1));
  }
  
  function getNumEmojiTypesForLevel(level) {
    return Math.min(20, 4 + Math.floor((level - 1) * (20 - 4) / (1000 - 1)));
  }
  
  function getCurrentEmojiTypes() {
    const count = getNumEmojiTypesForLevel(currentLevel);
    const offset = (currentLevel - 1) % emojis.length;
    const rotated = [...emojis.slice(offset), ...emojis.slice(0, offset)];
    return rotated.slice(0, count);
  }
  
  function generateNewTile(row, col) {
    const currentEmojis = getCurrentEmojiTypes();
    let candidates = currentEmojis.slice();
    if (col >= 2) {
      const leftEmoji = board[row][col-1];
      const leftEmoji2 = board[row][col-2];
      if (leftEmoji && leftEmoji === leftEmoji2) {
        candidates = candidates.filter(e => e !== leftEmoji);
      }
    }
    if (row <= boardSize - 3) {
      const belowEmoji = board[row+1][col];
      const belowEmoji2 = board[row+2][col];
      if (belowEmoji && belowEmoji === belowEmoji2) {
        candidates = candidates.filter(e => e !== belowEmoji);
      }
    }
    if (candidates.length === 0) {
      return currentEmojis[Math.floor(Math.random() * currentEmojis.length)];
    } else {
      return candidates[Math.floor(Math.random() * candidates.length)];
    }
  }
  
  function addObstacles() {
    if (currentLevel < 3) return;
    const p = Math.min(0.3, 0.1 + (currentLevel - 3) * 0.02);
    for (let r = 0; r < boardSize; r++) {
      for (let c = 0; c < boardSize; c++) {
        if (board[r][c] !== OBSTACLE && Math.random() < p) {
          board[r][c] = OBSTACLE;
        }
      }
    }
  }
  
  function removeObstacles() {
    for (let r = 0; r < boardSize; r++) {
      for (let c = 0; c < boardSize; c++) {
        if (board[r][c] === OBSTACLE) {
          board[r][c] = null;
        }
      }
    }
    applyGravity();
    renderBoard();
    adObstacleElement.classList.add("hidden");
  }
  
  // ===============================
  // ZMIENNE GLOBALNE
  // ===============================
  let currentLevel = 1;
  let safeGoal = {};
  let progress = {};
  let board = [];
  let selectedCell = null;
  let username = "";
  let availableMoves = 50;
  
  // ===============================
  // ELEMENTY DOM
  // ===============================
  const boardElement = document.getElementById("board");
  const goalElement = document.getElementById("goal");
  const movesCounterElement = document.getElementById("moves-counter");
  const adMessageElement = document.getElementById("ad-message");
  const adBtn = document.getElementById("ad-btn");
  const adObstacleElement = document.getElementById("ad-obstacle");
  const adObstacleBtn = document.getElementById("ad-obstacle-btn");
  const messageElement = document.getElementById("message");
  const userDisplay = document.getElementById("user-display");
  const usernameModal = document.getElementById("username-modal");
  const usernameInput = document.getElementById("username-input");
  const usernameSubmit = document.getElementById("username-submit");
  const gameContainer = document.getElementById("game-container");
  
  // ===============================
  // ZAPIS/ODCZYT STANU GRY
  // ===============================
  function saveGameState() {
    const state = {
      currentLevel,
      board,
      progress,
      safeGoal,
      availableMoves,
      username
    };
    localStorage.setItem("gameState", JSON.stringify(state));
  }
  
  function loadGameState() {
    const stateStr = localStorage.getItem("gameState");
    if (stateStr) {
      try {
        const state = JSON.parse(stateStr);
        currentLevel = state.currentLevel;
        board = state.board;
        progress = state.progress;
        safeGoal = state.safeGoal;
        availableMoves = state.availableMoves;
        username = state.username;
        return true;
      } catch (e) {
        console.error("Błąd wczytywania stanu gry", e);
      }
    }
    return false;
  }
  
  function showEncouragement() {
    const messages = ["Świetnie!", "Super!", "Tak trzymaj!", "Rewelacja!", "Brawo!"];
    const msg = messages[Math.floor(Math.random() * messages.length)];
    if (messageElement.textContent === "") {
      messageElement.textContent = msg;
      setTimeout(() => {
        if (messageElement.textContent === msg) {
          messageElement.textContent = "";
        }
      }, 500);
    }
  }
  
  function initGame() {
    if (!loadGameState()) {
      currentLevel = 1;
      const currentEmojis = getCurrentEmojiTypes();
      safeGoal = {};
      progress = {};
      for (let i = 0; i < currentEmojis.length; i++) {
        safeGoal[currentEmojis[i]] = Math.floor(getTargetForLevel(currentLevel) * (1 + i * 0.2));
        progress[currentEmojis[i]] = 0;
      }
      initBoard();
      availableMoves = 50;
    } else {
      boardElement.style.pointerEvents = "auto";
    }
    renderBoard();
    updateGoalDisplay();
    updateMovesDisplay();
    updateUserDisplay();
  }
  
  function initBoard() {
    const currentEmojis = getCurrentEmojiTypes();
    board = [];
    for (let r = 0; r < boardSize; r++) {
      let row = [];
      for (let c = 0; c < boardSize; c++) {
        let possibleEmojis = [...currentEmojis];
        if (c >= 2 && row[c - 1] === row[c - 2]) {
          possibleEmojis = possibleEmojis.filter(e => e !== row[c - 1]);
        }
        if (r >= 2 && board[r - 1][c] === board[r - 2][c]) {
          possibleEmojis = possibleEmojis.filter(e => e !== board[r - 1][c]);
        }
        row.push(possibleEmojis[Math.floor(Math.random() * possibleEmojis.length)]);
      }
      board.push(row);
    }
    addObstacles();
  }
  
  function renderBoard() {
    boardElement.innerHTML = "";
    for (let r = 0; r < boardSize; r++) {
      for (let c = 0; c < boardSize; c++) {
        const cell = document.createElement("div");
        cell.classList.add("cell");
        cell.dataset.row = r;
        cell.dataset.col = c;
        cell.textContent = board[r][c];
        if (board[r][c] === OBSTACLE) {
          cell.classList.add("obstacle");
        } else {
          cell.addEventListener("click", onCellClick);
        }
        boardElement.appendChild(cell);
      }
    }
    if (board.flat().includes(OBSTACLE)) {
      adObstacleElement.classList.remove("hidden");
    } else {
      adObstacleElement.classList.add("hidden");
    }
    saveGameState();
  }
  
  function updateGoalDisplay() {
    const currentEmojis = getCurrentEmojiTypes();
    let html = `<strong>Cel (Poziom ${currentLevel}):</strong> `;
    for (let e of currentEmojis) {
      html += progress[e] >= safeGoal[e]
        ? `${e}: ✅ &nbsp;&nbsp;`
        : `${e}: ${progress[e]}/${safeGoal[e]} &nbsp;&nbsp;`;
    }
    goalElement.innerHTML = html;
  }
  
  function updateMovesDisplay() {
    movesCounterElement.textContent = `Pozostałe ruchy: ${availableMoves}`;
  }
  
  function updateUserDisplay() {
    userDisplay.textContent = `Witaj, ${username}!`;
  }
  
  function onCellClick(e) {
    if (availableMoves <= 0) {
      showAdMessage();
      return;
    }
    const cellDiv = e.currentTarget;
    const r = parseInt(cellDiv.dataset.row);
    const c = parseInt(cellDiv.dataset.col);
    if (!selectedCell) {
      selectedCell = { r, c, element: cellDiv };
      cellDiv.classList.add("selected");
    } else {
      if (selectedCell.r === r && selectedCell.c === c) {
        selectedCell.element.classList.remove("selected");
        selectedCell = null;
        return;
      }
      if (isAdjacent(selectedCell.r, selectedCell.c, r, c)) {
        if (board[selectedCell.r][selectedCell.c] === OBSTACLE || board[r][c] === OBSTACLE) {
          selectedCell.element.classList.remove("selected");
          selectedCell = null;
          return;
        }
        availableMoves--;
        updateMovesDisplay();
        swapCells(selectedCell.r, selectedCell.c, r, c);
        selectedCell.element.classList.remove("selected");
        selectedCell = null;
      } else {
        selectedCell.element.classList.remove("selected");
        selectedCell = { r, c, element: cellDiv };
        cellDiv.classList.add("selected");
      }
    }
  }
  
  function isAdjacent(r1, c1, r2, c2) {
    return (Math.abs(r1 - r2) + Math.abs(c1 - c2)) === 1;
  }
  
  function animateSwap(cell1, cell2, callback) {
    const boardRect = boardElement.getBoundingClientRect();
    const rect1 = cell1.getBoundingClientRect();
    const rect2 = cell2.getBoundingClientRect();
    const offset1 = { x: rect1.left - boardRect.left, y: rect1.top - boardRect.top };
    const offset2 = { x: rect2.left - boardRect.left, y: rect2.top - boardRect.top };
    const clone1 = cell1.cloneNode(true);
    const clone2 = cell2.cloneNode(true);
    clone1.classList.add('animate');
    clone2.classList.add('animate');
    clone1.style.left = offset1.x + 'px';
    clone1.style.top = offset1.y + 'px';
    clone2.style.left = offset2.x + 'px';
    clone2.style.top = offset2.y + 'px';
    boardElement.appendChild(clone1);
    boardElement.appendChild(clone2);
    cell1.style.visibility = 'hidden';
    cell2.style.visibility = 'hidden';
    requestAnimationFrame(() => {
      clone1.style.transform = `translate(${offset2.x - offset1.x}px, ${offset2.y - offset1.y}px)`;
      clone2.style.transform = `translate(${offset1.x - offset2.x}px, ${offset1.y - offset2.y}px)`;
    });
    let finished = 0;
    function onTransitionEnd() {
      finished++;
      if (finished === 2) {
        clone1.remove();
        clone2.remove();
        cell1.style.visibility = 'visible';
        cell2.style.visibility = 'visible';
        callback();
      }
    }
    clone1.addEventListener('transitionend', onTransitionEnd, { once: true });
    clone2.addEventListener('transitionend', onTransitionEnd, { once: true });
  }
  
  function swapCells(r1, c1, r2, c2) {
    const cell1 = document.querySelector(`.cell[data-row='${r1}'][data-col='${c1}']`);
    const cell2 = document.querySelector(`.cell[data-row='${r2}'][data-col='${c2}']`);
    animateSwap(cell1, cell2, () => {
      [board[r1][c1], board[r2][c2]] = [board[r2][c2], board[r1][c1]];
      renderBoard();
      const matches = findMatches();
      if (matches.length > 0) {
        showEncouragement();
        processMatches(matches);
      } else {
        const newCell1 = document.querySelector(`.cell[data-row='${r1}'][data-col='${c1}']`);
        const newCell2 = document.querySelector(`.cell[data-row='${r2}'][data-col='${c2}']`);
        animateSwap(newCell1, newCell2, () => {
          [board[r1][c1], board[r2][c2]] = [board[r2][c2], board[r1][c1]];
          renderBoard();
        });
      }
    });
  }
  
  // ===============================
  // MATCH-3 LOGIKA
  // ===============================
  function findMatches() {
    let matches = [];
    // Sprawdzenie rzędów
    for (let r = 0; r < boardSize; r++) {
      let count = 1;
      for (let c = 1; c < boardSize; c++) {
        if (board[r][c] === board[r][c - 1] && board[r][c] !== OBSTACLE) {
          count++;
        } else {
          if (count >= 3) {
            for (let k = 0; k < count; k++) {
              matches.push({ r: r, c: c - 1 - k });
            }
          }
          count = 1;
        }
      }
      if (count >= 3) {
        for (let k = 0; k < count; k++) {
          matches.push({ r: r, c: boardSize - 1 - k });
        }
      }
    }
    // Sprawdzenie kolumn
    for (let c = 0; c < boardSize; c++) {
      let count = 1;
      for (let r = 1; r < boardSize; r++) {
        if (board[r][c] === board[r - 1][c] && board[r][c] !== OBSTACLE) {
          count++;
        } else {
          if (count >= 3) {
            for (let k = 0; k < count; k++) {
              matches.push({ r: r - 1 - k, c: c });
            }
          }
          count = 1;
        }
      }
      if (count >= 3) {
        for (let k = 0; k < count; k++) {
          matches.push({ r: boardSize - 1 - k, c: c });
        }
      }
    }
    let uniqueMatches = [];
    let seen = {};
    for (let m of matches) {
      const key = `${m.r},${m.c}`;
      if (!seen[key]) {
        seen[key] = true;
        uniqueMatches.push(m);
      }
    }
    return uniqueMatches;
  }
  
  function processMatches(matches) {
    let matchedCoords = new Set();
    for (let match of matches) {
      matchedCoords.add(`${match.r},${match.c}`);
      let tile = board[match.r][match.c];
      if (tile !== OBSTACLE) {
        if (progress.hasOwnProperty(tile)) {
          progress[tile]++;
        }
      }
    }
    // Usuwanie przeszkód przylegających do trafionych kafelków
    for (let r = 0; r < boardSize; r++) {
      for (let c = 0; c < boardSize; c++) {
        if (board[r][c] === OBSTACLE) {
          if ((r > 0 && matchedCoords.has(`${r-1},${c}`)) ||
              (r < boardSize - 1 && matchedCoords.has(`${r+1},${c}`)) ||
              (c > 0 && matchedCoords.has(`${r},${c-1}`)) ||
              (c < boardSize - 1 && matchedCoords.has(`${r},${c+1}`))) {
            matchedCoords.add(`${r},${c}`);
          }
        }
      }
    }
    document.querySelectorAll('.cell').forEach(cell => {
      let r = cell.dataset.row;
      let c = cell.dataset.col;
      if (matchedCoords.has(`${r},${c}`)) {
        cell.classList.add("disappear");
      }
    });
    setTimeout(() => {
      for (let match of matches) {
        board[match.r][match.c] = null;
      }
      applyGravity();
      renderBoard();
      document.querySelectorAll('.cell').forEach(cell => {
        cell.classList.add("drop");
      });
      setTimeout(() => {
        document.querySelectorAll('.cell').forEach(cell => {
          cell.classList.remove("drop");
        });
        updateGoalDisplay();
        checkVictory();
        setTimeout(() => {
          const newMatches = findMatches();
          if (newMatches.length > 0) {
            processMatches(newMatches);
          }
        }, 100);
      }, 500);
    }, 300);
  }
  
  // ===============================
  // NOWA FUNKCJA GRAWITACJI
  // ===============================
  function applyGravity() {
    let moved;
    do {
      moved = false;
      for (let col = 0; col < boardSize; col++) {
        for (let row = boardSize - 1; row > 0; row--) {
          if (board[row][col] === null &&
              board[row - 1][col] !== null &&
              board[row - 1][col] !== OBSTACLE) {
            board[row][col] = board[row - 1][col];
            board[row - 1][col] = null;
            moved = true;
          }
        }
      }
    } while (moved);
    
    for (let col = 0; col < boardSize; col++) {
      for (let row = 0; row < boardSize; row++) {
        if (board[row][col] === null) {
          board[row][col] = generateNewTile(row, col);
        }
      }
    }
  }
  
  function randomEmoji() {
    const currentEmojis = getCurrentEmojiTypes();
    return currentEmojis[Math.floor(Math.random() * currentEmojis.length)];
  }
  
  // ===============================
  // WARUNEK ZWYCIĘSTWA I KOLEJNE POZIOMY
  // ===============================
  function checkVictory() {
    const currentEmojis = getCurrentEmojiTypes();
    let win = true;
    for (let e of currentEmojis) {
      if (progress[e] < safeGoal[e]) {
        win = false;
        break;
      }
    }
    if (win) {
      messageElement.textContent = "Gratulacje! Sejf otwarty!";
      disableBoard();
      openSafeAnimation();
    } else {
      messageElement.textContent = "";
    }
  }
  
  function disableBoard() {
    boardElement.style.pointerEvents = "none";
  }
  
  // ===============================
  // OTWIERANIE SEJFU I PRZEJŚCIE DO KOLEJNEGO POZIOMU
  // ===============================
  function openSafeAnimation() {
    const safeContainer = document.getElementById("safe-container");
    const safeElement = document.getElementById("safe");
    safeContainer.classList.remove("hidden");
    setTimeout(() => {
      safeContainer.classList.add("show");
    }, 50);
    setTimeout(() => {
      safeElement.textContent = "🔓";
      messageElement.textContent = "Poziom ukończony! Przechodzisz do kolejnego...";
      setTimeout(() => {
        // Reklama In-App Interstitial wyświetlana co 2 poziomy
        if (currentLevel % 3 === 0) {
          show_9087151({
            type: 'inApp',
            inAppSettings: { 
              frequency: 1, 
              capping: 0, 
              interval: 30, 
              timeout: 1, 
              everyPage: false 
            }
          }).then(() => {
            nextLevel();
          });
        } else {
          nextLevel();
        }
      }, 2000);
    }, 600);
  }
  
  function nextLevel() {
    currentLevel++;
    const currentEmojis = getCurrentEmojiTypes();
    safeGoal = {};
    progress = {};
    for (let i = 0; i < currentEmojis.length; i++) {
      safeGoal[currentEmojis[i]] = Math.floor(getTargetForLevel(currentLevel) * (1 + i * 0.2));
      progress[currentEmojis[i]] = 0;
    }
    const safeContainer = document.getElementById("safe-container");
    safeContainer.classList.remove("show");
    safeContainer.classList.add("hidden");
    document.getElementById("safe").textContent = "🔒";
    boardElement.style.pointerEvents = "auto";
    initBoard();
    renderBoard();
    updateGoalDisplay();
    updateMovesDisplay();
    saveGameState();
    messageElement.textContent = "";
    setTimeout(() => {
      const newMatches = findMatches();
      if (newMatches.length > 0) {
        processMatches(newMatches);
      }
    }, 100);
  }
  
  function showAdMessage() {
    adMessageElement.classList.remove("hidden");
  }
  
  // ===============================
  // OBSŁUGA REKLAM DLA DODATKOWYCH RUCHÓW
  // ===============================
  adBtn.addEventListener("click", function() {
    show_9087151().then(() => {
      availableMoves += 50;
      updateMovesDisplay();
      adMessageElement.classList.add("hidden");
      saveGameState();
      alert('You have seen an ad!');
    });
  });
  
  // ===============================
  // OBSŁUGA REKLAMY DO USUWANIA PRZESZKÓD
  // ===============================
  adObstacleBtn.addEventListener("click", function() {
    show_9087151().then(() => {
      removeObstacles();
      updateMovesDisplay();
      saveGameState();
      alert('You have seen an ad!');
    });
  });
  
  // ===============================
  // OBSŁUGA MODALA NA NAZWĘ UŻYTKOWNIKA
  // ===============================
  usernameSubmit.addEventListener("click", function() {
    console.log("Przycisk Rozpocznij grę kliknięty");
    const name = usernameInput.value.trim();
    if (name) {
      username = name;
      localStorage.setItem("username", username);
      localStorage.removeItem("gameState");
      usernameModal.style.display = 'none';
      gameContainer.style.display = 'block';
      updateUserDisplay();
      initGame();
    } else {
      alert("Wpisz nazwę użytkownika!");
    }
  });
  
  const savedName = localStorage.getItem("username");
  if (savedName) {
    username = savedName;
    usernameModal.style.display = 'none';
    gameContainer.style.display = 'block';
    updateUserDisplay();
    initGame();
  }
  
  window.addEventListener("beforeunload", saveGameState);
});
