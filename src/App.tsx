import { FormEvent, useEffect, useState } from 'react';

type Reminder = { id: string; title: string; dueAt?: string; completed: boolean };
type ChatMessage = { sender: 'user' | 'helios'; text: string };

export default function App() {
  const [health, setHealth] = useState('Checking backend…');
  const [ai, setAi] = useState(false);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState<ChatMessage[]>([
    { sender: 'helios', text: 'Welcome to HELIOZ AI. Ask for personal-growth guidance, or add a reminder to get started.' }
  ]);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const [h, s] = await Promise.all([fetch('/api/health'), fetch('/api/state')]);
      if (!h.ok || !s.ok) throw new Error('Backend returned an error');
      const hv = await h.json();
      const sv = await s.json();
      setAi(Boolean(hv.ai));
      setReminders(sv.reminders || []);
      setHealth('Backend connected');
    } catch {
      setHealth('Backend unavailable — check the terminal for errors');
    }
  }
  useEffect(() => { void load(); }, []);

  async function addReminder(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const r = await fetch('/api/reminders', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim(), completed: false })
    });
    const data = await r.json();
    if (!r.ok) { alert(data.error || 'Could not save reminder'); return; }
    setReminders(old => [...old, data]);
    setTitle('');
  }

  async function toggleReminder(item: Reminder) {
    const r = await fetch(`/api/reminders/${item.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: !item.completed })
    });
    if (r.ok) setReminders(old => old.map(x => x.id === item.id ? { ...x, completed: !x.completed } : x));
  }

  async function deleteReminder(id: string) {
    const r = await fetch(`/api/reminders/${id}`, { method: 'DELETE' });
    if (r.ok) setReminders(old => old.filter(x => x.id !== id));
  }

  async function sendMessage(e: FormEvent) {
    e.preventDefault();
    const clean = message.trim();
    if (!clean || busy) return;
    const next = [...chat, { sender: 'user' as const, text: clean }];
    setChat(next); setMessage(''); setBusy(true);
    try {
      const r = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: clean, history: next.slice(-10) })
      });
      const data = await r.json();
      setChat(old => [...old, { sender: 'helios', text: r.ok ? (data.text || 'No response returned.') : (data.error || 'Chat failed.') }]);
    } catch {
      setChat(old => [...old, { sender: 'helios', text: 'Could not reach the backend. Check that the server is running.' }]);
    } finally { setBusy(false); }
  }

  return <main className="shell">
    <header className="top">
      <div className="brandmark">H</div>
      <div><p className="eyebrow">YOUR PERSONAL GROWTH PARTNER</p><h1>HELIOZ <span>AI</span></h1></div>
      <div className="status"><i className={health === 'Backend connected' ? 'online' : ''} />{health}</div>
    </header>
    <section className="hero">
      <p className="eyebrow">A LITTLE BETTER, EVERY DAY</p>
      <h2>Find your focus.<br/><em>Build your momentum.</em></h2>
      <p className="sub">A simple space for reflection, reminders and thoughtful guidance.</p>
      <div className="pills"><span>{ai ? 'Gemini AI enabled' : 'Offline assistant mode'}</span><span>Reminders saved locally</span></div>
    </section>
    <div className="columns">
      <section className="panel">
        <div className="sectionhead"><div><p className="eyebrow">STAY INTENTIONAL</p><h3>Your reminders</h3></div><span className="count">{reminders.length}</span></div>
        <form className="addform" onSubmit={addReminder}>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="What do you want to remember?" maxLength={160}/>
          <button type="submit">Add</button>
        </form>
        <div className="reminders">
          {reminders.length === 0 && <p className="empty">No reminders yet. Add one small goal above.</p>}
          {reminders.map(item => <div className="reminder" key={item.id}>
            <button className={`check ${item.completed ? 'checked' : ''}`} onClick={() => void toggleReminder(item)} aria-label="Toggle completed">{item.completed ? '✓' : ''}</button>
            <span className={item.completed ? 'done' : ''}>{item.title}</span>
            <button className="delete" onClick={() => void deleteReminder(item.id)} aria-label="Delete reminder">×</button>
          </div>)}
        </div>
        <div className="note"><strong>Daily thought</strong><p>Progress is built from small actions repeated with care.</p></div>
      </section>
      <section className="panel chatpanel">
        <div className="sectionhead"><div><p className="eyebrow">REFLECT & RESET</p><h3>Talk to HELIOZ</h3></div><span className="spark">✦</span></div>
        <div className="chatlog">
          {chat.map((item, i) => <div className={`bubble ${item.sender}`} key={i}><small>{item.sender === 'user' ? 'YOU' : 'HELIOZ'}</small><p>{item.text}</p></div>)}
          {busy && <p className="empty">Thinking…</p>}
        </div>
        <form className="chatform" onSubmit={sendMessage}>
          <input value={message} onChange={e => setMessage(e.target.value)} placeholder="What’s on your mind?" maxLength={2000}/>
          <button disabled={busy || !message.trim()} type="submit">Send ↗</button>
        </form>
        <p className="hint">AI replies require a Gemini API key. Offline mode remains available without one.</p>
      </section>
    </div>
    <footer>HELIOZ AI <span>·</span> Start small. Stay consistent.</footer>
  </main>;
}
