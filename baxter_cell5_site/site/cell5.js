/* Baxter Cell 5 site. No framework, no build. Data: data.js (window.C5, window.C5WALL, window.C5MEDIA). */
(function () {
"use strict";
var K = window.C5.knots, WALL = window.C5WALL;
var BY = {}; K.forEach(function (k) { BY[k.id] = k; });
var MEDIA = window.C5MEDIA;
var $ = function (s, r) { return (r || document).querySelector(s); };
var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
function el(t, c, h) { var e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; }
function mmss(s) { s = Math.max(0, Math.round(s)); var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return (h ? h + ":" + String(m).padStart(2, "0") : m) + ":" + String(x).padStart(2, "0"); }
function fix(x, d) { return Number(x).toFixed(d == null ? 0 : d); }
function pct(a, b, d) { return b ? fix(100 * a / b, d == null ? 1 : d) + "%" : "n/a"; }
function sum(a, f) { return a.reduce(function (s, k) { return s + (f ? f(k) : k); }, 0); }
function median(a) { a = a.slice().sort(function (x, y) { return x - y; }); var n = a.length; if (!n) return 0; return n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2; }
function mean(a) { return a.length ? sum(a) / a.length : 0; }
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
var MODES = { "grab landed wrong shape": "Grab landed the wrong shape", "rope lost": "Rope lost", "out of time": "Out of time", "misread": "Misread (false claim)", "tied": "Tied" };
var ICON = {
  play: '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>', pause: '<svg viewBox="0 0 24 24"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>',
  back: '<svg viewBox="0 0 24 24"><path d="M12 5V2L7 6.5 12 11V8c3.3 0 6 2.7 6 6s-2.7 6-6 6-6-2.7-6-6H4c0 4.4 3.6 8 8 8s8-3.6 8-8-3.6-8-8-8z"/></svg>',
  fwd: '<svg viewBox="0 0 24 24"><path d="M12 5V2l5 4.5L12 11V8c-3.3 0-6 2.7-6 6s2.7 6 6 6 6-2.7 6-6h2c0 4.4-3.6 8-8 8s-8-3.6-8-8 3.6-8 8-8z"/></svg>',
  replay: '<svg viewBox="0 0 24 24"><path d="M12 5V1L7 6l5 5V7c3.3 0 6 2.7 6 6s-2.7 6-6 6-6-2.7-6-6H4c0 4.4 3.6 8 8 8s8-3.6 8-8-3.6-8-8-8z"/></svg>',
  full: '<svg viewBox="0 0 24 24"><path d="M5 5h5v2H7v3H5zm9 0h5v5h-2V7h-3zM5 14h2v3h3v2H5zm12 0h2v5h-5v-2h3z"/></svg>'
};

/* ---------- tooltip ---------- */
var tip = el("div", "tip"); document.body.appendChild(tip);
function tipShow(html, x, y) {
  tip.innerHTML = html; tip.classList.add("on");
  var w = tip.offsetWidth, h = tip.offsetHeight, nx = x + 14, ny = y + 16;
  if (nx + w > innerWidth - 8) nx = x - w - 14; if (ny + h > innerHeight - 8) ny = y - h - 14;
  tip.style.left = Math.max(8, nx) + "px"; tip.style.top = Math.max(8, ny) + "px";
}
function tipHide() { tip.classList.remove("on"); }
function knotTip(k) {
  return '<b>Knot ' + k.id + '</b><br><span class="dot ' + (k.tied ? "g" : "r") + '"></span>' + (k.tied ? "tied" : "not tied") + ' at ' + mmss(k.decision_t) + ' robot time<br>' +
    k.level + ' crossing' + (k.level > 1 ? "s" : "") + (k.tied ? "" : " &middot; " + MODES[k.mode]) + '<br>' + k.grabs + ' grabs, ' + k.landed + ' landed';
}

/* ---------- player ---------- */
function Player(root, video, o) {
  o = o || {};
  var ctl = el("div", "ctl" + (o.wide ? " wide" : ""));
  ctl.innerHTML = '<button class="btn" data-a="play" aria-label="Play or pause">' + ICON.pause + '</button>' +
    '<button class="btn" data-a="back" aria-label="Back 10 seconds" title="Back 10 s (left arrow)">' + ICON.back + '<span>10</span></button>' +
    '<button class="btn" data-a="fwd" aria-label="Forward 10 seconds" title="Forward 10 s (right arrow)"><span>10</span>' + ICON.fwd + '</button>' +
    '<div class="bar" role="slider" aria-label="Progress" tabindex="0"><div class="rail"></div><div class="fill"></div><div class="marks"></div><div class="thumb"></div></div>' +
    '<span class="time">0:00 / 0:00</span>' +
    '<button class="btn replay" data-a="replay">' + ICON.replay + 'Replay</button>';
  if (o.speeds) {
    var sp = el("div", "speeds");
    o.speeds.forEach(function (s) { sp.appendChild(el("button", "btn" + (s.rate === 1 ? " on" : ""), s.label)); sp.lastChild.dataset.rate = s.rate; sp.lastChild.title = "Play at " + s.label + " true time"; });
    ctl.appendChild(sp);
  }
  var fs = el("button", "btn", ICON.full); fs.dataset.a = "full"; fs.setAttribute("aria-label", "Full screen"); ctl.appendChild(fs);
  root.parentNode.insertBefore(ctl, root.nextSibling);
  var big = el("button", "bigplay", '<span>' + ICON.play + '</span>'); big.setAttribute("aria-label", "Play"); root.appendChild(big);
  var bar = $(".bar", ctl), fill = $(".fill", ctl), thumb = $(".thumb", ctl), time = $(".time", ctl), pb = $('[data-a=play]', ctl), marks = $(".marks", ctl);
  var drag = false;
  function dur() { return video.duration || o.duration || 0; }
  function ui() {
    var d = dur(), f = d ? video.currentTime / d : 0;
    fill.style.width = f * 100 + "%"; thumb.style.left = f * 100 + "%";
    time.textContent = mmss(video.currentTime) + " / " + mmss(d);
    if (o.onTime) o.onTime(video.currentTime);
    bar.setAttribute("aria-valuenow", Math.round(f * 100));
  }
  function raf() { ui(); requestAnimationFrame(raf); }
  requestAnimationFrame(raf);
  function seekTo(t) { video.currentTime = Math.min(Math.max(0, t), Math.max(0, dur() - 0.05)); if (video.ended || root.classList.contains("ended")) { root.classList.remove("ended"); ctl.classList.remove("ended"); } ui(); }
  function setPlayIcon() { pb.innerHTML = video.paused ? ICON.play : ICON.pause; }
  video.addEventListener("play", function () { setPlayIcon(); big.parentNode.classList.remove("show-big"); root.classList.remove("ended"); ctl.classList.remove("ended"); });
  video.addEventListener("pause", setPlayIcon);
  video.addEventListener("ended", function () { root.classList.add("ended"); ctl.classList.add("ended"); setPlayIcon(); });
  video.addEventListener("loadedmetadata", ui);
  function toggle() { if (video.ended) { replay(); return; } video.paused ? video.play() : video.pause(); }
  function replay() { seekTo(0); video.play(); }
  big.addEventListener("click", function () { video.play(); });
  ctl.addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    var a = b.dataset.a;
    if (a === "play") toggle(); else if (a === "back") seekTo(video.currentTime - 10); else if (a === "fwd") seekTo(video.currentTime + 10);
    else if (a === "replay") replay();
    else if (a === "full") { var t = root; if (document.fullscreenElement) document.exitFullscreen(); else if (t.requestFullscreen) t.requestFullscreen(); }
    else if (b.dataset.rate) { video.playbackRate = parseFloat(b.dataset.rate); $$(".speeds .btn", ctl).forEach(function (x) { x.classList.toggle("on", x === b); }); }
  });
  function frac(e) { var r = bar.getBoundingClientRect(); return Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)); }
  bar.addEventListener("pointerdown", function (e) { if (e.target.classList.contains("mk")) return; drag = true; bar.classList.add("drag"); bar.setPointerCapture(e.pointerId); seekTo(frac(e) * dur()); });
  bar.addEventListener("pointermove", function (e) { if (drag) seekTo(frac(e) * dur()); });
  bar.addEventListener("pointerup", function () { drag = false; bar.classList.remove("drag"); });
  bar.addEventListener("keydown", function (e) { if (e.key === "ArrowRight") { seekTo(video.currentTime + 5); e.preventDefault(); } if (e.key === "ArrowLeft") { seekTo(video.currentTime - 5); e.preventDefault(); } });
  document.addEventListener("keydown", function (e) {
    if (/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return;
    if (e.key === " " && document.activeElement.tagName !== "BUTTON") { toggle(); e.preventDefault(); }
    else if (e.key === "ArrowLeft" && document.activeElement !== bar) seekTo(video.currentTime - 10);
    else if (e.key === "ArrowRight" && document.activeElement !== bar) seekTo(video.currentTime + 10);
  });
  return { seekTo: seekTo, ctl: ctl, marks: marks, bar: bar, toggle: toggle, big: big, dur: dur };
}

