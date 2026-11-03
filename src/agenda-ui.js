
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
