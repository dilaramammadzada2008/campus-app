import { useEffect, useRef, useState } from 'react';
import { api, hasToken, setToken } from './api.js';
import { Icon } from './icons.jsx';
import { C, PAGES, S, applyProfile, go, laundryTick, refresh, toast, unreadTotal, useStore } from './store.js';
import Auth, { LogoMark } from './pages/Auth.jsx';
import Rooms from './pages/Rooms.jsx';
import Laundry from './pages/Laundry.jsx';
import Team from './pages/Team.jsx';
import Chat from './pages/Chat.jsx';
import Requests from './pages/Requests.jsx';
import Profile from './pages/Profile.jsx';
import Admin from './pages/Admin.jsx';
import { syncRooms } from './roomSync.js';

const SCREENS = { rooms: Rooms, laundry: Laundry, team: Team, chat: Chat, report: Requests, profile: Profile, admin: Admin };
export const isQuiet = () => { const h = new Date().getHours(); return h >= 22 || h < 7; };

export function signIn(mail, profile, msg, isAdmin) {
  S.user = { mail, isAdmin: Boolean(isAdmin) };
  applyProfile(profile);
  syncRooms(true);
  const v = S.view, my = S.myRoom;
  v.cb = 2; v.ck = my ? Math.max(0, ['A', 'B'].indexOf(my.num[0])) : 0; v.cf = my ? Math.floor(parseInt(my.num.slice(2)) / 100) - 1 : 1;
  let start = 'rooms';
  try { const s = localStorage.getItem('cl-page'); if (s && SCREENS[s]) start = s; } catch { /* storage unavailable */ }
  go(start);
  if (msg) toast(msg);
}

export async function signOut() {
  await api('logout', {});
  setToken(null);
  S.user = null; refresh();
}

function Nav({ k, label }) {
  const unread = k === 'chat' ? unreadTotal() : 0;
  return (
    <button className={'nav' + (S.page === k ? ' on' : '')} onClick={() => go(k)}>
      <Icon name={k} /><span>{label}</span>{unread > 0 && <span className="badge">{unread}</span>}
    </button>
  );
}

export default function App() {
  useStore();
  const [booting, setBooting] = useState(hasToken());
  const quietWas = useRef(null);

  useEffect(() => {
    if (!hasToken()) return;
    api('me').then((r) => {
      if (r.ok) signIn(r.data.email, r.data.profile, null, r.data.isAdmin);
      else if (r.status === 401) setToken(null);
      setBooting(false);
    });
  }, []);

  // Pick up admin decisions on my room request and beds taken by others.
  const signedIn = Boolean(S.user);
  useEffect(() => { if (!signedIn) return; const t = setInterval(() => syncRooms(false), 8000); return () => clearInterval(t); }, [signedIn]);

  // Demo clock: 1 second = 1 laundry minute.
  useEffect(() => { const t = setInterval(laundryTick, 1000); return () => clearInterval(t); }, []);

  useEffect(() => {
    const check = () => {
      const q = isQuiet();
      if (quietWas.current === false && q && S.quietRem !== false) toast("🌙 It's 22:00 — quiet hours have started. No noise until 07:00 (§17).");
      quietWas.current = q; refresh();
    };
    check(); const t = setInterval(check, 30000); return () => clearInterval(t);
  }, []);

  if (booting) return null;
  const toastEl = S.toast && <div className="toast">{S.toast}</div>;
  if (!S.user) return <><Auth />{toastEl}</>;

  const q = isQuiet(), u = S.user, m = S.prefs;
  const pages = u.isAdmin ? [...PAGES, ['admin', 'Admin']] : PAGES;
  const page = pages.some((p) => p[0] === S.page) ? S.page : 'rooms';
  const Screen = SCREENS[page];
  return (
    <>
      <div className="app">
        <aside className="rail">
          <div className="brand"><LogoMark /><span>Campus Life<small>VILNIUS TECH dormitories</small></span></div>
          {pages.map(([k, v]) => <Nav key={k} k={k} label={v} />)}
          <div className="rail-foot">
            <b>{S.myRoom ? 'Room ' + S.myRoom.num : 'No room yet'}</b>
            {S.myRoom ? 'Building 3 · Saulėtekis' : 'Pick a bed in Rooms to register.'}
          </div>
        </aside>
        <main className="main">
          <div className="wrap">
            <div className="top">
              <h1>{pages.find((x) => x[0] === page)[1]}</h1>
              <span className={'chip' + (q ? ' c-warn' : '')} style={{ marginLeft: 'auto' }}>{q ? '🌙 Quiet hours · until 07:00' : 'Quiet hours 22:00–07:00'}</span>
              <button className="who focusable" style={{ borderRadius: 999 }} onClick={() => go('profile')}>
                <span>{u.name} · {C[m.c]} · {m.g === 'F' ? 'female' : 'male'}{S.myRoom ? ' · ' + S.myRoom.num : ''}</span>
                <span className="av">{u.name[0].toUpperCase()}</span>
              </button>
            </div>
            <Screen />
          </div>
        </main>
        <nav className="tabbar">
          {pages.filter(([k]) => k !== 'profile').map(([k, v]) => <Nav key={k} k={k} label={v} />)}
        </nav>
      </div>
      {toastEl}
    </>
  );
}
