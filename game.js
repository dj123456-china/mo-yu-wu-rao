(function () {
  "use strict";
  const $ = selector => document.querySelector(selector);
  const canvas = $("#gameCanvas");
  const ctx = canvas.getContext("2d");
  const economy = window.GameEconomy;
  const battleAPI = window.StallBattle;
  const overlay = $("#gameOverlay");
  const shopPanel = $("#shopPanel");
  const eatButton = $("#eatButton");
  const modeButtons = { stall: $("#stallModeButton"), snack: $("#snackModeButton"), office: $("#officeModeButton") };
  const directionButtons = { left: $("#leftButton"), up: $("#upButton"), down: $("#downButton"), right: $("#rightButton") };
  const modes = {
    stall: { title: "别让怒气碰到心", subtitle: "无限摸鱼 / 原创像素弹幕", copy: "WASD / 方向键移动，手机拖动画面或按方向按钮。高级模式有重力，松手后红心会落回地面；躲开怒气弹幕，活得越久赚得越多。", idle: "移动红心，躲开两侧同学的怒气", scene: "黑白像素卫生间弹幕游戏" },
    snack: { title: "这包吃完，还有一包", subtitle: "无限偷吃 / 课桌零食挑战", copy: "老师写板书时按住吃，回头前松手藏好。吃完自动续包，生命耗尽才结束。", idle: "零食已备好，本节课无限续包", scene: "无限教室偷吃游戏", action: "按住吃零食", acting: "正在吃…松手藏好", hint: "松手立刻藏好 · 空格 / Enter", tip: "每吃完一包自动续上。只在吃东西时赚金币，老师回头前松手。", safe: "老师在写板书，按住吃零食", warning: "老师要回头，松手藏好！", danger: "老师正在看，先别吃", caught: "被老师发现！生命 -1", progress: "本包零食" },
    office: { title: "上班不止，摸鱼不停", subtitle: "无限摸鱼 / 老板巡视挑战", copy: "老板离开时按住摸鱼，回头前松手切回工作。进度攒满自动开下一局，生命耗尽才结束。", idle: "工位已就绪，老板正在办公室巡视", scene: "无限办公室摸鱼游戏", action: "按住摸鱼", acting: "摸鱼中…松手切工作", hint: "松手切回工作 · 空格 / Enter", tip: "每攒满一局自动续上。只在摸鱼时赚金币，老板回头前松手。", safe: "老板已离开，按住摸鱼", warning: "老板要回头，松手切工作！", danger: "老板正在查岗，保持工作", caught: "被老板发现！生命 -1", progress: "本局摸鱼" }
  };
  const chosenTiers = { stall: false, snack: false, office: false };
  const keys = new Set();
  const holds = new Set();
  const directionHolds = { left: new Set(), up: new Set(), down: new Set(), right: new Set() };
  let mode = "stall", advanced = false, phase = "idle", previousPhase = "idle";
  let elapsed = 0, score = 0, runCoins = 0, coinFraction = 0, maxLives = 3, lives = 3;
  let countdown = 3, invincible = 0, battle = null, snack = null, drag = null;
  let lastFrame = performance.now(), needsDraw = true, animationFrame = null;
  let audioEnabled = false, audioContext = null, priorFocus = null, lastBattleMessage = "", lastBattleStage = "";
  const reducedMotion = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };

  function isActive() { return phase === "playing" || phase === "countdown" || phase === "paused"; }
  function isHoldMode() { return mode !== "stall"; }
  function timeText(seconds) { const s = Math.floor(seconds); return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0"); }
  function mapName() { return advanced ? economy.maps.filter(map => map.id === mode)[0].name : mode === "stall" ? "卫生间" : mode === "snack" ? "教室" : "办公室"; }
  function setEvent(message, tone) {
    if ($("#eventText").textContent === message) return;
    $("#eventText").textContent = message;
    $("#eventBanner").classList.toggle("is-warning", tone === "warning");
    $("#eventBanner").classList.toggle("is-danger", tone === "danger");
    $("#eventBanner").classList.toggle("is-success", tone === "success");
    $("#screenReaderStatus").textContent = message;
    needsDraw = true;
  }
  function showPanel(id) {
    ["startPanel", "pausePanel", "resultPanel"].forEach(name => { $("#" + name).hidden = name !== id; });
    overlay.classList.add("is-visible");
  }
  function setControls() {
    const playing = phase === "playing";
    Object.keys(directionButtons).forEach(direction => { directionButtons[direction].disabled = !playing; });
    eatButton.disabled = !playing;
    $("#pauseButton").disabled = !isActive();
    Object.keys(modeButtons).forEach(name => { modeButtons[name].disabled = isActive(); });
    $("#normalButton").disabled = isActive();
    $("#advancedButton").disabled = isActive();
    $("#shopButton").disabled = isActive();
  }
  function clearInputs() {
    keys.clear(); holds.clear(); drag = null;
    Object.keys(directionHolds).forEach(direction => { directionHolds[direction].clear(); directionButtons[direction].classList.remove("is-pressed"); });
    if (snack) snack.eating = false;
    eatButton.classList.remove("is-pressed");
    $("#eatLabel").textContent = modes[mode].action || "按住吃零食";
    needsDraw = true;
  }
  function createSnack() {
    const duration = advanced ? 2.2 : 3.5;
    return { progress: 0, completed: 0, eating: false, teacherState: "writing", teacherTimer: duration, duration: duration, hit: false, looks: 0 };
  }
  function refreshWallet() {
    const state = economy.getState();
    $("#walletValue").textContent = state.coins;
    $("#shopWallet").textContent = state.coins;
    $("#skinName").textContent = economy.getSkin().name;
    document.documentElement.style.setProperty("--skin-color", economy.getSkin().color);
    $("#shopButton").setAttribute("aria-label", "金币 " + state.coins + "，打开商店");
  }
  function updateTier() {
    const unlocked = economy.isMapUnlocked(mode);
    $("#normalButton").classList.toggle("is-selected", !advanced);
    $("#advancedButton").classList.toggle("is-selected", advanced);
    $("#normalButton").setAttribute("aria-pressed", String(!advanced));
    $("#advancedButton").setAttribute("aria-pressed", String(advanced));
    $("#advancedButton").textContent = unlocked ? "高级" : "高级 · 80 金币";
    $("#difficultyInfo").textContent = advanced ? mapName() + (mode === "stall" ? " · 2 生命 · 三阶段 BOSS · 通关 +80 金币" : " · 2 生命 · 金币 ×1.5 · 检查更快") : "普通 · 3 生命 · 金币 ×1";
    $("#bestValue").textContent = economy.getBest(mode, advanced);
    document.body.classList.toggle("advanced-mode", advanced);
  }
  function selectMode(next) {
    if (isActive() || !modes[next]) return;
    mode = next; advanced = chosenTiers[mode] && economy.isMapUnlocked(mode); phase = "idle";
    elapsed = 0; score = 0; runCoins = 0; coinFraction = 0; maxLives = advanced ? 2 : 3; lives = maxLives; invincible = 0;
    snack = createSnack(); battle = battleAPI.create(advanced); clearInputs(); lastBattleMessage = ""; lastBattleStage = "";
    ["stall", "snack", "office"].forEach(name => {
      document.body.classList.toggle(name + "-mode", name === mode);
      modeButtons[name].classList.toggle("is-selected", name === mode);
      modeButtons[name].setAttribute("aria-pressed", String(name === mode));
    });
    $("#stallControls").hidden = isHoldMode(); $("#snackControls").hidden = !isHoldMode(); $("#snackProgress").hidden = !isHoldMode();
    $("#gameSubtitle").textContent = modes[mode].subtitle; $("#startTitle").textContent = modes[mode].title; $("#startCopy").textContent = modes[mode].copy;
    if (mode === "stall" && advanced) {
      $("#gameSubtitle").textContent = "高级挑战 / 三阶段 BOSS 战";
      $("#startTitle").textContent = "击败隔间暴君";
      $("#startCopy").textContent = "左右移动，按上跳跃登上平台；自动向上射击，对准 BOSS 才能命中。躲开落点、跳过地面冲击，BOSS 血量越低攻势越猛。击败奖励 80 金币。";
    }
    $("#startKicker").textContent = mode === "stall" && advanced ? "BOSS / 卫生间封锁战" : "ENDLESS / 无尽模式";
    $("#sessionRule").textContent = mode === "stall" && advanced ? "击败 BOSS 通关" : "无限时长"; $("#comboLabel").textContent = isHoldMode() ? "已完成" : "波次";
    canvas.setAttribute("aria-label", modes[mode].scene);
    if (isHoldMode()) {
      $("#actionHint").textContent = modes[mode].hint; $("#actionTip").textContent = modes[mode].tip;
      $("#actionIcon").textContent = mode === "office" ? "▤" : "●";
      $("#snackControls").setAttribute("aria-label", mode === "office" ? "办公室摸鱼操作" : "教室偷吃操作");
      $("#snackProgressTrack").setAttribute("aria-label", modes[mode].progress);
    }
    updateTier(); refreshWallet(); setControls(); updateHud(); showPanel("startPanel"); setEvent(mode === "stall" && advanced ? "BOSS 已封锁卫生间，准备登台迎战" : modes[mode].idle, "calm"); resizeCanvas();
  }
  function changeTier(next) {
    if (isActive()) return;
    if (next && !economy.isMapUnlocked(mode)) { openShop("高级地图需要 80 金币，购买后永久解锁在本机。"); return; }
    chosenTiers[mode] = next; selectMode(mode);
  }
  function startGame() {
    if (isActive() || !shopPanel.hidden) return;
    selectMode(mode); phase = "countdown"; countdown = 3; clearInputs(); setControls(); overlay.classList.remove("is-visible");
    setEvent(isHoldMode() ? "准备好，留意回头预警" : "准备好，移动红心躲弹幕", "calm"); lastFrame = performance.now(); playTone(330, 0.09, "square");
  }
  function announceWatcher() {
    const state = snack.teacherState;
    setEvent(modes[mode][state === "writing" ? "safe" : state === "warning" ? "warning" : "danger"], state === "writing" ? "success" : state === "warning" ? "warning" : "danger");
  }
  function pauseGame() {
    if (phase !== "playing" && phase !== "countdown") return;
    previousPhase = phase; phase = "paused"; clearInputs(); setControls(); showPanel("pausePanel"); setEvent("已暂停 · 已赚金币已自动存入", "calm");
  }
  function resumeGame() {
    if (phase !== "paused") return;
    phase = previousPhase; clearInputs(); setControls(); overlay.classList.remove("is-visible");
    if (phase === "countdown") setEvent("准备继续", "calm");
    else if (isHoldMode()) announceWatcher();
    else { lastBattleMessage = ""; setEvent("继续躲避弹幕", "calm"); }
    lastFrame = performance.now();
  }
  function finishGame(manual, won) {
    if (!isActive()) return;
    phase = "over"; clearInputs(); score = Math.floor(score); economy.saveBest(mode, advanced, score);
    $("#resultKicker").textContent = mode === "stall" && advanced ? "BOSS / 挑战结算" : "ENDLESS / 本局结算";
    $("#resultTitle").textContent = won ? "隔间暴君已击败！" : manual ? "这次，见好就收" : mode === "stall" ? "红心没撑住" : mode === "snack" ? "零食被没收了" : "被老板抓包了";
    $("#resultScore").textContent = score; $("#resultCopy").textContent = "坚持 " + timeText(elapsed) + "，赚到 " + runCoins + " 金币，已自动存入。";
    setControls(); updateHud(); refreshWallet(); showPanel("resultPanel"); setEvent(won ? "挑战通关！额外 80 金币已到账" : manual ? "金币已收好，去商店看看" : "生命耗尽，金币保留", manual || won ? "success" : "danger"); playTone(manual || won ? 520 : 140, 0.2, "triangle");
  }
  function earnCoins(amount) {
    coinFraction += amount;
    const whole = Math.floor(coinFraction + 0.0000001);
    if (whole > 0) { coinFraction = Math.max(0, coinFraction - whole); runCoins += economy.earn(whole); refreshWallet(); }
  }
  function beginEating(source) {
    if (phase !== "playing" || !isHoldMode()) return;
    holds.add(source); snack.eating = true; eatButton.classList.add("is-pressed"); $("#eatLabel").textContent = modes[mode].acting;
    if (snack.teacherState === "looking") caught();
  }
  function releaseEating(source) {
    holds.delete(source);
    if (!holds.size && snack) { snack.eating = false; eatButton.classList.remove("is-pressed"); $("#eatLabel").textContent = modes[mode].action || "按住吃零食"; needsDraw = true; }
  }
  function caught() {
    if (!snack.hit) { snack.hit = true; lives -= 1; invincible = 0.9; snack.progress = Math.max(0, snack.progress - 8); setEvent(modes[mode].caught, "danger"); playTone(140, 0.14, "sawtooth"); }
    holds.clear(); releaseEating(""); if (lives <= 0) finishGame(false);
  }
  function updateSnack(dt) {
    snack.teacherTimer -= dt;
    if (snack.teacherTimer <= 0) {
      const pressure = Math.min(1, elapsed / 180);
      if (snack.teacherState === "writing") { snack.teacherState = "warning"; snack.duration = (1.05 - pressure * 0.2) / (advanced ? 1.3 : 1); playTone(390, 0.08, "square"); }
      else if (snack.teacherState === "warning") { snack.teacherState = "looking"; snack.duration = (1.5 + Math.random() * 0.5) / (advanced ? 1.2 : 1); snack.hit = false; snack.looks += 1; }
      else { snack.teacherState = "writing"; snack.duration = (3.3 + Math.random() * 1.1 - pressure * 0.8) / (advanced ? 1.55 : 1); }
      snack.teacherTimer = snack.duration; announceWatcher();
    }
    if (!snack.eating) return;
    if (snack.teacherState === "looking") { caught(); return; }
    snack.progress += dt * 6; score += dt * 100 * (advanced ? 1.5 : 1); earnCoins(dt * (advanced ? 3 : 2));
    if (snack.progress >= 100) { snack.progress -= 100; snack.completed += 1; earnCoins(advanced ? 15 : 10); score += 100; playTone(700, 0.1, "triangle"); }
  }
  function battleInput() {
    return {
      x: ((keys.has("d") || keys.has("arrowright") || directionHolds.right.size) ? 1 : 0) - ((keys.has("a") || keys.has("arrowleft") || directionHolds.left.size) ? 1 : 0),
      y: ((keys.has("s") || keys.has("arrowdown") || directionHolds.down.size) ? 1 : 0) - ((keys.has("w") || keys.has("arrowup") || directionHolds.up.size) ? 1 : 0),
      target: drag ? { x: drag.x, y: drag.y } : null
    };
  }
  function update(dt) {
    if (phase === "countdown") {
      countdown -= dt;
      if (countdown <= 0) { phase = "playing"; setControls(); if (isHoldMode()) announceWatcher(); else setEvent("弹幕开始，找到空隙！", "warning"); playTone(550, 0.12, "square"); }
      return;
    }
    if (phase !== "playing") return;
    elapsed += dt; invincible = Math.max(0, invincible - dt);
    if (isHoldMode()) updateSnack(dt);
    else {
      const result = battleAPI.update(battle, dt, battleInput());
      score += dt * 30 * (advanced ? 1.5 : 1); earnCoins(dt * (advanced ? 3 : 2));
      if (result.won) { earnCoins(80); score += 2000; finishGame(false, true); return; }
      if (result.hit) { lives -= 1; invincible = 0.9; playTone(130, 0.14, "sawtooth"); if (lives <= 0) finishGame(false); }
      if (battle.stage === "attack" && lastBattleStage !== "attack") playAttackSound(battle.attackKind);
      lastBattleStage = battle.stage;
      if (phase === "playing" && battle.message !== lastBattleMessage) { lastBattleMessage = battle.message; setEvent(battle.message, battle.tone); }
    }
    updateHud();
  }
  function updateHud() {
    $("#timeValue").textContent = timeText(elapsed); $("#runCoinsValue").textContent = "+" + runCoins; $("#comboValue").textContent = isHoldMode() ? snack.completed : battle.wave;
    document.querySelectorAll("#privacyPips span").forEach((pip, index) => { pip.hidden = index >= maxLives; pip.classList.toggle("is-empty", index >= lives); });
    $("#privacyPips").setAttribute("aria-label", "生命 " + lives + " / " + maxLives);
    if (isHoldMode()) {
      const percentage = Math.floor(snack.progress);
      $("#progressLabel").textContent = modes[mode].progress + " · 第 " + (snack.completed + 1) + (mode === "snack" ? " 包" : " 局");
      $("#snackProgressValue").textContent = percentage + "%"; $("#snackProgressBar").style.transform = "scaleX(" + snack.progress / 100 + ")"; $("#snackProgressTrack").setAttribute("aria-valuenow", percentage);
    }
  }
  function resizeCanvas() {
    document.documentElement.style.setProperty("--app-height", window.innerHeight + "px");
    const rect = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(rect.width * dpr)); canvas.height = Math.max(1, Math.round(rect.height * dpr)); needsDraw = true;
  }
  function canvasPoint(clientX, clientY) {
    const rect = canvas.getBoundingClientRect(), scale = Math.min(rect.width / 960, rect.height / 600);
    return { x: (clientX - rect.left - (rect.width - 960 * scale) / 2) / scale, y: (clientY - rect.top - (rect.height - 600 * scale) / 2) / scale };
  }
  function draw() {
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2), scale = Math.min(rect.width / 960, rect.height / 600);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, rect.width, rect.height); ctx.save(); ctx.translate((rect.width - 960 * scale) / 2, (rect.height - 600 * scale) / 2); ctx.scale(scale, scale);
    const view = { time: elapsed, phase: phase, privacy: lives, maxPrivacy: maxLives, reducedMotion: reducedMotion.matches, invincible: invincible, skin: economy.getSkin(), advanced: advanced };
    if (mode === "stall") battleAPI.draw(ctx, battle, view);
    else { view.progress = snack.progress; view.eating = snack.eating; view.teacherState = snack.teacherState; view.teacherProgress = 1 - Math.max(0, snack.teacherTimer) / snack.duration; (mode === "snack" ? window.ClassroomScene : window.OfficeScene).draw(ctx, view); }
    if (phase === "countdown") { ctx.fillStyle = "rgba(0,0,0,.6)"; ctx.fillRect(0, 0, 960, 600); ctx.textAlign = "center"; ctx.fillStyle = "#ffd85a"; ctx.font = "900 108px Menlo, monospace"; ctx.fillText(Math.max(1, Math.ceil(countdown)), 480, 360); }
    ctx.restore();
  }
  function renderShop(message) {
    const state = economy.getState(); refreshWallet();
    $("#shopMessage").textContent = state.persistent ? message || "已赚金币自动存入。购买即装备，可免费切换已拥有皮肤。" : "当前浏览器无法保存：本次仍可游玩和购买，但关闭后可能丢失。";
    $("#skinList").textContent = ""; $("#mapList").textContent = "";
    economy.skins.forEach(skin => {
      const owned = state.owned.includes(skin.id), equipped = state.equipped === skin.id;
      const card = shopCard(skin.name, equipped ? "三地图同步 · 已装备" : owned ? "已拥有 · 免费切换" : "永久外观 · 不加能力", equipped ? "已装备" : owned ? "装备" : skin.price + " 金币", skin.color);
      card.setAttribute("data-skin", skin.id); card.classList.toggle("is-equipped", equipped);
      card.addEventListener("click", () => { const result = economy.buyOrEquipSkin(skin.id); renderShop(result.message); needsDraw = true; const current = $("[data-skin='" + skin.id + "']"); if (current) current.focus(); });
      $("#skinList").appendChild(card);
    });
    economy.maps.forEach(map => {
      const owned = economy.isMapUnlocked(map.id), card = shopCard(map.name, map.id === "stall" ? "2 生命 · 平台弹幕 · 三阶段 BOSS" : "2 生命 · 检查更快 · 金币 ×1.5", owned ? "已解锁" : map.price + " 金币", "#ffd85a");
      card.setAttribute("data-map", map.id); card.disabled = owned;
      card.addEventListener("click", () => { const result = economy.unlockMap(map.id); renderShop(result.message); updateTier(); const current = $("[data-map='" + map.id + "']"); if (current && !current.disabled) current.focus(); else $("#shopCloseButton").focus(); });
      $("#mapList").appendChild(card);
    });
  }
  function shopCard(name, copy, action, color) {
    const card = document.createElement("button"); card.type = "button"; card.className = "shop-card";
    const swatch = document.createElement("span"); swatch.className = "skin-swatch"; swatch.style.color = color; swatch.textContent = "♥"; swatch.setAttribute("aria-hidden", "true");
    const body = document.createElement("span"); body.className = "shop-card-body";
    const title = document.createElement("strong"); title.textContent = name;
    const detail = document.createElement("small"); detail.textContent = copy;
    const label = document.createElement("span"); label.className = "shop-card-action"; label.textContent = action;
    body.appendChild(title); body.appendChild(detail); card.appendChild(swatch); card.appendChild(body); card.appendChild(label); return card;
  }
  function openShop(message) {
    if (isActive()) return;
    priorFocus = document.activeElement; clearInputs(); renderShop(message); shopPanel.hidden = false; document.body.classList.add("shop-open"); $("#shopCloseButton").focus();
  }
  function closeShop() {
    shopPanel.hidden = true; document.body.classList.remove("shop-open"); updateTier(); refreshWallet(); needsDraw = true;
    if (priorFocus && typeof priorFocus.focus === "function") priorFocus.focus();
  }
  function playTone(frequency, duration, type) {
    if (!audioEnabled) return;
    try {
      if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === "suspended") audioContext.resume();
      const oscillator = audioContext.createOscillator(), gain = audioContext.createGain();
      oscillator.type = type; oscillator.frequency.value = frequency; gain.gain.setValueAtTime(0.025, audioContext.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration); oscillator.connect(gain); gain.connect(audioContext.destination); oscillator.start(); oscillator.stop(audioContext.currentTime + duration);
    } catch (error) { audioEnabled = false; updateSound(); }
  }
  function playAttackSound(kind) {
    if (!audioEnabled) return;
    try {
      if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === "suspended") audioContext.resume();
      const now = audioContext.currentTime;
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const starts = [240, 170, 120];
      const ends = [72, 58, 42];
      oscillator.type = kind === 1 ? "square" : "sawtooth";
      oscillator.frequency.setValueAtTime(starts[kind] || starts[0], now);
      oscillator.frequency.exponentialRampToValueAtTime(ends[kind] || ends[0], now + 0.28);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.055, now + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);
      oscillator.connect(gain); gain.connect(audioContext.destination);
      oscillator.start(now); oscillator.stop(now + 0.35);
    } catch (error) { audioEnabled = false; updateSound(); }
  }
  function updateSound() { $("#soundButton").classList.toggle("is-on", audioEnabled); $("#soundButton").setAttribute("aria-label", audioEnabled ? "关闭音效" : "开启音效"); }
  function bindHold(button, begin, release) {
    if ("PointerEvent" in window) {
      button.addEventListener("pointerdown", event => { if (event.pointerType === "mouse" && event.button !== 0) return; event.preventDefault(); if (button.setPointerCapture) button.setPointerCapture(event.pointerId); begin("pointer-" + event.pointerId); });
      ["pointerup", "pointercancel", "lostpointercapture"].forEach(type => button.addEventListener(type, event => release("pointer-" + event.pointerId)));
    } else {
      button.addEventListener("touchstart", event => { event.preventDefault(); begin("touch"); }, { passive: false });
      ["touchend", "touchcancel"].forEach(type => window.addEventListener(type, () => release("touch")));
      button.addEventListener("mousedown", event => { if (event.button === 0) { event.preventDefault(); begin("mouse"); } });
      window.addEventListener("mouseup", () => release("mouse"));
    }
  }
  bindHold(eatButton, beginEating, releaseEating);
  Object.keys(directionButtons).forEach(direction => {
    bindHold(directionButtons[direction], source => { if (phase !== "playing" || mode !== "stall") return; directionHolds[direction].add(source); directionButtons[direction].classList.add("is-pressed"); }, source => { directionHolds[direction].delete(source); directionButtons[direction].classList.toggle("is-pressed", directionHolds[direction].size > 0); });
  });
  function startDrag(id, x, y) { if (mode !== "stall" || phase !== "playing" || drag) return; const point = canvasPoint(x, y); drag = { id: id, x: point.x, y: point.y }; }
  function moveDrag(id, x, y) { if (drag && drag.id === id) { const point = canvasPoint(x, y); drag.x = point.x; drag.y = point.y; } }
  if ("PointerEvent" in window) {
    canvas.addEventListener("pointerdown", event => { if (event.pointerType === "mouse" && event.button !== 0) return; event.preventDefault(); startDrag(event.pointerId, event.clientX, event.clientY); if (drag && canvas.setPointerCapture) canvas.setPointerCapture(event.pointerId); });
    canvas.addEventListener("pointermove", event => moveDrag(event.pointerId, event.clientX, event.clientY));
    ["pointerup", "pointercancel", "lostpointercapture"].forEach(type => canvas.addEventListener(type, event => { if (drag && drag.id === event.pointerId) drag = null; }));
  } else {
    canvas.addEventListener("touchstart", event => { if (!event.changedTouches.length) return; event.preventDefault(); const touch = event.changedTouches[0]; startDrag(touch.identifier, touch.clientX, touch.clientY); }, { passive: false });
    canvas.addEventListener("touchmove", event => { event.preventDefault(); Array.from(event.changedTouches).forEach(touch => moveDrag(touch.identifier, touch.clientX, touch.clientY)); }, { passive: false });
    ["touchend", "touchcancel"].forEach(type => window.addEventListener(type, () => { drag = null; }));
    canvas.addEventListener("mousedown", event => { if (event.button === 0) startDrag("mouse", event.clientX, event.clientY); });
    window.addEventListener("mousemove", event => moveDrag("mouse", event.clientX, event.clientY)); window.addEventListener("mouseup", () => { drag = null; });
  }
  $("#startButton").addEventListener("click", startGame); $("#restartButton").addEventListener("click", startGame);
  $("#pauseButton").addEventListener("click", () => phase === "paused" ? resumeGame() : pauseGame()); $("#resumeButton").addEventListener("click", resumeGame);
  $("#pauseMenuButton").addEventListener("click", () => finishGame(true)); $("#resultMenuButton").addEventListener("click", () => selectMode(mode));
  $("#soundButton").addEventListener("click", () => { audioEnabled = !audioEnabled; updateSound(); playTone(530, 0.07, "square"); });
  Object.keys(modeButtons).forEach(name => modeButtons[name].addEventListener("click", () => selectMode(name)));
  $("#normalButton").addEventListener("click", () => changeTier(false)); $("#advancedButton").addEventListener("click", () => changeTier(true));
  $("#shopButton").addEventListener("click", () => openShop()); $("#shopCloseButton").addEventListener("click", closeShop);
  const movementKeys = ["a", "w", "s", "d", "arrowleft", "arrowup", "arrowdown", "arrowright"];
  window.addEventListener("keydown", event => {
    const key = event.key.toLowerCase();
    if (!shopPanel.hidden) {
      if (key === "escape") { event.preventDefault(); closeShop(); }
      if (key === "tab") {
        const buttons = Array.from(shopPanel.querySelectorAll("button:not(:disabled)")), first = buttons[0], last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
      return;
    }
    if (movementKeys.includes(key) && phase === "playing" && mode === "stall") { event.preventDefault(); keys.add(key); }
    if ((key === "p" || key === "escape") && !event.repeat && isActive()) { event.preventDefault(); phase === "paused" ? resumeGame() : pauseGame(); return; }
    if (key !== " " && key !== "enter") return;
    const target = event.target, focusedButton = target && target.tagName === "BUTTON";
    const gameplayButton = focusedButton && (target.id === "eatButton" || Object.keys(directionButtons).some(direction => directionButtons[direction] === target));
    if (focusedButton && !gameplayButton) return;
    event.preventDefault(); if (event.repeat) return;
    if (phase === "idle" || phase === "over") startGame(); else if (phase === "paused") resumeGame(); else if (isHoldMode()) beginEating(key);
    else if (gameplayButton) Object.keys(directionButtons).forEach(direction => { if (directionButtons[direction] === target) directionHolds[direction].add(key); });
  });
  window.addEventListener("keyup", event => { const key = event.key.toLowerCase(); keys.delete(key); releaseEating(key); Object.keys(directionHolds).forEach(direction => directionHolds[direction].delete(key)); });
  window.addEventListener("blur", () => { clearInputs(); pauseGame(); });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { clearInputs(); pauseGame(); if (animationFrame !== null) cancelAnimationFrame(animationFrame); animationFrame = null; }
    else { lastFrame = performance.now(); needsDraw = true; refreshWallet(); if (animationFrame === null) animationFrame = requestAnimationFrame(loop); }
  });
  window.addEventListener("resize", resizeCanvas);
  function loop(now) { const dt = Math.max(0, Math.min(0.05, (now - lastFrame) / 1000)); lastFrame = now; update(dt); if (phase === "playing" || phase === "countdown" || needsDraw) { draw(); needsDraw = false; } animationFrame = requestAnimationFrame(loop); }
  selectMode("stall"); updateSound(); animationFrame = requestAnimationFrame(loop);
})();
