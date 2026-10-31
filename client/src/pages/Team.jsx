import { useState } from 'react';
import { S, SK, posts, startDm, toast } from '../store.js';

const TYPES = [['hack', 'Hackathon'], ['olymp', 'Olympiad'], ['course', 'Course project'], ['other', 'Other']];
const FILTERS = [['all', 'All'], ['mine', 'My posts'], ['hack', 'Hackathon'], ['olymp', 'Olympiad'], ['course', 'Course'], ['near', 'My building']];
const AI_SKILLS = { frontend: 'Frontend', backend: 'Backend', python: 'Python', ml: 'ML / AI', 'machine learning': 'ML / AI', mobile: 'Mobile', design: 'Design', business: 'Business', pitch: 'Pitch', math: 'Maths', doc: 'Documentation' };
const blank = () => ({ t: 'hack', title: '', date: '', size: '4', desc: '', have: new Set(S.user.skills), need: new Set() });

function SkillChips({ set, cls, onToggle }) {
  return <div className="row">{SK.map((s) => <button type="button" key={s} className={'opt' + (set.has(s) ? ' ' + cls : '')} onClick={() => onToggle(s)}>{s}</button>)}</div>;
}

function PostForm({ onClose }) {
  const [f, setF] = useState(blank);
  const [ai, setAi] = useState('');
  const [aiMsg, setAiMsg] = useState(null);
  const [err, setErr] = useState({});
  const toggle = (key) => (s) => setF((p) => { const n = new Set(p[key]); n.has(s) ? n.delete(s) : n.add(s); return { ...p, [key]: n }; });

  function fillWithAi() {
    const s = ai.toLowerCase();
    if (!s.trim()) return setAiMsg({ bad: true, text: 'Write a sentence first.' });
    const n = { ...f, have: new Set(), need: new Set() };
    if (/hackathon/.test(s)) n.t = 'hack'; else if (/olympiad/.test(s)) n.t = 'olymp'; else if (/course|project/.test(s)) n.t = 'course';
    const mm = s.match(/i (?:know|can do|have) (.+?)(?:,|\.|$)/), hv = mm ? mm[1] : '';
    Object.entries(AI_SKILLS).forEach(([k, v]) => { if (hv.includes(k)) n.have.add(v); else if (s.includes(k)) n.need.add(v); });
    const d = s.match(/(\d{1,2}(?:[–-]\d{1,2})?)\s*(january|february|march|april|may|june|july|august|september|october|november|december)/);
    if (d) n.date = d[1] + ' ' + d[2][0].toUpperCase() + d[2].slice(1);
    const z = s.match(/team of (\d)|(\d)\s*(?:people|members)/); if (z) n.size = z[1] || z[2];
    if (!n.title) n.title = n.t === 'hack' ? (/\bai\b/.test(s) ? 'AI Hackathon' : 'Hackathon') : n.t === 'olymp' ? 'Olympiad' : 'Course project';
    setF(n); setAiMsg({ text: 'Done. Check the fields and fix anything if needed.' });
  }

  function publish() {
    const e = {};
    if (!f.title.trim()) e.title = 'Enter the competition name.';
    if (!f.date.trim()) e.date = 'Enter the date.';
    if (!f.need.size) e.need = 'Pick at least one role the team needs.';
    setErr(e); if (Object.keys(e).length) return;
    posts.unshift({ t: f.t, title: f.title.trim(), date: f.date.trim(), who: 'You', c: S.prefs.c, room: S.myRoom ? '3 · ' + S.myRoom.num : 'not registered', have: [...f.have], need: [...f.need], slots: '1/' + f.size, desc: f.desc.trim(), near: true, mine: true, match: 3 + f.need.size * 2 });
    onClose(true); toast('Post published');
  }

  return (
    <div className="card stack" style={{ borderColor: 'var(--brand)' }}>
      <div className="row" style={{ justifyContent: 'space-between' }}><h3 style={{ fontSize: 17 }}>New post</h3><button className="small" onClick={() => onClose(false)}>Close</button></div>
      <div className="ai">
        <label className="lbl" htmlFor="aiTxt" style={{ color: 'var(--brand)' }}>✦ Fill with AI — write one sentence</label>
        <textarea id="aiTxt" rows={2} value={ai} onChange={(e) => setAi(e.target.value)} placeholder="Looking for a frontend dev and a designer for the AI hackathon on 15 November, I know backend and python, team of 4" />
        <div className="row" style={{ marginTop: 6 }}><button className="small" onClick={fillWithAi}>Fill the fields</button>{aiMsg && <span style={{ fontSize: 13, color: aiMsg.bad ? 'var(--bad)' : 'var(--brand)' }}>{aiMsg.text}</span>}</div>
      </div>
      <div><span className="lbl">Competition type</span><div className="row">{TYPES.map(([k, v]) => <button type="button" key={k} className={'opt' + (f.t === k ? ' on' : '')} onClick={() => setF({ ...f, t: k })}>{v}</button>)}</div></div>
      <div><label className="lbl" htmlFor="fTitle">Competition name</label><input type="text" id="fTitle" placeholder="VILNIUS TECH AI Hackathon" value={f.title} onChange={(e) => { setF({ ...f, title: e.target.value }); setErr({ ...err, title: null }); }} />{err.title && <div className="err">{err.title}</div>}</div>
      <div className="grid2">
        <div><label className="lbl" htmlFor="fDate">Date</label><input type="text" id="fDate" placeholder="15–16 November" value={f.date} onChange={(e) => { setF({ ...f, date: e.target.value }); setErr({ ...err, date: null }); }} />{err.date && <div className="err">{err.date}</div>}</div>
        <div><label className="lbl" htmlFor="fSize">Team size</label><select id="fSize" value={f.size} onChange={(e) => setF({ ...f, size: e.target.value })}>{['2', '3', '4', '5', '6'].map((n) => <option key={n}>{n}</option>)}</select></div>
      </div>
      <div><span className="lbl">Skills I have</span><SkillChips set={f.have} cls="onH" onToggle={toggle('have')} /></div>
      <div><span className="lbl">Skills the team needs</span><SkillChips set={f.need} cls="onN" onToggle={(s) => { toggle('need')(s); setErr({ ...err, need: null }); }} />{err.need && <div className="err">{err.need}</div>}</div>
      <div><label className="lbl" htmlFor="fDesc">Short description (optional)</label><textarea id="fDesc" rows={2} value={f.desc} onChange={(e) => setF({ ...f, desc: e.target.value })} placeholder="We're building an AI app for the campus, we'll work in the dorm in the evenings" /></div>
      <div className="row"><button className="primary" onClick={publish}>Publish</button></div>
    </div>
  );
}

