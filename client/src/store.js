// App-wide state. Sample data is mutated in place and `refresh()` re-renders every subscriber,
// which keeps the ported prototype logic simple.
import { useSyncExternalStore } from 'react';

let version = 0;
const subs = new Set();
export function refresh() { version++; subs.forEach((f) => f()); }
export function useStore() {
  return useSyncExternalStore((cb) => { subs.add(cb); return () => subs.delete(cb); }, () => version);
}

// ---------- reference data ----------
export const C = { AZ: 'Azerbaijan', TR: 'Türkiye', LT: 'Lithuania', UA: 'Ukraine', GE: 'Georgia', KZ: 'Kazakhstan', DE: 'Germany', ES: 'Spain', IN: 'India' };
export const LANGS = ['Azerbaijani', 'Turkish', 'English', 'Lithuanian', 'Russian', 'Ukrainian'];
export const SK = ['Frontend', 'Backend', 'Python', 'ML / AI', 'Mobile', 'Design', 'Business', 'Pitch', 'Maths', 'Documentation'];
export const PAGES = [['rooms', 'Rooms'], ['laundry', 'Laundry'], ['team', 'Team finder'], ['chat', 'Chat'], ['report', 'Requests'], ['profile', 'Profile']];
export const GN = { F: 'girls', M: 'boys' };
export const BL = ['A', 'B'];
export const ME = 'You';

// ---------- state ----------
export const S = {
  user: null, // { mail, name, langs, skills }
  prefs: { c: 'AZ', g: 'F', p: true, show: true },
  page: 'rooms',
  toast: null,
  myRoom: null,
  reg: null,
  roomReqs: [],   // my room requests from the server, newest first
  roomReq: null,  // my active (pending or approved) request
  view: { cb: 2, ck: 0, cf: 1, selB: null, info: null },
  allowMixed: new Set(),
  ticketNo: 1041,
  tickets: [{ no: 1038, cat: 'wifi', place: 'My room', desc: 'The Wi-Fi keeps dropping in the evenings.', stage: 3, reply: 'Maršrutizatorius pakeistas. Praneškite, jei problema kartosis.', replyEn: 'The router was replaced. Let us know if the problem comes back.', date: '21 October' }],
};

let toastT;
export function toast(t) { S.toast = t; refresh(); clearTimeout(toastT); toastT = setTimeout(() => { S.toast = null; refresh(); }, 3500); }
export function go(p) {
  S.page = p; refresh(); window.scrollTo(0, 0);
  try { localStorage.setItem('cl-page', p); } catch { /* storage unavailable */ }
}

// ---------- rooms ----------
const P = [['Ali', 'M', 'AZ'], ['Vali', 'M', 'AZ'], ['Samir', 'M', 'AZ'], ['Kanan', 'M', 'AZ'], ['Orkhan', 'M', 'AZ'], ['Nijat', 'M', 'AZ'], ['Rauf', 'M', 'AZ'], ['Murad', 'M', 'TR'], ['Emre', 'M', 'TR'], ['Burak', 'M', 'TR'], ['Tomas', 'M', 'LT'], ['Jonas', 'M', 'LT'], ['Lukas', 'M', 'LT'], ['Mantas', 'M', 'LT'], ['Paulius', 'M', 'LT'], ['Dmytro', 'M', 'UA'], ['Arjun', 'M', 'IN'], ['Giorgi', 'M', 'GE'], ['Daniyar', 'M', 'KZ'], ['Nigar', 'F', 'AZ'], ['Aysel', 'F', 'AZ'], ['Alsu', 'F', 'KZ'], ['Aida', 'F', 'KZ'], ['Leyla', 'F', 'TR'], ['Zeynep', 'F', 'TR'], ['Elif', 'F', 'TR'], ['Rūta', 'F', 'LT'], ['Ieva', 'F', 'LT'], ['Gabija', 'F', 'LT'], ['Emma', 'F', 'DE'], ['Mia', 'F', 'DE'], ['Lina', 'F', 'UA'], ['Oksana', 'F', 'UA'], ['Sara', 'F', 'ES'], ['Ana', 'F', 'GE'], ['Priya', 'F', 'IN']];
const FAC = ['Computer Science', 'Civil Engineering', 'Business', 'Architecture', 'Electronics', 'Mechanics'];
let seed = 21;
const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
const pick = (a) => a[Math.floor(rnd() * a.length)];
const person = (g, intl) => { const p = pick(P.filter((x) => x[1] === g && (!intl || x[2] !== 'LT'))); return { n: p[0], g, c: p[2], y: 1 + Math.floor(rnd() * 4), f: pick(FAC) }; };

