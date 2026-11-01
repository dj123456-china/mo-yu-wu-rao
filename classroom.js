(function () {
  "use strict";

  const palette = {
    wall: "#d8e4d3", floor: "#e9dfc6", board: "#285346", chalk: "#e9f0d8",
    frame: "#966c45", wood: "#dcb77e", edge: "#9b734c", ink: "#273b3b",
    yellow: "#ffd85a", coral: "#ff625f", jacket: "#6095af", skin: "#edbd94"
  };

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

  function text(ctx, value, x, y, size, fill, align) {
    ctx.fillStyle = fill;
    ctx.font = "700 " + size + "px 'PingFang SC', 'Microsoft YaHei', sans-serif";
    ctx.textAlign = align || "left";
    ctx.fillText(value, x, y);
  }

  function circle(ctx, x, y, radius, fill) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
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

  function drawBoard(ctx) {
    box(ctx, 150, 74, 660, 198, 5, palette.frame);
    box(ctx, 159, 82, 642, 180, 2, palette.board);
    text(ctx, "随堂练习", 190, 126, 21, palette.chalk);
    text(ctx, "x² + 2x + 1 = (x + 1)²", 190, 173, 25, palette.chalk);
    text(ctx, "认真听讲  /  独立思考", 190, 215, 15, "#afc8ab");
    line(ctx, 190, 138, 290, 138, 2, "#9fb59e");
    box(ctx, 165, 262, 630, 8, 2, "#775536");
    box(ctx, 239, 256, 32, 6, 2, palette.chalk);
    box(ctx, 710, 250, 45, 13, 3, "#bd9060");
    box(ctx, 840, 95, 87, 95, 3, "#f7f2df");
    text(ctx, "课程表", 883, 117, 13, palette.ink, "center");
    for (let i = 0; i < 3; i += 1) line(ctx, 853, 132 + i * 17, 914, 132 + i * 17, 2, "#c7cfbf");
    circle(ctx, 69, 131, 33, palette.ink);
    circle(ctx, 69, 131, 28, "#f9f3dd");
    line(ctx, 69, 131, 69, 112, 3, palette.ink);
    line(ctx, 69, 131, 84, 140, 3, palette.ink);
  }

  function drawTeacher(ctx, state) {
    const looking = state.teacherState === "looking";
    const turning = state.teacherState === "warning";
    const handMotion = state.reducedMotion || looking ? 0 : Math.sin(state.time * 6) * 7;
    if (looking) {
      ctx.fillStyle = "rgba(255, 98, 95, 0.15)";
      ctx.beginPath();
      ctx.moveTo(620, 210);
      ctx.lineTo(210, 566);
      ctx.lineTo(790, 566);
      ctx.closePath();
      ctx.fill();
    }
    ctx.save();
    ctx.translate(625, 190);
    box(ctx, -31, 14, 62, 84, 13, "#bd865b");
    box(ctx, -24, 89, 19, 37, 4, palette.ink);
    box(ctx, 6, 89, 19, 37, 4, palette.ink);
    circle(ctx, 0, -12, 31, palette.skin);
    if (looking || turning) {
      ctx.fillStyle = palette.ink;
      ctx.beginPath();
      ctx.arc(0, -18, 31, Math.PI, Math.PI * 2);
      ctx.fill();
      box(ctx, -30, -24, 58, 9, 3, palette.ink);
      circle(ctx, -11, -9, 4, palette.ink);
      circle(ctx, 11, -9, 4, palette.ink);
      line(ctx, -23, -9, -3, -9, 2, palette.ink);
      line(ctx, 3, -9, 23, -9, 2, palette.ink);
      line(ctx, -7, 8, 7, looking ? 8 : 5, 2, palette.ink);
      line(ctx, -32, 39, -44, 76, 13, "#bd865b");
      line(ctx, 29, 39, 47, 65, 13, "#bd865b");
      circle(ctx, 48, 69, 8, palette.skin);
      if (looking) {
        line(ctx, 48, 69, 68, 43, 5, palette.skin);
        text(ctx, "!", 1, -58, 31, palette.coral, "center");
      }
    } else {
      circle(ctx, 0, -16, 30, palette.ink);
      box(ctx, -23, -4, 46, 24, 10, palette.ink);
      line(ctx, -27, 36, -48, 5 + handMotion, 13, "#bd865b");
      circle(ctx, -50, handMotion, 8, palette.skin);
      line(ctx, -50, handMotion, -63, -8 + handMotion, 4, palette.chalk);
      line(ctx, 28, 39, 34, 78, 13, "#bd865b");
    }
    ctx.restore();
    const color = looking ? palette.coral : turning ? palette.yellow : "#c9e2bd";
    const label = looking ? "谁在吃东西？" : turning ? "嗯？什么声音…" : "这道题注意看…";
    box(ctx, 686, 199, 156, 39, 8, color);
    text(ctx, label, 764, 224, 16, palette.ink, "center");
    if (turning) {
      box(ctx, 689, 244, 150, 5, 2, "#bac7b2");
      box(ctx, 689, 244, Math.max(4, state.teacherProgress * 150), 5, 2, "#cd8a39");
    }
  }

  function classmate(ctx, x, y, scale) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    box(ctx, -70, -9, 140, 65, 6, palette.edge);
    box(ctx, -70, -15, 140, 53, 6, palette.wood);
    box(ctx, -22, 0, 46, 24, 2, palette.chalk);
    line(ctx, 1, 1, 1, 23, 1, "#b5bda5");
    box(ctx, -29, 22, 58, 55, 16, "#719b9f");
    circle(ctx, 0, 16, 21, palette.ink);
    box(ctx, -25, 60, 50, 15, 5, "#ad8661");
    ctx.restore();
  }

  function drawStudent(ctx, state) {
    const jacket = state.skin ? state.skin.jacket : palette.jacket;
    const eating = state.eating;
    const bob = eating && !state.reducedMotion ? Math.sin(state.time * 15) * 3 : 0;
    ctx.save();
    ctx.translate(480, 390);
    if (state.invincible > 0) ctx.globalAlpha = 0.8;
    // Desk, exercise book and pencil case stay visible when the snack is hidden.
    box(ctx, -145, 1, 290, 119, 9, palette.edge);
    box(ctx, -145, -5, 290, 95, 9, palette.wood);
    box(ctx, -105, 11, 99, 60, 3, "#f7f1de");
    line(ctx, -55, 12, -55, 68, 2, "#d9ccb0");
    for (let i = 0; i < 3; i += 1) {
      line(ctx, -95, 28 + i * 11, -66, 28 + i * 11, 2, "#9aa596");
    }
    box(ctx, 51, 11, 59, 20, 5, jacket);
    circle(ctx, 98, 21, 3, palette.yellow);
    box(ctx, -40, 46, 80, 76, 24, jacket);
    line(ctx, -21, 61, -21, 104, 5, "#e7f0ea");
    line(ctx, 21, 61, 21, 104, 5, "#e7f0ea");
    circle(ctx, 0, 42 + bob, 30, palette.ink);
    circle(ctx, 25, 48 + bob, 8, palette.skin);
    if (eating) {
      line(ctx, 36, 80, 70, 45 + bob, 17, jacket);
      circle(ctx, 69, 41 + bob, 9, palette.skin);
      box(ctx, 78, 42, 50, 59, 3, palette.yellow);
      box(ctx, 83, 51, 40, 7, 1, "#bd663a");
      text(ctx, "薯片", 103, 80, 12, palette.ink, "center");
      ctx.save();
      ctx.translate(58, 27 + bob);
      ctx.rotate(-0.3);
      box(ctx, -10, -7, 21, 15, 6, "#edb950");
      line(ctx, -4, -4, 1, 4, 1, "#c28c37");
      ctx.restore();
      text(ctx, "咔嚓", -28, -28 + bob, 20, "#8c653a", "center");
      circle(ctx, 91, 2 + bob, 3, "#bd8846");
      circle(ctx, 113, -7 + bob, 2, "#bd8846");
    } else {
      line(ctx, -38, 74, -68, 45, 15, jacket);
      line(ctx, 38, 74, 60, 46, 15, jacket);
      circle(ctx, -71, 42, 7, palette.skin);
      circle(ctx, 62, 41, 7, palette.skin);
      line(ctx, 63, 38, 49, 24, 3, "#cd704b");
      text(ctx, "认真记笔记", 0, -24, 16, palette.ink, "center");
    }
    box(ctx, -44, 116, 88, 16, 5, "#966b4b");
    ctx.restore();
  }

  function draw(ctx, state) {
    ctx.save();
    ctx.fillStyle = palette.wall;
    ctx.fillRect(0, 0, 960, 600);
    ctx.fillStyle = palette.floor;
    ctx.fillRect(0, 285, 960, 315);
    line(ctx, 0, 286, 960, 286, 5, "#bec8ac");
    for (let y = 315; y < 600; y += 75) line(ctx, 0, y, 960, y, 1, "#d6cdb6");
    for (let x = -240; x < 1200; x += 160) line(ctx, 480 + (x - 480) * 0.6, 287, x, 600, 1, "#d6cdb6");
    drawBoard(ctx);
    if (state.advanced) {
      box(ctx, 169, 88, 400, 153, 2, "#37384c");
      text(ctx, "突击自习", 193, 132, 28, "#ffda79");
      text(ctx, "巡查加密 / 不许交头接耳", 193, 177, 18, "#e7ddd1");
      text(ctx, "高级教室 · 2 生命", 193, 216, 14, "#c4b9d2");
    }
    classmate(ctx, 176, 344, 0.7);
    classmate(ctx, 805, 344, 0.7);
    classmate(ctx, 148, 447, 0.9);
    classmate(ctx, 826, 447, 0.9);
    drawTeacher(ctx, state);
    drawStudent(ctx, state);
    text(ctx, state.advanced ? "突击自习 / 讲台正前方" : "数学课 / 靠窗第三排", 25, 575, 12, "#8b816c");
    ctx.restore();
  }

  window.ClassroomScene = { draw: draw };
})();
