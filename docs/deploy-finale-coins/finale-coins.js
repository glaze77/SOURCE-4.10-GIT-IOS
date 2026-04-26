/* ═══════════════════════════════════════════════════════════════════
   FINALE COINS — Full JavaScript
   Paste entire block inside your project's main <script> tag,
   inside whatever IIFE/closure wraps your game logic.

   DEPENDENCIES expected to already exist in the host project:
     • state.players[]          — array of { name, score }
     • shuffleArray(arr)        — returns shuffled copy
     • ensureBoardRevealAudio() — returns cached Audio element (or null)
     • ensureIntroMusic()       — returns cached Audio element (or null)
     • applyAudioElementVolume(el, key) — sets volume from settings
     • updateIntroMusicButton() — refreshes mute-button UI
     • totalClues() / answeredCount() — clue count helpers
     • modal.hide() or hideModal() — closes question modal
     • AUDIO_PATHS object       — see "Audio paths" section below
     • var(--app-bottom-bar-h)  — CSS var for bottom bar height (or set 0px)

   CUSTOMISE:
     • Logo HTML inside runFinaleSequence() — search "vice-title"
     • Palm image src — left.png / right.png (or swap your own)
     • Coin image paths — search "coin front.png" / "con back.png"
   ═══════════════════════════════════════════════════════════════════ */

/* Audio paths — adjust to match your project's file structure */
/* These paths are already defined in most host projects as AUDIO_PATHS.
   Only define them here if the host project does NOT have AUDIO_PATHS.

   var AUDIO_PATHS = {
       addPoints: 'media/Audio/add points/coin.mp3',
       victory: { long: 'media/Audio/victory/long victory.mp3' }
   };
*/

/* ── State variables (declare alongside your other game vars) ── */
var finaleTriggered = false;
var finaleTimers    = [];
var finaleAudio     = null;

/* ── Timer cleanup ── */
function clearFinaleTimers(){
    finaleTimers.forEach(function(t){ try{ clearTimeout(t); } catch(e){} });
    finaleTimers = [];
}

/* ── Victory audio ── */
function ensureFinaleAudio(){
    if(finaleAudio){ return finaleAudio; }
    try {
        var a = new Audio();
        a.src = AUDIO_PATHS.victory.long;
        a.preload = 'auto'; a.volume = 0.88; a.load();
        finaleAudio = a;
    } catch(e){ finaleAudio = null; }
    return finaleAudio;
}

/* ── Board sparkle (checker wave) ── */
function runBoardFinaleSparkle(durationMs){
    var cells = Array.prototype.slice.call(document.querySelectorAll(
        '.grid-row-cats .grid-cell, .grid-row-questions .grid-cell'));
    if(!cells.length){ return; }
    var baseDelay = 88;
    var currentDelay = 0;
    var endTime = durationMs - 1400;
    while(currentDelay < endTime){
        (function(passDelay){
            var shuffled = shuffleArray(cells.slice());
            shuffled.forEach(function(cell, idx){
                var d = passDelay + idx * baseDelay;
                if(d >= endTime){ return; }
                var t1 = setTimeout(function(){
                    cell.classList.remove('tt-board-intro-flash');
                    void cell.offsetWidth;
                    cell.classList.add('tt-board-intro-flash');
                    var t2 = setTimeout(function(){ cell.classList.remove('tt-board-intro-flash'); }, 333);
                    finaleTimers.push(t2);
                }, d);
                finaleTimers.push(t1);
            });
        })(currentDelay);
        currentDelay += cells.length * baseDelay + 260;
    }
}

/* ── Ordinal suffix helper ── */
function ordinalSuffix(n){
    var s = ['th','st','nd','rd'], v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
}

