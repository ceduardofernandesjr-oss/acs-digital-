/*
 * ACS DIGITAL — Motor de produtividade de visitas domiciliares
 * Funções puras (sem DOM). Navegador: window.ACSProdutividade · Node: module.exports
 *
 * Regras de contabilização:
 *  - Só "Visita realizada" entra no total de visitas realizadas.
 *  - Morador ausente, Recusa, Imóvel fechado, Endereço não localizado = tentativa não concluída.
 *  - Visita reagendada também não é realizada: entra como tentativa não concluída (tipo "reagendada").
 *  - Uma visita = um registro (id único), mesmo atendendo vários moradores.
 *  - Uma visita pode ter várias linhas de cuidado, mas conta UMA vez no total.
 */
(function (root) {
  'use strict';

  var REALIZADA = 'Visita realizada';
  var TENTATIVAS = ['Morador ausente', 'Recusa', 'Imóvel fechado', 'Endereço não localizado', 'Visita reagendada'];

  var LINHAS = [
    ['has', 'Hipertensos (HAS)'], ['dm', 'Diabéticos (DM)'], ['gestante', 'Gestantes'],
    ['tuberculose', 'Tuberculose'], ['crianca', 'Crianças'], ['saude_mental', 'Saúde Mental'],
    ['hanseniase', 'Hanseníase'], ['idoso', 'Idosos'], ['acamado', 'Pessoas acamadas'],
    ['demais', 'Demais moradores']
  ];
  var LINHAS_CONDICAO = ['has', 'dm', 'gestante', 'tuberculose', 'saude_mental', 'hanseniase', 'acamado'];
  var IDADE_CRIANCA_MAX = 11;   // 0 a 11 anos (ECA)
  var IDADE_IDOSO_MIN = 60;

  // ---------------- datas (ISO yyyy-mm-dd, horário local) ----------------
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parse(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || ''));
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
  }
  function addDias(s, n) { var d = parse(s); d.setDate(d.getDate() + n); return iso(d); }
  function diasNoMes(mes) { var a = +mes.slice(0, 4), m = +mes.slice(5, 7); return new Date(a, m, 0).getDate(); }
  function mesDe(s) { return String(s).slice(0, 7); }
  function mesAnterior(mes) { var a = +mes.slice(0, 4), m = +mes.slice(5, 7) - 1; if (m === 0) { a--; m = 12; } return a + '-' + pad(m); }
  function mesSeguinte(mes) { var a = +mes.slice(0, 4), m = +mes.slice(5, 7) + 1; if (m === 13) { a++; m = 1; } return a + '-' + pad(m); }
  function inicioSemana(s) { var d = parse(s), dw = (d.getDay() + 6) % 7; d.setDate(d.getDate() - dw); return iso(d); } // segunda-feira
  function diasEntre(de, ate) { return Math.round((parse(ate) - parse(de)) / 86400000) + 1; }
  function ehDiaUtil(s) { var w = parse(s).getDay(); return w !== 0 && w !== 6; }
  function contarDias(de, ate, base) {
    if (!de || !ate || ate < de) return 0;
    if (base !== 'uteis') return diasEntre(de, ate);
    var n = 0; for (var d = de; d <= ate; d = addDias(d, 1)) if (ehDiaUtil(d)) n++;
    return n;
  }
  function idadeNaData(nasc, data) {
    var n = parse(nasc), d = parse(data); if (!n || !d) return null;
    var i = d.getFullYear() - n.getFullYear();
    if (d.getMonth() < n.getMonth() || (d.getMonth() === n.getMonth() && d.getDate() < n.getDate())) i--;
    return i;
  }

  // ---------------- períodos ----------------
  // tipo: hoje | 7d | 30d | mes | mes_anterior | personalizado
  function periodo(tipo, hoje, de, ate) {
    switch (tipo) {
      case 'hoje': return { de: hoje, ate: hoje, rotulo: 'Hoje' };
      case '7d': return { de: addDias(hoje, -6), ate: hoje, rotulo: 'Últimos 7 dias' };
      case '30d': return { de: addDias(hoje, -29), ate: hoje, rotulo: 'Últimos 30 dias' };
      case 'semana': var s = inicioSemana(hoje); return { de: s, ate: addDias(s, 6), rotulo: 'Esta semana' };
      case 'mes': var m = mesDe(hoje); return { de: m + '-01', ate: m + '-' + pad(diasNoMes(m)), rotulo: 'Mês atual' };
      case 'mes_anterior': var ma = mesAnterior(mesDe(hoje)); return { de: ma + '-01', ate: ma + '-' + pad(diasNoMes(ma)), rotulo: 'Mês anterior' };
      default:
        var d1 = de || hoje, d2 = ate || hoje;
        if (d2 < d1) { var t = d1; d1 = d2; d2 = t; }
        return { de: d1, ate: d2, rotulo: 'Período personalizado' };
    }
  }

  // ---------------- classificação ----------------
  function ehRealizada(v) { return v && v.situacao === REALIZADA; }
  function ehTentativa(v) { return v && TENTATIVAS.indexOf(v.situacao) >= 0; }

  // Linhas de cuidado de uma pessoa na data da visita
  function linhasDaPessoa(p, data) {
    var l = [], c = (p && p.condicoes) || {};
    LINHAS_CONDICAO.forEach(function (k) { if (c[k]) l.push(k); });
    var i = idadeNaData(p && p.data_nascimento, data);
    if (i != null && i >= 0 && i <= IDADE_CRIANCA_MAX) l.push('crianca');
    if (i != null && i >= IDADE_IDOSO_MIN) l.push('idoso');
    return l;
  }
  // Sugestão de linhas para uma visita (a partir dos moradores atendidos)
  function sugerirLinhas(pessoaIds, pessoas, data) {
    var s = {};
    (pessoaIds || []).forEach(function (id) {
      var p = pessoas.get ? pessoas.get(id) : pessoas[id];
      if (p) linhasDaPessoa(p, data).forEach(function (k) { s[k] = true; });
    });
    return LINHAS.map(function (x) { return x[0]; }).filter(function (k) { return s[k]; });
  }
  // Linhas efetivas: as gravadas na visita (array, mesmo vazio) ou, em registros
  // antigos sem o campo, as derivadas dos moradores. Sem nenhuma → "demais".
  function linhasDaVisita(v, pessoas) {
    var l = Array.isArray(v.linhas) ? v.linhas.filter(function (k) { return k !== 'demais'; }) : sugerirLinhas(v.pessoaIds, pessoas, v.data);
    return l.length ? l : ['demais'];
  }
  // ACS responsável: campo novo acsId; em registros antigos, o autor do primeiro histórico
  function acsDaVisita(v) {
    if (v.acsId) return v.acsId;
    return (v.historico && v.historico[0] && v.historico[0].por) || null;
  }

  // ---------------- filtragem ----------------
  // f: { de, ate, micro, linha, pessoaId, situacao ('' | 'realizadas' | 'tentativas' | situação exata), incluirDemo, acsId }
  function filtrar(visitas, f, ctx) {
    f = f || {};
    var fam = ctx.familias, pes = ctx.pessoas;
    return visitas.filter(function (v) {
      if (!v || !v.data) return false;
      if (f.de && v.data < f.de) return false;
      if (f.ate && v.data > f.ate) return false;
      if (f.incluirDemo === false && v.demo) return false;
      if (f.acsId && acsDaVisita(v) !== f.acsId) return false;
      if (f.micro) { var fm = fam.get ? fam.get(v.familiaId) : fam[v.familiaId]; if (!fm || fm.microarea !== f.micro) return false; }
      if (f.pessoaId && (v.pessoaIds || []).indexOf(f.pessoaId) < 0) return false;
      if (f.situacao === 'realizadas' && !ehRealizada(v)) return false;
      if (f.situacao === 'tentativas' && !ehTentativa(v)) return false;
      if (f.situacao && f.situacao !== 'realizadas' && f.situacao !== 'tentativas' && v.situacao !== f.situacao) return false;
      if (f.linha && linhasDaVisita(v, pes).indexOf(f.linha) < 0) return false;
      return true;
    });
  }

  // ---------------- resumo / agregações ----------------
  function resumo(visitas, ctx) {
    var r = { realizadas: 0, tentativas: 0, porSituacao: {}, porLinha: {}, pessoasPorLinha: {}, porMicro: {}, porDia: {},
      pessoasAtendidas: 0, familiasVisitadas: 0, demo: 0 };
    LINHAS.forEach(function (l) { r.porLinha[l[0]] = 0; r.pessoasPorLinha[l[0]] = 0; });
    TENTATIVAS.concat([REALIZADA]).forEach(function (s) { r.porSituacao[s] = 0; });
    var pessoas = {}, familias = {}, pesLinha = {};
    visitas.forEach(function (v) {
      if (v.demo) r.demo++;
      if (v.situacao in r.porSituacao) r.porSituacao[v.situacao]++;
      if (ehTentativa(v)) { r.tentativas++; return; }
      if (!ehRealizada(v)) return;
      r.realizadas++;
      familias[v.familiaId] = true;
      (v.pessoaIds || []).forEach(function (id) { pessoas[id] = true; });
      linhasDaVisita(v, ctx.pessoas).forEach(function (k) {
        r.porLinha[k]++;                                // cada visita conta 1x por linha
        (v.pessoaIds || []).forEach(function (id) { (pesLinha[k] || (pesLinha[k] = {}))[id] = true; });
      });
      var fm = ctx.familias.get ? ctx.familias.get(v.familiaId) : ctx.familias[v.familiaId];
      var mi = (fm && fm.microarea) || 'Sem microárea';
      r.porMicro[mi] = (r.porMicro[mi] || 0) + 1;
      r.porDia[v.data] = (r.porDia[v.data] || 0) + 1;
    });
    r.pessoasAtendidas = Object.keys(pessoas).length;
    r.familiasVisitadas = Object.keys(familias).length;
    Object.keys(pesLinha).forEach(function (k) { r.pessoasPorLinha[k] = Object.keys(pesLinha[k]).length; });
    return r;
  }

  function serieDiaria(porDia, de, ate) {
    var l = []; for (var d = de; d <= ate; d = addDias(d, 1)) l.push([d, porDia[d] || 0]); return l;
  }
  function serieSemanal(porDia, de, ate) {
    var m = {}, ordem = [];
    for (var d = de; d <= ate; d = addDias(d, 1)) { var s = inicioSemana(d); if (!(s in m)) { m[s] = 0; ordem.push(s); } m[s] += porDia[d] || 0; }
    return ordem.map(function (s) { return [s, m[s]]; });
  }
  function serieMensal(visitasRealizadas, mesFinal, n) {
    var meses = [], m = mesFinal; for (var i = 0; i < n; i++) { meses.unshift(m); m = mesAnterior(m); }
    var c = {}; meses.forEach(function (x) { c[x] = 0; });
    visitasRealizadas.forEach(function (v) { var k = mesDe(v.data); if (k in c) c[k]++; });
    return meses.map(function (x) { return [x, c[x]]; });
  }
  // acumulado por dia do mês (para comparar meses)
  function acumuladoMes(visitasRealizadas, mes, ateDia) {
    var n = diasNoMes(mes), por = new Array(n).fill(0);
    visitasRealizadas.forEach(function (v) { if (mesDe(v.data) === mes) por[+v.data.slice(8, 10) - 1]++; });
    var out = [], acc = 0, lim = ateDia == null ? n : Math.min(n, ateDia);
    for (var i = 0; i < lim; i++) { acc += por[i]; out.push(acc); }
    return out;
  }

  // ---------------- meta mensal ----------------
  // metasDoc: { meses: { 'aaaa-mm': { valor, historico:[{valor, em}] } } }
  function metaDoMes(metasDoc, mes) {
    var x = metasDoc && metasDoc.meses && metasDoc.meses[mes];
    return x && x.valor > 0 ? x.valor : null;
  }
  // Cálculo da meta: base 'uteis' (seg–sex) ou 'corridos'
  function calcularMeta(meta, realizadas, mes, hoje, base) {
    var total = contarDias(mes + '-01', mes + '-' + pad(diasNoMes(mes)), base);
    var mesHoje = mesDe(hoje), decorridos;
    if (mes < mesHoje) decorridos = total;
    else if (mes > mesHoje) decorridos = 0;
    else decorridos = contarDias(mes + '-01', hoje, base);
    var media = decorridos ? realizadas / decorridos : 0;
    var projecao = mes < mesHoje ? realizadas : (decorridos ? Math.round(media * total) : realizadas);
    var r = {
      meta: meta, realizadas: realizadas,
      restantes: meta ? Math.max(0, meta - realizadas) : null,
      percentual: meta ? (realizadas / meta) * 100 : null,
      mediaDiaria: media, projecao: projecao,
      diasDecorridos: decorridos, diasTotais: total, diasRestantes: Math.max(0, total - decorridos),
      base: base === 'uteis' ? 'uteis' : 'corridos'
    };
    // ritmo necessário para bater a meta nos dias que faltam
    r.necessarioPorDia = meta && r.diasRestantes ? Math.max(0, meta - realizadas) / r.diasRestantes : null;
    r.projecaoAtinge = meta ? projecao >= meta : null;
    return r;
  }
  function fmtPct(p, casas) {
    if (p == null) return '—';
    return p.toFixed(casas == null ? 2 : casas).replace('.', ',') + '%';
  }

  var API = {
    REALIZADA: REALIZADA, TENTATIVAS: TENTATIVAS, LINHAS: LINHAS, LINHAS_CONDICAO: LINHAS_CONDICAO,
    IDADE_CRIANCA_MAX: IDADE_CRIANCA_MAX, IDADE_IDOSO_MIN: IDADE_IDOSO_MIN,
    iso: iso, parse: parse, addDias: addDias, diasNoMes: diasNoMes, mesDe: mesDe, mesAnterior: mesAnterior, mesSeguinte: mesSeguinte,
    inicioSemana: inicioSemana, contarDias: contarDias, idadeNaData: idadeNaData,
    periodo: periodo, ehRealizada: ehRealizada, ehTentativa: ehTentativa,
    linhasDaPessoa: linhasDaPessoa, sugerirLinhas: sugerirLinhas, linhasDaVisita: linhasDaVisita, acsDaVisita: acsDaVisita,
    filtrar: filtrar, resumo: resumo, serieDiaria: serieDiaria, serieSemanal: serieSemanal, serieMensal: serieMensal,
    acumuladoMes: acumuladoMes, metaDoMes: metaDoMes, calcularMeta: calcularMeta, fmtPct: fmtPct
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.ACSProdutividade = API;
})(typeof window !== 'undefined' ? window : this);