/* ---------- charts (SVG strings; one axis each; neutral ink, green and red only for the outcome) ---------- */
function svg(w, h, inner) { return '<svg class="chart" viewBox="0 0 ' + w + ' ' + h + '" role="img">' + inner + '</svg>'; }
var C = { ink: "var(--ink)", g: "var(--green)", r: "var(--red)", g2: "var(--ink3)", g3: "var(--line)" };

/* tied per level: Cell 4 wall, Cell 5 wall subset, Cell 5 robot clock */
function chartLevels(tally) {
  var rows = [["Cell 4 (wall clock)", tally.c4, "var(--line)"], ["Cell 5, same wall clock", tally.wall, "var(--ink3)"], ["Cell 5 (robot clock)", tally.robot, "var(--ink)"]];
  var W = 560, lh = 22, gap = 14, left = 96, top = 8, h = top, out = "", maxv = 25, bw = W - left - 50;
  for (var l = 0; l < 4; l++) {
    out += '<text x="0" y="' + (h + 16) + '" style="fill:var(--ink);font-weight:700">' + (l + 1) + ' crossing' + (l ? "s" : "") + '</text>';
    rows.forEach(function (r, i) {
      var v = r[1][l], y = h + i * lh;
      out += '<g class="hov"><title>' + r[0] + ', ' + (l + 1) + ' crossing(s): ' + v + ' of 25</title><rect x="' + left + '" y="' + (y + 3) + '" width="' + bw + '" height="14" rx="4" fill="var(--bg2)"/><rect class="b" x="' + left + '" y="' + (y + 3) + '" width="' + Math.max(0, bw * v / maxv) + '" height="14" rx="4" fill="' + r[2] + '"/><text class="v" x="' + (left + bw + 8) + '" y="' + (y + 15) + '">' + v + '</text></g>';
    });
    h += rows.length * lh + gap;
  }
  return svg(W, h, out) + '<div class="leg">' + rows.map(function (r) { return '<span><i style="background:' + r[2] + '"></i>' + r[0] + '</span>'; }).join("") + '</div>';
}

