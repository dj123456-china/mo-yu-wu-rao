(function () {
  "use strict";

  const palette = {
    wall: "#dce8ed", floor: "#bbcdd7", ink: "#293f50", blue: "#4584a1",
    desk: "#eef1e9", edge: "#8aa3b0", skin: "#edbc99", coral: "#f17765",
    yellow: "#ffdc78", green: "#94ccad", screen: "#203d50"
  };
  const skylineHeights = [86, 124, 73, 108, 147, 98, 71];

  function box(ctx, x, y, width, height, radius, fill) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.fill();
  }

  function line(ctx, x, y, endX, endY, width, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(endX, endY);
    ctx.stroke();
  }

  function circle(ctx, x, y, radius, fill) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  function text(ctx, value, x, y, size, fill, align) {
    ctx.fillStyle = fill;
    ctx.font = "700 " + size + "px 'PingFang SC', 'Microsoft YaHei', sans-serif";
    ctx.textAlign = align || "left";
    ctx.fillText(value, x, y);
  }

  function leaf(ctx, x, y, angle, size, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-size, -size, 0, -size * 2);
    ctx.quadraticCurveTo(size, -size, 0, 0);
    ctx.fill();
    ctx.restore();
  }

  function drawWindow(ctx) {
    box(ctx, 38, 81, 543, 211, 7, palette.edge);
    box(ctx, 48, 91, 523, 191, 2, "#b6dcee");
    ctx.save();
    ctx.beginPath();
    ctx.rect(48, 91, 523, 191);
    ctx.clip();
    circle(ctx, 477, 126, 24, "#f8e5ad");
    for (let i = 0; i < skylineHeights.length; i += 1) {
      const x = 61 + i * 76;
      const top = 282 - skylineHeights[i];
      box(ctx, x, top, 60, skylineHeights[i], 1, i % 2 ? "#82b4ca" : "#93c1d3");
      for (let row = 0; row < 4; row += 1) {
        for (let col = 0; col < 3; col += 1) {
          box(ctx, x + 10 + col * 16, top + 13 + row * 24, 7, 12, 0, "#c9e1e7");
        }
      }
    }
    ctx.globalAlpha = 0.27;
    line(ctx, 235, 91, 86, 282, 31, "#ffffff");
    line(ctx, 281, 91, 132, 282, 8, "#ffffff");
    ctx.restore();
    line(ctx, 218, 87, 218, 287, 8, palette.edge);
    line(ctx, 396, 87, 396, 287, 8, palette.edge);
    box(ctx, 34, 284, 551, 12, 3, "#6c8b9d");
  }

  function drawRoom(ctx) {
    ctx.fillStyle = palette.wall;
    ctx.fillRect(0, 0, 960, 600);
    ctx.fillStyle = palette.floor;
    ctx.fillRect(0, 310, 960, 290);
    line(ctx, 0, 310, 960, 310, 6, "#9cb5c2");
    for (let y = 354; y < 600; y += 61) line(ctx, 0, y, 960, y, 1, "#a8bfcc");
    for (let x = -160; x < 1200; x += 160) line(ctx, 480 + (x - 480) * 0.62, 311, x, 600, 1, "#a8bfcc");
    drawWindow(ctx);

    box(ctx, 611, 85, 161, 75, 4, "#f3f3e9");
    text(ctx, "专注工作", 691, 114, 19, palette.ink, "center");
    text(ctx, "准时下班", 691, 141, 14, "#718e9c", "center");
    box(ctx, 805, 82, 118, 236, 6, "#94b0bf");
    box(ctx, 815, 92, 98, 214, 3, "#bfd2db");
    box(ctx, 826, 107, 76, 55, 2, "#e3eef0");
    text(ctx, "会议室", 864, 141, 17, "#5d7e91", "center");
    line(ctx, 893, 207, 893, 237, 5, "#718c9c");

    // Shared printer corner, distinct from the player's foreground workstation.
    box(ctx, 35, 335, 186, 15, 4, palette.edge);
    box(ctx, 42, 350, 166, 93, 3, "#9eb7c6");
    line(ctx, 125, 353, 125, 438, 2, "#7e9bab");
    circle(ctx, 112, 375, 3, palette.ink);
    circle(ctx, 138, 375, 3, palette.ink);
    box(ctx, 61, 288, 115, 47, 5, "#eff2ee");
    box(ctx, 78, 278, 80, 15, 3, "#5e7a8c");
    box(ctx, 87, 261, 62, 22, 1, "#f9f5e8");
    box(ctx, 78, 307, 75, 19, 3, "#7c9cae");
    box(ctx, 88, 315, 55, 22, 1, "#f8f5e9");
    line(ctx, 97, 322, 134, 322, 2, "#b6c2c4");
    circle(ctx, 162, 303, 3, palette.green);
    box(ctx, 186, 303, 19, 30, 2, "#ddae73");
    box(ctx, 190, 310, 11, 5, 1, "#fff0cf");

    line(ctx, 881, 426, 881, 310, 5, "#638c76");
    leaf(ctx, 881, 374, -0.84, 29, "#699e80");
    leaf(ctx, 881, 362, 0.8, 31, "#82b494");
    leaf(ctx, 881, 326, -0.56, 26, "#83b193");
    leaf(ctx, 881, 329, 0.59, 27, "#5a9579");
    box(ctx, 850, 407, 63, 57, 8, "#ede6d2");
    box(ctx, 845, 404, 73, 12, 4, "#faf0dd");
    line(ctx, 860, 418, 903, 418, 2, "#d2c9b3");
  }

  function drawBoss(ctx, state) {
    const looking = state.teacherState === "looking";
    const warning = state.teacherState === "warning";
    const motion = state.reducedMotion ? 0 : Math.sin(state.time * 3) * 8;
    const x = 727 + (looking || warning ? 0 : motion);
    if (looking) {
      ctx.fillStyle = "rgba(241, 119, 101, 0.17)";
      ctx.beginPath();
      ctx.moveTo(x - 2, 225);
      ctx.lineTo(281, 438);
      ctx.lineTo(661, 438);
      ctx.closePath();
      ctx.fill();
      line(ctx, x - 2, 225, 660, 435, 2, "rgba(241, 119, 101, 0.35)");
    }
    ctx.save();
    ctx.translate(x, 238);
    // A sober suit and conspicuous tie keep the silhouette recognizable at phone size.
    box(ctx, -28, 71, 20, 62, 5, palette.ink);
    box(ctx, 8, 71, 20, 62, 5, palette.ink);
    box(ctx, -33, 123, 30, 13, 5, "#20313e");
    box(ctx, 6, 123, 30, 13, 5, "#20313e");
    box(ctx, -37, 8, 74, 84, 15, "#55768c");
    line(ctx, -32, 29, -45, 75, 15, "#55768c");
    line(ctx, 32, 29, 41, 72, 15, "#55768c");
    circle(ctx, -46, 80, 8, palette.skin);
    circle(ctx, 41, 77, 8, palette.skin);
    circle(ctx, 0, -17, 31, palette.skin);
    if (looking || warning) {
      ctx.fillStyle = palette.ink;
      ctx.beginPath();
      ctx.arc(0, -23, 31, Math.PI, Math.PI * 2);
      ctx.fill();
      box(ctx, -31, -28, 57, 11, 4, palette.ink);
      box(ctx, -15, 8, 30, 49, 0, "#f0ede3");
      ctx.fillStyle = "#d68f63";
      ctx.beginPath();
      ctx.moveTo(0, 13);
      ctx.lineTo(7, 23);
      ctx.lineTo(5, 51);
      ctx.lineTo(0, 57);
      ctx.lineTo(-5, 51);
      ctx.lineTo(-7, 23);
      ctx.closePath();
      ctx.fill();
      line(ctx, -25, -13, -8, looking ? -8 : -13, 3, palette.ink);
      line(ctx, 8, looking ? -8 : -13, 25, -13, 3, palette.ink);
      circle(ctx, -12, -5, 3, palette.ink);
      circle(ctx, 12, -5, 3, palette.ink);
      line(ctx, -7, 10, 7, 10, 3, palette.ink);
      box(ctx, 31, 65, 34, 39, 3, "#b48b61");
      box(ctx, 36, 72, 24, 25, 1, "#eee5d0");
      if (looking) text(ctx, "!", 43, -37, 32, palette.coral, "center");
    } else {
      circle(ctx, 0, -22, 31, palette.ink);
      box(ctx, -29, -21, 58, 29, 9, palette.ink);
      line(ctx, 0, 16, 0, 78, 2, "#3f5e73");
      line(ctx, -25, 16, 25, 16, 2, "#7895a7");
      box(ctx, -63, 63, 38, 32, 3, "#b48b61");
      box(ctx, -57, 69, 26, 20, 1, "#eee5d0");
    }
    ctx.restore();
    const tone = looking ? palette.coral : warning ? palette.yellow : "#d0e5d6";
    const label = looking ? "让我看看屏幕" : warning ? "老板要回头了！" : "老板正在巡视";
    box(ctx, 617, 138, 208, 37, 8, tone);
    text(ctx, label, 721, 163, 17, palette.ink, "center");
    if (warning) {
      box(ctx, 628, 180, 186, 6, 3, "#aec1c7");
      box(ctx, 628, 180, Math.max(5, Math.min(1, state.teacherProgress) * 186), 6, 3, "#cc8d42");
    }
  }

  function drawGameScreen(ctx, state) {
    const accent = state.skin ? state.skin.color : palette.yellow;
    box(ctx, 294, 291, 335, 161, 2, palette.screen);
    box(ctx, 294, 291, 335, 25, 2, "#32647c");
    text(ctx, "午休大作战", 308, 309, 13, "#e8f4ef");
    text(ctx, Math.floor(state.progress) + "%", 615, 309, 12, palette.yellow, "right");
    const offset = state.reducedMotion ? 0 : state.time * 39;
    for (let i = 0; i < 6; i += 1) {
      const x = 312 + ((i * 52 + offset) % 288);
      circle(ctx, x, 337 + i % 3 * 23, 2, "#8cbdca");
    }
    const float = state.reducedMotion ? 0 : Math.sin(state.time * 8) * 4;
    line(ctx, 312, 415, 611, 415, 2, "#557e91");
    box(ctx, 356, 383 + float, 38, 30, 7, accent);
    box(ctx, 350, 377 + float, 27, 18, 5, accent);
    circle(ctx, 368, 384 + float, 3, palette.ink);
    box(ctx, 380, 392 + float, 22, 6, 2, "#e3a04c");
    line(ctx, 363, 412 + float, 357, 419 + float, 4, "#e3a04c");
    line(ctx, 385, 412 + float, 389, 419 + float, 4, "#e3a04c");
    for (let i = 0; i < 3; i += 1) {
      const x = 436 + i * 55;
      circle(ctx, x, 371 - (i % 2) * 17, 9, "#f4cb66");
      line(ctx, x, 366 - (i % 2) * 17, x, 376 - (i % 2) * 17, 2, "#c18e36");
    }
    box(ctx, 521, 390, 20, 24, 2, palette.green);
    box(ctx, 544, 402, 18, 12, 2, palette.green);
    text(ctx, "摸鱼中 · 松手切回工作", 462, 440, 13, "#c9e8e4", "center");
  }

  function drawWorkScreen(ctx) {
    box(ctx, 294, 291, 335, 161, 2, "#f2f5ec");
    box(ctx, 294, 291, 335, 25, 2, "#548975");
    text(ctx, "本周工作汇总", 308, 309, 13, "#f5faeb");
    box(ctx, 305, 324, 313, 20, 1, "#d7e3dc");
    text(ctx, "任务", 316, 339, 11, "#567c70");
    text(ctx, "进度", 465, 339, 11, "#567c70");
    text(ctx, "状态", 560, 339, 11, "#567c70");
    for (let i = 0; i < 4; i += 1) {
      const y = 350 + i * 19;
      line(ctx, 305, y + 14, 618, y + 14, 1, "#d3ded7");
      box(ctx, 318, y + 3, 64 + (i % 2) * 28, 4, 2, "#96ada3");
      box(ctx, 453, y + 1, 71, 7, 2, "#d8e2d9");
      box(ctx, 453, y + 1, 40 + i * 8, 7, 2, "#8db29b");
      circle(ctx, 575, y + 5, 4, "#8eb09b");
    }
    line(ctx, 437, 324, 437, 421, 1, "#c6d6cb");
    line(ctx, 543, 324, 543, 421, 1, "#c6d6cb");
    text(ctx, "工作表已打开", 462, 439, 13, "#548371", "center");
  }

  function drawDesk(ctx, state) {
    const jacket = state.skin ? state.skin.jacket : palette.blue;
    // First-person desk keeps the monitor large while leaving the boss unobscured.
    ctx.fillStyle = "#7a96a7";
    ctx.beginPath();
    ctx.moveTo(253, 397);
    ctx.lineTo(693, 397);
    ctx.lineTo(805, 536);
    ctx.lineTo(140, 536);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = palette.desk;
    ctx.beginPath();
    ctx.moveTo(253, 384);
    ctx.lineTo(693, 384);
    ctx.lineTo(805, 522);
    ctx.lineTo(140, 522);
    ctx.closePath();
    ctx.fill();
    box(ctx, 172, 535, 22, 65, 3, "#6e8c9e");
    box(ctx, 748, 535, 22, 65, 3, "#6e8c9e");

    box(ctx, 444, 451, 37, 31, 4, "#6a8596");
    box(ctx, 413, 477, 99, 12, 5, "#6a8596");
    box(ctx, 282, 279, 359, 188, 9, palette.ink);
    if (state.eating) drawGameScreen(ctx, state);
    else drawWorkScreen(ctx);
    circle(ctx, 463, 459, 2, state.eating ? palette.yellow : palette.green);

    box(ctx, 343, 491, 237, 32, 5, "#93a6b0");
    box(ctx, 348, 487, 227, 30, 4, "#d2dce0");
    for (let row = 0; row < 2; row += 1) {
      for (let col = 0; col < 14; col += 1) {
        box(ctx, 356 + col * 15, 491 + row * 9, 10, 5, 1, "#8ba3b0");
      }
    }
    box(ctx, 402, 509, 109, 4, 1, "#8ba3b0");
    box(ctx, 607, 480, 53, 37, 11, "#bed1d5");
    box(ctx, 620, 483, 25, 27, 10, "#7899ac");
    line(ctx, 632, 487, 632, 494, 2, "#d3e2e6");

    // Coffee, a sticky reminder and a closed notebook make this a lived-in workstation.
    circle(ctx, 232, 466, 23, "#cdd4c6");
    box(ctx, 210, 430, 43, 38, 9, "#f7f4e5");
    circle(ctx, 232, 435, 18, "#835f49");
    circle(ctx, 232, 435, 13, "#957055");
    ctx.strokeStyle = "#f7f4e5";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(257, 447, 10, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();
    box(ctx, 675, 460, 45, 27, 2, palette.yellow);
    text(ctx, "准点溜", 697, 478, 11, "#826e40", "center");
    box(ctx, 660, 417, 47, 32, 3, "#7599ac");
    line(ctx, 669, 420, 669, 446, 2, "#c0d5dc");

    const tap = state.eating && !state.reducedMotion ? Math.sin(state.time * 15) * 2 : 0;
    ctx.save();
    if (state.invincible > 0) ctx.globalAlpha = 0.8;
    line(ctx, 287, 581, 378, 526 + tap, 44, jacket);
    line(ctx, 673, 581, 628, 519 - tap, 44, jacket);
    box(ctx, 356, 506 + tap, 47, 23, 10, palette.skin);
    box(ctx, 607, 500 - tap, 46, 27, 11, palette.skin);
    line(ctx, 366, 512 + tap, 390, 512 + tap, 2, "#d39c7b");
    line(ctx, 619, 507 - tap, 641, 507 - tap, 2, "#d39c7b");
    ctx.restore();
    text(ctx, state.advanced ? "总监办公室 / 正对老板" : "行政办公室 / 靠窗工位", 26, 575, 12, "#6c8798");
  }

  function draw(ctx, state) {
    ctx.save();
    drawRoom(ctx);
    if (state.advanced) {
      box(ctx, 48, 91, 523, 191, 2, "#334a66");
      circle(ctx, 487, 125, 19, "#eddda9");
      for (let i = 0; i < 7; i += 1) {
        box(ctx, 59 + i * 76, 203 - (i % 3) * 21, 54, 79 + (i % 3) * 21, 0, "#23384f");
        for (let j = 0; j < 3; j += 1) box(ctx, 70 + i * 76, 213 + j * 18, 8, 7, 0, "#d5bc74");
      }
      box(ctx, 820, 108, 85, 53, 2, "#473d39");
      text(ctx, "总监室", 864, 141, 17, "#f1d798", "center");
    }
    drawBoss(ctx, state);
    drawDesk(ctx, state);
    ctx.restore();
  }

  window.OfficeScene = { draw: draw };
})();