/* ── Build one podium card ── */
function buildPodiumSlot(playerData, cssClass, placeLabel, rankIcon){
    var slot = document.createElement('div');
    slot.className = 'tt-podium-slot';
    var card = document.createElement('div');
    card.className = 'tt-podium-card ' + cssClass;

    var icon = document.createElement('div');
    icon.className = 'tt-podium-rank-icon';
    if(cssClass === 'tt-podium-1st'){
        var coinWrap = document.createElement('div');
        coinWrap.className = 'tt-coin-trophy';
        var coinFront = document.createElement('img');
        coinFront.className = 'tt-coin-trophy-front';
        coinFront.src = 'media/Images/finale/coin front.png'; coinFront.alt = '';
        var coinBack = document.createElement('img');
        coinBack.className = 'tt-coin-trophy-back';
        coinBack.src = 'media/Images/finale/con back.png'; coinBack.alt = '';
        coinWrap.appendChild(coinFront);
        coinWrap.appendChild(coinBack);
        icon.appendChild(coinWrap);
    } else {
        icon.textContent = rankIcon;
    }

    var score = document.createElement('div');
    score.className = 'tt-podium-score'; score.textContent = playerData.score;

    var pts = document.createElement('div');
    pts.className = 'tt-podium-pts'; pts.textContent = 'pts';

    var divider = document.createElement('div');
    divider.className = 'tt-podium-divider';

    var name = document.createElement('div');
    name.className = 'tt-podium-name'; name.textContent = playerData.name;

    var place = document.createElement('div');
    place.className = 'tt-podium-place'; place.textContent = placeLabel;

    var info = document.createElement('div');
    info.className = 'tt-podium-info';
    info.appendChild(score);
    info.appendChild(pts);
    info.appendChild(divider);
    info.appendChild(name);
    info.appendChild(place);

    card.appendChild(icon);
    card.appendChild(info);
    slot.appendChild(card);
    return slot;
}

/* ── Paparazzi board flash (4 rounds at finale start) ── */
function runFinaleBoardFlash(){
    var cells = Array.prototype.slice.call(document.querySelectorAll(
        '.grid-row-cats .grid-cell, .grid-row-questions .grid-cell'));
    if(!cells.length){ return; }

    var ROUNDS    = 4;
    var CELL_GAP  = 30;
    var ROUND_GAP = 650;
    var START     = 100;
    var FLASH_DUR = 440;

    var audio = ensureBoardRevealAudio();
    if(audio){
        try { audio.pause(); audio.currentTime = 0;
            var ap = audio.play(); if(ap && ap.catch){ ap.catch(function(){}); }
        } catch(e){}
    }

    for(var r = 0; r < ROUNDS; r++){
        (function(round){
            var shuffled = shuffleArray(cells.slice());
            shuffled.forEach(function(cell, i){
                var d = START + round * ROUND_GAP + i * CELL_GAP;
                finaleTimers.push(setTimeout(function(){
                    cell.classList.remove('tt-finale-board-flash');
                    void cell.offsetWidth;
                    cell.classList.add('tt-finale-board-flash');
                    finaleTimers.push(setTimeout(function(){
                        cell.classList.remove('tt-finale-board-flash');
                    }, FLASH_DUR));
                }, d));
            });
        })(r);
    }
}

/* ── Ambient board pulse behind finale blur ── */
function runBehindBlurBoardFlash(){
    var gameplay = document.getElementById('gameplay');
    if(!gameplay){ return; }
    gameplay.classList.remove('tt-bg-letter-pulse');
    gameplay.classList.remove('tt-bg-letter-pause');
    gameplay.classList.add('tt-bg-letter-pulse-finale');
}

/* ── html2canvas loader (lazy) ── */
var html2canvasLoaded = false;
function loadHtml2Canvas(cb){
    if(window.html2canvas){ cb(window.html2canvas); return; }
    if(html2canvasLoaded){ setTimeout(function(){ loadHtml2Canvas(cb); }, 200); return; }
    html2canvasLoaded = true;
    var s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    s.onload  = function(){ cb(window.html2canvas); };
    s.onerror = function(){ cb(null); };
    document.head.appendChild(s);
}

/* ── Clipboard toast ── */
var captureToastTimer = null;
function showCaptureToast(){
    var toast = document.getElementById('tt-capture-toast');
    if(!toast){
        toast = document.createElement('div');
        toast.id = 'tt-capture-toast';
        toast.setAttribute('aria-live', 'polite');
        toast.innerHTML = '<span class="tt-capture-toast-icon">📋</span>'
            + '<div class="tt-capture-toast-body">'
            + '<div class="tt-capture-toast-title">Image copied to clipboard</div>'
            + '<div class="tt-capture-toast-sub">Ready to paste &nbsp;·&nbsp; Ctrl+V &nbsp;/&nbsp; ⌘V</div>'
            + '</div>';
        document.body.appendChild(toast);
    }
    if(captureToastTimer){ clearTimeout(captureToastTimer); captureToastTimer = null; }
    toast.classList.remove('tt-toast-in');
    void toast.offsetWidth;
    toast.classList.add('tt-toast-in');
    captureToastTimer = setTimeout(function(){
        toast.classList.remove('tt-toast-in');
        captureToastTimer = null;
    }, 3400);
}

