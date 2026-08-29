const paragraphs = [
    "The quick brown fox jumps over the lazy dog and runs quickly into the dark forest.",
    "Programming is the art of telling another human what one wants the computer to do.",
    "Success is not final, failure is not fatal: it is the courage to continue that counts.",
    "Web development involves building and maintaining websites using html css and javascript."
];


const menuScreen = document.getElementById("menu-screen");
const friendSetupScreen = document.getElementById("friend-setup-screen");
const gameScreen = document.getElementById("game-screen");

const modePractice = document.getElementById("mode-practice");
const modeGuest = document.getElementById("mode-guest");
const modeFriend = document.getElementById("mode-friend");
const backToMenuBtn = document.getElementById("back-to-menu");
const backToMenuSetup = document.getElementById("back-to-menu-setup");

const createRoomBtn = document.getElementById("create-room-btn");
const myRoomIdSpan = document.getElementById("my-room-id");
const joinIdInput = document.getElementById("join-id-input");
const joinRoomBtn = document.getElementById("join-room-btn");

const diffSelector = document.getElementById("difficulty-selector");
const timeSelector = document.getElementById("time-selector");
const raceContainer = document.getElementById("race-container");
const rivalLabel = document.getElementById("rival-label");

const textDisplay = document.getElementById("text-display");
const inputField = document.getElementById("input-field");
const timerTag = document.getElementById("timer");
const wpmTag = document.getElementById("wpm");
const accuracyTag = document.getElementById("accuracy");
const restartBtn = document.getElementById("restart-btn");

const p1Bar = document.getElementById("p1-bar");
const p2Bar = document.getElementById("p2-bar");

let currentMode = "practice";
let timer;
let maxTime = 60;
let timeLeft = maxTime;
let charIndex = 0;
let mistakes = 0;
let isTyping = false;

// PeerJS Variables
let peer = null;
let conn = null;
let isHost = false;

// --- NAVIGATION ---
modePractice.addEventListener("click", () => startGameMode("practice"));
modeGuest.addEventListener("click", () => startGameMode("guest"));
modeFriend.addEventListener("click", () => {
    currentMode = "friend";
    menuScreen.classList.add("hidden");
    friendSetupScreen.classList.remove("hidden");
    initPeer();
});

backToMenuBtn.addEventListener("click", resetToMenu);
backToMenuSetup.addEventListener("click", () => {
    if (peer) peer.destroy();
    friendSetupScreen.classList.add("hidden");
    menuScreen.classList.remove("hidden");
});

function resetToMenu() {
    clearInterval(timer);
    if (peer) peer.destroy();
    gameScreen.classList.add("hidden");
    menuScreen.classList.remove("hidden");
}

function startGameMode(mode) {
    currentMode = mode;
    menuScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");

    if (mode === "practice") {
        diffSelector.classList.add("hidden");
        timeSelector.classList.remove("hidden");
        raceContainer.classList.add("hidden");
    } else if (mode === "guest") {
        diffSelector.classList.remove("hidden");
        timeSelector.classList.remove("hidden");
        raceContainer.classList.remove("hidden");
        rivalLabel.innerText = "Guest Bot";
    } else if (mode === "friend") {
        diffSelector.classList.add("hidden");
        timeSelector.classList.add("hidden");
        raceContainer.classList.remove("hidden");
        rivalLabel.innerText = "Friend (P2)";
    }
    resetGame();
}

function initPeer() {
    peer = new Peer();

    peer.on("open", (id) => {
        myRoomIdSpan.innerText = id;
    });

    peer.on("connection", (incomingConn) => {
        conn = incomingConn;
        isHost = true;
        setupConnectionListeners();
    
        friendSetupScreen.classList.add("hidden");
        gameScreen.classList.remove("hidden");
        raceContainer.classList.remove("hidden");
        startGameMode("friend");
    });
}

createRoomBtn.addEventListener("click", () => {
    alert("Room created! Share your Room ID with your friend.");
});

joinRoomBtn.addEventListener("click", () => {
    const friendId = joinIdInput.value.trim();
    if (!friendId) return alert("Please enter a valid room ID!");

    isHost = false;
    conn = peer.connect(friendId);
    setupConnectionListeners();

    friendSetupScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");
    raceContainer.classList.remove("hidden");
    startGameMode("friend");
});

