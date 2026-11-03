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
  if (id === S.me) return cfg().agente || 'Você';
  return 'Outro usuário autorizado';
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
  rel.cab.push(['ACS', cfg().agente || nomeAcs(S.me)], ['Unidade / equipe', [cfg().unidade, cfg().equipe].filter(Boolean).join(' / ') || '—'], ['Município', cfg().municipio || '—'],
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
  xlsx: ['https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'],
  jspdf: ['https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'],
  autotable: ['https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js']
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
