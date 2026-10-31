import { useState } from 'react';
import { api } from '../api.js';
import { syncRooms } from '../roomSync.js';
import { S, addTicket, finalize, refresh, toast } from '../store.js';

const CATS = [['plumb', 'Plumbing', 'santechnikos gedimas'], ['elec', 'Electrical', 'elektros gedimas'], ['furn', 'Furniture', 'sugadinti baldai'], ['heat', 'Heating', 'neveikia šildymas'], ['wifi', 'Wi-Fi', 'neveikia internetas'], ['clean', 'Cleaning', 'bendrų patalpų švara'], ['noise', 'Noise', 'triukšmas naktį'], ['other', 'Other', 'kita problema']];
const PLACES_LT = { room: 'kambaryje', kitchen: 'bendroje virtuvėje', bath: 'vonios kambaryje', hall: 'koridoriuje', laundry: 'skalbykloje' };
const STAGES = ['Sent', 'In review', 'Resolved'];
const RSTAGES = { reg: ['Application downloaded', 'Signed and sent', 'Registration confirmed'], mixed: ['Sent', "Roommates' consent", 'Student Representation decision'], guest: ['Sent', 'Administration reviewing', 'Approved'], guestDay: ['Registered'] };
const HOURS = Array.from({ length: 16 }, (_, i) => i + 7); // 07..22
const hh = (h) => String(h).padStart(2, '0') + ':00';

function places() {
  return [['room', S.myRoom ? 'My room (' + S.myRoom.num + ')' : 'My room (not registered yet)'], ['kitchen', 'Kitchen'], ['bath', 'Bathroom / shower'], ['hall', 'Corridor'], ['laundry', 'Laundry room']];
}