/* ── Screenshot capture ── */
function captureFinaleScreenshot(btn){
    try { var snd = new Audio('media/Audio/screencapture/camera_click.mp3'); snd.play().catch(function(){}); } catch(e){}
    var flash = document.createElement('div');
    flash.id = 'tt-camera-flash';
    document.body.appendChild(flash);
    setTimeout(function(){ if(flash.parentNode){ flash.parentNode.removeChild(flash); } }, 620);

    if(btn){ btn.classList.add('tt-ssb-busy'); }

    loadHtml2Canvas(function(h2c){
        if(!h2c){ if(btn){ btn.classList.remove('tt-ssb-busy'); } return; }
        h2c(document.body, {
            useCORS: true, allowTaint: true, logging: false,
            scale: Math.min(window.devicePixelRatio || 1, 2),
            ignoreElements: function(el){ return el === btn || el.id === 'tt-camera-flash'; }
        }).then(function(canvas){
            canvas.toBlob(function(blob){
                var resetBtn = function(copied){
                    if(!btn){ return; }
                    btn.classList.remove('tt-ssb-busy');
                    btn.classList.toggle('tt-ssb-copied', !!copied);
                    setTimeout(function(){ btn.classList.remove('tt-ssb-copied'); }, 2200);
                };
                try {
                    navigator.clipboard.write([new ClipboardItem({'image/png': blob})])
                        .then(function(){ resetBtn(true); showCaptureToast(); })
                        .catch(function(){
                            var url = URL.createObjectURL(blob);
                            var a = document.createElement('a');
                            a.href = url; a.download = 'final-standings.png';
                            document.body.appendChild(a); a.click();
                            document.body.removeChild(a);
                            setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
                            resetBtn(false);
                        });
                } catch(e){ resetBtn(false); }
            }, 'image/png');
        }).catch(function(){ if(btn){ btn.classList.remove('tt-ssb-busy'); } });
    });
}

/* ── Falling coin rain ── */
function startFinaleCoinRain(totalDurationMs){
    var scene = document.getElementById('tt-finale-scene');
    if(!scene){ return; }

    var layer = document.createElement('div');
    layer.className = 'tt-finale-coin-rain-layer';
    scene.appendChild(layer);

    var IMAGES = [
        'media/Images/finale/coin front.png',
        'media/Images/finale/con back.png'
    ];

    var startTime = Date.now();
    var active    = true;

    var stopTimer = setTimeout(function(){ active = false; }, Math.max(0, totalDurationMs - 1500));
    finaleTimers.push(stopTimer);

    function spawnCoin(){
        if(!active){ return; }
        var elapsed = Date.now() - startTime;

        var interval;
        if     (elapsed < 600)  { interval = 42; }
        else if(elapsed < 3300) { interval = 71; }
        else if(elapsed < 5500) { interval = 154 + Math.random() * 108; }
        else                    { interval = 262 + Math.random() * 154; }

        var size    = 28 + Math.random() * 40;
        var xPct    = 2  + Math.random() * 96;
        var fallDur = Math.max(1400, (1800 + Math.random() * 1800) * (1 - (size - 28) / 160));
        var spins   = (1 + Math.floor(Math.random() * 3)) * (Math.random() < 0.5 ? 1 : -1);
        var drift   = (Math.random() - 0.5) * 70;
        var opacity = 0.72 + Math.random() * 0.28;
        var src     = IMAGES[Math.random() < 0.5 ? 0 : 1];

        var img = document.createElement('img');
        img.className = 'tt-finale-coin';
        img.src  = src; img.alt = '';
        img.style.width             = size + 'px';
        img.style.left              = xPct + '%';
        img.style.opacity           = opacity;
        img.style.animationDuration = fallDur + 'ms';
        img.style.setProperty('--coin-spins', spins + 'turn');
        img.style.setProperty('--coin-drift', drift + 'px');

        layer.appendChild(img);
        img.addEventListener('animationend', function(){
            if(img.parentNode){ img.parentNode.removeChild(img); }
        }, { once: true });

        finaleTimers.push(setTimeout(spawnCoin, interval));
    }

    spawnCoin();
}

