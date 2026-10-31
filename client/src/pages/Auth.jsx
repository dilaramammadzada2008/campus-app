import { useEffect, useRef, useState } from 'react';
import { api, setToken } from '../api.js';
import { C, LANGS, SK } from '../store.js';
import { signIn } from '../App.jsx';
import { Icon } from '../icons.jsx';

const MODE_TXT = {
  signup: { title: 'Create your account', lead: 'Sign up with your university e-mail. No password: we send a one-time code to your inbox.', foot: 'Already have an account? Choose Sign in.' },
  signin: { title: 'Welcome back', lead: "Sign in with your university e-mail. We'll send a one-time code to your inbox.", foot: 'New to Campus Life? Choose Sign up.' },
};

const FEATURES = [
  ['rooms', 'Pick your bed', 'Choose building, block, floor and bed like an airplane seat. See who your roommates will be.'],
  ['laundry', 'Live laundry', 'See which washers and dryers are free without going to the basement. Get a ping when yours is done.'],
  ['team', 'Find a team', 'Post or join teams for hackathons, olympiads and course projects. AI matches people by skills.'],
  ['chat', 'Your language', 'Room, floor and building chats. AI translates Lithuanian messages and writes formal requests for you.'],
];
const HOW = [
  ['shield', 'Verify', 'Enter your VILNIUS TECH e-mail and the code we send you.'],
  ['user', 'Tell us about you', 'Citizenship, languages and skills: used for room rules and matching.'],
  ['rooms', 'Move in', 'Pick your bed, send the signed form and you are registered.'],
];

// Fades sections in as they scroll into view.
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) { els.forEach((el) => el.classList.add('in')); return; }
    const io = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.15 });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

export function LogoMark() {
  return <i className="logo-mark" aria-hidden="true"><b /><b /><b /><b /></i>;
}

const EMPTY = ['', '', '', '', '', ''];

// Six one-digit boxes; `digits` is an array of 6 strings.
function Otp({ digits, onChange, onComplete, bad }) {
  const refs = useRef([]);
  useEffect(() => { refs.current[0]?.focus(); }, []);
  const update = (next, focus) => {
    onChange(next);
    if (focus != null) refs.current[focus]?.focus();
    if (next.every((d) => d)) onComplete(next.join(''));
  };
  return (
    <div className="otp">
      {digits.map((d, i) => (
        <input key={i} ref={(el) => (refs.current[i] = el)} type="text" inputMode="numeric" aria-label={'Digit ' + (i + 1)}
          autoComplete={i ? 'off' : 'one-time-code'} className={bad ? 'bad' : ''} value={d}
          onChange={(e) => {
            // Several digits at once (autofill or fast typing) spill into the following boxes.
            let v = e.target.value.replace(/\D/g, '');
            if (v.length > 1 && v.startsWith(d)) v = v.slice(d.length);
            const n = [...digits]; if (!v) n[i] = '';
            v.slice(0, 6 - i).split('').forEach((c, j) => (n[i + j] = c));
            update(n, v ? Math.min(i + v.length, 5) : null);
          }}
          onKeyDown={(e) => { if (e.key === 'Backspace' && !d && i > 0) refs.current[i - 1]?.focus(); }}
          onPaste={(e) => {
            const t = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6); if (!t) return;
            e.preventDefault(); const n = [...EMPTY]; t.split('').forEach((c, j) => (n[j] = c)); update(n, Math.min(t.length, 5));
          }} />
      ))}
    </div>
  );
}

function Chips({ list, set, cls, onToggle }) {
  return list.map((s) => <button type="button" key={s} className={'opt' + (set.has(s) ? ' ' + cls : '')} onClick={() => onToggle(s)}>{s}</button>);
}