/* failure modes: horizontal bars, level 3 and 4 split in the tooltip */
function chartModes() {
  var order = ["grab landed wrong shape", "rope lost", "out of time", "misread"], W = 560, left = 190, bw = 300, y = 4, out = "", mx = 0, cnt = {};
  order.forEach(function (m) { cnt[m] = K.filter(function (k) { return k.mode === m; }); mx = Math.max(mx, cnt[m].length); });
  order.forEach(function (m) {
    var n = cnt[m].length, l3 = cnt[m].filter(function (k) { return k.level === 3; }).length;
    out += '<g class="hov"><title>' + MODES[m] + ': ' + n + ' knots (level 3: ' + l3 + ', level 4: ' + (n - l3) + ')</title><text x="0" y="' + (y + 16) + '" style="fill:var(--ink)">' + MODES[m] + '</text><rect class="b" x="' + left + '" y="' + (y + 3) + '" width="' + Math.max(3, bw * n / mx) + '" height="14" rx="4" fill="var(--red)"/><text class="v" x="' + (left + Math.max(3, bw * n / mx) + 8) + '" y="' + (y + 15) + '">' + n + '</text></g>';
    y += 30;
  });
  return svg(W, y, out);
}

/* per-grab landed rate by crossings asked */
function chartGrabs() {
  var by = {}; K.forEach(function (k) { k.grab_list.forEach(function (g) { var a = by[g.asked_cr] = by[g.asked_cr] || { n: 0, l: 0, w: 0, m: 0 }; a.n++; if (g.result === "landed") a.l++; else if (g.result === "wrong_shape") a.w++; else a.m++; }); });
  var keys = Object.keys(by).map(Number).sort(function (a, b) { return a - b; }), W = 560, left = 150, bw = 330, y = 4, out = "";
  keys.forEach(function (c) {
    var a = by[c], seg = [["landed", a.l, "var(--green)"], ["wrong shape", a.w, "var(--red)"], ["failed in motion", a.m, "var(--ink3)"]], x = left;
    out += '<text x="0" y="' + (y + 16) + '" style="fill:var(--ink)">asked ' + c + ' crossing' + (c === 1 ? "" : "s") + '</text>';
    seg.forEach(function (s) {
      var w = bw * s[1] / a.n; if (!s[1]) return;
      out += '<g class="hov"><title>' + s[0] + ': ' + s[1] + ' of ' + a.n + ' (' + pct(s[1], a.n) + ')</title><rect class="b" x="' + x + '" y="' + (y + 2) + '" width="' + Math.max(w - 2, 1) + '" height="16" rx="3" fill="' + s[2] + '"/></g>'; x += w;
    });
    out += '<text class="v" x="' + (left + bw + 10) + '" y="' + (y + 15) + '">' + pct(a.l, a.n) + '</text><text x="' + (left + bw + 58) + '" y="' + (y + 15) + '">of ' + a.n + '</text>';
    y += 28;
  });
  return svg(W, y, out) + '<div class="leg"><span><i style="background:var(--green)"></i>landed the shape asked</span><span><i style="background:var(--red)"></i>laid a wrong shape</span><span><i style="background:var(--ink3)"></i>failed in motion</span></div>';
}

