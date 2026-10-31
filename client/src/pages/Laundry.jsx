import { useState } from 'react';
import { Icon } from '../icons.jsx';
import { downloadStickers, qrPayload, qrUrl } from '../files.js';
import { L, hm, refresh, toast } from '../store.js';

const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
const ago = (m) => (m < 60 ? plural(m, 'minute') : m < 1440 ? plural(Math.floor(m / 60), 'hour') : plural(Math.floor(m / 1440), 'day'));

function Machine({ x, selected, onClick }) {
  const unk = x.s === 'free' && x.seen >= 30;
  let st, sub;
  if (x.s === 'free') { st = unk ? 'Free?' : 'Free'; sub = unk ? 'nobody has confirmed for ' + ago(x.seen) : 'confirmed ' + ago(x.seen) + ' ago'; }
  else if (x.s === 'done') { st = 'Done'; sub = 'clothes still inside · ' + x.who; }
  else { st = x.left + ' min left'; sub = (x.s === 'mine' ? 'Yours' : x.who) + (x.ai ? ' · AI read the display' : '') + ' · ends at ' + hm(L.now + x.left); }
  return (
    <button className={'mc ' + (unk ? 'unk' : x.s) + (selected ? ' selm' : '')} onClick={onClick}>
      <div className="row" style={{ justifyContent: 'space-between' }}><Icon name={x.k === 'w' ? 'laundry' : 'wind'} />{x.notify && <span className="chip c-brand">🔔 will notify</span>}</div>
      <div style={{ fontWeight: 600, marginTop: 6 }}>{x.id} <span style={{ fontFamily: 'var(--mono)', fontSize: 11, opacity: 0.75 }}>QR·{x.code}</span></div>
      <div className="st">{st}</div>
      <div style={{ fontSize: 12 }}>{sub}</div>
      {(x.s === 'busy' || x.s === 'mine') && <div className="pbar"><i style={{ width: Math.round((1 - x.left / x.tot) * 100) + '%' }} /></div>}
    </button>
  );
}

function QrScanner({ onClose, setMsg }) {
  const [sel, setSel] = useState(null);
  const [min, setMin] = useState(60);
  const [err, setErr] = useState('');
  const [confirmBusy, setConfirmBusy] = useState(false);

  function scan(x) { setSel(x); setMin(x.k === 'w' ? 60 : 45); setErr(''); setConfirmBusy(false); }
  function start() {
    const x = sel;
    if ((x.s === 'busy' || x.s === 'mine') && !confirmBusy) {
      setErr(x.id + " still shows as busy in the app (" + x.left + " min). The previous user didn't close it. If the machine really is free, press \"Start\" again to confirm.");
      setConfirmBusy(true); return;
    }
    Object.assign(x, { s: 'mine', who: 'You', tot: min, left: min, seen: 0, notify: false, ai: false, real: null });
    onClose(); refresh();
    setMsg(<><b style={{ color: 'var(--brand)' }}>{x.id} started ({min} min).</b> You'll get a notification 10 minutes before the end and when it's done. Everyone sees the machine is busy.</>);
    toast(x.id + ' started · ends at ' + hm(L.now + min));
  }

  if (!sel) return (
    <div className="stack">
      <div className="faint">Demo: in the real app your phone camera opens. Here, clicking a sticker counts as scanning it.</div>
      <div className="qrfind">
        {L.M.map((x) => <button type="button" key={x.code} className="qrs" aria-label={'Scan ' + x.id + ' QR code'} onClick={() => scan(x)}><img alt="" src={qrUrl(x, 4)} /><span>{x.id}</span></button>)}
      </div>
    </div>
  );
  const status = sel.s === 'free' ? <span className="chip c-good">free in the app</span> : sel.s === 'done' ? <span className="chip c-warn">done, clothes inside</span> : <span className="chip">busy in the app · {sel.left} min</span>;
  return (
    <div className="stack">
      <div><b>✓ Scanned: {sel.id}</b> <span className="faint" style={{ fontFamily: 'var(--mono)' }}>{qrPayload(sel)}</span> {status}</div>
      <div><span className="lbl">Programme length (as shown on the machine)</span>
        <div className="row">{(sel.k === 'w' ? [30, 45, 60, 90] : [30, 45, 60]).map((v) => <button type="button" key={v} className={'opt' + (min === v ? ' on' : '')} onClick={() => setMin(v)}>{v} min</button>)}</div>
      </div>
      {err && <div className="err">{err}</div>}
      <div className="row"><button className="primary" onClick={start}>Start</button><button onClick={() => setSel(null)}>Another machine</button></div>
    </div>
  );
}

