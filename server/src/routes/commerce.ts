import { Router, type Request, type Response, type NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { env } from '../config/env.js';

const router = Router();
const db = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
type Role = 'customer' | 'staff' | 'admin' | 'supplier';
type UserRequest = Request & { user?: { id: string; role: Role; email?: string } };

async function authenticate(req: UserRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) return res.status(401).json({ error: 'Sign in is required.' });
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return res.status(401).json({ error: 'Your session is invalid or expired.' });
  const { data: profile } = await db.from('profiles').select('role,account_status').eq('id', data.user.id).maybeSingle();
  if (profile?.account_status === 'suspended') return res.status(403).json({ error: 'This account is suspended. Please contact store support.' });
  req.user = { id: data.user.id, role: (profile?.role || 'customer') as Role, email: data.user.email };
  next();
}
function allow(...roles: Role[]) {
  return (req: UserRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ error: 'You do not have permission to perform this action.' });
    next();
  };
}
const addItemSchema = z.object({ productId: z.string().uuid(), quantity: z.number().int().min(1).max(99).default(1) });
const quantitySchema = z.object({ quantity: z.number().int().min(1).max(99) });
const ticketSchema = z.object({ subject: z.string().trim().min(4).max(160), message: z.string().trim().min(10).max(5000), category: z.enum(['order','payment','delivery','return','product','account','general']).default('general') });

async function getOrCreateCart(userId: string) {
  const existing = await db.from('carts').select('id').eq('user_id', userId).maybeSingle();
  if (existing.data?.id) return existing.data.id as string;
  const created = await db.from('carts').insert({ user_id: userId }).select('id').single();
  if (created.error) throw created.error;
  return created.data.id as string;
}

router.get('/cart', authenticate, async (req: UserRequest, res) => {
  try {
    const cartId = await getOrCreateCart(req.user!.id);
    const { data, error } = await db.from('cart_items').select('id,quantity,product:products(id,name,slug,price_inr,stock_quantity,is_active,category_id)').eq('cart_id', cartId);
    if (error) throw error;
    return res.json({ items: data || [] });
  } catch { return res.status(500).json({ error: 'Could not load your cart.' }); }
});
router.post('/cart/items', authenticate, async (req: UserRequest, res) => {
  const parsed = addItemSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid product or quantity.' });
  const { data: product } = await db.from('products').select('id,stock_quantity,is_active').eq('id', parsed.data.productId).maybeSingle();
  if (!product?.is_active) return res.status(404).json({ error: 'Product is unavailable.' });
  if (product.stock_quantity < parsed.data.quantity) return res.status(409).json({ error: 'Not enough stock is available.' });
  try {
    const cartId = await getOrCreateCart(req.user!.id);
    const { data: current } = await db.from('cart_items').select('id,quantity').eq('cart_id', cartId).eq('product_id', parsed.data.productId).maybeSingle();
    const nextQuantity = (current?.quantity || 0) + parsed.data.quantity;
    if (nextQuantity > product.stock_quantity || nextQuantity > 99) return res.status(409).json({ error: 'Requested quantity exceeds available stock.' });
    const result = current
      ? await db.from('cart_items').update({ quantity: nextQuantity }).eq('id', current.id).select('id,quantity').single()
      : await db.from('cart_items').insert({ cart_id: cartId, product_id: parsed.data.productId, quantity: parsed.data.quantity }).select('id,quantity').single();
    if (result.error) throw result.error;
    return res.status(201).json({ item: result.data });
  } catch { return res.status(500).json({ error: 'Could not add this item to your cart.' }); }
});
router.patch('/cart/items/:itemId', authenticate, async (req: UserRequest, res) => {
  const parsed = quantitySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Quantity must be between 1 and 99.' });
  const cartId = await getOrCreateCart(req.user!.id);
  const { data: item } = await db.from('cart_items').select('id,product_id,product:products(stock_quantity,is_active)').eq('id', req.params.itemId).eq('cart_id', cartId).maybeSingle();
  if (!item) return res.status(404).json({ error: 'Cart item not found.' });
  const product = Array.isArray(item.product) ? item.product[0] : item.product;
  if (!product?.is_active || parsed.data.quantity > product.stock_quantity) return res.status(409).json({ error: 'Requested quantity is unavailable.' });
  const { data, error } = await db.from('cart_items').update({ quantity: parsed.data.quantity }).eq('id', item.id).select('id,quantity').single();
  if (error) return res.status(500).json({ error: 'Could not update cart item.' });
  return res.json({ item: data });
});
router.delete('/cart/items/:itemId', authenticate, async (req: UserRequest, res) => {
  const cartId = await getOrCreateCart(req.user!.id);
  const { error } = await db.from('cart_items').delete().eq('id', req.params.itemId).eq('cart_id', cartId);
  if (error) return res.status(500).json({ error: 'Could not remove cart item.' });
  return res.status(204).send();
});

