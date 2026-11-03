/* ACS DIGITAL — aplicação (v1: famílias, pessoas, completude, visitas, painel, configurações) */
(function () {
'use strict';
var C = window.ACSCompletude;

// ============================================================================
// Utilidades
// ============================================================================
function $(s, r) { return (r || document).querySelector(s); }
function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function norm(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim(); }
function pad(n) { return n < 10 ? '0' + n : '' + n; }
function isoLocal(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function hojeISO() { return isoLocal(new Date()); }
function agoraHora() { var d = new Date(); return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
function fmtData(iso) { if (!iso) return '—'; var p = String(iso).slice(0, 10).split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : iso; }
function fmtDataHora(iso) { if (!iso) return '—'; var d = new Date(iso); return isNaN(d) ? iso : fmtData(isoLocal(d)) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()); }
function diasDesde(iso) { var d = C.parseData(String(iso || '').slice(0, 10)); if (!d) return null; var h = C.parseData(hojeISO()); return Math.round((h - d) / 86400000); }
function addDias(iso, n) { var d = C.parseData(iso); if (!d) return null; d.setDate(d.getDate() + n); return isoLocal(d); }
function novoId(p) { return p + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
function clone(o) { return o == null ? o : JSON.parse(JSON.stringify(o)); }
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
function plural(n, s, p) { return n + ' ' + (n === 1 ? s : p); }
function maskDig(v, max) { return C.soDigitos(v).slice(0, max); }

// --- Contato por WhatsApp: ícone ao lado do telefone (só com telefone válido) ---
function numeroWhatsApp(tel) {
  var d = C.soDigitos(tel);
  if ((d.length === 12 || d.length === 13) && d.slice(0, 2) === '55') d = d.slice(2);
  return C.validarCampo({ tipo: 'telefone' }, d) === null ? '55' + d : null;
}
function fmtTelefone(tel) {
  var d = C.soDigitos(tel); if ((d.length === 12 || d.length === 13) && d.slice(0, 2) === '55') d = d.slice(2);
  if (d.length === 11) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
  if (d.length === 10) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
  return String(tel || '');
}
var ICO_WA = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path fill="currentColor" d="M5 3h14a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3h-7.6l-4.7 3.6A.8.8 0 0 1 5.4 21v-3H5a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3z"/><circle cx="8" cy="10.5" r="1.4" fill="#fff"/><circle cx="12" cy="10.5" r="1.4" fill="#fff"/><circle cx="16" cy="10.5" r="1.4" fill="#fff"/></svg>';
function iconeWhatsApp(tel) {
  var n = numeroWhatsApp(tel);
  if (!n) return '';
  return '<a class="wa" href="https://wa.me/' + n + '" target="_blank" rel="noopener" aria-label="Abrir conversa no WhatsApp com ' + esc(fmtTelefone(tel)) + '">' + ICO_WA + '</a>';
}
function campoTelefoneWa(nome, valor, extra) {
  return '<div class="telwa"><input type="tel" name="' + nome + '" inputmode="tel" data-wa value="' + esc(valor || '') + '" ' + (extra || '') + '><span class="wa-slot">' + iconeWhatsApp(valor) + '</span></div>';
}

var ICON = {
  home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
  fam: '<path d="M3 21V10l9-7 9 7v11"/><path d="M9 21v-6h6v6"/>',
  pessoa: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
  visita: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 2v4M16 2v4M3 10h18"/><path d="M9 15l2 2 4-4"/>',
  comp: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  conf: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/>',
  mais: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
  add: '<path d="M12 5v14M5 12h14"/>',
  busca: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  alerta: '<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"/>',
  agenda: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 2v4M16 2v4M3 10h18"/>',
  baixar: '<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>'
};
function ico(n, extra) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ' + (extra || '') + '>' + ICON[n] + '</svg>'; }

// ============================================================================
// Estado
// ============================================================================
var CONFIG_PADRAO = {
  agente: '', unidade: '', municipio: '', equipe: '', microareas: '',
  regraSeisAnos: null,
  rotuloAuxilio: 'Possui Auxílio Brasil',
  mesesAtualizacao: 12,
  prazos: { familia: 30, gestante: 30, crianca: 30, hasdm: 30, idoso: 90, acamado: 30 }
};
var SITUACOES_VISITA = ['Visita realizada', 'Morador ausente', 'Recusa', 'Endereço não localizado', 'Imóvel fechado', 'Visita reagendada'];
var TIPOS_VISITA = ['Cadastramento/atualização', 'Visita periódica', 'Busca ativa', 'Acompanhamento', 'Egresso de internação', 'Convite para atividades', 'Orientação/prevenção', 'Outro'];
var SITUACOES_FAMILIA = ['Ativa', 'Mudou-se', 'Inativa', 'Arquivada'];
var SITUACOES_PESSOA = ['Ativo', 'Mudou-se', 'Óbito', 'Inativo'];
var CONDICOES = [
  ['has', 'Hipertensão (HAS)'], ['dm', 'Diabetes (DM)'], ['gestante', 'Gestante'],
  ['acamado', 'Acamado(a)'], ['domiciliado', 'Domiciliado(a)'], ['saude_mental', 'Acompanhamento em saúde mental'],
  ['tuberculose', 'Tuberculose'], ['hanseniase', 'Hanseníase']
];
var FAIXAS = [['0-5', '0 a 5 anos'], ['6', '6 anos'], ['7-11', '7 a 11 anos'], ['12-17', '12 a 17 anos'], ['18-59', '18 a 59 anos'], ['60+', '60 anos ou mais']];

var S = {
  db: null, user: null, me: null, downloads: null, podeEscrever: true,
  familias: new Map(), pessoas: new Map(), visitas: new Map(), config: clone(CONFIG_PADRAO),
  carregado: { familias: false, pessoas: false, visitas: false, config: false },
  view: 'painel', pilha: [], sub: null, filtros: {}, rascunho: null, D: null, salvando: false
};

function cfg() { return S.config; }
function prazo(k) { var p = (S.config.prazos || {})[k]; return p > 0 ? p : CONFIG_PADRAO.prazos[k]; }
function camposDef() { return C.CAMPOS; }
function rotuloCampo(c) { return c.n === 16 && cfg().rotuloAuxilio ? cfg().rotuloAuxilio : c.rotulo; }

// ============================================================================
// Derivados (recalculados quando os dados mudam)
// ============================================================================
function invalidar() { S.D = null; }
function derivados() {
  if (S.D) return S.D;
  var hoje = new Date();
  var comp = new Map(), ultP = new Map(), ultF = new Map(), membros = new Map();
  S.familias.forEach(function (f) { membros.set(f.id, []); });
  S.pessoas.forEach(function (p) {
    comp.set(p.id, C.calcular(p, S.familias.get(p.familiaId) || {}, S.config, hoje));
    if (p.familiaId) { if (!membros.has(p.familiaId)) membros.set(p.familiaId, []); membros.get(p.familiaId).push(p); }
  });
  membros.forEach(function (l) { l.sort(function (a, b) { return norm(a.nome) < norm(b.nome) ? -1 : 1; }); });
  S.visitas.forEach(function (v) {
    if (v.situacao !== 'Visita realizada' || !v.data) return;
    if (!ultF.has(v.familiaId) || ultF.get(v.familiaId) < v.data) ultF.set(v.familiaId, v.data);
    (v.pessoaIds || []).forEach(function (id) { if (!ultP.has(id) || ultP.get(id) < v.data) ultP.set(id, v.data); });
  });
  var famAtivas = Array.from(S.familias.values()).filter(function (f) { return (f.situacao || 'Ativa') === 'Ativa'; });
  var ativos = Array.from(S.pessoas.values()).filter(function (p) {
    var f = S.familias.get(p.familiaId);
    return (p.situacao || 'Ativo') === 'Ativo' && (!f || (f.situacao || 'Ativa') === 'Ativa');
  });
  S.D = { comp: comp, ultP: ultP, ultF: ultF, membros: membros, famAtivas: famAtivas, ativos: ativos };
  return S.D;
}
function idade(p) { return C.idadeEmAnos(p.data_nascimento, new Date()); }
function faixaIdade(i) {
  if (i == null) return null;
  if (i <= 5) return '0-5'; if (i === 6) return '6'; if (i <= 11) return '7-11'; if (i <= 17) return '12-17'; if (i <= 59) return '18-59'; return '60+';
}
function cond(p, k) { return !!(p.condicoes && p.condicoes[k]); }
function semVisita(id, dias, mapa) { var u = mapa.get(id); return !u || diasDesde(u) > dias; }
function desatualizado(p) {
  var ref = p.atualizadoEm || p.criadoEm; if (!ref) return true;
  var d = new Date(ref); var lim = new Date(); lim.setMonth(lim.getMonth() - (cfg().mesesAtualizacao || 12));
  return d < lim;
}
function corEfetiva(r) { return r.faixa ? r.cor : 'indef'; }

function alertas() {
  var D = derivados(), A = D.ativos;
  var l = [];
  function add(chave, titulo, desc, ids, tipo, nivel) { l.push({ chave: chave, titulo: titulo, desc: desc, ids: ids, tipo: tipo || 'pessoas', nivel: nivel }); }
  var incompletos = A.filter(function (p) { var r = D.comp.get(p.id); return r.faixa && r.cor !== 'verde'; }).map(function (p) { return p.id; });
  add('incompletos', 'Cadastros incompletos', 'Amarelos e vermelhos', incompletos, 'pessoas', 'cr');
  var semRegra = A.filter(function (p) { return !D.comp.get(p.id).faixa; }).map(function (p) { return p.id; });
  if (semRegra.length) add('semfaixa', 'Faixa etária não definida', 'Sem data de nascimento ou regra de 6 anos não configurada', semRegra, 'pessoas', 'at');
  add('desatualizados', 'Cadastros desatualizados', 'Sem atualização há mais de ' + plural(cfg().mesesAtualizacao || 12, 'mês', 'meses'), A.filter(desatualizado).map(function (p) { return p.id; }), 'pessoas', 'at');
  add('famsemvisita', 'Famílias com visita pendente', 'Sem visita realizada há mais de ' + prazo('familia') + ' dias', D.famAtivas.filter(function (f) { return semVisita(f.id, prazo('familia'), D.ultF); }).map(function (f) { return f.id; }), 'familias', 'at');
  add('gestantes', 'Gestantes sem acompanhamento', 'Sem visita há mais de ' + prazo('gestante') + ' dias', A.filter(function (p) { return cond(p, 'gestante') && semVisita(p.id, prazo('gestante'), D.ultP); }).map(function (p) { return p.id; }), 'pessoas', 'cr');
  add('criancas', 'Crianças < 2 anos com acompanhamento pendente', 'Sem visita há mais de ' + prazo('crianca') + ' dias', A.filter(function (p) { var i = idade(p); return i != null && i < 2 && semVisita(p.id, prazo('crianca'), D.ultP); }).map(function (p) { return p.id; }), 'pessoas', 'cr');
  add('hasdm', 'HAS/DM sem acompanhamento recente', 'Sem visita há mais de ' + prazo('hasdm') + ' dias', A.filter(function (p) { return (cond(p, 'has') || cond(p, 'dm')) && semVisita(p.id, prazo('hasdm'), D.ultP); }).map(function (p) { return p.id; }), 'pessoas', 'at');
  add('idosos', 'Idosos sem acompanhamento', 'Sem visita há mais de ' + prazo('idoso') + ' dias', A.filter(function (p) { var i = idade(p); return i != null && i >= 60 && semVisita(p.id, prazo('idoso'), D.ultP); }).map(function (p) { return p.id; }), 'pessoas', 'at');
  add('acamados', 'Acamados sem visita no período', 'Sem visita há mais de ' + prazo('acamado') + ' dias', A.filter(function (p) { return cond(p, 'acamado') && semVisita(p.id, prazo('acamado'), D.ultP); }).map(function (p) { return p.id; }), 'pessoas', 'cr');
  return l;
}

// ============================================================================
// Banco de dados
// ============================================================================
function setSync(estado, texto) {
  var el = $('#sync'); if (!el) return;
  el.className = 'sync ' + estado;
  el.lastChild.textContent = texto;
}
function atualizarSync() {
  if (!S.db) return setSync('erro', 'Sem banco');
  if (S.salvando) return setSync('salvando', 'Salvando…');
  var tudo = S.carregado.familias && S.carregado.pessoas && S.carregado.visitas && S.carregado.config;
  if (!tudo) return setSync('carregando', 'Carregando…');
  var np = PROD.pendentes();
  if (np) return setSync(navigator.onLine ? 'salvando' : 'erro', navigator.onLine ? 'Enviando…' : np + ' a enviar');
  if (S.offline || !navigator.onLine) return setSync('erro', 'Sem conexão');
  setSync('', 'Salvo');
}

function registro(acao, campos) {
  return { em: new Date().toISOString(), por: S.me || null, acao: acao, campos: campos || [] };
}
function comHistorico(doc, anterior, acao, campos) {
  var h = (anterior && anterior.historico) ? anterior.historico.slice(-29) : [];
  h.push(registro(acao, campos));
  doc.historico = h;
  return doc;
}

async function gravar(col, id, dados) {
  if (!S.db) throw { code: 'not_granted', message: 'Banco indisponível' };
  S.salvando = true; atualizarSync();
  try {
    try { await S.db.collection(col).doc(id).set(dados); }
    catch (e) {
      if (e && e.code === 'unavailable') { await sleep(400 + Math.random() * 600); await S.db.collection(col).doc(id).set(dados); }
      else throw e;
    }
  } catch (e) {
    S.salvando = false; atualizarSync(); setSync('erro', 'Erro ao salvar');
    throw e;
  }
  S.salvando = false; atualizarSync();
}
async function apagar(col, id) {
  S.salvando = true; atualizarSync();
  try { await S.db.collection(col).doc(id).delete(); }
  finally { S.salvando = false; atualizarSync(); }
}
function msgErro(e) {
  var c = e && e.code;
  if (c === 'invalid_argument') return 'Você não tem permissão para alterar estes dados (ou o registro é inválido).';
  if (c === 'quota_exceeded') return 'Limite de armazenamento atingido. Remova dados de demonstração ou registros antigos.';
  if (c === 'resource_exhausted') return 'Muitas operações seguidas. Aguarde alguns segundos e tente novamente.';
  if (c === 'not_granted' || c === 'capability_disabled') return 'Banco de dados indisponível nesta visualização.';
  return 'Não foi possível salvar. Verifique a conexão e tente novamente.';
}

function assinar(col, mapa, chave) {
  S.db.collection(col).onSnapshot(function (snap) {
    mapa.clear();
    snap.docs.forEach(function (d) { var o = Object.assign({}, d.data()); o.id = d.id; mapa.set(d.id, o); });
    if (!snap.metadata.fromCache) { S.carregado[chave] = true; S.offline = false; }
    else if (!S.carregado[chave]) S.carregado[chave] = 'cache';
    invalidar(); aoMudarDados();
  }, function (e) {
    S.carregado[chave] = true; S.erroBanco = e; invalidar(); aoMudarDados();
  });
}

async function iniciarBanco() {
  try { S.db = await claude.use('db'); } catch (e) { S.db = null; }
  try { S.user = await claude.use('user'); } catch (e) { S.user = null; }
  try { S.downloads = await claude.use('downloads'); } catch (e) { S.downloads = null; }
  if (S.user) {
    try { S.me = await S.user.id(); } catch (e) { S.me = null; }
    try { var w = S.user.can ? await S.user.can('data.write') : null; if (w === false) S.podeEscrever = false; } catch (e) { }
  }
  if (!S.db) { S.semBanco = true; S.carregado = { familias: true, pessoas: true, visitas: true, config: true }; render(); return; }
  var timer = setTimeout(function () {
    var tudo = S.carregado.familias === true && S.carregado.pessoas === true && S.carregado.visitas === true && S.carregado.config === true;
    if (!tudo) { S.offline = true; S.carregado = { familias: true, pessoas: true, visitas: true, config: true }; aoMudarDados(); }
  }, 10000);
  assinar('familias', S.familias, 'familias');
  assinar('pessoas', S.pessoas, 'pessoas');
  assinar('visitas', S.visitas, 'visitas');
  iniciarMetas();
  iniciarPendencias();
  iniciarAgenda();
  S.db.doc('config/geral').onSnapshot(function (d) {
    var c = clone(CONFIG_PADRAO);
    if (d.exists) { var x = d.data(); Object.keys(x).forEach(function (k) { c[k] = clone(x[k]); }); c.prazos = Object.assign({}, CONFIG_PADRAO.prazos, x.prazos || {}); }
    S.config = c;
    if (!d.metadata.fromCache) S.carregado.config = true; else if (!S.carregado.config) S.carregado.config = 'cache';
    invalidar(); aoMudarDados();
    if (S.carregado.familias === true && S.carregado.pessoas === true && S.carregado.visitas === true && S.carregado.config === true) clearTimeout(timer);
  }, function () { S.carregado.config = true; aoMudarDados(); });
}

var renderPendente = false;
function aoMudarDados() {
  atualizarSync();
  if (renderPendente) return;
  renderPendente = true;
  requestAnimationFrame(function () {
    renderPendente = false;
    // Não redesenhar formulários em edição (preserva o que está sendo digitado)
    var emForm = S.sub && (S.sub.tipo === 'pessoa' || S.sub.tipo === 'familiaForm' || S.sub.tipo === 'visitaForm' || S.sub.tipo === 'agendaForm');
    if (emForm && S.rascunho && S.rascunho.sujo) {
      if (S.sub.tipo === 'pessoa') atualizarPainelCompletude();
      return;
    }
    if (!S.sub && S.view === 'configuracoes' && S.configSujo) return;
    if (!S.sub && S.view === 'busca' && $('#buscaInput')) { atualizarResultadosBusca(); return; } // não tira o foco de quem está digitando
    var y = window.scrollY;
    if (emForm) S.rascunho = null; // recarrega o formulário com os dados mais recentes
    render();
    window.scrollTo(0, y);
  });
}
function prontos() { var c = S.carregado; return c.familias && c.pessoas && c.visitas && c.config; }

// ============================================================================
// Navegação
// ============================================================================
var VIEWS = [
  ['painel', 'Painel', 'home'], ['busca', 'Busca rápida', 'busca'], ['agenda', 'Agenda inteligente', 'agenda'], ['pendencias', 'Central de pendências', 'alerta'],
  ['familias', 'Famílias', 'fam'], ['pessoas', 'Pessoas', 'pessoa'],
  ['visitas', 'Visitas domiciliares', 'visita'], ['completude', 'Completude cadastral', 'comp'], ['configuracoes', 'Configurações', 'conf']
];
var PROXIMAS = ['Fichas de acompanhamento (PA, glicemia, pré-natal…)', 'Território (mapa)', 'Relatórios de cadastro', 'ACS Assistente (IA)'];

function montarNavegacao() {
  var sb = '<div class="brand"><div class="logo">' + logoSvg() + '</div><div>ACS DIGITAL<small>Gestão do Agente Comunitário</small></div></div>';
  VIEWS.forEach(function (v) { sb += '<button class="navlink" data-nav="' + v[0] + '">' + ico(v[2]) + v[1] + '</button>'; });
  sb += '<div class="navsep">Próximas etapas</div>';
  PROXIMAS.forEach(function (p) { sb += '<div class="navfut">' + esc(p) + '</div>'; });
  $('#sidebar').innerHTML = sb;
  var bn = '';
  [['painel', 'Início', 'home'], ['agenda', 'Agenda', 'agenda'], ['visitas', 'Visitas', 'visita'], ['pessoas', 'Pessoas', 'pessoa'], ['mais', 'Mais', 'mais']].forEach(function (v) {
    bn += '<button data-nav="' + v[0] + '">' + ico(v[2]) + '<span>' + v[1] + '</span></button>';
  });
  $('#bottomnav').innerHTML = bn;
}
function logoSvg() {
  return '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1554C0" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8"/><path d="M12 10v6M9 13h6"/><path d="M5 10v10h14V10"/></svg>';
}
function marcarNav() {
  var v = S.view;
  $$('[data-nav]').forEach(function (b) {
    var alvo = b.getAttribute('data-nav');
    var ativo = alvo === v || (alvo === 'mais' && ['completude', 'configuracoes', 'familias', 'busca', 'pendencias'].indexOf(v) >= 0);
    b.classList.toggle('ativo', ativo);
  });
}

function guardarAlteracoes(seguir) {
  if (S.rascunho && S.rascunho.sujo) {
    modal('<h3>Descartar alterações?</h3><p>Há alterações que ainda não foram salvas.</p><div class="btns mt"><button class="btn sec" data-act="fecharModal">Continuar editando</button><button class="btn perigo" data-act="descartar">Descartar</button></div>');
    S.aposDescartar = seguir;
    return;
  }
  seguir();
}
function irPara(view) {
  guardarAlteracoes(function () {
    if (view === 'mais') { abrirMais(); return; }
    S.view = view; S.sub = null; S.pilha = []; S.rascunho = null; S.configSujo = false;
    if (location.hash !== '#' + view) { try { history.replaceState(null, '', '#' + view); } catch (e) { location.hash = view; } }
    render(); window.scrollTo(0, 0);
  });
}
function abrirSub(sub) {
  guardarAlteracoes(function () {
    S.pilha.push(S.sub); S.sub = sub; S.rascunho = null; render(); window.scrollTo(0, 0);
  });
}
function voltar() {
  guardarAlteracoes(function () {
    S.rascunho = null; S.sub = S.pilha.pop() || null; render(); window.scrollTo(0, 0);
  });
}
function abrirMais() {
  var h = '<h3>Mais opções</h3><div class="lista mt">';
  h += '<button class="item" data-act="navModal" data-v="busca">' + ico('busca', 'width="22" height="22"') + '<div class="princ"><div class="nome">Busca rápida</div><div class="meta">Morador, família ou endereço</div></div></button>';
  h += '<button class="item" data-act="navModal" data-v="pendencias">' + ico('alerta', 'width="22" height="22"') + '<div class="princ"><div class="nome">Central de pendências</div><div class="meta">Cadastro, linhas de cuidado, visitas e agenda</div></div></button>';
  h += '<button class="item" data-act="navModal" data-v="familias">' + ico('fam', 'width="22" height="22"') + '<div class="princ"><div class="nome">Famílias</div><div class="meta">Cadastro familiar e domicílio</div></div></button>';
  h += '<button class="item" data-act="navModal" data-v="completude">' + ico('comp', 'width="22" height="22"') + '<div class="princ"><div class="nome">Completude cadastral</div><div class="meta">Indicadores verde, amarelo e vermelho</div></div></button>';
  h += '<button class="item" data-act="navModal" data-v="configuracoes">' + ico('conf', 'width="22" height="22"') + '<div class="princ"><div class="nome">Configurações</div><div class="meta">Agente, regras, prazos, exportação</div></div></button>';
  h += '</div><p class="contagem mt2">Próximas etapas (ainda não disponíveis nesta versão): ' + PROXIMAS.map(esc).join(' · ') + '.</p>';
  h += '<button class="btn sec mt" style="width:100%" data-act="fecharModal">Fechar</button>';
  modal(h);
}

// ============================================================================
// Modal e toast
// ============================================================================
function modal(html) { $('#modalCaixa').innerHTML = html; $('#modal').classList.add('aberto'); }
function fecharModal() { $('#modal').classList.remove('aberto'); $('#modalCaixa').innerHTML = ''; }
function toast(msg, tipo) {
  var t = document.createElement('div'); t.className = 'toast ' + (tipo || ''); t.textContent = msg;
  $('#toasts').appendChild(t); setTimeout(function () { t.remove(); }, tipo === 'erro' ? 6000 : 3200);
}
function confirmar(titulo, texto, rotulo, acao) {
  S.confirmarAcao = acao;
  modal('<h3>' + esc(titulo) + '</h3><p>' + esc(texto) + '</p><div class="btns mt"><button class="btn sec" data-act="fecharModal">Cancelar</button><button class="btn perigo" data-act="confirmarSim">' + esc(rotulo) + '</button></div>');
}

// ============================================================================
// Componentes
// ============================================================================
var COR_TXT = { verde: 'Verde', amarelo: 'Amarelo', vermelho: 'Vermelho', indef: 'Indefinido' };
var COR_IC = { verde: '✓', amarelo: '!', vermelho: '✕', indef: '?' };
function indicador(r) {
  var cor = corEfetiva(r);
  var txt = r.faixa ? r.exibido + '% · ' + COR_TXT[cor] : 'Faixa indefinida';
  return '<span class="ind ' + cor + '" title="Completude cadastral"><span class="ic" aria-hidden="true">' + COR_IC[cor] + '</span>' + txt + '</span>';
}
function tile(v, l, s, act) {
  var tag = act ? 'button' : 'div';
  return '<' + tag + ' class="tile"' + (act ? ' ' + act : '') + '><div class="v">' + v + '</div><div class="l">' + esc(l) + '</div>' + (s ? '<div class="s">' + esc(s) + '</div>' : '') + '</' + tag + '>';
}
function demoChip(o) { return o && o.demo ? ' <span class="chip demo">fictício</span>' : ''; }
function nomeFamilia(f) {
  if (!f) return 'Sem família';
  var r = f.responsavelId && S.pessoas.get(f.responsavelId);
  return (f.codigo || '') + ' · ' + (r ? r.nome : (f.endereco ? f.endereco + ', ' + (f.numero || 's/n') : 'Família sem responsável'));
}
function selectHtml(nome, opcoes, valor, vazioTxt, attrs) {
  var h = '<select name="' + nome + '" ' + (attrs || '') + '>' + (vazioTxt === false ? '' : '<option value="">' + esc(vazioTxt || 'Selecione…') + '</option>');
  opcoes.forEach(function (o) {
    var v = Array.isArray(o) ? o[0] : o, t = Array.isArray(o) ? o[1] : o;
    h += '<option value="' + esc(v) + '"' + (String(valor) === String(v) ? ' selected' : '') + '>' + esc(t) + '</option>';
  });
  return h + '</select>';
}
function microareas() {
  var s = new Set();
  String(cfg().microareas || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean).forEach(function (x) { s.add(x); });
  S.familias.forEach(function (f) { if (f.microarea) s.add(f.microarea); });
  return Array.from(s).sort();
}
function historicoHtml(h) {
  if (!h || !h.length) return '<p class="contagem">Sem alterações registradas.</p>';
  return '<ul class="hist">' + h.slice().reverse().slice(0, 15).map(function (r) {
    var quem = r.por && r.por === S.me ? 'você' : (r.por ? (PROD.nomeDe(r.por) || 'outro usuário autorizado') : 'sistema');
    return '<li><b>' + esc(r.acao) + '</b> por ' + quem + ' · ' + fmtDataHora(r.em) + (r.campos && r.campos.length ? '<br>' + esc(r.campos.slice(0, 8).join(', ')) + (r.campos.length > 8 ? '…' : '') : '') + '</li>';
  }).join('') + '</ul>';
}
function somenteLeitura() { return !S.podeEscrever || S.semBanco; }
function avisoLeitura() {
  if (S.semBanco) return '<div class="aviso vermelho">Não foi possível abrir os dados. Recarregue a página ou saia e entre novamente.</div>';
  if (!S.podeEscrever) return '<div class="aviso amarelo">Seu perfil tem acesso somente para visualização. Alterações não podem ser salvas.</div>';
  if (S.erroBanco) return '<div class="aviso vermelho">Houve um erro ao ler o banco de dados (' + esc(S.erroBanco.code || 'erro') + '). Recarregue o aplicativo; se persistir, verifique seu acesso.</div>';
  if (S.offline) return '<div class="aviso amarelo">Sem conexão no momento. Pode continuar trabalhando: as alterações ficam guardadas neste aparelho, protegidas, e são enviadas quando a internet voltar.</div>';
  return '';
}

// ============================================================================
// Render principal
// ============================================================================
function render() {
  marcarNav();
  var v = $('#view');
  if (!prontos()) { v.innerHTML = '<div class="carregando"><div><div class="spin" style="margin:0 auto 10px"></div>Carregando dados…</div></div>'; return; }
  var titulo = (VIEWS.filter(function (x) { return x[0] === S.view; })[0] || [0, 'ACS DIGITAL'])[1];
  var html;
  if (S.sub) {
    var t = S.sub.tipo;
    if (t === 'familia') { html = viewFamilia(S.sub.id); titulo = 'Família'; }
    else if (t === 'familiaForm') { html = viewFamiliaForm(S.sub.id); titulo = S.sub.id ? 'Editar família' : 'Nova família'; }
    else if (t === 'pessoa') { html = viewPessoa(S.sub); titulo = S.sub.id ? 'Ficha individual' : 'Nova pessoa'; }
    else if (t === 'visitaForm') { html = viewVisitaForm(S.sub); titulo = S.sub.id ? 'Editar visita' : 'Registrar visita'; }
    else if (t === 'lista') { html = viewListaAlerta(S.sub); titulo = S.sub.titulo; }
    else if (t === 'agendaForm') { html = viewAgendaForm(S.sub); titulo = S.sub.id ? 'Compromisso' : 'Novo compromisso'; }
    else if (t === 'importar') { html = viewImportar(); titulo = 'Importar do VitaCare'; }
  } else {
    html = ({ painel: viewPainel, busca: viewBusca, pendencias: viewPendencias, agenda: viewAgenda, familias: viewFamilias, pessoas: viewPessoas, visitas: viewVisitas, completude: viewCompletude, configuracoes: viewConfig }[S.view] || viewPainel)();
  }
  $('#titulo').textContent = titulo;
  $('#btnVoltar').hidden = !S.sub;
  v.innerHTML = avisoLeitura() + html;
  if (S.sub && S.sub.tipo === 'pessoa') atualizarPainelCompletude();
  if (S.focoApos) { var f = S.focoApos; S.focoApos = null; setTimeout(function () { irParaCampo(f); }, 50); }
}

// ============================================================================
// PAINEL
// ============================================================================
function viewPainel() {
  var D = derivados(), A = D.ativos;
  var hoje = hojeISO(), mes = hoje.slice(0, 7);
  var visitasMes = Array.from(S.visitas.values()).filter(function (v) { return (v.data || '').slice(0, 7) === mes; });
  var realizadasMes = visitasMes.filter(function (v) { return v.situacao === 'Visita realizada'; }).length;
  var famAcomp = D.famAtivas.filter(function (f) { return !semVisita(f.id, prazo('familia'), D.ultF); }).length;
  var cores = { verde: 0, amarelo: 0, vermelho: 0, indef: 0 };
  A.forEach(function (p) { cores[corEfetiva(D.comp.get(p.id))]++; });
  var desat = A.filter(desatualizado).length;
  function conta(fn) { return A.filter(fn).length; }
  var h = '<div class="buscacampo buscapainel">' + ico('busca', 'width="20" height="20" aria-hidden="true"') + '<input type="search" id="buscaPainel" placeholder="' + PLACEHOLDER_BUSCA + '" autocomplete="off" aria-label="' + PLACEHOLDER_BUSCA + '"></div>';
  if (!S.pessoas.size && !S.familias.size) {
    h += '<div class="card"><h2>Bem-vindo(a) ao ACS DIGITAL</h2><p>Ainda não há cadastros. Comece criando uma família e adicionando os integrantes, ou importe a Lista de Famílias do VitaCare em Configurações. Para conhecer o sistema antes, carregue a base demonstrativa fictícia em Configurações.</p><div class="btns"><button class="btn" data-act="novaFamilia">' + ico('add', 'width="18" height="18"') + 'Nova família</button><button class="btn sec" data-nav="configuracoes">Ir para Configurações</button></div></div>';
  }
  h += cardRotinaHoje();

  h += cardVisitasPainel();
  h += '<div class="grid g3 mt">' +
    tile(D.famAtivas.length, 'Famílias cadastradas', 'ativas', 'data-nav="familias"') +
    tile(A.length, 'Pessoas cadastradas', 'ativas', 'data-nav="pessoas"') +
    tile(famAcomp, 'Famílias acompanhadas', 'visita nos últimos ' + prazo('familia') + ' dias', 'data-act="abrirAlertaFamAcomp"') +
    tile(cores.verde, 'Cadastros completos', 'verdes (≥ 95%)', 'data-act="compFiltro" data-c="verde"') +
    tile(cores.amarelo + cores.vermelho, 'Cadastros incompletos', plural(cores.amarelo, 'amarelo', 'amarelos') + ' · ' + plural(cores.vermelho, 'vermelho', 'vermelhos'), 'data-act="compFiltro" data-c="incompletos"') +
    tile(desat, 'Precisam de atualização', 'há mais de ' + plural(cfg().mesesAtualizacao || 12, 'mês', 'meses'), 'data-act="alerta" data-k="desatualizados"') +
    '</div>';

  h += '<div class="card mt2"><h2>Grupos acompanhados</h2><div class="grid g4">' +
    tile(conta(function (p) { return cond(p, 'has'); }), 'Hipertensão', null, 'data-act="grupo" data-g="has"') +
    tile(conta(function (p) { return cond(p, 'dm'); }), 'Diabetes', null, 'data-act="grupo" data-g="dm"') +
    tile(conta(function (p) { return cond(p, 'gestante'); }), 'Gestantes', null, 'data-act="grupo" data-g="gestante"') +
    tile(conta(function (p) { var i = idade(p); return i != null && i < 12; }), 'Crianças', '0 a 11 anos', 'data-act="grupo" data-g="crianca"') +
    tile(conta(function (p) { var i = idade(p); return i != null && i >= 60; }), 'Idosos', '60 anos ou mais', 'data-act="grupo" data-g="idoso"') +
    tile(conta(function (p) { return p.deficiencia && p.deficiencia !== 'Não possui'; }), 'Pessoas com deficiência', null, 'data-act="grupo" data-g="pcd"') +
    tile(conta(function (p) { return cond(p, 'acamado'); }), 'Acamados', null, 'data-act="grupo" data-g="acamado"') +
    tile(conta(function (p) { return cond(p, 'domiciliado'); }), 'Domiciliados', null, 'data-act="grupo" data-g="domiciliado"') +
    tile(conta(function (p) { return cond(p, 'tuberculose'); }), 'Tuberculose', null, 'data-act="grupo" data-g="tuberculose"') +
    tile(conta(function (p) { return cond(p, 'hanseniase'); }), 'Hanseníase', null, 'data-act="grupo" data-g="hanseniase"') +
    tile(conta(function (p) { return cond(p, 'saude_mental'); }), 'Saúde mental', null, 'data-act="grupo" data-g="saude_mental"') +
    '</div></div>';

  // alertas → agora reunidos na Central de pendências (mesmas regras e prazos, com ações)
  h += cardPendenciasPainel();

  // gráficos
  h += '<div class="gcharts mt">';
  h += '<div class="card" style="margin:0"><h2>Visitas realizadas por mês</h2>' + graficoMensal() + '</div>';
  h += '<div class="card" style="margin:0"><h2>Completude cadastral</h2>' + barrasCompletude(cores, A.length) + '</div>';
  h += '<div class="card" style="margin:0"><h2>Pessoas por microárea</h2>' + barrasMicroarea(A) + '</div>';
  h += '<div class="card" style="margin:0"><h2>Famílias cadastradas por mês</h2>' + graficoFamilias() + '</div>';
  h += '</div>';
  return h;
}

function ultimosMeses(n) {
  var l = [], d = new Date(); d.setDate(1);
  for (var i = n - 1; i >= 0; i--) { var x = new Date(d.getFullYear(), d.getMonth() - i, 1); l.push(x.getFullYear() + '-' + pad(x.getMonth() + 1)); }
  return l;
}
var MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
function barrasSvg(rotulos, valores, legendaFn) {
  var W = 520, H = 190, top = 18, base = 160, left = 8, n = valores.length;
  var max = Math.max.apply(null, valores.concat([1]));
  var bw = (W - left * 2) / n, barW = Math.min(44, bw * 0.56);
  var s = '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Gráfico de barras">';
  s += '<line x1="0" x2="' + W + '" y1="' + base + '" y2="' + base + '" stroke="#CBD5E1"/>';
  valores.forEach(function (v, i) {
    var h = v ? Math.max(3, (v / max) * (base - top - 14)) : 0, x = left + i * bw + (bw - barW) / 2, y = base - h;
    s += '<g><title>' + esc(legendaFn(i, v)) + '</title>';
    s += '<rect x="' + (left + i * bw) + '" y="' + top + '" width="' + bw + '" height="' + (base - top) + '" fill="transparent"/>';
    if (h) s += '<path d="M' + x + ',' + base + 'V' + (y + 4) + 'q0,-4 4,-4h' + (barW - 8) + 'q4,0 4,4V' + base + 'z" fill="#1554C0"/>';
    s += '<text x="' + (x + barW / 2) + '" y="' + (y - 5) + '" text-anchor="middle" font-size="12" font-weight="600" fill="#0F172A">' + v + '</text>';
    s += '<text x="' + (x + barW / 2) + '" y="' + (base + 18) + '" text-anchor="middle" font-size="12" fill="#64748B">' + esc(rotulos[i]) + '</text></g>';
  });
  return s + '</svg>';
}
function graficoMensal() {
  var ms = ultimosMeses(6), cont = {}; ms.forEach(function (m) { cont[m] = 0; });
  S.visitas.forEach(function (v) { var m = (v.data || '').slice(0, 7); if (v.situacao === 'Visita realizada' && m in cont) cont[m]++; });
  return barrasSvg(ms.map(function (m) { return MESES[+m.slice(5) - 1]; }), ms.map(function (m) { return cont[m]; }), function (i, v) { return MESES[+ms[i].slice(5) - 1] + '/' + ms[i].slice(0, 4) + ': ' + plural(v, 'visita realizada', 'visitas realizadas'); });
}
function graficoFamilias() {
  var ms = ultimosMeses(6), cont = {}; ms.forEach(function (m) { cont[m] = 0; });
  S.familias.forEach(function (f) { var m = (f.data_cadastro || '').slice(0, 7); if (m in cont) cont[m]++; });
  return barrasSvg(ms.map(function (m) { return MESES[+m.slice(5) - 1]; }), ms.map(function (m) { return cont[m]; }), function (i, v) { return MESES[+ms[i].slice(5) - 1] + '/' + ms[i].slice(0, 4) + ': ' + plural(v, 'família cadastrada', 'famílias cadastradas'); });
}
function barrasCompletude(c, total) {
  if (!total) return '<p class="contagem">Sem pessoas cadastradas.</p>';
  var linhas = [['verde', 'Verde (95–100%)'], ['amarelo', 'Amarelo (75–94%)'], ['vermelho', 'Vermelho (< 75%)']];
  if (c.indef) linhas.push(['indef', 'Faixa indefinida']);
  var h = '<div class="lista">';
  linhas.forEach(function (l) {
    var n = c[l[0]], pct = Math.round(n / total * 100);
    h += '<button class="item" style="padding:8px 10px;cursor:pointer" data-act="compFiltro" data-c="' + l[0] + '"><span class="ind ' + l[0] + '"><span class="ic">' + COR_IC[l[0]] + '</span>' + l[1] + '</span><div class="princ"><div class="progress ' + l[0] + '"><i style="width:' + pct + '%"></i></div></div><b style="font-variant-numeric:tabular-nums">' + n + ' · ' + pct + '%</b></button>';
  });
  var media = 0; derivados().ativos.forEach(function (p) { media += derivados().comp.get(p.id).percentual; });
  return h + '</div><p class="contagem mt">Média geral: <b>' + Math.floor(media / total) + '%</b></p>';
}
function barrasMicroarea(A) {
  var cont = {};
  A.forEach(function (p) { var f = S.familias.get(p.familiaId); var m = (f && f.microarea) || 'Sem microárea'; cont[m] = (cont[m] || 0) + 1; });
  var ks = Object.keys(cont).sort(); if (!ks.length) return '<p class="contagem">Sem pessoas cadastradas.</p>';
  var max = Math.max.apply(null, ks.map(function (k) { return cont[k]; }));
  return '<div class="hbar">' + ks.map(function (k) { return '<span>' + esc(k) + '</span><span class="t" title="' + esc(k) + ': ' + cont[k] + '"><i style="width:' + (cont[k] / max * 100) + '%"></i></span><span class="n">' + cont[k] + '</span>'; }).join('') + '</div>';
}

// ============================================================================
// FAMÍLIAS
// ============================================================================
function filtroF(k, def) { var f = S.filtros[S.view] || (S.filtros[S.view] = {}); return k in f ? f[k] : def; }
function viewFamilias() {
  var D = derivados();
  var q = norm(filtroF('q', '')), ma = filtroF('micro', ''), sit = filtroF('sit', 'Ativa'), pend = filtroF('pend', '');
  var l = Array.from(S.familias.values()).filter(function (f) {
    if (sit && (f.situacao || 'Ativa') !== sit) return false;
    if (ma && f.microarea !== ma) return false;
    if (q) {
      var mem = (D.membros.get(f.id) || []).map(function (p) { return p.nome; }).join(' ');
      var alvo = norm([f.codigo, f.endereco, f.numero, f.bairro, f.cep, mem].join(' '));
      if (alvo.indexOf(q) < 0 && C.soDigitos(f.cep || '').indexOf(q) < 0) return false;
    }
    if (pend === 'incompleta' && !familiaIncompleta(f)) return false;
    return true;
  }).sort(function (a, b) { return (a.codigo || '') < (b.codigo || '') ? -1 : 1; });
  var h = '<div class="barra-acoes"><input class="cresce" type="search" placeholder="Buscar por nome, endereço ou código" data-filtro="q" value="' + esc(filtroF('q', '')) + '"><button class="btn" data-act="novaFamilia">' + ico('add', 'width="18" height="18"') + 'Nova família</button></div>';
  h += '<div class="filtros">' + selectHtml('micro', microareas(), ma, 'Todas as microáreas', 'data-filtro="micro"') + selectHtml('sit', SITUACOES_FAMILIA, sit, 'Todas as situações', 'data-filtro="sit"') + selectHtml('pend', [['incompleta', 'Com dados incompletos']], pend, 'Completas e incompletas', 'data-filtro="pend"') + '</div>';
  h += '<p class="contagem">' + plural(l.length, 'família', 'famílias') + '</p>';
  if (!l.length) return h + '<div class="vazio"><strong>Nenhuma família encontrada</strong>' + (S.familias.size ? 'Ajuste a busca ou os filtros.' : 'Cadastre a primeira família para começar.') + '</div>';
  h += '<div class="lista">';
  l.forEach(function (f) {
    var mem = D.membros.get(f.id) || [];
    var pior = mem.reduce(function (acc, p) { var r = D.comp.get(p.id); return Math.min(acc, r.percentual); }, 101);
    var nVerm = mem.filter(function (p) { return D.comp.get(p.id).cor === 'vermelho'; }).length;
    var u = D.ultF.get(f.id);
    h += '<button class="item" data-act="abrirFamilia" data-id="' + f.id + '"><div class="princ"><div class="nome">' + esc(nomeFamilia(f)) + demoChip(f) + '</div><div class="meta"><span>' + esc((f.endereco || 'Endereço não informado') + (f.numero ? ', ' + f.numero : '')) + '</span><span>Microárea ' + esc(f.microarea || '—') + '</span><span>' + plural(mem.length, 'integrante', 'integrantes') + '</span><span>Última visita: ' + (u ? fmtData(u) : 'nenhuma') + '</span></div></div><div class="dir">' +
      (familiaIncompleta(f) ? '<span class="chip" style="background:var(--amarelo-cl);color:var(--amarelo)">Domicílio incompleto</span>' : '') +
      (nVerm ? '<span class="chip" style="background:var(--vermelho-cl);color:var(--vermelho)">' + plural(nVerm, 'cadastro vermelho', 'cadastros vermelhos') + '</span>' : (mem.length && pior >= 95 ? '<span class="chip" style="background:var(--verde-cl);color:var(--verde)">Todos verdes</span>' : '')) +
      ((f.situacao || 'Ativa') !== 'Ativa' ? '<span class="chip">' + esc(f.situacao) + '</span>' : '') + '</div></button>';
  });
  return h + '</div>';
}
var CAMPOS_FAMILIA = C.CAMPOS.filter(function (c) { return c.escopo === 'familia'; });
function familiaIncompleta(f) {
  if (!f.responsavelId || !f.microarea) return true;
  return CAMPOS_FAMILIA.some(function (c) { return C.validarCampo(c, f[c.chave]) !== null; });
}

function viewFamilia(id) {
  var f = S.familias.get(id);
  if (!f) return '<div class="vazio"><strong>Família não encontrada</strong>Ela pode ter sido removida.</div>';
  var D = derivados(), mem = D.membros.get(id) || [];
  var ro = somenteLeitura();
  var h = '<div class="card"><div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start"><div><div class="chips"><span class="chip azul">' + esc(f.codigo) + '</span><span class="chip">Microárea ' + esc(f.microarea || '—') + '</span><span class="chip">' + esc(f.situacao || 'Ativa') + '</span>' + demoChip(f) + '</div><h2 style="margin:10px 0 2px;font-size:18px">' + esc(f.responsavelId && S.pessoas.get(f.responsavelId) ? S.pessoas.get(f.responsavelId).nome : 'Responsável não definido') + '</h2><div class="contagem" style="margin:0">' + esc((f.endereco || 'Endereço não informado') + (f.numero ? ', ' + f.numero : '') + (f.complemento ? ' — ' + f.complemento : '') + (f.bairro ? ' · ' + f.bairro : '')) + '</div></div></div>';
  h += blocoEndereco(f);
  h += '<div class="btns mt">' + (ro ? '' : '<button class="btn" data-act="editarFamilia" data-id="' + id + '">Editar</button><button class="btn sec" data-act="novaPessoaFam" data-id="' + id + '">' + ico('add', 'width="18" height="18"') + 'Integrante</button><button class="btn sec" data-act="novaVisitaFam" data-id="' + id + '">Registrar visita</button>') + '</div></div>';
  if (familiaIncompleta(f)) {
    var falt = CAMPOS_FAMILIA.filter(function (c) { return C.validarCampo(c, f[c.chave]) !== null; }).map(function (c) { return c.rotulo.replace('Família — ', ''); });
    if (!f.responsavelId) falt.unshift('Responsável familiar');
    if (!f.microarea) falt.unshift('Microárea');
    h += '<div class="aviso amarelo mt">Dados do domicílio pendentes (afetam a completude de todos os integrantes): ' + esc(falt.join(', ')) + '.</div>';
  }
  h += '<div class="card"><h2>Integrantes (' + mem.length + ')</h2>';
  if (!mem.length) h += '<div class="vazio">Nenhum integrante vinculado.' + (ro ? '' : '<div class="mt"><button class="btn sec" data-act="novaPessoaFam" data-id="' + id + '">Adicionar integrante</button></div>') + '</div>';
  else {
    h += '<div class="lista">';
    mem.forEach(function (p) {
      var r = D.comp.get(p.id), i = idade(p);
      h += '<button class="item" data-act="abrirPessoa" data-id="' + p.id + '"><div class="princ"><div class="nome">' + esc(p.nome || '(sem nome)') + (f.responsavelId === p.id ? ' <span class="chip azul">Responsável</span>' : '') + '</div><div class="meta"><span>' + (i != null ? plural(i, 'ano', 'anos') : 'Idade não informada') + '</span><span>' + esc(p.situacao || 'Ativo') + '</span></div></div><div class="dir">' + indicador(r) + '</div></button>';
    });
    h += '</div>';
  }
  h += '</div>';
  h += '<div class="card"><h2>Dados da família e do domicílio</h2><dl class="kv">';
  [['Código', f.codigo], ['Unidade de saúde', f.unidade], ['Equipe', f.equipe], ['Telefone de contato', f.telefone, 'tel'], ['CEP', f.cep], ['Data do cadastro', fmtData(f.data_cadastro)], ['Situação', f.situacao || 'Ativa']].concat(f.vitacare && f.vitacare.numero ? [['Família no VitaCare', f.vitacare.numero]] : []).forEach(function (kv) { h += '<dt>' + esc(kv[0]) + '</dt><dd>' + (kv[2] === 'tel' && kv[1] ? '<span class="telwa-txt">' + esc(fmtTelefone(kv[1])) + iconeWhatsApp(kv[1]) + '</span>' : esc(kv[1] || '—')) + '</dd>'; });
  CAMPOS_FAMILIA.filter(function (c) { return c.n >= 25; }).forEach(function (c) { h += '<dt>' + esc(c.rotulo.replace('Família — ', '')) + '</dt><dd>' + esc(f[c.chave] != null && f[c.chave] !== '' ? f[c.chave] : '—') + '</dd>'; });
  if (f.observacoes) h += '<dt>Observações</dt><dd>' + esc(f.observacoes) + '</dd>';
  h += '</dl></div>';
  var vis = Array.from(S.visitas.values()).filter(function (v) { return v.familiaId === id; }).sort(ordVisita);
  h += '<div class="card"><h2>Histórico de visitas (' + vis.length + ')</h2>' + (vis.length ? '<div class="lista">' + vis.slice(0, 20).map(itemVisita).join('') + '</div>' : '<p class="contagem">Nenhuma visita registrada.</p>') + '</div>';
  h += '<div class="card"><h2>Histórico de alterações</h2>' + historicoHtml(f.historico) + '</div>';
  if (!ro) h += '<div class="btns mt">' + ((f.situacao || 'Ativa') === 'Arquivada' ? '<button class="btn sec" data-act="reativarFamilia" data-id="' + id + '">Reativar cadastro</button>' : '<button class="btn perigo" data-act="arquivarFamilia" data-id="' + id + '">Arquivar cadastro</button>') + '</div>';
  return h;
}

function proximoCodigo() {
  var max = 0; S.familias.forEach(function (f) { var n = parseInt(String(f.codigo || '').replace(/\D/g, ''), 10); if (n > max) max = n; });
  return 'F' + String(max + 1).padStart(4, '0');
}
function viewFamiliaForm(id) {
  var f = id ? S.familias.get(id) : null;
  if (!S.rascunho) S.rascunho = { tipo: 'familia', dados: f ? clone(f) : { codigo: proximoCodigo(), data_cadastro: hojeISO(), situacao: 'Ativa', unidade: cfg().unidade, equipe: cfg().equipe }, sujo: false };
  var d = S.rascunho.dados, mem = id ? (derivados().membros.get(id) || []) : [];
  var h = '<form id="formFamilia" autocomplete="off"><div class="card"><h2>Identificação</h2><div class="grid g2">';
  h += campoTxt('Código da família', 'codigo', d.codigo, 'readonly');
  h += '<div class="campo"><label class="rot">Responsável familiar</label>' + (mem.length ? selectHtml('responsavelId', mem.map(function (p) { return [p.id, p.nome]; }), d.responsavelId || '', 'Selecione um integrante') : '<div class="contagem" style="margin:6px 0 0">Salve a família e adicione os integrantes; depois escolha o responsável aqui ou na ficha individual.</div>') + '</div>';
  h += '<div class="campo"><label class="rot">Microárea</label><input type="text" name="microarea" list="dlMicro" value="' + esc(d.microarea || '') + '" placeholder="Ex.: 01"><datalist id="dlMicro">' + microareas().map(function (m) { return '<option value="' + esc(m) + '">'; }).join('') + '</datalist></div>';
  h += campoTxt('Unidade de saúde', 'unidade', d.unidade) + campoTxt('Equipe', 'equipe', d.equipe);
  h += '<div class="campo"><label class="rot">Telefone de contato</label>' + campoTelefoneWa('telefone', d.telefone) + '</div>';
  h += campoTxt('Data do cadastro', 'data_cadastro', d.data_cadastro, 'type="date"');
  h += '<div class="campo"><label class="rot">Situação da família</label>' + selectHtml('situacao', SITUACOES_FAMILIA, d.situacao || 'Ativa') + '</div>';
  h += '</div></div>';
  h += '<div class="card"><h2>Endereço</h2><p class="contagem">Campos 20 a 23 da completude — compartilhados por todos os integrantes.</p><div class="grid g2">';
  h += campoTxt('20. Endereço (logradouro)', 'endereco', d.endereco) + campoTxt('21. Número', 'numero', d.numero) + campoTxt('Complemento', 'complemento', d.complemento) + campoTxt('22. Bairro', 'bairro', d.bairro) + campoTxt('23. CEP', 'cep', d.cep, 'inputmode="numeric" placeholder="00000-000"');
  h += '</div><h3 class="mt">Localização no mapa (opcional)</h3><p class="contagem">Para o botão COMO CHEGAR ir direto à porta: no Google Maps, toque e segure sobre a casa, copie os números que aparecem (ex.: -22.90685, -43.17290) e cole aqui.</p><div class="grid g2">' +
    campoTxt('Coordenadas (latitude, longitude)', 'coordenadas', temCoord(d) ? d.latitude + ', ' + d.longitude : '', 'inputmode="decimal" placeholder="-22.90685, -43.17290"') +
    '<label class="chk" style="align-self:end;margin-bottom:12px"><input type="checkbox" name="coordVerificadas"' + (d.coordVerificadas ? ' checked' : '') + '> Coordenadas conferidas no local</label></div></div>';
  h += '<div class="card"><h2>Domicílio, saneamento e renda</h2><p class="contagem">Campos 25 a 35 — gravados uma vez na família e exibidos na ficha de cada integrante.</p><div class="grid g2">';
  CAMPOS_FAMILIA.filter(function (c) { return c.n >= 25; }).forEach(function (c) {
    if (c.tipo === 'comodos') h += campoTxt(c.n + '. ' + c.rotulo.replace('Família — ', ''), c.chave, d[c.chave], 'type="number" min="1" max="50" inputmode="numeric"');
    else h += '<div class="campo"><label class="rot">' + c.n + '. ' + esc(c.rotulo.replace('Família — ', '')) + '</label>' + selectHtml(c.chave, c.opcoes, d[c.chave] || '') + '</div>';
  });
  h += '</div></div>';
  h += '<div class="card"><h2>Observações</h2><textarea name="observacoes">' + esc(d.observacoes || '') + '</textarea></div>';
  h += '<div class="salvarbar"><span class="naosalvo" id="naoSalvo"' + (S.rascunho.sujo ? '' : ' hidden') + '>Alterações não salvas</span><button type="button" class="btn sec" data-act="voltar">Cancelar</button><button type="submit" class="btn"' + (somenteLeitura() ? ' disabled' : '') + '>Salvar família</button></div></form>';
  return h;
}
function campoTxt(rot, nome, val, attrs) {
  return '<div class="campo"><label class="rot">' + esc(rot) + '</label><input type="text" name="' + nome + '" value="' + esc(val == null ? '' : val) + '" ' + (attrs || '') + '></div>';
}
function lerFormFamilia() {
  var fm = $('#formFamilia'), d = S.rascunho.dados;
  ['codigo', 'responsavelId', 'microarea', 'unidade', 'equipe', 'telefone', 'data_cadastro', 'situacao', 'endereco', 'numero', 'complemento', 'bairro', 'cep', 'observacoes'].forEach(function (k) {
    var el = fm.elements[k]; if (el) d[k] = el.value.trim();
  });
  CAMPOS_FAMILIA.filter(function (c) { return c.n >= 25; }).forEach(function (c) {
    var el = fm.elements[c.chave]; if (!el) return;
    d[c.chave] = c.tipo === 'comodos' ? (el.value === '' ? '' : Number(el.value)) : el.value;
  });
  var co = parseCoord(fm.elements.coordenadas.value);
  S.rascunho.coordErro = !!co.erro;
  if (co.vazio) { d.latitude = ''; d.longitude = ''; d.coordVerificadas = false; }
  else if (!co.erro) { d.latitude = co.lat; d.longitude = co.lng; d.coordVerificadas = fm.elements.coordVerificadas.checked; }
}
function diferencas(antes, depois, chaves, rotulos) {
  var l = [];
  chaves.forEach(function (k) {
    var a = antes ? antes[k] : undefined, b = depois[k];
    if (JSON.stringify(a == null ? '' : a) !== JSON.stringify(b == null ? '' : b)) l.push(rotulos[k] || k);
  });
  return l;
}
var ROT_FAM = { latitude: 'Latitude', longitude: 'Longitude', coordVerificadas: 'Coordenadas conferidas', codigo: 'Código', responsavelId: 'Responsável', microarea: 'Microárea', unidade: 'Unidade', equipe: 'Equipe', telefone: 'Telefone de contato', data_cadastro: 'Data do cadastro', situacao: 'Situação', complemento: 'Complemento', observacoes: 'Observações' };
CAMPOS_FAMILIA.forEach(function (c) { ROT_FAM[c.chave] = c.rotulo.replace('Família — ', ''); });
async function salvarFamilia() {
  lerFormFamilia();
  var d = S.rascunho.dados;
  if (d.cep && C.soDigitos(d.cep).length !== 8) { toast('CEP deve ter 8 dígitos.', 'erro'); return; }
  if (S.rascunho.coordErro) { toast('Coordenadas inválidas. Use o formato -22.90685, -43.17290 (ponto como separador decimal).', 'erro'); return; }
  var dup = Array.from(S.familias.values()).filter(function (f) { return f.id !== d.id && norm(f.endereco) && norm(f.endereco) === norm(d.endereco) && norm(f.numero) === norm(d.numero) && norm(f.complemento) === norm(d.complemento); });
  if (dup.length && !S.rascunho.dupOk) {
    S.rascunho.dupOk = true;
    toast('Já existe a família ' + dup[0].codigo + ' neste endereço. Toque em salvar novamente para confirmar.', 'erro');
    return;
  }
  var id = d.id || novoId('f'), ant = S.familias.get(id);
  var doc = Object.assign({}, d); delete doc.id;
  var campos = diferencas(ant, doc, Object.keys(ROT_FAM), ROT_FAM);
  if (ant && !campos.length) { S.rascunho.sujo = false; toast('Nenhuma alteração para salvar.'); voltar(); return; }
  doc.criadoEm = (ant && ant.criadoEm) || new Date().toISOString();
  doc.atualizadoEm = new Date().toISOString();
  comHistorico(doc, ant, ant ? 'Editou' : 'Cadastrou', ant ? campos : []);
  try {
    await gravar('familias', id, doc);
    S.rascunho = null; toast(ant ? 'Família atualizada.' : 'Família ' + doc.codigo + ' cadastrada.', 'ok');
    if (ant) voltar(); else { S.sub = { tipo: 'familia', id: id }; render(); }
  } catch (e) { toast(msgErro(e), 'erro'); }
}
async function alterarSituacaoFamilia(id, sit) {
  var f = S.familias.get(id); if (!f) return;
  var doc = Object.assign({}, f); delete doc.id; doc.situacao = sit; doc.atualizadoEm = new Date().toISOString();
  comHistorico(doc, f, sit === 'Arquivada' ? 'Arquivou' : 'Reativou', ['Situação']);
  try { await gravar('familias', id, doc); toast(sit === 'Arquivada' ? 'Cadastro arquivado. Os dados foram mantidos.' : 'Cadastro reativado.', 'ok'); render(); }
  catch (e) { toast(msgErro(e), 'erro'); }
}

// ============================================================================
// PESSOAS
// ============================================================================
function viewPessoas() {
  var D = derivados();
  var q = norm(filtroF('q', '')), ma = filtroF('micro', ''), cor = filtroF('cor', ''), sit = filtroF('sit', 'Ativo'), fx = filtroF('faixa', ''), gr = filtroF('grupo', '');
  var l = Array.from(S.pessoas.values()).filter(function (p) {
    var f = S.familias.get(p.familiaId), r = D.comp.get(p.id);
    if (sit && (p.situacao || 'Ativo') !== sit) return false;
    if (ma && (!f || f.microarea !== ma)) return false;
    if (cor && corEfetiva(r) !== cor) return false;
    if (fx && faixaIdade(idade(p)) !== fx) return false;
    if (gr && !grupoFn(gr)(p)) return false;
    if (q) { var alvo = norm([p.nome, p.cns, p.cpf_dnv && p.cpf_dnv.numero, f && f.codigo, f && f.endereco].join(' ')); if (alvo.indexOf(q) < 0) return false; }
    return true;
  }).sort(function (a, b) { return norm(a.nome) < norm(b.nome) ? -1 : 1; });
  var h = '<div class="barra-acoes"><input class="cresce" type="search" placeholder="Buscar por nome, CNS, CPF ou família" data-filtro="q" value="' + esc(filtroF('q', '')) + '"><button class="btn" data-act="novaPessoa">' + ico('add', 'width="18" height="18"') + 'Nova pessoa</button></div>';
  h += '<div class="filtros">' + selectHtml('cor', [['verde', 'Verdes'], ['amarelo', 'Amarelos'], ['vermelho', 'Vermelhos'], ['indef', 'Faixa indefinida']], cor, 'Todas as cores', 'data-filtro="cor"') +
    selectHtml('micro', microareas(), ma, 'Todas as microáreas', 'data-filtro="micro"') +
    selectHtml('faixa', FAIXAS, fx, 'Todas as idades', 'data-filtro="faixa"') +
    selectHtml('grupo', GRUPOS, gr, 'Todos os grupos', 'data-filtro="grupo"') +
    selectHtml('sit', SITUACOES_PESSOA, sit, 'Todas as situações', 'data-filtro="sit"') + '</div>';
  h += '<p class="contagem">' + plural(l.length, 'pessoa', 'pessoas') + '</p>';
  if (!l.length) return h + '<div class="vazio"><strong>Nenhuma pessoa encontrada</strong>' + (S.pessoas.size ? 'Ajuste a busca ou os filtros.' : 'Cadastre uma família e adicione os integrantes.') + '</div>';
  return h + '<div class="lista">' + l.map(itemPessoa).join('') + '</div>';
}
var GRUPOS = [['has', 'Hipertensão'], ['dm', 'Diabetes'], ['gestante', 'Gestantes'], ['crianca', 'Crianças (0–11)'], ['idoso', 'Idosos (60+)'], ['pcd', 'Pessoas com deficiência'], ['acamado', 'Acamados'], ['domiciliado', 'Domiciliados'], ['saude_mental', 'Saúde mental'], ['tuberculose', 'Tuberculose'], ['hanseniase', 'Hanseníase']];
function grupoFn(g) {
  if (g === 'crianca') return function (p) { var i = idade(p); return i != null && i < 12; };
  if (g === 'idoso') return function (p) { var i = idade(p); return i != null && i >= 60; };
  if (g === 'pcd') return function (p) { return p.deficiencia && p.deficiencia !== 'Não possui'; };
  return function (p) { return cond(p, g); };
}
function itemPessoa(p) {
  var D = derivados(), r = D.comp.get(p.id), f = S.familias.get(p.familiaId), i = idade(p);
  return '<button class="item" data-act="abrirPessoa" data-id="' + p.id + '"><div class="princ"><div class="nome">' + esc(p.nome || '(sem nome)') + demoChip(p) + '</div><div class="meta"><span>' + (i != null ? plural(i, 'ano', 'anos') : 'Idade não informada') + '</span><span>' + esc(f ? f.codigo : 'Sem família') + '</span><span>Microárea ' + esc((f && f.microarea) || '—') + '</span>' + ((p.situacao || 'Ativo') !== 'Ativo' ? '<span>' + esc(p.situacao) + '</span>' : '') + '</div></div><div class="dir">' + indicador(r) + '</div></button>';
}

// --- Ficha individual (40 campos) ---
function iniciarRascunhoPessoa(sub) {
  S.pendAberto = null;
  var p = sub.id ? S.pessoas.get(sub.id) : null;
  var pessoa = p ? clone(p) : { familiaId: sub.familiaId || '', situacao: 'Ativo', condicoes: {} };
  var famId = pessoa.familiaId;
  var fam = famId && S.familias.get(famId) ? clone(S.familias.get(famId)) : {};
  var ehResp = !!(famId && S.familias.get(famId) && S.familias.get(famId).responsavelId === pessoa.id && pessoa.id);
  S.rascunho = { tipo: 'pessoa', pessoa: pessoa, familia: fam, sujo: false, ehResponsavel: ehResp };
}
function viewPessoa(sub) {
  if (sub.id && !S.pessoas.get(sub.id)) return '<div class="vazio"><strong>Cadastro não encontrado</strong></div>';
  if (!S.rascunho) iniciarRascunhoPessoa(sub);
  var R = S.rascunho, p = R.pessoa, fam = R.familia, temFam = !!(p.familiaId && S.familias.get(p.familiaId));
  var ro = somenteLeitura();
  var h = '<div class="compbox" id="compbox"></div>';
  h += '<form id="formPessoa" autocomplete="off">';
  h += '<div class="card"><h2>Vínculo familiar e situação</h2><div class="grid g2">';
  var fams = Array.from(S.familias.values()).filter(function (f) { return (f.situacao || 'Ativa') !== 'Arquivada' || f.id === p.familiaId; }).sort(function (a, b) { return a.codigo < b.codigo ? -1 : 1; });
  h += '<div class="campo"><label class="rot">Família / domicílio</label>' + selectHtml('familiaId', fams.map(function (f) { return [f.id, nomeFamilia(f)]; }), p.familiaId || '', fams.length ? 'Selecione a família' : 'Cadastre uma família primeiro') + '</div>';
  h += '<div class="campo"><label class="rot">Situação cadastral</label>' + selectHtml('situacao', SITUACOES_PESSOA, p.situacao || 'Ativo') + '</div>';
  h += '</div><label class="chk"><input type="checkbox" name="ehResponsavel"' + (R.ehResponsavel ? ' checked' : '') + (temFam ? '' : ' disabled') + '> É o(a) responsável familiar</label>';
  if (temFam) h += '<div class="mt">' + blocoEndereco(S.familias.get(p.familiaId)) + '</div>';
  if (!fams.length) h += '<div class="aviso amarelo mt">Nenhuma família cadastrada. <button type="button" class="btn peq sec" data-act="novaFamilia">Cadastrar família</button></div>';
  h += '</div>';
  C.SECOES.forEach(function (sec) {
    h += '<div class="secao"><h2>' + esc(sec.titulo) + '</h2>';
    for (var n = sec.campos[0]; n <= sec.campos[1]; n++) h += campo40(C.CAMPOS[n - 1], p, fam, temFam);
    h += '</div>';
  });
  // condições acompanhadas (não entram no cálculo)
  h += '<div class="card mt2"><h2>Condições acompanhadas</h2><p class="contagem">Marcadores para os alertas e grupos. Não entram no cálculo de completude. O sistema não faz diagnósticos.</p><div class="grid g2">';
  CONDICOES.forEach(function (c) { h += '<label class="chk"><input type="checkbox" name="cond_' + c[0] + '"' + (cond(p, c[0]) ? ' checked' : '') + '> ' + esc(c[1]) + '</label>'; });
  h += '</div><div id="boxGestante" class="mt"' + (cond(p, 'gestante') ? '' : ' hidden') + '>' + campoTxt('Data da última menstruação (DUM), quando disponível', 'dum', p.dum, 'type="date"') + '<div id="infoGestacao" class="contagem"></div></div>';
  h += '<div class="campo mt"><label class="rot">Observações</label><textarea name="observacoes">' + esc(p.observacoes || '') + '</textarea></div></div>';
  if (sub.id) {
    var vis = Array.from(S.visitas.values()).filter(function (v) { return (v.pessoaIds || []).indexOf(sub.id) >= 0; }).sort(ordVisita);
    h += '<div class="card"><h2>Histórico de visitas (' + vis.length + ')</h2>' + (vis.length ? '<div class="lista">' + vis.slice(0, 15).map(itemVisita).join('') + '</div>' : '<p class="contagem">Nenhuma visita registrada para esta pessoa.</p>') + (ro ? '' : '<div class="btns mt"><button type="button" class="btn sec" data-act="novaVisitaPessoa" data-id="' + sub.id + '">Registrar visita</button><button type="button" class="btn sec" data-act="agendarRetorno" data-p="' + sub.id + '" data-f="' + esc(p.familiaId || '') + '">Agendar retorno</button></div>') + '</div>';
    h += '<div class="card"><h2>Histórico de alterações</h2>' + historicoHtml(S.pessoas.get(sub.id).historico) + '</div>';
  }
  h += '<div class="salvarbar"><span class="naosalvo" id="naoSalvo"' + (R.sujo ? '' : ' hidden') + '>Alterações não salvas</span><button type="button" class="btn sec" data-act="voltar">Fechar</button><button type="submit" class="btn"' + (ro ? ' disabled' : '') + '>Salvar cadastro</button></div>';
  return h + '</form>';
}
function campo40(c, p, fam, temFam) {
  var fam_ = c.escopo === 'familia';
  var v = fam_ ? fam[c.chave] : p[c.chave];
  var nome = (fam_ ? 'fam_' : '') + c.chave;
  var dis = fam_ && !temFam ? ' disabled' : '';
  var inp;
  switch (c.tipo) {
    case 'opcao': inp = selectHtml(nome, c.opcoes, v || '', 'Selecione…', dis); break;
    case 'data_nascimento': inp = '<input type="date" name="' + nome + '" value="' + esc(v || '') + '" max="' + hojeISO() + '">'; break;
    case 'cpf_dnv':
      var cd = v || {};
      inp = '<div class="linha2">' + selectHtml('cpf_tipo', ['CPF', 'DNV'], cd.tipo || '', 'Tipo') + '<input type="text" name="cpf_numero" inputmode="numeric" placeholder="Somente números" value="' + esc(cd.numero || '') + '"></div>'; break;
    case 'cns': inp = '<input type="text" name="' + nome + '" inputmode="numeric" maxlength="18" placeholder="15 dígitos" value="' + esc(v || '') + '">'; break;
    case 'nis': inp = '<input type="text" name="' + nome + '" inputmode="numeric" maxlength="14" placeholder="11 dígitos" value="' + esc(v || '') + '">'; break;
    case 'cep': inp = '<input type="text" name="' + nome + '" inputmode="numeric" maxlength="9" placeholder="00000-000" value="' + esc(v || '') + '"' + dis + '>'; break;
    case 'telefone': inp = campoTelefoneWa(nome, v, 'placeholder="(21) 99999-9999"'); break;
    case 'comodos': inp = '<input type="number" name="' + nome + '" min="1" max="50" inputmode="numeric" value="' + esc(v == null ? '' : v) + '"' + dis + '>'; break;
    case 'cuidador':
      var cv = v || {}, mem = p.familiaId ? (derivados().membros.get(p.familiaId) || []).filter(function (m) { return m.id !== p.id; }) : [];
      var sel = cv.pessoaId || (cv.nome ? '__outro' : '');
      inp = selectHtml('cuidador_sel', mem.map(function (m) { return [m.id, m.nome]; }).concat([['__outro', 'Outra pessoa (digitar nome)']]), sel, 'Selecione…') +
        '<input type="text" name="cuidador_nome" placeholder="Nome do cuidador" value="' + esc(cv.nome || '') + '" style="margin-top:6px"' + (sel === '__outro' ? '' : ' hidden') + '>'; break;
    default: inp = '<input type="text" name="' + nome + '" value="' + esc(v || '') + '"' + dis + '>';
  }
  var extra = fam_ ? '<div class="fam">' + (temFam ? '⌂ Dado da família — compartilhado com todos os integrantes' : 'Vincule uma família para preencher') + '</div>' : '';
  return '<div class="campo40" id="campo-' + c.n + '" data-status=""><div class="cab"><span class="num">' + c.n + '</span><span class="tit">' + esc(rotuloCampo(c)) + '</span><span class="st"></span></div>' + inp + '<div class="prob" hidden></div>' + extra + '</div>';
}
function lerFormPessoa() {
  var fm = $('#formPessoa'); if (!fm) return;
  var R = S.rascunho, p = R.pessoa, fam = R.familia, E = fm.elements;
  p.familiaId = E.familiaId.value; p.situacao = E.situacao.value;
  R.ehResponsavel = E.ehResponsavel.checked;
  C.CAMPOS.forEach(function (c) {
    if (c.tipo === 'cpf_dnv') { p.cpf_dnv = { tipo: E.cpf_tipo.value, numero: C.soDigitos(E.cpf_numero.value) }; return; }
    if (c.tipo === 'cuidador') {
      var s = E.cuidador_sel.value;
      p.cuidador = s === '__outro' ? { nome: E.cuidador_nome.value.trim() } : (s ? { pessoaId: s } : null);
      return;
    }
    var nome = (c.escopo === 'familia' ? 'fam_' : '') + c.chave, el = E[nome]; if (!el) return;
    var v = el.value;
    if (c.tipo === 'comodos') v = v === '' ? '' : Number(v);
    else if (c.tipo === 'cns' || c.tipo === 'nis') v = C.soDigitos(v);
    else if (typeof v === 'string') v = v.trim();
    if (c.escopo === 'familia') fam[c.chave] = v; else p[c.chave] = v;
  });
  p.condicoes = {}; CONDICOES.forEach(function (c) { if (E['cond_' + c[0]].checked) p.condicoes[c[0]] = true; });
  p.dum = E.dum ? E.dum.value : ''; p.observacoes = E.observacoes.value.trim();
}
function atualizarPainelCompletude() {
  var box = $('#compbox'); if (!box || !S.rascunho || S.rascunho.tipo !== 'pessoa') return;
  lerFormPessoa();
  var R = S.rascunho, r = C.calcular(R.pessoa, R.familia, S.config, new Date());
  var cor = corEfetiva(r);
  var h = '<div class="comphead"><div><div style="font-size:12px;font-weight:700;letter-spacing:.05em;color:var(--tinta3)">COMPLETUDE CADASTRAL</div><div style="display:flex;align-items:center;gap:8px"><span class="pct">' + (r.faixa ? r.exibido + '%' : '—') + '</span>' + indicador(r) + '</div></div><div style="text-align:right;font-size:12.5px;color:var(--tinta2)">' + (r.idade != null ? plural(r.idade, 'ano', 'anos') + '<br>' : '') + (r.faixa === 'maior' ? 'Regra: maior que 6 anos' : r.faixa === 'menor' ? 'Regra: menor que 6 anos' : 'Regra indefinida') + '</div></div>';
  h += '<div class="progress ' + cor + '"><i style="width:' + (r.faixa ? Math.min(100, r.percentual) : 0) + '%"></i></div>';
  h += '<div class="compinfo"><b>' + r.preenchidos + ' de ' + r.aplicaveis + '</b> campos aplicáveis preenchidos · ' + r.pendentes.length + ' obrigatórios pendentes · ' + r.condicionaisPendentes.length + ' condicionais pendentes · ' + r.nsa.length + ' NSA' + (r.indefinidos.length ? ' · ' + r.indefinidos.length + ' aguardando regra' : '') + '</div>';
  if (r.aviso) h += '<div class="aviso amarelo mt" style="margin-bottom:0">' + esc(r.aviso) + (r.seisAnos ? ' <button type="button" class="btn peq sec" data-nav="configuracoes">Configurar</button>' : '') + '</div>';
  var totPend = r.pendentes.length + r.condicionaisPendentes.length;
  if (totPend) {
    if (S.pendAberto == null) S.pendAberto = totPend <= 6;
    h += '<details class="compdet" id="detPend"' + (S.pendAberto ? ' open' : '') + '><summary>' + (S.pendAberto ? 'Ocultar' : 'Ver') + ' ' + plural(totPend, 'pendência', 'pendências') + ' (toque para ir ao campo)</summary><div class="pend">' + r.pendentes.map(function (c) { return '<button type="button" data-act="irCampo" data-n="' + c.n + '">' + c.n + '. ' + esc(rotuloCurto(c)) + '</button>'; }).join('') +
      r.condicionaisPendentes.map(function (c) { return '<button type="button" class="cond" data-act="irCampo" data-n="' + c.n + '">' + c.n + '. ' + esc(rotuloCurto(c)) + ' (condicional)</button>'; }).join('') + '</div></details>';
  } else if (r.faixa) h += '<div class="compinfo" style="color:var(--verde);font-weight:600">Nenhuma pendência nos campos aplicáveis.</div>';
  box.innerHTML = h;
  r.campos.forEach(function (c) {
    var el = document.getElementById('campo-' + c.n); if (!el) return;
    el.setAttribute('data-status', c.status);
    el.classList.toggle('cond', !!c.condicional);
    var st = el.querySelector('.st'), pb = el.querySelector('.prob');
    st.textContent = { preenchido: 'OK', pendente: c.condicional ? 'Condicional pendente' : 'Pendente', nsa: c.condicional ? 'NSA (condição falsa)' : 'NSA', indefinido: 'Aguardando regra' }[c.status];
    var mostrarProb = c.status === 'pendente' && c.problema && c.problema !== 'não informado';
    pb.hidden = !mostrarProb; if (mostrarProb) pb.textContent = c.problema;
  });
  var bg = $('#boxGestante'); if (bg) bg.hidden = !R.pessoa.condicoes.gestante;
  var ig = $('#infoGestacao');
  if (ig) {
    var dum = R.pessoa.dum, dd = dum ? diasDesde(dum) : null;
    ig.textContent = dd != null && dd >= 0 && dd < 310 ? 'Idade gestacional: ' + Math.floor(dd / 7) + ' semanas e ' + (dd % 7) + ' dias · Data provável do parto: ' + fmtData(addDias(dum, 280)) + ' (calculadas pela DUM; confirme com a equipe).' : '';
  }
}
function rotuloCurto(c) { var x = C.CAMPOS[c.n - 1]; return rotuloCampo(x).replace('Família — ', '').replace('A criança está matriculada na creche ou pré-escola', 'Creche/pré-escola').replace('material predominante das paredes externas', 'paredes externas'); }
function irParaCampo(n) {
  var el = document.getElementById('campo-' + n); if (!el) return;
  var y = el.getBoundingClientRect().top + window.scrollY - (($('#compbox') || {}).offsetHeight || 0) - 80;
  window.scrollTo({ top: y, behavior: 'smooth' });
  el.classList.add('flash'); setTimeout(function () { el.classList.remove('flash'); }, 1600);
  var inp = el.querySelector('input:not([hidden]),select'); if (inp) setTimeout(function () { try { inp.focus({ preventScroll: true }); } catch (e) { inp.focus(); } }, 350);
}
var CHAVES_PESSOA = C.CAMPOS.filter(function (c) { return c.escopo === 'pessoa'; }).map(function (c) { return c.chave; }).concat(['familiaId', 'situacao', 'condicoes', 'dum', 'observacoes']);
var ROT_PES = { familiaId: 'Família', situacao: 'Situação cadastral', condicoes: 'Condições acompanhadas', dum: 'DUM', observacoes: 'Observações' };
C.CAMPOS.forEach(function (c) { ROT_PES[c.chave] = c.n + '. ' + c.rotulo; });

async function salvarPessoa() {
  lerFormPessoa();
  var R = S.rascunho, p = R.pessoa;
  if (!p.nome) { toast('Informe ao menos o nome para salvar.', 'erro'); irParaCampo(1); return; }
  if (!p.familiaId) { toast('Vincule a pessoa a uma família (os dados do domicílio ficam na família).', 'erro'); return; }
  // duplicidade por CNS/CPF
  var dup = Array.from(S.pessoas.values()).filter(function (x) {
    if (x.id === p.id) return false;
    return (p.cns && x.cns === p.cns) || (p.cpf_dnv && p.cpf_dnv.numero && x.cpf_dnv && x.cpf_dnv.numero === p.cpf_dnv.numero);
  });
  if (dup.length) { toast('CNS ou CPF/DNV já cadastrado para ' + dup[0].nome + '. Verifique antes de salvar.', 'erro'); return; }
  var novo = !p.id, id = p.id || novoId('p'), ant = S.pessoas.get(id);
  var doc = {}; CHAVES_PESSOA.forEach(function (k) { if (p[k] !== undefined) doc[k] = p[k]; });
  if (p.demo) doc.demo = true;
  var campos = diferencas(ant, doc, CHAVES_PESSOA, ROT_PES);
  var famAnt = S.familias.get(p.familiaId);
  var famCampos = famAnt ? diferencas(famAnt, R.familia, CAMPOS_FAMILIA.map(function (c) { return c.chave; }), ROT_FAM) : [];
  var mudarResp = famAnt && ((R.ehResponsavel && famAnt.responsavelId !== id) || (!R.ehResponsavel && famAnt.responsavelId === id));
  if (!novo && !campos.length && !famCampos.length && !mudarResp) { R.sujo = false; toast('Nenhuma alteração para salvar.'); render(); return; }
  doc.criadoEm = (ant && ant.criadoEm) || new Date().toISOString();
  doc.atualizadoEm = new Date().toISOString();
  comHistorico(doc, ant, novo ? 'Cadastrou' : 'Editou', novo ? [] : campos);
  try {
    if (campos.length || novo) await gravar('pessoas', id, doc);
    if (famCampos.length || mudarResp) {
      var fd = Object.assign({}, famAnt); delete fd.id;
      CAMPOS_FAMILIA.forEach(function (c) { fd[c.chave] = R.familia[c.chave]; });
      if (mudarResp) fd.responsavelId = R.ehResponsavel ? id : '';
      fd.atualizadoEm = new Date().toISOString();
      comHistorico(fd, famAnt, 'Editou pela ficha de ' + p.nome, famCampos.concat(mudarResp ? ['Responsável'] : []));
      await gravar('familias', p.familiaId, fd);
    }
    p.id = id; R.sujo = false;
    var r = C.calcular(p, R.familia, S.config, new Date());
    toast((novo ? 'Cadastro criado' : 'Cadastro salvo') + ' — completude ' + (r.faixa ? r.exibido + '% (' + COR_TXT[r.cor] + ')' : 'indefinida') + (famCampos.length ? '. Dados da família atualizados para todos os integrantes.' : '.'), 'ok');
    S.sub = { tipo: 'pessoa', id: id }; S.rascunho = null; render();
  } catch (e) { toast(msgErro(e), 'erro'); }
}

// ============================================================================
// VISITAS
// ============================================================================
function ordVisita(a, b) { var x = (b.data || '') + (b.hora || ''), y = (a.data || '') + (a.hora || ''); return x < y ? -1 : x > y ? 1 : 0; }
function itemVisita(v) {
  var f = S.familias.get(v.familiaId);
  var nomes = (v.pessoaIds || []).map(function (id) { var p = S.pessoas.get(id); return p ? p.nome.split(' ')[0] : null; }).filter(Boolean);
  var ok = v.situacao === 'Visita realizada';
  return '<button class="item" data-act="editarVisita" data-id="' + v.id + '"><div class="princ"><div class="nome">' + fmtData(v.data) + (v.hora ? ' · ' + esc(v.hora) : '') + ' — ' + esc(f ? f.codigo : 'Família removida') + demoChip(v) + '</div><div class="meta"><span>' + esc(v.tipo || '') + '</span>' + (nomes.length ? '<span>' + esc(nomes.join(', ')) + '</span>' : '') + (v.motivo ? '<span>' + esc(v.motivo) + '</span>' : '') + '</div></div><div class="dir"><span class="chip" style="' + (ok ? 'background:var(--verde-cl);color:var(--verde)' : 'background:var(--amarelo-cl);color:var(--amarelo)') + '">' + esc(v.situacao) + '</span></div></button>';
}
function viewVisitaForm(sub) {
  var v = sub.id ? S.visitas.get(sub.id) : null;
  if (sub.id && !v) return '<div class="vazio"><strong>Visita não encontrada</strong></div>';
  if (!S.rascunho) {
    S.rascunho = { tipo: 'visita', dados: v ? clone(v) : { familiaId: sub.familiaId || '', pessoaIds: sub.pessoaId ? [sub.pessoaId] : [], data: hojeISO(), hora: agoraHora(), tipo: 'Visita periódica', situacao: 'Visita realizada' }, sujo: false };
    var agv = !v && sub.agendaId && S.agenda.get(sub.agendaId);
    if (agv) { var dd = S.rascunho.dados; dd.agendaId = agv.id; dd.motivo = agv.motivo || ''; if (agv.pessoaIds && agv.pessoaIds.length) dd.pessoaIds = agv.pessoaIds.slice(); if (agv.categoria === 'retorno') dd.tipo = 'Acompanhamento'; if (agv.linha) dd.linhas = [agv.linha]; }
  }
  var d = S.rascunho.dados;
  var fams = Array.from(S.familias.values()).filter(function (f) { return (f.situacao || 'Ativa') === 'Ativa' || f.id === d.familiaId; }).sort(function (a, b) { return a.codigo < b.codigo ? -1 : 1; });
  var mem = d.familiaId ? (derivados().membros.get(d.familiaId) || []) : [];
  var h = '<form id="formVisita" autocomplete="off"><div class="card">';
  h += '<div class="campo"><label class="rot">Família visitada</label>' + selectHtml('familiaId', fams.map(function (f) { return [f.id, nomeFamilia(f)]; }), d.familiaId, fams.length ? 'Selecione a família' : 'Nenhuma família cadastrada') + '</div>';
  h += '<div class="campo"><label class="rot">Pessoas acompanhadas</label>';
  if (!d.familiaId) h += '<p class="contagem">Selecione a família para listar os integrantes.</p>';
  else if (!mem.length) h += '<p class="contagem">Família sem integrantes cadastrados.</p>';
  else h += '<div class="grid g2">' + mem.map(function (p) { return '<label class="chk"><input type="checkbox" name="pessoa" value="' + p.id + '"' + ((d.pessoaIds || []).indexOf(p.id) >= 0 ? ' checked' : '') + '> ' + esc(p.nome) + '</label>'; }).join('') + '</div>' + (mem.length > 1 ? '<button type="button" class="btn peq sec mt" data-act="marcarTodos">Marcar todos</button>' : '');
  h += '</div><div class="grid g2">' + campoTxt('Data', 'data', d.data, 'type="date" max="' + hojeISO() + '"') + campoTxt('Horário', 'hora', d.hora, 'type="time"') + '</div>';
  h += '<div class="campo"><label class="rot">Situação</label><div class="seg">' + SITUACOES_VISITA.map(function (s) { return '<label><input type="radio" name="situacao" value="' + esc(s) + '"' + (d.situacao === s ? ' checked' : '') + '><span>' + esc(s) + '</span></label>'; }).join('') + '</div></div>';
  h += '<div class="grid g2"><div class="campo"><label class="rot">Tipo de visita</label>' + selectHtml('tipo', TIPOS_VISITA, d.tipo) + '</div>' + campoTxt('Motivo', 'motivo', d.motivo, 'placeholder="Ex.: acompanhamento de HAS"') + '</div>';
  h += blocoLinhasForm(d);
  h += '</div>' + blocoAgendaNaVisita(d, sub) + '<div class="card"><h2>Registro</h2>';
  [['situacao_encontrada', 'Situação encontrada'], ['orientacoes', 'Orientações realizadas'], ['encaminhamentos', 'Encaminhamentos'], ['observacoes', 'Observações'], ['resultado', 'Resultado']].forEach(function (k) {
    h += '<div class="campo"><label class="rot">' + k[1] + '</label><textarea name="' + k[0] + '">' + esc(d[k[0]] || '') + '</textarea></div>';
  });
  h += '</div>';
  if (v) h += '<div class="card"><h2>Histórico de alterações</h2>' + historicoHtml(v.historico) + '</div>';
  h += '<div class="salvarbar"><span class="naosalvo" id="naoSalvo"' + (S.rascunho.sujo ? '' : ' hidden') + '>Alterações não salvas</span>' + (v && !somenteLeitura() ? '<button type="button" class="btn perigo" data-act="excluirVisita" data-id="' + v.id + '">Excluir</button>' : '') + '<button type="button" class="btn sec" data-act="voltar">Cancelar</button><button type="submit" class="btn"' + (somenteLeitura() ? ' disabled' : '') + '>Salvar visita</button></div></form>';
  return h;
}
function lerFormVisita() {
  var E = $('#formVisita').elements, d = S.rascunho.dados;
  d.familiaId = E.familiaId.value;
  d.pessoaIds = $$('#formVisita input[name=pessoa]').filter(function (x) { return x.checked; }).map(function (x) { return x.value; });
  ['data', 'hora', 'tipo', 'motivo', 'situacao_encontrada', 'orientacoes', 'encaminhamentos', 'observacoes', 'resultado'].forEach(function (k) { if (E[k]) d[k] = E[k].value.trim(); });
  var r = $$('#formVisita input[name=situacao]').filter(function (x) { return x.checked; })[0]; d.situacao = r ? r.value : '';
  d.linhas = $$('#formVisita input[name=linha]').filter(function (x) { return x.checked; }).map(function (x) { return x.value; });
  lerAgendaNaVisita(d);
}
var ROT_VIS = { linhas: 'Linhas de cuidado', familiaId: 'Família', pessoaIds: 'Pessoas', data: 'Data', hora: 'Horário', tipo: 'Tipo', motivo: 'Motivo', situacao: 'Situação', situacao_encontrada: 'Situação encontrada', orientacoes: 'Orientações', encaminhamentos: 'Encaminhamentos', observacoes: 'Observações', resultado: 'Resultado' };
async function salvarVisita() {
  lerFormVisita();
  var d = S.rascunho.dados;
  if (!d.familiaId) { toast('Selecione a família visitada.', 'erro'); return; }
  if (!d.data) { toast('Informe a data da visita.', 'erro'); return; }
  if (d.data > hojeISO()) { toast('A data da visita não pode estar no futuro.', 'erro'); return; }
  if (!d.situacao) { toast('Selecione a situação da visita.', 'erro'); return; }
  if (d.situacao === 'Visita realizada' && !d.pessoaIds.length) { toast('Marque ao menos uma pessoa acompanhada.', 'erro'); return; }
  if (d.retorno && d.retorno.on && (!d.retorno.data || d.retorno.data < hojeISO())) { toast('Informe a data do retorno (hoje ou depois).', 'erro'); return; }
  var id = d.id || novoId('v'), ant = S.visitas.get(id);
  var doc = {}; Object.keys(ROT_VIS).forEach(function (k) { doc[k] = d[k] == null ? '' : d[k]; });
  if (d.demo) doc.demo = true;
  doc.acsId = (ant && P.acsDaVisita(ant)) || S.me || null;
  if (ant && ant.agendaId) doc.agendaId = ant.agendaId;
  else if (!ant && d.agConcluir && d.agConcluir.length) doc.agendaId = d.agConcluir[0];
  var campos = diferencas(ant, doc, Object.keys(ROT_VIS), ROT_VIS);
  if (ant && !campos.length) { S.rascunho.sujo = false; voltar(); return; }
  doc.criadoEm = (ant && ant.criadoEm) || new Date().toISOString(); doc.atualizadoEm = new Date().toISOString();
  comHistorico(doc, ant, ant ? 'Editou' : 'Registrou', ant ? campos : []);
  try {
    await gravar('visitas', id, doc);
    var extras = ant ? [] : await aposSalvarVisita(id, doc, d);
    S.rascunho = null; toast((ant ? 'Visita atualizada.' : (doc.situacao === 'Visita realizada' ? 'Visita registrada. Indicadores atualizados.' : 'Tentativa registrada (não conta como visita realizada).')) + (extras.length ? ' Também: ' + extras.join('; ') + '.' : ''), 'ok'); voltar();
  } catch (e) { toast(msgErro(e), 'erro'); }
}

// ============================================================================
// COMPLETUDE CADASTRAL
// ============================================================================
function viewCompletude() {
  var D = derivados(), A = D.ativos;
  var cor = filtroF('cor', ''), ma = filtroF('micro', ''), fam = filtroF('fam', ''), fx = filtroF('faixa', '');
  var cores = { verde: 0, amarelo: 0, vermelho: 0, indef: 0 }, soma = 0;
  A.forEach(function (p) { var r = D.comp.get(p.id); cores[corEfetiva(r)]++; soma += r.percentual; });
  var media = A.length ? Math.floor(soma / A.length) : 0;
  var h = '<div class="grid g3">' +
    tile(A.length, 'Pessoas cadastradas', 'ativas', 'data-act="compCor" data-c=""') +
    tile('<span style="color:var(--verde)">' + cores.verde + '</span>', 'Verdes', '95% a 100%', 'data-act="compCor" data-c="verde"') +
    tile('<span style="color:var(--amarelo)">' + cores.amarelo + '</span>', 'Amarelos', '75% a menos de 95%', 'data-act="compCor" data-c="amarelo"') +
    tile('<span style="color:var(--vermelho)">' + cores.vermelho + '</span>', 'Vermelhos', 'abaixo de 75%', 'data-act="compCor" data-c="vermelho"') +
    tile(media + '%', 'Média geral de completude', null) +
    tile((A.length ? Math.floor(cores.verde / A.length * 100) : 0) + '%', 'Cadastros completos', 'percentual de verdes') + '</div>';
  if (cores.indef) h += '<div class="aviso amarelo mt">' + plural(cores.indef, 'cadastro está', 'cadastros estão') + ' com faixa etária indefinida (sem data de nascimento ou com exatamente 6 anos sem regra configurada). <button class="btn peq sec" data-act="compCor" data-c="indef">Ver</button></div>';
  h += '<div class="filtros mt2">' + [['', 'Todos'], ['verde', 'Verdes'], ['amarelo', 'Amarelos'], ['vermelho', 'Vermelhos']].map(function (c) { return '<button class="fbtn' + (cor === c[0] ? ' ativo' : '') + '" data-act="compCor" data-c="' + c[0] + '">' + c[1] + '</button>'; }).join('') + '</div>';
  var fams = Array.from(S.familias.values()).sort(function (a, b) { return a.codigo < b.codigo ? -1 : 1; });
  h += '<div class="filtros">' + selectHtml('micro', microareas(), ma, 'Todas as microáreas', 'data-filtro="micro"') + selectHtml('fam', fams.map(function (f) { return [f.id, nomeFamilia(f)]; }), fam, 'Todas as famílias', 'data-filtro="fam"') + selectHtml('faixa', FAIXAS, fx, 'Todas as idades', 'data-filtro="faixa"') + '</div>';
  var l = A.filter(function (p) {
    var r = D.comp.get(p.id), f = S.familias.get(p.familiaId);
    if (cor && corEfetiva(r) !== cor) return false;
    if (ma && (!f || f.microarea !== ma)) return false;
    if (fam && p.familiaId !== fam) return false;
    if (fx && faixaIdade(idade(p)) !== fx) return false;
    return true;
  }).sort(function (a, b) { return D.comp.get(a.id).percentual - D.comp.get(b.id).percentual; });
  h += '<p class="contagem">' + plural(l.length, 'pessoa', 'pessoas') + ' · ordenadas da menor para a maior completude</p>';
  if (!l.length) return h + '<div class="vazio"><strong>Nenhum cadastro neste filtro</strong></div>';
  h += '<div class="lista">' + l.map(function (p) {
    var r = D.comp.get(p.id), f = S.familias.get(p.familiaId), pend = r.pendentes.concat(r.condicionaisPendentes);
    return '<button class="item" data-act="abrirPessoa" data-id="' + p.id + '"><div class="princ"><div class="nome">' + esc(p.nome) + '</div><div class="meta"><span>' + esc(f ? f.codigo : '') + ' · Microárea ' + esc((f && f.microarea) || '—') + '</span><span>' + r.preenchidos + '/' + r.aplicaveis + ' campos</span></div>' + (pend.length ? '<div class="meta" style="color:var(--vermelho)">Pendências: ' + esc(pend.slice(0, 5).map(rotuloCurto).join(', ')) + (pend.length > 5 ? ' e mais ' + (pend.length - 5) : '') + '</div>' : '') + '</div><div class="dir">' + indicador(r) + '</div></button>';
  }).join('') + '</div>';
  return h;
}

function viewListaAlerta(sub) {
  var D = derivados();
  var h = sub.desc ? '<p class="contagem">' + esc(sub.desc) + '</p>' : '';
  if (!sub.ids.length) return h + '<div class="vazio"><strong>Nenhum registro</strong>Nada pendente neste item.</div>';
  if (sub.tipoIds === 'familias') {
    return h + '<div class="lista">' + sub.ids.map(function (id) {
      var f = S.familias.get(id); if (!f) return '';
      var u = D.ultF.get(id);
      return '<button class="item" data-act="abrirFamilia" data-id="' + id + '"><div class="princ"><div class="nome">' + esc(nomeFamilia(f)) + '</div><div class="meta"><span>Microárea ' + esc(f.microarea || '—') + '</span><span>Última visita realizada: ' + (u ? fmtData(u) + ' (' + plural(diasDesde(u), 'dia', 'dias') + ')' : 'nenhuma') + '</span></div></div></button>';
    }).join('') + '</div>';
  }
  return h + '<div class="lista">' + sub.ids.map(function (id) {
    var p = S.pessoas.get(id); if (!p) return '';
    var u = D.ultP.get(id);
    return itemPessoa(p).replace('</div></div><div class="dir">', '<span>Última visita: ' + (u ? fmtData(u) : 'nenhuma') + '</span></div></div><div class="dir">');
  }).join('') + '</div>';
}

// ============================================================================
// CONFIGURAÇÕES
// ============================================================================
function viewConfig() {
  var c = cfg(), ro = somenteLeitura() || !PROD.podeConfigurar();
  var h = (ro && !somenteLeitura() ? '<div class="aviso">As configurações da equipe são definidas pela coordenação. Aqui você pode consultá-las.</div>' : '') + '<form id="formConfig"><div class="card"><h2>Equipe e área de atuação</h2><div class="grid g2">' +
    campoTxt('Profissional de referência da equipe', 'agente', c.agente) + campoTxt('Município', 'municipio', c.municipio) + campoTxt('Unidade de saúde', 'unidade', c.unidade) + campoTxt('Equipe', 'equipe', c.equipe) +
    campoTxt('Microáreas (separadas por vírgula)', 'microareas', c.microareas, 'placeholder="01, 02, 03"') + '</div></div>';
  h += '<div class="card"><h2>Regra para quem tem exatamente 6 anos</h2><p class="contagem">A referência (versão 02/2023) define apenas “maior que 6 anos” e “menor que 6 anos”. O sistema não presume a regra: defina a usada pela equipe. Enquanto não for definida, esses cadastros aparecem como “faixa indefinida” e só contam os campos obrigatórios nas duas faixas.</p><div class="seg">' +
    [['', 'Não definida'], ['menor', 'Aplicar regra de menor que 6 anos'], ['maior', 'Aplicar regra de maior que 6 anos']].map(function (o) { return '<label><input type="radio" name="regraSeisAnos" value="' + o[0] + '"' + ((c.regraSeisAnos || '') === o[0] ? ' checked' : '') + '><span>' + o[1] + '</span></label>'; }).join('') + '</div></div>';
  h += '<div class="card"><h2>Regras de completude</h2><p class="contagem">Faixas de cor fixas: verde ≥ 95%, amarelo ≥ 75% e < 95%, vermelho < 75%. NIS e CadÚnico (menores de 6 anos) passam a contar quando a pessoa pertence a território social, tem Cartão Família Carioca ou recebe o benefício do campo 16.</p>' +
    campoTxt('Nome exibido no campo 16 (programa de transferência de renda)', 'rotuloAuxilio', c.rotuloAuxilio) + '<p class="contagem">Ex.: “Possui Bolsa Família”. Muda apenas o rótulo; os dados já registrados são mantidos.</p></div>';
  h += '<div class="card"><h2>Prazos dos alertas (dias sem visita realizada)</h2><div class="grid g3">' +
    [['familia', 'Famílias'], ['gestante', 'Gestantes'], ['crianca', 'Crianças < 2 anos'], ['hasdm', 'HAS e DM'], ['idoso', 'Idosos'], ['acamado', 'Acamados']].map(function (k) { return campoTxt(k[1], 'prazo_' + k[0], prazo(k[0]), 'type="number" min="1" max="365" inputmode="numeric"'); }).join('') +
    campoTxt('Cadastro desatualizado após (meses)', 'mesesAtualizacao', c.mesesAtualizacao || 12, 'type="number" min="1" max="60" inputmode="numeric"') + '</div><p class="contagem">Ajuste conforme as orientações da equipe e os protocolos aplicáveis.</p></div>';
  h += configPendenciasHtml() + configAgendaHtml();
  h += '<div class="salvarbar" style="position:static"><button type="submit" class="btn"' + (ro ? ' disabled' : '') + '>Salvar configurações</button></div></form>';

  if (!somenteLeitura()) h += '<div class="card mt2"><h2>Importação</h2><p class="contagem">Traga famílias e moradores da Lista de Famílias do VitaCare (.xls, .xlsx ou .csv). Importar de novo atualiza sem duplicar.</p><div class="btns"><button class="btn sec" data-act="importarAbrir">' + ico('add', 'width="18" height="18"') + 'Importar do VitaCare</button></div></div>';
  h += '<div class="card mt2"><h2>Exportação</h2><p class="contagem">Arquivos CSV (separador “;”), abrem no Excel e no Google Planilhas.</p><div class="btns">' +
    (S.downloads ? '<button class="btn sec" data-act="exportar" data-t="familias">' + ico('baixar', 'width="18" height="18"') + 'Famílias</button><button class="btn sec" data-act="exportar" data-t="pessoas">' + ico('baixar', 'width="18" height="18"') + 'Pessoas e completude</button><button class="btn sec" data-act="exportar" data-t="visitas">' + ico('baixar', 'width="18" height="18"') + 'Visitas</button>' : '<p class="contagem">Download indisponível nesta visualização.</p>') + '</div></div>';

  var nDemo = 0; [S.familias, S.pessoas, S.visitas, S.agenda, S.estadosPend].forEach(function (m) { m.forEach(function (x) { if (x.demo) nDemo++; }); });
  h += '<div class="card"><h2>Base demonstrativa</h2><p class="contagem">Dados exclusivamente fictícios para conhecer e testar o sistema. Ficam marcados como “fictício” e podem ser removidos de uma vez. Não use dados reais de pacientes antes da avaliação de segurança e LGPD da instituição.</p><div class="btns">' +
    (ro ? '' : (nDemo ? '<button class="btn perigo" data-act="removerDemo">Remover ' + nDemo + ' registros fictícios</button>' : '<button class="btn sec" data-act="carregarDemo">Carregar base fictícia</button>')) + '</div><div id="demoProg" class="contagem mt"></div></div>';
  h += '<div class="card"><h2>Segurança e privacidade</h2><p class="contagem">Cada profissional entra com conta pessoal e vê somente os dados das equipes a que tem acesso (regra aplicada no servidor). ACS edita os dados da própria equipe; coordenação, os da unidade; visualizadores apenas consultam. Cada alteração fica registrada com data, autor e versão, e nada é apagado definitivamente. Os dados guardados no aparelho para uso sem internet ficam cifrados e são apagados ao sair. O ACS DIGITAL não substitui o e-SUS APS nem o prontuário, e só deve receber dados reais com autorização institucional e avaliação de segurança e LGPD.</p></div>';
  return h;
}
async function salvarConfig() {
  var E = $('#formConfig').elements, c = clone(cfg());
  ['agente', 'municipio', 'unidade', 'equipe', 'microareas', 'rotuloAuxilio'].forEach(function (k) { c[k] = E[k].value.trim(); });
  if (!c.rotuloAuxilio) c.rotuloAuxilio = CONFIG_PADRAO.rotuloAuxilio;
  var r = $$('#formConfig input[name=regraSeisAnos]').filter(function (x) { return x.checked; })[0];
  c.regraSeisAnos = r && r.value ? r.value : null;
  c.prazos = {}; Object.keys(CONFIG_PADRAO.prazos).forEach(function (k) { var v = parseInt(E['prazo_' + k].value, 10); c.prazos[k] = v > 0 ? v : CONFIG_PADRAO.prazos[k]; });
  c.mesesAtualizacao = parseInt(E.mesesAtualizacao.value, 10) || 12;
  lerConfigPendencias(E, c);
  lerConfigAgenda(E, c);
  c.atualizadoEm = new Date().toISOString();
  try { await gravar('config', 'geral', c); S.configSujo = false; toast('Configurações salvas. Completude recalculada.', 'ok'); render(); }
  catch (e) { toast(msgErro(e), 'erro'); }
}

// --- Exportação CSV ---
function csvLinha(a) { return a.map(function (x) { var s = x == null ? '' : String(x); return /[;"\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(';'); }
function valorCampo(c, p, f) {
  var v = c.escopo === 'familia' ? f[c.chave] : p[c.chave];
  if (c.tipo === 'cpf_dnv') return v && v.numero ? v.tipo + ' ' + v.numero : '';
  if (c.tipo === 'cuidador') { if (!v) return ''; if (v.pessoaId) { var x = S.pessoas.get(v.pessoaId); return x ? x.nome : ''; } return v.nome || ''; }
  return v == null ? '' : v;
}
async function exportar(t) {
  var D = derivados(), linhas = [];
  if (t === 'pessoas') {
    linhas.push(['ID', 'Família', 'Microárea', 'Situação cadastral', 'Idade', 'Regra', 'Completude (%)', 'Classificação', 'Preenchidos', 'Aplicáveis', 'Pendências'].concat(C.CAMPOS.map(function (c) { return c.n + '. ' + rotuloCampo(c); })).concat(CONDICOES.map(function (c) { return c[1]; })));
    S.pessoas.forEach(function (p) {
      var f = S.familias.get(p.familiaId) || {}, r = D.comp.get(p.id);
      linhas.push([p.id, f.codigo || '', f.microarea || '', p.situacao || 'Ativo', r.idade == null ? '' : r.idade, r.faixa === 'maior' ? 'Maior que 6' : r.faixa === 'menor' ? 'Menor que 6' : 'Indefinida', r.faixa ? r.exibido : '', r.faixa ? COR_TXT[r.cor] : 'Indefinida', r.preenchidos, r.aplicaveis, r.pendentes.concat(r.condicionaisPendentes).map(function (c) { return c.n; }).join(',')]
        .concat(C.CAMPOS.map(function (c) { return valorCampo(c, p, f); })).concat(CONDICOES.map(function (c) { return cond(p, c[0]) ? 'Sim' : 'Não'; })));
    });
  } else if (t === 'familias') {
    var cols = ['codigo', 'responsavel', 'endereco', 'numero', 'complemento', 'bairro', 'cep', 'microarea', 'unidade', 'equipe', 'telefone', 'data_cadastro', 'situacao'].concat(CAMPOS_FAMILIA.filter(function (c) { return c.n >= 25; }).map(function (c) { return c.chave; })).concat(['integrantes', 'ultima_visita', 'observacoes']);
    linhas.push(cols);
    S.familias.forEach(function (f) {
      linhas.push(cols.map(function (k) {
        if (k === 'responsavel') { var r = S.pessoas.get(f.responsavelId); return r ? r.nome : ''; }
        if (k === 'integrantes') return (D.membros.get(f.id) || []).length;
        if (k === 'ultima_visita') return D.ultF.get(f.id) || '';
        return f[k] == null ? '' : f[k];
      }));
    });
  } else {
    linhas.push(['id', 'data', 'hora', 'familia', 'microarea', 'endereco', 'pessoas', 'tipo', 'motivo', 'situacao', 'realizada', 'linhas_de_cuidado', 'situacao_encontrada', 'orientacoes', 'encaminhamentos', 'observacoes', 'resultado', 'acs', 'ficticio']);
    Array.from(S.visitas.values()).sort(ordVisita).forEach(function (v) {
      var f = S.familias.get(v.familiaId) || {};
      linhas.push([v.id, v.data, v.hora, f.codigo || '', f.microarea || '', enderecoCompletoTxt(f, true), (v.pessoaIds || []).map(function (id) { var p = S.pessoas.get(id); return p ? p.nome : ''; }).join(', '), v.tipo, v.motivo, v.situacao, P.ehRealizada(v) ? 'Sim' : 'Não', P.ehRealizada(v) ? P.linhasDaVisita(v, S.pessoas).map(rotLinha).join(', ') : '', v.situacao_encontrada, v.orientacoes, v.encaminhamentos, v.observacoes, v.resultado, nomeAcs(P.acsDaVisita(v)), v.demo ? 'Sim' : '']);
    });
  }
  var csv = '﻿' + linhas.map(csvLinha).join('\r\n');
  try { await S.downloads.save({ filename: 'acs-digital-' + t + '-' + hojeISO() + '.csv', data: csv }); toast('Arquivo exportado.', 'ok'); }
  catch (e) { if (e && e.code === 'declined') return; toast('Não foi possível exportar (' + ((e && e.code) || 'erro') + ').', 'erro'); }
}

// --- Base demonstrativa fictícia ---
function gerarCPF() {
  var n = []; for (var i = 0; i < 9; i++) n.push(Math.floor(Math.random() * 10));
  var s = 0; for (i = 0; i < 9; i++) s += n[i] * (10 - i); var d1 = (s * 10) % 11; if (d1 === 10) d1 = 0; n.push(d1);
  s = 0; for (i = 0; i < 10; i++) s += n[i] * (11 - i); var d2 = (s * 10) % 11; if (d2 === 10) d2 = 0; n.push(d2);
  return n.join('');
}
function gerarCNS() {
  var pis = '7' + String(Math.floor(Math.random() * 1e10)).padStart(10, '0'), soma = 0, i;
  // provisório (7xx): ajusta último dígito para soma%11==0
  for (var t = 0; t < 200; t++) {
    var base = '7' + String(Math.floor(Math.random() * 1e13)).padStart(13, '0');
    for (var d = 0; d <= 9; d++) { var c = base + d; soma = 0; for (i = 0; i < 15; i++) soma += +c[i] * (15 - i); if (soma % 11 === 0) return c; }
  }
  return pis;
}
function gerarNIS() { var b = '1' + String(Math.floor(Math.random() * 1e9)).padStart(9, '0'), p = [3, 2, 9, 8, 7, 6, 5, 4, 3, 2], s = 0; for (var i = 0; i < 10; i++) s += +b[i] * p[i]; var dv = 11 - (s % 11); if (dv >= 10) dv = 0; return b + dv; }
function nascAnos(anos, extraDias) { var d = new Date(); d.setFullYear(d.getFullYear() - anos); d.setDate(d.getDate() - (extraDias || 40)); return isoLocal(d); }
async function carregarDemo() {
  var prog = $('#demoProg');
  var fams = [
    { micro: '01', end: 'Rua Exemplo das Flores', num: '45', bairro: 'Vila Modelo', cep: '20000001', completo: true },
    { micro: '01', end: 'Travessa Fictícia', num: '12', bairro: 'Vila Modelo', cep: '20000002', completo: true },
    { micro: '02', end: 'Avenida Demonstração', num: '300', bairro: 'Jardim Teste', cep: '20000003', completo: false },
    { micro: '02', end: 'Rua Simulada', num: '8', bairro: 'Jardim Teste', cep: '', completo: false },
    { micro: '03', end: 'Estrada do Exemplo', num: 's/n', bairro: 'Parque Piloto', cep: '20000005', completo: true }
  ];
  var DOM = { situacao_moradia: 'Próprio', tempo_moradia: 'Mais de 10 anos', comodos: 5, energia_eletrica: 'Sim', material_paredes: 'Alvenaria/tijolo com revestimento', filtro_agua: 'Sim', tratamento_agua: 'Filtração', abastecimento_agua: 'Rede encanada até o domicílio', escoamento_sanitario: 'Rede coletora de esgoto ou pluvial', destino_lixo: 'Coletado', renda_familiar: '1 a 2 salários mínimos' };
  var pessoasDef = [
    // [famIdx, nome, idade, sexo, perfil, condicoes, resp]
    [0, 'Ana Exemplo Ribeiro', 58, 'Feminino', 'completo', { has: true }, true], [0, 'Carlos Exemplo Ribeiro', 61, 'Masculino', 'completo', { has: true, dm: true }], [0, 'Beatriz Exemplo Ribeiro', 4, 'Feminino', 'crianca'],
    [1, 'Daniela Fictícia Souza', 27, 'Feminino', 'completo', { gestante: true }, true], [1, 'Eduardo Fictício Souza', 30, 'Masculino', 'semcns', { tuberculose: true }], [1, 'Lucas Fictício Souza', 1, 'Masculino', 'criancaBenef'],
    [2, 'Fernanda Demo Lima', 44, 'Feminino', 'parcial', { dm: true, hanseniase: true }, true], [2, 'Gabriel Demo Lima', 16, 'Masculino', 'parcial'],
    [3, 'Helena Teste Costa', 82, 'Feminino', 'basico', { acamado: true, has: true }, true], [3, 'Igor Teste Costa', 6, 'Masculino', 'crianca'],
    [4, 'Joana Piloto Alves', 35, 'Feminino', 'completo', {}, true], [4, 'Kauã Piloto Alves', 9, 'Masculino', 'completo'], [4, 'Marta Piloto Alves', 67, 'Feminino', 'semtel', { domiciliado: true }]
  ];
  var total = fams.length + pessoasDef.length + 1, feitos = 0;
  function passo() { feitos++; if (prog) prog.textContent = 'Gravando ' + feitos + ' de ' + total + '…'; }
  try {
    var famIds = [];
    var base = Array.from(S.familias.values()).reduce(function (m, f) { var n = parseInt(String(f.codigo || '').replace(/\D/g, ''), 10) || 0; return Math.max(m, n); }, 0);
    for (var i = 0; i < fams.length; i++) {
      var fd = fams[i], id = novoId('f');
      var doc = { codigo: 'F' + String(base + i + 1).padStart(4, '0'), endereco: fd.end, numero: fd.num, complemento: '', bairro: fd.bairro, cep: fd.cep, microarea: fd.micro, unidade: cfg().unidade || 'UBS Exemplo (fictícia)', equipe: cfg().equipe || 'Equipe 1', telefone: '', data_cadastro: addDias(hojeISO(), -20 * (i + 1)), situacao: 'Ativa', demo: true, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
      Object.keys(DOM).forEach(function (k) { if (fd.completo || ['situacao_moradia', 'energia_eletrica', 'abastecimento_agua', 'destino_lixo'].indexOf(k) >= 0) doc[k] = DOM[k]; });
      comHistorico(doc, null, 'Cadastrou (base fictícia)', []);
      await gravar('familias', id, doc); famIds.push({ id: id, doc: doc }); passo(); await sleep(120);
    }
    var pIds = [];
    for (var j = 0; j < pessoasDef.length; j++) {
      var pd = pessoasDef[j], pid = novoId('p'), fam = famIds[pd[0]];
      var anos = pd[2], perfil = pd[4];
      var p = { familiaId: fam.id, nome: pd[1], data_nascimento: anos === 6 ? nascAnos(6, 100) : nascAnos(anos), sexo: pd[3], situacao: 'Ativo', condicoes: pd[5] || {}, demo: true };
      if (perfil !== 'basico') Object.assign(p, { cpf_dnv: anos < 6 ? { tipo: 'DNV', numero: String(Math.floor(1e10 + Math.random() * 8e10)) } : { tipo: 'CPF', numero: gerarCPF() }, cns: perfil === 'semcns' ? '' : gerarCNS(), nacionalidade: 'Brasileira', municipio_nascimento: 'Rio de Janeiro', raca_cor: ['Parda', 'Preta', 'Branca'][j % 3], deficiencia: 'Não possui' });
      else Object.assign(p, { nacionalidade: 'Brasileira', raca_cor: 'Branca' });
      if (anos >= 6 && perfil !== 'basico') Object.assign(p, { situacao_familiar: anos < 18 ? 'Convive com familiar(es), sem companheiro(a)' : 'Convive com companheiro(a) e filho(s)', frequenta_escola: anos < 18 ? 'Sim' : 'Não', escolaridade: anos < 18 ? 'Ensino fundamental incompleto' : 'Ensino médio completo', territorio_social: 'Não', cartao_familia_carioca: 'Não', auxilio_brasil: 'Não', plano_saude: 'Não', fuma: 'Não', religiao: 'Católica', telefone: perfil === 'semtel' ? '' : '2199' + String(Math.floor(1e6 + Math.random() * 8e6)) });
      if (perfil === 'parcial') { delete p.religiao; delete p.escolaridade; delete p.plano_saude; }
      if (anos < 6) Object.assign(p, { territorio_social: perfil === 'criancaBenef' ? 'Sim' : 'Não', cartao_familia_carioca: 'Não', auxilio_brasil: perfil === 'criancaBenef' ? 'Sim' : 'Não', plano_saude: 'Não', certidao_nascimento: 'Sim', creche: anos >= 2 ? 'Sim' : 'Não', parentesco_cuidador: 'Mãe' });
      if (perfil === 'criancaBenef') p.nis = gerarNIS();
      if (pd[5] && pd[5].gestante) p.dum = addDias(hojeISO(), -150);
      p.criadoEm = new Date().toISOString(); p.atualizadoEm = new Date().toISOString();
      comHistorico(p, null, 'Cadastrou (base fictícia)', []);
      await gravar('pessoas', pid, p); pIds.push({ id: pid, fam: pd[0], resp: pd[6], p: p }); passo(); await sleep(120);
    }
    // responsáveis e cuidadores
    for (var k = 0; k < famIds.length; k++) {
      var resp = pIds.filter(function (x) { return x.fam === k && x.resp; })[0];
      if (resp) { var fdoc = Object.assign({}, famIds[k].doc, { responsavelId: resp.id }); await gravar('familias', famIds[k].id, fdoc); await sleep(120); }
    }
    for (var m = 0; m < pIds.length; m++) {
      var px = pIds[m]; if (!(px.p.parentesco_cuidador)) continue;
      var mae = pIds.filter(function (x) { return x.fam === px.fam && x.resp; })[0];
      if (mae) { var pp = Object.assign({}, px.p, { cuidador: { pessoaId: mae.id } }); await gravar('pessoas', px.id, pp); await sleep(120); }
    }
    // visitas distribuídas nos últimos 6 meses (agregadas: uma por família/mês)
    var nv = 0;
    for (var a = 0; a < famIds.length; a++) {
      for (var mes = 0; mes < 5; mes++) {
        if ((a + mes) % 3 === 2) continue;
        var membros = pIds.filter(function (x) { return x.fam === a; }).map(function (x) { return x.id; });
        var dia = addDias(hojeISO(), -(mes * 30 + a * 2));
        var sit = (a === 3 && mes < 2) ? 'Morador ausente' : 'Visita realizada';
        if (a === 2 && mes === 0) continue;
        var vd = { acsId: S.me || null, familiaId: famIds[a].id, pessoaIds: sit === 'Visita realizada' ? membros : [], data: dia, hora: pad(8 + a) + ':30', tipo: mes === 4 ? 'Cadastramento/atualização' : 'Visita periódica', motivo: 'Acompanhamento de rotina', situacao: sit, situacao_encontrada: '', orientacoes: sit === 'Visita realizada' ? 'Orientações gerais de prevenção.' : '', encaminhamentos: '', observacoes: 'Registro fictício.', resultado: '', demo: true, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
        comHistorico(vd, null, 'Registrou (base fictícia)', []);
        await gravar('visitas', novoId('v'), vd); nv++; if (prog) prog.textContent = 'Gravando visitas fictícias… ' + nv; await sleep(120);
      }
    }
    // compromissos fictícios na agenda
    var pid = function (n) { var x = pIds.filter(function (q) { return q.p.nome.indexOf(n) === 0; })[0]; return x ? x.id : ''; };
    var hj = hojeISO(), agDemo = [
      { categoria: 'retorno', titulo: 'Retorno — Ana Exemplo Ribeiro', pessoaId: pid('Ana'), familiaId: famIds[0].id, linha: 'has', data: hj, hora: '09:00', motivo: 'Conferir uso da medicação e orientar sobre a consulta', situacao: 'Agendado' },
      { categoria: 'visita', titulo: 'Visita — Helena Teste Costa', pessoaId: pid('Helena'), familiaId: famIds[3].id, linha: 'acamado', data: hj, hora: '10:30', motivo: 'Acompanhamento de pessoa acamada', situacao: 'Agendado' },
      { categoria: 'retorno', titulo: 'Retorno — Daniela Fictícia Souza', pessoaId: pid('Daniela'), familiaId: famIds[1].id, linha: 'gestante', data: addDias(hj, -1), hora: '14:00', motivo: 'Verificar agendamento do pré-natal', situacao: 'Agendado' },
      { categoria: 'reuniao', titulo: 'Reunião de equipe', data: addDias(hj, 1), hora: '14:00', endereco: 'UBS Exemplo (fictícia)', motivo: 'Planejamento mensal', situacao: 'Agendado' },
      { categoria: 'acao_coletiva', titulo: 'Grupo de hipertensos', linha: 'has', data: addDias(hj, 6), hora: '09:00', endereco: 'Salão comunitário (fictício)', situacao: 'Agendado' },
      { categoria: 'visita', titulo: 'Visita — Família F0003', familiaId: famIds[2].id, data: addDias(hj, -3), hora: '11:00', motivo: 'Atualização cadastral', situacao: 'Não realizado', observacoes: 'Não realizado: ninguém em casa' }
    ];
    for (var g = 0; g < agDemo.length; g++) {
      var ad = Object.assign({ pessoaId: '', familiaId: '', linha: '', endereco: '', motivo: '', observacoes: '', acsId: S.me || null, demo: true, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() }, agDemo[g]);
      if (ad.familiaId && !ad.endereco) { var fx = famIds.filter(function (q) { return q.id === ad.familiaId; })[0]; ad.endereco = [fx.doc.endereco + ', ' + fx.doc.numero, fx.doc.bairro].join(' — '); }
      comHistorico(ad, null, 'Agendou (base fictícia)', []);
      await gravar('agenda', novoId('a'), ad); await sleep(120);
    }
    toast('Base fictícia carregada: ' + fams.length + ' famílias, ' + pessoasDef.length + ' pessoas, ' + nv + ' visitas, ' + agDemo.length + ' compromissos.', 'ok');
    if (prog) prog.textContent = '';
  } catch (e) { toast(msgErro(e), 'erro'); if (prog) prog.textContent = 'Interrompido.'; }
}
async function removerDemo() {
  var prog = $('#demoProg'), l = [];
  [['agenda', S.agenda], ['pendencias', S.estadosPend], ['visitas', S.visitas], ['pessoas', S.pessoas], ['familias', S.familias]].forEach(function (x) { x[1].forEach(function (o, k) { if (o.demo) l.push([x[0], o.id || k]); }); });
  try {
    for (var i = 0; i < l.length; i++) { await apagar(l[i][0], l[i][1]); if (prog) prog.textContent = 'Removendo ' + (i + 1) + ' de ' + l.length + '…'; await sleep(100); }
    toast('Registros fictícios removidos.', 'ok'); if (prog) prog.textContent = '';
  } catch (e) { toast(msgErro(e), 'erro'); }
}

// ============================================================================
// MÓDULO VISITAS DOMICILIARES E PRODUTIVIDADE (v2)
// Inserido no escopo do app. Não altera os módulos anteriores: só os estende.
// ============================================================================
var P = window.ACSProdutividade;
var LINHAS_FORM = P.LINHAS.filter(function (l) { return l[0] !== 'demais'; });
function rotLinha(k) { var x = P.LINHAS.filter(function (l) { return l[0] === k; })[0]; return x ? x[1] : k; }
var PRESETS = [['hoje', 'Hoje'], ['7d', '7 dias'], ['30d', '30 dias'], ['mes', 'Mês atual'], ['mes_anterior', 'Mês anterior'], ['tudo', 'Tudo'], ['personalizado', 'Personalizado']];

S.vis = { aba: 'produtividade', preset: 'mes', de: '', ate: '', micro: '', linha: '', pessoaId: '', situacao: '', incluirDemo: false /* fictícios fora dos indicadores de produção */, mesMeta: hojeISO().slice(0, 7) };
S.rel = { tipo: 'mensal', data: hojeISO(), mes: hojeISO().slice(0, 7), de: P.addDias(hojeISO(), -29), ate: hojeISO(), micro: '', linha: '', nMeses: 6 };
S.metasDoc = null;

function chaveAcs() { return S.me || 'sem-usuario'; }
function iniciarMetas() {
  if (!S.db) return;
  S.db.doc('metas/' + chaveAcs()).onSnapshot(function (d) {
    S.metasDoc = d.exists ? d.data() : { meses: {} };
    aoMudarDados();
  }, function () { S.metasDoc = { meses: {} }; });
}
function ctxP() { return { pessoas: S.pessoas, familias: S.familias }; }
function todasVisitas() { return Array.from(S.visitas.values()); }
function periodoAtual(v) {
  v = v || S.vis;
  if (v.preset === 'tudo') return { de: '0000-01-01', ate: '9999-12-31', rotulo: 'Todo o período' };
  return P.periodo(v.preset, hojeISO(), v.de, v.ate);
}
function filtroVis(extra) {
  var p = periodoAtual();
  return Object.assign({ de: p.de, ate: p.ate, micro: S.vis.micro, linha: S.vis.linha, pessoaId: S.vis.pessoaId, situacao: S.vis.situacao, incluirDemo: S.vis.incluirDemo }, extra || {});
}
function baseMedia() { return (S.metasDoc && S.metasDoc.mediaBase) || 'uteis'; }
function nomeAcs(id) {
  if (!id) return 'Não identificado';
  if (id === S.me) return PROD.nomeUsuario() || 'Você';
  return PROD.nomeDe(id) || 'Outro usuário autorizado';
}
function fmtNum(n, c) { return n == null ? '—' : Number(n).toFixed(c || 0).replace('.', ','); }
function nomeMes(m) { return ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'][+m.slice(5, 7) - 1] + '/' + m.slice(0, 4); }
function mesCurto(m) { return MESES[+m.slice(5, 7) - 1] + '/' + m.slice(2, 4); }

// ---------------- Google Maps ----------------
function temCoord(f) { return f && f.latitude !== '' && f.latitude != null && f.longitude !== '' && f.longitude != null && isFinite(f.latitude) && isFinite(f.longitude); }
function enderecoCompletoTxt(f, comComplemento, sep) {
  if (!f) return '';
  var p = [];
  if (f.endereco) p.push(f.endereco + (f.numero ? ', ' + f.numero : ''));
  if (comComplemento && f.complemento) p.push(f.complemento);
  if (f.bairro) p.push(f.bairro);
  if (cfg().municipio) p.push(cfg().municipio);
  var cep = C.soDigitos(f.cep || ''); if (cep.length === 8) p.push('CEP ' + cep.slice(0, 5) + '-' + cep.slice(5));
  return p.join(sep || ' — ');
}
function enderecoIncompleto(f) { return !f || !f.endereco || !f.numero || !f.bairro; }
// Prioridade: coordenadas verificadas > endereço completo > coordenadas não verificadas > endereço parcial
function destinoMaps(f) {
  if (!f) return null;
  if (temCoord(f) && f.coordVerificadas) return f.latitude + ',' + f.longitude;
  if (!enderecoIncompleto(f)) return enderecoCompletoTxt(f, false, ', ') + ', Brasil';
  if (temCoord(f)) return f.latitude + ',' + f.longitude;
  if (f.endereco) return enderecoCompletoTxt(f, false, ', ') + ', Brasil';
  return null;
}
function urlMaps(f) { var d = destinoMaps(f); return d ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(d) : null; }
function urlRota(f) { var d = destinoMaps(f); return d ? 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(d) : null; }
var ICO_PIN = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0119 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>';
function botaoRota(f, peq) {
  var u = urlRota(f);
  var h = u ? '<a class="btn rota' + (peq ? ' peq' : '') + '" href="' + esc(u) + '" target="_blank" rel="noopener">' + ICO_PIN + 'COMO CHEGAR</a>'
    : '<button class="btn rota' + (peq ? ' peq' : '') + '" disabled>' + ICO_PIN + 'COMO CHEGAR</button>';
  if (f && enderecoIncompleto(f) && !(temCoord(f) && f.coordVerificadas) && !somenteLeitura()) h += '<button class="btn sec' + (peq ? ' peq' : '') + '" data-act="editarFamilia" data-id="' + f.id + '">Corrigir endereço</button>';
  return h;
}
function linkEndereco(f) {
  var t = enderecoCompletoTxt(f, true) || 'Endereço não informado', u = urlMaps(f);
  return u ? '<a href="' + esc(u) + '" target="_blank" rel="noopener" class="endlink">' + ICO_PIN + esc(t) + '</a>' : esc(t);
}
function blocoEndereco(f) {
  if (!f) return '';
  var st = temCoord(f) ? (f.coordVerificadas ? '<span class="chip" style="background:var(--verde-cl);color:var(--verde)">Coordenadas verificadas</span>' : '<span class="chip">Coordenadas não verificadas</span>')
    : (enderecoIncompleto(f) ? '<span class="chip" style="background:var(--amarelo-cl);color:var(--amarelo)">Endereço incompleto</span>' : '');
  return '<div class="endbox"><div>' + linkEndereco(f) + '</div>' + (st ? '<div class="chips" style="margin-top:6px">' + st + '</div>' : '') + '<div class="btns mt">' + botaoRota(f) + '</div></div>';
}
function parseCoord(s) {
  s = String(s || '').trim(); if (!s) return { vazio: true };
  var m = /^(-?\d{1,2}(?:\.\d+)?)\s*[,; ]\s*(-?\d{1,3}(?:\.\d+)?)$/.exec(s.replace(/\s+/g, ' '));
  if (!m) return { erro: true };
  var la = +m[1], lo = +m[2];
  if (la < -90 || la > 90 || lo < -180 || lo > 180) return { erro: true };
  return { lat: la, lng: lo };
}

// ---------------- Card no painel ----------------
function cardVisitasPainel() {
  var hoje = hojeISO(), todas = todasVisitas(), ctx = ctxP(), dem = S.vis.incluirDemo;
  function n(preset, sit) { var p = preset === 'tudo' ? { de: '0000-01-01', ate: '9999-12-31' } : P.periodo(preset, hoje); return P.filtrar(todas, { de: p.de, ate: p.ate, situacao: sit, incluirDemo: dem }, ctx).length; }
  var D = derivados(), pend = D.famAtivas.filter(function (f) { return semVisita(f.id, prazo('familia'), D.ultF); }).length;
  var mes = hoje.slice(0, 7), mt = dadosMeta(mes);
  var h = '<div class="card vcardp mt"><div class="vhead"><h2 style="margin:0">' + ico('visita', 'width="20" height="20"') + ' VISITAS DOMICILIARES</h2><button class="btn peq" data-act="novaVisita">' + ico('add', 'width="16" height="16"') + 'Registrar</button></div><div class="grid g3 mt">' +
    tile(n('tudo', 'realizadas'), 'Total de visitas realizadas', null, 'data-act="visAbrir" data-p="tudo" data-s="realizadas"') +
    tile(n('hoje', 'realizadas'), 'Realizadas hoje', null, 'data-act="visAbrir" data-p="hoje" data-s="realizadas"') +
    tile(n('semana', 'realizadas'), 'Realizadas nesta semana', 'segunda a domingo', 'data-act="visAbrir" data-p="semana" data-s="realizadas"') +
    tile(n('mes', 'realizadas'), 'Realizadas no mês', null, 'data-act="visAbrir" data-p="mes" data-s="realizadas"') +
    tile(pend, 'Visitas pendentes', 'famílias sem visita há mais de ' + prazo('familia') + ' dias', 'data-act="alerta" data-k="famsemvisita"') +
    tile(n('mes', 'tentativas'), 'Tentativas não concluídas', 'no mês', 'data-act="visAbrir" data-p="mes" data-s="tentativas"') + '</div>';
  h += mt.meta ? '<button class="metamini" data-act="visAba" data-a="produtividade"><div class="mm-l"><b>Meta de ' + esc(nomeMes(mes)) + '</b><span>' + mt.realizadas + ' de ' + mt.meta + ' · ' + P.fmtPct(mt.percentual) + '</span></div><div class="progress azul"><i style="width:' + Math.min(100, mt.percentual) + '%"></i></div></button>'
    : '<button class="metamini" data-act="metaEditar"><div class="mm-l"><b>Meta mensal não definida</b><span>Toque para definir sua meta de ' + esc(nomeMes(mes)) + '</span></div></button>';
  if (todas.some(function (v) { return v.demo; })) h += '<p class="contagem mt" style="margin-bottom:0">' + (dem ? 'Inclui registros fictícios da base demonstrativa — não são produção real.' : 'Registros fictícios não entram nestes números.') + '</p>';
  return h + '</div>';
}

// ---------------- Meta ----------------
function dadosMeta(mes) {
  var meta = P.metaDoMes(S.metasDoc, mes);
  var real = P.filtrar(todasVisitas(), { de: mes + '-01', ate: mes + '-31', situacao: 'realizadas', incluirDemo: S.vis.incluirDemo, acsId: S.me || undefined }, ctxP()).length;
  return P.calcularMeta(meta, real, mes, hojeISO(), baseMedia());
}
function cardMeta() {
  var mes = S.vis.mesMeta, m = dadosMeta(mes), reg = S.metasDoc && S.metasDoc.meses && S.metasDoc.meses[mes];
  var h = '<div class="card"><div class="vhead"><h2 style="margin:0">Meta mensal de visitas</h2><input type="month" data-vf="mesMeta" value="' + esc(mes) + '" style="width:auto;min-height:38px;padding:6px 10px"></div>';
  if (!m.meta) {
    h += '<div class="vazio mt"><strong>Nenhuma meta definida para ' + esc(nomeMes(mes)) + '</strong>A meta é individual e definida por você ou pela instituição. O sistema não define metas automaticamente.<div class="mt">' + (somenteLeitura() ? '' : '<button class="btn" data-act="metaEditar">Definir meta</button>') + '</div></div>';
    h += '<p class="contagem mt">Realizadas por você em ' + esc(nomeMes(mes)) + ': <b>' + m.realizadas + '</b></p>';
  } else {
    var pct = m.percentual, cor = pct >= 100 ? 'verde' : 'azul';
    h += '<div class="metagrid mt"><div><div class="mv">' + m.realizadas + '<small> / ' + m.meta + '</small></div><div class="l">realizadas / meta</div></div><div><div class="mv">' + P.fmtPct(pct) + '</div><div class="l">atingido</div></div></div>';
    h += '<div class="progress ' + cor + ' grande mt" role="progressbar" aria-valuenow="' + Math.round(pct) + '" aria-valuemin="0" aria-valuemax="100"><i style="width:' + Math.min(100, pct) + '%"></i></div>';
    h += '<dl class="kv mt"><dt>Meta definida</dt><dd>' + m.meta + ' visitas</dd><dt>Total realizado</dt><dd>' + m.realizadas + '</dd><dt>Restantes</dt><dd>' + m.restantes + '</dd><dt>Percentual atingido</dt><dd>' + P.fmtPct(pct) + '</dd>' +
      '<dt>Média diária</dt><dd>' + fmtNum(m.mediaDiaria, 1) + ' por dia ' + (m.base === 'uteis' ? 'útil' : 'corrido') + ' (' + plural(m.diasDecorridos, 'dia', 'dias') + ' de ' + m.diasTotais + ')</dd>' +
      '<dt>Projeção até o fim do mês</dt><dd>' + m.projecao + ' visitas ' + (m.projecaoAtinge ? '<span class="chip" style="background:var(--verde-cl);color:var(--verde)">✓ atinge a meta</span>' : '<span class="chip" style="background:var(--amarelo-cl);color:var(--amarelo)">! abaixo da meta</span>') + '</dd>' +
      (m.necessarioPorDia != null && m.restantes > 0 ? '<dt>Para atingir a meta</dt><dd>' + fmtNum(m.necessarioPorDia, 1) + ' visitas por dia nos ' + plural(m.diasRestantes, 'dia restante', 'dias restantes') + '</dd>' : '') + '</dl>';
    h += '<div class="btns mt">' + (somenteLeitura() ? '' : '<button class="btn sec peq" data-act="metaEditar">Alterar meta</button>') + '</div>';
  }
  h += '<div class="seg mt" style="font-size:12px"><span class="contagem" style="align-self:center;margin:0 6px 0 0">Média e projeção por:</span>' + [['uteis', 'dias úteis (seg–sex)'], ['corridos', 'dias corridos']].map(function (o) { return '<label><input type="radio" name="mediaBase" data-vf="mediaBase" value="' + o[0] + '"' + (baseMedia() === o[0] ? ' checked' : '') + '><span>' + o[1] + '</span></label>'; }).join('') + '</div>';
  if (reg && reg.historico && reg.historico.length) {
    h += '<details class="compdet mt"><summary>Histórico de metas deste mês (' + reg.historico.length + ')</summary><ul class="hist mt">' + reg.historico.slice().reverse().map(function (x) { return '<li><b>' + (x.valor ? x.valor + ' visitas' : 'meta removida') + '</b> · ' + fmtDataHora(x.em) + '</li>'; }).join('') + '</ul></details>';
  }
  return h + '</div>';
}
function abrirEditorMeta() {
  var mes = S.vis.mesMeta, atual = P.metaDoMes(S.metasDoc, mes);
  modal('<h3>Meta de ' + esc(nomeMes(mes)) + '</h3><p class="contagem">Quantidade de visitas realizadas que você pretende atingir no mês. A alteração fica registrada no histórico.</p><form id="formMeta"><div class="campo"><label class="rot">Meta mensal (visitas)</label><input type="number" name="valor" min="1" max="2000" inputmode="numeric" value="' + (atual || '') + '" required></div><div class="btns">' + (atual ? '<button type="button" class="btn perigo" data-act="metaRemover">Remover meta</button>' : '') + '<button type="button" class="btn sec" data-act="fecharModal">Cancelar</button><button type="submit" class="btn">Salvar meta</button></div></form>');
  setTimeout(function () { var i = $('#formMeta input'); if (i) i.focus(); }, 50);
}
async function salvarMeta(valor) {
  var mes = S.vis.mesMeta, doc = clone(S.metasDoc || { meses: {} }); doc.meses = doc.meses || {};
  var reg = doc.meses[mes] || { valor: null, historico: [] };
  if ((reg.valor || null) === (valor || null)) { fecharModal(); return; }
  reg.historico = (reg.historico || []).concat([{ valor: valor || null, em: new Date().toISOString(), por: S.me || null }]).slice(-50);
  reg.valor = valor || null; doc.meses[mes] = reg;
  doc.acsId = S.me || null; doc.atualizadoEm = new Date().toISOString();
  try { await gravar('metas', chaveAcs(), doc); S.metasDoc = doc; fecharModal(); toast(valor ? 'Meta de ' + nomeMes(mes) + ': ' + valor + ' visitas.' : 'Meta removida.', 'ok'); render(); }
  catch (e) { toast(msgErro(e), 'erro'); }
}
async function salvarBaseMedia(b) {
  var doc = clone(S.metasDoc || { meses: {} }); doc.mediaBase = b; doc.acsId = S.me || null;
  try { await gravar('metas', chaveAcs(), doc); S.metasDoc = doc; render(); } catch (e) { toast(msgErro(e), 'erro'); }
}

// ---------------- Filtros ----------------
function barraFiltrosVis() {
  var v = S.vis;
  var h = '<div class="filtros">' + PRESETS.map(function (p) { return '<button class="fbtn' + (v.preset === p[0] ? ' ativo' : '') + '" data-act="visPreset" data-p="' + p[0] + '">' + p[1] + '</button>'; }).join('') + '</div>';
  if (v.preset === 'personalizado') {
    var per = periodoAtual();
    h += '<div class="filtros"><label class="contagem" style="align-self:center;margin:0">De</label><input type="date" data-vf="de" value="' + esc(per.de) + '" style="width:auto;min-height:38px;padding:6px 10px"><label class="contagem" style="align-self:center;margin:0">até</label><input type="date" data-vf="ate" value="' + esc(per.ate) + '" style="width:auto;min-height:38px;padding:6px 10px"></div>';
  }
  var pessoasOrd = Array.from(S.pessoas.values()).sort(function (a, b) { return norm(a.nome) < norm(b.nome) ? -1 : 1; });
  var pSel = v.pessoaId && S.pessoas.get(v.pessoaId);
  h += '<div class="filtros">' + selectHtml('micro', microareas(), v.micro, 'Todas as microáreas', 'data-vf="micro"') +
    selectHtml('linha', P.LINHAS, v.linha, 'Todas as linhas de cuidado', 'data-vf="linha"') +
    selectHtml('situacao', [['realizadas', 'Somente realizadas'], ['tentativas', 'Somente tentativas']].concat(SITUACOES_VISITA.map(function (s) { return [s, s]; })), v.situacao, 'Todas as situações', 'data-vf="situacao"') +
    '<input type="search" list="dlPacientes" data-vf="paciente" placeholder="Paciente" value="' + esc(pSel ? pSel.nome + (S.familias.get(pSel.familiaId) ? ' — ' + S.familias.get(pSel.familiaId).codigo : '') : '') + '" style="min-width:180px;min-height:38px;padding:6px 10px"><datalist id="dlPacientes">' +
    pessoasOrd.map(function (p) { var f = S.familias.get(p.familiaId); return '<option value="' + esc(p.nome + (f ? ' — ' + f.codigo : '')) + '">'; }).join('') + '</datalist></div>';
  var ativos = [];
  if (v.micro) ativos.push('Microárea ' + v.micro);
  if (v.linha) ativos.push(rotLinha(v.linha));
  if (pSel) ativos.push(pSel.nome);
  if (v.situacao) ativos.push(v.situacao === 'realizadas' ? 'Realizadas' : v.situacao === 'tentativas' ? 'Tentativas' : v.situacao);
  var per2 = periodoAtual();
  h += '<p class="contagem">' + esc(per2.rotulo) + (v.preset !== 'tudo' ? ' (' + fmtData(per2.de) + ' a ' + fmtData(per2.ate) + ')' : '') + (ativos.length ? ' · ' + esc(ativos.join(' · ')) + ' <button class="linkbtn" data-act="visLimpar">limpar filtros</button>' : '') + '</p>';
  return h;
}
function avisoDemo(r) {
  var temDemo = todasVisitas().some(function (v) { return v.demo; });
  if (!temDemo) return '';
  return S.vis.incluirDemo
    ? '<div class="aviso amarelo">' + (r && r.demo ? 'Este resultado inclui ' + plural(r.demo, 'registro fictício', 'registros fictícios') + ' da base demonstrativa — não são produção real. ' : 'Há registros fictícios na base. ') + '<button class="btn peq sec" data-act="visDemo" data-v="0">Ocultar fictícios</button></div>'
    : '<div class="aviso">Registros fictícios não entram nos indicadores de produção nem nos relatórios. <button class="btn peq sec" data-act="visDemo" data-v="1">Mostrar fictícios</button></div>';
}

// ---------------- Tela principal de Visitas ----------------
function viewVisitas() {
  var a = S.vis.aba;
  var h = '<div class="tabs" role="tablist">' + [['produtividade', 'Produtividade'], ['registros', 'Registros'], ['relatorios', 'Relatórios']].map(function (t) { return '<button role="tab" class="' + (a === t[0] ? 'ativo' : '') + '" data-act="visAba" data-a="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div>';
  if (a === 'registros') return h + viewRegistros();
  if (a === 'relatorios') return h + viewRelatorios();
  return h + viewProdutividade();
}

function viewProdutividade() {
  var ctx = ctxP(), per = periodoAtual();
  var lista = P.filtrar(todasVisitas(), filtroVis(), ctx);
  var r = P.resumo(lista, ctx);
  var ateMedia = per.ate > hojeISO() ? hojeISO() : per.ate;
  var deMedia = per.preset === 'tudo' || S.vis.preset === 'tudo' ? (lista.length ? lista.reduce(function (m, v) { return v.data < m ? v.data : m; }, '9999') : hojeISO()) : per.de;
  var dias = P.contarDias(deMedia, ateMedia, baseMedia());
  var h = barraFiltrosVis() + avisoDemo(r);
  h += '<div class="btns" style="margin-bottom:12px"><button class="btn" data-act="novaVisita">' + ico('add', 'width="18" height="18"') + 'Registrar visita</button></div>';
  h += '<div class="grid g3">' +
    tile(r.realizadas, 'Visitas realizadas', 'no período filtrado', 'data-act="visRegistros" data-s="realizadas"') +
    tile(r.tentativas, 'Tentativas não concluídas', TENTATIVAS_TXT(r), 'data-act="visRegistros" data-s="tentativas"') +
    tile(r.pessoasAtendidas, 'Pessoas atendidas', 'moradores distintos', 'data-act="visRegistros" data-s="realizadas"') +
    tile(r.familiasVisitadas, 'Famílias visitadas', null, 'data-act="visRegistros" data-s="realizadas"') +
    tile(fmtNum(dias ? r.realizadas / dias : 0, 1), 'Média por dia', 'por dia ' + (baseMedia() === 'uteis' ? 'útil' : 'corrido') + ' (' + dias + ')') +
    tile(r.realizadas + r.tentativas ? P.fmtPct(r.realizadas / (r.realizadas + r.tentativas) * 100, 0) : '—', 'Taxa de conclusão', 'realizadas ÷ todas as tentativas') + '</div>';
  h += '<div class="mt2">' + cardMeta() + '</div>';
  // linhas de cuidado
  h += '<div class="card"><h2>Visitas realizadas por linha de cuidado</h2><p class="contagem">Uma visita pode estar em mais de uma linha; no total geral ela conta uma única vez (' + plural(r.realizadas, 'visita', 'visitas') + ').</p><div class="grid g2">';
  P.LINHAS.forEach(function (l) {
    h += '<button class="tile linha" data-act="visLinha" data-l="' + l[0] + '"><div class="v">' + r.porLinha[l[0]] + '</div><div class="l">' + esc(l[1]) + '</div><div class="s">' + plural(r.pessoasPorLinha[l[0]] || 0, 'pessoa atendida', 'pessoas atendidas') + '</div></button>';
  });
  h += '</div></div>';
  // gráficos
  var real = P.filtrar(todasVisitas(), filtroVis({ de: '', ate: '', situacao: 'realizadas' }), ctx);
  var deG = per.de, ateG = per.ate > hojeISO() ? hojeISO() : per.ate;
  if (S.vis.preset === 'tudo') { deG = P.addDias(hojeISO(), -29); ateG = hojeISO(); }
  var nd = P.contarDias(deG, ateG, 'corridos');
  h += '<div class="gcharts mt">';
  h += '<div class="card" style="margin:0"><h2>Visitas por dia</h2>' + (nd <= 62 ? graficoBarrasVis(P.serieDiaria(r.porDia, deG, ateG).map(function (x) { return { r: x[0].slice(8, 10) + '/' + x[0].slice(5, 7), v: x[1], t: fmtData(x[0]) + ': ' + plural(x[1], 'visita', 'visitas') }; })) : '<p class="contagem">Período longo demais para o gráfico diário (máx. 62 dias). Veja por semana ou por mês.</p>') + (S.vis.preset === 'tudo' ? '<p class="contagem">Últimos 30 dias.</p>' : '') + '</div>';
  var sem = P.serieSemanal(r.porDia, deG, ateG);
  h += '<div class="card" style="margin:0"><h2>Visitas por semana</h2>' + (sem.length <= 26 ? graficoBarrasVis(sem.map(function (x) { return { r: x[0].slice(8, 10) + '/' + x[0].slice(5, 7), v: x[1], t: 'Semana de ' + fmtData(x[0]) + ': ' + plural(x[1], 'visita', 'visitas') }; })) : '<p class="contagem">Período longo demais para o gráfico semanal.</p>') + '<p class="contagem">Semanas de segunda a domingo; rótulo = segunda-feira.</p></div>';
  var mesFim = (per.ate > hojeISO() ? hojeISO() : per.ate).slice(0, 7);
  if (S.vis.preset === 'tudo') mesFim = hojeISO().slice(0, 7);
  h += '<div class="card" style="margin:0"><h2>Visitas por mês</h2>' + graficoBarrasVis(P.serieMensal(real, mesFim, 6).map(function (x) { return { r: mesCurto(x[0]), v: x[1], t: nomeMes(x[0]) + ': ' + plural(x[1], 'visita', 'visitas') }; })) + '</div>';
  h += '<div class="card" style="margin:0"><h2>Comparativo entre meses</h2>' + graficoComparativo(real) + '</div>';
  h += '<div class="card" style="margin:0"><h2>Visitas por microárea</h2>' + hbarras(Object.keys(r.porMicro).sort().map(function (k) { return [k, r.porMicro[k]]; })) + '</div>';
  h += '<div class="card" style="margin:0"><h2>Visitas por linha de cuidado</h2>' + hbarras(P.LINHAS.map(function (l) { return [l[1], r.porLinha[l[0]]]; })) + '</div>';
  h += '<div class="card" style="margin:0"><h2>Evolução da meta mensal</h2>' + graficoMetas(6) + '</div>';
  h += '</div>';
  return h;
}
function TENTATIVAS_TXT(r) {
  var p = P.TENTATIVAS.filter(function (s) { return r.porSituacao[s]; }).map(function (s) { return r.porSituacao[s] + ' ' + s.toLowerCase(); });
  return p.length ? p.join(' · ') : 'nenhuma';
}

// ---------------- Gráficos ----------------
function graficoBarrasVis(pts) {
  if (!pts.length) return '<p class="contagem">Sem dados.</p>';
  var W = 560, H = 200, top = 20, base = 166, left = 6, n = pts.length;
  var max = Math.max.apply(null, pts.map(function (p) { return p.v; }).concat([1]));
  var bw = (W - left * 2) / n, barW = Math.max(3, Math.min(40, bw * 0.62));
  var passo = Math.ceil(n / 10), valores = n <= 16;
  var s = '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Gráfico de barras"><line x1="0" x2="' + W + '" y1="' + base + '" y2="' + base + '" stroke="#CBD5E1"/>';
  pts.forEach(function (p, i) {
    var h = p.v ? Math.max(3, p.v / max * (base - top - 12)) : 0, x = left + i * bw + (bw - barW) / 2, y = base - h, rr = Math.min(4, barW / 2);
    s += '<g><title>' + esc(p.t) + '</title><rect x="' + (left + i * bw) + '" y="' + top + '" width="' + bw + '" height="' + (base - top) + '" fill="transparent"/>';
    if (h) s += '<path d="M' + x + ',' + base + 'V' + (y + rr) + 'q0,-' + rr + ' ' + rr + ',-' + rr + 'h' + (barW - 2 * rr) + 'q' + rr + ',0 ' + rr + ',' + rr + 'V' + base + 'z" fill="#1554C0"/>';
    if (valores && p.v) s += '<text x="' + (x + barW / 2) + '" y="' + (y - 5) + '" text-anchor="middle" font-size="12" font-weight="600" fill="#0F172A">' + p.v + '</text>';
    if (i % passo === 0) s += '<text x="' + (x + barW / 2) + '" y="' + (base + 17) + '" text-anchor="middle" font-size="11" fill="#64748B">' + esc(p.r) + '</text>';
    s += '</g>';
  });
  if (!valores) s += '<text x="' + (W - 4) + '" y="12" text-anchor="end" font-size="11" fill="#64748B">máx. ' + max + '</text>';
  var tot = pts.reduce(function (a, p) { return a + p.v; }, 0);
  return s + '</svg><p class="contagem">Total: <b>' + tot + '</b></p>';
}
function hbarras(pares) {
  if (!pares.length || !pares.some(function (p) { return p[1]; })) return '<p class="contagem">Sem visitas realizadas no período.</p>';
  var max = Math.max.apply(null, pares.map(function (p) { return p[1]; }).concat([1]));
  return '<div class="hbar">' + pares.map(function (p) { return '<span>' + esc(p[0]) + '</span><span class="t" title="' + esc(p[0]) + ': ' + p[1] + '"><i style="width:' + (p[1] / max * 100) + '%"></i></span><span class="n">' + p[1] + '</span>'; }).join('') + '</div>';
}
function graficoComparativo(real) {
  var mesA = hojeISO().slice(0, 7), mesB = P.mesAnterior(mesA), diaHoje = +hojeISO().slice(8, 10);
  var a = P.acumuladoMes(real, mesA, diaHoje), b = P.acumuladoMes(real, mesB);
  var W = 560, H = 210, L = 34, R = 92, T = 14, B = 176, nDias = 31;
  var max = Math.max(1, a[a.length - 1] || 0, b[b.length - 1] || 0);
  function x(i) { return L + (i / (nDias - 1)) * (W - L - R); }
  function y(v) { return B - (v / max) * (B - T); }
  function path(arr) { return arr.map(function (v, i) { return (i ? 'L' : 'M') + x(i).toFixed(1) + ',' + y(v).toFixed(1); }).join(''); }
  var s = '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Visitas acumuladas: mês atual e mês anterior">';
  [0, 0.5, 1].forEach(function (f) { var v = Math.round(max * f); s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(v) + '" y2="' + y(v) + '" stroke="#E2E8F0"/><text x="' + (L - 6) + '" y="' + (y(v) + 4) + '" text-anchor="end" font-size="11" fill="#64748B">' + v + '</text>'; });
  [1, 10, 20, 31].forEach(function (d) { s += '<text x="' + x(d - 1) + '" y="' + (B + 18) + '" text-anchor="middle" font-size="11" fill="#64748B">dia ' + d + '</text>'; });
  if (b.length) {
    s += '<path d="' + path(b) + '" fill="none" stroke="#eb6834" stroke-width="2" stroke-dasharray="6 4"/>';
    var lb = b[b.length - 1]; s += '<text x="' + (x(b.length - 1) + 6) + '" y="' + (y(lb) + 4) + '" font-size="11.5" fill="#0F172A">' + esc(mesCurto(mesB)) + ': ' + lb + '</text>';
  }
  if (a.length) {
    s += '<path d="' + path(a) + '" fill="none" stroke="#1554C0" stroke-width="2.5"/><circle cx="' + x(a.length - 1) + '" cy="' + y(a[a.length - 1]) + '" r="4.5" fill="#1554C0" stroke="#fff" stroke-width="2"/>';
    var la = a[a.length - 1]; s += '<text x="' + (x(a.length - 1) + 8) + '" y="' + (y(la) - 8) + '" font-size="11.5" font-weight="700" fill="#0F172A">' + esc(mesCurto(mesA)) + ': ' + la + '</text>';
  }
  var ateB = b[Math.min(diaHoje, b.length) - 1] || 0;
  s += '</svg><div class="legenda"><span><i style="background:#1554C0"></i>' + esc(nomeMes(mesA)) + ' (até hoje)</span><span><i class="tracejado"></i>' + esc(nomeMes(mesB)) + '</span></div>';
  var dif = (a[a.length - 1] || 0) - ateB;
  return s + '<p class="contagem">Acumulado de visitas realizadas por dia do mês. Até o dia ' + diaHoje + ': ' + (a[a.length - 1] || 0) + ' neste mês × ' + ateB + ' no mês anterior (' + (dif >= 0 ? '+' : '') + dif + ').</p>';
}
function graficoMetas(n) {
  var meses = [], m = hojeISO().slice(0, 7); for (var i = 0; i < n; i++) { meses.unshift(m); m = P.mesAnterior(m); }
  var dados = meses.map(function (x) { var d = dadosMeta(x); return { m: x, d: d }; });
  if (!dados.some(function (x) { return x.d.meta; })) return '<p class="contagem">Defina metas mensais para acompanhar a evolução.</p>';
  var W = 560, H = 200, top = 20, base = 166, left = 6, nb = dados.length, maxP = Math.max(110, Math.max.apply(null, dados.map(function (x) { return x.d.percentual || 0; })));
  var bw = (W - left * 2) / nb, barW = Math.min(44, bw * 0.56);
  function y(p) { return base - p / maxP * (base - top - 12); }
  var s = '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Percentual da meta atingido por mês">';
  s += '<line x1="0" x2="' + W + '" y1="' + base + '" y2="' + base + '" stroke="#CBD5E1"/><line x1="0" x2="' + W + '" y1="' + y(100) + '" y2="' + y(100) + '" stroke="#0F172A" stroke-dasharray="4 4" stroke-width="1"/><text x="' + (W - 4) + '" y="' + (y(100) - 5) + '" text-anchor="end" font-size="11" fill="#0F172A">meta (100%)</text>';
  dados.forEach(function (x, i) {
    var cx = left + i * bw + (bw - barW) / 2;
    s += '<g><title>' + esc(nomeMes(x.m)) + ': ' + (x.d.meta ? x.d.realizadas + ' de ' + x.d.meta + ' (' + P.fmtPct(x.d.percentual) + ')' : x.d.realizadas + ' realizadas, sem meta') + '</title>';
    if (x.d.meta) {
      var p = x.d.percentual, yy = y(Math.min(p, maxP)), hh = base - yy;
      if (hh > 0) s += '<path d="M' + cx + ',' + base + 'V' + (yy + 4) + 'q0,-4 4,-4h' + (barW - 8) + 'q4,0 4,4V' + base + 'z" fill="#1554C0"/>';
      s += '<text x="' + (cx + barW / 2) + '" y="' + (yy - 5) + '" text-anchor="middle" font-size="11.5" font-weight="600" fill="#0F172A">' + Math.floor(p) + '%</text>';
    } else s += '<text x="' + (cx + barW / 2) + '" y="' + (base - 6) + '" text-anchor="middle" font-size="10.5" fill="#64748B">sem meta</text>';
    s += '<text x="' + (cx + barW / 2) + '" y="' + (base + 17) + '" text-anchor="middle" font-size="11" fill="#64748B">' + esc(mesCurto(x.m)) + '</text></g>';
  });
  return s + '</svg>';
}

// ---------------- Registros (histórico detalhado) ----------------
function viewRegistros() {
  var ctx = ctxP(), lista = P.filtrar(todasVisitas(), filtroVis(), ctx).sort(ordVisita);
  var r = P.resumo(lista, ctx);
  var h = barraFiltrosVis() + avisoDemo(r);
  h += '<div class="barra-acoes"><div class="seg">' + [['', 'Todas'], ['realizadas', 'Realizadas'], ['tentativas', 'Tentativas']].map(function (o) { return '<label><input type="radio" name="segSit" data-vf="situacao" value="' + o[0] + '"' + (S.vis.situacao === o[0] ? ' checked' : '') + '><span>' + o[1] + '</span></label>'; }).join('') + '</div><span class="cresce"></span><button class="btn" data-act="novaVisita">' + ico('add', 'width="18" height="18"') + 'Registrar visita</button></div>';
  h += '<p class="contagem">' + plural(lista.length, 'registro', 'registros') + ' · ' + plural(r.realizadas, 'visita realizada', 'visitas realizadas') + ' · ' + plural(r.tentativas, 'tentativa não concluída', 'tentativas não concluídas') + '</p>';
  if (!lista.length) return h + '<div class="vazio"><strong>Nenhuma visita encontrada</strong>' + (S.visitas.size ? 'Amplie o período ou ajuste os filtros.' : 'Registre a primeira visita domiciliar.') + '</div>';
  var mostrar = lista.slice(0, S.vis.limite || 50);
  h += '<div class="lista">' + mostrar.map(cartaoVisita).join('') + '</div>';
  if (lista.length > mostrar.length) h += '<button class="btn sec mt" style="width:100%" data-act="visMais">Mostrar mais (' + (lista.length - mostrar.length) + ')</button>';
  return h;
}
function cartaoVisita(v) {
  var f = S.familias.get(v.familiaId), ok = P.ehRealizada(v), ro = somenteLeitura();
  var pes = (v.pessoaIds || []).map(function (id) { return S.pessoas.get(id); }).filter(Boolean);
  var linhas = ok ? P.linhasDaVisita(v, S.pessoas) : [];
  var h = '<div class="vcard"><div class="vtop"><b>' + fmtData(v.data) + (v.hora ? ' · ' + esc(v.hora) : '') + '</b><span class="chip" style="' + (ok ? 'background:var(--verde-cl);color:var(--verde)' : 'background:var(--amarelo-cl);color:var(--amarelo)') + '">' + (ok ? '✓ ' : '! ') + esc(v.situacao) + '</span>' + demoChip(v) + '</div>';
  h += '<div class="vpac">' + (pes.length ? pes.map(function (p) { return '<button class="linkbtn forte" data-act="abrirPessoa" data-id="' + p.id + '">' + esc(p.nome) + '</button>'; }).join(', ') : '<span class="contagem" style="margin:0">Nenhum morador atendido</span>') + '</div>';
  h += '<div class="vmeta">' + (f ? '<button class="linkbtn" data-act="abrirFamilia" data-id="' + f.id + '">Família ' + esc(f.codigo) + '</button> · Microárea ' + esc(f.microarea || '—') : 'Família removida') + '</div>';
  if (f) h += '<div class="vmeta">' + linkEndereco(f) + '</div>';
  if (linhas.length) h += '<div class="chips" style="margin-top:6px">' + linhas.map(function (k) { return '<span class="chip azul">' + esc(rotLinha(k)) + '</span>'; }).join('') + '</div>';
  var det = [];
  if (v.tipo) det.push('<b>Tipo:</b> ' + esc(v.tipo));
  if (v.motivo) det.push('<b>Motivo:</b> ' + esc(v.motivo));
  if (v.resultado) det.push('<b>Resultado:</b> ' + esc(v.resultado));
  if (v.orientacoes) det.push('<b>Orientações:</b> ' + esc(v.orientacoes));
  if (v.observacoes) det.push('<b>Observações:</b> ' + esc(v.observacoes));
  det.push('<b>ACS responsável:</b> ' + esc(nomeAcs(P.acsDaVisita(v))));
  h += '<div class="vdet">' + det.join('<br>') + '</div>';
  h += '<div class="btns mt">' + (ro ? '' : '<button class="btn peq sec" data-act="editarVisita" data-id="' + v.id + '">Editar</button>') +
    (ro || !f ? '' : '<button class="btn peq sec" data-act="novaVisitaFam" data-id="' + f.id + '">Nova visita</button>') +
    (ro || !f ? '' : '<button class="btn peq sec" data-act="agendarRetorno" data-p="' + (pes[0] ? pes[0].id : '') + '" data-f="' + f.id + '" data-v="' + v.id + '">Agendar retorno</button>') +
    (pes.length === 1 ? '<button class="btn peq sec" data-act="visHistPessoa" data-id="' + pes[0].id + '">Histórico</button>' : (f ? '<button class="btn peq sec" data-act="abrirFamilia" data-id="' + f.id + '">Histórico</button>' : '')) +
    (f ? botaoRota(f, true) : '') + '</div>';
  return h + '</div>';
}

// ---------------- Relatórios ----------------
var TIPOS_REL = [['diario', 'Relatório diário'], ['semanal', 'Relatório semanal'], ['mensal', 'Relatório mensal'], ['personalizado', 'Período personalizado'], ['microarea', 'Por microárea'], ['linha', 'Por linha de cuidado'], ['metas', 'Cumprimento de metas']];
function periodoRel(R) {
  R = R || S.rel;
  if (R.tipo === 'diario') return { de: R.data, ate: R.data };
  if (R.tipo === 'semanal') { var s = P.inicioSemana(R.data); return { de: s, ate: P.addDias(s, 6) }; }
  if (R.tipo === 'mensal') return { de: R.mes + '-01', ate: R.mes + '-' + pad(P.diasNoMes(R.mes)) };
  if (R.tipo === 'metas') { var ini = R.mes; for (var i = 1; i < R.nMeses; i++) ini = P.mesAnterior(ini); return { de: ini + '-01', ate: R.mes + '-' + pad(P.diasNoMes(R.mes)) }; }
  var a = R.de || hojeISO(), b = R.ate || hojeISO(); return a <= b ? { de: a, ate: b } : { de: b, ate: a };
}
function linhaVisitaRel(v) {
  var f = S.familias.get(v.familiaId) || {};
  return [fmtData(v.data), v.hora || '', v.situacao, f.codigo || '', (v.pessoaIds || []).map(function (id) { var p = S.pessoas.get(id); return p ? p.nome : ''; }).filter(Boolean).join(', '),
    enderecoCompletoTxt(f, true), f.microarea || '', P.ehRealizada(v) ? P.linhasDaVisita(v, S.pessoas).map(rotLinha).join(', ') : '', v.resultado || '', v.observacoes || '', nomeAcs(P.acsDaVisita(v)), v.demo ? 'Sim' : ''];
}
var COLS_VISITA = ['Data', 'Hora', 'Situação', 'Família', 'Pacientes', 'Endereço', 'Microárea', 'Linhas de cuidado', 'Resultado', 'Observações', 'ACS', 'Fictício'];
function montarRelatorio() {
  var R = S.rel, per = periodoRel(R), ctx = ctxP();
  var f = { de: per.de, ate: per.ate, micro: R.micro, linha: R.linha, incluirDemo: S.vis.incluirDemo };
  if (R.tipo === 'metas') { f.micro = ''; f.linha = ''; }
  var lista = P.filtrar(todasVisitas(), f, ctx).sort(function (a, b) { return ordVisita(b, a); });
  var r = P.resumo(lista, ctx);
  var titulo = (TIPOS_REL.filter(function (t) { return t[0] === R.tipo; })[0] || [0, 'Relatório'])[1];
  var rel = { titulo: 'ACS DIGITAL — ' + titulo, cab: [], avisos: [], secoes: [] };
  rel.cab.push(['ACS', nomeAcs(S.me)], ['Unidade / equipe', [cfg().unidade, cfg().equipe].filter(Boolean).join(' / ') || '—'], ['Município', cfg().municipio || '—'],
    ['Período', fmtData(per.de) + ' a ' + fmtData(per.ate)], ['Filtros', [R.micro && R.tipo !== 'metas' ? 'Microárea ' + R.micro : '', R.linha && R.tipo !== 'metas' ? rotLinha(R.linha) : ''].filter(Boolean).join(' · ') || 'Nenhum'], ['Gerado em', fmtDataHora(new Date().toISOString())]);
  if (r.demo) rel.avisos.push('ATENÇÃO: contém ' + plural(r.demo, 'registro fictício', 'registros fictícios') + ' da base demonstrativa. Não representam produção real.');
  if (!S.vis.incluirDemo && todasVisitas().some(function (v) { return v.demo; })) rel.avisos.push('Registros fictícios excluídos deste relatório.');
  var ateM = per.ate > hojeISO() ? hojeISO() : per.ate, dias = P.contarDias(per.de, ateM, baseMedia());
  var resumoLinhas = [['Visitas realizadas', r.realizadas], ['Tentativas não concluídas', r.tentativas]];
  P.TENTATIVAS.forEach(function (s) { resumoLinhas.push(['   ' + s, r.porSituacao[s]]); });
  resumoLinhas.push(['Pessoas atendidas (distintas)', r.pessoasAtendidas], ['Famílias visitadas', r.familiasVisitadas], ['Média de visitas por dia ' + (baseMedia() === 'uteis' ? 'útil' : 'corrido'), fmtNum(dias ? r.realizadas / dias : 0, 1)]);
  if (R.tipo === 'mensal') {
    var m = dadosMeta(R.mes); // meta é individual do ACS e não depende dos filtros de microárea/linha
    resumoLinhas.push(['Meta mensal', m.meta || 'Não definida']);
    if (m.meta) resumoLinhas.push(['Restantes para a meta', m.restantes], ['Percentual da meta atingido', P.fmtPct(m.percentual)], ['Projeção até o fim do mês', m.projecao]);
  }
  if (R.tipo !== 'metas') rel.secoes.push({ titulo: 'Resumo', colunas: ['Indicador', 'Valor'], linhas: resumoLinhas });
  var linhaSec = { titulo: 'Visitas realizadas por linha de cuidado', colunas: ['Linha de cuidado', 'Visitas', 'Pessoas atendidas'], linhas: P.LINHAS.map(function (l) { return [l[1], r.porLinha[l[0]], r.pessoasPorLinha[l[0]] || 0]; }), nota: 'Uma visita pode estar em mais de uma linha; o total geral (' + r.realizadas + ') conta cada visita uma única vez.' };
  var microSec = function () {
    var porM = {};
    lista.forEach(function (v) { var fm = S.familias.get(v.familiaId), k = (fm && fm.microarea) || 'Sem microárea'; var o = porM[k] || (porM[k] = { r: 0, t: 0, p: {}, f: {} }); if (P.ehRealizada(v)) { o.r++; o.f[v.familiaId] = 1; (v.pessoaIds || []).forEach(function (id) { o.p[id] = 1; }); } else if (P.ehTentativa(v)) o.t++; });
    return { titulo: 'Por microárea', colunas: ['Microárea', 'Realizadas', 'Tentativas', 'Pessoas atendidas', 'Famílias visitadas'], linhas: Object.keys(porM).sort().map(function (k) { var o = porM[k]; return [k, o.r, o.t, Object.keys(o.p).length, Object.keys(o.f).length]; }) };
  };
  if (R.tipo === 'semanal' || R.tipo === 'personalizado' && P.contarDias(per.de, per.ate, 'corridos') <= 62)
    rel.secoes.push({ titulo: 'Por dia', colunas: ['Data', 'Visitas realizadas'], linhas: P.serieDiaria(r.porDia, per.de, per.ate).map(function (x) { return [fmtData(x[0]), x[1]]; }) });
  if (R.tipo === 'mensal' || R.tipo === 'personalizado')
    rel.secoes.push({ titulo: 'Por semana (início na segunda-feira)', colunas: ['Semana de', 'Visitas realizadas'], linhas: P.serieSemanal(r.porDia, per.de, per.ate).map(function (x) { return [fmtData(x[0]), x[1]]; }) });
  if (R.tipo === 'microarea') rel.secoes.push(microSec());
  if (R.tipo === 'linha') rel.secoes.push(linhaSec);
  if (['semanal', 'mensal', 'personalizado'].indexOf(R.tipo) >= 0) { rel.secoes.push(linhaSec); rel.secoes.push(microSec()); }
  if (R.tipo === 'metas') {
    var meses = [], mm = R.mes; for (var i = 0; i < R.nMeses; i++) { meses.unshift(mm); mm = P.mesAnterior(mm); }
    rel.secoes.push({ titulo: 'Cumprimento de metas', colunas: ['Mês', 'Meta', 'Realizadas', 'Restantes', '% atingido', 'Situação'], linhas: meses.map(function (x) {
      var d = dadosMeta(x), enc = x < hojeISO().slice(0, 7);
      var sit = !d.meta ? 'Sem meta definida' : d.percentual >= 100 ? 'Atingida' : enc ? 'Não atingida' : 'Em andamento (projeção ' + d.projecao + ')';
      return [nomeMes(x), d.meta || '—', d.realizadas, d.meta ? d.restantes : '—', d.meta ? P.fmtPct(d.percentual) : '—', sit];
    }), nota: 'Meta individual do ACS. Visitas realizadas por este ACS no mês.' });
    var hist = [];
    meses.forEach(function (x) { var reg = S.metasDoc && S.metasDoc.meses && S.metasDoc.meses[x]; (reg && reg.historico || []).forEach(function (hh) { hist.push([nomeMes(x), hh.valor || 'removida', fmtDataHora(hh.em)]); }); });
    if (hist.length) rel.secoes.push({ titulo: 'Histórico de alterações das metas', colunas: ['Mês', 'Meta definida', 'Alterada em'], linhas: hist });
  } else {
    rel.secoes.push({ titulo: 'Relação de visitas', colunas: COLS_VISITA, linhas: lista.map(linhaVisitaRel), detalhe: true });
  }
  rel.periodo = per; rel.resumo = r;
  return rel;
}
function viewRelatorios() {
  var R = S.rel;
  var h = '<div class="card"><h2>Gerar relatório de produtividade</h2><div class="grid g2"><div class="campo"><label class="rot">Tipo</label>' + selectHtml('tipo', TIPOS_REL, R.tipo, false, 'data-rel="tipo"') + '</div>';
  if (R.tipo === 'diario') h += '<div class="campo"><label class="rot">Dia</label><input type="date" data-rel="data" value="' + esc(R.data) + '"></div>';
  else if (R.tipo === 'semanal') h += '<div class="campo"><label class="rot">Qualquer dia da semana</label><input type="date" data-rel="data" value="' + esc(R.data) + '"></div>';
  else if (R.tipo === 'mensal') h += '<div class="campo"><label class="rot">Mês</label><input type="month" data-rel="mes" value="' + esc(R.mes) + '"></div>';
  else if (R.tipo === 'metas') h += '<div class="campo"><label class="rot">Até o mês</label><input type="month" data-rel="mes" value="' + esc(R.mes) + '"></div><div class="campo"><label class="rot">Quantidade de meses</label>' + selectHtml('nMeses', [['3', '3 meses'], ['6', '6 meses'], ['12', '12 meses']], String(R.nMeses), false, 'data-rel="nMeses"') + '</div>';
  else h += '<div class="campo"><label class="rot">De</label><input type="date" data-rel="de" value="' + esc(R.de) + '"></div><div class="campo"><label class="rot">Até</label><input type="date" data-rel="ate" value="' + esc(R.ate) + '"></div>';
  if (R.tipo !== 'metas') h += '<div class="campo"><label class="rot">Microárea</label>' + selectHtml('micro', microareas(), R.micro, 'Todas', 'data-rel="micro"') + '</div><div class="campo"><label class="rot">Linha de cuidado</label>' + selectHtml('linha', P.LINHAS, R.linha, 'Todas', 'data-rel="linha"') + '</div>';
  h += '</div><div class="btns">' + (S.downloads ? '<button class="btn" data-act="relExportar" data-f="pdf">' + ico('baixar', 'width="18" height="18"') + 'Exportar PDF</button><button class="btn sec" data-act="relExportar" data-f="xlsx">' + ico('baixar', 'width="18" height="18"') + 'Exportar Excel</button>' : '<p class="contagem">Download indisponível nesta visualização.</p>') + '</div><div id="relStatus" class="contagem mt"></div></div>';
  var rel = montarRelatorio();
  h += avisoDemo(rel.resumo);
  h += '<div class="card relprev"><h2>' + esc(rel.titulo.replace('ACS DIGITAL — ', '')) + '</h2><dl class="kv">' + rel.cab.map(function (c) { return '<dt>' + esc(c[0]) + '</dt><dd>' + esc(c[1]) + '</dd>'; }).join('') + '</dl>';
  rel.avisos.forEach(function (a) { h += '<div class="aviso amarelo mt">' + esc(a) + '</div>'; });
  rel.secoes.forEach(function (s) {
    var linhas = s.detalhe ? s.linhas.slice(0, 30) : s.linhas;
    h += '<h3 class="mt2">' + esc(s.titulo) + (s.detalhe ? ' (' + s.linhas.length + ')' : '') + '</h3><div class="tabwrap"><table class="tab"><thead><tr>' + s.colunas.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      (linhas.length ? linhas.map(function (l) { return '<tr>' + l.map(function (c) { return '<td>' + esc(c) + '</td>'; }).join('') + '</tr>'; }).join('') : '<tr><td colspan="' + s.colunas.length + '">Sem registros.</td></tr>') + '</tbody></table></div>';
    if (s.detalhe && s.linhas.length > 30) h += '<p class="contagem">Mostrando 30 de ' + s.linhas.length + '. A exportação inclui todos.</p>';
    if (s.nota) h += '<p class="contagem">' + esc(s.nota) + '</p>';
  });
  return h + '</div>';
}
// Bibliotecas de exportação, carregadas só quando necessárias (versões fixas)
var LIBS = {
  xlsx: ['vendor/xlsx.full.min.js'],
  jspdf: ['vendor/jspdf.umd.min.js'],
  autotable: ['vendor/jspdf.plugin.autotable.min.js']
};
var libsCarregadas = {};
function carregarScript(src) {
  return new Promise(function (ok, erro) {
    var s = document.createElement('script'); s.src = src; s.crossOrigin = 'anonymous';
    s.onload = ok; s.onerror = function () { s.remove(); erro(new Error('Falha ao carregar ' + src)); };
    document.head.appendChild(s);
  });
}
function carregarLib(nome) {
  if (libsCarregadas[nome]) return libsCarregadas[nome];
  var urls = LIBS[nome];
  libsCarregadas[nome] = urls.reduce(function (p, u) { return p.catch(function () { return carregarScript(u); }); }, Promise.reject())
    .catch(function (e) { delete libsCarregadas[nome]; throw { code: 'sem_conexao', message: 'Não foi possível baixar o gerador de arquivos. Verifique a internet.' }; });
  return libsCarregadas[nome];
}
function pdfTxt(s) { return String(s == null ? '' : s).replace(/≥/g, '>=').replace(/≤/g, '<=').replace(/[✓]/g, '').replace(/[–—]/g, '-').replace(/[^\x00-\xFF]/g, ''); }
function nomeArqRel(rel, ext) { return 'acs-digital-' + S.rel.tipo + '-' + rel.periodo.de + (rel.periodo.ate !== rel.periodo.de ? '_a_' + rel.periodo.ate : '') + '.' + ext; }
async function exportarRelatorio(fmt) {
  var st = $('#relStatus'), rel = montarRelatorio();
  if (st) st.textContent = 'Preparando arquivo…';
  try {
    var data;
    if (fmt === 'xlsx') {
      await carregarLib('xlsx');
      var X = window.XLSX, wb = X.utils.book_new();
      var capa = [[rel.titulo], []].concat(rel.cab).concat([[]]).concat(rel.avisos.map(function (a) { return [a]; }));
      var res = rel.secoes.filter(function (s) { return !s.detalhe; });
      res.forEach(function (s) { capa.push([], [s.titulo], s.colunas); s.linhas.forEach(function (l) { capa.push(l); }); if (s.nota) capa.push([s.nota]); });
      var ws = X.utils.aoa_to_sheet(capa); ws['!cols'] = [{ wch: 42 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 14 }, { wch: 30 }];
      X.utils.book_append_sheet(wb, ws, 'Resumo');
      rel.secoes.filter(function (s) { return s.detalhe; }).forEach(function (s) {
        var w2 = X.utils.aoa_to_sheet([s.colunas].concat(s.linhas));
        w2['!cols'] = [{ wch: 11 }, { wch: 6 }, { wch: 22 }, { wch: 9 }, { wch: 34 }, { wch: 44 }, { wch: 10 }, { wch: 30 }, { wch: 26 }, { wch: 30 }, { wch: 20 }, { wch: 9 }];
        w2['!autofilter'] = { ref: 'A1:L' + (s.linhas.length + 1) };
        X.utils.book_append_sheet(wb, w2, 'Visitas');
      });
      data = X.write(wb, { type: 'array', bookType: 'xlsx' });
    } else {
      await carregarLib('jspdf');
      await carregarLib('autotable');
      var doc = new window.jspdf.jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
      var W = doc.internal.pageSize.getWidth(), y = 40;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(14, 61, 143); doc.text(pdfTxt(rel.titulo), 36, y); y += 18;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(30, 41, 59);
      rel.cab.forEach(function (c) { doc.text(pdfTxt(c[0] + ': ' + c[1]), 36, y); y += 13; });
      rel.avisos.forEach(function (a) { doc.setTextColor(146, 64, 14); doc.text(pdfTxt(a), 36, y); y += 13; doc.setTextColor(30, 41, 59); });
      rel.secoes.forEach(function (s) {
        if (y > 500) { doc.addPage(); y = 40; }
        y += 10; doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text(pdfTxt(s.titulo + (s.detalhe ? ' (' + s.linhas.length + ')' : '')), 36, y); doc.setFont('helvetica', 'normal');
        doc.autoTable({ startY: y + 6, head: [s.colunas.map(pdfTxt)], body: s.linhas.length ? s.linhas.map(function (l) { return l.map(pdfTxt); }) : [[{ content: 'Sem registros.', colSpan: s.colunas.length }]], margin: { left: 36, right: 36 },
          styles: { fontSize: s.detalhe ? 7.5 : 9, cellPadding: 3, overflow: 'linebreak' }, headStyles: { fillColor: [21, 84, 192] }, alternateRowStyles: { fillColor: [243, 247, 254] },
          tableWidth: s.detalhe ? 'auto' : Math.min(520, W - 72) });
        y = doc.lastAutoTable.finalY + 8;
        if (s.nota) { doc.setFontSize(8.5); doc.setTextColor(100, 116, 139); doc.text(pdfTxt(s.nota), 36, y + 6, { maxWidth: W - 72 }); doc.setTextColor(30, 41, 59); y += 16; }
      });
      var np = doc.internal.getNumberOfPages();
      for (var i = 1; i <= np; i++) { doc.setPage(i); doc.setFontSize(8); doc.setTextColor(100, 116, 139); doc.text('ACS DIGITAL - pagina ' + i + ' de ' + np, W - 36, doc.internal.pageSize.getHeight() - 18, { align: 'right' }); }
      data = doc.output('arraybuffer');
    }
    if (st) st.textContent = '';
    await S.downloads.save({ filename: nomeArqRel(rel, fmt), data: data });
    toast('Relatório exportado.', 'ok');
  } catch (e) {
    if (st) st.textContent = '';
    if (e && e.code === 'declined') return;
    toast(e && e.code === 'sem_conexao' ? e.message : 'Não foi possível gerar o relatório (' + ((e && (e.code || e.message)) || 'erro') + ').', 'erro');
  }
}

// ---------------- Linhas de cuidado no formulário de visita ----------------
function blocoLinhasForm(d) {
  var sel = Array.isArray(d.linhas) ? d.linhas : P.sugerirLinhas(d.pessoaIds, S.pessoas, d.data || hojeISO());
  return '<div class="campo"><label class="rot">Linhas de cuidado desta visita</label><div class="grid g2">' + LINHAS_FORM.map(function (l) { return '<label class="chk"><input type="checkbox" name="linha" value="' + l[0] + '"' + (sel.indexOf(l[0]) >= 0 ? ' checked' : '') + '> ' + esc(l[1]) + '</label>'; }).join('') +
    '</div><p class="contagem" id="notaLinhas">Sugeridas pelas condições e idade dos moradores marcados. Nenhuma marcada = Demais moradores. A visita conta uma única vez no total.</p></div>';
}
function atualizarSugestaoLinhas() {
  if (!S.rascunho || S.rascunho.linhasManuais) return;
  var fm = $('#formVisita'); if (!fm) return;
  var ids = $$('#formVisita input[name=pessoa]').filter(function (x) { return x.checked; }).map(function (x) { return x.value; });
  var sug = P.sugerirLinhas(ids, S.pessoas, fm.elements.data.value || hojeISO());
  $$('#formVisita input[name=linha]').forEach(function (x) { x.checked = sug.indexOf(x.value) >= 0; });
}

// ---------------- Ações e eventos do módulo ----------------
function abrirVisitas(mod) { Object.assign(S.vis, mod || {}); S.vis.limite = 50; if (S.view === 'visitas' && !S.sub) render(); else irPara('visitas'); window.scrollTo(0, 0); }
var ACOES_VIS = {
  visAba: function (b) { if (S.view !== 'visitas' || S.sub) { S.vis.aba = b.getAttribute('data-a'); irPara('visitas'); } else { S.vis.aba = b.getAttribute('data-a'); render(); window.scrollTo(0, 0); } },
  visAbrir: function (b) { abrirVisitas({ aba: 'registros', preset: b.getAttribute('data-p'), situacao: b.getAttribute('data-s') || '', micro: '', linha: '', pessoaId: '' }); },
  visRegistros: function (b) { abrirVisitas({ aba: 'registros', situacao: b.getAttribute('data-s') || '' }); },
  visLinha: function (b) { abrirVisitas({ aba: 'registros', linha: b.getAttribute('data-l'), situacao: 'realizadas' }); },
  visPreset: function (b) { var y = window.scrollY; S.vis.preset = b.getAttribute('data-p'); if (S.vis.preset === 'personalizado' && !S.vis.de) { S.vis.de = P.addDias(hojeISO(), -29); S.vis.ate = hojeISO(); } render(); window.scrollTo(0, y); },
  visLimpar: function () { Object.assign(S.vis, { micro: '', linha: '', pessoaId: '', situacao: '' }); render(); },
  visDemo: function (b) { S.vis.incluirDemo = b.getAttribute('data-v') === '1'; render(); },
  visMais: function () { var y = window.scrollY; S.vis.limite = (S.vis.limite || 50) + 50; render(); window.scrollTo(0, y); },
  visHistPessoa: function (b) { abrirVisitas({ aba: 'registros', pessoaId: b.getAttribute('data-id'), preset: 'tudo', situacao: '', micro: '', linha: '' }); },
  metaEditar: function () { if (S.view !== 'visitas') S.vis.mesMeta = hojeISO().slice(0, 7); abrirEditorMeta(); },
  metaRemover: function () { salvarMeta(null); },
  relExportar: function (b) { exportarRelatorio(b.getAttribute('data-f')); }
};
document.addEventListener('change', function (ev) {
  var t = ev.target, k;
  if ((k = t.getAttribute && t.getAttribute('data-vf'))) {
    var y = window.scrollY;
    if (k === 'paciente') {
      var val = t.value.trim(), achou = null;
      if (val) S.pessoas.forEach(function (p) { var f = S.familias.get(p.familiaId); if ((p.nome + (f ? ' — ' + f.codigo : '')) === val || p.nome === val) achou = achou || p; });
      if (val && !achou) { toast('Paciente não encontrado. Escolha um nome da lista.', 'erro'); return; }
      S.vis.pessoaId = achou ? achou.id : '';
    } else if (k === 'mediaBase') { salvarBaseMedia(t.value); return; }
    else if (k === 'mesMeta') { if (!t.value) return; S.vis.mesMeta = t.value; }
    else S.vis[k] = t.value;
    setTimeout(function () { render(); window.scrollTo(0, y); }, 0); return;
  }
  if ((k = t.getAttribute && t.getAttribute('data-rel'))) {
    var y2 = window.scrollY;
    S.rel[k] = k === 'nMeses' ? +t.value : t.value;
    if (!S.rel[k] && k !== 'micro' && k !== 'linha') return;
    render(); window.scrollTo(0, y2); return;
  }
  if (t.closest && t.closest('#formVisita')) {
    if (t.name === 'linha') { S.rascunho.linhasManuais = true; }
    else if (t.name === 'pessoa' || t.name === 'data') atualizarSugestaoLinhas();
  }
});
document.addEventListener('input', function (ev) {
  var t = ev.target;
  if (t.getAttribute && t.getAttribute('data-vf') === 'paciente' && t.value === '' && S.vis.pessoaId) { S.vis.pessoaId = ''; var y = window.scrollY; render(); window.scrollTo(0, y); }
});
document.addEventListener('submit', function (ev) {
  if (ev.target.id !== 'formMeta') return;
  var v = parseInt(ev.target.elements.valor.value, 10);
  if (!(v > 0)) { toast('Informe um número de visitas maior que zero.', 'erro'); return; }
  salvarMeta(v);
});


// ============================================================================
// BUSCA RÁPIDA (v3)
// ============================================================================
var BU = window.ACSBusca;
var PLACEHOLDER_BUSCA = 'Pesquisar morador, família ou endereço...';
S.busca = { q: '', micro: '', linha: '', faixa: '', sit: 'Ativo', limite: 30 };

function filtroBuscaFn() {
  var b = S.busca, hoje = hojeISO();
  return function (p) {
    var f = S.familias.get(p.familiaId);
    if (b.sit && (p.situacao || 'Ativo') !== b.sit) return false;
    if (b.micro && (!f || f.microarea !== b.micro)) return false;
    if (b.faixa && faixaIdade(idade(p)) !== b.faixa) return false;
    if (b.linha) {
      var l = P.linhasDaPessoa(p, hoje);
      if (b.linha === 'demais' ? l.length : l.indexOf(b.linha) < 0) return false;
    }
    return true;
  };
}
function destacarNome(nome, q) {
  var toks = BU.norm(q).split(/[^a-z0-9]+/).filter(function (t) { return t.length >= 1 && !/^\d+$/.test(t); });
  return String(nome || '').split(/(\s+)/).map(function (w) {
    var nw = BU.norm(w), tok = toks.filter(function (t) { return nw.indexOf(t) === 0; }).sort(function (a, b) { return b.length - a.length; })[0];
    return tok ? '<mark>' + esc(w.slice(0, tok.length)) + '</mark>' + esc(w.slice(tok.length)) : esc(w);
  }).join('');
}
function viewBusca() {
  var b = S.busca;
  var h = '<div class="buscabox"><div class="buscacampo">' + ico('busca', 'width="20" height="20" aria-hidden="true"') +
    '<input type="search" id="buscaInput" placeholder="' + PLACEHOLDER_BUSCA + '" value="' + esc(b.q) + '" autocomplete="off" enterkeyhint="search" aria-label="' + PLACEHOLDER_BUSCA + '"></div>';
  h += '<div class="filtros mt">' + selectHtml('micro', microareas(), b.micro, 'Todas as microáreas', 'data-bf="micro"') +
    selectHtml('linha', P.LINHAS, b.linha, 'Todas as linhas de cuidado', 'data-bf="linha"') +
    selectHtml('faixa', FAIXAS, b.faixa, 'Todas as idades', 'data-bf="faixa"') +
    selectHtml('sit', SITUACOES_PESSOA, b.sit, 'Todas as situações', 'data-bf="sit"') + '</div></div>';
  return h + '<div id="buscaRes" aria-live="polite">' + resultadosBusca() + '</div>';
}
function resultadosBusca() {
  var b = S.busca, q = b.q.trim();
  if (q.length < 2) {
    return '<div class="vazio"><strong>Digite ao menos 2 caracteres</strong>Você pode procurar por nome (mesmo incompleto), CPF, CNS, data de nascimento (dd/mm/aaaa), telefone, rua, número, bairro, código da família (ex.: F0001) ou microárea.</div>';
  }
  var t0 = performance.now();
  var res = BU.buscar(q, Array.from(S.pessoas.values()), S.familias, { pessoasMap: S.pessoas, filtro: filtroBuscaFn() });
  var fams = (b.micro || b.linha || b.faixa) ? [] : BU.buscarFamilias(q, S.familias, S.pessoas).filter(function (x) { return x.campos.some(function (c) { return c === 'Família' || c === 'Responsável'; }); }).slice(0, 5);
  var ms = Math.round(performance.now() - t0);
  var h = '<p class="contagem">' + plural(res.length, 'morador encontrado', 'moradores encontrados') + (fams.length ? ' · ' + plural(fams.length, 'família', 'famílias') : '') + ' <span style="opacity:.6">(' + ms + ' ms)</span></p>';
  if (fams.length) {
    h += '<h3 class="subtit">Famílias</h3><div class="lista">' + fams.map(function (x) {
      var f = x.familia, mem = (derivados().membros.get(f.id) || []).length;
      return '<div class="rcard"><div class="rtop"><button class="linkbtn forte" data-act="abrirFamilia" data-id="' + f.id + '">' + esc(nomeFamilia(f)) + '</button>' + demoChip(f) + '</div><div class="vmeta">Microárea ' + esc(f.microarea || '—') + ' · ' + plural(mem, 'integrante', 'integrantes') + '</div><div class="vmeta">' + linkEndereco(f) + '</div>' +
        (f.telefone && numeroWhatsApp(f.telefone) ? '<div class="vmeta telwa-txt">' + esc(fmtTelefone(f.telefone)) + iconeWhatsApp(f.telefone) + '</div>' : '') +
        '<div class="btns mt"><button class="btn peq sec" data-act="abrirFamilia" data-id="' + f.id + '">Ficha familiar</button></div></div>';
    }).join('') + '</div><h3 class="subtit">Moradores</h3>';
  }
  if (!res.length) return h + '<div class="vazio"><strong>Nenhum morador encontrado</strong>Confira a grafia ou tente parte do nome, o CPF, o CNS ou o endereço.' + (b.micro || b.linha || b.faixa || b.sit ? ' Há filtros ativos.' : '') + '</div>';
  var D = derivados();
  h += '<div class="lista">' + res.slice(0, b.limite).map(function (r) {
    var p = r.pessoa, f = r.familia, i = idade(p), comp = D.comp.get(p.id);
    var tel = p.telefone && numeroWhatsApp(p.telefone) ? '<span class="telwa-txt">' + esc(fmtTelefone(p.telefone)) + iconeWhatsApp(p.telefone) + '</span>' : '<span class="contagem" style="margin:0">Sem telefone válido</span>';
    var chips = '<span class="chip">Encontrado por: ' + esc(r.campos.join(', ')) + '</span>';
    if (r.semelhante) chips += '<span class="chip" style="background:var(--amarelo-cl);color:var(--amarelo)">! Semelhante — confira o nome</span>';
    if (r.homonimo) chips += '<span class="chip" style="background:var(--amarelo-cl);color:var(--amarelo)">! Mesmo nome de outro morador — confira nascimento e família</span>';
    return '<div class="rcard"><div class="rtop"><button class="linkbtn forte" data-act="abrirPessoa" data-id="' + p.id + '">' + destacarNome(p.nome, q) + '</button>' + demoChip(p) + '<span style="margin-left:auto">' + (comp ? indicador(comp) : '') + '</span></div>' +
      '<div class="vmeta">' + (i != null ? plural(i, 'ano', 'anos') + ' · nasc. ' + fmtData(p.data_nascimento) : 'Nascimento não informado') + ' · ' + (f ? 'Família ' + esc(f.codigo) : 'Sem família') + ' · Microárea ' + esc((f && f.microarea) || '—') + ((p.situacao || 'Ativo') !== 'Ativo' ? ' · ' + esc(p.situacao) : '') + '</div>' +
      '<div class="vmeta">' + tel + '</div>' + (f ? '<div class="vmeta">' + linkEndereco(f) + '</div>' : '') +
      '<div class="chips" style="margin-top:6px">' + chips + '</div>' +
      '<div class="btns mt"><button class="btn peq" data-act="abrirPessoa" data-id="' + p.id + '">Cadastro</button>' + (f ? '<button class="btn peq sec" data-act="abrirFamilia" data-id="' + f.id + '">Família</button>' : '') + '<button class="btn peq sec" data-act="visHistPessoa" data-id="' + p.id + '">Visitas</button></div></div>';
  }).join('') + '</div>';
  if (res.length > b.limite) h += '<button class="btn sec mt" style="width:100%" data-act="buscaMais">Mostrar mais (' + (res.length - b.limite) + ')</button>';
  return h;
}
function atualizarResultadosBusca() { var el = $('#buscaRes'); if (el) el.innerHTML = resultadosBusca(); }
function focarBusca() { var i = $('#buscaInput'); if (i) { i.focus(); try { i.setSelectionRange(i.value.length, i.value.length); } catch (e) { } } }
function irParaBusca(q) {
  S.busca.q = q || ''; S.busca.limite = 30;
  irPara('busca');
  focarBusca();                 // síncrono: mantém o teclado aberto no celular
  setTimeout(focarBusca, 30);   // reforço após a renderização
}
var tmrBuscaRapida;
document.addEventListener('input', function (ev) {
  var t = ev.target;
  if (t.id === 'buscaInput') { S.busca.q = t.value; S.busca.limite = 30; clearTimeout(tmrBuscaRapida); tmrBuscaRapida = setTimeout(atualizarResultadosBusca, 90); }
  else if (t.id === 'buscaPainel' && t.value) { var v = t.value; t.value = ''; irParaBusca(S.busca.q + v); }
});
// Tocar no campo do painel já abre a busca (antes da primeira tecla, sem perder letras)
document.addEventListener('focusin', function (ev) {
  if (ev.target && ev.target.id === 'buscaPainel') irParaBusca(S.busca.q);
});
document.addEventListener('change', function (ev) {
  var k = ev.target.getAttribute && ev.target.getAttribute('data-bf');
  if (k) { S.busca[k] = ev.target.value; S.busca.limite = 30; atualizarResultadosBusca(); }
});
ACOES_VIS.buscaMais = function () { S.busca.limite += 30; atualizarResultadosBusca(); };
ACOES_VIS.abrirBusca = function () { irParaBusca(S.busca.q); };


// ============================================================================
// CENTRAL DE PENDÊNCIAS (v3)
// ============================================================================
var PD = window.ACSPendencias;
S.estadosPend = new Map();
S.agenda = S.agenda || new Map();
S.pend = { aba: 'abertas', card: '', cat: '', nivel: '', micro: '', q: '', limite: 40 };
var NIVEL_TXT = { alta: 'Prioridade alta', atencao: 'Atenção', info: 'Informativo' };
var NIVEL_IC = { alta: '▲', atencao: '!', info: 'i' };

function iniciarPendencias() {
  if (!S.db) return;
  S.db.collection('pendencias').onSnapshot(function (snap) {
    S.estadosPend = new Map(); snap.docs.forEach(function (d) { S.estadosPend.set(d.id, d.data()); });
    invalidar(); aoMudarDados();
  }, function () { });
}
var _pdCache = null, _pdBase = null;
function pendencias() {
  var D = derivados();
  if (_pdCache && _pdBase === D) return _pdCache;
  _pdBase = D;
  _pdCache = PD.calcular({ pessoas: S.pessoas, familias: S.familias, visitas: Array.from(S.visitas.values()), agenda: Array.from(S.agenda.values()),
    estados: S.estadosPend, config: S.config, hoje: hojeISO(), comp: D.comp, C: C });
  return _pdCache;
}
function rotTipo(t) { return (PD.TIPOS[t] || {}).nome || t; }
function nivelBadge(n) { return '<span class="nivel ' + n + '"><span class="ic" aria-hidden="true">' + NIVEL_IC[n] + '</span>' + NIVEL_TXT[n] + '</span>'; }
function microDaPend(p) { var f = S.familias.get(p.familiaId) || (p.pessoaId && S.familias.get((S.pessoas.get(p.pessoaId) || {}).familiaId)); return f ? f.microarea : ''; }

function cardsPendencias(r, acao) {
  return '<div class="grid g3">' + PD.CARDS.map(function (c) {
    var n = r.abertas.filter(c[2]).length, cls = c[0] === 'urgentes' && n ? ' urg' : '';
    return '<button class="tile pendtile' + cls + (S.pend.card === c[0] && acao === 'pendCard' ? ' sel' : '') + '" data-act="' + acao + '" data-c="' + c[0] + '"><div class="v">' + n + '</div><div class="l">' + esc(c[1]) + '</div></button>';
  }).join('') + '</div>';
}
function cardPendenciasPainel() {
  var r = pendencias();
  return '<div class="card mt2"><div class="vhead"><h2 style="margin:0">' + ico('alerta', 'width="20" height="20"') + ' Central de pendências</h2><button class="btn peq sec" data-nav="pendencias">Abrir</button></div><div class="mt">' + cardsPendencias(r, 'pendAbrirCard') + '</div></div>';
}

function filtrarPend(lista) {
  var f = S.pend, q = norm(f.q), card = PD.CARDS.filter(function (c) { return c[0] === f.card; })[0];
  return lista.filter(function (p) {
    if (card && !card[2](p)) return false;
    if (f.cat && p.cat !== f.cat) return false;
    if (f.nivel && p.nivel !== f.nivel) return false;
    if (f.micro && microDaPend(p) !== f.micro) return false;
    if (q) { var pe = S.pessoas.get(p.pessoaId), fa = S.familias.get(p.familiaId); if (norm([p.titulo, p.detalhe, pe && pe.nome, fa && fa.codigo].join(' ')).indexOf(q) < 0) return false; }
    return true;
  });
}
function viewPendencias() {
  var r = pendencias(), f = S.pend;
  var h = cardsPendencias(r, 'pendCard');
  if (r.naoConfigurados.length) h += '<div class="aviso amarelo mt">Sem prazo configurado (não geram pendência até a equipe definir): ' + esc(r.naoConfigurados.map(function (t) { return rotTipo(t).split(':')[0].replace(' com acompanhamento pendente', ''); }).join(', ')) + '. <button class="btn peq sec" data-nav="configuracoes">Configurar prazos</button></div>';
  h += '<div class="tabs mt" role="tablist">' + [['abertas', 'Abertas (' + r.abertas.length + ')'], ['resolvidas', 'Resolvidas (' + r.resolvidas.length + ')']].map(function (t) { return '<button role="tab" class="' + (f.aba === t[0] ? 'ativo' : '') + '" data-act="pendAba" data-a="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div>';
  if (f.aba === 'resolvidas') return h + listaResolvidas(r.resolvidas);
  h += '<div class="filtros">' + [['', 'Todas']].concat(PD.CATS).map(function (c) { return '<button class="fbtn' + (f.cat === c[0] ? ' ativo' : '') + '" data-act="pendCat" data-c="' + c[0] + '">' + c[1] + '</button>'; }).join('') + '</div>';
  h += '<div class="filtros">' + selectHtml('nivel', PD.NIVEIS, f.nivel, 'Todos os níveis', 'data-pf="nivel"') + selectHtml('micro', microareas(), f.micro, 'Todas as microáreas', 'data-pf="micro"') +
    '<input type="search" data-pf="q" placeholder="Filtrar por nome ou texto" value="' + esc(f.q) + '" style="min-width:170px;min-height:38px;padding:6px 10px"></div>';
  var lista = filtrarPend(r.abertas);
  var card = PD.CARDS.filter(function (c) { return c[0] === f.card; })[0];
  h += '<div class="barra-acoes"><p class="contagem" style="margin:0">' + plural(lista.length, 'pendência', 'pendências') + (card ? ' · ' + esc(card[1]) + ' <button class="linkbtn" data-act="pendCard" data-c="">ver todas</button>' : '') + '</p><span class="cresce"></span>' + (somenteLeitura() ? '' : '<button class="btn peq" data-act="pendManual">' + ico('add', 'width="16" height="16"') + 'Observação manual</button>') + '</div>';
  if (!lista.length) return h + '<div class="vazio"><strong>Nenhuma pendência aqui</strong>As pendências são recalculadas automaticamente a cada alteração nos cadastros, visitas e agenda.</div>';
  h += '<div class="lista">' + lista.slice(0, f.limite).map(cartaoPend).join('') + '</div>';
  if (lista.length > f.limite) h += '<button class="btn sec mt" style="width:100%" data-act="pendMais">Mostrar mais (' + (lista.length - f.limite) + ')</button>';
  return h;
}
function cartaoPend(p) {
  var pe = p.pessoaId && S.pessoas.get(p.pessoaId), fa = S.familias.get(p.familiaId || (pe && pe.familiaId)), ro = somenteLeitura();
  var h = '<div class="pcard ' + p.nivel + '" data-key="' + esc(p.key) + '"><div class="ptop">' + nivelBadge(p.nivel) + '<span class="chip">' + (p.origem === 'manual' ? 'Manual' : 'Automática') + '</span>' + (p.atrasada ? '<span class="chip" style="background:var(--vermelho-cl);color:var(--vermelho)">Atrasada</span>' : p.hoje ? '<span class="chip azul">Hoje</span>' : '') + demoChip(p) + '</div>';
  h += '<div class="ptit">' + esc(p.titulo) + '</div>';
  var quem = [];
  if (pe) quem.push('<button class="linkbtn forte" data-act="abrirPessoa" data-id="' + pe.id + '">' + esc(pe.nome) + '</button>');
  if (fa) quem.push('<button class="linkbtn" data-act="abrirFamilia" data-id="' + fa.id + '">Família ' + esc(fa.codigo) + '</button>');
  if (fa) quem.push('Microárea ' + esc(fa.microarea || '—'));
  if (quem.length) h += '<div class="vmeta">' + quem.join(' · ') + '</div>';
  if (pe && pe.telefone && numeroWhatsApp(pe.telefone)) h += '<div class="vmeta telwa-txt">' + esc(fmtTelefone(pe.telefone)) + iconeWhatsApp(pe.telefone) + '</div>';
  if (p.detalhe) h += '<div class="vdet">' + esc(p.detalhe) + '</div>';
  h += '<div class="vdet"><b>Identificada em:</b> ' + fmtData(p.desde) + (p.vence && p.vence !== p.desde ? ' · <b>Data prevista:</b> ' + fmtData(p.vence) : '') + '<br><b>Regra:</b> ' + esc(p.regra || '') + ' <span class="contagem">(nível configurável)</span></div>';
  if (p.justificativas && p.justificativas.length) h += '<ul class="hist mt">' + p.justificativas.slice(-3).map(function (j) { return '<li><b>' + esc(j.acao === 'resolveu' ? 'Resolução' : 'Justificativa') + ':</b> ' + esc(j.texto) + ' · ' + fmtDataHora(j.em) + '</li>'; }).join('') + '</ul>';
  var b = [];
  if (pe) b.push('<button class="btn peq sec" data-act="abrirPessoa" data-id="' + pe.id + '">Cadastro</button>');
  else if (fa) b.push('<button class="btn peq sec" data-act="abrirFamilia" data-id="' + fa.id + '">Ficha familiar</button>');
  if (pe) b.push('<button class="btn peq sec" data-act="visHistPessoa" data-id="' + pe.id + '">Histórico</button>');
  else if (fa) b.push('<button class="btn peq sec" data-act="abrirFamilia" data-id="' + fa.id + '">Histórico</button>');
  if (!ro && fa) b.push(pe ? '<button class="btn peq sec" data-act="novaVisitaPessoa" data-id="' + pe.id + '">Registrar visita</button>' : '<button class="btn peq sec" data-act="novaVisitaFam" data-id="' + fa.id + '">Registrar visita</button>');
  if (!ro && (pe || fa) && typeof abrirAgendaForm === 'function') b.push('<button class="btn peq sec" data-act="agendarRetorno" data-p="' + (pe ? pe.id : '') + '" data-f="' + (fa ? fa.id : '') + '" data-motivo="' + esc(p.titulo) + '">Agendar retorno</button>');
  if (p.agendaId && typeof abrirAgendaForm === 'function') b.push('<button class="btn peq sec" data-act="agendaEditar" data-id="' + p.agendaId + '">Abrir compromisso</button>');
  if (!ro) {
    b.push('<button class="btn peq sec" data-act="pendJustificar" data-key="' + esc(p.key) + '">Justificativa</button>');
    if (!p.agendaId) b.push('<button class="btn peq" data-act="pendResolver" data-key="' + esc(p.key) + '">Marcar como resolvida</button>');
  }
  return h + '<div class="btns mt">' + b.join('') + '</div></div>';
}
function listaResolvidas(l) {
  if (!l.length) return '<div class="vazio"><strong>Nenhuma pendência resolvida manualmente</strong>Pendências automáticas que deixam de existir (ex.: visita registrada, campo preenchido) saem da lista sozinhas; o registro fica na própria visita ou no histórico do cadastro.</div>';
  return '<p class="contagem">Histórico de pendências marcadas como resolvidas e observações manuais concluídas. Nada é apagado.</p><div class="lista">' + l.slice(0, 100).map(function (p) {
    var pe = p.pessoaId && S.pessoas.get(p.pessoaId), fa = S.familias.get(p.familiaId);
    return '<div class="pcard resolvida"><div class="ptop"><span class="chip" style="background:var(--verde-cl);color:var(--verde)">✓ Resolvida</span><span class="chip">' + (p.origem === 'manual' ? 'Manual' : 'Automática') + '</span></div><div class="ptit">' + esc(p.titulo || rotTipo(p.tipo)) + '</div>' +
      '<div class="vmeta">' + (pe ? esc(pe.nome) + ' · ' : '') + (fa ? 'Família ' + esc(fa.codigo) + ' · ' : '') + 'Identificada em ' + fmtData(p.desde || PD.dataDe(p.criadoEm)) + ' · Resolvida em ' + fmtDataHora(p.resolvidaEm) + ' por ' + (p.resolvidaPor === S.me ? 'você' : (PROD.nomeDe(p.resolvidaPor) || 'outro usuário autorizado')) + '</div>' +
      '<ul class="hist mt">' + (p.justificativas || []).map(function (j) { return '<li><b>' + esc(j.acao === 'resolveu' ? 'Resolução' : j.acao === 'reabriu' ? 'Reaberta' : 'Justificativa') + ':</b> ' + esc(j.texto) + ' · ' + fmtDataHora(j.em) + '</li>'; }).join('') + '</ul>' +
      (somenteLeitura() ? '' : '<div class="btns mt"><button class="btn peq sec" data-act="pendReabrir" data-key="' + esc(p.key) + '">Reabrir</button></div>') + '</div>';
  }).join('') + '</div>';
}

// ---------- ações (gravam somente o que o ACS decidiu) ----------
function pendPorChave(key) { var r = pendencias(); return r.abertas.filter(function (p) { return p.key === key; })[0] || r.resolvidas.filter(function (p) { return p.key === key; })[0]; }
function modalTexto(titulo, texto, rotulo, obrig, onOk) {
  S._modalOk = onOk;
  modal('<h3>' + esc(titulo) + '</h3><p class="contagem">' + esc(texto) + '</p><form id="formPendTexto"><textarea name="texto" ' + (obrig ? 'required minlength="5"' : '') + ' placeholder="Descreva o motivo"></textarea><div class="btns mt"><button type="button" class="btn sec" data-act="fecharModal">Cancelar</button><button type="submit" class="btn">' + esc(rotulo) + '</button></div></form>');
  setTimeout(function () { var t = $('#formPendTexto textarea'); if (t) t.focus(); }, 50);
}
async function gravarEstadoPend(p, mudanca, msg) {
  var ant = S.estadosPend.get(p.key) || {};
  var doc = Object.assign({ key: p.key, origem: p.origem || 'auto', tipo: p.tipo, titulo: p.titulo, alvo: p.alvo || null, pessoaId: p.pessoaId || null, familiaId: p.familiaId || null, desde: p.desde || null, status: 'aberta', justificativas: [] }, clone(ant));
  if (p.demo) doc.demo = true;
  mudanca(doc);
  doc.atualizadoEm = new Date().toISOString();
  try { await gravar('pendencias', p.key, doc); fecharModal(); toast(msg, 'ok'); }
  catch (e) { toast(msgErro(e), 'erro'); }
}
function acaoJust(texto, acao) { return { texto: texto, em: new Date().toISOString(), por: S.me || null, acao: acao }; }
document.addEventListener('submit', function (ev) {
  if (ev.target.id === 'formPendTexto') { var t = ev.target.elements.texto.value.trim(); if (S._modalOk) S._modalOk(t); }
  if (ev.target.id === 'formPendManual') salvarPendManual(ev.target.elements);
});
function abrirPendManual(pessoaId) {
  var pessoasOrd = Array.from(S.pessoas.values()).sort(function (a, b) { return norm(a.nome) < norm(b.nome) ? -1 : 1; });
  var pSel = pessoaId && S.pessoas.get(pessoaId);
  modal('<h3>Nova observação manual</h3><p class="contagem">Para lembrar algo que o sistema não detecta sozinho. Fica separada das pendências automáticas.</p><form id="formPendManual">' +
    campoTxt('Título', 'titulo', '', 'required maxlength="120" placeholder="Ex.: levar resultado de exame"') +
    '<div class="campo"><label class="rot">Detalhes</label><textarea name="detalhe"></textarea></div>' +
    '<div class="campo"><label class="rot">Morador (opcional)</label><input type="search" name="pessoa" list="dlPessoasPend" value="' + esc(pSel ? pSel.nome : '') + '" placeholder="Digite o nome"><datalist id="dlPessoasPend">' + pessoasOrd.map(function (p) { return '<option value="' + esc(p.nome) + '">'; }).join('') + '</datalist></div>' +
    '<div class="grid g2"><div class="campo"><label class="rot">Nível</label>' + selectHtml('nivel', PD.NIVEIS, 'atencao', false) + '</div>' + campoTxt('Prazo (opcional)', 'prazo', '', 'type="date"') + '</div>' +
    '<div class="btns"><button type="button" class="btn sec" data-act="fecharModal">Cancelar</button><button type="submit" class="btn">Salvar observação</button></div></form>');
}
async function salvarPendManual(E) {
  var titulo = E.titulo.value.trim(); if (!titulo) return;
  var nome = E.pessoa.value.trim(), pe = null;
  if (nome) { S.pessoas.forEach(function (p) { if (!pe && p.nome === nome) pe = p; }); if (!pe) { toast('Morador não encontrado. Escolha um nome da lista ou deixe em branco.', 'erro'); return; } }
  var id = novoId('m'), agora = new Date().toISOString();
  var doc = { key: id, origem: 'manual', tipo: 'manual', status: 'aberta', titulo: titulo, detalhe: E.detalhe.value.trim(), nivel: E.nivel.value, prazo: E.prazo.value || null,
    pessoaId: pe ? pe.id : null, familiaId: pe ? pe.familiaId : null, criadoEm: agora, atualizadoEm: agora, criadoPor: S.me || null, justificativas: [] };
  try { await gravar('pendencias', id, doc); fecharModal(); toast('Observação registrada.', 'ok'); } catch (e) { toast(msgErro(e), 'erro'); }
}
Object.assign(ACOES_VIS, {
  pendCard: function (b) { S.pend.card = b.getAttribute('data-c'); S.pend.aba = 'abertas'; S.pend.limite = 40; render(); },
  pendAbrirCard: function (b) { S.pend.card = b.getAttribute('data-c'); S.pend.aba = 'abertas'; S.pend.cat = ''; irPara('pendencias'); },
  pendAba: function (b) { S.pend.aba = b.getAttribute('data-a'); render(); },
  pendCat: function (b) { S.pend.cat = b.getAttribute('data-c'); S.pend.card = ''; S.pend.limite = 40; render(); },
  pendMais: function () { var y = window.scrollY; S.pend.limite += 40; render(); window.scrollTo(0, y); },
  pendManual: function () { abrirPendManual(); },
  pendJustificar: function (b) {
    var p = pendPorChave(b.getAttribute('data-key')); if (!p) return;
    modalTexto('Registrar justificativa', 'A pendência continua aberta. A justificativa fica registrada com data e autor.', 'Salvar justificativa', true, function (t) {
      if (t.length < 5) { toast('Escreva ao menos 5 caracteres.', 'erro'); return; }
      gravarEstadoPend(p, function (d) { d.justificativas = (d.justificativas || []).concat([acaoJust(t, 'justificou')]); }, 'Justificativa registrada.');
    });
  },
  pendResolver: function (b) {
    var p = pendPorChave(b.getAttribute('data-key')); if (!p) return;
    modalTexto('Marcar como resolvida', 'Informe como foi resolvida. Ela sai da lista de abertas e fica no histórico para consulta e auditoria. Se a mesma situação voltar a acontecer depois, uma nova pendência será criada.', 'Confirmar resolução', true, function (t) {
      if (t.length < 5) { toast('A justificativa é obrigatória (ao menos 5 caracteres).', 'erro'); return; }
      gravarEstadoPend(p, function (d) { d.status = 'resolvida'; d.resolvidaEm = new Date().toISOString(); d.resolvidaPor = S.me || null; d.justificativas = (d.justificativas || []).concat([acaoJust(t, 'resolveu')]); }, 'Pendência resolvida e registrada no histórico.');
    });
  },
  pendReabrir: function (b) {
    var p = pendPorChave(b.getAttribute('data-key')); if (!p) return;
    modalTexto('Reabrir pendência', 'Explique por que ela precisa voltar a ficar aberta.', 'Reabrir', true, function (t) {
      gravarEstadoPend(p, function (d) { d.status = 'aberta'; d.resolvidaEm = null; d.justificativas = (d.justificativas || []).concat([acaoJust(t, 'reabriu')]); }, 'Pendência reaberta.');
    });
  }
});
document.addEventListener('change', function (ev) { var k = ev.target.getAttribute && ev.target.getAttribute('data-pf'); if (k && k !== 'q') { S.pend[k] = ev.target.value; render(); } });
var tmrPendQ;
document.addEventListener('input', function (ev) {
  if (ev.target.getAttribute && ev.target.getAttribute('data-pf') === 'q') {
    S.pend.q = ev.target.value; clearTimeout(tmrPendQ);
    tmrPendQ = setTimeout(function () { var pos = ev.target.selectionStart; render(); var n = $('[data-pf=q]'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) { } } }, 200);
  }
});

// ---------- configuração da central ----------
var PRAZOS_LINHAS_NOVAS = [['tuberculose', 'Tuberculose'], ['hanseniase', 'Hanseníase'], ['saude_mental', 'Saúde mental']];
function configPendenciasHtml() {
  var c = cfg(), niv = c.niveisPendencia || {}, tent = Array.isArray(c.tentativasReagendar) ? c.tentativasReagendar : PD.TENTATIVAS_PADRAO;
  var h = '<div class="card"><h2>Central de pendências</h2><p class="contagem">Prazos das linhas novas (dias sem visita realizada). Em branco = a linha não gera pendência. Use os prazos definidos pela equipe ou por protocolo institucional — o sistema não define prazos clínicos.</p><div class="grid g3">' +
    PRAZOS_LINHAS_NOVAS.map(function (k) { var v = (c.prazos || {})[k[0]]; return campoTxt(k[1], 'prazo_' + k[0], v > 0 ? v : '', 'type="number" min="1" max="365" inputmode="numeric" placeholder="não configurado"'); }).join('') +
    campoTxt('Antecedência de "próximos" (dias)', 'diasProximos', c.diasProximos || 2, 'type="number" min="1" max="30" inputmode="numeric"') + '</div>';
  h += '<h3 class="mt">Tentativas que geram "reagendar"</h3><div class="grid g2">' + P.TENTATIVAS.map(function (t) { return '<label class="chk"><input type="checkbox" name="tentReag" value="' + esc(t) + '"' + (tent.indexOf(t) >= 0 ? ' checked' : '') + '> ' + esc(t) + '</label>'; }).join('') + '</div>';
  h += '<h3 class="mt">Nível de cada tipo de pendência</h3><p class="contagem">Vermelho = prioridade alta · Amarelo = atenção · Azul = informativo. Os padrões são operacionais (prazos e agenda), não uma classificação de risco clínico; ajuste conforme o protocolo da equipe.</p><div class="tabwrap"><table class="tab"><thead><tr><th>Tipo</th><th>Nível</th></tr></thead><tbody>' +
    Object.keys(PD.TIPOS).filter(function (t) { return t !== 'manual'; }).map(function (t) { return '<tr><td>' + esc(PD.TIPOS[t].nome) + '</td><td>' + selectHtml('niv_' + t, PD.NIVEIS, niv[t] || PD.TIPOS[t].nivel, false, 'style="min-height:36px;padding:4px 8px"') + '</td></tr>'; }).join('') + '</tbody></table></div></div>';
  return h;
}
function lerConfigPendencias(E, c) {
  c.prazos = c.prazos || {};
  PRAZOS_LINHAS_NOVAS.forEach(function (k) { var v = parseInt(E['prazo_' + k[0]].value, 10); if (v > 0) c.prazos[k[0]] = v; else delete c.prazos[k[0]]; });
  c.diasProximos = parseInt(E.diasProximos.value, 10) || 2;
  c.tentativasReagendar = $$('#formConfig input[name=tentReag]').filter(function (x) { return x.checked; }).map(function (x) { return x.value; });
  c.niveisPendencia = {};
  Object.keys(PD.TIPOS).forEach(function (t) { var el = E['niv_' + t]; if (el && el.value !== PD.TIPOS[t].nivel) c.niveisPendencia[t] = el.value; });
}


// ============================================================================
// AGENDA INTELIGENTE (v3)
// ============================================================================
var AG = window.ACSAgenda;
S.ag = { aba: 'hoje', agrupar: 'horario', preset: 'semana', de: '', ate: '', micro: '', semanaRef: hojeISO(), mesRef: hojeISO().slice(0, 7), diaSel: hojeISO() };
var SIT_COR = { 'Agendado': 'azul', 'Concluído': 'verde', 'Não realizado': 'amarelo', 'Reagendado': 'cinza', 'Cancelado': 'cinza' };

function iniciarAgenda() {
  if (!S.db) return;
  S.db.collection('agenda').onSnapshot(function (snap) {
    var m = new Map(); snap.docs.forEach(function (d) { var o = Object.assign({}, d.data()); o.id = d.id; m.set(d.id, o); });
    S.agenda = m; invalidar(); aoMudarDados(); atualizarSino();
  }, function () { });
}
// Redesenha depois do evento atual (um "change" pode vir junto do "blur" do campo de texto)
function renderAdiado() { setTimeout(function () { var y = window.scrollY; render(); window.scrollTo(0, y); }, 0); }
function agTodos() { return Array.from(S.agenda.values()); }
function famAg(a) { return S.familias.get(a.familiaId) || (a.pessoaId && S.familias.get((S.pessoas.get(a.pessoaId) || {}).familiaId)) || null; }
function microAg(a) { var f = famAg(a); return f ? f.microarea : ''; }
function agFiltrados() { var m = S.ag.micro; return agTodos().filter(function (a) { return !m || microAg(a) === m; }); }
function coordVerif(a) { var f = famAg(a); return f && f.coordVerificadas && temCoord(f) ? { lat: +f.latitude, lng: +f.longitude } : null; }
function enderecoAg(a) { var f = famAg(a); return a.endereco || (f ? enderecoCompletoTxt(f, true) : ''); }
function linhasAg(a) {
  if (a.linha) return [rotLinha(a.linha)];
  var p = a.pessoaId && S.pessoas.get(a.pessoaId);
  return p ? P.linhasDaPessoa(p, a.data || hojeISO()).map(rotLinha) : [];
}
function rotaAg(a) {
  var f = famAg(a);
  if (f && (!a.endereco || a.endereco === enderecoCompletoTxt(f, true))) return urlRota(f);
  return a.endereco ? 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(a.endereco) : null;
}
function periodoAg() {
  var h = hojeISO();
  if (S.ag.preset === 'hoje') return { de: h, ate: h, rotulo: 'Hoje' };
  if (S.ag.preset === 'mes') return P.periodo('mes', h);
  if (S.ag.preset === 'personalizado') return P.periodo('personalizado', h, S.ag.de || h, S.ag.ate || h);
  return P.periodo('semana', h);
}

// ---------- lembretes ----------
function cfgLembretes() { return Object.assign({}, AG.LEMBRETES_PADRAO, cfg().lembretes || {}); }
function lerDispensados() { try { return JSON.parse(localStorage.getItem('acs_lembretes_dispensados') || '{}'); } catch (e) { return {}; } }
function lembretesAtivos() {
  var dis = lerDispensados();
  return AG.lembretes(agTodos(), { data: hojeISO(), hora: agoraHora() }, cfgLembretes()).filter(function (l) { return !dis[l.chave]; });
}
var TIPO_LEMBRETE = { horario: 'Agora', atrasado: 'Atrasado', manha: 'Hoje', vespera: 'Amanhã' };
function atualizarSino() {
  var b = $('#btnLembretes'); if (!b) return;
  var n = S.agenda.size ? lembretesAtivos().length : 0;
  var badge = b.querySelector('.badge'); badge.textContent = n > 9 ? '9+' : n; badge.hidden = !n;
  b.setAttribute('aria-label', n ? plural(n, 'lembrete', 'lembretes') + ' da agenda' : 'Lembretes da agenda');
  notificarNavegador(n);
}
function abrirLembretes() {
  var l = lembretesAtivos();
  var h = '<h3>Lembretes da agenda</h3>';
  if (!l.length) h += '<p class="contagem">Nenhum lembrete agora.</p>';
  else h += '<div class="lista mt">' + l.map(function (x) {
    var a = x.item, pe = a.pessoaId && S.pessoas.get(a.pessoaId);
    return '<div class="lcard ' + x.tipo + '"><div class="ptop"><span class="chip ' + (x.tipo === 'atrasado' ? 'vermelho' : x.tipo === 'horario' ? 'amarelo' : 'azul') + '">' + TIPO_LEMBRETE[x.tipo] + '</span><b>' + fmtData(a.data).slice(0, 5) + (a.hora ? ' · ' + esc(a.hora) : '') + '</b></div><div class="ptit">' + esc(a.titulo) + '</div>' + (pe ? '<div class="vmeta">' + esc(pe.nome) + '</div>' : '') +
      '<div class="btns mt"><button class="btn peq" data-act="agendaEditar" data-id="' + a.id + '">Abrir</button><button class="btn peq sec" data-act="lembreteDispensar" data-k="' + esc(x.chave) + '">Dispensar</button></div></div>';
  }).join('') + '</div><p class="contagem mt">Dispensar só esconde o lembrete neste aparelho; o compromisso continua na agenda e nas pendências até ser concluído.</p>';
  h += '<div class="btns mt"><button class="btn sec" data-act="fecharModal">Fechar</button><button class="btn" data-act="lembreteAbrirAgenda">Abrir agenda</button></div>';
  modal(h);
}
var _notifVistos = null;
function notificarNavegador(n) {
  try {
    if (!n || !('Notification' in window) || Notification.permission !== 'granted') return;
    var chaves = lembretesAtivos().map(function (l) { return l.chave; });
    if (_notifVistos == null) { try { _notifVistos = JSON.parse(localStorage.getItem('acs_notif_vistos') || '[]'); } catch (e) { _notifVistos = []; } }
    var novos = chaves.filter(function (k) { return _notifVistos.indexOf(k) < 0; });
    if (!novos.length) return;
    // Texto genérico: nenhuma informação de saúde ou nome aparece na tela bloqueada (LGPD)
    new Notification('ACS DIGITAL', { body: 'Você tem ' + plural(novos.length, 'novo lembrete', 'novos lembretes') + ' na agenda. Abra o aplicativo para ver.', tag: 'acs-agenda' });
    _notifVistos = _notifVistos.concat(novos).slice(-200);
    try { localStorage.setItem('acs_notif_vistos', JSON.stringify(_notifVistos)); } catch (e) { }
  } catch (e) { }
}
setInterval(atualizarSino, 60000);

// ---------- tela ----------
function viewAgenda() {
  var f = S.ag, per = periodoAg(), ind = AG.indicadores(agFiltrados(), per.de, per.ate, hojeISO());
  var lem = lembretesAtivos();
  var h = '';
  if (lem.length) h += '<button class="aviso lembretebar" data-act="lembretesAbrir">' + ico('agenda', 'width="20" height="20" aria-hidden="true"') + '<span><b>' + plural(lem.length, 'lembrete', 'lembretes') + '</b> — ' + esc(lem.slice(0, 2).map(function (l) { return TIPO_LEMBRETE[l.tipo] + ': ' + l.item.titulo; }).join(' · ')) + (lem.length > 2 ? '…' : '') + '</span></button>';
  h += '<div class="filtros">' + [['hoje', 'Hoje'], ['semana', 'Semana'], ['mes', 'Mês'], ['personalizado', 'Personalizado']].map(function (p) { return '<button class="fbtn' + (f.preset === p[0] ? ' ativo' : '') + '" data-act="agPreset" data-p="' + p[0] + '">' + p[1] + '</button>'; }).join('') +
    selectHtml('micro', microareas(), f.micro, 'Todas as microáreas', 'data-agf="micro"') + '</div>';
  if (f.preset === 'personalizado') h += '<div class="filtros"><label class="contagem" style="align-self:center;margin:0">De</label><input type="date" data-agf="de" value="' + esc(per.de) + '" style="width:auto;min-height:38px;padding:6px 10px"><label class="contagem" style="align-self:center;margin:0">até</label><input type="date" data-agf="ate" value="' + esc(per.ate) + '" style="width:auto;min-height:38px;padding:6px 10px"></div>';
  h += '<p class="contagem">' + esc(per.rotulo) + ': ' + fmtData(per.de) + (per.ate !== per.de ? ' a ' + fmtData(per.ate) : '') + '</p>';
  h += '<div class="grid g3">' + tile(ind.hoje, 'Compromissos de hoje', null, 'data-act="agAba" data-a="hoje"') + tile(ind.visitasProgramadas, 'Visitas programadas', 'no período', 'data-act="agAba" data-a="semana"') +
    tile(ind.retornos, 'Retornos agendados', 'no período', 'data-act="agAba" data-a="retornos"') + tile(ind.concluidas, 'Atividades concluídas', 'no período') +
    tile(ind.pendentes, 'Atividades pendentes', '"Agendado" no período') + tile('<span style="color:' + (ind.atrasados ? 'var(--vermelho)' : 'inherit') + '">' + ind.atrasados + '</span>', 'Compromissos atrasados', 'ainda "Agendado"', 'data-act="agAba" data-a="hoje"') + '</div>';
  h += '<div class="barra-acoes mt"><span class="cresce"></span>' + (somenteLeitura() ? '' : '<button class="btn" data-act="agendaNovo">' + ico('add', 'width="18" height="18"') + 'Novo compromisso</button>') + '</div>';
  h += '<div class="tabs" role="tablist">' + [['hoje', 'Hoje'], ['semana', 'Semana'], ['calendario', 'Calendário'], ['retornos', 'Retornos'], ['pendencias', 'Pendências']].map(function (t) { return '<button role="tab" class="' + (f.aba === t[0] ? 'ativo' : '') + '" data-act="agAba" data-a="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div>';
  if (f.aba === 'semana') h += abaSemana();
  else if (f.aba === 'calendario') h += abaCalendario();
  else if (f.aba === 'retornos') h += abaRetornos();
  else if (f.aba === 'pendencias') h += abaPendAgenda();
  else h += abaHoje();
  return h;
}
function seletorAgrupar() {
  return '<div class="filtros"><label class="contagem" style="align-self:center;margin:0">Organizar por</label>' + selectHtml('agrupar', [['horario', 'Horário'], ['microarea', 'Microárea'], ['linha', 'Linha de cuidado'], ['endereco', 'Endereço'], ['proximidade', 'Proximidade (mapa)']], S.ag.agrupar, false, 'data-agf="agrupar"') + '</div>';
}
function listaAgrupada(itens) {
  if (!itens.length) return '';
  if (S.ag.agrupar === 'proximidade') {
    var ab = itens.filter(function (a) { return a.situacao === 'Agendado'; }), resto = itens.filter(function (a) { return a.situacao !== 'Agendado'; });
    var r = AG.ordenarProximidade(ab, coordVerif, function (a) { var f = famAg(a) || {}; return { micro: f.microarea, bairro: f.bairro, endereco: f.endereco || a.endereco, numero: f.numero }; });
    var h = '<div class="aviso">' + (r.comCoord ? plural(r.comCoord, 'compromisso com coordenadas verificadas ordenado', 'compromissos com coordenadas verificadas ordenados') + ' pelo vizinho mais próximo (≈ ' + fmtNum(r.totalKm, 1) + ' km em linha reta entre as paradas). ' : 'Nenhum compromisso com coordenadas verificadas. ') +
      (r.semCoord.length ? plural(r.semCoord.length, 'compromisso sem coordenadas verificadas aparece', 'compromissos sem coordenadas verificadas aparecem') + ' depois, por microárea, bairro, rua e número — a localização deles não foi validada.' : '') + '</div>';
    var pts = r.ordem.slice(0, r.comCoord).map(coordVerif), url = AG.rotaMaps(pts);
    if (url) h += '<div class="btns" style="margin-bottom:10px"><a class="btn rota" href="' + esc(url) + '" target="_blank" rel="noopener">' + ICO_PIN + 'ROTA NO GOOGLE MAPS (' + Math.min(10, pts.length) + ' paradas)</a></div>';
    return h + '<div class="lista">' + r.ordem.map(function (a, i) { return cartaoAg(a, i < r.comCoord ? i + 1 : null); }).join('') + resto.sort(AG.ord).map(function (a) { return cartaoAg(a); }).join('') + '</div>';
  }
  return AG.agrupar(itens, S.ag.agrupar, { micro: microAg, linhas: linhasAg, endereco: function (a) { var f = famAg(a); return f ? [f.bairro, f.endereco].filter(Boolean).join(' — ') : a.endereco; } }).map(function (g) {
    return (g.rotulo ? '<h3 class="subtit">' + esc(g.rotulo) + ' (' + g.itens.length + ')</h3>' : '') + '<div class="lista">' + g.itens.map(function (a) { return cartaoAg(a); }).join('') + '</div>';
  }).join('');
}
function abaHoje() {
  var hoje = hojeISO(), l = agFiltrados();
  var atr = l.filter(function (a) { return a.situacao === 'Agendado' && a.data < hoje; }).sort(AG.ord);
  var doDia = l.filter(function (a) { return a.data === hoje; });
  var h = seletorAgrupar();
  if (atr.length) h += '<h3 class="subtit" style="color:var(--vermelho)">Atrasados (' + atr.length + ')</h3><div class="lista">' + atr.map(function (a) { return cartaoAg(a); }).join('') + '</div>';
  h += '<h3 class="subtit">Hoje · ' + fmtData(hoje) + ' (' + doDia.length + ')</h3>';
  if (!doDia.length) return h + '<div class="vazio"><strong>Nada agendado para hoje</strong>' + (somenteLeitura() ? '' : '<div class="mt"><button class="btn sec" data-act="agendaNovo">Novo compromisso</button></div>') + '</div>';
  return h + listaAgrupada(doDia);
}
function abaSemana() {
  var dias = AG.semana(S.ag.semanaRef), l = agFiltrados();
  var h = '<div class="navper"><button class="btn peq sec" data-act="agSemana" data-d="-7" aria-label="Semana anterior">‹</button><b>' + fmtData(dias[0]).slice(0, 5) + ' a ' + fmtData(dias[6]) + '</b><button class="btn peq sec" data-act="agSemana" data-d="7" aria-label="Próxima semana">›</button>' + (dias.indexOf(hojeISO()) < 0 ? '<button class="btn peq sec" data-act="agSemana" data-d="0">Hoje</button>' : '') + '</div>' + seletorAgrupar();
  var nomes = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
  dias.forEach(function (d, i) {
    var it = l.filter(function (a) { return a.data === d; });
    h += '<h3 class="subtit' + (d === hojeISO() ? ' hoje' : '') + '">' + nomes[i] + ', ' + fmtData(d).slice(0, 5) + (d === hojeISO() ? ' · hoje' : '') + ' (' + it.length + ')</h3>';
    h += it.length ? listaAgrupada(it) : '<p class="contagem">Sem compromissos.</p>';
  });
  return h;
}
function abaCalendario() {
  var mes = S.ag.mesRef, g = AG.gradeMes(mes), l = agFiltrados(), cont = {};
  l.forEach(function (a) { if (AG.ativo(a)) { var c = cont[a.data] || (cont[a.data] = { n: 0, atr: 0 }); c.n++; if (a.situacao === 'Agendado' && a.data < hojeISO()) c.atr++; } });
  var h = '<div class="navper"><button class="btn peq sec" data-act="agMes" data-d="-1" aria-label="Mês anterior">‹</button><b>' + esc(nomeMes(mes)) + '</b><button class="btn peq sec" data-act="agMes" data-d="1" aria-label="Próximo mês">›</button></div>';
  h += '<div class="cal"><div class="calcab">' + ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(function (d) { return '<span>' + d + '</span>'; }).join('') + '</div>';
  g.forEach(function (w) {
    h += '<div class="calsem">' + w.map(function (d) {
      var c = cont[d.data], cls = (d.doMes ? '' : ' fora') + (d.data === hojeISO() ? ' hoje' : '') + (d.data === S.ag.diaSel ? ' sel' : '');
      return '<button class="caldia' + cls + '" data-act="agDia" data-d="' + d.data + '" aria-label="' + fmtData(d.data) + (c ? ': ' + plural(c.n, 'compromisso', 'compromissos') : '') + '"><span>' + (+d.data.slice(8)) + '</span>' + (c ? '<i class="' + (c.atr ? 'atr' : '') + '">' + c.n + '</i>' : '') + '</button>';
    }).join('') + '</div>';
  });
  h += '</div>';
  var it = l.filter(function (a) { return a.data === S.ag.diaSel; });
  h += '<h3 class="subtit">' + fmtData(S.ag.diaSel) + ' (' + it.length + ')</h3>' + (it.length ? '<div class="lista">' + it.sort(AG.ord).map(function (a) { return cartaoAg(a); }).join('') + '</div>' : '<p class="contagem">Sem compromissos neste dia.</p>');
  return h;
}
function abaRetornos() {
  var hoje = hojeISO(), l = agFiltrados().filter(function (a) { return a.categoria === 'retorno'; });
  var atr = l.filter(function (a) { return a.situacao === 'Agendado' && a.data < hoje; }).sort(AG.ord);
  var prox = l.filter(function (a) { return a.situacao === 'Agendado' && a.data >= hoje; }).sort(AG.ord);
  var rec = l.filter(function (a) { return a.situacao !== 'Agendado' && a.data >= P.addDias(hoje, -30); }).sort(function (a, b) { return AG.ord(b, a); });
  var h = '';
  if (atr.length) h += '<h3 class="subtit" style="color:var(--vermelho)">Atrasados (' + atr.length + ')</h3><div class="lista">' + atr.map(function (a) { return cartaoAg(a); }).join('') + '</div>';
  h += '<h3 class="subtit">Próximos retornos (' + prox.length + ')</h3>' + (prox.length ? '<div class="lista">' + prox.map(function (a) { return cartaoAg(a); }).join('') + '</div>' : '<p class="contagem">Nenhum retorno agendado. Use "Agendar retorno" ao registrar uma visita.</p>');
  if (rec.length) h += '<h3 class="subtit">Últimos 30 dias (' + rec.length + ')</h3><div class="lista">' + rec.map(function (a) { return cartaoAg(a); }).join('') + '</div>';
  return h;
}
function abaPendAgenda() {
  var l = pendencias().abertas.filter(function (p) { return p.cat === 'visita' || p.cat === 'agenda'; });
  return '<p class="contagem">Pendências de visitas e da agenda (as mesmas da Central). <button class="linkbtn" data-act="pendAbrirCard" data-c="">Abrir central completa</button></p>' +
    (l.length ? '<div class="lista">' + l.slice(0, 60).map(cartaoPend).join('') + '</div>' : '<div class="vazio"><strong>Nenhuma pendência de agenda ou visita</strong></div>');
}
function cartaoAg(a, ordemNum) {
  var pe = a.pessoaId && S.pessoas.get(a.pessoaId), fa = famAg(a), ro = somenteLeitura(), hoje = hojeISO();
  var atrasado = a.situacao === 'Agendado' && a.data < hoje;
  var h = '<div class="acard ' + (SIT_COR[a.situacao] || '') + (atrasado ? ' atrasado' : '') + '" data-id="' + a.id + '"><div class="ptop">' + (ordemNum ? '<span class="ordem">' + ordemNum + '</span>' : '') + '<b>' + (a.data !== hoje ? fmtData(a.data).slice(0, 5) + ' · ' : '') + (a.hora || 'Sem horário') + '</b>' +
    '<span class="chip">' + esc(AG.rotCat(a.categoria)) + '</span><span class="chip sit ' + (SIT_COR[a.situacao] || '') + '">' + esc(atrasado ? 'Atrasado' : a.situacao) + '</span>' + demoChip(a) + '</div>';
  h += '<div class="ptit">' + esc(a.titulo || AG.rotCat(a.categoria)) + '</div>';
  var q = [];
  if (pe) q.push('<button class="linkbtn forte" data-act="abrirPessoa" data-id="' + pe.id + '">' + esc(pe.nome) + '</button>');
  if (fa) q.push('<button class="linkbtn" data-act="abrirFamilia" data-id="' + fa.id + '">Família ' + esc(fa.codigo) + '</button> · Microárea ' + esc(fa.microarea || '—'));
  if (q.length) h += '<div class="vmeta">' + q.join(' · ') + '</div>';
  if (pe && pe.telefone && numeroWhatsApp(pe.telefone)) h += '<div class="vmeta telwa-txt">' + esc(fmtTelefone(pe.telefone)) + iconeWhatsApp(pe.telefone) + '</div>';
  var end = enderecoAg(a);
  if (end) h += '<div class="vmeta">' + (fa && (!a.endereco || a.endereco === enderecoCompletoTxt(fa, true)) ? linkEndereco(fa) : '<a class="endlink" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(end) + '">' + ICO_PIN + esc(end) + '</a>') + (coordVerif(a) ? '' : ' <span class="contagem">(localização não validada)</span>') + '</div>';
  var li = linhasAg(a);
  if (li.length) h += '<div class="chips" style="margin-top:6px">' + li.map(function (x) { return '<span class="chip azul">' + esc(x) + '</span>'; }).join('') + '</div>';
  var det = [];
  if (a.motivo) det.push('<b>Motivo:</b> ' + esc(a.motivo));
  if (a.observacoes) det.push('<b>Observações:</b> ' + esc(a.observacoes));
  det.push('<b>ACS responsável:</b> ' + esc(nomeAcs(a.acsId)));
  if (a.visitaId && S.visitas.get(a.visitaId)) det.push('<b>Visita registrada:</b> <button class="linkbtn" data-act="editarVisita" data-id="' + a.visitaId + '">' + fmtData(S.visitas.get(a.visitaId).data) + ' — ' + esc(S.visitas.get(a.visitaId).situacao) + '</button>');
  if (a.reagendadoPara && S.agenda.get(a.reagendadoPara)) det.push('<b>Reagendado para:</b> ' + fmtData(S.agenda.get(a.reagendadoPara).data) + (S.agenda.get(a.reagendadoPara).hora ? ' às ' + esc(S.agenda.get(a.reagendadoPara).hora) : ''));
  if (a.reagendadoDe) det.push('<b>Reagendamento</b> de compromisso anterior');
  if (a.origemVisitaId && S.visitas.get(a.origemVisitaId)) det.push('<b>Retorno da visita de</b> ' + fmtData(S.visitas.get(a.origemVisitaId).data));
  h += '<div class="vdet">' + det.join('<br>') + '</div>';
  var b = [];
  if (!ro && a.situacao === 'Agendado') {
    b.push(AG.ehVisita(a.categoria) ? '<button class="btn peq" data-act="agendaConcluir" data-id="' + a.id + '">Registrar visita</button>' : '<button class="btn peq" data-act="agendaConcluir" data-id="' + a.id + '">Concluir</button>');
    b.push('<button class="btn peq sec" data-act="agendaNaoRealizado" data-id="' + a.id + '">Não realizado</button><button class="btn peq sec" data-act="agendaReagendar" data-id="' + a.id + '">Reagendar</button><button class="btn peq sec" data-act="agendaCancelar" data-id="' + a.id + '">Cancelar</button>');
  }
  if (!ro && a.situacao === 'Não realizado' && !a.reagendadoPara) b.push('<button class="btn peq" data-act="agendaReagendar" data-id="' + a.id + '">Reagendar</button>');
  b.push('<button class="btn peq sec" data-act="agendaEditar" data-id="' + a.id + '">' + (ro ? 'Detalhes' : 'Editar') + '</button>');
  var r = rotaAg(a);
  if (r) b.push('<a class="btn rota peq" href="' + esc(r) + '" target="_blank" rel="noopener">' + ICO_PIN + 'COMO CHEGAR</a>');
  return h + '<div class="btns mt">' + b.join('') + '</div></div>';
}

// ---------- formulário de compromisso ----------
function abrirAgendaForm(pre) { abrirSub(Object.assign({ tipo: 'agendaForm', id: null }, pre || {})); }
function rotuloPessoa(p) { var f = S.familias.get(p.familiaId); return p.nome + (f ? ' — ' + f.codigo : ''); }
function viewAgendaForm(sub) {
  var a = sub.id ? S.agenda.get(sub.id) : null;
  if (sub.id && !a) return '<div class="vazio"><strong>Compromisso não encontrado</strong></div>';
  if (!S.rascunho) {
    var pe0 = sub.pessoaId && S.pessoas.get(sub.pessoaId), famId = sub.familiaId || (pe0 && pe0.familiaId) || '';
    var f0 = famId && S.familias.get(famId);
    S.rascunho = { tipo: 'agenda', sujo: false, dados: a ? clone(a) : {
      categoria: sub.categoria || 'visita', titulo: '', pessoaId: pe0 ? pe0.id : '', familiaId: famId, linha: sub.linha || '',
      data: sub.data || P.addDias(hojeISO(), sub.categoria === 'retorno' ? 7 : 0), hora: sub.hora || '', endereco: f0 ? enderecoCompletoTxt(f0, true) : '',
      motivo: sub.motivo || '', observacoes: '', situacao: 'Agendado', origemVisitaId: sub.origemVisitaId || null } };
  }
  var d = S.rascunho.dados, ro = somenteLeitura();
  var pessoasOrd = Array.from(S.pessoas.values()).filter(function (p) { return (p.situacao || 'Ativo') === 'Ativo' || p.id === d.pessoaId; }).sort(function (x, y) { return norm(x.nome) < norm(y.nome) ? -1 : 1; });
  var fams = Array.from(S.familias.values()).filter(function (f) { return (f.situacao || 'Ativa') === 'Ativa' || f.id === d.familiaId; }).sort(function (x, y) { return x.codigo < y.codigo ? -1 : 1; });
  var pSel = d.pessoaId && S.pessoas.get(d.pessoaId);
  var h = '<form id="formAgenda" autocomplete="off"><div class="card"><div class="grid g2">';
  h += '<div class="campo"><label class="rot">Categoria</label>' + selectHtml('categoria', AG.CATEGORIAS, d.categoria, false) + '</div>';
  h += campoTxt('Título', 'titulo', d.titulo, 'maxlength="120" placeholder="Deixe em branco para gerar automaticamente"');
  h += '<div class="campo"><label class="rot">Morador (opcional)</label><input type="search" name="pessoa" list="dlPessoasAg" value="' + esc(pSel ? rotuloPessoa(pSel) : '') + '" placeholder="Digite o nome"><datalist id="dlPessoasAg">' + pessoasOrd.map(function (p) { return '<option value="' + esc(rotuloPessoa(p)) + '">'; }).join('') + '</datalist></div>';
  h += '<div class="campo"><label class="rot">Família (opcional)</label>' + selectHtml('familiaId', fams.map(function (f) { return [f.id, nomeFamilia(f)]; }), d.familiaId, 'Nenhuma') + '</div>';
  h += '<div class="campo"><label class="rot">Linha de cuidado</label>' + selectHtml('linha', LINHAS_FORM, d.linha, 'Nenhuma / automática pelo morador') + '</div>';
  h += campoTxt('Data', 'data', d.data, 'type="date" required') + campoTxt('Horário', 'hora', d.hora, 'type="time"');
  h += '</div>' + campoTxt('Endereço', 'endereco', d.endereco, 'placeholder="Preenchido pela família; pode ser alterado (ex.: UBS, escola)"');
  h += '<div class="campo"><label class="rot">Motivo</label><textarea name="motivo">' + esc(d.motivo || '') + '</textarea></div><div class="campo"><label class="rot">Observações</label><textarea name="observacoes">' + esc(d.observacoes || '') + '</textarea></div>';
  if (a) h += '<div class="campo"><label class="rot">Situação</label>' + selectHtml('situacao', AG.SITUACOES, d.situacao, false) + '</div>';
  h += '<p class="contagem">ACS responsável: <b>' + esc(nomeAcs(a ? a.acsId : S.me)) + '</b>' + (d.origemVisitaId ? ' · Retorno vinculado à visita de ' + fmtData((S.visitas.get(d.origemVisitaId) || {}).data) : '') + '</p></div>';
  if (a) h += '<div class="card"><h2>Histórico de alterações</h2>' + historicoHtml(a.historico) + '</div>';
  h += '<div class="salvarbar"><span class="naosalvo" id="naoSalvo"' + (S.rascunho.sujo ? '' : ' hidden') + '>Alterações não salvas</span><button type="button" class="btn sec" data-act="voltar">Cancelar</button><button type="submit" class="btn"' + (ro ? ' disabled' : '') + '>' + (a ? 'Salvar compromisso' : 'Agendar') + '</button></div></form>';
  return h;
}
function lerFormAgenda() {
  var E = $('#formAgenda').elements, d = S.rascunho.dados;
  ['categoria', 'titulo', 'familiaId', 'linha', 'data', 'hora', 'endereco', 'motivo', 'observacoes'].forEach(function (k) { d[k] = E[k].value.trim(); });
  if (E.situacao) d.situacao = E.situacao.value;
  var nome = E.pessoa.value.trim(); d._pessoaTxt = nome;
  if (!nome) d.pessoaId = '';
  else { var achou = null; S.pessoas.forEach(function (p) { if (!achou && (rotuloPessoa(p) === nome || p.nome === nome)) achou = p; }); d.pessoaId = achou ? achou.id : d.pessoaId; d._pessoaInvalida = !achou; }
}
var ROT_AG = { categoria: 'Categoria', titulo: 'Título', pessoaId: 'Morador', familiaId: 'Família', linha: 'Linha de cuidado', data: 'Data', hora: 'Horário', endereco: 'Endereço', motivo: 'Motivo', observacoes: 'Observações', situacao: 'Situação' };
async function salvarAgenda() {
  lerFormAgenda();
  var d = S.rascunho.dados;
  if (d._pessoaInvalida) { toast('Morador não encontrado. Escolha um nome da lista.', 'erro'); return; }
  if (!d.data) { toast('Informe a data.', 'erro'); return; }
  if (AG.ehVisita(d.categoria) && !d.familiaId && !d.pessoaId) { toast('Visitas e retornos precisam de um morador ou família.', 'erro'); return; }
  var pe = d.pessoaId && S.pessoas.get(d.pessoaId);
  if (pe && !d.familiaId) d.familiaId = pe.familiaId || '';
  if (!d.titulo) d.titulo = AG.rotCat(d.categoria) + (pe ? ' — ' + pe.nome : d.familiaId && S.familias.get(d.familiaId) ? ' — ' + S.familias.get(d.familiaId).codigo : '');
  var id = d.id || novoId('a'), ant = S.agenda.get(id);
  var doc = {}; Object.keys(ROT_AG).forEach(function (k) { doc[k] = d[k] == null ? '' : d[k]; });
  ['origemVisitaId', 'visitaId', 'reagendadoDe', 'reagendadoPara', 'pessoaIds'].forEach(function (k) { if (d[k]) doc[k] = d[k]; });
  if (d.demo) doc.demo = true;
  doc.acsId = (ant && ant.acsId) || S.me || null;
  var campos = diferencas(ant, doc, Object.keys(ROT_AG), ROT_AG);
  if (ant && !campos.length) { S.rascunho.sujo = false; voltar(); return; }
  doc.criadoEm = (ant && ant.criadoEm) || new Date().toISOString(); doc.atualizadoEm = new Date().toISOString();
  comHistorico(doc, ant, ant ? 'Editou' : 'Agendou', ant ? campos : []);
  try { await gravar('agenda', id, doc); S.rascunho = null; toast(ant ? 'Compromisso atualizado.' : 'Compromisso agendado para ' + fmtData(doc.data) + (doc.hora ? ' às ' + doc.hora : '') + '.', 'ok'); voltar(); }
  catch (e) { toast(msgErro(e), 'erro'); }
}
async function mudarSituacaoAg(a, nova, extra, acao) {
  var doc = Object.assign({}, a); delete doc.id; doc.situacao = nova; Object.assign(doc, extra || {});
  doc.atualizadoEm = new Date().toISOString();
  comHistorico(doc, a, acao || ('Situação: ' + nova), ['Situação']);
  await gravar('agenda', a.id, doc);
}

// ---------- integração com o registro de visita ----------
function compromissosAbertosFamilia(famId, ate) {
  return agTodos().filter(function (a) { return a.familiaId === famId && a.situacao === 'Agendado' && AG.ehVisita(a.categoria) && a.data <= ate; }).sort(AG.ord);
}
function blocoAgendaNaVisita(d, sub) {
  var h = '';
  if (d.familiaId) {
    var abertos = compromissosAbertosFamilia(d.familiaId, d.data || hojeISO());
    if (d.agendaId && !abertos.some(function (a) { return a.id === d.agendaId; }) && S.agenda.get(d.agendaId)) abertos.unshift(S.agenda.get(d.agendaId));
    if (abertos.length && !d.id) {
      var marcados = d.agConcluir || abertos.filter(function (a) { return a.id === d.agendaId || a.data === (d.data || hojeISO()); }).map(function (a) { return a.id; });
      h += '<div class="card"><h2>Compromissos da agenda</h2><p class="contagem">Os marcados ficam ligados a esta visita: "Concluído" se a visita for realizada, ou "Não realizado" se for uma tentativa. Nenhuma visita extra é criada.</p><div class="lista">' +
        abertos.map(function (a) { return '<label class="chk"><input type="checkbox" name="agConcluir" value="' + a.id + '"' + (marcados.indexOf(a.id) >= 0 ? ' checked' : '') + '> ' + fmtData(a.data) + (a.hora ? ' ' + esc(a.hora) : '') + ' — ' + esc(a.titulo) + (a.data < hojeISO() ? ' <span class="chip" style="background:var(--vermelho-cl);color:var(--vermelho)">atrasado</span>' : '') + '</label>'; }).join('') + '</div></div>';
    }
  }
  if (!d.id && !somenteLeitura()) {
    var r = d.retorno || {};
    h += '<div class="card retornobox"><label class="chk retornotoggle"><input type="checkbox" name="retornoOn"' + (r.on ? ' checked' : '') + '> <b>AGENDAR RETORNO</b></label><div class="retornocampos"' + (r.on ? '' : ' hidden') + '><p class="contagem mt">Cria o compromisso na agenda, vinculado ao(s) morador(es) desta visita. Aparece nos lembretes e nas pendências.</p><div class="grid g2">' +
      campoTxt('Data do retorno', 'retData', r.data || P.addDias(hojeISO(), 7), 'type="date" min="' + hojeISO() + '"') + campoTxt('Horário', 'retHora', r.hora || '', 'type="time"') + '</div>' +
      '<div class="campo"><label class="rot">Motivo do retorno</label><textarea name="retMotivo" placeholder="Ex.: verificar adesão ao tratamento">' + esc(r.motivo || '') + '</textarea></div></div></div>';
  }
  return h;
}
function lerAgendaNaVisita(d) {
  var fm = $('#formVisita'); if (!fm) return;
  var ch = $$('#formVisita input[name=agConcluir]');
  if (ch.length) d.agConcluir = ch.filter(function (x) { return x.checked; }).map(function (x) { return x.value; });
  var on = fm.elements.retornoOn;
  if (on) d.retorno = { on: on.checked, data: fm.elements.retData.value, hora: fm.elements.retHora.value, motivo: fm.elements.retMotivo.value.trim() };
}
async function aposSalvarVisita(visitaId, doc, d) {
  var msgs = [];
  var ids = (d.agConcluir || []).slice();
  for (var i = 0; i < ids.length; i++) {
    var a = S.agenda.get(ids[i]); if (!a || a.situacao !== 'Agendado') continue;
    var ok = doc.situacao === 'Visita realizada';
    await mudarSituacaoAg(a, ok ? 'Concluído' : 'Não realizado', { visitaId: visitaId }, ok ? 'Concluído com a visita registrada' : 'Não realizado: ' + doc.situacao);
    msgs.push(ok ? 'compromisso concluído na agenda' : 'compromisso marcado como não realizado');
  }
  if (d.retorno && d.retorno.on) {
    if (!d.retorno.data) throw { code: 'retorno_sem_data' };
    var pe = (doc.pessoaIds || [])[0] && S.pessoas.get(doc.pessoaIds[0]), f = S.familias.get(doc.familiaId);
    var ret = { categoria: 'retorno', titulo: 'Retorno — ' + (pe ? pe.nome : (f ? f.codigo : '')), pessoaId: pe ? pe.id : '', pessoaIds: doc.pessoaIds || [], familiaId: doc.familiaId, linha: (doc.linhas && doc.linhas.length === 1) ? doc.linhas[0] : '',
      data: d.retorno.data, hora: d.retorno.hora || '', endereco: f ? enderecoCompletoTxt(f, true) : '', motivo: d.retorno.motivo || '', observacoes: '', situacao: 'Agendado', origemVisitaId: visitaId,
      acsId: S.me || null, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
    if (doc.demo) ret.demo = true;
    comHistorico(ret, null, 'Agendou retorno a partir da visita', []);
    await gravar('agenda', novoId('a'), ret);
    msgs.push('retorno agendado para ' + fmtData(ret.data));
  }
  return msgs;
}

// ---------- painel: MINHA ROTINA DE HOJE ----------
function cardRotinaHoje() {
  var hoje = hojeISO(), l = agTodos(), pr = pendencias();
  var doDia = l.filter(function (a) { return a.data === hoje && AG.ativo(a); });
  var visitas = doDia.filter(function (a) { return a.situacao === 'Agendado' && AG.ehVisita(a.categoria); }).length;
  var retornos = doDia.filter(function (a) { return a.situacao === 'Agendado' && a.categoria === 'retorno'; }).length;
  var atencao = pr.abertas.filter(function (p) { return p.nivel === 'alta' || p.atrasada; }).length;
  var atualizar = pr.abertas.filter(function (p) { return p.tipo === 'cad_desatualizado'; }).length;
  var h = '<div class="card rotina"><h2>' + ico('agenda', 'width="20" height="20"') + ' MINHA ROTINA DE HOJE <span class="contagem" style="font-weight:500;margin-left:auto">' + fmtData(hoje) + '</span></h2><div class="grid g3">' +
    tile(visitas, 'Visitas previstas', null, 'data-act="rotinaAgenda" data-a="hoje"') + tile(retornos, 'Retornos', null, 'data-act="rotinaAgenda" data-a="hoje"') +
    tile('<span style="color:' + (atencao ? 'var(--vermelho)' : 'inherit') + '">' + atencao + '</span>', 'Pendências que exigem atenção', 'alta prioridade ou atrasadas', 'data-act="pendAbrirCard" data-c="urgentes"') +
    tile(doDia.length, 'Compromissos do dia', null, 'data-act="rotinaAgenda" data-a="hoje"') + tile(atualizar, 'Cadastros p/ atualizar', null, 'data-act="alerta" data-k="desatualizados"') + '</div>';
  // prioridades: atrasados, agenda de hoje por horário, pendências de prioridade alta
  var prio = [];
  l.filter(function (a) { return a.situacao === 'Agendado' && a.data < hoje; }).sort(AG.ord).forEach(function (a) { prio.push({ n: 'alta', t: 'Atrasado: ' + a.titulo, s: fmtData(a.data) + (a.hora ? ' ' + a.hora : ''), act: 'data-act="agendaEditar" data-id="' + a.id + '"' }); });
  doDia.filter(function (a) { return a.situacao === 'Agendado'; }).sort(AG.ord).forEach(function (a) { prio.push({ n: 'info', t: (a.hora || 'Sem horário') + ' — ' + a.titulo, s: AG.rotCat(a.categoria), act: 'data-act="agendaEditar" data-id="' + a.id + '"' }); });
  pr.abertas.filter(function (p) { return p.nivel === 'alta' && !p.agendaId; }).forEach(function (p) { var pe = p.pessoaId && S.pessoas.get(p.pessoaId); prio.push({ n: 'alta', t: p.titulo, s: pe ? pe.nome : '', act: 'data-act="pendAbrirCard" data-c="urgentes"' }); });
  if (prio.length) h += '<h3 class="subtit">Prioridades</h3><div class="lista">' + prio.slice(0, 5).map(function (x) { return '<button class="prio ' + x.n + '" ' + x.act + '><span class="nivel ' + x.n + '"><span class="ic">' + NIVEL_IC[x.n] + '</span></span><span class="t">' + esc(x.t) + (x.s ? '<small>' + esc(x.s) + '</small>' : '') + '</span></button>'; }).join('') + '</div>' + (prio.length > 5 ? '<p class="contagem">e mais ' + (prio.length - 5) + ' na agenda e na central de pendências.</p>' : '');
  else h += '<p class="contagem mt">Nenhum compromisso ou pendência urgente para hoje.</p>';
  h += '<div class="atalhos mt">' +
    '<button class="atalho" data-act="abrirBusca">' + ico('busca') + 'Pesquisar morador</button>' +
    '<button class="atalho" data-act="novaVisita">' + ico('visita') + 'Registrar visita</button>' +
    '<button class="atalho" data-act="agendarRetorno">' + ico('agenda') + 'Agendar retorno</button>' +
    '<button class="atalho" data-act="verPendencias">' + ico('alerta') + 'Consultar pendências</button>' +
    '<button class="atalho" data-act="rotinaAgenda" data-a="hoje">' + ico('agenda') + 'Abrir agenda</button>' +
    '<button class="atalho" data-act="maisAtalhos">' + ico('add') + 'Novo cadastro</button></div>';
  return h + '</div>';
}

// ---------- ações ----------
Object.assign(ACOES_VIS, {
  agAba: function (b) { S.ag.aba = b.getAttribute('data-a'); render(); },
  agPreset: function (b) { S.ag.preset = b.getAttribute('data-p'); render(); },
  agSemana: function (b) { var d = +b.getAttribute('data-d'); S.ag.semanaRef = d ? P.addDias(S.ag.semanaRef, d) : hojeISO(); render(); },
  agMes: function (b) { var d = +b.getAttribute('data-d'); S.ag.mesRef = d > 0 ? P.mesSeguinte(S.ag.mesRef) : P.mesAnterior(S.ag.mesRef); render(); },
  agDia: function (b) { S.ag.diaSel = b.getAttribute('data-d'); if (S.ag.diaSel.slice(0, 7) !== S.ag.mesRef) S.ag.mesRef = S.ag.diaSel.slice(0, 7); render(); },
  rotinaAgenda: function (b) { S.ag.aba = b.getAttribute('data-a') || 'hoje'; irPara('agenda'); },
  agendaNovo: function () { abrirAgendaForm({ categoria: 'visita' }); },
  agendarRetorno: function (b) { abrirAgendaForm({ categoria: 'retorno', pessoaId: b.getAttribute('data-p') || '', familiaId: b.getAttribute('data-f') || '', motivo: b.getAttribute('data-motivo') || '', origemVisitaId: b.getAttribute('data-v') || null }); },
  agendaEditar: function (b) { fecharModal(); abrirSub({ tipo: 'agendaForm', id: b.getAttribute('data-id') }); },
  agendaConcluir: async function (b) {
    var a = S.agenda.get(b.getAttribute('data-id')); if (!a) return;
    if (AG.ehVisita(a.categoria)) { abrirSub({ tipo: 'visitaForm', id: null, familiaId: a.familiaId, pessoaId: a.pessoaId || null, agendaId: a.id }); return; }
    try { await mudarSituacaoAg(a, 'Concluído'); toast('Atividade concluída.', 'ok'); } catch (e) { toast(msgErro(e), 'erro'); }
  },
  agendaNaoRealizado: function (b) {
    var a = S.agenda.get(b.getAttribute('data-id')); if (!a) return;
    modalTexto('Não realizado', 'Informe o motivo (opcional). Para visitas, a pendência "reagendar" é criada até você reagendar ou registrar a visita.', 'Confirmar', false, async function (t) {
      try { await mudarSituacaoAg(a, 'Não realizado', t ? { observacoes: (a.observacoes ? a.observacoes + '\n' : '') + 'Não realizado: ' + t } : {}); fecharModal(); toast('Marcado como não realizado.', 'ok'); } catch (e) { toast(msgErro(e), 'erro'); }
    });
  },
  agendaCancelar: function (b) {
    var a = S.agenda.get(b.getAttribute('data-id')); if (!a) return;
    modalTexto('Cancelar compromisso', 'O compromisso fica registrado como cancelado (não é apagado). Informe o motivo.', 'Cancelar compromisso', true, async function (t) {
      if (t.length < 3) { toast('Informe o motivo.', 'erro'); return; }
      try { await mudarSituacaoAg(a, 'Cancelado', { observacoes: (a.observacoes ? a.observacoes + '\n' : '') + 'Cancelado: ' + t }); fecharModal(); toast('Compromisso cancelado.', 'ok'); } catch (e) { toast(msgErro(e), 'erro'); }
    });
  },
  agendaReagendar: function (b) {
    var a = S.agenda.get(b.getAttribute('data-id')); if (!a) return;
    S._reag = a;
    modal('<h3>Reagendar</h3><p class="contagem">' + esc(a.titulo) + ' — previsto para ' + fmtData(a.data) + (a.hora ? ' às ' + esc(a.hora) : '') + '. O compromisso atual fica como "Reagendado", ligado ao novo.</p><form id="formReagendar"><div class="grid g2">' +
      campoTxt('Nova data', 'data', P.addDias(hojeISO(), 1), 'type="date" required min="' + hojeISO() + '"') + campoTxt('Horário', 'hora', a.hora || '', 'type="time"') + '</div><div class="campo"><label class="rot">Motivo (opcional)</label><textarea name="motivo"></textarea></div>' +
      '<div class="btns"><button type="button" class="btn sec" data-act="fecharModal">Voltar</button><button type="submit" class="btn">Reagendar</button></div></form>');
  },
  lembretesAbrir: function () { abrirLembretes(); },
  lembreteDispensar: function (b) { var d = lerDispensados(); d[b.getAttribute('data-k')] = Date.now(); try { localStorage.setItem('acs_lembretes_dispensados', JSON.stringify(d)); } catch (e) { } atualizarSino(); abrirLembretes(); if (S.view === 'agenda') render(); },
  lembreteAbrirAgenda: function () { fecharModal(); S.ag.aba = 'hoje'; irPara('agenda'); },
  notifPermitir: function () {
    try { Notification.requestPermission().then(function (p) { toast(p === 'granted' ? 'Notificações ativadas. O texto é genérico, sem dados de saúde.' : 'Notificações não autorizadas neste navegador.', p === 'granted' ? 'ok' : 'erro'); render(); }).catch(function () { toast('Este ambiente não permite notificações; use os lembretes dentro do app.', 'erro'); }); }
    catch (e) { toast('Este ambiente não permite notificações; use os lembretes dentro do app.', 'erro'); }
  },
  maisAtalhos: function () { modal('<h3>Novo cadastro</h3><div class="lista mt"><button class="item" data-act="novaFamilia">' + ico('fam', 'width="22" height="22"') + '<div class="princ"><div class="nome">Nova família</div></div></button><button class="item" data-act="novaPessoaModal">' + ico('pessoa', 'width="22" height="22"') + '<div class="princ"><div class="nome">Nova pessoa</div></div></button></div><button class="btn sec mt" style="width:100%" data-act="fecharModal">Fechar</button>'); },
  novaPessoaModal: function () { fecharModal(); abrirSub({ tipo: 'pessoa', id: null }); }
});
document.addEventListener('submit', function (ev) {
  if (ev.target.id === 'formAgenda') { ev.preventDefault(); if (!somenteLeitura()) salvarAgenda(); }
});
document.addEventListener('submit', async function (ev) {
  if (ev.target.id !== 'formReagendar') return;
  var a = S._reag, E = ev.target.elements; if (!a) return;
  if (!E.data.value) return;
  var novo = Object.assign({}, a); delete novo.id; delete novo.visitaId; delete novo.reagendadoPara;
  Object.assign(novo, { data: E.data.value, hora: E.hora.value, situacao: 'Agendado', reagendadoDe: a.id, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString(), historico: [] });
  if (E.motivo.value.trim()) novo.observacoes = (a.observacoes ? a.observacoes + '\n' : '') + 'Reagendado: ' + E.motivo.value.trim();
  comHistorico(novo, null, 'Reagendou (de ' + fmtData(a.data) + ')', []);
  var nid = novoId('a');
  try { await gravar('agenda', nid, novo); await mudarSituacaoAg(a, 'Reagendado', { reagendadoPara: nid }, 'Reagendado para ' + fmtData(novo.data)); fecharModal(); toast('Reagendado para ' + fmtData(novo.data) + (novo.hora ? ' às ' + novo.hora : '') + '.', 'ok'); }
  catch (e) { toast(msgErro(e), 'erro'); }
});
document.addEventListener('change', function (ev) {
  var t = ev.target, k = t.getAttribute && t.getAttribute('data-agf');
  if (k) { S.ag[k] = t.value; var y = window.scrollY; render(); window.scrollTo(0, y); return; }
  if (t.closest && t.closest('#formAgenda')) {
    lerFormAgenda(); var d = S.rascunho.dados; S.rascunho.sujo = true;
    if (t.name === 'pessoa' && d.pessoaId && !d._pessoaInvalida) { var pe = S.pessoas.get(d.pessoaId); if (pe && pe.familiaId) { d.familiaId = pe.familiaId; var f = S.familias.get(pe.familiaId); if (f) d.endereco = enderecoCompletoTxt(f, true); } renderAdiado(); }
    else if (t.name === 'familiaId') { var f2 = S.familias.get(d.familiaId); d.endereco = f2 ? enderecoCompletoTxt(f2, true) : d.endereco; if (d.pessoaId && (S.pessoas.get(d.pessoaId) || {}).familiaId !== d.familiaId) d.pessoaId = ''; renderAdiado(); }
    else { var n = $('#naoSalvo'); if (n) n.hidden = false; }
  }
  if (t.closest && t.closest('#formVisita') && t.name === 'retornoOn') { var box = $('#formVisita .retornocampos'); if (box) box.hidden = !t.checked; }
});
document.addEventListener('input', function (ev) { if (ev.target.closest && ev.target.closest('#formAgenda')) { S.rascunho && (S.rascunho.sujo = true); var n = $('#naoSalvo'); if (n) n.hidden = false; } });

// ---------- configuração dos lembretes ----------
function configAgendaHtml() {
  var l = cfgLembretes(), suporta = typeof Notification !== 'undefined';
  return '<div class="card"><h2>Lembretes da agenda</h2><p class="contagem">Os lembretes aparecem dentro do aplicativo (sino no topo e na agenda).</p><div class="grid g2">' +
    '<label class="chk"><input type="checkbox" name="lemVespera"' + (l.vespera ? ' checked' : '') + '> No dia anterior</label>' +
    '<label class="chk"><input type="checkbox" name="lemManha"' + (l.manha ? ' checked' : '') + '> Na manhã do compromisso</label>' +
    campoTxt('Horário do lembrete da manhã', 'lemHoraManha', l.horaManha, 'type="time"') +
    '<label class="chk"><input type="checkbox" name="lemHorario"' + (l.horario ? ' checked' : '') + '> No horário agendado</label>' +
    '<div class="campo"><label class="rot">Antecedência do lembrete de horário</label>' + selectHtml('lemAntecedencia', [['0', 'No horário'], ['15', '15 minutos antes'], ['30', '30 minutos antes'], ['60', '1 hora antes']], String(l.antecedenciaMin), false) + '</div></div>' +
    (suporta && Notification.permission === 'default' ? '<button type="button" class="btn sec mt" data-act="notifPermitir">Permitir notificações do navegador</button><p class="contagem">Quando permitido, a notificação mostra só um texto genérico ("Você tem novos lembretes"), sem nomes nem dados de saúde.</p>'
      : suporta && Notification.permission === 'granted' ? '<p class="contagem mt">✓ Notificações do navegador ativas (texto genérico, sem dados de saúde).</p>' : '<p class="contagem mt">Notificações do navegador indisponíveis neste ambiente; os lembretes continuam dentro do app.</p>') + '</div>';
}
function lerConfigAgenda(E, c) {
  c.lembretes = { vespera: E.lemVespera.checked, manha: E.lemManha.checked, horaManha: E.lemHoraManha.value || '07:00', horario: E.lemHorario.checked, antecedenciaMin: +E.lemAntecedencia.value };
}

// ============================================================================
// IMPORTAÇÃO (VitaCare — Lista de Famílias)
// O arquivo é lido neste aparelho; só os registros importados vão para o banco da equipe.
// ============================================================================
var IMP = window.ACSImportacao;
S.imp = null;
function impNovo() { return { etapa: 'arquivo', regra: 'seq01', micro: null, porRua: {}, autorizado: false, erro: '' }; }
function abrirImportacao() { S.imp = impNovo(); abrirSub({ tipo: 'importar' }); }
function impExistentes() {
  var f = [], p = [];
  S.familias.forEach(function (x, id) { f.push(Object.assign({ id: id }, x)); });
  S.pessoas.forEach(function (x, id) { p.push(Object.assign({ id: id }, x)); });
  return { familias: f, pessoas: p };
}
function impProximoNumero() { return parseInt(proximoCodigo().slice(1), 10) || 1; }
function impPlanejar() {
  var I = S.imp;
  I.plano = IMP.planejar(I.lido, impExistentes(), {
    regraResponsavel: I.regra, microarea: I.micro != null ? I.micro : I.lido.meta.microarea, unidade: cfg().unidade || '', equipe: cfg().equipe || '',
    porRua: I.porRua, hoje: hojeISO(), novoId: novoId, proximoNumeroCodigo: impProximoNumero()
  });
}
async function impLerArquivo(arq) {
  var I = S.imp; I.erro = ''; I.nomeArq = arq.name; I.etapa = 'lendo'; render();
  try {
    if (arq.size > 15 * 1024 * 1024) throw new Error('Arquivo muito grande (limite de 15 MB).');
    var buf = await arq.arrayBuffer();
    await carregarLib('xlsx');
    var X = window.XLSX, wb;
    if (/\.csv$/i.test(arq.name) || /text/.test(arq.type)) {
      var t = new TextDecoder('utf-8').decode(buf);
      if (t.indexOf('�') >= 0) t = new TextDecoder('windows-1252').decode(buf);
      wb = X.read(t, { type: 'string', raw: true });
    } else wb = X.read(new Uint8Array(buf), { type: 'array' });
    var ws = wb.Sheets[wb.SheetNames[0]];
    var linhas = X.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false, blankrows: false });
    var lido = IMP.ler(linhas);
    if (lido.erro) throw new Error(lido.erro);
    if (!lido.familias.length) throw new Error('Nenhuma família encontrada no arquivo.');
    I.lido = lido; I.micro = lido.meta.microarea || ''; I.etapa = 'previa';
    impPlanejar();
  } catch (e) {
    I.etapa = 'arquivo'; I.erro = (e && (e.message || e.code)) || 'Não foi possível ler o arquivo.';
  }
  render(); window.scrollTo(0, 0);
}

function viewImportar() {
  var I = S.imp || (S.imp = impNovo());
  var h = '';
  if (I.etapa === 'arquivo' || I.etapa === 'lendo') {
    h += '<div class="card"><h2>Importar do VitaCare</h2><p class="contagem">Aceita a <b>Lista de Famílias</b> exportada do VitaCare, em .xls, .xlsx ou .csv. O arquivo é lido neste aparelho. Antes de gravar, você vê tudo o que vai ser criado ou atualizado.</p>' +
      (I.erro ? '<div class="aviso vermelho">' + esc(I.erro) + '</div>' : '') +
      (I.etapa === 'lendo' ? '<div class="carregando" style="padding:24px 0"><div><div class="spin" style="margin:0 auto 10px"></div>Lendo ' + esc(I.nomeArq) + '…</div></div>'
        : '<label class="btn" style="cursor:pointer">' + ico('add', 'width="18" height="18"') + 'Escolher arquivo<input type="file" id="impArq" accept=".xls,.xlsx,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" hidden></label>') +
      '</div><div class="card"><h2>Como funciona</h2><ul class="contagem" style="padding-left:18px;margin:0">' +
      '<li>Famílias e moradores são reconhecidos pelo código do VitaCare. Importar de novo <b>não duplica</b>: só cria quem é novo e atualiza o que mudou no VitaCare.</li>' +
      '<li>Correções feitas no app (nome, endereço, situação) são preservadas. Nada é apagado.</li>' +
      '<li>Óbito e Mudou-se do VitaCare passam para a situação do morador.</li>' +
      '<li>A Lista de Famílias não traz nascimento, sexo, CNS, CPF nem telefone: esses campos ficam pendentes na completude.</li></ul></div>';
    return h;
  }
  if (I.etapa === 'gravando') {
    var pr = I.prog || { feitos: 0, total: 1 }, pct = Math.round(100 * pr.feitos / Math.max(1, pr.total));
    return '<div class="card"><h2>Importando…</h2><p class="contagem">' + pr.feitos + ' de ' + pr.total + ' registros' + (pr.msg ? ' · ' + esc(pr.msg) : '') + '</p><div class="progress azul"><i style="width:' + pct + '%"></i></div><p class="contagem mt">Mantenha o app aberto até terminar.</p></div>';
  }
  if (I.etapa === 'fim') {
    var r = I.resultado;
    h += '<div class="card"><h2>Importação concluída</h2><div class="aviso">' + esc(r.texto) + '</div>' +
      (r.pendentes ? '<div class="aviso amarelo">' + plural(r.pendentes, 'registro ficou', 'registros ficaram') + ' guardado' + (r.pendentes === 1 ? '' : 's') + ' neste aparelho e ' + (r.pendentes === 1 ? 'será enviado' : 'serão enviados') + ' quando houver internet.</div>' : '') +
      (r.recusadas ? '<div class="aviso vermelho">' + plural(r.recusadas, 'registro foi recusado', 'registros foram recusados') + ' pelo servidor. Veja em Minha conta → Conflitos.</div>' : '') +
      '<div class="btns"><button class="btn" data-nav="familias">Ver famílias</button><button class="btn sec" data-nav="completude">Ver completude</button><button class="btn sec" data-act="impOutro">Importar outro arquivo</button></div></div>';
    return h;
  }
  // prévia
  var L = I.lido, P = I.plano, R = P.resumo, nPes = L.familias.reduce(function (a, f) { return a + f.pessoas.length; }, 0);
  h += '<div class="card"><h2>' + esc(I.nomeArq) + '</h2><div class="chips"><span class="chip azul">' + esc(L.rotulo) + '</span>' + (L.meta.area ? '<span class="chip">Área ' + esc(L.meta.area) + '</span>' : '') + (L.meta.microarea ? '<span class="chip">Microárea ' + esc(L.meta.microarea) + '</span>' : '') + (L.meta.extraido ? '<span class="chip">Extraído em ' + fmtData(L.meta.extraido) + '</span>' : '') + '</div>' +
    '<p class="contagem mt">' + plural(L.familias.length, 'família', 'famílias') + ' e ' + plural(nPes, 'morador', 'moradores') + ' no arquivo' +
    (Object.keys(R.situacoes).length ? ' · ' + Object.keys(R.situacoes).map(function (k) { return R.situacoes[k] + ' ' + k.toLowerCase(); }).join(', ') : '') + '.</p></div>';
  h += '<div class="card"><h2>O que vai acontecer</h2><div class="tabwrap"><table class="tab"><thead><tr><th></th><th>Novas</th><th>Atualizadas</th><th>Sem mudança</th></tr></thead><tbody>' +
    '<tr><td>Famílias</td><td><b>' + R.familias.criar + '</b></td><td>' + R.familias.atualizar + '</td><td>' + R.familias.manter + '</td></tr>' +
    '<tr><td>Moradores</td><td><b>' + R.pessoas.criar + '</b></td><td>' + R.pessoas.atualizar + '</td><td>' + R.pessoas.manter + '</td></tr></tbody></table></div>' +
    (R.semResponsavel ? '<p class="contagem">' + plural(R.semResponsavel, 'família ficará', 'famílias ficarão') + ' sem responsável (nenhum morador ativo).</p>' : '') +
    (P.foraDoArquivo.familias || P.foraDoArquivo.pessoas ? '<p class="contagem">Já no app e fora deste arquivo: ' + plural(P.foraDoArquivo.familias, 'família', 'famílias') + ' e ' + plural(P.foraDoArquivo.pessoas, 'morador', 'moradores') + '. Nada será apagado; confira se mudaram de área.</p>' : '') + '</div>';
  var mud = P.familias.filter(function (x) { return x.acao === 'atualizar'; }).concat(P.pessoas.filter(function (x) { return x.acao === 'atualizar'; }));
  if (mud.length) {
    h += '<div class="card"><h2>Atualizações</h2><ul class="hist">' + mud.slice(0, 15).map(function (x) {
      var nome = x.doc.nome || ('Família ' + x.doc.codigo);
      return '<li><b>' + esc(nome) + '</b>: ' + esc(x.mudou.map(function (k) { return { endereco: 'endereço', numero: 'número', complemento: 'complemento', bairro: 'bairro', cep: 'CEP', responsavelId: 'responsável', nome: 'nome', situacao: 'situação → ' + x.doc.situacao, familiaId: 'família' }[k] || k; }).join(', ')) + '</li>';
    }).join('') + '</ul>' + (mud.length > 15 ? '<p class="contagem">e mais ' + (mud.length - 15) + '.</p>' : '') + '</div>';
  }
  h += '<div class="card"><h2>Opções</h2><div class="grid g2">' + campoTxt('Microárea das famílias novas', 'impMicro', I.micro, 'data-imp="micro"') + '</div>' +
    '<label class="rot">Responsável familiar</label><div class="seg">' + [['seq01', 'Morador de final 01 no VitaCare'], ['primeiro', 'Primeiro morador listado']].map(function (o) { return '<label><input type="radio" name="impRegra" value="' + o[0] + '"' + (I.regra === o[0] ? ' checked' : '') + '><span>' + o[1] + '</span></label>'; }).join('') + '</div>' +
    '<p class="contagem mt">Moradores com óbito ou mudança não são escolhidos como responsáveis. Dá para trocar o responsável depois, na família.</p></div>';
  var ruas = IMP.ruas(L);
  if (ruas.length && ruas.length <= 60) {
    h += '<div class="card"><h2>Bairro e CEP por rua (opcional)</h2><p class="contagem">O VitaCare não envia bairro nem CEP. Preencha uma vez por rua para completar as famílias. Só preenche quem está sem bairro ou CEP.</p>' +
      ruas.map(function (r, i) { var v = I.porRua[r.rua] || {}; return '<div class="imp-rua"><div class="nome"><b>' + esc(r.rua) + '</b> <span class="contagem">' + plural(r.familias, 'família', 'famílias') + '</span></div><div class="grid g2"><input type="text" placeholder="Bairro" value="' + esc(v.bairro || '') + '" data-imp="bairro" data-i="' + i + '"><input type="text" inputmode="numeric" placeholder="CEP" value="' + esc(v.cep || '') + '" data-imp="cep" data-i="' + i + '"></div></div>'; }).join('') + '</div>';
  }
  if (L.avisos.length || L.erros.length) {
    h += '<div class="card"><h2>Avisos do arquivo</h2><ul class="hist">' + L.erros.concat(L.avisos).slice(0, 12).map(function (a) { return '<li>Linha ' + a.linha + ': ' + esc(a.msg) + '</li>'; }).join('') + '</ul>' + (L.erros.length + L.avisos.length > 12 ? '<p class="contagem">e mais ' + (L.erros.length + L.avisos.length - 12) + '.</p>' : '') + '</div>';
  }
  var n = R.familias.criar + R.familias.atualizar + R.pessoas.criar + R.pessoas.atualizar;
  h += '<div class="card"><label class="chk"><input type="checkbox" data-imp="autorizado"' + (I.autorizado ? ' checked' : '') + '> <span>Confirmo que tenho autorização institucional para registrar estes dados no ACS DIGITAL.</span></label>' +
    '<div class="btns mt"><button class="btn sec" data-act="impCancelar">Cancelar</button><button class="btn" data-act="impConfirmar"' + (n && I.autorizado ? '' : ' disabled') + '>' + (n ? 'Importar ' + plural(n, 'registro', 'registros') : 'Nada a importar') + '</button></div></div>';
  return h;
}

async function impExecutar() {
  var I = S.imp, P = I.plano, agora = new Date().toISOString(), ops = [];
  var ant = function (m, id) { return m.get(id) || null; };
  P.familias.forEach(function (x) {
    if (x.acao === 'manter') return;
    var d = clone(x.doc); delete d.id;
    d.atualizadoEm = agora; if (x.acao === 'criar') d.criadoEm = agora;
    comHistorico(d, ant(S.familias, x.id), x.acao === 'criar' ? 'Importou do VitaCare' : 'Atualizou pela importação do VitaCare', x.mudou);
    ops.push({ col: 'familias', id: x.id, dados: d });
  });
  P.pessoas.forEach(function (x) {
    if (x.acao === 'manter') return;
    var d = clone(x.doc); delete d.id;
    d.atualizadoEm = agora; if (x.acao === 'criar') d.criadoEm = agora;
    comHistorico(d, ant(S.pessoas, x.id), x.acao === 'criar' ? 'Importou do VitaCare' : 'Atualizou pela importação do VitaCare', x.mudou);
    ops.push({ col: 'pessoas', id: x.id, dados: d });
  });
  var R = P.resumo;
  ops.push({ col: 'importacoes', id: novoId('imp'), dados: { em: agora, por: S.me || null, arquivo: I.nomeArq, origem: 'VitaCare — Lista de Famílias', area: I.lido.meta.area, microarea: I.lido.meta.microarea, extraidoEm: I.lido.meta.extraido, resumo: R, regraResponsavel: I.regra } });
  I.etapa = 'gravando'; I.prog = { feitos: 0, total: ops.length }; render();
  var res = { total: ops.length, pendentes: 0, recusadas: 0 };
  try {
    if (S.db && S.db.lote) {
      var tmr = setInterval(function () { if (window.PROD) { I.prog.feitos = Math.max(0, ops.length - window.PROD.pendentes()); var el = $('.progress i'); if (el) { el.style.width = Math.round(100 * I.prog.feitos / ops.length) + '%'; el.closest('.card').querySelector('.contagem').textContent = I.prog.feitos + ' de ' + ops.length + ' registros'; } } }, 400);
      try { res = await S.db.lote(ops); } finally { clearInterval(tmr); }
    } else {
      for (var i = 0; i < ops.length; i++) {
        await gravar(ops[i].col, ops[i].id, ops[i].dados);
        I.prog.feitos = i + 1; if (i % 10 === 0 || i === ops.length - 1) render();
      }
    }
  } catch (e) {
    I.etapa = 'previa'; render(); toast(msgErro(e), 'erro'); return;
  }
  I.resultado = {
    texto: [R.familias.criar ? plural(R.familias.criar, 'família criada', 'famílias criadas') : '', R.familias.atualizar ? plural(R.familias.atualizar, 'família atualizada', 'famílias atualizadas') : '', R.pessoas.criar ? plural(R.pessoas.criar, 'morador criado', 'moradores criados') : '', R.pessoas.atualizar ? plural(R.pessoas.atualizar, 'morador atualizado', 'moradores atualizados') : ''].filter(Boolean).join(', ') + '.',
    pendentes: res.pendentes || 0, recusadas: res.recusadas || 0
  };
  I.etapa = 'fim'; render(); window.scrollTo(0, 0);
  toast('Importação concluída.', 'ok');
}

document.addEventListener('change', function (ev) {
  var t = ev.target; if (!S.imp) return;
  if (t.id === 'impArq' && t.files && t.files[0]) { impLerArquivo(t.files[0]); return; }
  var k = t.getAttribute && t.getAttribute('data-imp');
  if (t.name === 'impRegra') { S.imp.regra = t.value; impPlanejar(); render(); return; }
  if (!k) return;
  if (k === 'autorizado') { S.imp.autorizado = t.checked; var bt = $('[data-act=impConfirmar]'); if (bt && !/Nada/.test(bt.textContent)) bt.disabled = !t.checked; return; }
  // campos de texto: atualiza sem redesenhar a tela (não tira o foco do próximo campo)
  if (k === 'micro') S.imp.micro = t.value.trim();
  if (k === 'bairro' || k === 'cep') { var rua = IMP.ruas(S.imp.lido)[+t.getAttribute('data-i')].rua; S.imp.porRua[rua] = Object.assign({}, S.imp.porRua[rua], (function (o) { o[k] = t.value.trim(); return o; })({})); }
});
ACOES_VIS.importarAbrir = function () { abrirImportacao(); };
ACOES_VIS.impCancelar = function () { S.imp = null; voltar(); };
ACOES_VIS.impOutro = function () { S.imp = impNovo(); render(); };
ACOES_VIS.impConfirmar = function () {
  if (!S.imp || !S.imp.autorizado || somenteLeitura()) return;
  // lê os campos de texto ainda em edição e refaz o plano com os dados mais recentes
  $$('[data-imp=bairro],[data-imp=cep],[data-imp=micro]').forEach(function (t) { t.dispatchEvent(new Event('change', { bubbles: true })); });
  impPlanejar(); impExecutar();
};


// ============================================================================
// Eventos
// ============================================================================
document.addEventListener('click', function (ev) {
  var nav = ev.target.closest('[data-nav]');
  if (nav) { ev.preventDefault(); fecharModal(); irPara(nav.getAttribute('data-nav')); return; }
  var b = ev.target.closest('[data-act]'); if (!b) return;
  var a = b.getAttribute('data-act'), id = b.getAttribute('data-id');
  if (ACOES_VIS[a]) { ACOES_VIS[a](b, id, ev); return; }
  switch (a) {
    case 'fecharModal': fecharModal(); break;
    case 'descartar': fecharModal(); if (S.rascunho) S.rascunho.sujo = false; var f = S.aposDescartar; S.aposDescartar = null; if (f) f(); break;
    case 'confirmarSim': fecharModal(); var ac = S.confirmarAcao; S.confirmarAcao = null; if (ac) ac(); break;
    case 'navModal': fecharModal(); irPara(b.getAttribute('data-v')); break;
    case 'voltar': voltar(); break;
    case 'novaFamilia': fecharModal(); abrirSub({ tipo: 'familiaForm', id: null }); break;
    case 'editarFamilia': abrirSub({ tipo: 'familiaForm', id: id }); break;
    case 'abrirFamilia': abrirSub({ tipo: 'familia', id: id }); break;
    case 'novaPessoa': abrirSub({ tipo: 'pessoa', id: null }); break;
    case 'novaPessoaFam': abrirSub({ tipo: 'pessoa', id: null, familiaId: id }); break;
    case 'abrirPessoa': abrirSub({ tipo: 'pessoa', id: id }); break;
    case 'novaVisita': abrirSub({ tipo: 'visitaForm', id: null }); break;
    case 'novaVisitaFam': abrirSub({ tipo: 'visitaForm', id: null, familiaId: id }); break;
    case 'novaVisitaPessoa': var pz = S.pessoas.get(id); abrirSub({ tipo: 'visitaForm', id: null, familiaId: pz && pz.familiaId, pessoaId: id }); break;
    case 'editarVisita': abrirSub({ tipo: 'visitaForm', id: id }); break;
    case 'excluirVisita': confirmar('Excluir visita?', 'O registro será removido definitivamente.', 'Excluir', async function () { try { await apagar('visitas', id); S.rascunho = null; toast('Visita excluída.', 'ok'); voltar(); } catch (e) { toast(msgErro(e), 'erro'); } }); break;
    case 'marcarTodos': $$('#formVisita input[name=pessoa]').forEach(function (x) { x.checked = true; }); marcarSujo(); break;
    case 'arquivarFamilia': confirmar('Arquivar cadastro da família?', 'A família deixa de aparecer nas listas ativas e nos indicadores. Os dados e o histórico são mantidos e o cadastro pode ser reativado.', 'Arquivar', function () { alterarSituacaoFamilia(id, 'Arquivada'); }); break;
    case 'reativarFamilia': alterarSituacaoFamilia(id, 'Ativa'); break;
    case 'irCampo': irParaCampo(+b.getAttribute('data-n')); break;
    case 'alerta':
      var al = alertas().filter(function (x) { return x.chave === b.getAttribute('data-k'); })[0];
      if (al) abrirSub({ tipo: 'lista', titulo: al.titulo, desc: al.desc, ids: al.ids, tipoIds: al.tipo });
      break;
    case 'abrirAlertaFamAcomp':
      var D = derivados(); abrirSub({ tipo: 'lista', titulo: 'Famílias acompanhadas', desc: 'Com visita realizada nos últimos ' + prazo('familia') + ' dias', ids: D.famAtivas.filter(function (f) { return !semVisita(f.id, prazo('familia'), D.ultF); }).map(function (f) { return f.id; }), tipoIds: 'familias' });
      break;
    case 'verPendencias': S.pend.card = ''; S.pend.cat = ''; irPara('pendencias'); break;
    case 'agendaInfo': modal('<h3>Agenda</h3><p>A agenda inteligente faz parte da próxima etapa (Rotina do ACS). Por enquanto, use os <b>alertas do painel</b> para ver quem está sem visita no prazo configurado.</p><button class="btn sec mt" style="width:100%" data-act="fecharModal">Entendi</button>'); break;
    case 'compFiltro':
      var c = b.getAttribute('data-c');
      if (c === 'incompletos') { var D2 = derivados(); abrirSub({ tipo: 'lista', titulo: 'Cadastros incompletos', desc: 'Amarelos e vermelhos', ids: D2.ativos.filter(function (p) { var r = D2.comp.get(p.id); return r.faixa && r.cor !== 'verde'; }).map(function (p) { return p.id; }), tipoIds: 'pessoas' }); }
      else { S.filtros.completude = { cor: c }; irPara('completude'); }
      break;
    case 'compCor': (S.filtros.completude || (S.filtros.completude = {})).cor = b.getAttribute('data-c'); render(); break;
    case 'grupo': S.filtros.pessoas = { grupo: b.getAttribute('data-g'), sit: 'Ativo' }; irPara('pessoas'); break;
    case 'exportar': exportar(b.getAttribute('data-t')); break;
    case 'carregarDemo': b.disabled = true; carregarDemo(); break;
    case 'removerDemo': confirmar('Remover base fictícia?', 'Todos os registros marcados como fictícios serão apagados. Cadastros reais não são afetados.', 'Remover', removerDemo); break;
  }
});
$('#btnVoltar').addEventListener('click', voltar);
$('#btnLembretes').addEventListener('click', function () { abrirLembretes(); });
$('#btnBusca').addEventListener('click', function () { guardarAlteracoes(function () { irParaBusca(S.busca.q); }); });
document.addEventListener('toggle', function (ev) {
  if (ev.target && ev.target.id === 'detPend') { S.pendAberto = ev.target.open; var sm = ev.target.querySelector('summary'); if (sm) sm.textContent = sm.textContent.replace(/^(Ver|Ocultar)/, ev.target.open ? 'Ocultar' : 'Ver'); }
}, true);
$('#modal').addEventListener('click', function (e) { if (e.target.id === 'modal') fecharModal(); });

var tmrBusca;
document.addEventListener('input', function (ev) {
  var t = ev.target;
  if (t.hasAttribute && t.hasAttribute('data-filtro')) {
    var f = S.filtros[S.view] || (S.filtros[S.view] = {}); f[t.getAttribute('data-filtro')] = t.value;
    if (t.type === 'search') { clearTimeout(tmrBusca); tmrBusca = setTimeout(function () { var pos = t.selectionStart; render(); var n = $('[data-filtro="' + t.getAttribute('data-filtro') + '"]'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) { } } }, 180); }
    else render();
    return;
  }
  if (t.closest('#formPessoa')) {
    if (t.name === 'cep' || t.name === 'fam_cep') { var dg = maskDig(t.value, 8); t.value = dg.length > 5 ? dg.slice(0, 5) + '-' + dg.slice(5) : dg; }
    if (t.name === 'cuidador_sel') { var cn = $('#formPessoa input[name=cuidador_nome]'); cn.hidden = t.value !== '__outro'; }
    marcarSujo(); atualizarPainelCompletude();
  } else if (t.closest('#formConfig')) {
    S.configSujo = true;
  } else if (t.closest('#formFamilia') || t.closest('#formVisita')) {
    if (t.name === 'cep') { var dg2 = maskDig(t.value, 8); t.value = dg2.length > 5 ? dg2.slice(0, 5) + '-' + dg2.slice(5) : dg2; }
    marcarSujo();
  }
});
document.addEventListener('change', function (ev) {
  var t = ev.target;
  if (t.closest('#formPessoa')) {
    if (t.name === 'familiaId') {
      lerFormPessoa();
      var R = S.rascunho; R.familia = t.value && S.familias.get(t.value) ? clone(S.familias.get(t.value)) : {};
      R.pessoa.cuidador = null; R.sujo = true;
      var y = window.scrollY; render(); window.scrollTo(0, y); return;
    }
    if (t.name === 'cuidador_sel') { $('#formPessoa input[name=cuidador_nome]').hidden = t.value !== '__outro'; }
    marcarSujo(); atualizarPainelCompletude();
  }
  if (t.closest('#formVisita') && t.name === 'familiaId') { lerFormVisita(); S.rascunho.dados.pessoaIds = []; S.rascunho.sujo = true; render(); return; }
  if (t.closest('#formVisita') || t.closest('#formFamilia')) marcarSujo();
});
document.addEventListener('submit', function (ev) {
  ev.preventDefault();
  var id = ev.target.id;
  if (somenteLeitura()) { toast('Sem permissão para salvar.', 'erro'); return; }
  var btn = ev.target.querySelector('button[type=submit]'); if (btn) { btn.disabled = true; setTimeout(function () { btn.disabled = false; }, 1500); }
  if (id === 'formPessoa') salvarPessoa();
  else if (id === 'formFamilia') salvarFamilia();
  else if (id === 'formVisita') salvarVisita();
  else if (id === 'formConfig') salvarConfig();
});
document.addEventListener('input', function (ev) {
  var t = ev.target;
  if (t.hasAttribute && t.hasAttribute('data-wa')) { var slot = t.parentNode.querySelector('.wa-slot'); if (slot) slot.innerHTML = iconeWhatsApp(t.value); }
});
function marcarSujo() { if (S.rascunho) { S.rascunho.sujo = true; var n = $('#naoSalvo'); if (n) n.hidden = false; } }

window.addEventListener('hashchange', function () {
  var h = location.hash.replace('#', '');
  if (h && h !== S.view && VIEWS.some(function (v) { return v[0] === h; })) irPara(h);
});

// ============================================================================
// Início
// ============================================================================
montarNavegacao();
var h0 = location.hash.replace('#', '');
if (VIEWS.some(function (v) { return v[0] === h0; })) S.view = h0;
marcarNav();
window.__acsAtualizarSync = atualizarSync;
iniciarBanco();
})();
