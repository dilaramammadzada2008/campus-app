// Generated files: the dormitory application form (PDF) and laundry QR stickers.
import { jsPDF } from 'jspdf';
import qrcode from 'qrcode-generator';
import { S } from './store.js';

export async function saveFile(name, blob) {
  try {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    return 'saved';
  } catch { return 'error'; }
}

const font = (s, w, it) => (it ? 'italic ' : '') + (w || 400) + ' ' + s + 'px "Noto Sans", Arial, sans-serif';

function canvasToPdf(c, type) {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  pdf.addImage(type === 'png' ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.92), type === 'png' ? 'PNG' : 'JPEG', 0, 0, 210, 297);
  return pdf.output('blob');
}

// ---------- application form ----------
export const FORM_TXT = {
  lt: { sample: 'PAVYZDYS — Campus Life demonstracinė forma, ne oficialus VILNIUS TECH dokumentas', title: 'PRAŠYMAS DĖL APGYVENDINIMO BENDRABUTYJE', no: 'Prašymo Nr.', date: 'Data',
    rows: ['Studento el. paštas', 'Pilietybė', 'Lytis', 'Bendrabutis', 'Blokas', 'Aukštas', 'Kambarys', 'Vieta kambaryje'], female: 'Moteris', male: 'Vyras', beds: (n) => n + ' vietų',
    body: 'Prašau apgyvendinti mane aukščiau nurodytoje vietoje. Patvirtinu, kad esu susipažinęs (-usi) su VILNIUS TECH bendrabučių vidaus tvarkos taisyklėmis ir priešgaisrinės saugos reikalavimais (11 p.) ir įsipareigoju jų laikytis.',
    name: 'Vardas, pavardė:', sign: 'Parašas:', recv: 'Paslaugos gavėjas:', prov: 'Paslaugos teikėjas:', cap: ['(vardas, pavardė, parašas)'],
    foot: 'Pasirašytą prašymą nufotografuokite arba nuskenuokite ir įkelkite į Campus Life.', file: 'Prasymas' },
  en: { sample: 'SAMPLE — Campus Life demo form, not an official VILNIUS TECH document', title: 'APPLICATION FOR DORMITORY ACCOMMODATION', no: 'Application No.', date: 'Date',
    rows: ['Student e-mail', 'Citizenship', 'Gender', 'Dormitory', 'Block', 'Floor', 'Room', 'Bed'], female: 'Female', male: 'Male', beds: (n) => n + '-bed',
    body: 'I ask to be accommodated in the place stated above. I confirm that I have read the VILNIUS TECH Dormitory Internal Rules and the fire safety requirements (point 11) and undertake to follow them.',
    name: 'Name, surname:', sign: 'Signature:', recv: 'Service recipient:', prov: 'Service provider:', cap: ['(name, surname, signature)'],
    foot: 'Photograph or scan the signed form and upload it in Campus Life.', file: 'Application' },
};
const CEN = { AZ: 'Azerbaijan', TR: 'Türkiye', LT: 'Lithuania', UA: 'Ukraine', GE: 'Georgia', KZ: 'Kazakhstan', DE: 'Germany', ES: 'Spain', IN: 'India' };
const CLT = { AZ: 'Azerbaidžanas', TR: 'Turkija', LT: 'Lietuva', UA: 'Ukraina', GE: 'Gruzija', KZ: 'Kazachstanas', DE: 'Vokietija', ES: 'Ispanija', IN: 'Indija' };

function wrapText(x, t, x0, y, maxW, lh) {
  const words = t.split(' '); let line = '';
  for (const w of words) { const test = line ? line + ' ' + w : w; if (x.measureText(test).width > maxW && line) { x.fillText(line, x0, y); y += lh; line = w; } else line = test; }
  if (line) { x.fillText(line, x0, y); y += lh; }
  return y;
}

