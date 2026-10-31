import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { C, GN, ME, roomAt, toast } from '../store.js';
import { STATUS, openFile } from './Requests.jsx';

const FILTERS = [['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected'], ['all', 'All']];
const when = (iso) => iso ? new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';

// Automatic checks against the dormitory rules, so the administrator sees problems at a glance.
function checks(r) {
  const rm = roomAt(r.building, r.room);
  if (!rm) return [['bad', 'Room not found']];
  const others = rm.ppl.filter((p) => p.n !== ME && p.rid !== r.id);
  const g = others.length ? others[0].g : rm.fixed;
  const free = rm.cap - others.length;
  return [
    [!g || g === r.g ? 'ok' : 'bad', !g ? 'Empty room — first student decides' : g === r.g ? 'Gender matches (' + GN[g] + "' room)" : 'Gender mismatch: ' + GN[g] + ' live here (§14)'],
    [free > 0 ? 'ok' : 'bad', free > 0 ? free + ' free bed' + (free > 1 ? 's' : '') + ' in ' + rm.cap + '-bed room' : 'Room is full'],
    [rm.tags.includes('rep') ? 'bad' : 'ok', rm.tags.includes('rep') ? 'Room is under repair' : 'Room is in use'],
    [rm.tags.includes('intl') && r.c === 'LT' ? 'bad' : 'ok', rm.tags.includes('intl') ? (r.c === 'LT' ? 'International room, student is Lithuanian' : 'International room · ' + C[r.c]) : 'Regular room'],
    ['ok', 'Signed form attached'],
  ];
}

function RequestRow({ r, onDecided }) {
  const [note, setNote] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [cls, label] = STATUS[r.status];
  const list = checks(r), problems = list.filter((c) => c[0] === 'bad').length;

  async function decide(decision) {
    if (decision === 'reject' && !note.trim()) return setErr('Write a short reason for the student.');
    setBusy(true); setErr('');
    const res = await api('admin/room-requests/' + r.id + '/decision', { decision, note: note.trim() });
    setBusy(false);
    if (!res.ok) return setErr(res.data.error || 'Something went wrong.');
    toast(decision === 'approve' ? '✓ Approved · ' + r.name + ' was notified' : 'Rejected · ' + r.name + ' was notified');
    onDecided();
  }

  return (
    <div className="card stack" style={{ gap: 12 }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div className="row" style={{ gap: 12, flexWrap: 'nowrap' }}>
          <span className="av">{r.name[0].toUpperCase()}</span>
          <div><b>{r.name}</b><div className="faint">{r.email} · {C[r.c]} · {r.g === 'F' ? 'female' : 'male'}</div></div>
        </div>
        <span className={'chip ' + cls}>{label}</span>
      </div>
      <div className="grid2" style={{ fontSize: 14 }}>
        <div><span className="lbl">Requested place</span><b>Building {r.building} · {r.room} · bed {r.bed}</b><div className="faint">Floor {r.floor} · Block {r.block}</div></div>
        <div><span className="lbl">Application</span>{r.appNo}<div className="faint">Sent {when(r.createdAt)}</div></div>
      </div>
      <div>
        <span className="lbl">Checks</span>
        <div className="row" style={{ gap: 6 }}>
          {list.map(([k, t]) => <span key={t} className={'chip ' + (k === 'ok' ? 'c-good' : 'c-bad')}>{k === 'ok' ? '✓' : '✕'} {t}</span>)}
        </div>
      </div>
      <div className="row"><button className="small" onClick={() => openFile(r.id)}>📄 View signed form ({r.fileName})</button></div>
      {r.status === 'pending' ? (
        <div className="stack" style={{ gap: 8 }}>
          {rejecting && <textarea rows={2} autoFocus placeholder="Reason for the student, e.g. The form isn't signed" value={note} onChange={(e) => { setNote(e.target.value); setErr(''); }} />}
          {err && <div className="err">{err}</div>}
          <div className="row">
            {!rejecting ? <>
              <button className="primary" disabled={busy} onClick={() => decide('approve')}>✓ Approve{problems ? ' anyway' : ''}</button>
              <button disabled={busy} onClick={() => setRejecting(true)}>✕ Reject</button>
            </> : <>
              <button className="primary" disabled={busy} onClick={() => decide('reject')}>Send rejection</button>
              <button disabled={busy} onClick={() => { setRejecting(false); setNote(''); setErr(''); }}>Back</button>
            </>}
          </div>
        </div>
      ) : (
        <div className="faint">{r.status === 'approved' ? 'Approved' : r.status === 'rejected' ? 'Rejected' : 'Cancelled by the student'} {when(r.decidedAt)}{r.decidedBy ? ' by ' + r.decidedBy : ''}{r.note ? ' · ' + r.note : ''}</div>
      )}
    </div>
  );
}

export default function Admin() {
  const [items, setItems] = useState(null);
  const [flt, setFlt] = useState('pending');
  const [err, setErr] = useState('');

  async function load() {
    const r = await api('admin/room-requests');
    if (r.ok) { setItems(r.data); setErr(''); } else setErr(r.data.error || "Couldn't load requests.");
  }
  useEffect(() => { load(); const t = setInterval(load, 8000); return () => clearInterval(t); }, []);

  const count = (s) => (items || []).filter((r) => s === 'all' || r.status === s).length;
  const shown = (items || []).filter((r) => flt === 'all' || r.status === flt);
  return (
    <section className="stack">
      <div className="ai"><b>Room registration requests</b><div style={{ fontSize: 14, marginTop: 2 }}>Check each student's signed form and the automatic checks, then approve or reject. The student sees the result in the app and gets an e-mail.</div></div>
      <div className="row">{FILTERS.map(([k, v]) => <button key={k} className={'opt' + (flt === k ? ' on' : '')} onClick={() => setFlt(k)}>{v} · {count(k)}</button>)}</div>
      {err && <div className="err">{err}</div>}
      {items === null && !err && <div className="card muted">Loading…</div>}
      {items && !shown.length && <div className="card muted">{flt === 'pending' ? 'No pending requests. New ones appear here automatically.' : 'Nothing here yet.'}</div>}
      {shown.map((r) => <RequestRow key={r.id + r.status} r={r} onDecided={load} />)}
    </section>
  );
}
