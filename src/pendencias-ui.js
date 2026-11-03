
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
      '<div class="vmeta">' + (pe ? esc(pe.nome) + ' · ' : '') + (fa ? 'Família ' + esc(fa.codigo) + ' · ' : '') + 'Identificada em ' + fmtData(p.desde || PD.dataDe(p.criadoEm)) + ' · Resolvida em ' + fmtDataHora(p.resolvidaEm) + ' por ' + (p.resolvidaPor === S.me ? 'você' : 'outro usuário autorizado') + '</div>' +
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