export function formCanvas(r, lang) {
  const T = FORM_TXT[lang || 'lt'], W = 1240, H = 1754, L = 120, R = W - 120;
  const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
  x.fillStyle = '#8a5a00'; x.font = font(17); x.fillText(T.sample, L, 70);
  x.fillStyle = '#111'; x.font = font(34, 700); x.fillText(T.title, L, 160);
  x.font = font(20); x.fillText(T.no + ': ' + r.no, L, 230); x.textAlign = 'right'; x.fillText(T.date + ': ' + r.date, R, 230); x.textAlign = 'left';
  x.strokeStyle = '#111'; x.lineWidth = 2; x.beginPath(); x.moveTo(L, 252); x.lineTo(R, 252); x.stroke();
  const vals = [S.user.mail, (lang === 'en' ? CEN : CLT)[S.prefs.c], S.prefs.g === 'F' ? T.female : T.male, 'Nr. ' + r.bld, r.blk, String(r.floor), r.room.num + '  (' + T.beds(r.room.cap) + ')', String(r.bed)];
  let y = 320;
  T.rows.forEach((lab, i) => {
    x.font = font(22, 600); x.fillStyle = '#111'; x.fillText(lab, L, y);
    x.font = font(22, 500); x.fillText(vals[i], 560, y); x.strokeStyle = '#bbb'; x.lineWidth = 1; x.beginPath(); x.moveTo(550, y + 10); x.lineTo(R, y + 10); x.stroke(); y += 58;
  });
  y += 30; x.font = font(22); x.fillStyle = '#111'; y = wrapText(x, T.body, L, y, R - L, 34);
  y += 80;
  const hl = (label, yy) => { x.font = font(22, 600); x.fillStyle = '#111'; x.fillText(label, L, yy); x.strokeStyle = '#111'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(L + 300, yy + 6); x.lineTo(R, yy + 6); x.stroke(); };
  hl(T.name, y); y += 84; hl(T.sign, y); y += 120;
  const colW = (R - L - 80) / 2, c2 = L + colW + 80;
  x.font = font(24, 700); x.fillStyle = '#111'; x.fillText(T.recv, L, y); x.fillText(T.prov, c2, y); y += 110;
  x.lineWidth = 1.5; x.beginPath(); x.moveTo(L, y); x.lineTo(L + colW, y); x.moveTo(c2, y); x.lineTo(c2 + colW, y); x.stroke(); y += 36;
  x.font = font(20, 400, true); x.fillStyle = '#333'; T.cap.forEach((t, i) => { x.fillText(t, L, y + i * 28); x.fillText(t, c2, y + i * 28); });
  x.font = font(18); x.fillStyle = '#666'; x.fillText(T.foot + '  ·  ' + r.no, L, H - 100);
  return c;
}

export async function downloadForm(reg, lang) {
  if (document.fonts?.ready) await document.fonts.ready;
  const blob = canvasToPdf(formCanvas(reg, lang), 'jpeg');
  const name = FORM_TXT[lang].file + '_' + reg.no + '_' + lang.toUpperCase() + '.pdf';
  return { name, result: await saveFile(name, blob) };
}

// ---------- laundry QR stickers ----------
export const qrPayload = (x) => 'CAMPUSLIFE:LAUNDRY:B3:' + x.code;
export function qrUrl(x, cell) { const q = qrcode(0, 'M'); q.addData(qrPayload(x)); q.make(); return q.createDataURL(cell || 6, 2); }

export async function downloadStickers(machines) {
  if (document.fonts?.ready) await document.fonts.ready;
  const W = 1240, H = 1754, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#8a5a00'; g.font = font(17); g.fillText('Campus Life · demo stickers', 90, 60);
  const imgs = await Promise.all(machines.map((x) => new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.src = qrUrl(x, 10); })));
  machines.forEach((x, i) => {
    const cx = 90 + (i % 2) * 560, cy = 100 + Math.floor(i / 2) * 800, w = 500, h = 760;
    g.strokeStyle = '#111'; g.lineWidth = 3; g.setLineDash([14, 10]); g.strokeRect(cx, cy, w, h); g.setLineDash([]);
    g.fillStyle = '#0f1a33'; g.fillRect(cx, cy, w, 110); g.fillStyle = '#ffcf6e'; g.font = font(30, 700); g.fillText('Campus Life · Laundry', cx + 28, cy + 68);
    g.fillStyle = '#111'; g.font = font(44, 700); g.fillText(x.id, cx + 28, cy + 180); g.font = font(22); g.fillStyle = '#444'; g.fillText('Building 3 · basement · ' + x.code, cx + 28, cy + 218);
    g.imageSmoothingEnabled = false; g.drawImage(imgs[i], cx + 80, cy + 250, 340, 340);
    g.fillStyle = '#111'; g.font = font(22, 600);
    ['EN  Scan before you start', 'LT  Nuskenuok prieš paleisdamas'].forEach((t, j) => g.fillText(t, cx + 28, cy + 640 + j * 36));
  });
  return saveFile('Laundry_QR_stickers.pdf', canvasToPdf(c, 'png'));
}