router.get('/wishlist', authenticate, async (req: UserRequest, res) => {
  const { data, error } = await db.from('wishlist_items').select('product_id,product:products(id,name,slug,price_inr,stock_quantity,is_active)').eq('user_id', req.user!.id);
  if (error) return res.status(500).json({ error: 'Could not load wishlist.' });
  return res.json({ items: data || [] });
});
router.post('/wishlist/:productId', authenticate, async (req: UserRequest, res) => {
  const id = z.string().uuid().safeParse(req.params.productId);
  if (!id.success) return res.status(400).json({ error: 'Invalid product.' });
  const { data: product } = await db.from('products').select('id,is_active').eq('id', id.data).maybeSingle();
  if (!product?.is_active) return res.status(404).json({ error: 'Product unavailable.' });
  const { error } = await db.from('wishlist_items').upsert({ user_id: req.user!.id, product_id: id.data }, { onConflict: 'user_id,product_id', ignoreDuplicates: true });
  if (error) return res.status(500).json({ error: 'Could not save wishlist item.' });
  return res.status(201).json({ saved: true });
});
router.delete('/wishlist/:productId', authenticate, async (req: UserRequest, res) => {
  const { error } = await db.from('wishlist_items').delete().eq('user_id', req.user!.id).eq('product_id', req.params.productId);
  if (error) return res.status(500).json({ error: 'Could not remove wishlist item.' });
  return res.status(204).send();
});

router.post('/support/tickets', authenticate, async (req: UserRequest, res) => {
  const parsed = ticketSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Please check the subject and message.' });
  let category = parsed.data.category;
  let priority = 'normal';
  let aiSummary: string | null = null;
  let aiSuggestedReply: string | null = null;
  try {
    const ai = await fetch(`${env.AI_SERVICE_URL}/v1/support/assist`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-ai-service-token': env.AI_SERVICE_TOKEN || '' }, body: JSON.stringify({ subject: parsed.data.subject, message: parsed.data.message }), signal: AbortSignal.timeout(8000) });
    if (ai.ok) {
      const result = await ai.json() as { category?: string; priority?: string; summary?: string; suggested_reply?: string };
      if (['order','payment','delivery','return','product','account','general'].includes(result.category || '')) category = result.category as typeof category;
      if (['normal','high'].includes(result.priority || '')) priority = result.priority!;
      aiSummary = result.summary || null; aiSuggestedReply = result.suggested_reply || null;
    }
  } catch { /* Ticket creation must still work when AI is unavailable. */ }
  const { data, error } = await db.from('support_tickets').insert({ user_id: req.user!.id, ...parsed.data, category, priority, ai_summary: aiSummary, ai_suggested_reply: aiSuggestedReply }).select('id,subject,category,priority,status,ai_summary,ai_suggested_reply,created_at').single();
  if (error) return res.status(500).json({ error: 'Could not create support ticket.' });
  return res.status(201).json({ ticket: data });
});
router.get('/support/tickets', authenticate, async (req: UserRequest, res) => {
  let query = db.from('support_tickets').select('id,user_id,subject,message,category,priority,status,ai_summary,ai_suggested_reply,created_at,updated_at').order('created_at', { ascending: false }).limit(100);
  if (req.user!.role !== 'admin' && req.user!.role !== 'staff') query = query.eq('user_id', req.user!.id);
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: 'Could not load support tickets.' });
  return res.json({ tickets: data || [] });
});
router.patch('/support/tickets/:ticketId', authenticate, allow('admin','staff'), async (req: UserRequest, res) => {
  const parsed = z.object({ status: z.enum(['open','in_progress','waiting_customer','resolved','closed']).optional(), priority: z.enum(['low','normal','high','urgent']).optional(), assignedTo: z.string().uuid().nullable().optional() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid ticket update.' });
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (parsed.data.status) patch.status = parsed.data.status;
  if (parsed.data.priority) patch.priority = parsed.data.priority;
  if (parsed.data.assignedTo !== undefined) patch.assigned_to = parsed.data.assignedTo;
  const { data, error } = await db.from('support_tickets').update(patch).eq('id', req.params.ticketId).select('id,status,priority,assigned_to').single();
  if (error) return res.status(500).json({ error: 'Could not update ticket.' });
  return res.json({ ticket: data });
});

router.get('/recommendations', async (req, res) => {
  const categoryId = typeof req.query.categoryId === 'string' ? req.query.categoryId : undefined;
  let query = db.from('products').select('id,name,slug,description,price_inr,stock_quantity,category_id').eq('is_active', true).gt('stock_quantity', 0).limit(8);
  if (categoryId) query = query.eq('category_id', categoryId);
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: 'Could not load recommendations.' });
  return res.json({ items: data || [], strategy: categoryId ? 'category-match' : 'in-stock-recent' });
});

