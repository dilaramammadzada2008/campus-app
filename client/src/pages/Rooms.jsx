import { useState } from 'react';
import { Icon } from '../icons.jsx';
import { downloadForm, formCanvas } from '../files.js';
import { api } from '../api.js';
import { B, BL, C, GN, ME, S, addTicket, cps, genderOnly, openBeds, ord, others, recommend, refresh, roomG, toast, why } from '../store.js';

const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

function PersonCard({ p, rm }) {
  const isMe = p.n === ME, name = isMe ? 'You (' + S.user.name + ')' : p.n;
  return (
    <div className="row">
      <span className="av">{isMe ? S.user.name[0] : p.n[0]}</span>
      <div><b>{name} · {rm.num}</b><div className="muted" style={{ fontSize: 13 }}>{C[p.c]} · {p.g === 'F' ? 'female' : 'male'} · {ord(p.y)} year · {p.f}</div></div>
    </div>
  );
}

function Sel({ label, on, onClick }) {
  return <button className={'sb' + (on ? ' on' : '')} onClick={onClick}>{label[0]}<small>{label[1]}</small></button>;
}

function RegBox({ setInfo }) {
  const reg = S.reg;
  const [lang, setLang] = useState(S.prefs.c === 'LT' ? 'lt' : 'en');
  const [preview, setPreview] = useState(null);
  const [err, setErr] = useState({});
  const [filePrev, setFilePrev] = useState(null);
  const [agree, setAgree] = useState(false);
  const [sending, setSending] = useState(false);
  if (!reg) return null;

  const done = [reg.downloaded, reg.downloaded, Boolean(reg.file), false], cur = done.indexOf(false);
  const cls = (i) => 'rs' + (done[i] ? ' done' : i === cur ? ' cur' : '');

  async function download() {
    setErr({ ...err, dl: null });
    const { name, result } = await downloadForm(reg, lang);
    if (result === 'saved') { reg.downloaded = true; refresh(); toast('Form downloaded: ' + name); }
    else { setErr({ ...err, dl: "Couldn't download the file. Open the form with \"Preview\" and print a screenshot." }); reg.downloaded = true; refresh(); }
  }
  function onFile(e) {
    const f = e.target.files[0]; setErr({ ...err, file: null }); setFilePrev(null);
    if (!f) { reg.file = null; refresh(); return; }
    if (!/^image\//.test(f.type) && f.type !== 'application/pdf') { setErr({ ...err, file: 'Upload an image (JPG, PNG) or a PDF only.' }); e.target.value = ''; reg.file = null; refresh(); return; }
    if (f.size > 15 * 1024 * 1024) { setErr({ ...err, file: 'The file is larger than 15 MB. Take a smaller photo.' }); e.target.value = ''; reg.file = null; refresh(); return; }
    reg.file = f; refresh();
    if (/^image\//.test(f.type)) { const rd = new FileReader(); rd.onload = () => setFilePrev({ src: rd.result, name: f.name }); rd.readAsDataURL(f); }
    else setFilePrev({ name: f.name });
  }
  async function send() {
    if (sending) return;
    const e = {};
    if (!reg.downloaded) e.dl = 'Download the form first.';
    if (!reg.file) e.file = 'Upload a photo or PDF of the signed form.';
    if (!agree) e.agree = 'Confirm that you signed the application yourself.';
    setErr(e); if (Object.keys(e).length) return;
    const rm = reg.room;
    if (why(rm).length || rm.ppl.length >= rm.cap) return setErr({ agree: 'This place is already taken. Pick another one.' });
    setSending(true);
    const fileData = await new Promise((res) => { const rd = new FileReader(); rd.onload = () => res(rd.result); rd.readAsDataURL(reg.file); });
    const r = await api('room-requests', { building: reg.bld, room: rm.num, bed: reg.bed, floor: reg.floor, appNo: reg.no, fileName: reg.file.name, fileData });
    setSending(false);
    if (!r.ok) return setErr({ agree: r.data.error || "Couldn't send the request. Try again." });
    S.reg = null; S.roomReq = r.data; S.roomReqs = [r.data, ...S.roomReqs]; refresh();
    setInfo(<><b style={{ color: 'var(--warn)' }}>⏳ Request sent — pending approval.</b> The administrator will check your signed form. You'll see the result here and in Requests.</>);
    toast('Request sent to the administrator · pending');
  }
  function cancel() { S.reg = null; refresh(); setInfo('Application cancelled. The place is no longer held.'); }

  return (
    <div className="card stack" style={{ borderColor: 'var(--brand)' }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div><h3 style={{ fontSize: 17 }}>Registration application</h3><div className="faint">{reg.no} · Building {reg.bld} · Block {reg.blk} · {reg.room.num} · bed {reg.bed}</div></div>
        <button className="small" onClick={cancel}>Cancel</button>
      </div>
      <div className="regsteps">
        <div className={cls(0)}><span className="n">1</span><div className="b"><b>Download the application form</b><div className="faint">Choose the language: Lithuanian or English. Your details are already filled in. PDF.</div>
          <div className="row" style={{ marginTop: 8 }}>
            <label className="lbl" htmlFor="regLang" style={{ margin: 0 }}>Language</label>
            <select id="regLang" style={{ width: 'auto' }} value={lang} onChange={(e) => { setLang(e.target.value); if (preview) setPreview(formCanvas(reg, e.target.value).toDataURL('image/png')); }}>
              <option value="lt">Lietuvių (LT)</option><option value="en">English (EN)</option>
            </select>
            <button className="primary small" onClick={download}>Download form (PDF)</button>
            <button className="small" onClick={() => setPreview(preview ? null : formCanvas(reg, lang).toDataURL('image/png'))}>Preview</button>
          </div>
          {err.dl && <div className="err">{err.dl}</div>}
          {preview && <img src={preview} alt="Application form preview" style={{ marginTop: 10, width: '100%', maxWidth: 420, border: '1px solid var(--line)', borderRadius: 8, background: '#fff' }} />}
        </div></div>
        <div className={cls(1)}><span className="n">2</span><div className="b"><b>Print it, write your name and sign</b><div className="faint">Write your name and surname in the "Service recipient" box and sign. The administrator fills in "Service provider".</div></div></div>
        <div className={cls(2)}><span className="n">3</span><div className="b"><b>Scan or photograph it and upload</b><div className="faint">Image (JPG, PNG) or PDF. The whole page and your signature must be clearly visible.</div>
          <div className="row" style={{ marginTop: 8 }}><input type="file" accept="image/*,application/pdf" onChange={onFile} /></div>
          {err.file && <div className="err">{err.file}</div>}
          {filePrev && <div className="row" style={{ marginTop: 8 }}>{filePrev.src ? <img className="thumb" alt="Photo of the signed application" src={filePrev.src} /> : <span className="chip">PDF</span>}<span className="faint">{filePrev.name}</span></div>}
        </div></div>
        <div className={cls(3)}><span className="n">4</span><div className="b"><b>Send to the administrator</b><div className="faint">Your request stays pending until the administrator checks the signed form and approves it.</div>
          <label className="switch" style={{ marginTop: 8 }}><input type="checkbox" checked={agree} onChange={(e) => { setAgree(e.target.checked); setErr({ ...err, agree: null }); }} /><span>I signed the application myself. I have read the dormitory internal rules and fire safety requirements (§11).</span></label>
          {err.agree && <div className="err">{err.agree}</div>}
          <div className="row" style={{ marginTop: 8 }}><button className="primary" onClick={send} disabled={sending}>{sending ? 'Sending…' : 'Send for approval'}</button></div>
        </div></div>
      </div>
    </div>
  );
}

export default function Rooms() {
  const [info, setInfo] = useState('Pick a free (green) bed. Click a taken bed to see who lives there.');
  const v = S.view, m = S.prefs, myRoom = S.myRoom, reg = S.reg;
  const set = (patch) => { Object.assign(v, { selB: null }, patch); refresh(); };
  const best = recommend();
  const blk = B[v.cb].blocks[v.ck];
  const rooms = blk[v.cf];

  function startReg(rm) {
    S.reg = { room: rm, bed: rm.ppl.length + 1, no: 'CL-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000), bld: v.cb + 1, blk: rm.num[0], floor: Math.floor(parseInt(rm.num.slice(2)) / 100), date: today(), downloaded: false, file: null };
    v.selB = null; refresh();
    setInfo(<><b>{rm.num} is held for you.</b> Complete the 4 steps below.</>);
  }
  function requestMixed(rm) {
    const t = addTicket({ type: 'mixed', to: rm.num, stage: 1, consents: others(rm).map((x) => x.n) }); refresh();
    setInfo(<><b style={{ color: 'var(--good)' }}>✓ Application #{t.no} sent to the Student Representation.</b> First, the current residents are asked for consent: {t.consents.join(', ')}.</>);
    toast('Application #' + t.no + ' sent');
  }

  const pending = S.roomReq?.status === 'pending' ? S.roomReq : null;
  const myPending = (rm) => pending && pending.building === v.cb + 1 && pending.room === rm.num;

  function bedClick(rm, k, bad) {
    if (k < rm.ppl.length) return setInfo(<PersonCard p={rm.ppl[k]} rm={rm} />);
    if (myPending(rm) && k === rm.ppl.length) return setInfo(<><b style={{ color: 'var(--warn)' }}>⏳ Pending approval.</b> You asked for this bed. The administrator is checking your signed form.</>);
    if (pending && !bad.length && rm !== myRoom) return setInfo(<>You already have a pending request for <b>Building {pending.building}, {pending.room}</b>. Wait for the administrator, or cancel it in Requests.</>);
    if (reg && reg.room === rm && k === rm.ppl.length) return setInfo(<><b style={{ color: 'var(--warn)' }}>This place is held for your registration application ({reg.no}).</b> Download, sign and send the application below.</>);
    if (bad.length || rm === myRoom) {
      if (rm === myRoom) return setInfo('This is your room.');
      const pending = S.tickets.find((x) => x.type === 'mixed' && x.to === rm.num && !x.done && !x.rejected);
      return setInfo(<><b style={{ color: 'var(--warn)' }}>{rm.num} is locked for you:</b> {bad.join(', ')}.{' '}
        {genderOnly(rm) && (pending ? <>Your application for this room (#{pending.no}) is under review.</>
          : <>If you want to live together, you can apply to the Student Representation (§14). <button className="small" onClick={() => requestMixed(rm)}>Apply (§14)</button></>)}</>);
    }
    v.selB = rm.num + '-' + k; refresh();
    setInfo(<><b>Selected: {rm.num}.</b>{' '}
      {rm.ppl.length ? <>Your roommates: {rm.ppl.map((x) => x.n + ' (' + C[x.c] + ')').join(', ')}. </> : <>The room is empty — if you confirm, it becomes a {GN[m.g]}' room. </>}
      {myRoom ? <>You are already registered in room <b>{myRoom.num}</b>. You can't switch rooms in the app: the administrator assigns places (§10), so contact them if needed.</>
        : <>You register with a signed application: download the form, write your name, sign it, scan it and send it.{' '}
          <button className="primary small" onClick={() => startReg(rm)}>Prepare registration application</button></>}</>);
  }

  function Room({ rm }) {
    const fr = rm.cap - rm.ppl.length, bad = why(rm), cp = cps(rm), g = roomG(rm) || (rm.ppl.length ? rm.ppl[0].g : null);
    return (
      <div className="room" style={rm === myRoom ? { borderColor: 'var(--brand)' } : undefined}>
        <h3>{rm.num}{rm === myRoom && <> <span className="chip c-solid">Your room</span></>}</h3>
        <p className="cap">{rm.cap}-bed · {fr ? fr + ' free' : 'full'}</p>
        <div className="row" style={{ gap: 4 }}>
          {g ? <span className={'chip ' + (g === 'F' ? 'c-girl' : 'c-boy')}>{g === 'F' ? "Girls' room" : "Boys' room"}</span> : <span className="chip">Empty · first to arrive decides</span>}
          {rm.tags.includes('intl') && <span className="chip c-brand">International</span>}
          {rm.tags.includes('rep') && <span className="chip c-warn">Under repair</span>}
          {cp > 0 && <span className="chip c-solid">{cp} compatriot{cp > 1 ? 's' : ''}</span>}
        </div>
        <div className="beds">
          {Array.from({ length: rm.cap }, (_, k) => {
            const key = rm.num + '-' + k;
            if (k < rm.ppl.length) {
              const p = rm.ppl[k], isMe = p.n === ME;
              return <button key={k} className={'bed' + (isMe ? ' me' : p.c === m.c ? ' cp' : '')} aria-label={(isMe ? 'You' : p.n) + ', ' + C[p.c]} onClick={() => bedClick(rm, k, bad)}>{isMe ? 'You' : p.c}</button>;
            }
            if (reg && reg.room === rm && k === rm.ppl.length) return <button key={k} className="bed pend" aria-label={rm.num + ' held for your registration application'} onClick={() => bedClick(rm, k, bad)}>?</button>;
            if (myPending(rm) && k === rm.ppl.length) return <button key={k} className="bed pend" aria-label={rm.num + ' waiting for admin approval'} onClick={() => bedClick(rm, k, bad)}>⏳</button>;
            if (bad.length || rm === myRoom) return <button key={k} className="bed lock" aria-label={rm.num + ' locked bed'} onClick={() => bedClick(rm, k, bad)}><Icon name="lock" /></button>;
            return <button key={k} className={'bed ' + (v.selB === key ? 'sel' : 'free')} aria-label={rm.num + ' free bed'} onClick={() => bedClick(rm, k, bad)}><Icon name="bed" /></button>;
          })}
        </div>
      </div>
    );
  }

  const c = best ? cps(best.rm) : 0;
  return (
    <section className="stack">
      <div className="rule"><Icon name="lock" size={18} /><span><b>Rules:</b> you register with a signed application: pick a bed, download the form (LT/EN), sign it, scan it and send it. You can't switch rooms in the app; the administrator assigns places (point 10). Girls and boys live in separate rooms; exceptions need the Student Representation's approval (point 14).</span></div>
      <div className="ai">
        {best ? <>
          <b>✦ Suggestion: Building {best.bi + 1}, {best.rm.num}</b>{' '}
          <span>{c && m.p ? '— ' + c + ' ' + (c === 1 ? 'person' : 'people') + ' from ' + C[m.c] + ' live here: ' + others(best.rm).filter((x) => x.c === m.c).map((x) => x.n).join(', ') + '.' : '— there is a free place that fits you.'}</span>{' '}
          <button className="small" style={{ marginLeft: 6 }} onClick={() => set({ cb: best.bi, ck: best.ki, cf: best.fi })}>Show</button>
        </> : 'There are no free places that fit you.'}
      </div>
      <div>
        <div className="sel-line"><span>Building</span><div className="row">{B.map((x, i) => <Sel key={i} on={i === v.cb} label={['Building ' + x.b, openBeds(x.blocks.flat(2)) + ' free']} onClick={() => set({ cb: i })} />)}</div></div>
        <div className="sel-line"><span>Block</span><div className="row">{B[v.cb].blocks.map((x, j) => <Sel key={j} on={j === v.ck} label={['Block ' + BL[j], openBeds(x.flat()) + ' free']} onClick={() => set({ ck: j })} />)}</div></div>
        <div className="sel-line"><span>Floor</span><div className="row">{blk.map((fl, f) => { const cp = fl.reduce((a, r) => a + cps(r), 0); return <Sel key={f} on={f === v.cf} label={[f + 1, openBeds(fl) + ' free' + (cp ? ' · ' + cp + ' ' + m.c : '')]} onClick={() => set({ cf: f })} />; })}</div></div>
      </div>
      <h3 style={{ fontSize: 16 }}>Building {v.cb + 1} · Block {BL[v.ck]} · {ord(v.cf + 1)} floor</h3>
      <div>
        <div className="rooms">{rooms.slice(0, 3).map((rm) => <Room key={rm.num} rm={rm} />)}</div>
        <div className="corridor">CORRIDOR</div>
        <div className="rooms">{rooms.slice(3, 6).map((rm) => <Room key={rm.num} rm={rm} />)}</div>
      </div>
      <div className="card">{info}</div>
      <RegBox key={reg?.no} setInfo={setInfo} />
    </section>
  );
}
