import { useEffect,useState } from 'react';import { Link } from 'react-router-dom';import { api } from '../../services/api';
type Item={product_id:string;product:{id:string;name:string;price_inr:number;stock_quantity:number}};
export default function WishlistPage(){const [items,setItems]=useState<Item[]>([]);const [error,setError]=useState('');
async function load(){try{const r=await api<{items:Item[]}>('/wishlist');setItems(r.items);}catch(e){setError(e instanceof Error?e.message:'Could not load wishlist.');}}
useEffect(()=>{void load();},[]);
async function remove(id:string){try{await api('/wishlist/'+id,{method:'DELETE'});await load();}catch(e){setError(e instanceof Error?e.message:'Could not remove item.');}}
return <main className="commerce-page"><Link to="/" className="brand">FALCONS<span>STORE</span></Link><h1>Your wishlist</h1>{error&&<p className="error-text">{error}</p>}{items.length===0?<section className="empty-state"><h2>No saved favourites yet</h2><Link to="/">Explore products</Link></section>:<div className="commerce-list">{items.map(item=><article className="commerce-row" key={item.product_id}><div><b>{item.product?.name}</b><small>₹{Number(item.product?.price_inr||0).toLocaleString('en-IN')}</small></div><button className="remove-button" onClick={()=>void remove(item.product_id)}>Remove</button></article>)}</div>}</main>}