function setupConnectionListeners() {
    conn.on("open", () => {
        console.log("Connected to friend!");
        if (isHost) {
            // Host sends the shared text paragraph to guest
            const sharedText = paragraphs[Math.floor(Math.random() * paragraphs.length)];
            conn.send({ type: "TEXT", text: sharedText });
            loadSpecificParagraph(sharedText);
        }
    });

    conn.on("data", (data) => {
        if (data.type === "TEXT") {
            loadSpecificParagraph(data.text);
        } else if (data.type === "PROGRESS") {
            p2Bar.style.width = data.percent + "%";
            if (data.percent >= 100) endMatch("Friend Won! 🏆");
        } else if (data.type === "RESTART") {
            resetGame();
        }
    });
}


function loadParagraph() {
    if (currentMode === "friend" && !isHost) return; // Guest waits for host's text
    const selectedText = paragraphs[Math.floor(Math.random() * paragraphs.length)];
    loadSpecificParagraph(selectedText);
    
    if (currentMode === "friend" && isHost && conn) {
        conn.send({ type: "TEXT", text: selectedText });
    }
}

function loadSpecificParagraph(text) {
    textDisplay.innerHTML = "";
    text.split("").forEach(char => {
        let span = `<span>${char}</span>`;
        textDisplay.innerHTML += span;
    });
    textDisplay.querySelectorAll("span")[0].classList.add("current");
    inputField.value = "";
    inputField.disabled = false;
    inputField.focus();
}

function initTyping() {
    const characters = textDisplay.querySelectorAll("span");
    let typedChar = inputField.value.split("")[charIndex];

    if (!isTyping) {
        isTyping = true;
        timer = setInterval(initTimer, 1000);
    }

    if (typedChar == null) {
        if (charIndex > 0) {
            charIndex--;
            if (characters[charIndex].classList.contains("incorrect")) mistakes--;
            characters[charIndex].classList.remove("correct", "incorrect");
            characters[charIndex].classList.add("current");
        }
        return;
    }

    if (characters[charIndex].innerText === typedChar) {
        characters[charIndex].classList.add("correct");
        characters[charIndex].classList.remove("current");
        charIndex++;
        if (charIndex < characters.length) characters[charIndex].classList.add("current");
    } else {
        mistakes++;
        characters[charIndex].classList.add("incorrect");
        characters[charIndex].classList.remove("current");
        charIndex++;
        if (charIndex < characters.length) characters[charIndex].classList.add("current");
    }

    
    let percent = (charIndex / characters.length) * 100;
    p1Bar.style.width = percent + "%";

    if (currentMode === "friend" && conn) {
        conn.send({ type: "PROGRESS", percent: percent });
    }

    let timeSpent = maxTime - timeLeft;
    if (timeSpent > 0) {
        let wpm = Math.round(((charIndex - mistakes) / 5) / (timeSpent / 60));
        wpmTag.innerText = wpm < 0 || !wpm || wpm === Infinity ? 0 : wpm;
        let accuracy = Math.round(((charIndex - mistakes) / charIndex) * 100);
        accuracyTag.innerText = isNaN(accuracy) ? 100 : accuracy;
    }

    if (charIndex === characters.length) endMatch("You Won! 🎉");
}

function initTimer() {
    if (timeLeft > 0) {
        timeLeft--;
        timerTag.innerText = timeLeft;
    } else {
        endMatch("Time's Up!");
    }
}

function endMatch(message) {
    clearInterval(timer);
    inputField.disabled = true;
    alert(message);
}

function resetGame() {
    clearInterval(timer);
    timeLeft = maxTime;
    charIndex = 0;
    mistakes = 0;
    isTyping = false;
    timerTag.innerText = timeLeft;
    wpmTag.innerText = 0;
    accuracyTag.innerText = 100;
    p1Bar.style.width = "0%";
    p2Bar.style.width = "0%";
    
    if (currentMode !== "friend" || isHost) {
        loadParagraph();
    }
}
inputField.addEventListener("input", initTyping);
restartBtn.addEventListener("click", () => {
    resetGame();
    if (currentMode === "friend" && conn) {
        conn.send({ type: "RESTART" });
    }
});