export default function Laundry() {
  const [sel, setSel] = useState(null);
  const [msg, setMsg] = useState('Click a machine. On a busy one you can choose "notify me when free". Dashed "Free?" machines haven\'t been confirmed by anyone for a while.');
  const [scan, setScan] = useState(false);
  const [best, setBest] = useState(false);
  const [pdfMsg, setPdfMsg] = useState('');
  const free = L.M.filter((x) => x.s === 'free').length;

  function click(x) {
    setSel(x);
    const unk = x.s === 'free' && x.seen >= 30;
    if (x.s === 'free') {
      const startQr = () => { Object.assign(x, { s: 'mine', who: 'You', tot: x.k === 'w' ? 60 : 45, seen: 0 }); x.left = x.tot; refresh(); setMsg(x.id + " started. We'll let you know when it's done."); };
      const photo = () => {
        setMsg(<span style={{ color: 'var(--brand)' }}>✦ AI is reading the photo…</span>);
        setTimeout(() => {
          const left = x.real || 31;
          Object.assign(x, { s: 'busy', who: 'unknown', tot: Math.max(left, 45), left, ai: true, seen: 0, real: null }); refresh();
          setMsg(<><b style={{ color: 'var(--brand)' }}>✦ AI read "0:{String(left).padStart(2, '0')}" on the display.</b> {x.id} status corrected. Thanks!</>);
        }, 900);
      };
      setMsg(<>{unk ? <b style={{ color: 'var(--warn)' }}>{x.id} looks free, but nobody has confirmed it for {ago(x.seen)}.</b> : <b style={{ color: 'var(--good)' }}>{x.id} is free.</b>}{' '}
        If you're in the basement: <button className="small" onClick={startQr}>Start with QR</button>
        <button className="small" style={{ marginLeft: 6 }} onClick={photo}>It's actually running — photo the display</button></>);
    } else if (x.s === 'mine') setMsg('This is your machine. ' + plural(x.left, 'minute') + ' left.');
    else { x.notify = !x.notify; refresh(); setMsg(x.notify ? <b style={{ color: 'var(--brand)' }}>🔔 We'll notify you when {x.id} is free.</b> : 'Notification cancelled.'); }
  }

  async function stickers() {
    setPdfMsg('');
    const r = await downloadStickers(L.M);
    setPdfMsg(r === 'saved' ? 'Downloaded. Print it and stick one on each machine.' : "Couldn't download the file.");
  }

  const demoA = () => { const x = L.M[0]; if (x.s !== 'free') return toast('Washer 1 is already busy'); Object.assign(x, { s: 'busy', who: 'Ali', tot: 60, left: 60, seen: 0 }); refresh(); };
  const demoB = () => { const x = L.M[3]; if (x.s !== 'free') return; x.real = 45; refresh(); setMsg(<span style={{ color: 'var(--warn)' }}>Kanan started Dryer 2 without QR. The app doesn't know — the machine still shows "Free?". Click it and photo the display.</span>); };
  const demoC = () => { const x = L.M[1]; if (x.s === 'free') return; x.s = 'free'; x.seen = 0; if (x.notify) { toast('🔔 Washer 2 is free. You can go now.'); x.notify = false; } refresh(); };

  return (
    <section className="stack">
      <div className="row" style={{ justifyContent: 'space-between' }}><span className="muted">Building 3 · basement · now {hm(L.now)}</span><span className={'chip ' + (free ? 'c-good' : 'c-warn')}>{plural(free, 'machine')} free</span></div>
      <div className="card stack" style={{ borderColor: 'var(--brand)' }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ minWidth: 0, flex: '1 1 260px' }}><b>Start a machine with its QR code</b><div className="muted" style={{ fontSize: 14 }}>Every machine has a QR sticker. Load your clothes, scan the code with your phone and pick the programme length. Everyone then sees that the machine is busy and when it will be free.</div></div>
          <button className="primary" onClick={() => setScan(!scan)}>📷 Scan QR code</button>
        </div>
        {scan && <QrScanner onClose={() => setScan(false)} setMsg={setMsg} />}
        <div className="row"><button className="small" onClick={stickers}>Download QR stickers (PDF, for the administrator)</button><span className="faint">{pdfMsg}</span></div>
      </div>
      <div><span className="lbl">Washers</span><div className="machines">{L.M.filter((x) => x.k === 'w').map((x) => <Machine key={x.code} x={x} selected={sel === x} onClick={() => click(x)} />)}</div></div>
      <div><span className="lbl">Dryers</span><div className="machines">{L.M.filter((x) => x.k === 'd').map((x) => <Machine key={x.code} x={x} selected={sel === x} onClick={() => click(x)} />)}</div></div>
      <div className="card">{msg}</div>
      <div className="row"><button onClick={() => setBest(true)}>✦ When is it least busy?</button><button onClick={() => toast('In the real app, the Primus app opens for payment')}>Pay in Primus ↗</button></div>
      {best && <div className="ai"><b>✦ Based on the last 4 weeks,</b> the quietest times are weekdays <b>07:00–09:00</b> and <b>13:00–15:00</b>. The busiest is Sunday <b>18:00–22:00</b>.</div>}
      <div className="demo">
        <span className="lbl">Demo: other students in the basement</span>
        <div className="row"><button className="small" onClick={demoA}>Ali started Washer 1</button><button className="small" onClick={demoB}>Kanan started Dryer 2 without QR</button><button className="small" onClick={demoC}>Leyla took her clothes from Washer 2</button></div>
        <div className="faint" style={{ marginTop: 6 }}>Time runs fast in the demo: 1 second = 1 minute. In the real app the status comes from Primus and QR scans.</div>
      </div>
    </section>
  );
}
