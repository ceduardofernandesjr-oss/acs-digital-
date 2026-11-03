/*
 * ACS DIGITAL — Motor da Agenda Inteligente (funções puras)
 * Navegador: window.ACSAgenda · Node: module.exports
 *
 * - O compromisso (agenda) e o registro efetivo da visita são coisas distintas:
 *   ao concluir, o compromisso guarda o id da visita (visitaId); nunca se cria
 *   uma segunda visita automaticamente.
 * - Proximidade geográfica só usa coordenadas VERIFICADAS. Sem elas, a ordem é por
 *   microárea, bairro, rua e número, sem afirmar precisão.
 */
(function (root) {
  'use strict';

  var CATEGORIAS = [['visita', 'Visita domiciliar'], ['retorno', 'Retorno'], ['acompanhamento', 'Acompanhamento de linha de cuidado'],
    ['administrativa', 'Atividade administrativa'], ['reuniao', 'Reunião'], ['acao_coletiva', 'Ação coletiva']];
  var SITUACOES = ['Agendado', 'Concluído', 'Não realizado', 'Reagendado', 'Cancelado'];
  var CAT_VISITA = ['visita', 'retorno', 'acompanhamento'];
  var LEMBRETES_PADRAO = { vespera: true, manha: true, horaManha: '07:00', horario: true, antecedenciaMin: 30 };

  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parse(s) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; }
  function addDias(s, n) { var d = parse(s); d.setDate(d.getDate() + n); return iso(d); }
  function min(h) { var m = /^(\d{1,2}):(\d{2})/.exec(h || ''); return m ? +m[1] * 60 + +m[2] : null; }
  function ehVisita(cat) { return CAT_VISITA.indexOf(cat) >= 0; }
  function rotCat(c) { var x = CATEGORIAS.filter(function (k) { return k[0] === c; })[0]; return x ? x[1] : c; }
  function ativo(a) { return a.situacao !== 'Cancelado' && a.situacao !== 'Reagendado'; }
  function ord(a, b) { return (a.data || '').localeCompare(b.data || '') || (a.hora || '99:99').localeCompare(b.hora || '99:99') || (a.titulo || '').localeCompare(b.titulo || ''); }

  function inicioSemana(s) { var d = parse(s), dw = (d.getDay() + 6) % 7; d.setDate(d.getDate() - dw); return iso(d); }
  function semana(ref) { var s = inicioSemana(ref), l = []; for (var i = 0; i < 7; i++) l.push(addDias(s, i)); return l; }
  function gradeMes(mes) { // semanas (seg..dom) que cobrem o mês; dias fora do mês vêm marcados
    var ini = inicioSemana(mes + '-01'), sem = [], d = ini;
    do { var w = []; for (var i = 0; i < 7; i++) { w.push({ data: d, doMes: d.slice(0, 7) === mes }); d = addDias(d, 1); } sem.push(w); } while (d.slice(0, 7) === mes);
    return sem;
  }

  // ---------- indicadores ----------
  function indicadores(itens, de, ate, hoje) {
    var r = { hoje: 0, visitasProgramadas: 0, retornos: 0, concluidas: 0, pendentes: 0, atrasados: 0 };
    itens.forEach(function (a) {
      if (!a.data) return;
      if (a.situacao === 'Agendado' && a.data < hoje) r.atrasados++;          // todos os vencidos ainda agendados
      if (a.data === hoje && ativo(a)) r.hoje++;
      if (a.data < de || a.data > ate) return;
      if (a.situacao === 'Agendado') {
        r.pendentes++;
        if (a.data >= hoje && ehVisita(a.categoria)) r.visitasProgramadas++;
        if (a.data >= hoje && a.categoria === 'retorno') r.retornos++;
      }
      if (a.situacao === 'Concluído') r.concluidas++;
    });
    return r;
  }

  // ---------- lembretes (dentro do app) ----------
  // agora: { data:'aaaa-mm-dd', hora:'hh:mm' }
  function lembretes(itens, agora, cfg) {
    cfg = Object.assign({}, LEMBRETES_PADRAO, cfg || {});
    var amanha = addDias(agora.data, 1), mAgora = min(agora.hora), out = [];
    itens.forEach(function (a) {
      if (a.situacao !== 'Agendado' || !a.data) return;
      var tipo = null;
      if (a.data < agora.data) tipo = 'atrasado';
      else if (a.data === agora.data) {
        var mh = min(a.hora);
        if (cfg.horario && mh != null && mAgora >= mh - (+cfg.antecedenciaMin || 0) && mAgora <= mh + 60) tipo = 'horario';
        else if (cfg.manha && mAgora >= (min(cfg.horaManha) || 0)) tipo = 'manha';
      } else if (a.data === amanha && cfg.vespera) tipo = 'vespera';
      if (tipo) out.push({ item: a, tipo: tipo, chave: a.id + ':' + tipo + ':' + a.data });
    });
    var pri = { horario: 0, atrasado: 1, manha: 2, vespera: 3 };
    out.sort(function (x, y) { return (pri[x.tipo] - pri[y.tipo]) || ord(x.item, y.item); });
    return out;
  }

  // ---------- proximidade ----------
  function haversineKm(a, b) {
    var R = 6371, rad = Math.PI / 180, dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  // coordDe(item) -> {lat,lng} somente se verificadas; enderecoDe(item) -> {micro,bairro,endereco,numero}
  function ordenarProximidade(itens, coordDe, enderecoDe) {
    var com = [], sem = [];
    itens.forEach(function (a) { var c = coordDe(a); if (c) com.push({ a: a, c: c }); else sem.push(a); });
    var ordem = [], totalKm = 0;
    if (com.length) {
      com.sort(function (x, y) { return ord(x.a, y.a); });
      var atual = com.shift(); ordem.push(atual.a);
      while (com.length) {
        var mi = 0, md = Infinity;
        for (var i = 0; i < com.length; i++) { var d = haversineKm(atual.c, com[i].c); if (d < md) { md = d; mi = i; } }
        totalKm += md; atual = com.splice(mi, 1)[0]; ordem.push(atual.a);
      }
    }
    var nComCoord = ordem.length;
    sem.sort(function (x, y) {
      var ex = enderecoDe(x) || {}, ey = enderecoDe(y) || {};
      return String(ex.micro || '~').localeCompare(String(ey.micro || '~')) || String(ex.bairro || '~').localeCompare(String(ey.bairro || '~')) ||
        String(ex.endereco || '~').localeCompare(String(ey.endereco || '~')) || ((parseInt(ex.numero, 10) || 99999) - (parseInt(ey.numero, 10) || 99999)) || ord(x, y);
    });
    return { ordem: ordem.concat(sem), comCoord: nComCoord, semCoord: sem, totalKm: totalKm };
  }
  function rotaMaps(pontos) { // pontos: [{lat,lng}] na ordem; até 10 pontos
    if (!pontos || pontos.length < 2) return null;
    var p = pontos.slice(0, 10), f = function (x) { return x.lat + ',' + x.lng; };
    var url = 'https://www.google.com/maps/dir/?api=1&origin=' + encodeURIComponent(f(p[0])) + '&destination=' + encodeURIComponent(f(p[p.length - 1]));
    if (p.length > 2) url += '&waypoints=' + encodeURIComponent(p.slice(1, -1).map(f).join('|'));
    return url;
  }

  // ---------- agrupamento ----------
  // por: horario | data | microarea | linha | endereco ; ctx: { micro(a), linhas(a)->[rotulos], endereco(a)->texto }
  function agrupar(itens, por, ctx) {
    var l = itens.slice().sort(ord);
    if (por === 'horario' || !por) return [{ rotulo: null, itens: l }];
    var g = {}, ordem = [];
    l.forEach(function (a) {
      var chaves = por === 'data' ? [a.data] : por === 'microarea' ? [ctx.micro(a) ? 'Microárea ' + ctx.micro(a) : 'Sem microárea'] :
        por === 'linha' ? (ctx.linhas(a).length ? ctx.linhas(a) : ['Sem linha de cuidado']) : [ctx.endereco(a) || 'Sem endereço'];
      chaves.forEach(function (k) { if (!g[k]) { g[k] = []; ordem.push(k); } g[k].push(a); });
    });
    ordem.sort(function (a, b) { return /^Sem /.test(a) - /^Sem /.test(b) || a.localeCompare(b); });
    return ordem.map(function (k) { return { rotulo: k, itens: g[k] }; });
  }

  var API = { CATEGORIAS: CATEGORIAS, SITUACOES: SITUACOES, CAT_VISITA: CAT_VISITA, LEMBRETES_PADRAO: LEMBRETES_PADRAO,
    ehVisita: ehVisita, rotCat: rotCat, ord: ord, ativo: ativo, semana: semana, inicioSemana: inicioSemana, gradeMes: gradeMes, addDias: addDias,
    indicadores: indicadores, lembretes: lembretes, haversineKm: haversineKm, ordenarProximidade: ordenarProximidade, rotaMaps: rotaMaps, agrupar: agrupar };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.ACSAgenda = API;
})(typeof window !== 'undefined' ? window : this);