export default function Team() {
  const [flt, setFlt] = useState('all');
  const [form, setForm] = useState(false);
  const [why, setWhy] = useState(false);
  const ps = posts.filter((p) => flt === 'all' || (flt === 'near' ? p.near : flt === 'mine' ? p.mine : p.t === flt));

  return (
    <section className="stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div className="row">{FILTERS.map(([k, v]) => <button key={k} className={'opt' + (flt === k ? ' on' : '')} onClick={() => setFlt(k)}>{v}</button>)}</div>
        {!form && <button className="primary" onClick={() => setForm(true)}>+ New post</button>}
      </div>
      {form && <PostForm onClose={(published) => { setForm(false); if (published) setFlt('all'); }} />}
      <div className="ai">
        <b>✦ AI found a match for you</b>
        <div style={{ fontSize: 14, marginTop: 2 }}>The "VILNIUS TECH AI Hackathon" team needs a <b>frontend</b> developer. Murad lives in your building (B-504). 92% match.</div>
        <div className="row" style={{ marginTop: 8 }}><button className="small" onClick={() => startDm('Murad', 'VILNIUS TECH AI Hackathon')}>I want to join</button><button className="small" onClick={() => setWhy(!why)}>Why a match?</button></div>
        {why && <div style={{ fontSize: 13, marginTop: 6 }}>They're missing your skill (Frontend) · you live in the same building · you both speak English.</div>}
      </div>
      <div className="stack">
        {!ps.length && <div className="card muted">No posts for this filter. Use "New post" to add your first one.</div>}
        {ps.map((p, i) => (
          <div className="card" key={p.title + i} style={p.mine ? { borderColor: 'var(--brand)' } : undefined}>
            <div className="row" style={{ alignItems: 'flex-start', gap: 12, flexWrap: 'nowrap' }}>
              <span className="av">{p.who[0]}</span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <b style={{ fontSize: 15 }}>{p.title}</b>{p.mine && <> <span className="chip c-brand">Your post</span></>}
                <div className="faint" style={{ margin: '2px 0 8px' }}>{p.date} · {p.who} ({p.c}) · building {p.room} · team {p.slots}</div>
                {p.desc && <div style={{ fontSize: 14, marginBottom: 8 }}>{p.desc}</div>}
                <div className="row" style={{ gap: 4 }}>
                  {p.have.map((x) => <span key={'h' + x} className="chip c-good">{x}</span>)}
                  {p.need.map((x) => <span key={'n' + x} className="chip c-warn">Needs: {x}</span>)}
                </div>
              </div>
            </div>
            {p.mine ? <div style={{ fontSize: 13, color: 'var(--brand)', marginTop: 8 }}>✦ AI found {p.match} matching students and notified them.</div>
              : <button className="small" style={{ marginTop: 10 }} onClick={() => startDm(p.who, p.title)}>Message in chat</button>}
          </div>
        ))}
      </div>
    </section>
  );
}
