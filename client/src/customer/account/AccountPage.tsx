import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, Package, UserRound } from 'lucide-react';
import { supabase } from '../../services/supabase/client';

export default function AccountPage(){
  const [email,setEmail]=useState('');
  const [name,setName]=useState('');
  const [loading,setLoading]=useState(true);
  const navigate=useNavigate();
  useEffect(()=>{
    let active=true;
    async function load(){
      if(!supabase){navigate('/auth');return;}
      const {data:{session}}=await supabase.auth.getSession();
      if(!session){navigate('/auth');return;}
      if(!active)return;
      setEmail(session.user.email||'');
      setName(session.user.user_metadata?.full_name||'Customer');
      setLoading(false);
    }
    void load();
    const {data:{subscription}}=supabase?.auth.onAuthStateChange((_event,session)=>{
      if(!session)navigate('/auth');
      else {setEmail(session.user.email||'');setName(session.user.user_metadata?.full_name||'Customer');}
    }) ?? {data:{subscription:{unsubscribe(){}}}};
    return ()=>{active=false;subscription.unsubscribe();};
  },[navigate]);
  async function signOut(){await supabase?.auth.signOut();navigate('/');}
  if(loading)return <div style={{padding:50,textAlign:'center'}}>Loading your account…</div>;
  return <main style={{maxWidth:1050,margin:'50px auto',padding:'0 22px'}}>
    <Link to="/" className="brand">FALCONS<span>STORE</span></Link>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:45,flexWrap:'wrap',gap:16}}>
      <div><span className="eyebrow">MY FALCONS</span><h1 style={{fontSize:38,margin:'8px 0'}}>Hello, {name}</h1><p style={{color:'#888'}}>{email}</p></div>
      <button onClick={signOut} style={{display:'flex',gap:8,alignItems:'center',padding:'12px 16px',border:'1px solid #ddd',background:'#fff',cursor:'pointer'}}><LogOut size={16}/> Sign out</button>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:16,marginTop:30}}>
      <section style={{background:'#f2f0eb',padding:24}}><Package/><h3>My orders</h3><p style={{color:'#777',fontSize:13}}>Your order history and delivery updates will appear here.</p></section>
      <section style={{background:'#f2f0eb',padding:24}}><UserRound/><h3>Profile</h3><p style={{color:'#777',fontSize:13}}>Your account is signed in and ready to use.</p></section>
    </div>
  </main>;
}
