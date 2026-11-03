/* ACS DIGITAL — camada de plataforma da versão de produção
 * - Login (Supabase Auth), troca obrigatória da senha temporária, escolha de equipe
 * - Banco: Supabase (tabela documentos com RLS por equipe) + cópia local cifrada (IndexedDB, AES-GCM)
 * - Fila de envio para uso sem internet, detecção de conflitos por versão, tempo real
 * - Expõe window.claude.use('db'|'user'|'downloads') com a mesma interface usada pelo app
 * Nenhuma chave secreta aqui: só a URL do projeto e a chave publicável (o acesso é decidido pelas regras do banco).
 */
(function () {
  'use strict';
  var CFG = window.ACS_CONFIG;
  var sb = window.supabase.createClient(CFG.url, CFG.chave, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: 'acs-auth' },
    realtime: { params: { eventsPerSecond: 5 } }
  });

  var P = { uid: null, perfil: null, equipes: [], unidades: [], equipeId: null, nomes: new Map(), idb: null, chave: null, online: true, saindo: false };
  var PAPEL = { administrador: 'Administração', coordenador: 'Coordenação', acs: 'Agente Comunitário de Saúde', visualizador: 'Somente visualização' };
  var ROT_COL = { familias: 'Família', pessoas: 'Pessoa', visitas: 'Visita', agenda: 'Compromisso', pendencias: 'Pendência', config: 'Configurações', metas: 'Meta' };

  function $(s, r) { return (r || document).querySelector(s); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function comTempo(p, ms) { return Promise.race([p, new Promise(function (_, rej) { setTimeout(function () { rej({ code: 'timeout', message: 'Tempo esgotado' }); }, ms); })]); }
  function noop() { }
  function plural(n, a, b) { return n + ' ' + (n === 1 ? a : b); }
  function fmtDH(iso) { try { var d = new Date(iso); return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } }

  // ==========================================================================
  // IndexedDB + criptografia
  // ==========================================================================
  function idbAbrir(nome) {
    return new Promise(function (ok, erro) {
      var r = indexedDB.open(nome, 1);
      r.onupgradeneeded = function () {
        var d = r.result;
        d.createObjectStore('chaves'); d.createObjectStore('meta');
        ['docs', 'fila', 'conflitos'].forEach(function (n) { d.createObjectStore(n, { keyPath: 'k' }).createIndex('equipe', 'equipe'); });
      };
      r.onsuccess = function () { ok(r.result); };
      r.onerror = function () { erro(r.error); };
    });
  }
  function idbGet(store, key) { return new Promise(function (ok, erro) { var r = P.idb.transaction(store).objectStore(store).get(key); r.onsuccess = function () { ok(r.result); }; r.onerror = function () { erro(r.error); }; }); }
  function idbPut(store, val, key) {
    return new Promise(function (ok, erro) {
      var t = P.idb.transaction(store, 'readwrite'), s = t.objectStore(store);
      (Array.isArray(val) ? val : [val]).forEach(function (v) { if (key === undefined) s.put(v); else s.put(v, key); });
      t.oncomplete = function () { ok(); }; t.onerror = t.onabort = function () { erro(t.error); };
    });
  }
  function idbDel(store, key) { return new Promise(function (ok, erro) { var t = P.idb.transaction(store, 'readwrite'); t.objectStore(store).delete(key); t.oncomplete = function () { ok(); }; t.onerror = t.onabort = function () { erro(t.error); }; }); }
  function idbPorEquipe(store, eq) { return new Promise(function (ok, erro) { var r = P.idb.transaction(store).objectStore(store).index('equipe').getAll(eq); r.onsuccess = function () { ok(r.result || []); }; r.onerror = function () { erro(r.error); }; }); }

  var TE = new TextEncoder(), TD = new TextDecoder();
  async function obterChave() {
    var k = await idbGet('chaves', 'principal');
    if (!k) { k = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']); await idbPut('chaves', k, 'principal'); }
    return k;
  }
  async function cifrar(obj) { var iv = crypto.getRandomValues(new Uint8Array(12)); var ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, P.chave, TE.encode(JSON.stringify(obj))); return { iv: iv, ct: ct }; }
  async function decifrar(r) { var pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: r.iv }, P.chave, r.ct); return JSON.parse(TD.decode(pt)); }
  async function guardarMeta(nome, obj) { await idbPut('meta', await cifrar(obj), nome); }
  async function lerMeta(nome) { var r = await idbGet('meta', nome); if (!r) return null; try { return await decifrar(r); } catch (e) { return null; } }

  // ==========================================================================
  // Banco local (espelho do servidor + fila de envio)
  // ==========================================================================
  var L = { mem: new Map(), servidor: new Map(), fila: new Map(), conflitos: new Map(), recusas: new Map(), ouvintes: [], seq: 0, ultimo: null, sincronizado: false, pronto: false, erroSync: null };
  function chave(col, id) { return P.equipeId + '|' + col + '|' + id; }
  function partes(k) { var a = k.indexOf('|'), b = k.indexOf('|', a + 1); return { col: k.slice(a + 1, b), id: k.slice(b + 1) }; }
  function mapaCol(col) { var m = L.mem.get(col); if (!m) { m = new Map(); L.mem.set(col, m); } return m; }
  function recompor(k) {
    var p = partes(k), s = L.servidor.get(k), f = L.fila.get(k), m = mapaCol(p.col);
    var v = f ? { dados: f.dados, excluido: f.excluido } : s ? { dados: s.dados, excluido: s.excluido } : null;
    if (!v || v.excluido) m.delete(p.id); else m.set(p.id, v);
  }
  async function cifrarLinha(k, obj) { var c = await cifrar(obj); return { k: k, equipe: P.equipeId, iv: c.iv, ct: c.ct }; }

  async function carregarLocal() {
    L.mem = new Map(); L.servidor = new Map(); L.fila = new Map(); L.conflitos = new Map();
    var docs = await idbPorEquipe('docs', P.equipeId);
    for (var i = 0; i < docs.length; i++) { try { L.servidor.set(docs[i].k, await decifrar(docs[i])); } catch (e) { } }
    var fila = await idbPorEquipe('fila', P.equipeId);
    for (i = 0; i < fila.length; i++) { try { var it = await decifrar(fila[i]); L.fila.set(it.k, it); if (it.seq > L.seq) L.seq = it.seq; } catch (e) { } }
    var conf = await idbPorEquipe('conflitos', P.equipeId);
    for (i = 0; i < conf.length; i++) { try { var c = await decifrar(conf[i]); L.conflitos.set(c.k, c); } catch (e) { } }
    var m = await lerMeta('sync|' + P.equipeId); L.ultimo = m && m.ultimo || null;
    L.servidor.forEach(function (_, k) { recompor(k); });
    L.fila.forEach(function (_, k) { recompor(k); });
  }

  // --- emissão para o app (mesma forma de snapshot que o app já usa) ---
  var colsPend = new Set(), tEmit = null;
  function agendarEmit(col) {
    colsPend.add(col);
    if (tEmit) return;
    tEmit = setTimeout(function () {
      var cols = colsPend; colsPend = new Set(); tEmit = null;
      L.ouvintes.forEach(function (o) { if (cols.has(o.col)) emitir(o); });
    }, 40);
  }
  function emitirTodos() { L.ouvintes.forEach(emitir); }
  function emitir(o) {
    var m = mapaCol(o.col), meta = { fromCache: !L.sincronizado, hasPendingWrites: L.fila.size > 0 };
    try {
      if (o.docId != null) {
        var x = m.get(o.docId);
        o.cb({ id: o.docId, exists: !!x, data: function () { return x ? x.dados : undefined; }, metadata: meta });
        return;
      }
      var docs = [];
      m.forEach(function (x, id) { docs.push({ id: id, data: function () { return x.dados; } }); });
      o.cb({ docs: docs, size: docs.length, empty: !docs.length, metadata: meta });
    } catch (e) { console.error('ACS: erro ao entregar dados à tela', e); }
  }
  function ouvir(o) {
    L.ouvintes.push(o);
    if (L.pronto) setTimeout(function () { emitir(o); }, 0);
    return function () { L.ouvintes = L.ouvintes.filter(function (x) { return x !== o; }); };
  }

  // --- gravação ---
  async function gravarLocal(col, id, dados, excluir) {
    if (!P.podeEscrever) throw { code: 'invalid_argument', message: 'Perfil somente para visualização.' };
    if (col === 'config' && !PROD.podeConfigurar()) throw { code: 'invalid_argument', message: 'Apenas coordenação e administração alteram as configurações da equipe.' };
    var k = chave(col, id), ant = L.fila.get(k), s = L.servidor.get(k);
    var item = {
      k: k, colecao: col, id: String(id), dados: excluir ? null : JSON.parse(JSON.stringify(dados)), excluido: !!excluir,
      versaoBase: ant ? ant.versaoBase : (s ? s.versao : null), seq: ++L.seq, em: new Date().toISOString()
    };
    L.fila.set(k, item);
    await idbPut('fila', await cifrarLinha(k, item));
    recompor(k); agendarEmit(col); avisarStatus();
    if (!navigator.onLine) return;
    try { await comTempo(descarregar(), 9000); } catch (e) { /* continua na fila */ }
    if (L.recusas.has(item.seq)) { var msg = L.recusas.get(item.seq); L.recusas.delete(item.seq); throw { code: 'invalid_argument', message: msg }; }
  }

  function transitorio(err) {
    var c = err && err.code ? String(err.code) : '';
    if (/^(42|22|23|P0)/.test(c)) return false;
    return true;
  }
  function msgServidor(err) {
    var c = err && err.code ? String(err.code) : '';
    if (c === '42501' || /sem_permissao|permission|row-level/i.test(err && err.message || '')) return 'Sem permissão para alterar este registro.';
    return 'O servidor recusou a alteração (' + (c || 'erro') + ').';
  }

  var emVoo = null, deNovo = false;
  function descarregar() {
    if (emVoo) { deNovo = true; return emVoo; }
    emVoo = (async function () {
      var voltas = 0;
      do { deNovo = false; await processarFila(); voltas++; } while (deNovo && voltas < 20);
    })().catch(function (e) { L.erroSync = e; }).finally(function () { emVoo = null; avisarStatus(); });
    return emVoo;
  }
  async function processarFila() {
    if (!P.equipeId || !navigator.onLine || !L.fila.size) return;
    var itens = Array.from(L.fila.values()).sort(function (a, b) { return a.seq - b.seq; });
    for (var i = 0; i < itens.length; i++) {
      var it = itens[i];
      if (L.fila.get(it.k) !== it) { deNovo = true; continue; }
      var r = await sb.rpc('salvar_documento', { p_equipe: P.equipeId, p_colecao: it.colecao, p_id: it.id, p_dados: it.dados, p_versao_base: it.versaoBase, p_excluido: it.excluido });
      if (r.error) {
        if (transitorio(r.error)) { L.erroSync = r.error; return; }
        await recusar(it, msgServidor(r.error));
        continue;
      }
      L.erroSync = null;
      var res = r.data || {};
      if (res.conflito) { await registrarConflito(it, res); continue; }
      var ant = L.servidor.get(it.k);
      var srv = { colecao: it.colecao, id: it.id, dados: it.excluido ? (ant ? ant.dados : {}) : it.dados, versao: res.versao, excluido: it.excluido, atualizado_em: res.atualizado_em };
      L.servidor.set(it.k, srv);
      await idbPut('docs', await cifrarLinha(it.k, srv));
      var atual = L.fila.get(it.k);
      if (atual === it) { L.fila.delete(it.k); await idbDel('fila', it.k); }
      else if (atual) { atual.versaoBase = res.versao; await idbPut('fila', await cifrarLinha(atual.k, atual)); deNovo = true; }
      recompor(it.k); agendarEmit(it.colecao);
    }
  }
  async function tirarDaFila(it) {
    var atual = L.fila.get(it.k), usado = it;
    if (atual && atual !== it) usado = atual;   // havia edição mais nova do mesmo registro: ela é a "sua versão"
    L.fila.delete(it.k); await idbDel('fila', it.k);
    return usado;
  }
  async function recusar(it, msg) {
    var usado = await tirarDaFila(it);
    L.recusas.set(it.seq, msg); if (usado !== it) L.recusas.set(usado.seq, msg);
    var c = { k: it.k + '#' + usado.seq, equipe: P.equipeId, chave: it.k, colecao: it.colecao, id: it.id, tipo: 'recusada', motivo: msg, minha: usado.dados, minhaExcluido: usado.excluido, em: usado.em };
    L.conflitos.set(c.k, c); await idbPut('conflitos', await cifrarLinha(c.k, c));
    recompor(it.k); agendarEmit(it.colecao); avisarStatus();
  }
  async function registrarConflito(it, res) {
    var srv = { colecao: it.colecao, id: it.id, dados: res.dados, versao: res.versao, excluido: !!res.excluido, atualizado_em: res.atualizado_em };
    L.servidor.set(it.k, srv); await idbPut('docs', await cifrarLinha(it.k, srv));
    var usado = await tirarDaFila(it);
    var c = { k: it.k + '#' + usado.seq, equipe: P.equipeId, chave: it.k, colecao: it.colecao, id: it.id, tipo: 'conflito', minha: usado.dados, minhaExcluido: usado.excluido, em: usado.em, servidorEm: res.atualizado_em };
    L.conflitos.set(c.k, c); await idbPut('conflitos', await cifrarLinha(c.k, c));
    recompor(it.k); agendarEmit(it.colecao); avisarStatus();
    aviso('Um registro foi alterado por outra pessoa enquanto você editava. A versão dela foi mantida e a sua ficou guardada em Minha conta → Conflitos para revisão.', 'erro');
  }

  // --- leitura do servidor ---
  async function aplicarServidor(lista) {
    var linhas = [], cols = new Set();
    for (var i = 0; i < lista.length; i++) {
      var row = lista[i], k = chave(row.colecao, row.id), at = L.servidor.get(k);
      if (at && at.versao > row.versao) continue;
      var o = { colecao: row.colecao, id: row.id, dados: row.dados || {}, versao: row.versao, excluido: !!row.excluido, atualizado_em: row.atualizado_em };
      L.servidor.set(k, o); linhas.push(await cifrarLinha(k, o));
      if (!L.fila.has(k)) { recompor(k); cols.add(row.colecao); }
    }
    if (linhas.length) await idbPut('docs', linhas);
    cols.forEach(agendarEmit);
  }
  var puxando = null;
  function puxar() {
    if (puxando) return puxando;
    puxando = (async function () {
      var eq = P.equipeId, desde = L.ultimo ? new Date(new Date(L.ultimo).getTime() - 120000).toISOString() : null, maior = L.ultimo, de = 0, TAM = 1000;
      for (;;) {
        var q = sb.from('documentos').select('colecao,id,dados,versao,excluido,atualizado_em').eq('equipe_id', eq)
          .order('atualizado_em', { ascending: true }).order('colecao').order('id').range(de, de + TAM - 1);
        if (desde) q = q.gte('atualizado_em', desde);
        var r = await comTempo(q, 20000);
        if (r.error) throw r.error;
        await aplicarServidor(r.data);
        r.data.forEach(function (x) { if (!maior || x.atualizado_em > maior) maior = x.atualizado_em; });
        if (r.data.length < TAM) break;
        de += TAM;
      }
      if (eq !== P.equipeId) return;
      L.ultimo = maior; await guardarMeta('sync|' + eq, { ultimo: maior });
      L.erroSync = null;
      if (!L.sincronizado) { L.sincronizado = true; emitirTodos(); }
    })().finally(function () { puxando = null; avisarStatus(); });
    return puxando;
  }
  var canal = null;
  function assinarTempoReal() {
    if (canal) { try { sb.removeChannel(canal); } catch (e) { } }
    canal = sb.channel('equipe-' + P.equipeId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'documentos', filter: 'equipe_id=eq.' + P.equipeId }, function (p) {
        var n = p.new;
        if (!n || !n.id) return;
        if (n.dados == null) { puxar().catch(noop); return; }   // conteúdo grande não veio no aviso: busca completo
        aplicarServidor([n]).catch(noop);
      })
      .subscribe(function (st) { if (st === 'SUBSCRIBED') puxar().catch(noop); });
  }
  function sincronizarAgora() { return descarregar().then(function () { return puxar(); }); }

  // --- interface esperada pelo app ---
  function documento(col, id) {
    return {
      id: id,
      onSnapshot: function (cb) { return ouvir({ col: col, docId: String(id), cb: cb }); },
      set: function (d) { return gravarLocal(col, id, d, false); },
      delete: function () { return gravarLocal(col, id, null, true); }
    };
  }
  var DB = {
    collection: function (col) { return { onSnapshot: function (cb) { return ouvir({ col: col, cb: cb }); }, doc: function (id) { return documento(col, id); } }; },
    doc: function (caminho) { var i = caminho.indexOf('/'); return documento(caminho.slice(0, i), caminho.slice(i + 1)); }
  };
  var USER = { id: function () { return Promise.resolve(P.uid); }, can: function (p) { return Promise.resolve(p === 'data.write' ? !!P.podeEscrever : true); } };
  var DOWN = {
    save: function (o) {
      var blob = o.data instanceof Blob ? o.data : new Blob([o.data], { type: /\.csv$/i.test(o.filename) ? 'text/csv;charset=utf-8' : /\.pdf$/i.test(o.filename) ? 'application/pdf' : /\.xlsx$/i.test(o.filename) ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'application/octet-stream' });
      var url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = o.filename || 'arquivo'; a.rel = 'noopener'; document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 4000);
      return Promise.resolve(true);
    }
  };

  var resolverPronto, pronto = new Promise(function (r) { resolverPronto = r; });
  window.claude = {
    use: function (nome) {
      return pronto.then(function () {
        if (nome === 'db') return DB; if (nome === 'user') return USER; if (nome === 'downloads') return DOWN;
        throw { code: 'not_granted' };
      });
    }
  };
  var PROD = window.PROD = {
    podeConfigurar: function () { return !!P.perfil && (P.perfil.papel === 'administrador' || P.perfil.papel === 'coordenador') && P.podeEscrever; },
    nomeUsuario: function () { return P.perfil ? P.perfil.nome : ''; },
    nomeDe: function (id) { return (id && P.nomes.get(id)) || ''; },
    pendentes: function () { return L.fila.size; },
    sincronizar: sincronizarAgora
  };

  // ==========================================================================
  // Status (fila / conflitos) e avisos
  // ==========================================================================
  function avisarStatus() {
    var b = $('#btnConta .badge'), n = L.conflitos.size;
    if (b) { b.hidden = !n; b.textContent = n; }
    var t = $('#btnConta'); if (t) t.setAttribute('aria-label', 'Minha conta' + (L.fila.size ? ' — ' + plural(L.fila.size, 'alteração aguardando envio', 'alterações aguardando envio') : '') + (n ? ' — ' + plural(n, 'conflito', 'conflitos') : ''));
    if (window.__acsAtualizarSync) try { window.__acsAtualizarSync(); } catch (e) { }
    if ($('#prodPainel.aberto') && painelAtual === 'conta') renderConta();
  }
  function aviso(msg, tipo) {
    var c = $('#toasts'); if (!c) return;
    var d = document.createElement('div'); d.className = 'toast ' + (tipo || ''); d.textContent = msg; c.appendChild(d);
    setTimeout(function () { d.remove(); }, 7000);
  }

  // ==========================================================================
  // Telas de acesso (cobrem o app até o login terminar)
  // ==========================================================================
  var camada;
  function telaBase(html) {
    if (!camada) {
      camada = document.createElement('div'); camada.id = 'prodAuth';
      document.body.appendChild(camada);
      camada.addEventListener('submit', function (ev) { ev.preventDefault(); ev.stopPropagation(); var f = ev.target; if (ACOES_FORM[f.id]) ACOES_FORM[f.id](f); }, true);
      camada.addEventListener('click', function (ev) { var b = ev.target.closest('[data-pa]'); if (b && ACOES[b.getAttribute('data-pa')]) { ev.preventDefault(); ACOES[b.getAttribute('data-pa')](b); } });
    }
    camada.hidden = false;
    camada.innerHTML = '<div class="pa-caixa"><div class="pa-marca"><span class="pa-logo">' + LOGO + '</span><div><b>ACS DIGITAL</b><small>Acesso restrito a profissionais autorizados</small></div></div>' + html + '</div>';
    var f = camada.querySelector('input:not([type=hidden])'); if (f) setTimeout(function () { try { f.focus(); } catch (e) { } }, 50);
  }
  function esconderTela() { if (camada) { camada.hidden = true; camada.innerHTML = ''; } }
  var LOGO = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1554C0" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M12 13v5M9.5 15.5h5"/></svg>';
  function campo(rot, nome, tipo, extra, valor) { return '<div class="campo"><label class="rot" for="pa_' + nome + '">' + esc(rot) + '</label><input id="pa_' + nome + '" name="' + nome + '" type="' + (tipo || 'text') + '" value="' + esc(valor || '') + '" ' + (extra || '') + '></div>'; }
  function erroEm(f, msg) { var e = f.querySelector('.pa-erro'); if (e) { e.textContent = msg || ''; e.hidden = !msg; } }
  function ocupado(f, sim) { var b = f.querySelector('button[type=submit]'); if (b) { b.disabled = sim; if (sim) b.dataset.t = b.textContent, b.textContent = 'Aguarde…'; else if (b.dataset.t) b.textContent = b.dataset.t; } }
  function senhaOk(s) { return s.length >= 8 && /[A-Za-z]/.test(s) && /\d/.test(s); }

  function telaCarregando(msg) { telaBase('<div class="pa-carreg"><div class="spin"></div>' + esc(msg || 'Carregando…') + '</div>'); }
  function telaLogin(msg) {
    telaBase('<form id="paLogin" autocomplete="on"><h2>Entrar</h2>' + (msg ? '<div class="aviso amarelo">' + esc(msg) + '</div>' : '') +
      campo('E-mail', 'email', 'email', 'autocomplete="username" required inputmode="email"') + campo('Senha', 'senha', 'password', 'autocomplete="current-password" required') +
      '<p class="pa-erro" hidden></p><button type="submit" class="btn pa-larg">Entrar</button></form>' +
      '<p class="contagem pa-nota">Esqueceu a senha? Peça à coordenação ou à administração do sistema para redefinir.</p>' +
      '<p class="pa-nota"><button type="button" class="linkbtn" data-pa="telaConfigurar">Primeira configuração do sistema</button></p>');
  }
  function telaConfigurar() {
    telaBase('<form id="paConfigurar"><h2>Primeira configuração</h2><p class="contagem">Usado uma única vez, para criar a organização, a primeira unidade, a primeira equipe e a conta de administração. Exige o código de configuração definido no servidor.</p>' +
      '<h3>Organização</h3>' + campo('Nome da organização (ex.: Secretaria Municipal de Saúde)', 'organizacao', 'text', 'required') +
      '<div class="pa-g2">' + campo('Município', 'municipio', 'text', 'required') + campo('UF', 'uf', 'text', 'maxlength="2" style="text-transform:uppercase"') + '</div>' +
      '<h3>Unidade e equipe</h3><div class="pa-g2">' + campo('Unidade de saúde', 'unidade', 'text', 'required') + campo('CNES (opcional)', 'cnes', 'text', 'inputmode="numeric"') + '</div>' +
      '<div class="pa-g2">' + campo('Equipe', 'equipe', 'text', 'required') + campo('INE (opcional)', 'ine', 'text', 'inputmode="numeric"') + '</div>' +
      '<h3>Sua conta (administração)</h3>' + campo('Seu nome', 'nome', 'text', 'required autocomplete="name"') + campo('E-mail', 'email', 'email', 'required autocomplete="username"') +
      '<div class="pa-g2">' + campo('Senha', 'senha', 'password', 'required autocomplete="new-password"') + campo('Repita a senha', 'senha2', 'password', 'required autocomplete="new-password"') + '</div>' +
      '<p class="contagem">Mínimo de 8 caracteres, com letras e números.</p>' +
      campo('Código de configuração', 'codigo', 'password', 'required autocomplete="off"') +
      '<p class="pa-erro" hidden></p><div class="btns"><button type="button" class="btn sec" data-pa="telaLogin">Voltar</button><button type="submit" class="btn">Configurar</button></div></form>');
  }
  function telaTrocarSenha(obrigatoria) {
    telaBase('<form id="paTrocar"><h2>' + (obrigatoria ? 'Crie sua senha' : 'Alterar senha') + '</h2>' + (obrigatoria ? '<p class="contagem">Você entrou com uma senha temporária. Crie uma senha pessoal para continuar. Não compartilhe sua senha.</p>' : '') +
      campo('Nova senha', 'senha', 'password', 'required autocomplete="new-password"') + campo('Repita a nova senha', 'senha2', 'password', 'required autocomplete="new-password"') +
      '<p class="contagem">Mínimo de 8 caracteres, com letras e números.</p><p class="pa-erro" hidden></p><div class="btns">' +
      (obrigatoria ? '<button type="button" class="btn sec" data-pa="sairDireto">Sair</button>' : '<button type="button" class="btn sec" data-pa="voltarApp">Cancelar</button>') + '<button type="submit" class="btn">Salvar senha</button></div></form>');
  }
  function telaSemAcesso(msg) { telaBase('<h2>Acesso não liberado</h2><div class="aviso amarelo">' + esc(msg) + '</div><button class="btn sec pa-larg" data-pa="sairDireto">Sair</button>'); }
  function telaEquipes() {
    var porU = {};
    P.equipes.forEach(function (e) { (porU[e.unidade_id] = porU[e.unidade_id] || []).push(e); });
    var nomeU = {}; P.unidades.forEach(function (u) { nomeU[u.id] = u.nome; });
    var h = '<h2>Escolha a equipe</h2><p class="contagem">Você vê apenas os dados da equipe escolhida. Dá para trocar depois em Minha conta.</p>';
    Object.keys(porU).forEach(function (u) {
      h += '<h3>' + esc(nomeU[u] || 'Unidade') + '</h3><div class="lista">' + porU[u].map(function (e) { return '<button type="button" class="item" data-pa="abrirEquipe" data-id="' + e.id + '"><div class="princ"><div class="nome">' + esc(e.nome) + '</div>' + (e.ine ? '<div class="meta"><span>INE ' + esc(e.ine) + '</span></div>' : '') + '</div></button>'; }).join('') + '</div>';
    });
    telaBase(h + '<p class="pa-nota"><button type="button" class="linkbtn" data-pa="sairDireto">Sair</button></p>');
  }

  var ACOES = {
    telaConfigurar: telaConfigurar,
    telaLogin: function () { telaLogin(); },
    sairDireto: function () { sair(true); },
    voltarApp: function () { esconderTela(); },
    abrirEquipe: function (b) { abrirEquipe(b.getAttribute('data-id')); }
  };
  var ACOES_FORM = {
    paLogin: async function (f) {
      erroEm(f, ''); ocupado(f, true);
      try {
        var r = await sb.auth.signInWithPassword({ email: f.email.value.trim().toLowerCase(), password: f.senha.value });
        if (r.error) {
          var m = r.error.message || '';
          erroEm(f, /invalid/i.test(m) ? 'E-mail ou senha incorretos.' : /banned/i.test(m) ? 'Esta conta está desativada. Procure a coordenação.' : /fetch|network/i.test(m) ? 'Sem conexão com o servidor.' : 'Não foi possível entrar agora. Tente novamente.');
          ocupado(f, false); return;
        }
        await entrarComSessao(r.data.session);
      } catch (e) { erroEm(f, 'Sem conexão com o servidor.'); ocupado(f, false); }
    },
    paConfigurar: async function (f) {
      erroEm(f, '');
      if (f.senha.value !== f.senha2.value) return erroEm(f, 'As senhas não conferem.');
      if (!senhaOk(f.senha.value)) return erroEm(f, 'A senha precisa ter pelo menos 8 caracteres, com letras e números.');
      ocupado(f, true);
      var corpo = {}; ['organizacao', 'municipio', 'uf', 'unidade', 'cnes', 'equipe', 'ine', 'nome', 'email', 'senha', 'codigo'].forEach(function (k) { corpo[k] = f[k].value.trim(); });
      corpo.senha = f.senha.value;
      try {
        await chamarFuncao('configurar', corpo);
        var r = await sb.auth.signInWithPassword({ email: corpo.email.toLowerCase(), password: corpo.senha });
        if (r.error) { telaLogin('Configuração concluída. Entre com o e-mail e a senha que você criou.'); return; }
        await entrarComSessao(r.data.session);
      } catch (e) { erroEm(f, e.message); ocupado(f, false); }
    },
    paTrocar: async function (f) {
      erroEm(f, '');
      if (f.senha.value !== f.senha2.value) return erroEm(f, 'As senhas não conferem.');
      if (!senhaOk(f.senha.value)) return erroEm(f, 'A senha precisa ter pelo menos 8 caracteres, com letras e números.');
      ocupado(f, true);
      var r = await sb.auth.updateUser({ password: f.senha.value });
      if (r.error) {
        var m = r.error.message || '', c = r.error.code || '';
        erroEm(f, c === 'same_password' || /different/i.test(m) ? 'A nova senha precisa ser diferente da anterior.' : c === 'weak_password' || /weak/i.test(m) ? 'Senha fraca. Use mais caracteres, misturando letras e números.' : /fetch|network/i.test(m) ? 'Sem conexão com o servidor.' : 'Não foi possível alterar a senha.');
        ocupado(f, false); return;
      }
      await sb.rpc('confirmar_troca_senha');
      var eraObrig = P.perfil && P.perfil.trocar_senha;
      if (P.perfil) { P.perfil.trocar_senha = false; guardarMeta('perfil', { perfil: P.perfil, equipes: P.equipes, unidades: P.unidades }).catch(noop); }
      if (eraObrig && !P.equipeId) escolherEquipe(); else { esconderTela(); aviso('Senha alterada.', 'ok'); }
    }
  };

  async function chamarFuncao(nome, corpo) {
    var r;
    try { r = await sb.functions.invoke(nome, { body: corpo }); }
    catch (e) { throw new Error('Sem conexão com o servidor.'); }
    if (r.error) {
      var m = 'Sem conexão com o servidor.';
      try { var j = await r.error.context.json(); if (j && j.erro) m = j.erro; } catch (e) { }
      throw new Error(m);
    }
    if (r.data && r.data.erro) throw new Error(r.data.erro);
    return r.data;
  }

  // ==========================================================================
  // Início da sessão
  // ==========================================================================
  async function iniciar() {
    telaCarregando('Abrindo o ACS DIGITAL…');
    var s = null;
    try { s = (await sb.auth.getSession()).data.session; } catch (e) { }
    if (!s) return telaLogin();
    await entrarComSessao(s);
  }

  async function entrarComSessao(s) {
    telaCarregando('Verificando seu acesso…');
    P.uid = s.user.id;
    try { P.idb = await idbAbrir('acs-digital-' + P.uid); P.chave = await obterChave(); }
    catch (e) { return telaSemAcesso('Este navegador não permite guardar dados com segurança (modo anônimo ou armazenamento bloqueado). Use o navegador padrão do aparelho.'); }
    var perfil = null;
    try {
      var r = await comTempo(sb.from('perfis').select('*').eq('user_id', P.uid).maybeSingle(), 9000);
      if (r.error) throw r.error;
      perfil = r.data;
      if (!perfil) return telaSemAcesso('Sua conta existe, mas ainda não tem perfil de acesso. Procure a administração do sistema.');
      if (!perfil.ativo) { await apagarLocal(); return telaSemAcesso('Esta conta está desativada. Procure a coordenação.'); }
      var e = await sb.from('equipes').select('id,nome,ine,unidade_id').order('nome');
      var u = await sb.from('unidades').select('id,nome,cnes').order('nome');
      P.equipes = e.data || []; P.unidades = u.data || [];
      P.online = true;
      await guardarMeta('perfil', { perfil: perfil, equipes: P.equipes, unidades: P.unidades });
    } catch (err) {
      if (err && /JWT|PGRST30/.test(String(err.code || '') + (err.message || ''))) { await sb.auth.signOut({ scope: 'local' }).catch(noop); return telaLogin('Sua sessão expirou. Entre novamente.'); }
      var c = await lerMeta('perfil');
      if (!c) return telaLogin('Sem conexão. O primeiro acesso neste aparelho precisa de internet.');
      perfil = c.perfil; P.equipes = c.equipes || []; P.unidades = c.unidades || []; P.online = false;
    }
    P.perfil = perfil;
    P.podeEscrever = perfil.papel !== 'visualizador';
    if (perfil.trocar_senha) {
      if (P.online) return telaTrocarSenha(true);
      return telaSemAcesso('Conecte-se à internet para criar sua senha pessoal.');
    }
    escolherEquipe();
  }

  function escolherEquipe() {
    var lista = P.equipes;
    if (!lista.length) return telaSemAcesso(P.perfil.papel === 'coordenador' ? 'Sua unidade ainda não tem equipes cadastradas. Peça à administração para cadastrar.' : 'Seu perfil ainda não está vinculado a uma equipe. Procure a coordenação.');
    var salvo = null; try { salvo = localStorage.getItem('acs-equipe-' + P.uid); } catch (e) { }
    if (salvo && lista.some(function (e) { return e.id === salvo; })) return abrirEquipe(salvo);
    if (lista.length === 1) return abrirEquipe(lista[0].id);
    telaEquipes();
  }

  async function abrirEquipe(id) {
    if (P.equipeId === id) { esconderTela(); return; }
    if (P.equipeId && P.equipeId !== id) { try { localStorage.setItem('acs-equipe-' + P.uid, id); } catch (e) { } location.reload(); return; }
    telaCarregando('Abrindo os dados da equipe…');
    try { localStorage.setItem('acs-equipe-' + P.uid, id); } catch (e) { }
    P.equipeId = id;
    await carregarLocal();
    L.pronto = true;
    var nm = await lerMeta('nomes|' + id); if (nm) P.nomes = new Map(nm);
    esconderTela(); montarConta(); avisarStatus();
    resolverPronto();
    if (navigator.onLine) {
      puxar().catch(function (e) { L.erroSync = e; });
      descarregar();
      atualizarNomes();
    }
    assinarTempoReal();
    setInterval(function () { if (document.visibilityState === 'visible' && navigator.onLine) { descarregar(); puxar().catch(noop); } }, 120000);
    setInterval(verificarPerfil, 600000);
  }
  async function atualizarNomes() {
    var r = await sb.rpc('nomes_da_equipe', { p_equipe: P.equipeId });
    if (r.error || !r.data) return;
    P.nomes = new Map(r.data.map(function (x) { return [x.user_id, x.nome]; }));
    guardarMeta('nomes|' + P.equipeId, Array.from(P.nomes.entries())).catch(noop);
  }
  async function verificarPerfil() {
    if (!navigator.onLine || !P.uid) return;
    var r = await sb.from('perfis').select('ativo,papel,trocar_senha').eq('user_id', P.uid).maybeSingle();
    if (r.error) return;
    if (!r.data || !r.data.ativo) { aviso('Seu acesso foi encerrado.', 'erro'); setTimeout(function () { sair(true); }, 1500); }
    else if (r.data.papel !== P.perfil.papel) location.reload();
  }

  window.addEventListener('online', function () { if (P.equipeId) { descarregar(); puxar().catch(noop); atualizarNomes(); } avisarStatus(); });
  window.addEventListener('offline', avisarStatus);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible' && P.equipeId && navigator.onLine) { descarregar(); puxar().catch(noop); } });
  sb.auth.onAuthStateChange(function (ev) { if (ev === 'SIGNED_OUT' && P.equipeId && !P.saindo) { P.saindo = true; apagarLocal().finally(function () { location.reload(); }); } });

  async function apagarLocal() {
    try { if (canal) sb.removeChannel(canal); } catch (e) { }
    try { if (P.idb) P.idb.close(); } catch (e) { }
    if (P.uid) await new Promise(function (r) { var q = indexedDB.deleteDatabase('acs-digital-' + P.uid); q.onsuccess = q.onerror = q.onblocked = function () { r(); }; });
    try { Object.keys(localStorage).forEach(function (k) { if (/^acs/i.test(k)) localStorage.removeItem(k); }); } catch (e) { }
  }
  async function sair() {
    P.saindo = true;
    try { await sb.auth.signOut({ scope: 'local' }); } catch (e) { }
    await apagarLocal();
    location.replace(location.pathname);
  }

  // ==========================================================================
  // Minha conta / conflitos / gestão de usuários
  // ==========================================================================
  var painel, painelAtual = null, G = { aba: 'usuarios', ctx: null, form: null, msg: null, saindo: false };
  function montarConta() {
    if ($('#btnConta')) return;
    var b = document.createElement('button');
    b.className = 'voltar sino'; b.id = 'btnConta'; b.setAttribute('aria-label', 'Minha conta');
    b.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg><span class="badge" hidden>0</span>';
    var sync = $('#sync'); sync.parentNode.insertBefore(b, sync);
    b.addEventListener('click', function () { G.saindo = false; abrirPainel('conta'); });
    painel = document.createElement('div'); painel.id = 'prodPainel'; painel.setAttribute('role', 'dialog'); painel.setAttribute('aria-modal', 'true');
    painel.innerHTML = '<div class="caixa" id="prodCaixa"></div>';
    document.body.appendChild(painel);
    painel.addEventListener('click', function (ev) {
      if (ev.target === painel) return fecharPainel();
      var t = ev.target.closest('[data-pp]'); if (!t) return;
      var f = ACOES_P[t.getAttribute('data-pp')]; if (f) { ev.preventDefault(); f(t); }
    });
    painel.addEventListener('submit', function (ev) { ev.preventDefault(); ev.stopPropagation(); var f = FORMS_P[ev.target.id]; if (f) f(ev.target); }, true);
    painel.addEventListener('change', function (ev) { if (ev.target.name === 'papel' && ev.target.form && ev.target.form.id === 'ppUsuario') ajustarEscopo(ev.target.form); });
    document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && painel.classList.contains('aberto')) fecharPainel(); });
  }
  function abrirPainel(qual) { painelAtual = qual; painel.classList.add('aberto'); if (qual === 'conta') renderConta(); else if (qual === 'gestao') carregarGestao(); }
  function fecharPainel() { painel.classList.remove('aberto'); painelAtual = null; }
  function caixa(html) { $('#prodCaixa').innerHTML = html; }
  function nomeEquipe(id) { var e = P.equipes.find(function (x) { return x.id === id; }); return e ? e.nome : ''; }
  function nomeUnidade(id) { var u = P.unidades.find(function (x) { return x.id === id; }); return u ? u.nome : ''; }
  function eqAtual() { return P.equipes.find(function (x) { return x.id === P.equipeId; }) || {}; }

  function descricaoDoc(c) {
    var d = c.minha || {}, s = (L.servidor.get(c.chave) || {}).dados || {};
    var nome = d.nome || s.nome || d.codigo || s.codigo || d.titulo || s.titulo || (d.data ? d.data.split('-').reverse().join('/') : '') || c.id;
    return (ROT_COL[c.colecao] || c.colecao) + ': ' + nome;
  }
  function camposDiferentes(c) {
    var a = c.minha || {}, b = (L.servidor.get(c.chave) || {}).dados || {}, ign = { historico: 1, atualizadoEm: 1, criadoEm: 1 };
    var ks = {}; Object.keys(a).concat(Object.keys(b)).forEach(function (k) { if (!ign[k] && JSON.stringify(a[k]) !== JSON.stringify(b[k])) ks[k] = 1; });
    return Object.keys(ks).map(rotuloCampo);
  }
  var ROT_CAMPOS = { endereco: 'endereço', numero: 'número', complemento: 'complemento', bairro: 'bairro', cep: 'CEP', microarea: 'microárea', telefone: 'telefone', responsavelId: 'responsável', situacao: 'situação', observacoes: 'observações', data: 'data', hora: 'hora', tipo: 'tipo', motivo: 'motivo', orientacoes: 'orientações', encaminhamentos: 'encaminhamentos', resultado: 'resultado', pessoaIds: 'pessoas visitadas', familiaId: 'família', coordenadas: 'localização', condicoes: 'condições de saúde', codigo: 'código', titulo: 'título', status: 'situação' };
  function rotuloCampo(k) {
    if (ROT_CAMPOS[k]) return ROT_CAMPOS[k];
    var c = window.ACSCompletude && (window.ACSCompletude.CAMPOS || []).find(function (x) { return x.chave === k; });
    return c ? c.rotulo : k;
  }

  function renderConta() {
    var p = P.perfil || {}, nFila = L.fila.size, conf = Array.from(L.conflitos.values()), gestor = p.papel === 'administrador' || p.papel === 'coordenador';
    var h = '<div class="pp-topo"><h3>Minha conta</h3><button class="voltar pp-x" data-pp="fechar" aria-label="Fechar">✕</button></div>';
    h += '<div class="card"><div class="nome" style="font-weight:700">' + esc(p.nome) + '</div><div class="contagem" style="margin:2px 0 8px">' + esc(p.email) + '</div><div class="chips"><span class="chip azul">' + esc(PAPEL[p.papel] || p.papel) + '</span></div>' +
      '<p class="contagem mt">Equipe: <b>' + esc(eqAtual().nome || '—') + '</b>' + (nomeUnidade(eqAtual().unidade_id) ? ' · ' + esc(nomeUnidade(eqAtual().unidade_id)) : '') + '</p>' +
      (P.equipes.length > 1 ? '<button class="btn sec peq" data-pp="trocarEquipe">Trocar de equipe</button>' : '') + '</div>';
    h += '<div class="card"><h2>Sincronização</h2>' +
      (nFila ? '<div class="aviso amarelo">' + plural(nFila, 'alteração guardada neste aparelho aguardando envio.', 'alterações guardadas neste aparelho aguardando envio.') + (navigator.onLine ? '' : ' Serão enviadas quando a internet voltar.') + '</div>' : '<p class="contagem">' + (L.sincronizado ? 'Tudo enviado. ' : '') + (navigator.onLine ? 'Conectado.' : 'Sem internet: você pode continuar trabalhando; as alterações ficam guardadas neste aparelho.') + '</p>') +
      (L.erroSync && navigator.onLine ? '<p class="contagem">Última tentativa falhou; o sistema tentará de novo automaticamente.</p>' : '') +
      '<button class="btn sec peq" data-pp="sincronizar"' + (navigator.onLine ? '' : ' disabled') + '>Sincronizar agora</button></div>';
    if (conf.length) {
      h += '<div class="card"><h2>Conflitos para revisar (' + conf.length + ')</h2><p class="contagem">Alterações suas que não foram aplicadas porque o registro foi modificado por outra pessoa, ou porque o servidor recusou. Escolha o que fazer com cada uma.</p>';
      conf.sort(function (a, b) { return a.em < b.em ? 1 : -1; }).forEach(function (c) {
        var dif = c.tipo === 'conflito' ? camposDiferentes(c) : [];
        h += '<div class="pp-conf"><b>' + esc(descricaoDoc(c)) + '</b><div class="contagem">Sua alteração em ' + fmtDH(c.em) + (c.tipo === 'recusada' ? ' · ' + esc(c.motivo) : ' · alterado por outra pessoa em ' + fmtDH(c.servidorEm)) + '</div>' +
          (dif.length ? '<div class="contagem">Campos diferentes: ' + esc(dif.slice(0, 10).join(', ')) + (dif.length > 10 ? '…' : '') + '</div>' : '') +
          '<div class="btns">' + (c.tipo === 'conflito' && P.podeEscrever ? '<button class="btn peq" data-pp="manterMinha" data-k="' + esc(c.k) + '">Aplicar a minha versão</button>' : '') + '<button class="btn sec peq" data-pp="descartar" data-k="' + esc(c.k) + '">' + (c.tipo === 'conflito' ? 'Manter a versão atual' : 'Descartar') + '</button></div></div>';
      });
      h += '</div>';
    }
    h += '<div class="card"><h2>Acesso</h2><div class="btns">' + (gestor ? '<button class="btn sec peq" data-pp="gestao">Usuários e equipes</button>' : '') + '<button class="btn sec peq" data-pp="senha"' + (navigator.onLine ? '' : ' disabled') + '>Alterar minha senha</button></div>';
    if (G.saindo && nFila) h += '<div class="aviso vermelho mt">Há ' + plural(nFila, 'alteração que ainda não foi enviada', 'alterações que ainda não foram enviadas') + '. Se sair agora, ' + (nFila === 1 ? 'ela será perdida' : 'elas serão perdidas') + '. Conecte-se à internet e sincronize antes de sair.</div><div class="btns"><button class="btn sec peq" data-pp="cancelarSair">Cancelar</button><button class="btn perigo peq" data-pp="sairMesmo">Sair e descartar</button></div>';
    else h += '<div class="btns mt"><button class="btn perigo peq" data-pp="sair">Sair deste aparelho</button></div><p class="contagem">Ao sair, os dados guardados neste aparelho são apagados.</p>';
    h += '</div><p class="contagem">ACS DIGITAL não substitui o e-SUS APS nem o prontuário oficial.</p>';
    caixa(h);
  }

  var ACOES_P = {
    fechar: fecharPainel,
    trocarEquipe: function () { fecharPainel(); telaEquipes(); camada.querySelector('.pa-caixa').insertAdjacentHTML('beforeend', '<p class="pa-nota"><button type="button" class="linkbtn" data-pa="voltarApp">Cancelar</button></p>'); },
    sincronizar: function (b) { b.disabled = true; b.textContent = 'Sincronizando…'; sincronizarAgora().then(function () { aviso('Sincronizado.', 'ok'); }).catch(function () { aviso('Não foi possível sincronizar agora.', 'erro'); }).finally(renderConta); },
    manterMinha: async function (b) {
      var c = L.conflitos.get(b.getAttribute('data-k')); if (!c) return;
      L.conflitos.delete(c.k); await idbDel('conflitos', c.k);
      try { await gravarLocal(c.colecao, c.id, c.minha, c.minhaExcluido); aviso('Sua versão foi aplicada.', 'ok'); } catch (e) { aviso(e.message || 'Não foi possível aplicar.', 'erro'); }
      avisarStatus(); renderConta();
    },
    descartar: async function (b) { var k = b.getAttribute('data-k'); L.conflitos.delete(k); await idbDel('conflitos', k); avisarStatus(); renderConta(); },
    gestao: function () { abrirPainel('gestao'); },
    senha: function () { fecharPainel(); telaTrocarSenha(false); },
    sair: function () { if (L.fila.size) { G.saindo = true; renderConta(); } else sair(); },
    cancelarSair: function () { G.saindo = false; renderConta(); },
    sairMesmo: function () { sair(); },
    // gestão
    voltarConta: function () { abrirPainel('conta'); },
    aba: function (b) { G.aba = b.getAttribute('data-v'); G.form = null; G.msg = null; renderGestao(); },
    novoUsuario: function () { G.form = { tipo: 'usuario', novo: true, senha: gerarSenha() }; G.msg = null; renderGestao(); },
    editarUsuario: function (b) { var u = G.ctx.usuarios.find(function (x) { return x.user_id === b.getAttribute('data-id'); }); G.form = { tipo: 'usuario', novo: false, u: u }; G.msg = null; renderGestao(); },
    redefinir: function (b) { var u = G.ctx.usuarios.find(function (x) { return x.user_id === b.getAttribute('data-id'); }); G.form = { tipo: 'redefinir', u: u, senha: gerarSenha() }; G.msg = null; renderGestao(); },
    outraSenha: function () { G.form.senha = gerarSenha(); var i = $('#prodCaixa input[name=senha]'); if (i) i.value = G.form.senha; },
    ativar: function (b) { acaoUsuario({ acao: 'ativar', user_id: b.getAttribute('data-id') }, 'Conta reativada.'); },
    desativar: function (b) { acaoUsuario({ acao: 'desativar', user_id: b.getAttribute('data-id') }, 'Conta desativada. A pessoa perde o acesso imediatamente.'); },
    cancelarForm: function () { G.form = null; renderGestao(); },
    novaUnidade: function () { G.form = { tipo: 'unidade' }; G.msg = null; renderGestao(); },
    novaEquipe: function (b) { G.form = { tipo: 'equipe', unidade_id: b.getAttribute('data-id') }; G.msg = null; renderGestao(); },
    copiar: function (b) { var t = b.getAttribute('data-t'); try { navigator.clipboard.writeText(t).then(function () { aviso('Copiado.', 'ok'); }); } catch (e) { } }
  };

  function gerarSenha() {
    var L1 = 'abcdefghjkmnpqrstuvwxyz', D = '23456789', T = L1 + L1.toUpperCase() + D, a = crypto.getRandomValues(new Uint32Array(12)), s = '';
    for (var i = 0; i < 10; i++) s += T[a[i] % T.length];
    return s.slice(0, 8) + L1[a[10] % L1.length] + D[a[11] % D.length];
  }

  async function carregarGestao() {
    caixa('<div class="pp-topo"><h3>Usuários e equipes</h3><button class="voltar pp-x" data-pp="fechar" aria-label="Fechar">✕</button></div><div class="carregando"><div class="spin"></div>Carregando…</div>');
    try { G.ctx = await chamarFuncao('usuarios', { acao: 'contexto' }); renderGestao(); }
    catch (e) { caixa('<div class="pp-topo"><h3>Usuários e equipes</h3><button class="voltar pp-x" data-pp="fechar" aria-label="Fechar">✕</button></div><div class="aviso vermelho">' + esc(e.message) + '</div><button class="btn sec" data-pp="voltarConta">Voltar</button>'); }
  }
  function opcoes(lista, sel, vazio) { return (vazio ? '<option value="">' + esc(vazio) + '</option>' : '') + lista.map(function (x) { return '<option value="' + x[0] + '"' + (x[0] === sel ? ' selected' : '') + '>' + esc(x[1]) + '</option>'; }).join(''); }
  function selecao(rot, nome, lista, sel, vazio) { return '<div class="campo" data-campo="' + nome + '"><label class="rot">' + esc(rot) + '</label><select name="' + nome + '">' + opcoes(lista, sel, vazio) + '</select></div>'; }
  function ajustarEscopo(f) {
    var p = f.papel.value;
    f.querySelector('[data-campo=unidade_id]').hidden = p !== 'coordenador';
    f.querySelector('[data-campo=equipe_id]').hidden = p === 'coordenador';
    var r = f.querySelector('[data-campo=equipe_id] .rot'); if (r) r.textContent = p === 'administrador' ? 'Equipe principal (opcional)' : 'Equipe';
  }
  function renderGestao() {
    var c = G.ctx, ehAdm = c.eu.papel === 'administrador';
    var eqs = c.equipes.map(function (e) { var u = c.unidades.find(function (x) { return x.id === e.unidade_id; }); return [e.id, e.nome + (u ? ' — ' + u.nome : '')]; });
    var uns = c.unidades.map(function (u) { return [u.id, u.nome]; });
    var nomeE = {}; c.equipes.forEach(function (e) { nomeE[e.id] = e.nome; }); var nomeU = {}; c.unidades.forEach(function (u) { nomeU[u.id] = u.nome; });
    var h = '<div class="pp-topo"><button class="voltar pp-x" data-pp="voltarConta" aria-label="Voltar">‹</button><h3>Usuários e equipes</h3><button class="voltar pp-x" data-pp="fechar" aria-label="Fechar">✕</button></div>';
    if (G.msg) h += '<div class="aviso ' + (G.msg.erro ? 'vermelho' : '') + '">' + G.msg.html + '</div>';
    var f = G.form;
    if (f && f.tipo === 'usuario') {
      var u = f.u || {}, papeis = ehAdm ? [['acs', 'Agente Comunitário de Saúde'], ['visualizador', 'Somente visualização'], ['coordenador', 'Coordenação (unidade)'], ['administrador', 'Administração (organização)']] : [['acs', 'Agente Comunitário de Saúde'], ['visualizador', 'Somente visualização']];
      h += '<form id="ppUsuario" class="card"><h2>' + (f.novo ? 'Nova conta' : 'Editar conta') + '</h2>' + campo('Nome completo', 'nome', 'text', 'required', u.nome) +
        (f.novo ? campo('E-mail (será o login)', 'email', 'email', 'required') : '<p class="contagem">E-mail: <b>' + esc(u.email) + '</b></p>') +
        selecao('Perfil', 'papel', papeis, u.papel || 'acs') + selecao('Unidade', 'unidade_id', uns, u.unidade_id || (uns[0] || [])[0]) + selecao('Equipe', 'equipe_id', eqs, u.equipe_id || '', 'Selecione') +
        (f.novo ? '<div class="campo"><label class="rot">Senha temporária</label><div style="display:flex;gap:8px"><input name="senha" type="text" value="' + esc(f.senha) + '" autocomplete="off" style="flex:1"><button type="button" class="btn sec peq" data-pp="outraSenha">Gerar outra</button></div></div><p class="contagem">Entregue pessoalmente. No primeiro acesso a pessoa cria a própria senha.</p>' : '') +
        '<div class="btns"><button type="button" class="btn sec" data-pp="cancelarForm">Cancelar</button><button type="submit" class="btn">' + (f.novo ? 'Criar conta' : 'Salvar') + '</button></div></form>';
      caixa(h); ajustarEscopo($('#ppUsuario')); return;
    }
    if (f && f.tipo === 'redefinir') {
      h += '<form id="ppRedefinir" class="card"><h2>Redefinir senha</h2><p>' + esc(f.u.nome) + ' · ' + esc(f.u.email) + '</p><div class="campo"><label class="rot">Nova senha temporária</label><div style="display:flex;gap:8px"><input name="senha" type="text" value="' + esc(f.senha) + '" autocomplete="off" style="flex:1"><button type="button" class="btn sec peq" data-pp="outraSenha">Gerar outra</button></div></div><p class="contagem">A pessoa será obrigada a criar uma senha nova no próximo acesso.</p><div class="btns"><button type="button" class="btn sec" data-pp="cancelarForm">Cancelar</button><button type="submit" class="btn">Redefinir</button></div></form>';
      caixa(h); return;
    }
    if (f && f.tipo === 'unidade') {
      h += '<form id="ppUnidade" class="card"><h2>Nova unidade</h2>' + campo('Nome da unidade', 'nome', 'text', 'required') + campo('CNES (opcional)', 'cnes', 'text', 'inputmode="numeric"') + '<div class="btns"><button type="button" class="btn sec" data-pp="cancelarForm">Cancelar</button><button type="submit" class="btn">Criar unidade</button></div></form>';
      caixa(h); return;
    }
    if (f && f.tipo === 'equipe') {
      h += '<form id="ppEquipe" class="card"><h2>Nova equipe</h2><p class="contagem">Unidade: <b>' + esc(nomeU[f.unidade_id]) + '</b></p>' + campo('Nome da equipe', 'nome', 'text', 'required') + campo('INE (opcional)', 'ine', 'text', 'inputmode="numeric"') + '<div class="btns"><button type="button" class="btn sec" data-pp="cancelarForm">Cancelar</button><button type="submit" class="btn">Criar equipe</button></div></form>';
      caixa(h); return;
    }
    h += '<div class="seg pp-abas"><label><input type="radio" name="ppaba" ' + (G.aba === 'usuarios' ? 'checked' : '') + '><span data-pp="aba" data-v="usuarios">Usuários (' + c.usuarios.length + ')</span></label><label><input type="radio" name="ppaba" ' + (G.aba === 'equipes' ? 'checked' : '') + '><span data-pp="aba" data-v="equipes">Unidades e equipes</span></label></div>';
    if (G.aba === 'usuarios') {
      h += '<div class="btns"><button class="btn peq" data-pp="novoUsuario">+ Nova conta</button></div><div class="lista mt">';
      c.usuarios.forEach(function (u) {
        var eu = u.user_id === c.eu.user_id, local = u.papel === 'coordenador' ? nomeU[u.unidade_id] : u.papel === 'administrador' ? 'Toda a organização' : nomeE[u.equipe_id];
        var gerenciavel = ehAdm || u.papel === 'acs' || u.papel === 'visualizador';
        h += '<div class="pp-user' + (u.ativo ? '' : ' inativo') + '"><div><b>' + esc(u.nome) + '</b>' + (eu ? ' <span class="chip azul">você</span>' : '') + (u.ativo ? '' : ' <span class="chip">desativada</span>') + (u.trocar_senha ? ' <span class="chip">senha temporária</span>' : '') +
          '<div class="contagem" style="margin:2px 0 0">' + esc(u.email) + ' · ' + esc(PAPEL[u.papel] || u.papel) + (local ? ' · ' + esc(local) : '') + '</div></div>' +
          (gerenciavel ? '<div class="btns"><button class="btn sec peq" data-pp="editarUsuario" data-id="' + u.user_id + '">Editar</button>' + (eu ? '' : '<button class="btn sec peq" data-pp="redefinir" data-id="' + u.user_id + '">Redefinir senha</button>' + (u.ativo ? '<button class="btn perigo peq" data-pp="desativar" data-id="' + u.user_id + '">Desativar</button>' : '<button class="btn sec peq" data-pp="ativar" data-id="' + u.user_id + '">Reativar</button>')) + '</div>' : '') + '</div>';
      });
      h += '</div><p class="contagem mt">Contas não são apagadas: desative quem deixou a equipe. O histórico de alterações é preservado.</p>';
    } else {
      if (ehAdm) h += '<div class="btns"><button class="btn peq" data-pp="novaUnidade">+ Nova unidade</button></div>';
      c.unidades.forEach(function (u) {
        var es = c.equipes.filter(function (e) { return e.unidade_id === u.id; });
        h += '<div class="card mt"><h2>' + esc(u.nome) + (u.cnes ? ' <span class="chip">CNES ' + esc(u.cnes) + '</span>' : '') + '</h2>' + (es.length ? '<ul class="pp-eqs">' + es.map(function (e) { return '<li>' + esc(e.nome) + (e.ine ? ' <span class="contagem">INE ' + esc(e.ine) + '</span>' : '') + '</li>'; }).join('') + '</ul>' : '<p class="contagem">Nenhuma equipe.</p>') +
          '<button class="btn sec peq" data-pp="novaEquipe" data-id="' + u.id + '">+ Nova equipe</button></div>';
      });
    }
    caixa(h);
  }
  async function acaoUsuario(corpo, ok, extraHtml) {
    try { await chamarFuncao('usuarios', corpo); G.form = null; G.msg = { html: esc(ok) + (extraHtml || '') }; G.ctx = await chamarFuncao('usuarios', { acao: 'contexto' }); }
    catch (e) { G.msg = { erro: true, html: esc(e.message) }; }
    renderGestao();
    var cx = $('#prodCaixa'); if (cx) cx.scrollTop = 0;
  }
  function blocoCredencial(email, senha) {
    var t = 'ACS DIGITAL\nEndereço: ' + location.origin + location.pathname + '\nE-mail: ' + email + '\nSenha temporária: ' + senha;
    return '<div class="pp-cred"><div>E-mail: <b>' + esc(email) + '</b></div><div>Senha temporária: <b>' + esc(senha) + '</b></div><button type="button" class="btn sec peq mt" data-pp="copiar" data-t="' + esc(t) + '">Copiar dados de acesso</button><p class="contagem">Anote ou copie agora: a senha não será exibida de novo.</p></div>';
  }
  async function recarregarEquipes() {
    var e = await sb.from('equipes').select('id,nome,ine,unidade_id').order('nome'), u = await sb.from('unidades').select('id,nome,cnes').order('nome');
    if (!e.error) P.equipes = e.data; if (!u.error) P.unidades = u.data;
    guardarMeta('perfil', { perfil: P.perfil, equipes: P.equipes, unidades: P.unidades }).catch(noop);
  }
  var FORMS_P = {
    ppUsuario: function (f) {
      var papel = f.papel.value, corpo = { nome: f.nome.value.trim(), papel: papel, unidade_id: papel === 'coordenador' ? f.unidade_id.value : null, equipe_id: papel === 'coordenador' ? null : (f.equipe_id.value || null) };
      if (papel !== 'coordenador' && papel !== 'administrador' && !corpo.equipe_id) { G.msg = { erro: true, html: 'Escolha a equipe.' }; return renderGestao(); }
      if (G.form.novo) {
        corpo.acao = 'criar_usuario'; corpo.email = f.email.value.trim().toLowerCase(); corpo.senha = f.senha.value;
        if (!senhaOk(corpo.senha)) { G.msg = { erro: true, html: 'A senha temporária precisa ter 8+ caracteres, com letras e números.' }; return renderGestao(); }
        acaoUsuario(corpo, 'Conta criada para ' + corpo.nome + '.', blocoCredencial(corpo.email, corpo.senha));
      } else { corpo.acao = 'alterar'; corpo.user_id = G.form.u.user_id; acaoUsuario(corpo, 'Alterações salvas.'); }
    },
    ppRedefinir: function (f) {
      var s = f.senha.value; if (!senhaOk(s)) { G.msg = { erro: true, html: 'A senha temporária precisa ter 8+ caracteres, com letras e números.' }; return renderGestao(); }
      acaoUsuario({ acao: 'redefinir_senha', user_id: G.form.u.user_id, senha: s }, 'Senha redefinida para ' + G.form.u.nome + '.', blocoCredencial(G.form.u.email, s));
    },
    ppUnidade: function (f) { acaoUsuario({ acao: 'criar_unidade', nome: f.nome.value.trim(), cnes: f.cnes.value.trim() }, 'Unidade criada.').then(recarregarEquipes); },
    ppEquipe: function (f) { acaoUsuario({ acao: 'criar_equipe', unidade_id: G.form.unidade_id, nome: f.nome.value.trim(), ine: f.ine.value.trim() }, 'Equipe criada.').then(recarregarEquipes); }
  };

  // ==========================================================================
  // Aplicativo instalável (service worker) e aviso de nova versão
  // ==========================================================================
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    var tinhaControle = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.register('sw.js').catch(noop);
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (!tinhaControle) { tinhaControle = true; return; }
      var c = $('#toasts'); if (!c || $('#pp-nova')) return;
      var d = document.createElement('div'); d.className = 'toast ok'; d.id = 'pp-nova';
      d.innerHTML = 'Nova versão do ACS DIGITAL disponível. <button class="linkbtn" style="color:inherit;text-decoration:underline">Atualizar</button>';
      d.querySelector('button').onclick = function () { location.reload(); };
      c.appendChild(d);
    });
  }

  if (!window.isSecureContext || !window.crypto || !crypto.subtle || !window.indexedDB) {
    document.addEventListener('DOMContentLoaded', function () { telaSemAcesso('Este navegador não oferece os recursos de segurança necessários. Atualize o navegador ou use o Chrome/Safari do aparelho.'); });
  } else if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
