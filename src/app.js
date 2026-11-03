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
  if (S.offline) return setSync('erro', 'Sem conexão');
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
    if (e && e.code === 'invalid_argument') S.podeEscrever = false;
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
    var quem = r.por && r.por === S.me ? 'você' : (r.por ? 'outro usuário autorizado' : 'sistema');
    return '<li><b>' + esc(r.acao) + '</b> por ' + quem + ' · ' + fmtDataHora(r.em) + (r.campos && r.campos.length ? '<br>' + esc(r.campos.slice(0, 8).join(', ')) + (r.campos.length > 8 ? '…' : '') : '') + '</li>';
  }).join('') + '</ul>';
}
function somenteLeitura() { return !S.podeEscrever || S.semBanco; }
function avisoLeitura() {
  if (S.semBanco) return '<div class="aviso vermelho">O banco de dados não está disponível nesta visualização. Abra o ACS DIGITAL pelo link no claude.ai, com sua conta, para salvar e consultar cadastros.</div>';
  if (!S.podeEscrever) return '<div class="aviso amarelo">Seu perfil tem acesso somente para visualização. Alterações não podem ser salvas.</div>';
  if (S.erroBanco) return '<div class="aviso vermelho">Houve um erro ao ler o banco de dados (' + esc(S.erroBanco.code || 'erro') + '). Recarregue o aplicativo; se persistir, verifique seu acesso.</div>';
  if (S.offline) return '<div class="aviso amarelo">Sem conexão com o banco no momento. Os dados exibidos podem estar desatualizados; tente salvar quando a conexão voltar.</div>';
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
  var c = cfg(), ro = somenteLeitura();
  var h = '<form id="formConfig"><div class="card"><h2>Agente e área de atuação</h2><div class="grid g2">' +
    campoTxt('Nome do agente', 'agente', c.agente) + campoTxt('Município', 'municipio', c.municipio) + campoTxt('Unidade de saúde', 'unidade', c.unidade) + campoTxt('Equipe', 'equipe', c.equipe) +
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
  h += '<div class="card"><h2>Segurança e privacidade</h2><p class="contagem">Somente o proprietário e editores autorizados deste aplicativo leem e alteram os dados (regra de acesso aplicada no servidor). Cada alteração registra data, ação e campos alterados. Esta versão piloto não substitui o sistema oficial (e-SUS APS / prontuário) e não deve receber dados reais sem autorização institucional.</p></div>';
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

/*__VISITAS_UI__*/

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
iniciarBanco();
})();