export const B = [1, 2, 3].map((b) => ({
  b,
  blocks: BL.map((bl, j) => Array.from({ length: 10 }, (_, f) => Array.from({ length: 6 }, (_, r) => {
    const cap = r % 2 ? 2 : 3, pr = [0.75, 0.55, 0.4][b - 1] - 0.12 * j + 0.02 * f, tags = [];
    if (r === 2) tags.push('intl');
    const g = r < 2 ? (j === 0 ? 'F' : 'M') : (rnd() < 0.5 ? 'F' : 'M'), fixed = r < 2 ? g : null;
    let n = 0; for (let k = 0; k < cap; k++) if (rnd() < pr) n++;
    if (r === 5 && (f + b) % 4 === 0) { tags.push('rep'); n = 0; }
    return { num: bl + '-' + ((f + 1) * 100 + r + 1), cap, tags, fixed, ppl: Array.from({ length: n }, () => person(fixed || g, tags.includes('intl'))) };
  }))),
}));
const r1 = B[2].blocks[0][2][0];
r1.ppl = [{ n: 'Ali', g: 'M', c: 'AZ', y: 2, f: 'Computer Science' }, { n: 'Vali', g: 'M', c: 'AZ', y: 2, f: 'Civil Engineering' }, { n: 'Samir', g: 'M', c: 'AZ', y: 1, f: 'Business' }]; r1.fixed = null; r1.tags = [];
const a201 = B[2].blocks[0][1][0];
a201.cap = 3; a201.fixed = null; a201.tags = [];
a201.ppl = [{ n: 'Nigar', g: 'F', c: 'AZ', y: 2, f: 'Architecture' }, { n: 'Alsu', g: 'F', c: 'KZ', y: 3, f: 'Electronics' }];

export const roomAt = (building, num) => {
  for (const blk of B[building - 1]?.blocks || []) for (const fl of blk) for (const rm of fl) if (rm.num === num) return rm;
  return null;
};
// Puts the student in a room after an admin approved it (no rule checks: the admin already decided).
export function placeMe(rm) {
  for (const x of B) for (const blk of x.blocks) for (const fl of blk) for (const r of fl) r.ppl = r.ppl.filter((p) => p.n !== ME);
  rm.ppl.push({ n: ME, g: S.prefs.g, c: S.prefs.c, y: 1, f: 'Computer Science' });
  S.myRoom = rm;
}
export const others = (rm) => rm.ppl.filter((x) => x.n !== ME);
export const roomG = (rm) => { const o = others(rm); return o.length ? o[0].g : rm.fixed; };
export function why(rm) {
  const m = S.prefs, r = [];
  if (rm.tags.includes('rep')) r.push('the room is under repair');
  if (rm.tags.includes('intl') && m.c === 'LT') r.push('it is for international students');
  const g = roomG(rm);
  if (g && g !== m.g && !S.allowMixed.has(rm.num)) r.push(GN[g] + ' live in this room — ' + (m.g === 'F' ? 'girls can only share with girls' : 'boys can only share with boys'));
  return r;
}
export const genderOnly = (rm) => { const g = roomG(rm), m = S.prefs; return g && g !== m.g && !S.allowMixed.has(rm.num) && !rm.tags.includes('rep') && !(rm.tags.includes('intl') && m.c === 'LT'); };
export const cps = (rm) => others(rm).filter((x) => x.c === S.prefs.c).length;
export const openBeds = (rooms) => rooms.reduce((a, rm) => a + (why(rm).length || rm === S.myRoom ? 0 : rm.cap - rm.ppl.length), 0);
export const ord = (n) => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th');