/* ── Coin pile (settled stack at bottom) ── */
function spawnFinaleCoinPile(scene, pileMs){
    if(!scene){ return; }

    pileMs = pileMs || 5200;
    var GAP_FILL_MS = 2500;
    var PHASE1_MS   = pileMs - GAP_FILL_MS;

    var layer = document.createElement('div');
    layer.className = 'tt-finale-coin-rain-layer';
    scene.appendChild(layer);

    var W = layer.offsetWidth  || window.innerWidth;
    var H = layer.offsetHeight || window.innerHeight;

    var layerRect    = layer.getBoundingClientRect();
    var podiumBottom = H * 0.9;

    ['tt-podium-1st','tt-podium-2nd','tt-podium-3rd'].forEach(function(cls){
        var card = scene.querySelector('.tt-podium-card.' + cls);
        if(!card){ return; }
        var r = card.getBoundingClientRect();
        var relBot = r.bottom - layerRect.top;
        if(relBot > 0 && relBot < H + 60){ podiumBottom = Math.max(podiumBottom, relBot); }
    });

    var pileCeiling = podiumBottom - 6;
    var BASE_SIZE   = 42;
    var MAX_H = Math.max(110, H - BASE_SIZE - pileCeiling);
    var MIN_H = 16;
    var bellSigma = W / 5.8;

    var bumps = [];
    var numBumps = 7 + Math.floor(Math.random() * 4);
    for(var b = 0; b < numBumps; b++){
        bumps.push({ cx: Math.random() * W, h: 18 + Math.random() * 34, sig: 38 + Math.random() * 72 });
    }

    function heightAt(x){
        var bell = MAX_H * Math.exp(-Math.pow(x - W/2, 2) / (2 * bellSigma * bellSigma));
        var extra = 0;
        bumps.forEach(function(bp){
            extra += bp.h * Math.exp(-Math.pow(x - bp.cx, 2) / (2 * bp.sig * bp.sig));
        });
        return Math.max(MIN_H, Math.min(bell + extra, MAX_H));
    }

    function spawnAt(x, y, delay){
        var heightRatio = Math.max(0, Math.min(1, y / MAX_H));
        var sz  = Math.round(BASE_SIZE + Math.random() * 12 - 6 - heightRatio * 10);
        var rot = Math.random() * 40 - 20;
        var skew = Math.random() * 12 - 6;
        var floorJitter = Math.random() * 8 - 4;
        var topPx = H - sz - y + floorJitter;

        var t = setTimeout(function(){
            if(!layer.parentNode){ return; }
            var img = document.createElement('img');
            img.className = 'tt-finale-coin';
            img.src = Math.random() < 0.7
                ? 'media/Images/finale/con back.png'
                : 'media/Images/finale/coin front.png';
            img.style.cssText =
                'width:' + sz + 'px;' +
                'left:' + Math.round(x) + 'px;' +
                'top:' + Math.round(topPx) + 'px;' +
                'z-index:' + Math.round(1000 - y) + ';' +
                'animation:none;opacity:0;' +
                'transform:rotate(' + rot + 'deg) skewX(' + skew + 'deg) scale(0.7);' +
                'transition:opacity .22s ease, transform .28s cubic-bezier(.2,.85,.2,1);';
            layer.appendChild(img);
            requestAnimationFrame(function(){
                img.style.opacity = String(0.96 - heightRatio * 0.18);
                img.style.transform = 'rotate(' + rot + 'deg) skewX(' + skew + 'deg) scale(1)';
            });
        }, delay);
        finaleTimers.push(t);
    }

    /* Phase 1 — 1200 coins over pileMs */
    for(var i = 0; i < 1200; i++){
        var bias = Math.random();
        var centerPull = bias * bias * (W * 0.5);
        var x = (W / 2) + (Math.random() < 0.5 ? -1 : 1) * centerPull;
        x += (Math.random() - 0.5) * 70;
        x = Math.min(W, Math.max(0, x));
        var hx = heightAt(x);
        var y = hx * Math.pow(Math.random(), 2.2);
        var xFrac = Math.abs(x - W/2) / (W/2);
        spawnAt(x, y, Math.random() * PHASE1_MS * 0.95 + xFrac * 120);
    }

    /* Gap fill — 1100 coins in final 2.5s */
    for(var j = 0; j < 1100; j++){
        var bias2 = Math.random();
        var cp2 = bias2 * bias2 * (W * 0.5);
        var x2 = (W / 2) + (Math.random() < 0.5 ? -1 : 1) * cp2;
        x2 += (Math.random() - 0.5) * 90;
        x2 = Math.min(W, Math.max(0, x2));
        var hx2 = heightAt(x2);
        var y2 = hx2 * Math.pow(Math.random(), 1.7);
        spawnAt(x2, y2, PHASE1_MS + Math.random() * GAP_FILL_MS);
    }

    /* Floor fill — 900 scattered coins */
    for(var f = 0; f < 900; f++){
        var fx = Math.random() * W;
        var fy = Math.random() * Math.min(heightAt(fx), 34);
        spawnAt(fx, fy, PHASE1_MS + Math.random() * GAP_FILL_MS);
    }

    /* Sparkles on the pile */
    function spawnCoinSparkle(){
        if(!layer.parentNode){ return; }
        var s = document.createElement('div');
        var sx = Math.random() * W;
        var sy = H - 18 - (Math.random() * Math.min(heightAt(sx), 120));
        s.style.cssText =
            'position:absolute;left:' + Math.round(sx) + 'px;top:' + Math.round(sy) + 'px;' +
            'width:16px;height:16px;z-index:9999;pointer-events:none;opacity:0;' +
            'background:radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,250,180,1) 28%, rgba(255,205,45,.75) 52%, rgba(255,205,45,0) 76%);' +
            'filter:drop-shadow(0 0 10px rgba(255,240,120,1));' +
            'clip-path:polygon(50% 0%, 61% 38%, 100% 50%, 61% 62%, 50% 100%, 39% 62%, 0% 50%, 39% 38%);' +
            'transform:scale(.1) rotate(' + Math.round(Math.random() * 90) + 'deg);' +
            'transition:opacity .12s ease, transform .42s ease-out;';
        layer.appendChild(s);
        requestAnimationFrame(function(){
            s.style.opacity = '1';
            s.style.transform = 'scale(1.8) rotate(' + Math.round(Math.random() * 180) + 'deg)';
        });
        var t1 = setTimeout(function(){
            s.style.opacity = '0';
            s.style.transform = 'scale(.15) rotate(' + Math.round(Math.random() * 240) + 'deg)';
        }, 360 + Math.random() * 280);
        var t2 = setTimeout(function(){ if(s.parentNode){ s.parentNode.removeChild(s); } }, 900);
        finaleTimers.push(t1, t2);
    }

    function sparkleLoop(){
        if(!layer.parentNode){ return; }
        spawnCoinSparkle();
        if(Math.random() < 0.75){ spawnCoinSparkle(); }
        var st = setTimeout(sparkleLoop, 70 + Math.random() * 120);
        finaleTimers.push(st);
    }

    /* Sparkles on the 1st-place trophy coin */
    function spawnTrophyCoinSparkle(){
        if(!layer.parentNode){ return; }
        var trophyCoin = scene.querySelector('.tt-podium-1st .tt-coin-trophy');
        if(!trophyCoin){ return; }
        var coinRect  = trophyCoin.getBoundingClientRect();
        var sceneRect = scene.getBoundingClientRect();
        var insetX = coinRect.width * 0.22;
        var insetY = coinRect.height * 0.22;
        var sx = coinRect.left - sceneRect.left + insetX + Math.random() * (coinRect.width - insetX * 2);
        var sy = coinRect.top  - sceneRect.top  + insetY + Math.random() * (coinRect.height - insetY * 2);
        var s = document.createElement('div');
        s.style.cssText =
            'position:absolute;left:' + Math.round(sx) + 'px;top:' + Math.round(sy) + 'px;' +
            'width:12px;height:12px;z-index:9999;pointer-events:none;opacity:0;' +
            'background:radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,250,180,1) 30%, rgba(255,205,45,.8) 55%, rgba(255,205,45,0) 76%);' +
            'filter:drop-shadow(0 0 10px rgba(255,240,120,1));' +
            'clip-path:polygon(50% 0%, 61% 38%, 100% 50%, 61% 62%, 50% 100%, 39% 62%, 0% 50%, 39% 38%);' +
            'transform:scale(.1) rotate(' + Math.round(Math.random() * 90) + 'deg);' +
            'transition:opacity .12s ease, transform .42s ease-out;';
        layer.appendChild(s);
        requestAnimationFrame(function(){
            s.style.opacity = '1';
            s.style.transform = 'scale(1.5) rotate(' + Math.round(Math.random() * 180) + 'deg)';
        });
        var t1 = setTimeout(function(){
            s.style.opacity = '0';
            s.style.transform = 'scale(.15) rotate(' + Math.round(Math.random() * 240) + 'deg)';
        }, 300 + Math.random() * 240);
        var t2 = setTimeout(function(){ if(s.parentNode){ s.parentNode.removeChild(s); } }, 850);
        finaleTimers.push(t1, t2);
    }

    function trophySparkleLoop(){
        if(!layer.parentNode){ return; }
        spawnTrophyCoinSparkle();
        var tt = setTimeout(trophySparkleLoop, 420 + Math.random() * 900);
        finaleTimers.push(tt);
    }

    finaleTimers.push(setTimeout(trophySparkleLoop, 8200));
    finaleTimers.push(setTimeout(sparkleLoop, 900));
}

