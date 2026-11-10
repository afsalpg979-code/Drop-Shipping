import { useState } from 'react';
import { Bot, MessageCircle, Send, X } from 'lucide-react';

type ChatMessage = { role: 'user' | 'assistant'; content: string };
const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

export default function AIChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: "Hi! I'm the FALCONS STORE assistant. What are you shopping for today?" },
  ]);

  async function sendMessage(event: React.FormEvent) {
    event.preventDefault();
    const value = input.trim();
    if (!value || busy) return;
    const next = [...messages, { role: 'user' as const, content: value }];
    setMessages(next);
    setInput('');
    setBusy(true);
    try {
      const response = await fetch(`${API}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next.slice(-12) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Assistant is temporarily unavailable.');
      setMessages(current => [...current, { role: 'assistant', content: data.reply }]);
    } catch {
      setMessages(current => [...current, { role: 'assistant', content: 'Sorry, I could not connect just now. Please try again shortly.' }]);
    } finally {
      setBusy(false);
    }
  }

  return <div className="ai-widget">
    {open && <section className="ai-panel" aria-label="FALCONS AI shopping assistant">
      <header><span><Bot size={19}/> FALCONS AI <small>Shopping assistant</small></span><button onClick={() => setOpen(false)} aria-label="Close assistant"><X size={18}/></button></header>
      <div className="ai-messages" aria-live="polite">
        {messages.map((message, index) => <p key={index} className={`ai-message ${message.role}`}>{message.content}</p>)}
        {busy && <p className="ai-message assistant">Thinking…</p>}
      </div>
      <form onSubmit={sendMessage}><input value={input} onChange={event => setInput(event.target.value)} maxLength={2000} placeholder="Ask about products…" aria-label="Message the assistant"/><button disabled={busy || !input.trim()} aria-label="Send message"><Send size={17}/></button></form>
      <small className="ai-disclaimer">AI can make mistakes. Verify product, price and order details before purchase.</small>
    </section>}
    <button className="ai-launcher" onClick={() => setOpen(value => !value)} aria-label={open ? 'Close AI assistant' : 'Open AI assistant'}>{open ? <X/> : <MessageCircle/>}<span>Ask AI</span></button>
  </div>;
}
