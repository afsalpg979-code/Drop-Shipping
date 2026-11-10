import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { supabase, supabaseConfigured } from '../../services/supabase/client';
import './auth.css';

type Mode = 'login' | 'signup' | 'forgot';

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(''); setMessage('');
    if (!supabase || !supabaseConfigured) {
      setError('Store authentication is not configured yet. Add the Supabase URL and anon key to client/.env.local.');
      return;
    }
    if (mode !== 'forgot' && password.length < 8) {
      setError('Use a password with at least 8 characters.'); return;
    }
    if (mode === 'signup' && password !== confirm) {
      setError('Your passwords do not match.'); return;
    }
    setBusy(true);
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(), password,
          options: { data: { full_name: name.trim(), phone: phone.trim() }, emailRedirectTo: window.location.origin + '/auth/callback' },
        });
        if (error) throw error;
        if (data.session) navigate('/account');
        else setMessage('Account created. Check your email and verify your address before signing in.');
      } else if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
        if (error) throw error;
        navigate('/account');
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
          redirectTo: window.location.origin + '/auth/reset-password',
        });
        if (error) throw error;
        setMessage('If an account exists for that email, a password reset link has been sent.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally { setBusy(false); }
  }

  const title = mode === 'signup' ? 'Create your account' : mode === 'forgot' ? 'Reset your password' : 'Welcome back';
  return <main className="auth-page">
    <div className="auth-visual">
      <Link to="/" className="auth-brand">FALCONS<span>STORE</span></Link>
      <div className="auth-visual-copy"><span className="eyebrow">THE FALCONS EXPERIENCE</span><h1>Good finds.<br/><em>Great to have you.</em></h1><p>Sign in to follow your orders, save favourites and enjoy a smoother way to shop.</p></div>
      <small>© {new Date().getFullYear()} FALCONS STORE</small>
    </div>
    <section className="auth-panel">
      <Link to="/" className="auth-back"><ArrowLeft size={16}/> Back to store</Link>
      <div className="auth-card">
        <div className="auth-mark"><ShieldCheck size={21}/></div>
        <span className="eyebrow">YOUR ACCOUNT</span>
        <h2>{title}</h2>
        <p className="auth-subtitle">{mode === 'signup' ? 'Join us and keep everything in one place.' : mode === 'forgot' ? 'Enter your account email and we’ll send a secure reset link.' : 'Enter your details to continue shopping.'}</p>
        <form onSubmit={submit}>
          {mode === 'signup' && <>
            <label>Full name<input autoComplete="name" value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" required maxLength={80}/></label>
            <label>Phone number <span className="optional">(optional)</span><input autoComplete="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+91 98765 43210" maxLength={20}/></label>
          </>}
          <label>Email address<input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" required maxLength={254}/></label>
          {mode !== 'forgot' && <label>Password<div className="password-field"><input type={showPassword?'text':'password'} autoComplete={mode==='signup'?'new-password':'current-password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 8 characters" required minLength={8}/><button type="button" onClick={()=>setShowPassword(!showPassword)} aria-label={showPassword?'Hide password':'Show password'}>{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button></div></label>}
          {mode === 'signup' && <label>Confirm password<input type="password" autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Enter password again" required minLength={8}/></label>}
          {mode === 'login' && <button type="button" className="text-action forgot-link" onClick={()=>{setMode('forgot');setError('');setMessage('');}}>Forgot password?</button>}
          {error && <div className="auth-alert error" role="alert">{error}</div>}
          {message && <div className="auth-alert success" role="status">{message}</div>}
          <button className="auth-submit" disabled={busy}>{busy?'Please wait…':mode==='signup'?'Create account':mode==='forgot'?'Send reset link':'Sign in'}</button>
        </form>
        <div className="auth-switch">{mode==='forgot' ? <>Remembered it? <button className="text-action" onClick={()=>{setMode('login');setMessage('');setError('');}}>Back to sign in</button></> : mode==='login' ? <>New to FALCONS? <button className="text-action" onClick={()=>{setMode('signup');setMessage('');setError('');}}>Create an account</button></> : <>Already have an account? <button className="text-action" onClick={()=>{setMode('login');setMessage('');setError('');}}>Sign in</button></>}</div>
        <p className="auth-legal">By continuing, you agree to our <Link to="/policies/terms">Terms</Link> and <Link to="/policies/privacy">Privacy Policy</Link>.</p>
      </div>
    </section>
  </main>;
}