function ComplaintForm({ onClose }) {
  const [cat, setCat] = useState(null);
  const [place, setPlace] = useState('room');
  const [urg, setUrg] = useState('n');
  const [desc, setDesc] = useState('');
  const [photo, setPhoto] = useState(null);
  const [ai, setAi] = useState(null);
  const [err, setErr] = useState({});
  const placeLabel = places().find((p) => p[0] === place)[1];

  function ltText() {
    const c = CATS.find((x) => x[0] === cat), rn = S.myRoom ? S.myRoom.num : '—';
    const where = place === 'room' ? rn + ' ' + PLACES_LT.room : '3 bendrabučio ' + PLACES_LT[place];
    return {
      lt: 'Laba diena,\n\npranešu apie problemą: ' + (c ? c[2] : 'problema') + ' (' + where + ').' + (urg === 'u' ? ' Prašau sutvarkyti skubiai.' : '') + '\nAprašymas: „' + (desc.trim() || '—') + '“\n\nAčiū,\n' + S.user.name + ', ' + rn,
      en: "In English: Hello, I'm reporting a problem: " + (c ? c[1].toLowerCase() : 'problem') + ' (' + placeLabel + ').' + (urg === 'u' ? ' Please fix it urgently.' : '') + ' Your description is added in your own words — in the real app AI translates it into Lithuanian too.',
    };
  }
  function onPhoto(e) { const f = e.target.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => setPhoto(rd.result); rd.readAsDataURL(f); }
  function submit(e) {
    e.preventDefault(); const er = {};
    if (!cat) er.cat = 'Choose the type of problem.';
    if (!desc.trim()) er.desc = 'Describe the problem in a sentence or two.';
    setErr(er); if (Object.keys(er).length) return;
    const t = addTicket({ cat, place: placeLabel, desc: desc.trim(), urg: urg === 'u', stage: 1, photo, lt: ltText().lt });
    onClose(); refresh(); toast('Request #' + t.no + ' sent to the administrator');
  }

  return (
    <form className="card stack" style={{ borderColor: 'var(--brand)' }} noValidate onSubmit={submit}>
      <div className="row" style={{ justifyContent: 'space-between' }}><h3 style={{ fontSize: 17 }}>Message to the administrator</h3><button className="small" type="button" onClick={onClose}>Close</button></div>
      <div><span className="lbl">What's the problem?</span>
        <div className="row">{CATS.map(([k, v]) => <button type="button" key={k} className={'opt' + (cat === k ? ' on' : '')} onClick={() => { setCat(k); setErr({ ...err, cat: null }); }}>{v}</button>)}</div>
        {err.cat && <div className="err">{err.cat}</div>}
      </div>
      <div className="grid2">
        <div><label className="lbl" htmlFor="repPlace">Where?</label><select id="repPlace" value={place} onChange={(e) => setPlace(e.target.value)}>{places().map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        <div><label className="lbl" htmlFor="repUrg">Urgency</label><select id="repUrg" value={urg} onChange={(e) => setUrg(e.target.value)}><option value="n">Normal</option><option value="u">Urgent (water leak, no power)</option></select></div>
      </div>
      <div><label className="lbl" htmlFor="repDesc">Description</label><textarea id="repDesc" rows={3} value={desc} onChange={(e) => { setDesc(e.target.value); setErr({ ...err, desc: null }); }} placeholder="The bathroom tap has been dripping for two days" />{err.desc && <div className="err">{err.desc}</div>}</div>
      <div className="row"><label className="lbl" htmlFor="repPhoto" style={{ margin: 0 }}>Photo (optional)</label><input type="file" id="repPhoto" accept="image/*" onChange={onPhoto} />{photo && <img className="thumb" alt="Uploaded photo" src={photo} />}</div>
      <div className="ai stack">
        <div className="row" style={{ justifyContent: 'space-between' }}><b>✦ Formal Lithuanian text for the administrator</b>
          <button className="small" type="button" onClick={() => { if (!cat) return setErr({ ...err, cat: 'Choose the type of problem first.' }); setAi(ltText()); }}>Write with AI</button></div>
        {ai && <><div className="lt">{ai.lt}</div><div className="faint">{ai.en}</div></>}
      </div>
      <div className="row"><button className="primary" type="submit">Send</button></div>
    </form>
  );
}

function GuestForm({ onClose }) {
  const [g, setG] = useState({ name: '', date: 'Today', from: 18, to: 21, night: false, guar: false });
  const [err, setErr] = useState({});
  const upd = (patch) => { setG({ ...g, ...patch }); setErr({}); };
  function submit(e) {
    e.preventDefault(); const er = {}, n = g.name.trim();
    if (n.length < 3) er.name = "Enter the guest's name and surname.";
    if (!g.night && g.to <= g.from) er.time = 'The leaving time must be after the arrival time.';
    if (!g.guar) er.guar = 'The rules require you to vouch for your guest (§16).';
    setErr(er); if (Object.keys(er).length) return;
    const when = g.date + ' · ' + hh(g.from) + (g.night ? ' → morning' : '–' + hh(g.to));
    const t = addTicket({ type: 'guest', guest: n, when, night: g.night, stage: 1 });
    if (!g.night) { t.done = true; finalize(t); }
    onClose(); refresh();
    toast(g.night ? 'Overnight guest request #' + t.no + ' sent to the administration' : 'Guest registered · code ' + t.code);
  }
  return (
    <form className="card stack" style={{ borderColor: 'var(--brand)' }} noValidate onSubmit={submit}>
      <div className="row" style={{ justifyContent: 'space-between' }}><h3 style={{ fontSize: 17 }}>Guest request</h3><button className="small" type="button" onClick={onClose}>Close</button></div>
      <p className="faint" style={{ margin: 0 }}>Guests are allowed 07:00–22:00 and must register at the front desk. Overnight stays need the administration's approval (point 16). This request goes online instead of on paper.</p>
      <div className="grid2">
        <div><label className="lbl" htmlFor="gName">Guest's name and surname</label><input type="text" id="gName" autoFocus placeholder="Aysel Mammadova" value={g.name} onChange={(e) => upd({ name: e.target.value })} />{err.name && <div className="err">{err.name}</div>}</div>
        <div><label className="lbl" htmlFor="gDate">Date</label><select id="gDate" value={g.date} onChange={(e) => upd({ date: e.target.value })}><option>Today</option><option>Tomorrow</option><option>Day after tomorrow</option></select></div>
      </div>
      <div className="grid2">
        <div><label className="lbl" htmlFor="gFrom">Arrives</label><select id="gFrom" value={g.from} onChange={(e) => upd({ from: +e.target.value })}>{HOURS.filter((h) => h < 22).map((h) => <option key={h} value={h}>{hh(h)}</option>)}</select></div>
        <div><label className="lbl" htmlFor="gTo">Leaves</label><select id="gTo" value={g.to} disabled={g.night} onChange={(e) => upd({ to: +e.target.value })}>{HOURS.filter((h) => h > 7).map((h) => <option key={h} value={h}>{hh(h)}</option>)}</select>{err.time && <div className="err">{err.time}</div>}</div>
      </div>
      <label className="switch"><input type="checkbox" checked={g.night} onChange={(e) => upd({ night: e.target.checked })} /><span>Guest stays overnight (22:00–07:00)<br /><span className="faint">The administration must approve.</span></span></label>
      <label className="switch"><input type="checkbox" checked={g.guar} onChange={(e) => upd({ guar: e.target.checked })} /><span>I guarantee that my guest will follow the dormitory rules</span></label>
      {err.guar && <div className="err">{err.guar}</div>}
      <div className="row"><button className="primary" type="submit">Send</button></div>
    </form>
  );
}

function RequestCard({ t }) {
  const st = t.type === 'guest' && !t.night ? RSTAGES.guestDay : RSTAGES[t.type];
  const title = { reg: 'Room registration · ' + t.to, mixed: 'Shared room application · ' + t.to, guest: 'Guest · ' + t.guest }[t.type];
  const rule = { reg: '§8–11', mixed: '§14', guest: '§16' }[t.type];
  const who = { reg: 'Administrator', mixed: 'Student Representation', guest: t.night ? 'Administration' : 'Front desk' }[t.type];
  const info = t.type === 'reg' ? 'Application ' + t.appNo + ' · signed file: ' + t.file : t.type === 'mixed' ? 'Consent requested from: ' + t.consents.join(', ') : t.when + (t.night ? ' · overnight' : '');
  const next = () => { t.stage++; if (t.stage >= st.length) { t.done = true; finalize(t); toast('#' + t.no + ' completed'); } refresh(); };
  const reject = () => { t.rejected = true; t.note = { mixed: 'Student Representation: one of the roommates did not consent.', guest: 'Administration: overnight guests are not accepted on this date.' }[t.type]; refresh(); };
  return (
    <div className="card stack" style={{ gap: 8 }}>
      <div className="row" style={{ justifyContent: 'space-between' }}><b>#{t.no} · {title}</b><span className="faint">{t.date}</span></div>
      <div className="row" style={{ gap: 4 }}><span className="chip">{rule}</span><span className="chip">{who}</span>{t.rejected ? <span className="chip c-bad">Rejected</span> : t.done && <span className="chip c-good">Completed</span>}</div>
      <div style={{ fontSize: 14 }}>{info}</div>
      <div className="steps">{st.map((s, i) => { const ok = (i + 1 < t.stage || t.done) && !t.rejected; return <span key={s} className={'step ' + (t.rejected ? '' : ok ? 'done' : i + 1 === t.stage ? 'cur' : '')}>{ok ? '✓ ' : ''}{s}</span>; })}</div>
      {t.note && <div className="lt">{t.note}</div>}
      {!t.done && !t.rejected && <div className="row"><button className="small" onClick={next}>Demo: next step</button><button className="small" onClick={reject}>Demo: reject</button></div>}
    </div>
  );
}

export const STATUS = {
  pending: ['c-warn', '⏳ Pending'], approved: ['c-good', '✓ Approved'], rejected: ['c-bad', '✕ Rejected'], cancelled: ['', 'Cancelled'],
};
const when = (iso) => iso ? new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';

// Opens an uploaded form in a new tab (the file endpoint needs the session header, so fetch it first).
export async function openFile(id) {
  const w = window.open('', '_blank');
  const r = await fetch('/api/room-requests/' + id + '/file', { headers: { Authorization: 'Bearer ' + (localStorage.getItem('cl-token') || '') } });
  if (!r.ok) { w?.close(); return toast("Couldn't open the file."); }
  const url = URL.createObjectURL(await r.blob());
  if (w) w.location = url; else window.open(url, '_blank');
}

function RoomRequestCard({ r }) {
  const [cls, label] = STATUS[r.status];
  const steps = ['Sent', 'Administrator review', r.status === 'rejected' ? 'Rejected' : 'Approved'];
  const stage = r.status === 'pending' ? 2 : 3;
  async function cancel() {
    const res = await api('room-requests/' + r.id + '/cancel', {});
    if (!res.ok) return toast(res.data.error || "Couldn't cancel.");
    await syncRooms(true); toast('Request cancelled');
  }
  return (
    <div className="card stack" style={{ gap: 8, borderColor: r.status === 'approved' ? 'rgba(52,211,153,.5)' : r.status === 'pending' ? 'rgba(251,191,36,.45)' : undefined }}>
      <div className="row" style={{ justifyContent: 'space-between' }}><b>Room registration · Building {r.building}, {r.room}, bed {r.bed}</b><span className="faint">{when(r.createdAt)}</span></div>
      <div className="row" style={{ gap: 4 }}><span className="chip">§8–11</span><span className="chip">Administrator</span><span className={'chip ' + cls}>{label}</span></div>
      <div style={{ fontSize: 14 }}>Application {r.appNo} · signed file: <button className="ghost" onClick={() => openFile(r.id)}>{r.fileName}</button></div>
      {r.status !== 'cancelled' && <div className="steps">{steps.map((s, i) => <span key={s} className={'step ' + (i + 1 < stage || (stage === 3 && r.status === 'approved') ? 'done' : i + 1 === stage ? 'cur' : '')}>{i + 1 < stage || (stage === 3 && r.status === 'approved') ? '✓ ' : ''}{s}</span>)}</div>}
      {r.status === 'pending' && <div className="faint">The administrator is checking your signed form. You'll get a notification when it's decided.</div>}
      {r.status === 'approved' && <div className="lt">Approved {when(r.decidedAt)}. Room {r.room} is yours — pick up your key card at reception.{r.note ? '\nNote: ' + r.note : ''}</div>}
      {r.status === 'rejected' && <div className="lt">Reason: {r.note}{'\n'}You can pick another bed in Rooms.</div>}
      {r.status === 'pending' && <div className="row"><button className="small" onClick={cancel}>Cancel request</button></div>}
    </div>
  );
}

function ComplaintCard({ t }) {
  const cat = CATS.find((c) => c[0] === t.cat);
  function reply() {
    if (t.stage === 1) { t.stage = 2; t.reply = 'Gavome. Rytoj 10 val. atvyks meistras.'; t.replyEn = 'Received. A technician will come tomorrow at 10:00.'; }
    else { t.stage = 3; t.reply = 'Problema išspręsta. Ačiū, kad pranešėte.'; t.replyEn = 'The problem is fixed. Thank you for letting us know.'; }
    refresh(); toast('The administrator replied to request #' + t.no);
  }
  return (
    <div className="card stack" style={{ gap: 8 }}>
      <div className="row" style={{ justifyContent: 'space-between' }}><b>#{t.no} · {cat[1]}</b><span className="faint">{t.date}</span></div>
      <div className="row" style={{ gap: 4 }}><span className="chip">{t.place}</span>{t.urg && <span className="chip c-bad">Urgent</span>}</div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>{t.photo && <img className="thumb" alt="Request photo" src={t.photo} />}<div style={{ fontSize: 14, minWidth: 0 }}>{t.desc}</div></div>
      <div className="steps">{STAGES.map((s, i) => <span key={s} className={'step ' + (i + 1 < t.stage ? 'done' : i + 1 === t.stage ? (t.stage === 3 ? 'done' : 'cur') : '')}>{i + 1 <= t.stage ? '✓ ' : ''}{s}</span>)}</div>
      {t.reply && <div className="lt"><b>Administrator:</b> {t.reply}<br /><span className="muted">✦ {t.replyEn}</span></div>}
      {t.stage < 3 && <button className="small" style={{ alignSelf: 'flex-start' }} onClick={reply}>Demo: administrator replies</button>}
    </div>
  );
}

export default function Requests() {
  const [open, setOpen] = useState(null); // 'complaint' | 'guest' | null
  return (
    <section className="stack">
      <div className="card row" style={{ justifyContent: 'space-between' }}>
        <div className="row"><span className="av">RK</span><div><b>Building 3 administrator</b><div className="faint">Demo contact · office hours 08:00–17:00 · reception for emergencies</div></div></div>
        <div className="row">{open !== 'complaint' && <button className="primary" onClick={() => setOpen('complaint')}>+ Complaint</button>}<button onClick={() => setOpen('guest')}>+ Guest request</button></div>
      </div>
      {open === 'guest' && <GuestForm onClose={() => setOpen(null)} />}
      {open === 'complaint' && <ComplaintForm onClose={() => setOpen(null)} />}
      <h3 style={{ fontSize: 16 }}>My requests</h3>
      <div className="stack">
        {S.roomReqs.map((r) => <RoomRequestCard key={r.id} r={r} />)}
        {S.tickets.map((t) => (t.type ? <RequestCard key={t.no} t={t} /> : <ComplaintCard key={t.no} t={t} />))}
      </div>
    </section>
  );
}