/* ══════════════════════════════════════════════════════════════════
   MAIN ORCHESTRATOR — runFinaleSequence()
   Timeline (ms from call):
     0      — paparazzi board flash (4 rounds, ~3050ms total)
     3100   — scene injected into DOM
     3300   — backdrop + left palm fade in
     3520   — right palm slides in
     4200   — logo drop in
     4520   — "Final Standings" subtitle reveal
     5200   — podium 1st rises; coin rain starts (7 s)
     5600   — podium 2nd rises
     5960   — podium 3rd rises
     7000   — coin pile begins building
     7400   — participation badges (4th+ players) appear
     7700   — ambient board pulse behind blur
     8800   — screenshot button appears
     12800  — trophy coin settles (spins stop)
   ══════════════════════════════════════════════════════════════════ */
function runFinaleSequence(){
    if(finaleTriggered){ return; }
    finaleTriggered = true;
    clearFinaleTimers();

    loadHtml2Canvas(function(){});   /* pre-load for screenshot */

    /* Sort players by score descending */
    var ranked = state.players.map(function(p, i){
        return { index: i, name: p.name || ('Player ' + (i + 1)), score: p.score };
    });
    ranked.sort(function(a, b){ return b.score - a.score; });
    var top3   = ranked.slice(0, Math.min(3, ranked.length));
    var others = ranked.slice(3);

    /* Play victory audio */
    var aud = ensureFinaleAudio();
    if(aud){
        try { aud.pause(); aud.currentTime = 0;
            var pp = aud.play(); if(pp && pp.catch){ pp.catch(function(){}); }
        } catch(e){}
    }
    startIntroMusicForFinale(180);

    /* Step 1: board flash (must run BEFORE scene overlay is in DOM) */
    runFinaleBoardFlash();

    /* Remove stale scene if present */
    var oldScene = document.getElementById('tt-finale-scene');
    if(oldScene){ oldScene.parentNode.removeChild(oldScene); }

    /* ── Subtitle helpers ── */
    function centerFinaleSubtitleBetweenLogoAndPodium(){
        if(!logo || !subtitle || !stage){ return; }
        var first = stage.querySelector('.tt-podium-card.tt-podium-1st');
        var anchor = first || stage;
        if(!anchor){ return; }
        var logoRect = logo.getBoundingClientRect();
        if(!logoRect || !isFinite(logoRect.bottom)){ return; }
        var stageBottom = parseFloat(window.getComputedStyle(stage).bottom || '0') || 0;
        var anchorHeight = anchor.offsetHeight || anchor.getBoundingClientRect().height || 0;
        var finalPodiumTop = window.innerHeight - stageBottom - anchorHeight;
        if(!isFinite(finalPodiumTop) || !anchorHeight){
            var podiumRect = anchor.getBoundingClientRect();
            if(!podiumRect || !isFinite(podiumRect.top)){ return; }
            finalPodiumTop = podiumRect.top;
        }
        subtitle.style.top = Math.round((logoRect.bottom + finalPodiumTop) / 2) + 'px';
    }

    function revealFinaleSubtitleCinematic(){
        if(!subtitle){ return; }
        var fromTf = 'translateX(-50%) translateY(8px) scale(.985)';
        var midTf  = 'translateX(-50%) translateY(1px) scale(.997)';
        var toTf   = 'translateX(-50%) translateY(0) scale(1)';
        if(subtitle.__ttFsAnim){ try { subtitle.__ttFsAnim.cancel(); } catch(e){} subtitle.__ttFsAnim = null; }
        subtitle.classList.remove('tt-fs-in');
        subtitle.style.opacity = '0'; subtitle.style.transform = fromTf; subtitle.style.filter = 'blur(1.6px)';
        if(typeof subtitle.animate === 'function'){
            subtitle.__ttFsAnim = subtitle.animate([
                { opacity: 0,  transform: fromTf, filter: 'blur(1.6px)' },
                { opacity: .9, transform: midTf,  filter: 'blur(.6px)', offset: 0.6 },
                { opacity: 1,  transform: toTf,   filter: 'blur(0)' }
            ], { duration: 1700, easing: 'cubic-bezier(.16,.84,.24,1)', fill: 'forwards' });
            subtitle.__ttFsAnim.onfinish = function(){
                subtitle.style.opacity = '1'; subtitle.style.transform = toTf; subtitle.style.filter = 'blur(0)';
            };
            return;
        }
        subtitle.style.transition = 'opacity 1.7s cubic-bezier(.16,.84,.24,1), transform 1.7s cubic-bezier(.16,.84,.24,1), filter 1.7s cubic-bezier(.16,.84,.24,1)';
        requestAnimationFrame(function(){ requestAnimationFrame(function(){
            subtitle.style.opacity = '1'; subtitle.style.transform = toTf; subtitle.style.filter = 'blur(0)';
        }); });
    }

    /* ── Build scene in memory ── */
    var scene = document.createElement('div');
    scene.id = 'tt-finale-scene';

    var backdrop = document.createElement('div');
    backdrop.className = 'tt-finale-backdrop';
    scene.appendChild(backdrop);

    var palmL = document.createElement('img');
    palmL.className = 'tt-finale-palm tt-fp-left';
    palmL.src = 'left.png'; palmL.alt = '';
    scene.appendChild(palmL);

    var palmR = document.createElement('img');
    palmR.className = 'tt-finale-palm tt-fp-right';
    palmR.src = 'right.png'; palmR.alt = '';
    scene.appendChild(palmR);

    /* ── LOGO — CUSTOMISE THIS BLOCK for your project's title ── */
    var logo = document.createElement('div');
    logo.className = 'tt-finale-logo';
    logo.setAttribute('aria-hidden', 'true');
    logo.innerHTML =
        '<div class="vice-title-top">'
        + '<span class="vice-title-top-pre">G0100</span>'
        + '<span class="vice-title-top-main">Masters</span>'
        + '<span class="vice-title-top-sub">of the</span>'
        + '</div>'
        + '<div class="vice-title-bottom">WOK</div>';
    scene.appendChild(logo);

    var subtitle = document.createElement('div');
    subtitle.className = 'tt-finale-subtitle';
    subtitle.setAttribute('aria-hidden', 'true');
    subtitle.textContent = 'Final Standings';
    scene.appendChild(subtitle);

    /* Podium stage — order: 2nd | 1st | 3rd */
    var stage = document.createElement('div');
    stage.className = 'tt-podium-stage';
    var defs = [
        { rank: 1, css: 'tt-podium-2nd', label: '2nd Place', icon: '🥈', riseDelay: 400  },
        { rank: 0, css: 'tt-podium-1st', label: '1st Place', icon: '🏆', riseDelay: 0    },
        { rank: 2, css: 'tt-podium-3rd', label: '3rd Place', icon: '🥉', riseDelay: 760  }
    ];
    var slots = [];
    defs.forEach(function(def){
        if(!top3[def.rank]){ return; }
        var sl = buildPodiumSlot(top3[def.rank], def.css, def.label, def.icon);
        slots.push({ slot: sl, riseDelay: def.riseDelay });
        stage.appendChild(sl);
    });
    scene.appendChild(stage);

    /* Screenshot button */
    var ssBtn = document.createElement('button');
    ssBtn.type = 'button';
    ssBtn.className = 'tt-screenshot-btn';
    ssBtn.setAttribute('aria-label', 'Screenshot final standings to clipboard');
    ssBtn.title = 'Screenshot';
    ssBtn.innerHTML = '<span class="tt-ssb-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 6.5 8.3 5h7.4L17 6.5H20a2 2 0 0 1 2 2v9A2.5 2.5 0 0 1 19.5 20h-15A2.5 2.5 0 0 1 2 17.5v-9a2 2 0 0 1 2-2h3Zm4.5 3A4.5 4.5 0 1 0 16 14a4.5 4.5 0 0 0-4.5-4.5Zm0 2A2.5 2.5 0 1 1 9 14a2.5 2.5 0 0 1 2.5-2.5Z"/></svg></span><span class="tt-ssb-label">Screenshot</span>';
    ssBtn.addEventListener('click', function(){ captureFinaleScreenshot(ssBtn); });
    ssBtn.addEventListener('touchend', function(e){
        e.preventDefault(); e.stopPropagation(); captureFinaleScreenshot(ssBtn);
    }, { passive: false });
    scene.appendChild(ssBtn);

    /* Inject scene after board flash (~3050ms) */
    finaleTimers.push(setTimeout(function(){ document.body.appendChild(scene); }, 3100));

    /* Step 3: backdrop + palms */
    finaleTimers.push(setTimeout(function(){ backdrop.classList.add('tt-fb-in'); palmL.classList.add('tt-fp-in'); }, 3300));
    finaleTimers.push(setTimeout(function(){ palmR.classList.add('tt-fp-in'); }, 3520));

    /* Step 4: logo + subtitle */
    finaleTimers.push(setTimeout(function(){ logo.classList.add('tt-fl-in'); }, 4200));
    finaleTimers.push(setTimeout(function(){ centerFinaleSubtitleBetweenLogoAndPodium(); revealFinaleSubtitleCinematic(); }, 4520));

    /* Step 5: podium rises */
    var podiumBase = 5200;
    slots.forEach(function(s){
        finaleTimers.push(setTimeout(function(){ s.slot.classList.add('tt-podium-risen'); }, podiumBase + s.riseDelay));
    });

    /* Coin rain: 7 seconds */
    finaleTimers.push(setTimeout(function(){ startFinaleCoinRain(7000); }, 5200));

    /* Coin pile */
    finaleTimers.push(setTimeout(function(){
        var sc = document.getElementById('tt-finale-scene');
        spawnFinaleCoinPile(sc, 5200);
    }, 7000));

    /* Ambient board pulse behind blur */
    finaleTimers.push(setTimeout(function(){ runBehindBlurBoardFlash(); }, 7700));

    /* Screenshot button reveal */
    finaleTimers.push(setTimeout(function(){ ssBtn.classList.add('tt-ssb-in'); }, 8800));

    /* Participation badges (4th+ players) */
    finaleTimers.push(setTimeout(function(){
        others.forEach(function(player, i){
            var card = document.querySelector('.score-entry[data-player-index="' + player.index + '"]');
            if(!card){ return; }
            card.style.position = 'relative';
            var badge = document.createElement('div');
            badge.className = 'tt-participation-badge';
            var ic = document.createElement('div'); ic.className = 'tt-badge-icon'; ic.textContent = '⭐';
            var rk = document.createElement('div'); rk.className = 'tt-badge-rank';
            rk.textContent = (i + 4) + ordinalSuffix(i + 4) + ' Place';
            var tx = document.createElement('div'); tx.className = 'tt-badge-text'; tx.textContent = 'Great game!';
            badge.appendChild(ic); badge.appendChild(rk); badge.appendChild(tx);
            card.appendChild(badge);
            finaleTimers.push(setTimeout(function(){ badge.classList.add('tt-badge-visible'); }, i * 220));
        });
    }, 7400));

    /* Trophy coin settle */
    finaleTimers.push(setTimeout(function(){
        var trophyCoin = document.querySelector('.tt-podium-1st .tt-coin-trophy');
        if(trophyCoin){ trophyCoin.classList.add('tt-coin-settled'); }
    }, 12800));
}