/* when each knot was decided: one dot per knot on a robot-minute axis, one row per level; click opens the knot */
function chartWhen() {
  var W = 1000, left = 96, right = 20, rowh = 78, top = 6, bw = W - left - right, out = "";
  var X = function (s) { return left + bw * Math.sqrt(Math.min(s, 3600) / 3600); };
  [0, 1, 2, 5, 10, 20, 30, 45, 60].forEach(function (t) { out += '<line class="gl" x1="' + X(t * 60) + '" x2="' + X(t * 60) + '" y1="' + top + '" y2="' + (top + 4 * rowh) + '"/><text x="' + X(t * 60) + '" y="' + (top + 4 * rowh + 18) + '" text-anchor="middle">' + t + ' min</text>'; });
  for (var l = 1; l <= 4; l++) {
    var ks = K.filter(function (k) { return k.level === l; }).sort(function (a, b) { return a.decision_t - b.decision_t; });
    var y0 = top + (l - 1) * rowh, mid = y0 + 38, placed = [], order = [0, 1, -1, 2, -2];
    out += '<text x="0" y="' + (mid + 4) + '" style="fill:var(--ink);font-weight:700">' + l + ' crossing' + (l > 1 ? "s" : "") + '</text><line class="ax" x1="' + left + '" x2="' + (left + bw) + '" y1="' + mid + '" y2="' + mid + '"/>';
    ks.forEach(function (k) {
      var x0 = X(k.decision_t), done = false, x, ln;
      for (var sh = 0; sh < 40 && !done; sh++) for (var i = 0; i < order.length && !done; i++) {
        x = x0 - sh * 9; ln = order[i];
        if (!placed.some(function (p) { return p.l === ln && Math.abs(p.x - x) < 9; })) { placed.push({ x: x, l: ln }); done = true; }
      }
      out += '<a href="knot.html?id=' + k.id + '"><circle class="pt" cx="' + x + '" cy="' + (mid + ln * 9) + '" r="4" fill="' + (k.tied ? "var(--green)" : "var(--red)") + '" stroke="var(--bg)" stroke-width="2"><title>Knot ' + k.id + ': ' + (k.tied ? "tied" : "not tied") + ' at ' + mmss(k.decision_t) + ' robot time</title></circle></a>';
    });
  }
  return svg(W, top + 4 * rowh + 26, out) + '<div class="leg"><span><i style="background:var(--green);border-radius:50%"></i>tied</span><span><i style="background:var(--red);border-radius:50%"></i>not tied</span><span>Each dot is a knot at the robot time it was decided (square-root axis, so the fast knots are not squashed; dots that overlap are nudged earlier). Click one to open it.</span></div>';
}

/* ---------- main page ---------- */
function tally() {
  var t = { robot: [0, 0, 0, 0], wall: [0, 0, 0, 0], claimed: [0, 0, 0, 0], c4: [25, 22, 13, 1] };
  K.forEach(function (k) { var i = k.level - 1; if (k.tied) t.robot[i]++; if (k.tied && k.tied_in_wall) t.wall[i]++; if (k.claimed) t.claimed[i]++; });
  return t;
}
function mainPage() {
  var stage = $("#stage"), v = $("#wall"), t = tally();
  v.muted = true; v.setAttribute("muted", "");
  var P = Player(stage, v, { wide: true, duration: WALL.seconds });
  var grid = $("#grid");
  WALL.tiles.forEach(function (tl) {
    var k = BY[tl.id], a = el("a"); a.href = "knot.html?id=" + tl.id; a.setAttribute("aria-label", "Knot " + tl.id);
    a.style.left = 100 * tl.x / WALL.width + "%"; a.style.top = 100 * tl.y / WALL.height + "%"; a.style.width = 100 * tl.w / WALL.width + "%"; a.style.height = 100 * tl.h / WALL.height + "%";
    a.addEventListener("mousemove", function (e) { tipShow(knotTip(k), e.clientX, e.clientY); }); a.addEventListener("mouseleave", tipHide);
    a.addEventListener("focus", function () { var r = a.getBoundingClientRect(); tipShow(knotTip(k), r.right, r.top); }); a.addEventListener("blur", tipHide);
    grid.appendChild(a);
  });
  var p = v.play(); if (p && p.catch) p.catch(function () { stage.classList.add("show-big"); });
  /* numbers */
  var tied = sum(t.robot), wallT = sum(t.wall), claimed = sum(t.claimed), falseC = K.filter(function (k) { return k.claimed && !k.tied; }).length;
  var allG = sum(K, function (k) { return k.grabs; }), allL = sum(K, function (k) { return k.landed; });
  var sc = sum(K, function (k) { return k.states_compared; }), sm = sum(K, function (k) { return k.states_misread; });
  var tiedK = K.filter(function (k) { return k.tied; });
  $("#cards").innerHTML =
    card("g", tied + '<small> of 100</small>', 'tied on the robot clock (60 robot minutes a knot), ' + t.robot.join(" / ") + ' by level') +
    card("", wallT + '<small> of 100</small>', 'tied on Cell 4\'s wall clock (' + t.wall.join(" / ") + '), against Cell 4\'s 61') +
    card("r", (100 - tied) + '<small> of 100</small>', 'not tied: all at levels 3 and 4 (' + K.filter(function (k) { return !k.tied && k.level === 3; }).length + ' and ' + K.filter(function (k) { return !k.tied && k.level === 4; }).length + ')') +
    card("", claimed + '<small> claimed</small>', 'tied by the camera, ' + falseC + ' false claim (knot ' + K.filter(function (k) { return k.claimed && !k.tied; }).map(function (k) { return k.id; }).join(", ") + '), 0 missed') +
    card("", pct(allL, allG), 'of the ' + allG.toLocaleString("en") + ' grabs landed the shape asked (' + allL + ')') +
    card("", pct(sc - sm, sc), 'of ' + sc.toLocaleString("en") + ' compared camera readings were exact (' + sm + ' misread)') +
    card("", mmss(median(tiedK.map(function (k) { return k.robot_s; }))), 'median robot time of the ' + tied + ' tied knots (mean ' + mmss(mean(tiedK.map(function (k) { return k.robot_s; }))) + ')') +
    card("", mmss(median(tiedK.map(function (k) { return k.wall_s; }))), 'median wall-clock time of the tied knots (Cell 4\'s clock)');
  $("#c-levels").innerHTML = chartLevels(t);
  $("#c-modes").innerHTML = chartModes();
  $("#c-grabs").innerHTML = chartGrabs();
  $("#c-when").innerHTML = chartWhen();
  /* per-level table */
  var rows = "";
  [1, 2, 3, 4].forEach(function (l) {
    var ks = K.filter(function (k) { return k.level === l; }), td = ks.filter(function (k) { return k.tied; });
    rows += '<tr><td>' + l + '</td><td class="num">' + td.length + ' / 25</td><td class="num">' + t.wall[l - 1] + '</td><td class="num">' + ["25", "22", "13", "1"][l - 1] + '</td><td class="num">' + (td.length ? mmss(mean(td.map(function (k) { return k.robot_s; }))) : "n/a") + '</td><td class="num">' + (td.length ? mmss(median(td.map(function (k) { return k.robot_s; }))) : "n/a") + '</td><td class="num">' + sum(ks, function (k) { return k.grabs; }) + '</td><td class="num">' + pct(sum(ks, function (k) { return k.landed; }), sum(ks, function (k) { return k.grabs; })) + '</td><td class="num">' + pct(sum(ks, function (k) { return k.readings_exact; }), sum(ks, function (k) { return k.readings_n; })) + '</td></tr>';
  });
  rows += '<tr style="font-weight:700"><td>all</td><td class="num">' + tied + ' / 100</td><td class="num">' + wallT + '</td><td class="num">61</td><td class="num">' + mmss(mean(tiedK.map(function (k) { return k.robot_s; }))) + '</td><td class="num">' + mmss(median(tiedK.map(function (k) { return k.robot_s; }))) + '</td><td class="num">' + allG + '</td><td class="num">' + pct(allL, allG) + '</td><td class="num">' + pct(sum(K, function (k) { return k.readings_exact; }), sum(K, function (k) { return k.readings_n; })) + '</td></tr>';
  $("#levtab tbody").innerHTML = rows;
  table();
}
function card(c, n, l) { return '<div class="card ' + c + '"><div class="n">' + n + '</div><div class="l">' + l + '</div></div>'; }