export default function Auth() {
  const [mode, setMode] = useState('signup');
  const [step, setStep] = useState(1);
  const [mail, setMail] = useState('');
  const [err, setErr] = useState(null); // { text, switchTo? }
  const [busy, setBusy] = useState(false);
  const [domains, setDomains] = useState(['stud.vilniustech.lt', 'vilniustech.lt']);
  const [code, setCode] = useState(EMPTY);
  const [codeErr, setCodeErr] = useState('');
  const [devCode, setDevCode] = useState(null);
  const [wait, setWait] = useState(0);
  const [prof, setProf] = useState({ name: '', c: 'AZ', g: null, show: true, langs: new Set(['Azerbaijani', 'English']), skills: new Set() });
  const [profErr, setProfErr] = useState({});
  const [open, setOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  useReveal();
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey); document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => { api('config').then((r) => { if (r.ok && r.data.domains) setDomains(r.data.domains); }); }, []);
  useEffect(() => { if (wait <= 0) return; const t = setTimeout(() => setWait((w) => w - 1), 1000); return () => clearTimeout(t); }, [wait]);

  const switchMode = (m) => { setMode(m); setStep(1); setErr(null); };
  const T = MODE_TXT[mode];

  async function sendCode() {
    const r = await api('send-code', { email: mail.trim().toLowerCase(), mode });
    if (r.ok) { setDevCode(r.data.devCode || null); setWait(r.data.wait || 30); }
    else if (r.data.wait) setWait(r.data.wait);
    return r;
  }

  async function submitEmail(e) {
    e.preventDefault(); if (busy) return;
    const v = mail.trim().toLowerCase();
    if (!v) return setErr({ text: 'Enter your e-mail.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return setErr({ text: "That doesn't look like an e-mail address. For example: vardas.pavarde@stud.vilniustech.lt" });
    if (!domains.some((d) => v.endsWith('@' + d))) return setErr({ text: "This address isn't a VILNIUS TECH one. Use the e-mail your university gave you." });
    setBusy(true); const r = await sendCode(); setBusy(false);
    if (!r.ok) {
      const sw = r.data.code === 'exists' ? 'signin' : r.data.code === 'missing' ? 'signup' : null;
      return setErr({ text: r.data.error || 'Something went wrong. Try again.', switchTo: sw });
    }
    setErr(null); setCode(EMPTY); setCodeErr(''); setStep(2);
  }

  async function verify(digits) {
    if (busy) return;
    if (digits.length < 6) return setCodeErr('Enter all 6 digits.');
    setBusy(true); const r = await api('verify-code', { email: mail.trim().toLowerCase(), code: digits }); setBusy(false);
    if (!r.ok) return setCodeErr(r.data.error || 'Something went wrong. Try again.');
    setToken(r.data.token);
    if (r.data.profile) return signIn(mail.trim().toLowerCase(), r.data.profile, 'Welcome back, ' + r.data.profile.name, r.data.isAdmin);
    setIsAdmin(Boolean(r.data.isAdmin));
    const guess = mail.split('@')[0].split(/[._]/)[0];
    setProf((p) => ({ ...p, name: guess ? guess[0].toUpperCase() + guess.slice(1) : '' }));
    setStep(3);
  }

  async function resend() {
    if (wait > 0) return;
    setCodeErr(''); const r = await sendCode();
    if (!r.ok) return setCodeErr(r.data.error || "Couldn't send a new code.");
    setCode(EMPTY);
  }

  async function createAccount(e) {
    e.preventDefault(); if (busy) return;
    const n = prof.name.trim(), errs = {};
    if (!n) errs.name = 'Enter how others will see you.'; else if (n.length > 30) errs.name = 'Keep it under 30 characters.';
    if (!prof.g) errs.g = 'Choose one: room rules depend on it.';
    setProfErr(errs); if (Object.keys(errs).length) return;
    const p = { name: n, c: prof.c, g: prof.g, show: prof.show, langs: [...prof.langs], skills: [...prof.skills] };
    setBusy(true); const r = await api('profile', { profile: p }); setBusy(false);
    if (!r.ok) {
      if (r.status === 401) { setToken(null); switchMode('signin'); }
      return setProfErr({ save: r.data.error || "Couldn't save your profile. Try again." });
    }
    signIn(mail.trim().toLowerCase(), p, 'Welcome, ' + n + '! Your account is ready. Now pick your place in the dormitory.', isAdmin);
  }

  const toggle = (key) => (s) => setProf((p) => { const n = new Set(p[key]); n.has(s) ? n.delete(s) : n.add(s); return { ...p, [key]: n }; });

  const openAuth = (m) => { switchMode(m); setOpen(true); };

  return (
    <div className="lp">
      <nav className="lp-nav">
        <a className="lp-brand" href="#top"><LogoMark />Campus Life</a>
        <div className="lp-links"><a href="#features">Features</a><a href="#how">How it works</a></div>
        <div className="lp-actions">
          <button className="lp-login" onClick={() => openAuth('signin')}>Log in</button>
          <button className="lp-signup" onClick={() => openAuth('signup')}>Sign up</button>
        </div>
      </nav>

      <header className="lp-hero" id="top">
        <div className="lp-shot">
          <img src="/campus.jpg" alt="Students relaxing on the lawn in front of a VILNIUS TECH building" />
        </div>
        <div className="lp-hero-in">
          <span className="lp-pill"><Icon name="shield" />VILNIUS TECH students only</span>
          <h1>Your dorm, in one app.<br />Made for Saulėtekis.</h1>
          <p>Pick your bed, see free washers from your room, find your hackathon team and talk to the administrator in your own language.</p>
          <div className="lp-cta-row">
            <button className="lp-btn-light" onClick={() => openAuth('signup')}>Sign up</button>
            <button className="lp-btn-dark" onClick={() => openAuth('signin')}>Log in</button>
          </div>
          <span className="lp-note">University e-mail required · No password · Takes a minute</span>
        </div>
      </header>

      <section className="lp-sec" id="features">
        <h2 className="reveal">Everything in your dorm,<br />one tap away</h2>
        <div className="lp-grid">
          {FEATURES.map(([icon, title, text], i) => (
            <div className="lp-card reveal" style={{ transitionDelay: i * 80 + 'ms' }} key={icon}><span className="lp-ic"><Icon name={icon} /></span><b>{title}</b><span>{text}</span></div>
          ))}
        </div>
      </section>

      <section className="lp-sec" id="how">
        <h2 className="reveal">How it works</h2>
        <div className="lp-grid three">
          {HOW.map(([icon, title, text], i) => (
            <div className="lp-card reveal" style={{ transitionDelay: i * 80 + 'ms' }} key={title}><span className="lp-ic"><Icon name={icon} /></span><b>{i + 1}. {title}</b><span>{text}</span></div>
          ))}
        </div>
      </section>

      <section className="lp-band reveal">
        <h2>Ready to move in?</h2>
        <p>Join with your VILNIUS TECH e-mail and pick your bed today.</p>
        <button className="lp-btn-light" onClick={() => openAuth('signup')}>Create account</button>
      </section>

      <footer className="lp-foot"><span>© {new Date().getFullYear()} Campus Life · Saulėtekis, Vilnius</span><span>Demo project · not an official VILNIUS TECH service</span></footer>

      {open && (
      <div className="lp-modal" role="dialog" aria-modal="true" aria-label={T.title} onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
        <div className="authcard">
        <button className="lp-close" aria-label="Close" onClick={() => setOpen(false)}>×</button>
        <div className="authbox">
          <div className="stepper" aria-hidden="true">
            {[1, 2, 3].filter((i) => mode === 'signup' || i < 3).map((i) => <span key={i} className={i <= step ? 'on' : ''} />)}
          </div>

          {step === 1 && (
            <form className="big" noValidate style={{ display: 'flex', flexDirection: 'column', gap: 18 }} onSubmit={submitEmail}>
              <div className={'tabs ' + mode} role="tablist">
                <span className="slider" aria-hidden="true" />
                {[['signup', 'Sign up'], ['signin', 'Sign in']].map(([k, v]) => (
                  <button key={k} type="button" role="tab" aria-selected={mode === k} className={mode === k ? 'on' : ''} onClick={() => switchMode(k)}>{v}</button>
                ))}
              </div>
              <div><h1>{T.title}</h1><p className="lead">{T.lead}</p></div>
              <div className="field">
                <label className="lbl" htmlFor="aMail">VILNIUS TECH e-mail</label>
                <div className="inwrap"><Icon name="mail" />
                  <input type="email" id="aMail" placeholder="vardas.pavarde@stud.vilniustech.lt" autoComplete="email" inputMode="email" value={mail} onChange={(e) => { setMail(e.target.value); setErr(null); }} />
                </div>
                {err && <div className="err">{err.text}{err.switchTo && <button type="button" className="ghost" style={{ marginLeft: 6 }} onClick={() => switchMode(err.switchTo)}>{err.switchTo === 'signin' ? 'Go to Sign in' : 'Go to Sign up'}</button>}</div>}
              </div>
              <button className="primary" type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send code →'}</button>
              <div className="trust"><Icon name="shield" />No password. {T.foot} Only VILNIUS TECH students and staff can join.</div>
            </form>
          )}

          {step === 2 && (
            <form className="big" noValidate style={{ display: 'flex', flexDirection: 'column', gap: 18 }} onSubmit={(e) => { e.preventDefault(); verify(code.join('')); }}>
              <div><h1>Check your inbox</h1><p className="lead">We sent a 6-digit code to {mail.trim().toLowerCase()}. It expires in 10 minutes.</p></div>
              <Otp digits={code} onChange={(v) => { setCode(v); setCodeErr(''); }} onComplete={verify} bad={Boolean(codeErr) && code.every((d) => d)} />
              {codeErr && <div className="err">{codeErr}</div>}
              {devCode && <div className="demo-code"><span>Dev mode: e-mail sending isn't set up yet. Your code is</span><b>{devCode.slice(0, 3)} {devCode.slice(3)}</b></div>}
              <button className="primary" type="submit" disabled={busy}>Verify</button>
              <div className="row" style={{ justifyContent: 'space-between', fontSize: 14 }}>
                <button type="button" className="ghost" onClick={() => setStep(1)}>Change e-mail</button>
                <button type="button" className="ghost" disabled={wait > 0} style={{ color: wait > 0 ? 'var(--faint)' : undefined }} onClick={resend}>{wait > 0 ? 'New code in ' + wait + ' s' : 'Resend code'}</button>
              </div>
            </form>
          )}

          {step === 3 && (
            <form className="big" noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }} onSubmit={createAccount}>
              <div><h1>About you</h1><p className="lead">We use this for room rules, suggestions and the team finder. You can change it later in Profile.</p></div>
              <div className="field">
                <label className="lbl" htmlFor="oName">Display name (name or nickname)</label>
                <input type="text" id="oName" placeholder="Dilara" autoFocus value={prof.name} onChange={(e) => { setProf({ ...prof, name: e.target.value }); setProfErr({ ...profErr, name: null }); }} />
                {profErr.name && <div className="err">{profErr.name}</div>}
              </div>
              <div className="field"><label className="lbl" htmlFor="oC">Citizenship</label>
                <select id="oC" value={prof.c} onChange={(e) => setProf({ ...prof, c: e.target.value })}>{Object.entries(C).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
              </div>
              <div className="field"><span className="lbl">Gender</span>
                <div className="seg">
                  <button type="button" className={prof.g === 'F' ? 'on' : ''} onClick={() => { setProf({ ...prof, g: 'F' }); setProfErr({ ...profErr, g: null }); }}>Female<small>Opens girls' rooms</small></button>
                  <button type="button" className={prof.g === 'M' ? 'on' : ''} onClick={() => { setProf({ ...prof, g: 'M' }); setProfErr({ ...profErr, g: null }); }}>Male<small>Opens boys' rooms</small></button>
                </div>
                {profErr.g && <div className="err">{profErr.g}</div>}
              </div>
              <div className="field"><span className="lbl">Languages you speak</span><div className="row"><Chips list={LANGS} set={prof.langs} cls="on" onToggle={toggle('langs')} /></div></div>
              <div className="field"><span className="lbl">Skills (for Team finder, optional)</span><div className="row"><Chips list={SK} set={prof.skills} cls="onH" onToggle={toggle('skills')} /></div></div>
              <label className="switch"><input type="checkbox" checked={prof.show} onChange={(e) => setProf({ ...prof, show: e.target.checked })} />
                <span>Show my country to other students<br /><span className="faint">If you turn this off, we can still place you with compatriots, but your country stays hidden.</span></span></label>
              {profErr.save && <div className="err">{profErr.save}</div>}
              <button className="primary" type="submit" disabled={busy}>Create account</button>
            </form>
          )}
        </div>
        </div>
      </div>
      )}
    </div>
  );
}