export function recommend() {
  const m = S.prefs; let best = null;
  B.forEach((x, bi) => x.blocks.forEach((blk, ki) => blk.forEach((fl, fi) => fl.forEach((rm) => {
    if (rm === S.myRoom || why(rm).length || rm.cap === rm.ppl.length) return;
    const s = (m.p ? cps(rm) * 10 : 0) + (rm.cap - rm.ppl.length);
    if (!best || s > best.s) best = { s, rm, bi, ki, fi };
  }))));
  return best;
}

export function confirmBed(rm) {
  const m = S.prefs, bad = why(rm);
  if (bad.length || rm.ppl.length >= rm.cap) return { ok: false, msg: bad.join(', ') || 'the room is full' };
  if (S.myRoom) S.myRoom.ppl = S.myRoom.ppl.filter((x) => x.n !== ME);
  const first = !rm.ppl.length;
  rm.ppl.push({ n: ME, g: m.g, c: m.c, y: 1, f: 'Computer Science' });
  S.myRoom = rm; S.view.selB = null;
  return { ok: true, first };
}

export function applyProfile(p) {
  S.user = { ...S.user, name: p.name, langs: p.langs || [], skills: p.skills || [] };
  S.prefs = { ...S.prefs, c: p.c, g: p.g, show: p.show !== false };
  const my = S.myRoom; if (!my) return;
  const meP = my.ppl.find((x) => x.n === ME); if (meP) { meP.g = p.g; meP.c = p.c; }
  const g = roomG(my);
  if (g && g !== p.g) {
    let target = null;
    for (const blk of B[2].blocks) for (const fl of blk) for (const rm of fl) if (!target && rm !== my && !why(rm).length && rm.ppl.length < rm.cap) target = rm;
    if (target) { my.ppl = my.ppl.filter((x) => x.n !== ME); target.ppl.push({ n: ME, g: p.g, c: p.c, y: 1, f: 'Computer Science' }); S.myRoom = target; }
  }
}

// ---------- requests ----------
export function addTicket(t) { S.ticketNo++; const x = { no: S.ticketNo, date: 'today', ...t }; S.tickets.unshift(x); return x; }
export function finalize(t) {
  if (t.type === 'mixed') { S.allowMixed.add(t.to); t.note = t.to + ' is now open for you. Send a separate move request to move in.'; }
  else if (t.type === 'guest') { t.code = 'Q-' + Math.floor(1000 + Math.random() * 9000); t.note = 'Show this code at the front desk: ' + t.code + '.'; }
}

// ---------- laundry ----------
export const L = {
  now: new Date().getHours() * 60 + new Date().getMinutes(),
  M: [
    { id: 'Washer 1', code: 'W1', k: 'w', s: 'free', seen: 2 },
    { id: 'Washer 2', code: 'W2', k: 'w', s: 'busy', who: 'Leyla', tot: 60, left: 6, seen: 0 },
    { id: 'Dryer 1', code: 'D1', k: 'd', s: 'free', seen: 3 },
    { id: 'Dryer 2', code: 'D2', k: 'd', s: 'free', seen: 38 },
  ],
};
export const hm = (x) => String(Math.floor(x / 60) % 24).padStart(2, '0') + ':' + String(x % 60).padStart(2, '0');
export function laundryTick() {
  L.now++;
  L.M.forEach((x) => {
    x.seen++; if (x.real) x.real--;
    if (x.s === 'busy' || x.s === 'mine') {
      x.left--;
      if (x.left <= 0) {
        if (x.s === 'mine') { x.s = 'free'; x.seen = 0; toast('🔔 Your ' + x.id + ' is done. Pick up your clothes.'); }
        else { x.s = 'done'; x.wait = 0; if (x.notify) toast('🔔 ' + x.id + ' is done, but the clothes are still inside.'); }
      }
    } else if (x.s === 'done') {
      x.wait++;
      if (x.wait >= 5) { x.s = 'free'; x.seen = 0; x.ai = false; if (x.notify) { toast('🔔 ' + x.id + ' is free. You can go now.'); x.notify = false; } }
    }
  });
  refresh();
}