function table() {
  var cols = [
    ["id", "Knot", function (k) { return k.id; }, "l"], ["level", "Crossings", function (k) { return k.level; }], ["outcome", "Outcome", function (k) { return k.tied ? 0 : 1; }],
    ["mode", "Why", function (k) { return k.tied ? "" : MODES[k.mode]; }, "l"], ["robot_s", "Robot time", function (k) { return k.decision_t; }],
    ["grabs", "Grabs", function (k) { return k.grabs; }], ["landed", "Landed", function (k) { return k.landed; }], ["rate", "Landed %", function (k) { return k.grabs ? k.landed / k.grabs : 0; }],
    ["mis", "Misread", function (k) { return k.states_misread; }], ["res", "Resets", function (k) { return k.resets; }], ["con", "Contacts", function (k) { return k.contact_events; }], ["tc", "Changed rope", function (k) { return k.contact_topo; }]
  ];
  var th = $("#kt thead tr"), tb = $("#kt tbody"), sortKey = 0, desc = false, fl = $("#f-level"), fo = $("#f-out"), fm = $("#f-mode"), fq = $("#f-q");
  cols.forEach(function (c, i) { var h = el("th", c[3] || "", c[1]); h.addEventListener("click", function () { if (sortKey === i) desc = !desc; else { sortKey = i; desc = false; } draw(); }); th.appendChild(h); });
  function cell(k, c) {
    switch (c[0]) {
      case "id": return '<td><a class="lk" href="knot.html?id=' + k.id + '">Knot ' + k.id + '</a></td>';
      case "outcome": return '<td><span class="pill ' + (k.tied ? "g" : "r") + '">' + (k.tied ? "tied" : "not tied") + '</span></td>';
      case "mode": return '<td class="l">' + (k.tied ? '<span style="color:var(--ink3)">tied' + (k.tied_in_wall ? "" : " (after 3,600 wall s)") + '</span>' : MODES[k.mode]) + '</td>';
      case "robot_s": return '<td class="num">' + mmss(k.decision_t) + '</td>';
      case "rate": return '<td class="num">' + pct(k.landed, k.grabs, 0) + '</td>';
      default: return '<td class="num">' + c[2](k) + '</td>';
    }
  }
  function draw() {
    var q = fq.value.trim(), ks = K.filter(function (k) {
      return (!fl.value || k.level == fl.value) && (!fo.value || (fo.value === "tied") === k.tied) && (!fm.value || k.mode === fm.value) && (!q || String(k.id) === q || (k.id + "").indexOf(q) === 0);
    });
    var f = cols[sortKey][2]; ks.sort(function (a, b) { var x = f(a), y = f(b); var r = x < y ? -1 : x > y ? 1 : a.id - b.id; return desc ? -r : r; });
    tb.innerHTML = ks.map(function (k) { return '<tr class="click" data-id="' + k.id + '">' + cols.map(function (c) { return cell(k, c); }).join("") + '</tr>'; }).join("");
    $$("th", th).forEach(function (h, i) { h.classList.toggle("sorted", i === sortKey); h.classList.toggle("desc", i === sortKey && desc); });
    $("#kcount").textContent = ks.length + " of 100 knots";
  }
  [fl, fo, fm].forEach(function (x) { x.addEventListener("change", draw); }); fq.addEventListener("input", draw);
  tb.addEventListener("click", function (e) { var r = e.target.closest("tr"); if (r && !e.target.closest("a")) location.href = "knot.html?id=" + r.dataset.id; });
  draw();
}

