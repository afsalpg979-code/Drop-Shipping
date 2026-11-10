import { supabase } from './supabase/client';
const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { data: { session } } = await supabase?.auth.getSession() ?? { data: { session: null } };
  const headers = new Headers(init.headers);
  headers.set('Content-Type','application/json');
  if (session?.access_token) headers.set('Authorization',`Bearer ${session.access_token}`);
  const response = await fetch(`${API}/api${path}`,{...init,headers});
  if (!response.ok) { const body=await response.json().catch(()=>({})); throw new Error(body.error || 'Request failed.'); }
  if(response.status===204) return undefined as T;
  return response.json() as Promise<T>;
}
