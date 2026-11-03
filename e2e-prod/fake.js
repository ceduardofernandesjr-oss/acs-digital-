// Servidor Supabase falso, só para testes automatizados (dados 100% fictícios).
// Reproduz as regras do banco real: acesso por equipe/papel, versão, conflito, exclusão lógica.
const crypto = require('crypto');
const URLBASE = 'https://mmgseftxommheneyilzb.supabase.co';

function criar() {
  const S = { users: new Map(), perfis: new Map(), orgs: [], unidades: [], equipes: [], docs: new Map(), tokens: new Map(), relogio: Date.parse('2026-11-03T12:00:00Z'), log: [], ws: [], codigo: 'codigo-teste-123', offline: false, chamadas: [] };
  const agora = () => new Date(S.relogio += 7).toISOString();
  const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
  function sessao(u) {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const tok = b64({ alg: 'HS256', typ: 'JWT' }) + '.' + b64({ sub: u.id, exp, role: 'authenticated', email: u.email }) + '.' + crypto.randomBytes(8).toString('hex');
    S.tokens.set(tok, u.id);
    return { access_token: tok, token_type: 'bearer', expires_in: 3600, expires_at: exp, refresh_token: 'r_' + crypto.randomBytes(6).toString('hex') + '_' + u.id, user: usr(u) };
  }
  const usr = u => ({ id: u.id, aud: 'authenticated', role: 'authenticated', email: u.email, user_metadata: { nome: u.nome }, app_metadata: {}, created_at: '2026-11-01T00:00:00Z' });
  const uidDe = req => S.tokens.get((req.headers()['authorization'] || '').replace(/^Bearer\s+/i, '')) || null;
  const perfilDe = uid => { const p = uid && S.perfis.get(uid); return p && p.ativo ? p : null; };
  function podeEquipe(uid, eqId, escrever) {
    const p = perfilDe(uid), e = S.equipes.find(x => x.id === eqId);
    if (!p || !e) return false;
    if (escrever && p.papel === 'visualizador') return false;
    return (p.papel === 'administrador' && p.organizacao_id === e.organizacao_id) || (p.papel === 'coordenador' && p.unidade_id === e.unidade_id) || (['acs', 'visualizador'].includes(p.papel) && p.equipe_id === e.id);
  }
  function novoUsuario(email, senha, nome) { const u = { id: crypto.randomUUID(), email, senha, nome, banido: false }; S.users.set(email, u); return u; }

  // --- regras do servidor (iguais às do banco) ---
  function salvar(uid, a) {
    const k = a.p_equipe + '|' + a.p_colecao + '|' + a.p_id, at = S.docs.get(k), p = perfilDe(uid);
    const err = () => ({ status: 403, body: { code: '42501', message: 'new row violates row-level security policy' } });
    if (!podeEquipe(uid, a.p_equipe, true)) return err();
    if (a.p_colecao === 'config' && !['administrador', 'coordenador'].includes(p.papel)) return err();
    if (a.p_colecao === 'metas' && a.p_id !== uid && !['administrador', 'coordenador'].includes(p.papel)) return err();
    if (at) {
      if (a.p_versao_base != null && at.versao !== a.p_versao_base) return { body: { conflito: true, versao: at.versao, dados: at.dados, excluido: at.excluido, atualizado_em: at.atualizado_em } };
      Object.assign(at, { dados: a.p_dados == null ? at.dados : a.p_dados, excluido: !!a.p_excluido, versao: at.versao + 1, atualizado_em: agora(), atualizado_por: uid });
    } else S.docs.set(k, { equipe_id: a.p_equipe, colecao: a.p_colecao, id: a.p_id, dados: a.p_dados || {}, excluido: !!a.p_excluido, versao: 1, atualizado_em: agora(), atualizado_por: uid });
    const d = S.docs.get(k);
    S.log.push({ uid, colecao: d.colecao, id: d.id, versao: d.versao, acao: d.versao === 1 ? 'criou' : d.excluido ? 'excluiu' : 'alterou' });
    difundir(d);
    return { body: { ok: true, versao: d.versao, atualizado_em: d.atualizado_em } };
  }
  // alteração feita "por outra pessoa" diretamente no servidor
  function alterarDireto(eq, col, id, fn) { const d = S.docs.get(eq + '|' + col + '|' + id); fn(d.dados); d.versao++; d.atualizado_em = agora(); difundir(d); return d; }

  // --- tempo real (protocolo Phoenix simplificado) ---
  function difundir(d) {
    S.ws.forEach(c => c.inscricoes.forEach(i => {
      if (i.equipe !== d.equipe_id || !podeEquipe(c.uid, d.equipe_id, false)) return;
      const payload = { ids: [i.pgId], data: { type: 'UPDATE', schema: 'public', table: 'documentos', commit_timestamp: d.atualizado_em, columns: [{ name: 'dados', type: 'jsonb' }, { name: 'versao', type: 'int4' }, { name: 'excluido', type: 'bool' }], errors: null, record: Object.assign({}, d), old_record: {} } };
      c.enviar(null, null, i.topic, 'postgres_changes', payload);
    }));
  }
  function ligarWS(ws) {
    if (S.offline) { ws.close(); return; }
    const c = { uid: null, inscricoes: [], enviar(jr, ref, topic, event, payload) { try { ws.send(c.v2 ? JSON.stringify([jr, ref, topic, event, payload]) : JSON.stringify({ join_ref: jr, ref, topic, event, payload })); } catch (e) { } } };
    S.ws.push(c);
    ws.onMessage(m => {
      let msg = JSON.parse(m), jr, ref, topic, event, payload;
      if (Array.isArray(msg)) { c.v2 = true; [jr, ref, topic, event, payload] = msg; } else ({ join_ref: jr, ref, topic, event, payload } = msg);
      if (event === 'heartbeat') return c.enviar(null, ref, 'phoenix', 'phx_reply', { status: 'ok', response: {} });
      if (event === 'phx_join') {
        const tok = payload.access_token; c.uid = S.tokens.get(tok) || c.uid;
        const pcs = ((payload.config || {}).postgres_changes || []).map((p, i) => Object.assign({ id: 1000 + i }, p));
        pcs.forEach(p => { const m2 = /equipe_id=eq\.(.+)$/.exec(p.filter || ''); c.inscricoes.push({ topic, pgId: p.id, equipe: m2 && m2[1] }); });
        c.enviar(jr, ref, topic, 'phx_reply', { status: 'ok', response: { postgres_changes: pcs } });
        return;
      }
      if (event === 'access_token') { c.uid = S.tokens.get(payload.access_token) || c.uid; return c.enviar(jr, ref, topic, 'phx_reply', { status: 'ok', response: {} }); }
      if (event === 'phx_leave') { c.inscricoes = c.inscricoes.filter(i => i.topic !== topic); return c.enviar(jr, ref, topic, 'phx_reply', { status: 'ok', response: {} }); }
      c.enviar(jr, ref, topic, 'phx_reply', { status: 'ok', response: {} });
    });
    ws.onClose(() => { S.ws = S.ws.filter(x => x !== c); });
  }

  // --- funções de servidor ---
  function fnConfigurar(b) {
    if (b.codigo !== S.codigo) return { status: 403, body: { erro: 'Código de configuração inválido.' } };
    if ([...S.perfis.values()].some(p => p.papel === 'administrador')) return { status: 409, body: { erro: 'O ACS DIGITAL já foi configurado. Peça uma conta ao administrador.' } };
    const org = { id: crypto.randomUUID(), nome: b.organizacao }; S.orgs.push(org);
    const un = { id: crypto.randomUUID(), organizacao_id: org.id, nome: b.unidade, cnes: b.cnes || null }; S.unidades.push(un);
    const eq = { id: crypto.randomUUID(), organizacao_id: org.id, unidade_id: un.id, nome: b.equipe, ine: b.ine || null }; S.equipes.push(eq);
    const u = novoUsuario(b.email.toLowerCase(), b.senha, b.nome);
    S.perfis.set(u.id, { user_id: u.id, organizacao_id: org.id, unidade_id: un.id, equipe_id: eq.id, papel: 'administrador', nome: b.nome, email: u.email, ativo: true, trocar_senha: false });
    return { body: { ok: true } };
  }
  function fnUsuarios(uid, b) {
    const eu = perfilDe(uid);
    if (!eu) return { status: 401, body: { erro: 'Sessão expirada. Entre novamente.' } };
    if (!['administrador', 'coordenador'].includes(eu.papel)) return { status: 403, body: { erro: 'Apenas administração e coordenação gerenciam usuários.' } };
    const adm = eu.papel === 'administrador';
    const visU = S.unidades.filter(u => u.organizacao_id === eu.organizacao_id && (adm || u.id === eu.unidade_id));
    const visE = S.equipes.filter(e => e.organizacao_id === eu.organizacao_id && (adm || e.unidade_id === eu.unidade_id));
    const alvo = id => { const p = S.perfis.get(id); return p && p.organizacao_id === eu.organizacao_id && (adm || (p.unidade_id === eu.unidade_id && ['acs', 'visualizador'].includes(p.papel))) ? p : null; };
    function escopo(papel, un, eqId) {
      if (!adm && !['acs', 'visualizador'].includes(papel)) return { erro: 'A coordenação só cria ACS e visualizadores.' };
      if (papel === 'coordenador') { const u = visU.find(x => x.id === un); return u ? { unidade_id: u.id, equipe_id: null } : { erro: 'Escolha a unidade da coordenação.' }; }
      const e = visE.find(x => x.id === eqId);
      if (papel === 'administrador') return { unidade_id: e ? e.unidade_id : null, equipe_id: e ? e.id : null };
      return e ? { unidade_id: e.unidade_id, equipe_id: e.id } : { erro: 'Escolha uma equipe válida.' };
    }
    switch (b.acao) {
      case 'contexto': return { body: { ok: true, eu: { papel: eu.papel, user_id: eu.user_id }, unidades: visU, equipes: visE, usuarios: [...S.perfis.values()].filter(p => p.organizacao_id === eu.organizacao_id && (adm || p.unidade_id === eu.unidade_id)) } };
      case 'criar_usuario': {
        if (S.users.has(b.email)) return { status: 400, body: { erro: 'Este e-mail já tem uma conta.' } };
        const es = escopo(b.papel, b.unidade_id, b.equipe_id); if (es.erro) return { status: 400, body: { erro: es.erro } };
        const u = novoUsuario(b.email, b.senha, b.nome);
        S.perfis.set(u.id, Object.assign({ user_id: u.id, organizacao_id: eu.organizacao_id, papel: b.papel, nome: b.nome, email: b.email, ativo: true, trocar_senha: true }, es));
        return { body: { ok: true, user_id: u.id } };
      }
      case 'redefinir_senha': { const p = alvo(b.user_id); if (!p) return { status: 404, body: { erro: 'Usuário não encontrado ou fora do seu escopo.' } }; S.users.get(p.email).senha = b.senha; p.trocar_senha = p.user_id !== uid; return { body: { ok: true } }; }
      case 'ativar': case 'desativar': { const p = alvo(b.user_id); if (!p) return { status: 404, body: { erro: 'Usuário não encontrado ou fora do seu escopo.' } }; if (p.user_id === uid) return { status: 400, body: { erro: 'Você não pode desativar a própria conta.' } }; p.ativo = b.acao === 'ativar'; S.users.get(p.email).banido = !p.ativo; return { body: { ok: true } }; }
      case 'alterar': { const p = alvo(b.user_id); if (!p) return { status: 404, body: { erro: 'x' } }; const es = escopo(b.papel || p.papel, b.unidade_id, b.equipe_id); if (es.erro) return { status: 400, body: { erro: es.erro } }; Object.assign(p, { nome: b.nome || p.nome, papel: b.papel || p.papel }, es); return { body: { ok: true } }; }
      case 'criar_unidade': { if (!adm) return { status: 403, body: { erro: 'Apenas a administração cria unidades.' } }; const u = { id: crypto.randomUUID(), organizacao_id: eu.organizacao_id, nome: b.nome, cnes: b.cnes || null }; S.unidades.push(u); return { body: { ok: true, unidade: u } }; }
      case 'criar_equipe': { const u = visU.find(x => x.id === b.unidade_id); if (!u) return { status: 400, body: { erro: 'Unidade inválida.' } }; const e = { id: crypto.randomUUID(), organizacao_id: eu.organizacao_id, unidade_id: u.id, nome: b.nome, ine: b.ine || null }; S.equipes.push(e); return { body: { ok: true, equipe: e } }; }
    }
    return { status: 400, body: { erro: 'Ação desconhecida.' } };
  }

  // --- roteamento HTTP ---
  const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS', 'access-control-expose-headers': '*' };
  function responder(route, status, body, extra) {
    return route.fulfill({ status, headers: Object.assign({ 'content-type': 'application/json' }, CORS, extra || {}), body: body === undefined ? '' : JSON.stringify(body) });
  }
  async function rota(route) {
    const req = route.request(), url = new URL(req.url()), m = req.method(), p = url.pathname;
    if (m === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    if (S.offline) return route.abort('internetdisconnected');
    let body = {}; try { body = req.postDataJSON() || {}; } catch (e) { }
    const uid = uidDe(req);
    S.chamadas.push(m + ' ' + p);
    if (p === '/auth/v1/token') {
      const g = url.searchParams.get('grant_type');
      if (g === 'password') {
        const u = S.users.get(String(body.email || '').toLowerCase());
        if (!u || u.senha !== body.password) return responder(route, 400, { code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials' });
        if (u.banido) return responder(route, 400, { code: 400, error_code: 'user_banned', msg: 'User is banned' });
        return responder(route, 200, sessao(u));
      }
      if (g === 'refresh_token') { const id = String(body.refresh_token || '').split('_').pop(); const u = [...S.users.values()].find(x => x.id === id); if (!u || u.banido) return responder(route, 400, { code: 400, error_code: 'refresh_token_not_found', msg: 'Invalid Refresh Token' }); return responder(route, 200, sessao(u)); }
    }
    if (p === '/auth/v1/user') {
      const u = [...S.users.values()].find(x => x.id === uid); if (!u) return responder(route, 401, { code: 401, msg: 'invalid JWT' });
      if (m === 'GET') return responder(route, 200, usr(u));
      if (body.password === u.senha) return responder(route, 422, { code: 422, error_code: 'same_password', msg: 'New password should be different from the old password.' });
      u.senha = body.password; return responder(route, 200, usr(u));
    }
    if (p === '/auth/v1/logout') return route.fulfill({ status: 204, headers: CORS });
    if (p.startsWith('/rest/v1/rpc/')) {
      const fn = p.slice(13);
      if (!uid) return responder(route, 401, { code: 'PGRST301', message: 'JWT expired' });
      if (fn === 'salvar_documento') { const r = salvar(uid, body); return responder(route, r.status || 200, r.body); }
      if (fn === 'salvar_documentos') {
        S.lotes = (S.lotes || 0) + 1;
        if (!Array.isArray(body.p_itens) || body.p_itens.length > 200) return responder(route, 400, { code: '22023', message: 'lote_grande' });
        return responder(route, 200, body.p_itens.map(it => { const r = salvar(uid, { p_equipe: body.p_equipe, p_colecao: it.colecao, p_id: it.id, p_dados: it.dados && typeof it.dados === 'object' ? it.dados : null, p_versao_base: it.versao_base == null ? null : +it.versao_base, p_excluido: !!it.excluido }); return r.status ? { erro: r.body.code, mensagem: r.body.message } : r.body; }));
      }
      if (fn === 'confirmar_troca_senha') { const pf = S.perfis.get(uid); if (pf) pf.trocar_senha = false; return route.fulfill({ status: 204, headers: CORS }); }
      if (fn === 'nomes_da_equipe') { if (!podeEquipe(uid, body.p_equipe, false)) return responder(route, 200, []); const e = S.equipes.find(x => x.id === body.p_equipe); return responder(route, 200, [...S.perfis.values()].filter(x => x.organizacao_id === e.organizacao_id && ((['acs', 'visualizador'].includes(x.papel) && x.equipe_id === e.id) || (x.papel === 'coordenador' && x.unidade_id === e.unidade_id) || x.papel === 'administrador')).map(x => ({ user_id: x.user_id, nome: x.nome, papel: x.papel }))); }
    }
    if (p.startsWith('/rest/v1/')) {
      const tab = p.slice(9), q = url.searchParams, obj = /vnd\.pgrst\.object/.test(req.headers()['accept'] || '');
      if (!uid) return responder(route, 401, { code: 'PGRST301', message: 'JWT expired' });
      const eu = perfilDe(uid);
      let linhas = [];
      if (tab === 'perfis') linhas = [...S.perfis.values()].filter(x => x.user_id === uid);
      else if (tab === 'equipes') linhas = S.equipes.filter(e => podeEquipe(uid, e.id, false));
      else if (tab === 'unidades') linhas = eu ? S.unidades.filter(u => u.organizacao_id === eu.organizacao_id && (eu.papel === 'administrador' || u.id === eu.unidade_id)) : [];
      else if (tab === 'documentos') {
        const eq = (q.get('equipe_id') || '').replace('eq.', ''), gte = (q.get('atualizado_em') || '').replace('gte.', '');
        linhas = [...S.docs.values()].filter(d => d.equipe_id === eq && podeEquipe(uid, eq, false) && (!gte || d.atualizado_em >= gte)).sort((a, b) => a.atualizado_em < b.atualizado_em ? -1 : 1);
        const off = +(q.get('offset') || 0), lim = +(q.get('limit') || 1000); linhas = linhas.slice(off, off + lim);
      }
      const uq = q.get('user_id'); if (uq) linhas = linhas.filter(x => x.user_id === uq.replace('eq.', ''));
      if (obj) return linhas.length ? responder(route, 200, linhas[0]) : responder(route, 406, { code: 'PGRST116', message: 'no rows' });
      return responder(route, 200, linhas.map(x => Object.assign({}, x)));
    }
    if (p === '/functions/v1/configurar') { const r = fnConfigurar(body); return responder(route, r.status || 200, r.body); }
    if (p === '/functions/v1/usuarios') { const r = fnUsuarios(uid, body); return responder(route, r.status || 200, r.body); }
    return responder(route, 404, { message: 'não simulado: ' + m + ' ' + p });
  }
  return { S, rota, ligarWS, alterarDireto, URLBASE };
}
module.exports = { criar };
