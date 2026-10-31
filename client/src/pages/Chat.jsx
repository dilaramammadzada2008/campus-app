import { useEffect, useRef, useState } from 'react';
import { S, chat, clock, openThread, refresh } from '../store.js';
import { isQuiet } from '../App.jsx';

export default function Chat() {
  const t = chat.threads.find((x) => x.id === chat.cur);
  const [text, setText] = useState(t.draft || '');
  const msgsRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { if (t.unread) { t.unread = 0; refresh(); } setText(t.draft || ''); if (t.draft) { t.draft = null; inputRef.current?.focus(); } }, [t]);
  useEffect(() => { const el = msgsRef.current; if (el) el.scrollTop = el.scrollHeight; });

  function send(e) {
    e.preventDefault(); const v = text.trim(); if (!v) return;
    t.msgs.push({ from: 'You', t: v, tm: clock() }); setText(''); refresh();
    if (t.kind === 'dm') setTimeout(() => {
      t.msgs.push({ from: t.name, t: "Great! Let's meet tomorrow at 19:00 in B-504 and talk about the idea.", tm: clock() });
      if (!(chat.cur === t.id && S.page === 'chat')) t.unread++;
      refresh();
    }, 1500);
  }

  return (
    <section>
      <div className="chat">
        <div className="threads">
          {chat.threads.map((x) => {
            const last = x.msgs[x.msgs.length - 1];
            return (
              <button key={x.id} className={'th' + (x.id === chat.cur ? ' on' : '')} onClick={() => openThread(x.id)}>
                <span className="av">{x.kind === 'dm' ? x.name[0] : x.kind === 'news' ? '!' : '#'}</span>
                <span style={{ minWidth: 0, flex: 1 }}><span className="t">{x.name}</span><span className="p">{last ? last.from + ': ' + last.t : ''}</span></span>
                {x.unread > 0 && <span className="badge">{x.unread}</span>}
              </button>
            );
          })}
        </div>
        <div className="conv">
          <div className="conv-h"><h3 style={{ fontSize: 16 }}>{t.name}</h3><div className="faint">{t.sub}</div></div>
          <div className="msgs" ref={msgsRef} aria-live="polite">
            {t.msgs.map((m, i) => {
              const mine = m.from === 'You';
              return (
                <div key={i} className={'msg' + (mine ? ' mine' : '')}>
                  {!mine && <span className="from">{m.from}</span>}{m.t}<span className="tm">{m.tm}</span>
                  {m.shown && <span className="tr">✦ {m.tr}</span>}
                  {m.tr && !m.shown && <><br /><button className="linkbtn" onClick={() => { m.shown = true; refresh(); }}>✦ Translate to English ({m.lang})</button></>}
                </div>
              );
            })}
          </div>
          {!t.readonly && (
            <form className="compose" onSubmit={send}>
              <input ref={inputRef} type="text" value={text} onChange={(e) => setText(e.target.value)} placeholder={isQuiet() ? 'Write a message · quiet hours, no voice calls' : 'Write a message'} autoComplete="off" />
              <button className="primary" type="submit">Send</button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