/* ---------- knot page ---------- */
function tokens(s) { return s === "no crossing" ? '<span class="tok">no crossing</span>' : s.split(" ").map(function (x) { return '<span class="tok">' + esc(x) + '</span>'; }).join(""); }
function chartProgress(k) {
  var W = 900, H = 190, L = 40, R = 16, T = 12, B = 28, pw = W - L - R, ph = H - T - B, mx = Math.max(k.level + 1, 2), end = k.end_clock - k.c0;
  var X = function (t) { return L + pw * (t - k.c0) / end; }, Y = function (c) { return T + ph * (1 - c / mx); }, out = "";
  for (var c = 0; c <= mx; c++) out += '<line class="gl" x1="' + L + '" x2="' + (L + pw) + '" y1="' + Y(c) + '" y2="' + Y(c) + '"/><text x="' + (L - 8) + '" y="' + (Y(c) + 4) + '" text-anchor="end">' + c + '</text>';
  var step = Math.max(60, Math.ceil(end / 6 / 60) * 60);
  for (var t = 0; t <= k.end_clock; t += step) out += '<text x="' + X(t) + '" y="' + (H - 8) + '" text-anchor="middle">' + mmss(t) + '</text>';
  out += '<line x1="' + L + '" x2="' + (L + pw) + '" y1="' + Y(k.level) + '" y2="' + Y(k.level) + '" stroke="var(--green)" stroke-width="2" stroke-dasharray="6 4"><title>target: ' + k.level + ' crossings</title></line><text x="' + (L + pw) + '" y="' + (Y(k.level) - 6) + '" text-anchor="end" style="fill:var(--green)">target ' + k.level + '</text>';
  var pts = k.tour_list.filter(function (x) { return x.truth_cr != null; }), d = "";
  pts.forEach(function (p, i) { d += (i ? "L" + X(p.t) + " " + Y(pts[i - 1].truth_cr) + "L" : "M") + X(p.t) + " " + Y(p.truth_cr); });
  out += '<path d="' + d + '" fill="none" stroke="var(--ink)" stroke-width="2" stroke-linejoin="round"/>';
  pts.forEach(function (p) { if (p.read_cr != null && !p.exact) out += '<circle cx="' + X(p.t) + '" cy="' + Y(p.read_cr) + '" r="4.5" fill="var(--red)" stroke="var(--bg)" stroke-width="2"><title>' + mmss(p.t) + ': camera read ' + p.read_cr + ' crossings, the rope had ' + p.truth_cr + '</title></circle>'; });
  k.grab_list.forEach(function (g) { out += '<line x1="' + X(g.t) + '" x2="' + X(g.t) + '" y1="' + (T + ph) + '" y2="' + (T + ph - 7) + '" stroke="' + (g.result === "landed" ? "var(--green)" : "var(--ink3)") + '" stroke-width="2"/>'; });
  return svg(W, H, out) + '<div class="leg"><span><i style="background:var(--ink);height:3px;vertical-align:middle"></i>true crossings in the rope after each photo tour</span><span><i style="background:var(--red);border-radius:50%"></i>a misread (the camera read another count)</span><span><i style="background:var(--green);height:3px;vertical-align:middle"></i>target</span><span>ticks on the floor: grabs (green landed)</span></div>';
}
var RES = { landed: ["Landed", "g"], wrong_shape: ["Wrong shape", "r"], motion_failed: ["Failed in motion", "n"] };
function knotPage() {
  var id = parseInt(new URLSearchParams(location.search).get("id"), 10), k = BY[id];
  if (!k) { $("#app").innerHTML = '<p class="lede">No such knot. <a class="lk" href="index.html">Back to the wall</a>.</p>'; return; }
  document.title = "Knot " + k.id + " - Baxter Cell 5";
  var prev = BY[(id + 99) % 100], next = BY[(id + 1) % 100], ok = k.tied, cls = ok ? "g" : "r";
  $("#title").innerHTML = 'Knot ' + k.id + ' <span class="pill ' + cls + '" style="vertical-align:middle;font-size:14px">' + (ok ? "tied" : "not tied") + '</span>';
  $("#meta").textContent = k.level + ' crossing' + (k.level > 1 ? "s" : "") + ' target, decided at ' + mmss(k.decision_t) + ' robot time' + (ok ? "" : " (" + MODES[k.mode] + ")");
  $$(".pn-prev").forEach(function (a) { a.href = "knot.html?id=" + prev.id; a.innerHTML = "&larr; Knot " + prev.id; });
  $$(".pn-next").forEach(function (a) { a.href = "knot.html?id=" + next.id; a.innerHTML = "Knot " + next.id + " &rarr;"; });
  var v = $("#kv"), stage = $("#stage");
  v.poster = MEDIA + "poster_" + id + ".jpg"; v.src = MEDIA + "knot_" + id + ".mp4"; v.muted = true; v.loop = false; v.preload = "auto";
  var rows = {};
  var P = Player(stage, v, { duration: k.video_s, speeds: [{ label: "8x", rate: 0.5 }, { label: "16x", rate: 1 }, { label: "32x", rate: 2 }, { label: "64x", rate: 4 }],
    onTime: function (t) { clock.textContent = "Robot clock " + mmss(k.c0 + t * 16 < 0 ? 0 : k.c0 + t * 16); activate(t); } });
  var clock = el("span", "time"); clock.style.minWidth = "120px"; clock.style.textAlign = "left"; P.ctl.insertBefore(clock, $(".speeds", P.ctl));
  var dur = k.video_s;
  function mark(cls, v0, title, onclick) {
    var m = el("div", "mk " + cls); m.style.left = 100 * Math.min(v0, dur) / dur + "%"; m.title = title;
    m.addEventListener("click", function (e) { e.stopPropagation(); P.seekTo(Math.max(0, v0 - 0.4)); v.play(); }); P.marks.appendChild(m);
  }
  k.events.forEach(function (e) {
    if (e.type === "grab") mark("grab" + (e.result === "landed" ? "" : " bad"), e.v, "Grab " + e.n + " at " + mmss(e.t) + ": " + RES[e.result][0]);
    else if (e.type === "reading") mark("reading" + (e.exact ? "" : " bad"), e.v, "Reading at " + mmss(e.t) + (e.exact ? ": exact" : ": misread"));
    else if (e.type === "reset") mark("reset", e.v, "Lift reset " + e.n + " at " + mmss(e.t));
  });
  mark("decision" + (ok ? "" : " bad"), (k.decision_t - k.c0) / 16, (ok ? "Tied" : "Decided: not tied") + " at " + mmss(k.decision_t));
  $("#legend").innerHTML = '<span><i class="g"></i>grab landed</span><span><i class="r"></i>grab failed</span><span><i class="rd"></i>reading</span><span><i class="rs"></i>lift reset</span><span><b style="color:' + (ok ? "var(--green)" : "var(--red)") + '">|</b> decision</span>';
  /* why */
  var deciding = { tied: "the camera and the referee agreed it was tied", claim: "the camera declared the goal and the referee said not tied", referee: "the referee ended the knot", budget: "the 60 robot minutes ran out" }[k.decision];
  var why = '<div class="why ' + cls + '"><b class="h">' + (ok ? "Why it succeeded" : "Why it failed") + '</b>' + esc(k.why) + '</div>' +
    '<p class="note">Decided at ' + mmss(k.decision_t) + ' robot time (' + fix(k.decision_t) + ' s): ' + deciding + '. Failure modes follow the rule of the result handoff, first match: rope lost, then misread, then (a full hour) grab landed wrong shape if at least half the grabs ended without error and the rope was not the shape asked, else out of time.' +
    (k.id === 72 ? ' Odd, not resolved: the record\'s own post-grab truth for this knot says 3 crossings, the simulator\'s graph node and the referee say 4.' : '') + '</p>';
  $("#why").innerHTML = why;
  /* facts */
  var f = function (n, l) { return '<div class="fact"><div class="n">' + n + '</div><div class="l">' + l + '</div></div>'; };
  $("#facts").innerHTML = f(mmss(k.decision_t), "robot time") + f(mmss(k.wall_s), "wall clock (Cell 4's clock)" + (ok ? (k.tied_in_wall ? ", counts there" : ", after 3,600 s, not counted there") : "")) +
    f(k.grabs, "grabs") + f(k.landed + " <small style='font-size:13px;color:var(--ink3)'>" + pct(k.landed, k.grabs, 0) + "</small>", "landed the shape asked") + f(k.wrong_shape, "laid a wrong shape") + f(k.motion_failed, "failed in motion") + f(k.from_misread, "planned from a misread state") +
    f(k.lifts, "lifts (" + k.resets + " resets)") + f(k.tours, "photo tours") + f(k.readings_n, "readings (" + k.readings_exact + " exact)") + f(k.states_compared ? (k.states_compared - k.states_misread) + " of " + k.states_compared : "n/a", "compared states read exactly") +
    f(k.contact_events, "unintended rope contacts (" + k.contact_topo + " changed the rope)") + f(k.travel_contacts, "contacts during travel (" + k.travel_topo + " changed the rope)") + (k.grasp_err_mm != null ? f(fix(k.grasp_err_mm, 1) + " mm", "median grasp error") : "");
  $("#target").innerHTML = tokens(k.target) + '<p class="note">' + k.level + ' crossing' + (k.level > 1 ? "s" : "") + ', read along the rope from one end: O is over, U is under, the sign is the direction of the crossing, the number is the crossing it passes.</p>';
  $("#c-prog").innerHTML = chartProgress(k);
  $("#strip").innerHTML = k.grab_list.map(function (g) { return '<a href="#g' + g.n + '" class="' + (g.result === "landed" ? "" : g.result === "wrong_shape" ? "w" : "m") + '" title="Grab ' + g.n + ': ' + RES[g.result][0] + '" data-v="' + g.v + '"></a>'; }).join("") || '<span class="note">No grabs: the knot was decided before the first grab finished.</span>';
  /* tables */
  $("#gt tbody").innerHTML = k.grab_list.map(function (g) {
    var r = RES[g.result];
    return '<tr id="g' + g.n + '" class="click" data-v="' + g.v + '"><td>' + g.n + '</td><td class="num">' + mmss(g.t) + '</td><td class="l">' + esc(g.arm || "") + '</td><td class="l">asked ' + g.asked_cr + ': ' + esc(g.asked) + '<br><span style="color:var(--ink3)">' + esc(g.move) + '</span></td><td class="l"><span class="pill ' + r[1] + '">' + r[0] + '</span></td><td class="l">' + (g.stage ? esc(g.stage) : '<span style="color:var(--ink3)">none</span>') + '</td><td class="l">' + (g.result === "motion_failed" ? '<span style="color:var(--ink3)">n/a</span>' : g.got_cr + ' cr: ' + esc(g.got)) + '</td><td class="num">' + (g.from_misread ? "yes" : "") + '</td></tr>';
  }).join("");
  $("#lt tbody").innerHTML = k.lift_list.map(function (l, i) {
    return '<tr class="click" data-v="' + l.v + '"><td>' + (i + 1) + '</td><td class="num">' + mmss(l.t) + '</td><td class="l">' + esc(l.arm || "") + '</td><td class="l"><span class="pill ' + (l.ok ? "g" : "n") + '">' + (l.ok ? "ok" : "failed") + '</span></td><td class="l">' + (l.stage ? esc(l.stage) : '<span style="color:var(--ink3)">none</span>') + '</td><td class="num">' + fix(l.secs, 1) + ' s</td></tr>';
  }).join("") || '<tr><td colspan="6" class="l" style="color:var(--ink3)">No lift resets in this knot.</td></tr>';
  $("#rt tbody").innerHTML = k.tour_list.map(function (r, i) {
    return '<tr class="click" data-v="' + r.v + '"><td>' + (i + 1) + '</td><td class="num">' + mmss(r.t) + '</td><td class="l">' + r.read_cr + ' cr: ' + esc(r.read) + '</td><td class="l">' + r.truth_cr + ' cr: ' + esc(r.truth) + '</td><td class="l"><span class="pill ' + (r.exact ? "g" : "r") + '">' + (r.exact ? "exact" : "misread") + '</span></td><td class="num">' + r.closeups + '</td><td class="num">' + fix(r.secs, 1) + ' s</td></tr>';
  }).join("");
  $("#rnote").textContent = "Every photo tour ends in one reading (" + k.readings_n + " here, " + k.readings_exact + " exact). The official count of the result compares " + k.states_compared + " states (" + k.states_misread + " misread); the table lists all of them.";
  var trs = $$("#gt tbody tr, #lt tbody tr, #rt tbody tr");
  document.addEventListener("click", function (e) { var r = e.target.closest("tr[data-v]"); if (r) { P.seekTo(Math.max(0, parseFloat(r.dataset.v) - 0.6)); v.play(); window.scrollTo({ top: stage.offsetTop - 70, behavior: "smooth" }); } });
  $$("#strip a").forEach(function (a) { a.addEventListener("click", function (e) { e.preventDefault(); P.seekTo(Math.max(0, parseFloat(a.dataset.v) - 0.6)); v.play(); }); });
  var gtr = $$("#gt tbody tr"), last = -1;
  function activate(t) {
    var i = -1; k.grab_list.forEach(function (g, j) { if (g.v <= t + 0.05) i = j; });
    if (i !== last) { gtr.forEach(function (r, j) { r.classList.toggle("act", j === i); }); last = i; }
  }
  var p = v.play(); if (p && p.catch) p.catch(function () { stage.classList.add("show-big"); });
}

var page = document.body.dataset.page;
if (page === "main") mainPage(); else if (page === "knot") knotPage();
})();
