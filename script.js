document.addEventListener("DOMContentLoaded", function() {
  console.log("DOM fully loaded and parsed");

  // ===============================
  // KONFIGURACJA GRY
  // ===============================
  const boardSize = 5;
  // Rozszerzona baza emoji – owoce, warzywa oraz kilka innych symboli
  const emojis = [
    "🍌", "🍎", "🍓", "🍇", "🍒", "🍊", "🍍", "🥝", "🍑", "🍉",
    "🍏", "🥭", "🍐", "🍋", "🥥", "🍅", "🥑", "🍆", "🌽", "🥕",
    "🍔", "🍟", "🍕", "🌭", "🥪", "🍜", "🍣", "🍩", "🍪", "☕"
  ];

  // Bazowy cel – rośnie liniowo (od 3 do 100 przy poziomie 1000)
  function getTargetForLevel(level) {
    return Math.floor(3 + (level - 1) * (100 - 3) / (1000 - 1));
  }

  // Liczba typów emoji używanych w poziomie – od 4 do 20
  function getNumEmojiTypesForLevel(level) {
    return Math.min(20, 4 + Math.floor((level - 1) * (20 - 4) / (1000 - 1)));
  }

  // Zwraca bieżący zbiór emoji (podzbiór z pełnej listy)
  function getCurrentEmojiTypes() {
    const count = getNumEmojiTypesForLevel(currentLevel);
    return emojis.slice(0, count);
  }

  // ===============================
  // ZMIENNE GLOBALNE
  // ===============================
  let currentLevel = 1;
  let safeGoal = {};   // Dla każdego emoji inny cel (bazowy + indeks*2)
  let progress = {};   // Postęp zbierania
  let board = [];
  let selectedCell = null;
  let username = "";
  let availableMoves = 50;  // Na początku gracz ma 50 ruchów

  // ===============================
  // ELEMENTY DOM
  // ===============================
  const boardElement = document.getElementById("board");
  const goalElement = document.getElementById("goal");
  const movesCounterElement = document.getElementById("moves-counter");
  const adMessageElement = document.getElementById("ad-message");
  const adBtn = document.getElementById("ad-btn");
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

  // ===============================
  // INICJALIZACJA GRY
  // ===============================
  function initGame() {
    if (!loadGameState()) {
      currentLevel = 1;
      const currentEmojis = getCurrentEmojiTypes();
      safeGoal = {};
      progress = {};
      // Każdemu emoji przypisujemy cel: bazowy cel + (indeks * 2)
      for (let i = 0; i < currentEmojis.length; i++) {
        safeGoal[currentEmojis[i]] = getTargetForLevel(currentLevel) + i * 2;
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

  // Generowanie planszy – zapobiegamy trzem tym samym obok siebie
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
  }

  // ===============================
  // RENDEROWANIE I AKTUALIZACJE
  // ===============================
  function renderBoard() {
    boardElement.innerHTML = "";
    for (let r = 0; r < boardSize; r++) {
      for (let c = 0; c < boardSize; c++) {
        const cell = document.createElement("div");
        cell.classList.add("cell");
        cell.dataset.row = r;
        cell.dataset.col = c;
        cell.textContent = board[r][c];
        cell.addEventListener("click", onCellClick);
        boardElement.appendChild(cell);
      }
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

  // ===============================
  // OBSŁUGA KLIKNIĘĆ I ANIMACJI
  // ===============================
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

  // Animacja zamiany – klonujemy elementy, animujemy transformację
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
  // MATCH-3 LOGIKA – znikanie, grawitacja, opadanie, cascade
  // ===============================
  function findMatches() {
    let matches = [];
    // Sprawdzenie rzędów
    for (let r = 0; r < boardSize; r++) {
      let count = 1;
      for (let c = 1; c < boardSize; c++) {
        if (board[r][c] === board[r][c - 1]) {
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
        if (board[r][c] === board[r - 1][c]) {
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

  // Animacja znikania – dodajemy klasę .disappear, następnie opadanie nowych kafelek
  function processMatches(matches) {
    let matchedCoords = new Set();
    for (let match of matches) {
      matchedCoords.add(`${match.r},${match.c}`);
      let e = board[match.r][match.c];
      if (progress.hasOwnProperty(e)) {
        progress[e]++;
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

  // Funkcja grawitacji – przesuwa kafelki w dół, uzupełnia nowe na górze
  function applyGravity() {
    for (let col = 0; col < boardSize; col++) {
      let emptySpaces = 0;
      for (let row = boardSize - 1; row >= 0; row--) {
        if (board[row][col] == null) {
          emptySpaces++;
        } else if (emptySpaces > 0) {
          board[row + emptySpaces][col] = board[row][col];
          board[row][col] = null;
        }
      }
      for (let row = 0; row < emptySpaces; row++) {
        board[row][col] = randomEmoji();
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
        nextLevel();
      }, 2000);
    }, 600);
  }

  function nextLevel() {
    currentLevel++;
    const currentEmojis = getCurrentEmojiTypes();
    safeGoal = {};
    progress = {};
    for (let i = 0; i < currentEmojis.length; i++) {
      safeGoal[currentEmojis[i]] = getTargetForLevel(currentLevel) + i * 2;
      progress[currentEmojis[i]] = 0;
    }
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

  // ===============================
  // OBSŁUGA DODATKOWYCH RUCHÓW PRZEZ REKLAMĘ
  // ===============================
  function showAdMessage() {
    adMessageElement.classList.remove("hidden");
  }

  adBtn.addEventListener("click", function() {
    availableMoves += 50;
    updateMovesDisplay();
    adMessageElement.classList.add("hidden");
    saveGameState();
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
