# Deploy Finale Coins

This folder contains everything needed to drop the full finale coin sequence into a similar trivia/game project. Copy the entire folder into the target project root, then hand Claude the prompt below.

---

## Folder contents

```
deploy-finale-coins/
├── deploy-finale-coins.md          ← this file
├── finale-coins.css                ← all CSS (paste into <style>)
├── finale-coins.js                 ← all JS  (paste into <script>)
└── assets/
    ├── left.png                    ← left palm tree
    ├── right.png                   ← right palm tree
    └── media/
        ├── Images/
        │   └── finale/
        │       ├── coin front.png  ← spinning coin obverse (2.1 MB)
        │       └── con back.png    ← spinning coin reverse (1.8 MB)
        └── Audio/
            ├── add points/
            │   └── coin.mp3        ← coin score sound
            ├── screencapture/
            │   └── camera_click.mp3
            └── victory/
                └── long victory.mp3
```

---

## What the finale sequence does

13-second cinematic ending triggered automatically when all clues are answered (or manually via keyboard shortcut / `window.transferTriviaRunFinale()`):

| Time | Event |
|------|-------|
| 0 ms | Paparazzi board flash — 4 rounds of camera-burst cell flashes |
| 3.1 s | Frosted backdrop fades in, palm trees slide in from sides |
| 4.2 s | Logo drops in from top |
| 4.5 s | "Final Standings" subtitle fades in |
| 5.2 s | Podium cards rise (1st, 2nd, 3rd place) — coin rain begins |
| 7.0 s | Coin pile starts building at the bottom |
| 7.4 s | Participation badges appear on 4th+ player score cards |
| 8.8 s | Screenshot button appears (captures podium to clipboard) |
| 12.8 s | Trophy coin on 1st-place card settles / stops spinning |

---

## Claude deploy prompt

Copy and paste this entire prompt to Claude in the target project:

---

```
I want to add the full finale coin sequence to this project. The deploy-finale-coins folder is already copied into this project root. Here is exactly what to do:

STEP 1 — Copy asset files
Copy every file from deploy-finale-coins/assets/ into the project root, preserving the subfolder structure exactly:
  - left.png → project root
  - right.png → project root
  - media/Images/finale/coin front.png → media/Images/finale/
  - media/Images/finale/con back.png  → media/Images/finale/
  - media/Audio/add points/coin.mp3   → media/Audio/add points/
  - media/Audio/screencapture/camera_click.mp3 → media/Audio/screencapture/
  - media/Audio/victory/long victory.mp3       → media/Audio/victory/

Create any missing folders as needed.

STEP 2 — Inject the CSS
Open deploy-finale-coins/finale-coins.css, read the full contents, and paste everything inside the project's main <style> tag (before the closing </style>).

STEP 3 — Inject the JavaScript
Open deploy-finale-coins/finale-coins.js, read the full contents, and paste the code inside the project's main <script> tag, inside whatever IIFE or closure wraps the game logic. Place it near other game-state functions (before the closing of the main function/closure).

STEP 4 — Wire up the dependencies
The JS code calls these functions that must already exist in the host project. Verify each one exists and note its name:
  - shuffleArray(arr)            — returns a shuffled copy of an array
  - ensureBoardRevealAudio()     — returns cached Audio element (or null)
  - ensureIntroMusic()           — returns cached Audio element (or null)
  - applyAudioElementVolume(el, key) — sets volume from settings
  - updateIntroMusicButton()     — refreshes mute button UI
  - totalClues()                 — returns total number of clues on the board
  - answeredCount()              — returns number of answered clues
  - state.players[]              — array of { name, score } objects
  - AUDIO_PATHS.victory.long     — path string to long victory audio file
  - modal.hide() or hideModal()  — closes the question modal

If any function name differs in this project, update the matching call in finale-coins.js.

STEP 5 — Hook checkAndTriggerFinale into the answer flow
Find the place in the code where a clue answer is processed and the board is updated (after a correct or wrong answer is committed). Add this call at the end of that handler:
  checkAndTriggerFinale();

STEP 6 — Hook resetFinaleState into the reset flow
Find the resetGame() function (or equivalent). Inside it, add this call early in the function:
  resetFinaleState();

STEP 7 — Customise the logo (optional)
In finale-coins.js, search for the comment "CUSTOMISE THIS BLOCK" inside runFinaleSequence(). Update the logo.innerHTML to match this project's title text, or swap in whatever logo markup the host project uses.

STEP 8 — Verify the CSS variable --app-bottom-bar-h
The podium stage uses this CSS variable to sit above the bottom bar. If the target project does not define it, add this to the :root block in the CSS:
  --app-bottom-bar-h: 0px;   /* adjust to match your bottom bar height */

STEP 9 — Add Ctrl+Shift+F keyboard shortcut (localhost only)
This shortcut triggers the finale sequence manually during local development. Add the following code inside the same closure/IIFE that holds the game logic, after the line that sets window.transferTriviaRunFinale:

  function isLocalEditRuntime() {
    if (!window.location) return false;
    var host = String(window.location.hostname || "").toLowerCase();
    if (!host) return false;
    return (
      host === "localhost" || host === "127.0.0.1" ||
      host === "::1" || host === "[::1]" || host === "0.0.0.0"
    );
  }

  function isFinaleShortcutEvent(e) {
    if (!e || e.altKey || !e.shiftKey || !(e.ctrlKey || e.metaKey)) return false;
    var key = String(e.key || "").toLowerCase();
    return key === "f" || e.code === "KeyF" || e.keyCode === 70 || e.which === 70;
  }

  function handleFinaleShortcut(e) {
    if (!isLocalEditRuntime()) return;
    if (e.type !== "keydown") return;
    if (!isFinaleShortcutEvent(e)) return;
    var active = document.activeElement;
    if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable)) return;
    e.preventDefault();
    e.stopPropagation();
    if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();
    if (typeof window.transferTriviaRunFinale === "function") window.transferTriviaRunFinale();
  }

  document.addEventListener("keydown", handleFinaleShortcut, true);
  window.addEventListener("keydown", handleFinaleShortcut, true);

NOTE: If the host project already has an installEditorEventHandlers() function that sets up keyboard listeners, add the handleFinaleShortcut listeners inside that function instead of standalone, to keep all key handlers in one place.

After all steps, test by pressing Ctrl+Shift+F (Cmd+Shift+F on Mac) on localhost, or by calling window.transferTriviaRunFinale() in the console.
```

---

## Customisation notes

| Thing to change | Where |
|-----------------|-------|
| Logo text / markup | `runFinaleSequence()` in `finale-coins.js` — search `CUSTOMISE THIS BLOCK` |
| Palm tree images | Replace `assets/left.png` and `assets/right.png` with your own images |
| Coin images | Replace files in `assets/media/Images/finale/` — keep the same filenames |
| Victory music | Replace `assets/media/Audio/victory/long victory.mp3` |
| Coin rain density | `startFinaleCoinRain()` — adjust the `interval` values in the phase ladder |
| Coin pile size | `spawnFinaleCoinPile()` — adjust `PHASE1_COINS`, `GAP_COINS`, `FLOOR_FILL_COINS` |
| Timing | All `finaleTimers.push(setTimeout(...))` calls inside `runFinaleSequence()` |
| Shortcut key | Change `key === "f"` / `e.code === "KeyF"` / `e.keyCode === 70` in `isFinaleShortcutEvent()` |

---

## Manual trigger

Once deployed, call this in the browser console to test at any time:

```javascript
window.transferTriviaRunFinale()
```

To reset and run again:

```javascript
resetFinaleState();
window.transferTriviaRunFinale();
```
