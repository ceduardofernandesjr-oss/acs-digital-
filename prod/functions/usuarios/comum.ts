// ACS DIGITAL — utilitários compartilhados das funções de servidor
import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2";

export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json; charset=utf-8" } });
}

export function clienteAdmin(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL")!;
  const chave = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function texto(v: unknown, max = 160): string {
  return String(v ?? "").trim().slice(0, max);
}

export function emailValido(e: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.length <= 254;
}

// Senha: pelo menos 8 caracteres, com letras e números
export function senhaValida(s: string): boolean {
  return typeof s === "string" && s.length >= 8 && s.length <= 72 && /[A-Za-z]/.test(s) && /\d/.test(s);
}

export function iguaisTempoConstante(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a), y = new TextEncoder().encode(b);
  let dif = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) dif |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return dif === 0;
}

export const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const PAPEIS = ["administrador", "coordenador", "acs", "visualizador"];
