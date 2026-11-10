import { useEffect,useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
type Item={id:string;quantity:number;product:{id:string;name:string;price_inr:number;stock_quantity:number;is_active:boolean}};
export default function CartPage(){
 const [items,setItems]=useState<Item[]>([]);const [error,setError]=useState('');const [busy,setBusy]=useState(true);
 async function load(){try{const r=await api<{items:Item[]}>('/cart');setItems(r.items);}catch(e){setError(e instanceof Error?e.message:'Could not load cart.');}finally{setBusy(false);}}
 useEffect(()=>{void load();},[]);
 async function quantity(id:string,value:number){try{if(value<1){await api('/cart/items/'+id,{method:'DELETE'});}else{await api('/cart/items/'+id,{method:'PATCH',body:JSON.stringify({quantity:value})});}await load();}catch(e){setError(e instanceof Error?e.message:'Update failed.');}}
 const total=items.reduce((sum,item)=>sum+item.quantity*Number(item.product?.price_inr||0),0);
 return <main className="commerce-page"><Link to="/" className="brand">FALCONS<span>STORE</span></Link><h1>Your shopping bag</h1>{error&&<p className="error-text">{error}</p>}{busy?<p>Loading cart…</p>:items.length===0?<section className="empty-state"><h2>Your cart is waiting</h2><p>Discover something you'll love.</p><Link className="dark-button" to="/">Continue shopping</Link></section>:<><div className="commerce-list">{items.map(item=><article className="commerce-row" key={item.id}><div><b>{item.product?.name||'Product'}</b><small>₹{Number(item.product?.price_inr||0).toLocaleString('en-IN')} · {item.product?.stock_quantity} in stock</small></div><div className="quantity-control"><button onClick={()=>void quantity(item.id,item.quantity-1)} aria-label="Decrease quantity">−</button><span>{item.quantity}</span><button onClick={()=>void quantity(item.id,item.quantity+1)} aria-label="Increase quantity">+</button></div><b>₹{(item.quantity*Number(item.product?.price_inr||0)).toLocaleString('en-IN')}</b><button className="remove-button" onClick={()=>void quantity(item.id,0)}>Remove</button></article>)}</div><aside className="cart-total"><span>Subtotal</span><b>₹{total.toLocaleString('en-IN',{maximumFractionDigits:2})}</b><small>Shipping and taxes calculated at checkout.</small><button disabled>Checkout (payment setup pending)</button></aside></>}</main>
}