router.get('/admin/overview', authenticate, allow('admin','staff'), async (_req, res) => {
  const [products, orders, customers, tickets, lowStock] = await Promise.all([
    db.from('products').select('id', { count: 'exact', head: true }),
    db.from('orders').select('id,grand_total,status,created_at'),
    db.from('profiles').select('id', { count: 'exact', head: true }).eq('role','customer'),
    db.from('support_tickets').select('id', { count: 'exact', head: true }).in('status',['open','in_progress']),
    db.from('products').select('id,name,sku,stock_quantity').eq('is_active',true).lte('stock_quantity',5).order('stock_quantity').limit(10)
  ]);
  if (orders.error || products.error || customers.error || tickets.error || lowStock.error) return res.status(500).json({ error: 'Could not load admin overview.' });
  const allOrders = orders.data || [];
  const revenue = allOrders.filter(o => !['cancelled','refunded'].includes(o.status)).reduce((sum,o) => sum + Number(o.grand_total || 0),0);
  const today = new Date(); today.setHours(0,0,0,0);
  const todayOrders = allOrders.filter(o => new Date(o.created_at) >= today);
  return res.json({ metrics: { products: products.count || 0, customers: customers.count || 0, orders: allOrders.length, revenueInr: revenue, todayOrders: todayOrders.length, openTickets: tickets.count || 0 }, lowStock: lowStock.data || [], recentOrders: allOrders.slice(-8).reverse() });
});
router.patch('/admin/products/:productId/stock', authenticate, allow('admin','staff'), async (req: UserRequest, res) => {
  const parsed = z.object({ quantity: z.number().int().min(0).max(100000), reason: z.string().trim().min(3).max(120) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Enter a valid stock quantity and reason.' });
  const { data: product } = await db.from('products').select('id,stock_quantity').eq('id',req.params.productId).maybeSingle();
  if (!product) return res.status(404).json({ error: 'Product not found.' });
  const change = parsed.data.quantity - product.stock_quantity;
  const { error: updateError } = await db.from('products').update({ stock_quantity: parsed.data.quantity }).eq('id',product.id);
  if (updateError) return res.status(500).json({ error: 'Could not update inventory.' });
  const { error: logError } = await db.from('inventory_movements').insert({ product_id: product.id, change_quantity: change, reason: parsed.data.reason, actor_id: req.user!.id });
  if (logError) return res.status(500).json({ error: 'Stock updated but inventory history could not be recorded. Contact an administrator.' });
  return res.json({ productId: product.id, previousQuantity: product.stock_quantity, quantity: parsed.data.quantity, change });
});


router.get('/admin/forecast/sales', authenticate, allow('admin','staff'), async (_req, res) => {
  const since = new Date(Date.now() - 90 * 86400000).toISOString();
  const { data, error } = await db.from('orders').select('created_at,grand_total,status').gte('created_at', since).not('status','in','("cancelled","refunded")').order('created_at');
  if (error) return res.status(500).json({ error: 'Could not load sales history.' });
  const daily = new Map<string, { revenue: number; orders: number }>();
  for (let i=89;i>=0;i--) { const d=new Date(); d.setUTCHours(0,0,0,0); d.setUTCDate(d.getUTCDate()-i); daily.set(d.toISOString().slice(0,10),{revenue:0,orders:0}); }
  for (const order of data || []) { const key=order.created_at.slice(0,10); const row=daily.get(key); if(row){row.revenue+=Number(order.grand_total||0);row.orders+=1;} }
  try {
    const response=await fetch(`${env.AI_SERVICE_URL}/v1/forecast/sales`,{method:'POST',headers:{'Content-Type':'application/json','x-ai-service-token':env.AI_SERVICE_TOKEN||''},body:JSON.stringify({history:[...daily.entries()].map(([date,v])=>({date,revenue:v.revenue,orders:v.orders})),horizon_days:30}),signal:AbortSignal.timeout(12000)});
    if(!response.ok) throw new Error('AI forecast unavailable');
    return res.json(await response.json());
  } catch { return res.status(503).json({error:'Sales forecasting service is unavailable.'}); }
});
router.get('/admin/forecast/inventory', authenticate, allow('admin','staff'), async (_req,res) => {
  const { data: products, error }=await db.from('products').select('id,name,stock_quantity').eq('is_active',true).limit(200);
  if(error) return res.status(500).json({error:'Could not load products.'});
  const { data: sold }=await db.from('order_items').select('product_id,quantity,orders!inner(created_at,status)').gte('orders.created_at',new Date(Date.now()-30*86400000).toISOString()).not('orders.status','in','("cancelled","refunded")');
  const items=(products||[]).map(product=>{
    const daily=Array(30).fill(0);
    for(const row of sold||[]){if(row.product_id===product.id){const order=(row as any).orders;const age=Math.floor((Date.now()-new Date(order.created_at).getTime())/86400000);if(age>=0&&age<30)daily[29-age]+=Number(row.quantity||0);}}
    return {product_id:product.id,name:product.name,current_stock:product.stock_quantity,daily_sales:daily,supplier_lead_days:7};
  });
  try{const response=await fetch(`${env.AI_SERVICE_URL}/v1/forecast/inventory`,{method:'POST',headers:{'Content-Type':'application/json','x-ai-service-token':env.AI_SERVICE_TOKEN||''},body:JSON.stringify({items}),signal:AbortSignal.timeout(12000)});if(!response.ok)throw new Error();return res.json(await response.json());}
  catch{return res.status(503).json({error:'Inventory forecasting service is unavailable.'});}
});
router.get('/recommendations/ai', async (req,res) => {
  const query=typeof req.query.q==='string'?req.query.q.slice(0,300):'';
  const categoryId=typeof req.query.categoryId==='string'?req.query.categoryId:undefined;
  const {data:products,error}=await db.from('products').select('id,name,description,price_inr,stock_quantity,category:categories(name)').eq('is_active',true).gt('stock_quantity',0).limit(100);
  if(error)return res.status(500).json({error:'Could not load products.'});
  const candidates=(products||[]).map(p=>({id:p.id,name:p.name,description:p.description||'',category:Array.isArray(p.category)?p.category[0]?.name||'':(p.category as any)?.name||'',price_inr:Number(p.price_inr),stock_quantity:p.stock_quantity}));
  try{
    const response=await fetch(`${env.AI_SERVICE_URL}/v1/recommendations/rank`,{method:'POST',headers:{'Content-Type':'application/json','x-ai-service-token':env.AI_SERVICE_TOKEN||''},body:JSON.stringify({query,preferred_categories:[],products:candidates}),signal:AbortSignal.timeout(8000)});
    if(!response.ok)throw new Error();
    const result=await response.json() as {ranked_product_ids:string[]};
    const byId=new Map((products||[]).map(p=>[p.id,p]));
    return res.json({items:(result.ranked_product_ids||[]).map(id=>byId.get(id)).filter(Boolean),strategy:'ai-content-ranking'});
  }catch{return res.json({items:(products||[]).slice(0,8),strategy:'fallback-popular-in-stock'});}
});


const productAdminSchema=z.object({name:z.string().trim().min(2).max(160),slug:z.string().trim().min(2).max(180).regex(/^[a-z0-9-]+$/),description:z.string().max(10000).optional(),category_id:z.string().uuid().nullable().optional(),price_inr:z.number().positive(),compare_at_price_inr:z.number().positive().nullable().optional(),sku:z.string().trim().max(80).nullable().optional(),stock_quantity:z.number().int().min(0).max(100000),image_url:z.string().url().nullable().optional(),is_active:z.boolean().default(false)});
router.get('/admin/products',authenticate,allow('admin','staff'),async(_req,res)=>{const {data,error}=await db.from('products').select('id,name,slug,sku,price_inr,compare_at_price_inr,stock_quantity,is_active,image_url,category_id,created_at').order('created_at',{ascending:false}).limit(300);if(error)return res.status(500).json({error:'Could not load products.'});return res.json({products:data||[]});});
router.post('/admin/products',authenticate,allow('admin','staff'),async(req,res)=>{const parsed=productAdminSchema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'Please check the product fields.'});const {data,error}=await db.from('products').insert(parsed.data).select('*').single();if(error)return res.status(400).json({error:'Product could not be created. Check SKU and slug uniqueness.'});return res.status(201).json({product:data});});
router.patch('/admin/products/:productId',authenticate,allow('admin','staff'),async(req,res)=>{const parsed=productAdminSchema.partial().safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'Invalid product update.'});const {data,error}=await db.from('products').update({...parsed.data,updated_at:new Date().toISOString()}).eq('id',req.params.productId).select('*').single();if(error)return res.status(400).json({error:'Product could not be updated.'});return res.json({product:data});});
router.get('/admin/orders',authenticate,allow('admin','staff'),async(_req,res)=>{const {data,error}=await db.from('orders').select('id,order_number,user_id,status,payment_status,currency,grand_total,tracking_number,shipping_provider,created_at').order('created_at',{ascending:false}).limit(200);if(error)return res.status(500).json({error:'Could not load orders.'});return res.json({orders:data||[]});});
router.patch('/admin/orders/:orderId',authenticate,allow('admin','staff'),async(req,res)=>{const parsed=z.object({status:z.enum(['pending','confirmed','processing','shipped','delivered','cancelled','refunded']).optional(),payment_status:z.enum(['pending','paid','failed','partially_refunded','refunded']).optional(),tracking_number:z.string().trim().max(160).nullable().optional(),shipping_provider:z.string().trim().max(120).nullable().optional()}).refine(v=>Object.keys(v).length>0).safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'Invalid order update.'});const patch:Record<string,unknown>={...parsed.data};if(parsed.data.status==='shipped')patch.shipped_at=new Date().toISOString();if(parsed.data.status==='delivered')patch.delivered_at=new Date().toISOString();const {data,error}=await db.from('orders').update(patch).eq('id',req.params.orderId).select('id,order_number,status,payment_status,tracking_number,shipping_provider').single();if(error)return res.status(400).json({error:'Order update failed.'});return res.json({order:data});});
router.get('/admin/customers',authenticate,allow('admin','staff'),async(_req,res)=>{const {data,error}=await db.from('profiles').select('id,full_name,phone,role,account_status,created_at').eq('role','customer').order('created_at',{ascending:false}).limit(300);if(error)return res.status(500).json({error:'Could not load customers.'});return res.json({customers:data||[]});});
router.patch('/admin/customers/:customerId/status',authenticate,allow('admin'),async(req,res)=>{const parsed=z.object({account_status:z.enum(['active','suspended'])}).safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'Invalid account status.'});const {data,error}=await db.from('profiles').update({account_status:parsed.data.account_status}).eq('id',req.params.customerId).eq('role','customer').select('id,account_status').single();if(error)return res.status(400).json({error:'Could not update customer account.'});return res.json({customer:data});});
router.get('/admin/suppliers',authenticate,allow('admin','staff'),async(_req,res)=>{const {data,error}=await db.from('suppliers').select('id,name,email,phone,rating').order('name').limit(300);if(error)return res.status(500).json({error:'Could not load suppliers.'});return res.json({suppliers:data||[]});});
router.post('/admin/suppliers',authenticate,allow('admin','staff'),async(req,res)=>{const parsed=z.object({name:z.string().trim().min(2).max(160),email:z.string().email().nullable().optional(),phone:z.string().max(30).nullable().optional(),rating:z.number().min(0).max(5).nullable().optional()}).safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'Invalid supplier details.'});const {data,error}=await db.from('suppliers').insert(parsed.data).select('*').single();if(error)return res.status(400).json({error:'Could not create supplier.'});return res.status(201).json({supplier:data});});
router.patch('/admin/suppliers/:supplierId',authenticate,allow('admin','staff'),async(req,res)=>{const parsed=z.object({name:z.string().trim().min(2).max(160).optional(),email:z.string().email().nullable().optional(),phone:z.string().max(30).nullable().optional(),rating:z.number().min(0).max(5).nullable().optional()}).refine(v=>Object.keys(v).length>0).safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'Invalid supplier update.'});const {data,error}=await db.from('suppliers').update(parsed.data).eq('id',req.params.supplierId).select('*').single();if(error)return res.status(400).json({error:'Could not update supplier.'});return res.json({supplier:data});});

export default router;
