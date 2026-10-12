// Indigenous Peoples' Day 2026, round 2: ten painted Remy Boys memes that roast Columbus hard.
// Tone: internet-native and edgy, aimed squarely at Columbus (played by the bald Cabald Remy in the white gi), never
// preachy. Art: scripts/meme/paint.py scripts/meme/sets/ipd2026-v2.json (Codex image gen) → output/meme/art/v2-*.png.
// Facts leaned on: Columbus thought he'd reached India; he landed in the Bahamas (India is ~8,000 miles away);
// Tenochtitlan was bigger than London in 1500 and fed by chinampas (floating farms); people have lived in the
// Americas since the Ice Age.
import { art, box, bubble, css as kitCss, ring, wm } from '../kit.mjs';

export const size = 1080;
export const css = `${kitCss}
.ui { font-family: -apple-system, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif; }
.card { position:absolute; background:#fff; border-radius:28px; box-shadow:0 18px 40px rgba(0,0,0,.45); color:#111; z-index:10; }
.tag { position:absolute; z-index:12; font: 700 30px/1.05 Arial, sans-serif; color:#fff; text-shadow:${ring(4)}; }
.tag::before { content:''; position:absolute; width:46px; height:4px; background:#fff; box-shadow:0 0 0 2px #000; top:50%; }
.tag.l::before { right:calc(100% + 8px); } .tag.r::before { left:calc(100% + 8px); }
`;
const cap = (text, h, size = 50) => `<div class="cap" style="height:${h}px;font-size:${size}px;display:flex;align-items:center">${text}</div>`;
const rule = (y) => box(0, y - 2, 1080, 4, 'background:#000;z-index:30');