/* Expose for manual triggering / keyboard shortcuts */
window.transferTriviaRunFinale = runFinaleSequence;

/* ── Auto-trigger when all clues answered ── */
function checkAndTriggerFinale(){
    if(finaleTriggered){ return; }
    if(totalClues() > 0 && answeredCount() >= totalClues()){
        try {
            if(typeof modal !== 'undefined' && modal && typeof modal.hide === 'function'){ modal.hide(); }
            else if(typeof hideModal === 'function'){ hideModal(); }
            else { var qmEl = document.getElementById('question-modal'); if(qmEl){ qmEl.style.display = 'none'; } }
        } catch(e){
            try { var qmEl2 = document.getElementById('question-modal'); if(qmEl2){ qmEl2.style.display = 'none'; } } catch(e2){}
        }
        finaleTimers.push(setTimeout(runFinaleSequence, 900));
    }
}

/* ── Reset / cleanup (call from your resetGame function) ── */
function resetFinaleState(){
    finaleTriggered = false;
    clearFinaleTimers();
    if(finaleAudio){ try{ finaleAudio.pause(); finaleAudio.currentTime = 0; } catch(e){} }
    var fp = document.getElementById('tt-finale-scene');
    if(fp){ fp.parentNode.removeChild(fp); }
    document.querySelectorAll('.tt-participation-badge').forEach(function(b){ b.parentNode.removeChild(b); });
}
