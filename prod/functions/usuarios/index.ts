// ACS DIGITAL — gestão de usuários, unidades e equipes
// Administrador: toda a organização. Coordenador: apenas a própria unidade (ACS e visualizadores).
// A identidade de quem chama é verificada aqui (token da sessão), não confiamos no app.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { clienteAdmin, cors, emailValido, json, PAPEIS, senhaValida, texto } from "./comum.ts";

type Perfil = { user_id: string; organizacao_id: string; unidade_id: string | null; equipe_id: string | null; papel: string; nome: string; email: string; ativo: boolean; trocar_senha: boolean };

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ erro: "Método não permitido." }, 405);
  const adm = clienteAdmin();
  try {
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    if (!token) return json({ erro: "Sessão ausente. Entre novamente." }, 401);
    const { data: ud, error: eu } = await adm.auth.getUser(token);
    if (eu || !ud?.user) return json({ erro: "Sessão expirada. Entre novamente." }, 401);
    const { data: eu2 } = await adm.from("perfis").select("*").eq("user_id", ud.user.id).maybeSingle();
    const eu3 = eu2 as Perfil | null;
    if (!eu3 || !eu3.ativo) return json({ erro: "Acesso não autorizado." }, 403);
    if (eu3.papel !== "administrador" && eu3.papel !== "coordenador") return json({ erro: "Apenas administração e coordenação gerenciam usuários." }, 403);
    const ehAdm = eu3.papel === "administrador";

    const b = await req.json().catch(() => ({}));
    const acao = texto(b.acao, 40);

    async function equipeDaOrg(id: string) {
      const { data } = await adm.from("equipes").select("*").eq("id", id).maybeSingle();
      if (!data || data.organizacao_id !== eu3!.organizacao_id) return null;
      if (!ehAdm && data.unidade_id !== eu3!.unidade_id) return null;
      return data;
    }
    async function alvo(id: string) {
      const { data } = await adm.from("perfis").select("*").eq("user_id", id).maybeSingle();
      const p = data as Perfil | null;
      if (!p || p.organizacao_id !== eu3!.organizacao_id) return null;
      if (!ehAdm && (p.unidade_id !== eu3!.unidade_id || !["acs", "visualizador"].includes(p.papel))) return null;
      return p;
    }
    async function escopo(papel: string, unidadeId: string | null, equipeId: string | null) {
      if (!PAPEIS.includes(papel)) return { erro: "Perfil inválido." };
      if (!ehAdm && !["acs", "visualizador"].includes(papel)) return { erro: "A coordenação só cria ACS e visualizadores." };
      if (papel === "administrador") {
        const eq = equipeId ? await equipeDaOrg(equipeId) : null;
        return { unidade_id: eq ? eq.unidade_id : null, equipe_id: eq ? eq.id : null };
      }
      if (papel === "coordenador") {
        const { data: u } = await adm.from("unidades").select("*").eq("id", unidadeId || "00000000-0000-0000-0000-000000000000").maybeSingle();
        if (!u || u.organizacao_id !== eu3!.organizacao_id) return { erro: "Escolha a unidade da coordenação." };
        return { unidade_id: u.id, equipe_id: null };
      }
      const eq = equipeId ? await equipeDaOrg(equipeId) : null;
      if (!eq) return { erro: "Escolha uma equipe válida." };
      return { unidade_id: eq.unidade_id, equipe_id: eq.id };
    }

    if (acao === "contexto") {
      let qU = adm.from("unidades").select("*").eq("organizacao_id", eu3.organizacao_id).order("nome");
      let qE = adm.from("equipes").select("*").eq("organizacao_id", eu3.organizacao_id).order("nome");
      let qP = adm.from("perfis").select("user_id,nome,email,papel,unidade_id,equipe_id,ativo,trocar_senha,criado_em").eq("organizacao_id", eu3.organizacao_id).order("nome");
      if (!ehAdm) { qU = qU.eq("id", eu3.unidade_id!); qE = qE.eq("unidade_id", eu3.unidade_id!); qP = qP.eq("unidade_id", eu3.unidade_id!); }
      const [u, e, p] = await Promise.all([qU, qE, qP]);
      return json({ ok: true, eu: { papel: eu3.papel, user_id: eu3.user_id }, unidades: u.data || [], equipes: e.data || [], usuarios: p.data || [] });
    }

    if (acao === "criar_usuario") {
      const nome = texto(b.nome), email = texto(b.email, 254).toLowerCase(), senha = String(b.senha ?? ""), papel = texto(b.papel, 20);
      if (!nome) return json({ erro: "Informe o nome." }, 400);
      if (!emailValido(email)) return json({ erro: "E-mail inválido." }, 400);
      if (!senhaValida(senha)) return json({ erro: "A senha temporária precisa ter pelo menos 8 caracteres, com letras e números." }, 400);
      const esc = await escopo(papel, b.unidade_id || null, b.equipe_id || null);
      if ("erro" in esc) return json({ erro: esc.erro }, 400);
      const { data: u, error } = await adm.auth.admin.createUser({ email, password: senha, email_confirm: true, user_metadata: { nome } });
      if (error) return json({ erro: /already|registered|exists/i.test(error.message) ? "Este e-mail já tem uma conta." : "Não foi possível criar a conta." }, 400);
      const { error: e2 } = await adm.from("perfis").insert({ user_id: u.user.id, organizacao_id: eu3.organizacao_id, papel, nome, email, trocar_senha: true, ...esc });
      if (e2) { await adm.auth.admin.deleteUser(u.user.id); return json({ erro: "Não foi possível criar o perfil." }, 400); }
      return json({ ok: true, user_id: u.user.id });
    }

    if (acao === "redefinir_senha") {
      const p = await alvo(texto(b.user_id, 64)); if (!p) return json({ erro: "Usuário não encontrado ou fora do seu escopo." }, 404);
      const senha = String(b.senha ?? "");
      if (!senhaValida(senha)) return json({ erro: "A senha temporária precisa ter pelo menos 8 caracteres, com letras e números." }, 400);
      const { error } = await adm.auth.admin.updateUserById(p.user_id, { password: senha });
      if (error) return json({ erro: "Não foi possível redefinir a senha." }, 400);
      await adm.from("perfis").update({ trocar_senha: p.user_id !== eu3.user_id, atualizado_em: new Date().toISOString() }).eq("user_id", p.user_id);
      return json({ ok: true });
    }

    if (acao === "ativar" || acao === "desativar") {
      const p = await alvo(texto(b.user_id, 64)); if (!p) return json({ erro: "Usuário não encontrado ou fora do seu escopo." }, 404);
      if (p.user_id === eu3.user_id) return json({ erro: "Você não pode desativar a própria conta." }, 400);
      const ativo = acao === "ativar";
      if (!ativo && p.papel === "administrador") {
        const { count } = await adm.from("perfis").select("user_id", { count: "exact", head: true }).eq("organizacao_id", eu3.organizacao_id).eq("papel", "administrador").eq("ativo", true);
        if ((count ?? 0) <= 1) return json({ erro: "É preciso manter ao menos um administrador ativo." }, 400);
      }
      await adm.auth.admin.updateUserById(p.user_id, { ban_duration: ativo ? "none" : "876000h" });
      await adm.from("perfis").update({ ativo, atualizado_em: new Date().toISOString() }).eq("user_id", p.user_id);
      return json({ ok: true });
    }

    if (acao === "alterar") {
      const p = await alvo(texto(b.user_id, 64)); if (!p) return json({ erro: "Usuário não encontrado ou fora do seu escopo." }, 404);
      const papel = texto(b.papel, 20) || p.papel;
      if (p.user_id === eu3.user_id && papel !== p.papel) return json({ erro: "Você não pode mudar o próprio perfil." }, 400);
      const esc = await escopo(papel, b.unidade_id ?? p.unidade_id, b.equipe_id ?? p.equipe_id);
      if ("erro" in esc) return json({ erro: esc.erro }, 400);
      const nome = texto(b.nome) || p.nome;
      const { error } = await adm.from("perfis").update({ papel, nome, ...esc, atualizado_em: new Date().toISOString() }).eq("user_id", p.user_id);
      if (error) return json({ erro: "Não foi possível alterar." }, 400);
      return json({ ok: true });
    }

    if (acao === "criar_unidade") {
      if (!ehAdm) return json({ erro: "Apenas a administração cria unidades." }, 403);
      const nome = texto(b.nome); if (!nome) return json({ erro: "Informe o nome da unidade." }, 400);
      const { data, error } = await adm.from("unidades").insert({ organizacao_id: eu3.organizacao_id, nome, cnes: texto(b.cnes, 20) || null }).select().single();
      if (error) return json({ erro: "Não foi possível criar a unidade." }, 400);
      return json({ ok: true, unidade: data });
    }

    if (acao === "criar_equipe") {
      const nome = texto(b.nome); if (!nome) return json({ erro: "Informe o nome da equipe." }, 400);
      const { data: u } = await adm.from("unidades").select("*").eq("id", texto(b.unidade_id, 64) || "00000000-0000-0000-0000-000000000000").maybeSingle();
      if (!u || u.organizacao_id !== eu3.organizacao_id || (!ehAdm && u.id !== eu3.unidade_id)) return json({ erro: "Unidade inválida." }, 400);
      const { data, error } = await adm.from("equipes").insert({ organizacao_id: eu3.organizacao_id, unidade_id: u.id, nome, ine: texto(b.ine, 20) || null }).select().single();
      if (error) return json({ erro: "Não foi possível criar a equipe." }, 400);
      return json({ ok: true, equipe: data });
    }

    return json({ erro: "Ação desconhecida." }, 400);
  } catch (e) {
    console.error("usuarios", e);
    return json({ erro: "Erro no servidor. Tente novamente." }, 500);
  }
});
