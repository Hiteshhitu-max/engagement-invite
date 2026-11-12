/* =========================================================
   Engagement Invitation · Annapoorna & Hitesh
   ========================================================= */
(() => {
  "use strict";

  /* ---------- MUSIC SETTINGS ----------
     1. assets/music.mp3  — your own song file (no ads). Used whenever it exists.
     2. YouTube           — only if there is no music.mp3 (may show/play ads).
     3. Built-in flute    — if neither can play.
     Only CLIP_START → CLIP_END is played, looping, with a fade-in and fade-out.
     If music.mp3 is already trimmed to the clip (shorter than CLIP_END),
     the whole file is played with the same fades.                          */
  const MUSIC_FILE = "assets/music.mp3";
  const YOUTUBE_ID = "3s5XyooFGpg";
  const CLIP_START = 46;     // 0:46
  const CLIP_END = 68;       // 1:08
  const FADE_IN = 2;         // seconds
  const FADE_OUT = 3;        // seconds
  const MAX_VOLUME = 0.85;   // 0–1

  const EVENT = {
    title: "Engagement of Annapoorna R & Hitesh M",
    start: new Date("2026-11-22T11:00:00+05:30"),
    end: new Date("2026-11-22T15:00:00+05:30"),
    location: "Sri Ghanchi Samaj, 25, 10th Cross Rd, Cubbonpete, Nagarathpete, Bengaluru, Karnataka 560002",
    details: "Together with their families, Annapoorna R & Hitesh M invite you to celebrate their engagement.",
  };

  const $ = (s) => document.querySelector(s);
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- Intro / Envelope ---------------- */
  const intro = $("#intro");
  const envelope = $("#openInvite");
  let opened = false;

  envelope.addEventListener("click", () => {
    if (opened) return;
    opened = true;
    Music.start();                      // must run inside the tap (browser autoplay rules)
    envelope.classList.add("is-open");
    intro.classList.add("is-opening");
    setTimeout(() => {
      intro.classList.add("is-gone");
      intro.setAttribute("aria-hidden", "true");
      document.body.classList.remove("locked");
      burstPetals(26);
      revealVisible();
    }, reduceMotion ? 50 : 1700);
  });

  /* ---------------- Music ---------------- */
  let hasFile = false;
  let ytPlayer = null, ytReady = false, ytFailed = false;

  // Check for a local song first; only load YouTube when there isn't one.
  fetch(MUSIC_FILE, { method: "HEAD", cache: "no-store" })
    .then((r) => { hasFile = r.ok && !/text\/html/.test(r.headers.get("content-type") || ""); })
    .catch(() => {})
    .finally(() => { if (!hasFile && YOUTUBE_ID) loadYouTube(); });

  function loadYouTube() {
    window.onYouTubeIframeAPIReady = () => {
      ytPlayer = new YT.Player("ytPlayer", {
        width: 200, height: 200, videoId: YOUTUBE_ID,
        playerVars: { autoplay: 0, controls: 0, playsinline: 1, rel: 0, start: CLIP_START },
        events: {
          onReady: () => { ytReady = true; },
          onError: () => { ytFailed = true; Music.ytBroke(); },
          onStateChange: (e) => { if (e.data === YT.PlayerState.ENDED) { ytPlayer.seekTo(CLIP_START, true); ytPlayer.playVideo(); } },
        },
      });
    };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    tag.async = true;
    document.head.appendChild(tag);
  }

  const Music = (() => {
    const audio = $("#bgm");
    const btn = $("#musicBtn");
    let mode = null;       // "file" | "yt" | "synth"
    let ctx = null, fileGain = null;
    let playing = false;
    let clipTimer = null;

    function setUI() {
      btn.hidden = false;
      btn.classList.toggle("is-paused", !playing);
      btn.setAttribute("aria-pressed", String(playing));
    }

    // volume envelope for position t inside [from, to]
    function envelope(t, from, to) {
      const inG = Math.min(1, Math.max(0, (t - from) / FADE_IN));
      const outG = Math.min(1, Math.max(0, (to - t) / FADE_OUT));
      return MAX_VOLUME * Math.min(inG, outG);
    }

    function start() {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) { ctx = new AC(); ctx.resume(); }   // unlock audio inside the tap

      if (hasFile) return playFile();
      if (ytReady && !ytFailed) return playYT();
      startSynth();
    }

    /* ---- local file (fades via Web Audio so they also work on iPhone) ---- */
    function playFile() {
      mode = "file"; playing = true; setUI();
      audio.loop = false;
      if (ctx && !fileGain) {
        try {
          const src = ctx.createMediaElementSource(audio);
          fileGain = ctx.createGain(); fileGain.gain.value = 0;
          src.connect(fileGain).connect(ctx.destination);
        } catch (_) { fileGain = null; }
      }
      const range = () => {
        const d = audio.duration || 0;
        return d && d < CLIP_END ? [0, d] : [CLIP_START, CLIP_END];   // trimmed file → whole file
      };
      const setVol = (v) => { if (fileGain) fileGain.gain.setTargetAtTime(v, ctx.currentTime, 0.05); else audio.volume = v; };
      setVol(0);
      const begin = () => { try { audio.currentTime = range()[0]; } catch (_) {} };
      if (audio.readyState >= 1) begin(); else audio.addEventListener("loadedmetadata", begin, { once: true });
      const p = audio.play();
      if (p && p.catch) p.catch(() => { clearInterval(clipTimer); startSynth(); });

      clearInterval(clipTimer);
      clipTimer = setInterval(() => {
        if (mode !== "file" || !playing || !audio.duration) return;
        const [from, to] = range();
        const t = audio.currentTime;
        if (t >= to - 0.05 || audio.ended || t < from - 0.5) { setVol(0); audio.currentTime = from; if (audio.paused) audio.play(); return; }
        setVol(envelope(t, from, to));
      }, 100);
    }

    /* ---- YouTube ---- */
    function playYT() {
      mode = "yt"; playing = true; setUI();
      ytPlayer.unMute(); ytPlayer.setVolume(0); ytPlayer.seekTo(CLIP_START, true); ytPlayer.playVideo();
      clearInterval(clipTimer);
      clipTimer = setInterval(() => {
        if (mode !== "yt" || !playing) return;
        let t = 0;
        try { t = ytPlayer.getCurrentTime(); } catch (_) { return; }
        if (t >= CLIP_END || t < CLIP_START - 1) { ytPlayer.setVolume(0); ytPlayer.seekTo(CLIP_START, true); return; }
        ytPlayer.setVolume(Math.round(100 * envelope(t, CLIP_START, CLIP_END)));
      }, 100);
      setTimeout(() => {
        if (mode !== "yt") return;
        const st = ytPlayer.getPlayerState && ytPlayer.getPlayerState();
        if (st !== YT.PlayerState.PLAYING && st !== YT.PlayerState.BUFFERING) ytBroke();
      }, 5000);
    }
    function ytBroke() {
      if (mode !== "yt") return;
      try { ytPlayer.stopVideo(); } catch (_) {}
      clearInterval(clipTimer);
      startSynth();
    }

    /* ---- built-in instrumental ---- */
    function startSynth() {
      if (!ctx) return;
      mode = "synth";
      ctx.resume();
      createSynth(ctx).play();
      playing = true;
      setUI();
    }

    function pause() {
      if (mode === "yt") ytPlayer.pauseVideo();
      else if (mode === "file") audio.pause();
      else if (mode === "synth") ctx.suspend();
    }
    function resume() {
      if (mode === "yt") ytPlayer.playVideo();
      else if (mode === "file") { if (ctx) ctx.resume(); audio.play(); }
      else if (mode === "synth") ctx.resume();
    }

    btn.addEventListener("click", () => {
      playing ? pause() : resume();
      playing = !playing;
      setUI();
    });

    // pause when the tab is hidden, resume when back
    document.addEventListener("visibilitychange", () => {
      if (!playing) return;
      document.hidden ? pause() : resume();
    });

    return { start, ytBroke };
  })();

  function createSynth(ctx) {
    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    // gentle reverb (generated impulse response)
    const reverb = ctx.createConvolver();
    const len = ctx.sampleRate * 3.2;
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    reverb.buffer = ir;
    const wet = ctx.createGain(); wet.gain.value = 0.55;
    const dry = ctx.createGain(); dry.gain.value = 0.75;
    reverb.connect(wet).connect(master);
    dry.connect(master);
    const bus = ctx.createGain();
    bus.connect(dry); bus.connect(reverb);

    // soft echo for the melody
    const delay = ctx.createDelay(); delay.delayTime.value = 0.42;
    const fb = ctx.createGain(); fb.gain.value = 0.28;
    const dWet = ctx.createGain(); dWet.gain.value = 0.25;
    delay.connect(fb).connect(delay);
    delay.connect(dWet).connect(bus);

    const SA = 146.83; // D3
    const hz = (semi, oct = 0) => SA * Math.pow(2, semi / 12 + oct);

    // Tanpura-style pluck: bright, slowly fading drone string
    function tanpura(t, f) {
      const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = f;
      const o2 = ctx.createOscillator(); o2.type = "sawtooth"; o2.frequency.value = f * 1.003;
      const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.Q.value = 6;
      lp.frequency.setValueAtTime(2400, t);
      lp.frequency.exponentialRampToValueAtTime(500, t + 3);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.045, t + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 4.2);
      o.connect(lp); o2.connect(lp); lp.connect(g).connect(bus);
      o.start(t); o2.start(t); o.stop(t + 4.3); o2.stop(t + 4.3);
    }

    // Bell / santoor-like melody voice
    function bell(t, f, dur, vel = 1) {
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.14 * vel, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(1.6, dur * 2.2));
      [[1, "sine", 1], [2, "sine", 0.35], [3.01, "triangle", 0.12], [4.2, "sine", 0.05]].forEach(([m, type, amp]) => {
        const o = ctx.createOscillator(); o.type = type; o.frequency.value = f * m;
        const og = ctx.createGain(); og.gain.value = amp;
        o.connect(og).connect(g);
        o.start(t); o.stop(t + Math.max(1.7, dur * 2.3));
      });
      g.connect(bus); g.connect(delay);
    }

    // Bansuri-style flute: breathy, with gentle vibrato and a soft glide in
    const noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    { const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    function flute(t, f, dur, prevF) {
      const end = t + dur + 0.35;
      const o = ctx.createOscillator(); o.type = "sine";
      o.frequency.setValueAtTime(prevF || f, t);
      o.frequency.exponentialRampToValueAtTime(f, t + Math.min(0.12, dur * 0.3));   // meend / glide
      const o2 = ctx.createOscillator(); o2.type = "triangle"; o2.frequency.value = f * 2;
      const vib = ctx.createOscillator(); vib.frequency.value = 5.2;
      const vibG = ctx.createGain(); vibG.gain.setValueAtTime(0, t); vibG.gain.linearRampToValueAtTime(f * 0.008, t + dur * 0.6);
      vib.connect(vibG); vibG.connect(o.frequency); vibG.connect(o2.frequency);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.11, t + 0.08);
      g.gain.setValueAtTime(0.1, t + dur * 0.7);
      g.gain.exponentialRampToValueAtTime(0.0001, end);
      const g2 = ctx.createGain(); g2.gain.value = 0.12;
      const br = ctx.createBufferSource(); br.buffer = noise; br.loop = true;
      const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = f * 2; bp.Q.value = 2;
      const bg = ctx.createGain(); bg.gain.value = 0.05;
      o.connect(g); o2.connect(g2).connect(g); br.connect(bp).connect(bg).connect(g);
      g.connect(bus); g.connect(delay);
      [o, o2, vib, br].forEach((n) => { n.start(t); n.stop(end + 0.05); });
    }

    // Warm low pad
    function pad(t, f, dur) {
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.05, t + 1.2);
      g.gain.linearRampToValueAtTime(0.0001, t + dur);
      [f, f * 1.5, f * 2].forEach((fr, i) => {
        const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = fr;
        o.detune.value = i * 4 - 4;
        o.connect(g); o.start(t); o.stop(t + dur + 0.1);
      });
      g.connect(bus);
    }

    // Raga Mohanam: S R G P D  (semitones 0 2 4 7 9)
    const S = 0, R = 2, G = 4, P = 7, D = 9, S2 = 12, R2 = 14, G2 = 16, P2 = 19;
    const phrases = [
      [[G, 1], [P, 1], [D, 1], [S2, 2], [D, 1], [P, 2]],
      [[G, 1], [R, 1], [S, 1], [R, 1], [G, 4]],
      [[P, 1], [D, 1], [S2, 1], [R2, 1], [G2, 2], [R2, 1], [S2, 1]],
      [[D, 1], [P, 1], [G, 1], [P, 1], [D, 4]],
      [[S2, 1.5], [D, 0.5], [P, 1], [G, 1], [R, 2], [G, 2]],
      [[P, 1], [G, 1], [R, 1], [G, 1], [S, 4]],
      [[G2, 1], [P2, 1], [G2, 1], [R2, 1], [S2, 2], [D, 2]],
      [[P, 1.5], [G, 0.5], [R, 1], [S, 1], [S, 4]],
    ];
    const BEAT = 60 / 62;               // slow, romantic
    let lastF = 0;
    const melodyOct = 1;                 // D4 range
    const drone = [hz(P, -1), hz(S), hz(S), hz(S, -1)];

    let nextDrone = 0, droneIdx = 0;
    let nextNote = 0, phraseIdx = 0, noteIdx = 0;
    let nextPad = 0, padIdx = 0;
    const padRoots = [hz(S, -1), hz(S, -1), hz(D, -2), hz(P, -2)];
    let timer = null;

    function schedule() {
      const ahead = ctx.currentTime + 0.6;
      while (nextDrone < ahead) {
        tanpura(nextDrone, drone[droneIdx % 4]);
        nextDrone += droneIdx % 4 === 3 ? BEAT * 2 : BEAT;
        droneIdx++;
      }
      while (nextPad < ahead) {
        pad(nextPad, padRoots[padIdx % padRoots.length], BEAT * 8);
        nextPad += BEAT * 8; padIdx++;
      }
      while (nextNote < ahead) {
        const phrase = phrases[phraseIdx % phrases.length];
        const [semi, beats] = phrase[noteIdx];
        const humanize = (Math.random() - 0.5) * 0.02;
        const f = hz(semi, melodyOct);
        flute(nextNote + humanize, f, beats * BEAT, beats >= 1 ? lastF : 0);
        if (noteIdx === 0) bell(nextNote, f * 2, BEAT, 0.35);     // santoor sparkle at phrase start
        lastF = f;
        nextNote += beats * BEAT;
        noteIdx++;
        if (noteIdx >= phrase.length) {
          noteIdx = 0; phraseIdx++;
          nextNote += BEAT * 2;          // breathe between phrases
        }
      }
    }

    return {
      play() {
        const t = ctx.currentTime + 0.1;
        nextDrone = t; nextPad = t; nextNote = t + BEAT * 4;
        master.gain.setValueAtTime(0, t);
        master.gain.linearRampToValueAtTime(0.9, t + 3);
        schedule();
        timer = setInterval(schedule, 150);
      },
      stop() { clearInterval(timer); },
    };
  }

  /* ---------------- Falling petals ---------------- */
  const petalLayer = $("#petals");
  function spawnPetal(delay = 0) {
    const p = document.createElement("span");
    const gold = Math.random() < 0.25;
    p.className = gold ? "petal petal--gold" : "petal";
    const dur = 9 + Math.random() * 8;
    p.style.left = Math.random() * 100 + "vw";
    p.style.setProperty("--s", 10 + Math.random() * 12 + "px");
    p.style.setProperty("--d", dur + "s");
    p.style.setProperty("--sw", 2 + Math.random() * 3 + "s");
    p.style.setProperty("--x", (Math.random() * 160 - 80) + "px");
    p.style.setProperty("--r", (Math.random() * 720 - 360) + "deg");
    p.style.animationDelay = delay + "s, 0s";
    petalLayer.appendChild(p);
    setTimeout(() => p.remove(), (dur + delay) * 1000 + 200);
  }
  function burstPetals(n) {
    if (reduceMotion) return;
    for (let i = 0; i < n; i++) spawnPetal(Math.random() * 2.5);
    setInterval(() => { if (!document.hidden && petalLayer.childElementCount < 22) spawnPetal(); }, 900);
  }

  /* ---------------- Scroll reveal ---------------- */
  const reveals = document.querySelectorAll(".reveal");
  let io = null;
  if ("IntersectionObserver" in window) {
    io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });
  }
   function revealVisible() {
    let n = 0;
    reveals.forEach((el) => {
      // First screen animates in right away; the rest animates on scroll.
      const onFirstScreen = el.closest(".hero") || el.getBoundingClientRect().top < window.innerHeight;
      if (onFirstScreen || !io) {
        el.style.transitionDelay = (n++ * 0.12) + "s";
        requestAnimationFrame(() => el.classList.add("is-in"));
      } else {
        io.observe(el);
      }
    });
  }

  /* ---------------- Countdown ---------------- */
  const cd = { d: $("#cd-days"), h: $("#cd-hours"), m: $("#cd-mins"), s: $("#cd-secs") };
  const pad2 = (n) => String(n).padStart(2, "0");
  function tick() {
    const diff = EVENT.start - Date.now();
    if (diff <= 0) {
      $("#timer").hidden = true; $("#timerDone").hidden = false; return;
    }
    const s = Math.floor(diff / 1000);
    cd.d.textContent = pad2(Math.floor(s / 86400));
    cd.h.textContent = pad2(Math.floor((s % 86400) / 3600));
    cd.m.textContent = pad2(Math.floor((s % 3600) / 60));
    cd.s.textContent = pad2(s % 60);
    setTimeout(tick, 1000 - (Date.now() % 1000));
  }
  tick();

  /* ---------------- Add to calendar ---------------- */
  const toICSDate = (d) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const gcal = "https://calendar.google.com/calendar/render?action=TEMPLATE" +
    "&text=" + encodeURIComponent(EVENT.title) +
    "&dates=" + toICSDate(EVENT.start) + "/" + toICSDate(EVENT.end) +
    "&details=" + encodeURIComponent(EVENT.details) +
    "&location=" + encodeURIComponent(EVENT.location);
  $("#gcalLink").href = gcal;

  $("#calBtn").addEventListener("click", () => {
    const m = $("#calMenu"); m.hidden = !m.hidden;
  });
  $("#icsBtn").addEventListener("click", () => {
    const ics = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Engagement//Invite//EN", "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      "UID:annapoorna-hitesh-20261122@invite",
      "DTSTAMP:" + toICSDate(new Date()),
      "DTSTART:" + toICSDate(EVENT.start),
      "DTEND:" + toICSDate(EVENT.end),
      "SUMMARY:" + EVENT.title,
      "DESCRIPTION:" + EVENT.details,
      "LOCATION:" + EVENT.location.replace(/,/g, "\\,"),
      "BEGIN:VALARM", "TRIGGER:-P1D", "ACTION:DISPLAY", "DESCRIPTION:Engagement tomorrow!", "END:VALARM",
      "END:VEVENT", "END:VCALENDAR",
    ].join("\r\n");
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    const a = document.createElement("a");
    a.href = url; a.download = "Annapoorna-Hitesh-Engagement.ics";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

})();
