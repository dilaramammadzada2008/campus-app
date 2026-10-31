import { C, S, refresh, toast } from '../store.js';
import { signOut } from '../App.jsx';

export default function Profile() {
  const u = S.user, m = S.prefs;
  const setPref = (patch) => { Object.assign(S.prefs, patch); S.view.selB = null; refresh(); };
  return (
    <section className="stack">
      <div className="card stack">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div className="row"><span className="av">{u.name[0].toUpperCase()}</span><div><b>{u.name}</b><div className="faint">{u.mail} · verified</div></div></div>
          <button className="small" onClick={signOut}>Sign out</button>
        </div>
        {u.langs.length > 0 && <div className="faint">Languages: {u.langs.join(', ')}{u.skills.length ? ' · Skills: ' + u.skills.join(', ') : ''}</div>}
        <div className="grid2">
          <div><label className="lbl" htmlFor="pC">Citizenship</label><select id="pC" value={m.c} onChange={(e) => setPref({ c: e.target.value })}>{Object.entries(C).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          <div><label className="lbl" htmlFor="pG">Gender</label><select id="pG" value={m.g} onChange={(e) => setPref({ g: e.target.value })}><option value="F">Female</option><option value="M">Male</option></select></div>
        </div>
        <label className="row" style={{ gap: 8 }}><input type="checkbox" checked={m.p} onChange={(e) => setPref({ p: e.target.checked })} /> I'd like to live with compatriots</label>
        <label className="row" style={{ gap: 8 }}><input type="checkbox" checked={m.show} onChange={(e) => setPref({ show: e.target.checked })} /> Show my country to other students</label>
        <div className="faint">In this prototype the room map updates as soon as you change your profile. All names and data are test data.</div>
      </div>
      <div className="card stack">
        <div className="row" style={{ justifyContent: 'space-between' }}><b>Rule violation points</b><span style={{ fontVariantNumeric: 'tabular-nums' }}>0.00 / 1.00</span></div>
        <div className="meter"><i style={{ width: '0%' }} /></div>
        <div className="faint">Each violation has points (0.25–1.0). When the total reaches 1.0, the administrator proposes eviction from the dormitory (point 26).</div>
      </div>
      <div className="card stack">
        <b>Dormitory rules (short)</b>
        <ul className="rules">
          <li><b>§10–11</b> The administrator assigns your exact place in a room. You register with a signed application, and by signing you confirm you've read the rules. You can't switch rooms in the app.</li>
          <li><b>§14</b> Students of different genders can share a room only with an application to the Student Representation and both sides' consent.</li>
          <li><b>§16</b> Guests 07:00–22:00, registered at the front desk. Overnight stays by application.</li>
          <li><b>§17</b> Quiet hours 22:00–07:00.</li>
          <li><b>§24</b> Not allowed: alcohol, smoking outside designated areas, pets, trading, unregistered guests, appliances over 3 kW in rooms.</li>
          <li><b>§26</b> Eviction is proposed when violation points total 1.0.</li>
        </ul>
        <div className="faint">Source: VILNIUS TECH bendrabučių vidaus tvarkos taisyklės (2020). Check the latest version with the administrator.</div>
        <label className="switch"><input type="checkbox" checked={S.quietRem !== false} onChange={(e) => { S.quietRem = e.target.checked; refresh(); }} /><span>Send a quiet-hours reminder at 22:00</span></label>
        <div className="row"><button className="small" onClick={() => toast("🌙 It's 22:00 — quiet hours have started. No noise until 07:00 (§17).")}>Demo: show the 22:00 notification</button></div>
      </div>
    </section>
  );
}