export const memes = [
  // 1 ── GPS
  {
    name: 'gps',
    html: `
${art('v2-gps', 0, 0, 1080, 1080)}
<div class="card ui" style="left:40px;top:56px;width:1000px;background:#0f6b45;color:#fff;padding:26px 34px">
  <div style="display:flex;align-items:center;gap:26px"><div style="font-size:84px;line-height:1">↰</div>
  <div><div style="font:800 52px/1.05 -apple-system,Arial">Recalculating…</div>
  <div style="font:600 30px/1.2 -apple-system,Arial;opacity:.9;margin-top:6px">📍 You have arrived: <b>India</b></div></div></div>
</div>
<div class="card ui" style="left:40px;top:226px;width:1000px;background:#fff;padding:16px 34px;font:600 28px/1.2 -apple-system,Arial;color:#444;border-radius:0 0 22px 22px">
  actual location: <b style="color:#111">the Bahamas</b> · India is <b style="color:#c0261c">8,000 miles</b> that way 👉
</div>
<div class="impact" style="position:absolute;left:30px;bottom:34px;width:1020px;text-align:center;font-size:64px;line-height:1.02;z-index:20">worst navigator in history<br>still got a holiday</div>
${wm('rgba(255,255,255,.85)', 'top')}`,
  },

  // 2 ── driver review
  {
    name: 'uber',
    html: `
${cap('Driver reviews, 1492:', 130, 56)}
${art('v2-uber', 0, 130, 1080, 950, { pos: 'center top' })}${rule(130)}
<div class="card ui" style="left:40px;top:690px;width:1000px;padding:28px 34px">
  <div style="display:flex;align-items:center;gap:20px">
    <div style="width:74px;height:74px;border-radius:50%;background:#efe7d6;display:flex;align-items:center;justify-content:center;font-size:44px">🧭</div>
    <div><div style="font:800 34px -apple-system,Arial">Chris C.</div><div style="font:600 24px -apple-system,Arial;color:#777">Rider · from Spain · 3 trips</div></div>
    <div style="margin-left:auto;font-size:46px;color:#f5a623;letter-spacing:2px">★<span style="color:#ccc">★★★★</span></div>
  </div>
  <div style="font:500 31px/1.28 -apple-system,Arial;margin-top:18px">“Got in, said my car belongs to him now, stuck a flag in my cupholder and kept insisting we were in India. Tipped $0. Never again.”</div>
</div>
${wm('rgba(255,255,255,.85)')}`,
  },

  // 3 ── doorbell cam
  {
    name: 'ring-cam',
    html: `
${art('v2-ring', 0, 0, 1080, 1080)}
<div class="ui" style="position:absolute;left:36px;top:34px;z-index:10;font:800 30px -apple-system,Arial;color:#fff;text-shadow:0 2px 6px #000"><span style="color:#ff3b30">●</span> LIVE · Front Door</div>
<div class="ui" style="position:absolute;right:36px;top:34px;z-index:10;font:700 28px -apple-system,Arial;color:#fff;text-shadow:0 2px 6px #000">🔋 12%</div>
<div class="card ui" style="left:120px;top:110px;width:840px;padding:22px 28px;background:rgba(245,245,247,.96);border-radius:26px">
  <div style="display:flex;align-items:center;gap:14px;font:600 24px -apple-system,Arial;color:#666"><div style="width:44px;height:44px;border-radius:11px;background:#1c9ad6;display:flex;align-items:center;justify-content:center;font-size:26px">🔔</div>DOORBELL <span style="margin-left:auto">now</span></div>
  <div style="font:800 32px/1.2 -apple-system,Arial;margin-top:12px">Motion at Front Door</div>
  <div style="font:500 29px/1.25 -apple-system,Arial;margin-top:4px">A man is claiming he “discovered” your house.</div>
</div>
<div class="ui" style="position:absolute;left:0;bottom:0;width:1080px;padding:22px 36px;background:linear-gradient(transparent,rgba(0,0,0,.75));z-index:10;font:700 30px -apple-system,Arial;color:#fff;display:flex">10/12/1492 · 2:14 AM<span style="margin-left:auto">REMY BOYS</span></div>`,
  },

  // 4 ── wanted poster
  {
    name: 'wanted',
    html: `
${box(0, 0, 1080, 1080, 'background:repeating-linear-gradient(90deg,#6b4226 0 132px,#5a3620 132px 136px),linear-gradient(#000,#000);background-blend-mode:normal')}
${box(0, 0, 1080, 1080, 'background:repeating-linear-gradient(0deg,rgba(0,0,0,.06) 0 3px,transparent 3px 9px)')}
${box(120, 24, 840, 1032, 'background:radial-gradient(circle at 50% 45%,#f4e2b8,#e2c48a 75%,#c9a364);box-shadow:0 20px 40px rgba(0,0,0,.55);transform:rotate(-1.2deg);color:#3a2212;text-align:center;font-family:Rockwell,\'American Typewriter\',Georgia,serif',
      `<div style="font:900 150px/1 Rockwell,'American Typewriter',Georgia,serif;letter-spacing:10px;margin-top:22px">WANTED</div>
       <div style="font:700 30px Rockwell,Georgia,serif;letter-spacing:6px;margin-top:-2px">FOR CRIMES AGAINST GEOGRAPHY</div>
       <div style="width:420px;height:420px;margin:16px auto 0;border:8px solid #3a2212;overflow:hidden;position:relative">${art('v2-mugshot', 0, 0, 404, 404, { style: 'filter:sepia(.35) contrast(1.05)' })}</div>
       <div style="font:900 52px Rockwell,Georgia,serif;letter-spacing:3px;margin-top:16px">CHRISTOPHER COLUMBUS</div>
       <div style="font:italic 700 28px Georgia,serif;margin-top:2px">a.k.a. “the Discoverer” (he wasn’t)</div>
       <div style="font:700 27px/1.32 Georgia,serif;margin:14px 60px 0;text-align:left">✗ Trespassing on two entire continents<br>✗ Planting flags on stuff that was already owned<br>✗ Getting the continent wrong (it’s not India, Chris)</div>
       <div style="font:900 40px Rockwell,Georgia,serif;margin-top:16px;letter-spacing:2px">REWARD: 1 DAY OFF EVERY OCTOBER</div>`)}
${wm('rgba(255,240,210,.8)')}`,
  },

  // 5 ── dating profile
  {
    name: 'dating',
    html: `
${box(0, 0, 1080, 1080, 'background:#1d1d22')}
<div class="card ui" style="left:150px;top:34px;width:780px;height:1012px;overflow:hidden;background:#000">
  ${art('v2-dating', 0, 0, 780, 1012, { pos: 'center top' })}
  ${box(0, 520, 780, 492, 'background:linear-gradient(transparent,rgba(0,0,0,.92) 38%)')}
  <div style="position:absolute;left:34px;bottom:150px;right:34px;color:#fff">
    <div style="font:800 54px -apple-system,Arial">Chris, 41 <span style="font-size:36px">🧭</span></div>
    <div style="font:500 27px/1.35 -apple-system,Arial;margin-top:8px;opacity:.95">📍 “India” (probably)<br>🚢 explorer · entrepreneur · visionary<br>if you were already there, I discovered you 😉<br>looking for: someone with land</div>
  </div>
  <div style="position:absolute;left:0;right:0;bottom:30px;display:flex;justify-content:center;gap:60px;font-size:52px">
    <div style="width:96px;height:96px;border-radius:50%;background:#fff;color:#ff4458;display:flex;align-items:center;justify-content:center;font-weight:900">✕</div>
    <div style="width:96px;height:96px;border-radius:50%;background:#fff;color:#21d07c;display:flex;align-items:center;justify-content:center">♥</div>
  </div>
  <div style="position:absolute;left:390px;top:380px;transform:rotate(16deg);border:9px solid #ff4458;color:#ff4458;border-radius:16px;padding:4px 26px;font:900 96px Impact,Arial;letter-spacing:4px;background:rgba(255,255,255,.08)">NOPE</div>
</div>
${wm('rgba(255,255,255,.7)')}`,
  },

  // 6 ── landlord
  {
    name: 'landlord',
    html: `
${cap('Columbus invented being a landlord: showed up, did nothing, said he owns the place now', 200, 46)}
${art('v2-landlord', 0, 200, 1080, 880)}${rule(200)}
${bubble(40, 236, 400, 'bro I BUILT this house', { tx: 220, size: 40 })}
${bubble(690, 236, 350, 'rent’s due 📋', { tail: 'right', tx: 150, size: 40 })}
${wm('rgba(255,255,255,.85)')}`,
  },

  // 7 ── bouncer
  {
    name: 'bouncer',
    html: `
${cap('Columbus trying to get into the Americas:', 130, 54)}
${art('v2-bouncer', 0, 130, 1080, 950)}${rule(130)}
${bubble(640, 166, 400, 'I discovered this club 😤', { tail: 'right', tx: 260, size: 38 })}
${bubble(36, 166, 470, 'we’ve been open since the Ice Age. you’re not on the list', { tx: 160, size: 34, weight: 700 })}
${wm('rgba(255,255,255,.85)')}`,
  },

  // 8 ── calendar POV
  {
    name: 'calendar',
    html: `
${cap('POV: Columbus checks his calendar in 2026', 130, 48)}
${art('v2-calendar', 0, 130, 1080, 950)}${rule(130)}
<div class="card ui" style="left:560px;top:420px;width:490px;padding:22px 26px;background:rgba(245,245,247,.97);border-radius:26px">
  <div style="display:flex;align-items:center;gap:12px;font:600 22px -apple-system,Arial;color:#666"><div style="width:40px;height:40px;border-radius:10px;background:#fff;border:1px solid #ddd;display:flex;flex-direction:column;align-items:center;justify-content:center;font:800 9px Arial;color:#ff3b30;line-height:1">OCT<span style="font-size:18px;color:#111">12</span></div>CALENDAR <span style="margin-left:auto">now</span></div>
  <div style="font:800 30px/1.2 -apple-system,Arial;margin-top:12px">Today: Indigenous Peoples’ Day 🎉</div>
  <div style="font:500 26px/1.3 -apple-system,Arial;margin-top:6px;color:#777"><s>Columbus Day</s> · removed</div>
</div>
${wm('rgba(255,255,255,.85)')}`,
  },

  // 9 ── chad Americas vs virgin Columbus
  {
    name: 'chad-vs-virgin',
    html: `
${cap('The Americas in 1492 vs. the guy who “discovered” them', 130, 46)}
${art('v2-chad', 0, 130, 540, 950)}${art('v2-virgin', 540, 130, 540, 950)}
${rule(130)}${box(538, 130, 4, 950, 'background:#000;z-index:30')}
<div class="tag l" style="left:340px;top:170px">cities bigger<br>than London</div>
<div class="tag l" style="left:380px;top:420px">pyramids</div>
<div class="tag l" style="left:340px;top:760px">floating farms</div>
<div class="tag l" style="left:250px;top:990px">here since the<br>Ice Age</div>
<div class="tag r" style="left:580px;top:170px">thinks he’s<br>in India</div>
<div class="tag r" style="left:830px;top:660px">map upside<br>down</div>
<div class="tag r" style="left:900px;top:500px">lost af</div>
<div class="tag r" style="left:760px;top:990px">wants a holiday<br>for this</div>
${wm('rgba(255,255,255,.85)', 'top')}`,
  },

  // 10 ── Columbus Day fans
  {
    name: 'sad-curb',
    html: `
${cap('Columbus Day fans every second Monday of October:', 130, 48)}
${art('v2-sad', 0, 130, 1080, 950)}${rule(130)}
${wm('rgba(255,255,255,.85)')}`,
  },
];
