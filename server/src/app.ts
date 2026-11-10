import express from 'express'; import cors from 'cors'; import helmet from 'helmet'; import { env } from './config/env.js';
import { z } from 'zod'; import commerceRouter from './routes/commerce.js'; const app=express(); app.disable('x-powered-by'); app.use(helmet()); app.use(cors({origin:env.CORS_ORIGIN.split(',').map(x=>x.trim()),credentials:true})); app.use(express.json({limit:'1mb'})); const chatSchema = z.object({ messages: z.array(z.object({ role: z.enum(['user','assistant']), content: z.string().trim().min(1).max(2000) })).min(1).max(12) });
const aiRate = new Map<string, { count: number; reset: number }>();
app.post('/api/ai/chat', async (req,res) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const bucket = aiRate.get(ip);
  if (!bucket || bucket.reset < now) aiRate.set(ip, { count: 1, reset: now + 60_000 });
  else if (bucket.count >= 12) return res.status(429).json({ error: 'Too many assistant requests. Please wait a minute.' });
  else bucket.count += 1;
  const parsed = chatSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Please send a valid chat message.' });
  try {
    const headers: Record<string,string> = { 'Content-Type': 'application/json' };
    if (env.AI_SERVICE_TOKEN) headers['x-ai-service-token'] = env.AI_SERVICE_TOKEN;
    const upstream = await fetch(`${env.AI_SERVICE_URL}/v1/chat`, { method: 'POST', headers, body: JSON.stringify(parsed.data), signal: AbortSignal.timeout(15_000) });
    if (!upstream.ok) return res.status(502).json({ error: 'Assistant service is temporarily unavailable.' });
    const data = await upstream.json() as { reply?: string; mode?: string };
    if (typeof data.reply !== 'string') return res.status(502).json({ error: 'Invalid assistant response.' });
    return res.json({ reply: data.reply, mode: data.mode });
  } catch { return res.status(503).json({ error: 'Assistant service is offline. Please try again later.' }); }
});
app.use('/api', commerceRouter); app.get('/api/health',(_req,res)=>res.json({ok:true,service:'falcons-store-api',environment:env.NODE_ENV})); app.use((_req,res)=>res.status(404).json({error:'Not found'})); export default app;
