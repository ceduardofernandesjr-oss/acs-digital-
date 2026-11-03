// ACS DIGITAL — configuração inicial (cria organização, unidade, equipe e o 1º administrador)
// Só funciona uma vez e exige o código definido pelo responsável no painel do Supabase
// (segredo ACS_CODIGO_CONFIGURACAO). Depois que existe um administrador, recusa.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { clienteAdmin, cors, emailValido, esperar, iguaisTempoConstante, json, senhaValida, texto } from "./comum.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ erro: "Método não permitido." }, 405);
  try {
    const b = await req.json().catch(() => ({}));
    const codigoServidor = Deno.env.get("ACS_CODIGO_CONFIGURACAO");
    if (!codigoServidor) return json({ erro: "O código de configuração ainda não foi definido no servidor." }, 503);
    if (!iguaisTempoConstante(texto(b.codigo, 200), codigoServidor)) {
      await esperar(1500); // dificulta tentativas em sequência
      return json({ erro: "Código de configuração inválido." }, 403);
    }
    const adm = clienteAdmin();
    const { count, error: eCont } = await adm.from("perfis").select("user_id", { count: "exact", head: true }).eq("papel", "administrador");
    if (eCont) throw eCont;
    if ((count ?? 0) > 0) return json({ erro: "O ACS DIGITAL já foi configurado. Peça uma conta ao administrador." }, 409);

    const d = {
      organizacao: texto(b.organizacao), municipio: texto(b.municipio), uf: texto(b.uf, 2).toUpperCase(),
      unidade: texto(b.unidade), cnes: texto(b.cnes, 20), equipe: texto(b.equipe), ine: texto(b.ine, 20),
      nome: texto(b.nome), email: texto(b.email, 254).toLowerCase(), senha: String(b.senha ?? ""),
    };
    if (!d.organizacao || !d.municipio || !d.unidade || !d.equipe || !d.nome) return json({ erro: "Preencha todos os campos obrigatórios." }, 400);
    if (!emailValido(d.email)) return json({ erro: "E-mail inválido." }, 400);
    if (!senhaValida(d.senha)) return json({ erro: "A senha precisa ter pelo menos 8 caracteres, com letras e números." }, 400);

    const criados: { tabela: string; id: string }[] = [];
    try {
      const { data: org, error: e1 } = await adm.from("organizacoes").insert({ nome: d.organizacao, municipio: d.municipio, uf: d.uf || null }).select().single();
      if (e1) throw e1; criados.push({ tabela: "organizacoes", id: org.id });
      const { data: uni, error: e2 } = await adm.from("unidades").insert({ organizacao_id: org.id, nome: d.unidade, cnes: d.cnes || null }).select().single();
      if (e2) throw e2; criados.push({ tabela: "unidades", id: uni.id });
      const { data: eq, error: e3 } = await adm.from("equipes").insert({ organizacao_id: org.id, unidade_id: uni.id, nome: d.equipe, ine: d.ine || null }).select().single();
      if (e3) throw e3; criados.push({ tabela: "equipes", id: eq.id });
      const { data: u, error: e4 } = await adm.auth.admin.createUser({ email: d.email, password: d.senha, email_confirm: true, user_metadata: { nome: d.nome } });
      if (e4) throw e4;
      const { error: e5 } = await adm.from("perfis").insert({ user_id: u.user.id, organizacao_id: org.id, unidade_id: uni.id, equipe_id: eq.id, papel: "administrador", nome: d.nome, email: d.email, trocar_senha: false });
      if (e5) { await adm.auth.admin.deleteUser(u.user.id); throw e5; }
      return json({ ok: true });
    } catch (e) {
      for (const c of criados.reverse()) await adm.from(c.tabela).delete().eq("id", c.id);
      const msg = String((e as { message?: string }).message || e);
      if (/already|registered|exists/i.test(msg)) return json({ erro: "Este e-mail já está cadastrado." }, 409);
      throw e;
    }
  } catch (e) {
    console.error("configurar", e);
    return json({ erro: "Não foi possível concluir a configuração. Tente novamente." }, 500);
  }
});
