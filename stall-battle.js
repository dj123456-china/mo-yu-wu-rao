(function () {
  "use strict";

  const arena = { x: 120, y: 260, width: 720, height: 255 };
  const ink = "#08090b";
  const white = "#f3f3ef";
  const gray = "#666a71";
  const dim = "#24272d";
  const maxBullets = 96;
  const soulRadius = 7;
  const moveSpeed = 430;
  // The heart is a small physical actor instead of a cursor.  In particular,
  // dragging it must not let it hover at an arbitrary Y coordinate forever.
  // Advanced mode uses a slightly stronger pull so it feels like the high
  // pressure map, while still keeping the same controls as normal mode.
  const normalGravity = 520;
  const advancedGravity = 720;
  const normalJumpSpeed = 390;
  const advancedJumpSpeed = 430;
  const verticalDrag = 7;
  const maxVerticalSpeed = 560;
  const heartPixels = ["0110110", "1111111", "1111111", "0111110", "0011100", "0001000"];
  const bossColor = "#ff715b";
  const platforms = [
    { x: 225, y: 434, width: 125 },
    { x: 417, y: 365, width: 126 },
    { x: 610, y: 434, width: 125 }
  ];
  const bossAttacks = ["落纸封路", "贴地冲击", "锁心弹阵"];
  const attackNames = ["纸团雨", "怒气横扫", "左右夹击"];

  function clamp(value, low, high) {
    return Math.max(low, Math.min(high, value));
  }

  function level(state) {
    return Math.min(16, Math.max(0, state.wave - 1));
  }

  function create(advanced) {
    return {
      soul: { x: 480, y: 387.5, vy: 0, grounded: false, jumpInputActive: false, dragJumpActive: false },
      bullets: [],
      wave: 1,
      invincible: 0,
      message: "隔壁正在蓄力，移动小心心躲开怒气",
      tone: "safe",
      advanced: Boolean(advanced),
      stage: "rest",
      timer: advanced ? 0.75 : 1.15,
      duration: advanced ? 0.75 : 1.15,
      attackKind: 0,
      gapX: 480,
      gapY: 387.5,
      gapWidth: advanced ? 112 : 140,
      gapHeight: advanced ? 76 : 88,
      spawnTimer: 0,
      burst: 0,
      activeElapsed: 0,
      boss: advanced ? { hp: 420, maxHp: 420, phase: 1, x: 480, y: 219, shotTimer: 0, shots: [], telegraphs: [], won: false, flash: 0 } : null
    };
  }

  function setStage(state, stage, duration, message, tone) {
    state.stage = stage;
    state.timer = duration;
    state.duration = duration;
    state.message = message;
    state.tone = tone;
  }

  function prepareWave(state) {
    const difficulty = level(state);
    const xLanes = [255, 365, 480, 595, 705];
    const yLanes = [324, 388, 450];
    state.attackKind = (state.wave - 1) % 3;
    const desiredGapX = state.wave === 1 ? 480 : xLanes[(state.wave * 2) % xLanes.length];
    const maxShift = state.advanced ? 230 : 300;
    // Keep the next opening reachable from the current position during its warning.
    state.gapX = clamp(clamp(desiredGapX, state.soul.x - maxShift, state.soul.x + maxShift), 195, 765);
    state.gapY = yLanes[state.wave % yLanes.length];
    state.gapWidth = Math.max(state.advanced ? 90 : 108, (state.advanced ? 112 : 140) - difficulty * 2);
    state.gapHeight = Math.max(state.advanced ? 62 : 72, (state.advanced ? 76 : 88) - difficulty);
    const warningTime = state.advanced ? Math.max(0.85, 0.99 - difficulty * 0.012) : Math.max(1.08, 1.32 - difficulty * 0.015);
    const direction = state.attackKind === 0 ? "纸团要落下了，移入竖向缺口" : state.attackKind === 1 ? "隔壁要怒吼了，移入横向缺口" : "两边一起生气了，躲进交叉缺口";
    setStage(state, "warning", warningTime, direction, "warning");
  }

  function beginAttack(state) {
    state.spawnTimer = 0;
    state.burst = 0;
    setStage(state, "attack", state.advanced ? 3.05 : 3.3, attackNames[state.attackKind] + "！留在缺口，别碰到白色弹幕", "danger");
  }

  function addBullet(state, x, y, vx, vy, kind) {
    if (state.bullets.length >= maxBullets) return;
    state.bullets.push({ x: x, y: y, vx: vx, vy: vy, radius: 8, kind: kind });
  }

  function spawnBurst(state) {
    const speed = 170 + level(state) * 4 + (state.advanced ? 32 : 0);
    if (state.attackKind === 0 || state.attackKind === 2) {
      for (let x = arena.x + 20; x < arena.x + arena.width; x += 40) {
        if (Math.abs(x - state.gapX) < state.gapWidth / 2) continue;
        addBullet(state, x, arena.y - 14, 0, speed, 0);
      }
    }
    if (state.attackKind === 1 || state.attackKind === 2) {
      const fromLeft = state.burst % 2 === 0;
      const fromX = fromLeft ? arena.x - 14 : arena.x + arena.width + 14;
      for (let y = arena.y + 20; y < arena.y + arena.height; y += 32) {
        if (Math.abs(y - state.gapY) < state.gapHeight / 2) continue;
        addBullet(state, fromX, y, fromLeft ? speed * 1.18 : -speed * 1.18, 0, 1);
      }
    }
    state.burst += 1;
  }

  function moveSoul(state, delta, input) {
    let dx = Number.isFinite(input.x) ? input.x : 0;
    let dy = Number.isFinite(input.y) ? input.y : 0;
    const gravity = state.advanced ? advancedGravity : normalGravity;
    const jumpSpeed = state.advanced ? advancedJumpSpeed : normalJumpSpeed;
    // Damping keeps the spring-like drag control stable instead of allowing
    // an undamped oscillation to throw the heart across the whole arena.
    state.soul.vy *= Math.max(0, 1 - (state.advanced ? 0.65 : verticalDrag) * delta);
    const previousY = state.soul.y;
    if (input.target && Number.isFinite(input.target.x) && Number.isFinite(input.target.y)) {
      const targetX = clamp(input.target.x, arena.x + 13, arena.x + arena.width - 13);
      const targetY = clamp(input.target.y, arena.y + 13, arena.y + arena.height - 13);
      // Horizontal dragging remains responsive. A drag above the heart is a
      // single jump request; keeping the pointer there cannot create flight.
      dx = targetX - state.soul.x;
      const targetDeltaY = targetY - state.soul.y;
      const wantsJump = targetDeltaY < -18;
      if (!wantsJump) state.soul.dragJumpActive = false;
      if (wantsJump && !state.soul.dragJumpActive && state.soul.grounded) {
        state.soul.vy = -jumpSpeed;
        state.soul.grounded = false;
        state.soul.dragJumpActive = true;
      }
      state.soul.x += clamp(dx, -moveSpeed * delta, moveSpeed * delta);
    } else {
      const length = Math.sqrt(dx * dx + dy * dy);
      if (length > 1) { dx /= length; dy /= length; }
      state.soul.x += dx * moveSpeed * delta;
      // Up is edge-triggered: one press means one jump. Holding the key while
      // airborne never adds another upward impulse; gravity always wins.
      const wantsJump = dy < -0.25;
      if (!wantsJump) state.soul.jumpInputActive = false;
      if (wantsJump && !state.soul.jumpInputActive && state.soul.grounded) {
        state.soul.vy = -jumpSpeed;
        state.soul.grounded = false;
        state.soul.jumpInputActive = true;
      }
    }
    state.soul.vy += gravity * delta;
    state.soul.vy = clamp(state.soul.vy, -maxVerticalSpeed, maxVerticalSpeed);
    state.soul.y += state.soul.vy * delta;
    state.soul.x = clamp(state.soul.x, arena.x + 13, arena.x + arena.width - 13);
    const floorY = arena.y + arena.height - 13;
    const ceilingY = arena.y + 13;
    if (state.advanced && state.soul.vy >= 0) {
      for (const platform of platforms) {
        const surface = platform.y - 11;
        if (previousY <= surface && state.soul.y >= surface && state.soul.x >= platform.x - 3 && state.soul.x <= platform.x + platform.width + 3) {
          state.soul.y = surface;
          state.soul.vy = 0;
          state.soul.grounded = true;
          return;
        }
      }
    }
    if (state.soul.y >= floorY) {
      state.soul.y = floorY;
      state.soul.vy = 0;
      state.soul.grounded = true;
    } else {
      state.soul.grounded = false;
      if (state.soul.y < ceilingY) {
        state.soul.y = ceilingY;
        state.soul.vy = Math.max(0, state.soul.vy);
      }
    }
  }

  function prepareBossAttack(state) {
    const boss = state.boss;
    boss.phase = boss.hp > boss.maxHp * 2 / 3 ? 1 : boss.hp > boss.maxHp / 3 ? 2 : 3;
    state.attackKind = (state.wave - 1) % 3;
    state.burst = 0;
    boss.telegraphs = [];
    setStage(state, "warning", 1.15 - boss.phase * 0.1,
      "BOSS · " + bossAttacks[state.attackKind] + (state.attackKind === 1 ? "：跳上平台，避开地面！" : state.attackKind === 2 ? "：弹幕瞄准当前位置，持续换位！" : "：避开橙色落点！"), "warning");
    if (state.attackKind === 0) markRain(state);
  }

  function markRain(state) {
    const boss = state.boss;
    const spacing = boss.phase === 3 ? 96 : 120;
    const offset = (state.burst % 2) * spacing / 2;
    for (let x = arena.x + 35 + offset; x < arena.x + arena.width - 10; x += spacing) {
      boss.telegraphs.push({ x: x, timer: 0.72, fired: false });
    }
  }

  function spawnBossBurst(state) {
    const boss = state.boss, speed = 205 + boss.phase * 30;
    if (state.attackKind === 0) {
      markRain(state);
    } else if (state.attackKind === 1) {
      const left = state.burst % 2 === 0;
      addBullet(state, left ? arena.x - 12 : arena.x + arena.width + 12, 499, left ? speed * 1.35 : -speed * 1.35, 0, 2);
      if (boss.phase >= 2) {
        // A high shot pressures the platforms while the low wave is jumped.
        addBullet(state, left ? arena.x + arena.width + 12 : arena.x - 12, 390, left ? -speed : speed, 0, 1);
      }
    } else {
      const angle = Math.atan2(state.soul.y - boss.y, state.soul.x - boss.x);
      for (let i = -boss.phase; i <= boss.phase; i += 1) {
        addBullet(state, boss.x, boss.y + 40, Math.cos(angle + i * 0.23) * speed, Math.sin(angle + i * 0.23) * speed, 1);
      }
    }
    state.burst += 1;
  }

  function updateBoss(state, delta) {
    const boss = state.boss;
    boss.flash = Math.max(0, boss.flash - delta);
    boss.shotTimer -= delta;
    if (boss.shotTimer <= 0) {
      boss.shots.push({ x: state.soul.x, y: state.soul.y - 12 });
      boss.shotTimer += 0.18;
    }
    for (let i = boss.shots.length - 1; i >= 0; i -= 1) {
      const shot = boss.shots[i];
      shot.y -= 620 * delta;
      if (Math.abs(shot.x - boss.x) <= 48 && shot.y <= boss.y + 35) {
        boss.hp = Math.max(0, boss.hp - 2);
        boss.flash = 0.07;
        boss.shots.splice(i, 1);
      } else if (shot.y < arena.y - 55) boss.shots.splice(i, 1);
    }
    if (boss.hp === 0) {
      boss.won = true;
      state.bullets.length = 0;
      boss.telegraphs.length = 0;
      setStage(state, "victory", 0, "BOSS 已击败！卫生间夺回来了", "success");
      return;
    }
    for (let i = boss.telegraphs.length - 1; i >= 0; i -= 1) {
      const mark = boss.telegraphs[i];
      mark.timer -= delta;
      if (mark.timer <= 0 && !mark.fired) {
        addBullet(state, mark.x, arena.y - 14, 0, 300 + boss.phase * 35, 0);
        mark.fired = true;
      }
      if (mark.timer < -0.85) boss.telegraphs.splice(i, 1);
    }
    state.timer -= delta;
    if (state.stage === "rest" && state.timer <= 0) prepareBossAttack(state);
    else if (state.stage === "warning" && state.timer <= 0) {
      state.spawnTimer = 0;
      setStage(state, "attack", 4 + boss.phase * 0.65, "第 " + boss.phase + " 阶段 · " + bossAttacks[state.attackKind] + "！对准 BOSS 自动射击", "danger");
    } else if (state.stage === "attack") {
      state.spawnTimer -= delta;
      if (state.timer > 0 && state.spawnTimer <= 0) {
        spawnBossBurst(state);
        state.spawnTimer += state.attackKind === 0 ? 1.05 : state.attackKind === 1 ? 1.15 - boss.phase * 0.1 : 1.1 - boss.phase * 0.17;
      }
      if (state.timer <= 0 && state.bullets.length === 0 && boss.telegraphs.length === 0) {
        state.wave += 1;
        setStage(state, "rest", 0.85, "BOSS 正在喘息，抢占中间平台输出！", "safe");
      }
    }
  }

  function step(state, delta, input) {
    state.activeElapsed += delta;
    state.invincible = Math.max(0, state.invincible - delta);
    if (state.boss && state.boss.won) return false;
    moveSoul(state, delta, input);
    if (state.advanced) updateBoss(state, delta);
    else {
    state.timer -= delta;
    if (state.stage === "rest" && state.timer <= 0) prepareWave(state);
    else if (state.stage === "warning" && state.timer <= 0) beginAttack(state);
    else if (state.stage === "attack") {
      if (state.timer > 0) {
        state.spawnTimer -= delta;
        if (state.spawnTimer <= 0) {
          spawnBurst(state);
          const base = state.attackKind === 0 ? 0.74 : 0.96;
          state.spawnTimer += Math.max(0.49, base - level(state) * 0.008 - (state.advanced ? 0.12 : 0));
        }
      }
      if (state.timer <= 0 && state.bullets.length === 0) {
        state.wave += 1;
        const restTime = state.advanced ? Math.max(0.45, 0.72 - level(state) * 0.015) : Math.max(0.72, 1.2 - level(state) * 0.025);
        setStage(state, "rest", restTime, "躲过去了！下一波怒气正在酝酿", "safe");
      }
    }

    }
    let hit = false;
    for (let i = state.bullets.length - 1; i >= 0; i -= 1) {
      const bullet = state.bullets[i];
      bullet.x += bullet.vx * delta;
      bullet.y += bullet.vy * delta;
      if (bullet.x < arena.x - 28 || bullet.x > arena.x + arena.width + 28 || bullet.y < arena.y - 28 || bullet.y > arena.y + arena.height + 28) {
        state.bullets.splice(i, 1);
        continue;
      }
      const dx = bullet.x - state.soul.x;
      const dy = bullet.y - state.soul.y;
      const radius = bullet.radius + soulRadius;
      if (state.invincible <= 0 && dx * dx + dy * dy < radius * radius) {
        state.invincible = state.advanced ? 0.9 : 1.2;
        state.bullets.splice(i, 1);
        hit = true;
      }
    }
    return hit;
  }

  function update(state, delta, input) {
    let remaining = Number.isFinite(delta) ? clamp(delta, 0, 0.25) : 0;
    let hit = false;
    const controls = input || { x: 0, y: 0, target: null };
    // Small collision steps prevent fast bullets from passing through the heart.
    while (remaining > 0) {
      const slice = Math.min(remaining, 0.025);
      if (step(state, slice, controls)) hit = true;
      remaining -= slice;
    }
    return { hit: hit, won: Boolean(state.boss && state.boss.won) };
  }

  function rect(ctx, x, y, width, height, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), width, height);
  }

  function outline(ctx, x, y, width, height, thickness, color) {
    rect(ctx, x, y, width, thickness, color);
    rect(ctx, x, y + height - thickness, width, thickness, color);
    rect(ctx, x, y, thickness, height, color);
    rect(ctx, x + width - thickness, y, thickness, height, color);
  }

  function text(ctx, value, x, y, size, color, align) {
    ctx.fillStyle = color;
    ctx.font = "700 " + size + "px 'Courier New', 'PingFang SC', 'Microsoft YaHei', monospace";
    ctx.textAlign = align || "left";
    ctx.fillText(value, x, y);
  }

  function drawClassmate(ctx, x, y, mirrored, angry, motion) {
    ctx.save();
    ctx.translate(x, y + motion);
    ctx.scale(mirrored ? -1 : 1, 1);
    // Original square-cut haircut, school jacket and clenched sleeve.
    rect(ctx, -27, -37, 48, 8, white);
    rect(ctx, -35, -29, 66, 24, white);
    rect(ctx, -35, -5, 9, 24, white);
    rect(ctx, 22, -5, 9, 24, white);
    rect(ctx, -26, 16, 48, 8, white);
    rect(ctx, -22, 24, 42, 7, white);
    rect(ctx, -31, -20, 16, 9, ink);
    rect(ctx, -11, -27, 17, 10, ink);
    rect(ctx, 11, -20, 16, 9, ink);
    rect(ctx, -19, angry ? -5 : -2, 10, 4, white);
    rect(ctx, 7, angry ? -10 : -2, 10, 4, white);
    rect(ctx, -11, 9, 16, angry ? 7 : 3, white);
    if (angry) {
      rect(ctx, -22, -12, 11, 4, white);
      rect(ctx, -11, -8, 6, 4, white);
      rect(ctx, 12, -15, 11, 4, white);
    }
    rect(ctx, -30, 32, 56, 40, white);
    rect(ctx, -17, 32, 29, 40, ink);
    rect(ctx, -3, 34, 4, 37, white);
    rect(ctx, -46, 43, 18, 29, white);
    rect(ctx, 26, 43, 20, 15, white);
    rect(ctx, 40, 29, 14, 24, white);
    rect(ctx, 40, 25, 21, 12, white);
    ctx.restore();
  }

  function drawBathroom(ctx, state, view) {
    rect(ctx, 0, 0, 960, 600, ink);
    for (let y = 84; y < 230; y += 40) {
      for (let x = 43; x < 950; x += 76) outline(ctx, x, y, 65, 29, 1, dim);
    }
    const angry = state.stage === "attack";
    const motion = view.reducedMotion || !angry || view.phase !== "playing" ? 0 : Math.round(Math.sin(view.time * 8) * 2) * 2;
    outline(ctx, 111, 118, 203, 120, 5, white);
    outline(ctx, 646, 118, 203, 120, 5, white);
    rect(ctx, 126, 173, 174, 61, ink);
    rect(ctx, 661, 173, 174, 61, ink);
    drawClassmate(ctx, 210, 132, false, angry, motion);
    drawClassmate(ctx, 750, 132, true, angry, -motion);
    rect(ctx, 116, 201, 193, 5, white);
    rect(ctx, 651, 201, 193, 5, white);
    text(ctx, "左侧隔间", 211, 225, 15, gray, "center");
    text(ctx, "右侧隔间", 750, 225, 15, gray, "center");

    outline(ctx, 355, 82, 250, 45, 3, white);
    text(ctx, state.advanced ? "封锁卫生间 · 决战" : "隔间深处 · 勿扰", 480, 112, 20, white, "center");
    outline(ctx, 399, 145, 55, 58, 5, gray);
    rect(ctx, 409, 156, 35, 20, white);
    outline(ctx, 384, 198, 86, 25, 5, white);
    rect(ctx, 404, 223, 45, 13, white);
    outline(ctx, 489, 151, 47, 69, 4, white);
    rect(ctx, 498, 161, 29, 36, dim);
    rect(ctx, 508, 204, 10, 5, white);
    text(ctx, "嘘…", 563, 177, 21, gray, "center");
    if (state.advanced) {
      // One central enemy owns the entire arena in advanced mode.
      rect(ctx, 350, 132, 260, 108, ink);
      ctx.save();
      ctx.translate(480, 178);
      ctx.scale(1.28, 1.05);
      drawClassmate(ctx, 0, 0, false, true, motion);
      ctx.restore();
      rect(ctx, 441, 133, 12, 5, bossColor);
      rect(ctx, 488, 133, 12, 5, bossColor);
      text(ctx, "隔间暴君 · BOSS", 480, 98, 20, bossColor, "center");
      rect(ctx, 350, 108, 260, 12, dim);
      rect(ctx, 350, 108, 260 * state.boss.hp / state.boss.maxHp, 12, state.boss.flash > 0 ? white : bossColor);
      text(ctx, state.boss.hp + "/" + state.boss.maxHp + " · 阶段 " + state.boss.phase + "/3", 480, 260, 13, white, "center");
    }
    if (state.stage === "warning") {
      text(ctx, "!", 314, 110, 27, white, "center");
      text(ctx, "!", 646, 110, 27, white, "center");
    }
  }

  function drawGap(ctx, state) {
    if (state.stage === "rest") return;
    const color = state.stage === "warning" ? gray : dim;
    if (state.attackKind === 0 || state.attackKind === 2) {
      for (let y = arena.y + 7; y < arena.y + arena.height - 7; y += 17) {
        rect(ctx, state.gapX - state.gapWidth / 2 + 8, y, 2, 7, color);
        rect(ctx, state.gapX + state.gapWidth / 2 - 8, y, 2, 7, color);
      }
    }
    if (state.attackKind === 1 || state.attackKind === 2) {
      for (let x = arena.x + 8; x < arena.x + arena.width - 7; x += 17) {
        rect(ctx, x, state.gapY - state.gapHeight / 2 + 8, 7, 2, color);
        rect(ctx, x, state.gapY + state.gapHeight / 2 - 8, 7, 2, color);
      }
    }
    if (state.stage === "warning") {
      const x = state.attackKind === 1 ? 480 : state.gapX;
      const y = state.attackKind === 0 ? 392 : state.gapY;
      text(ctx, "缺口", x, y - 17, 17, white, "center");
      rect(ctx, x - 6, y - 8, 12, 3, white);
      rect(ctx, x - 3, y - 5, 6, 4, white);
    }
  }

  function drawBullet(ctx, bullet) {
    const x = Math.round(bullet.x);
    const y = Math.round(bullet.y);
    if (bullet.kind === 2) {
      rect(ctx, x - 11, y - 10, 22, 22, bossColor);
      rect(ctx, x - 5, y - 5, 10, 10, ink);
    } else if (bullet.kind === 0) {
      rect(ctx, x - 5, y - 8, 10, 16, white);
      rect(ctx, x - 8, y - 4, 16, 9, white);
      rect(ctx, x - 3, y - 3, 6, 3, ink);
      rect(ctx, x, y + 1, 4, 3, ink);
    } else {
      rect(ctx, x - 8, y - 8, 16, 16, white);
      rect(ctx, x - 2, y - 5, 4, 7, ink);
      rect(ctx, x - 2, y + 4, 4, 2, ink);
    }
  }

  function drawHeart(ctx, x, y, size, color) {
    for (let row = 0; row < heartPixels.length; row += 1) {
      for (let column = 0; column < heartPixels[row].length; column += 1) {
        if (heartPixels[row][column] === "1") rect(ctx, x - size * 3.5 + column * size, y - size * 3 + row * size, size, size, color);
      }
    }
  }

  function draw(ctx, state, view) {
    const options = view || {};
    const skin = options.skin || { color: "#fa4e60", accent: "#fff0c0" };
    const time = Number.isFinite(options.time) ? options.time : 0;
    const drawView = { time: time, phase: options.phase, reducedMotion: Boolean(options.reducedMotion) };
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    drawBathroom(ctx, state, drawView);
    outline(ctx, arena.x - 5, arena.y - 5, arena.width + 10, arena.height + 10, 5, white);
    ctx.save();
    ctx.beginPath();
    ctx.rect(arena.x, arena.y, arena.width, arena.height);
    ctx.clip();
    if (state.advanced) {
      for (const platform of platforms) {
        rect(ctx, platform.x, platform.y, platform.width, 7, gray);
        for (let x = platform.x; x < platform.x + platform.width; x += 18) rect(ctx, x, platform.y + 7, 7, 7, dim);
      }
      for (const mark of state.boss.telegraphs) {
        if (mark.fired) continue;
        rect(ctx, mark.x - 12, arena.y + 5, 24, arena.height - 5, "rgba(255,113,91,0.14)");
        rect(ctx, mark.x - 12, arena.y + arena.height - 5, 24, 5, bossColor);
        text(ctx, "!", mark.x, arena.y + 23, 18, bossColor, "center");
      }
      for (const shot of state.boss.shots) rect(ctx, shot.x - 2, shot.y - 8, 4, 14, skin.accent || white);
    } else drawGap(ctx, state);
    for (let i = 0; i < state.bullets.length; i += 1) drawBullet(ctx, state.bullets[i]);
    if (state.invincible > 0) {
      outline(ctx, state.soul.x - 17, state.soul.y - 17, 34, 34, 2, skin.accent || white);
    }
    const visible = state.invincible <= 0 || options.reducedMotion || Math.floor(time * 12) % 2 === 0 || options.phase !== "playing";
    if (visible) drawHeart(ctx, state.soul.x, state.soul.y, 3, skin.color || "#fa4e60");
    ctx.restore();

    text(ctx, (state.advanced ? "ROUND " : "WAVE ") + String(state.wave).padStart(2, "0"), 120, 549, 20, white);
    const stageLabel = state.advanced ? (state.boss.won ? "BOSS 已击败" : bossAttacks[state.attackKind] + " · 自动射击") : state.stage === "rest" ? "短暂安静" : state.stage === "warning" ? "留意缺口" : attackNames[state.attackKind];
    text(ctx, stageLabel, 480, 549, 18, state.stage === "rest" ? gray : white, "center");
    const hp = Number.isFinite(options.privacy) ? options.privacy : 3;
    const maxHp = Number.isFinite(options.maxPrivacy) ? options.maxPrivacy : 3;
    text(ctx, "HP " + hp + "/" + maxHp, 840, 549, 20, skin.accent || white, "right");
    text(ctx, "←→ / A D 移动  ·  ↑ / W 单次跳跃  ·  拖动向上也只跳一次", 480, 582, 15, gray, "center");
    ctx.restore();
  }

  window.StallBattle = { create: create, update: update, draw: draw };
}());
