import 'dotenv/config';
import { z } from 'zod';
const schema = z.object({
  PORT:z.coerce.number().int().positive().default(4000),
  NODE_ENV:z.enum(['development','test','production']).default('development'),
  SUPABASE_URL:z.string().url(),
  SUPABASE_ANON_KEY:z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY:z.string().min(1),
  CORS_ORIGIN:z.string().default('http://localhost:5173'),
  AI_SERVICE_URL:z.string().url().default('http://127.0.0.1:8000'),
  AI_SERVICE_TOKEN:z.string().min(24).optional()
}).superRefine((value, ctx) => {
  if (value.NODE_ENV === 'production' && !value.AI_SERVICE_TOKEN) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['AI_SERVICE_TOKEN'], message: 'AI_SERVICE_TOKEN is required in production.' });
  }
});
export const env = schema.parse(process.env);