// ---------- team & chat ----------
export const posts = [
  { t: 'hack', title: 'VILNIUS TECH AI Hackathon', date: '15–16 November', who: 'Murad', c: 'TR', room: '3 · B-504', have: ['Backend', 'Python', 'ML / AI'], need: ['Frontend', 'Design'], slots: '2/4', near: true },
  { t: 'olymp', title: 'Maths Olympiad', date: '2 December', who: 'Rūta', c: 'LT', room: '1 · A-702', have: ['Maths'], need: ['Maths'], slots: '1/3', near: false },
  { t: 'course', title: 'Software Engineering course project', date: 'End of semester', who: 'Nigar', c: 'AZ', room: '3 · A-202', have: ['Backend', 'Documentation'], need: ['Frontend'], slots: '2/4', near: true },
  { t: 'hack', title: 'Junction Baltic', date: 'January', who: 'Lukas', c: 'LT', room: '2 · B-210', have: ['Business', 'Pitch'], need: ['Mobile', 'Backend', 'Design'], slots: '1/4', near: false },
];
export const chat = {
  cur: 'room',
  threads: [
    { id: 'room', name: 'Room A-201 chat', sub: 'Nigar, Alsu and you', kind: 'room', unread: 1, msgs: [
      { from: 'Nigar', t: "Who's cleaning the kitchen tonight?", tm: '17:40' }, { from: 'Alsu', t: "I'll do it, tomorrow it's your turn 🙂", tm: '17:42' }] },
    { id: 'floor', name: 'Block A · 2nd floor', sub: '28 residents', kind: 'floor', unread: 2, msgs: [
      { from: 'Rūta', t: 'Ar kas nors turi lygintuvą? Grąžinsiu po valandos.', tm: '16:05', lang: 'LT', tr: "Does anyone have an iron? I'll give it back in an hour." },
      { from: 'Emma', t: 'Mine is in room A-205, come take it!', tm: '16:09' }] },
    { id: 'bld', name: 'Building 3 · announcements', sub: 'Only the administrator can post', kind: 'news', unread: 1, readonly: true, msgs: [
      { from: 'Administrator', t: 'Lapkričio 5 d. nuo 10 iki 14 val. nebus karšto vandens. Atsiprašome už nepatogumus.', tm: '09:00', lang: 'LT', tr: 'On 5 November there will be no hot water from 10:00 to 14:00. Sorry for the inconvenience.' }] },
    { id: 'murad', name: 'Murad', sub: 'B-504 · hackathon team', kind: 'dm', unread: 0, msgs: [
      { from: 'Murad', t: "Hi! Did you see my post? We're looking for a frontend dev.", tm: '15:20' }] },
  ],
};
export const unreadTotal = () => chat.threads.reduce((a, t) => a + t.unread, 0);
export const clock = () => { const d = new Date(); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
export function openThread(id) { chat.cur = id; const t = chat.threads.find((x) => x.id === id); if (t) t.unread = 0; refresh(); }
export function startDm(name, topic) {
  let t = chat.threads.find((x) => x.kind === 'dm' && x.name === name);
  if (!t) { t = { id: 'dm-' + name, name, sub: topic, kind: 'dm', unread: 0, msgs: [] }; chat.threads.push(t); }
  t.draft = 'Hi! I saw your "' + topic + "\" post and I'd like to join the team.";
  chat.cur = t.id; t.unread = 0; go('chat');
}
