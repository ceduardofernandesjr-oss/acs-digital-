/*
 * ACS DIGITAL — Motor da Busca Rápida (funções puras)
 * Navegador: window.ACSBusca · Node: module.exports
 *
 * Procura em: nome, CPF/DNV, CNS, data de nascimento, telefone, endereço, número,
 * bairro, família (código e responsável) e microárea.
 * - Sem diferença de maiúsculas/minúsculas e acentos.
 * - Nomes incompletos: cada palavra digitada precisa casar com o início de alguma palavra.
 * - Semelhantes: tolera 1 letra diferente (palavras com 5+ letras) e marca o resultado
 *   como "semelhante", sempre abaixo dos resultados exatos.
 * - Homônimos: pessoas com o mesmo nome completo são sinalizadas para não confundir.
 */
(function (root) {
  'use strict';

  function norm(s) { return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim(); }
  function dig(s) { return String(s == null ? '' : s).replace(/\D/g, ''); }
  var IGNORAR = ['de', 'da', 'do', 'das', 'dos', 'e', 'rua', 'r', 'av', 'avenida', 'travessa', 'tv', 'n', 'no', 'numero', 'microarea', 'ma', 'familia'];

  function lev1(a, b) { // distância de edição <= 1 ?
    if (a === b) return true;
    var la = a.length, lb = b.length;
    if (Math.abs(la - lb) > 1) return false;
    var i = 0, j = 0, dif = 0;
    while (i < la && j < lb) {
      if (a[i] === b[j]) { i++; j++; continue; }
      if (++dif > 1) return false;
      if (la > lb) i++; else if (lb > la) j++; else { i++; j++; }
    }
    return dif + (la - i) + (lb - j) <= 1;
  }

  // Interpreta datas: dd/mm/aaaa, dd/mm, dd-mm-aaaa, aaaa-mm-dd
  function parseDataConsulta(q) {
    var m = /^(\d{1,2})[\/.-](\d{1,2})(?:[\/.-](\d{2,4}))?$/.exec(q.trim());
    if (m) { var a = m[3] ? (m[3].length === 2 ? (+m[3] > 30 ? '19' : '20') + m[3] : m[3]) : null; return { d: pad(+m[1]), m: pad(+m[2]), a: a }; }
    m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(q.trim());
    if (m) return { d: m[3], m: m[2], a: m[1] };
    return null;
  }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function palavras(s) { return norm(s).split(/[^a-z0-9]+/).filter(Boolean); }

  // Monta o índice de uma pessoa (campos já normalizados)
  function indexar(p, f, resp) {
    f = f || {};
    return {
      nome: palavras(p.nome),
      nomeFull: norm(p.nome),
      cpf: dig(p.cpf_dnv && p.cpf_dnv.numero),
      cns: dig(p.cns),
      tel: dig(p.telefone),
      telFam: dig(f.telefone),
      nasc: p.data_nascimento || '',
      endereco: palavras(f.endereco),
      numero: norm(f.numero),
      bairro: palavras(f.bairro),
      complemento: palavras(f.complemento),
      familia: norm(f.codigo),
      resp: palavras(resp && resp.nome),
      micro: norm(f.microarea)
    };
  }

  // Avalia uma consulta contra o índice. Retorna null ou { score, campos:[], semelhante }
  function avaliar(q, ix) {
    var qn = norm(q); if (!qn) return null;
    var qd = dig(q), campos = {}, score = 0, semelhante = false;

    // 1) Data de nascimento
    var dt = parseDataConsulta(q);
    if (dt && ix.nasc) {
      var p = ix.nasc.split('-');
      if (p[2] === dt.d && p[1] === dt.m && (!dt.a || p[0] === dt.a)) return { score: 90, campos: ['Data de nascimento'], semelhante: false };
      return null;
    }
    // 2) Somente números (CPF, CNS, telefone, número da casa, microárea, código da família)
    var soNum = /^[\d\s().+\-\/]+$/.test(q) && qd.length > 0;
    if (soNum) {
      if (qd.length >= 3 && ix.cpf && ix.cpf.indexOf(qd) >= 0) { campos.CPF = 1; score = Math.max(score, ix.cpf === qd ? 100 : 70); }
      if (qd.length >= 3 && ix.cns && ix.cns.indexOf(qd) >= 0) { campos.CNS = 1; score = Math.max(score, ix.cns === qd ? 100 : 70); }
      if (qd.length >= 4 && ix.tel && (ix.tel.indexOf(qd) >= 0 || ('55' + ix.tel).indexOf(qd) >= 0)) { campos.Telefone = 1; score = Math.max(score, 80); }
      if (qd.length >= 4 && ix.telFam && ix.telFam.indexOf(qd) >= 0) { campos['Telefone da família'] = 1; score = Math.max(score, 60); }
      if (qd.length >= 6 && ix.nasc && ix.nasc.replace(/-/g, '').indexOf(qd) >= 0) { campos['Data de nascimento'] = 1; score = Math.max(score, 60); }
      if (qd.length <= 2 && ix.micro && dig(ix.micro) === qd.padStart(2, '0')) { campos['Microárea'] = 1; score = Math.max(score, 40); }
      if (qd.length <= 5 && ix.numero && dig(ix.numero) === qd) { campos['Número da residência'] = 1; score = Math.max(score, 45); }
      var lc = Object.keys(campos); return lc.length ? { score: score, campos: lc, semelhante: false } : null;
    }
    // 3) Texto: cada palavra precisa casar (prefixo) com alguma palavra de algum campo
    var toks = palavras(q).filter(function (t) { return IGNORAR.indexOf(t) < 0; });
    if (!toks.length) return null;
    // O nome do responsável só é usado na busca de FAMÍLIAS (ix.ehFamilia), nunca para
    // listar outros moradores da casa — evita confundir pessoas.
    var grupos = [['Nome', ix.nome, 30], ['Endereço', ix.endereco, 18], ['Bairro', ix.bairro, 14], ['Complemento', ix.complemento, 8]];
    if (ix.ehFamilia) grupos.push(['Responsável', ix.resp, 26]);
    var total = 0;
    for (var i = 0; i < toks.length; i++) {
      var t = toks[i], melhor = 0, campo = null, sem = false;
      // código da família (f0001) e microárea por número
      if (ix.familia && (ix.familia === t || (t.length >= 2 && ix.familia.indexOf(t) === 0 && /^f\d/.test(t)))) { melhor = 40; campo = 'Família'; }
      if (/^\d{1,5}$/.test(t)) {
        if (ix.numero && dig(ix.numero) === t) { melhor = Math.max(melhor, 16); campo = campo || 'Número da residência'; }
        if (ix.micro && dig(ix.micro) === t.padStart(2, '0')) { melhor = Math.max(melhor, 12); campo = campo || 'Microárea'; }
      }
      for (var g = 0; g < grupos.length; g++) {
        var ws = grupos[g][1], peso = grupos[g][2];
        for (var w = 0; w < ws.length; w++) {
          var pal = ws[w], pts = 0;
          if (pal === t) pts = peso + 6;
          else if (pal.indexOf(t) === 0) pts = peso + (t.length >= 3 ? 3 : 0);
          else if (t.length >= 4 && pal.indexOf(t) > 0) pts = peso - 6;
          if (pts > melhor) { melhor = pts; campo = grupos[g][0]; sem = false; }
        }
      }
      if (!melhor && t.length >= 5) { // tolerância a 1 letra diferente
        for (var g2 = 0; g2 < grupos.length && !melhor; g2++) {
          var ws2 = grupos[g2][1];
          for (var w2 = 0; w2 < ws2.length; w2++) {
            var pal2 = ws2[w2], cand = pal2.length > t.length ? pal2.slice(0, t.length + 1) : pal2;
            if (lev1(t, pal2) || (pal2.length > t.length && (lev1(t, pal2.slice(0, t.length)) || lev1(t, cand)))) { melhor = grupos[g2][2] - 12; campo = grupos[g2][0]; sem = true; break; }
          }
        }
      }
      if (!melhor) return null;
      if (sem) semelhante = true;
      total += melhor; campos[campo] = 1;
    }
    // bônus: consulta igual ao início do nome completo
    var qJunta = toks.join(' ');
    if (ix.nomeFull === qn) total += 40; else if (ix.nomeFull.indexOf(qn) === 0) total += 20;
    return { score: total / toks.length + (semelhante ? -15 : 0) + (ix.nomeFull.indexOf(qJunta) >= 0 ? 5 : 0), campos: Object.keys(campos), semelhante: semelhante };
  }

  // pessoas: array; familias: Map|obj; retorna resultados ordenados
  function buscar(q, pessoas, familias, opts) {
    opts = opts || {};
    var getF = function (id) { return familias.get ? familias.get(id) : familias[id]; };
    var getP = opts.pessoasMap ? function (id) { return opts.pessoasMap.get(id); } : function () { return null; };
    var res = [];
    var contNome = {};
    pessoas.forEach(function (p) { var k = norm(p.nome); contNome[k] = (contNome[k] || 0) + 1; });
    pessoas.forEach(function (p) {
      if (opts.filtro && !opts.filtro(p)) return;
      var f = getF(p.familiaId), resp = f && f.responsavelId ? getP(f.responsavelId) : null;
      var r = avaliar(q, indexar(p, f, resp));
      if (r) res.push({ pessoa: p, familia: f || null, score: r.score, campos: r.campos, semelhante: r.semelhante, homonimo: contNome[norm(p.nome)] > 1 });
    });
    res.sort(function (a, b) { return (a.semelhante - b.semelhante) || (b.score - a.score) || (norm(a.pessoa.nome) < norm(b.pessoa.nome) ? -1 : 1); });
    return res;
  }

  // Famílias que casam pela identificação/endereço (para a seção "Famílias")
  function buscarFamilias(q, familias, pessoasMap) {
    var out = [];
    (familias.forEach ? familias : []).forEach(function (f) {
      var resp = f.responsavelId && pessoasMap ? pessoasMap.get(f.responsavelId) : null;
      var ix = indexar({ nome: '' }, f, resp); ix.ehFamilia = true;
      var r = avaliar(q, ix);
      if (r) out.push({ familia: f, score: r.score, campos: r.campos });
    });
    out.sort(function (a, b) { return b.score - a.score; });
    return out;
  }

  var API = { norm: norm, dig: dig, lev1: lev1, parseDataConsulta: parseDataConsulta, indexar: indexar, avaliar: avaliar, buscar: buscar, buscarFamilias: buscarFamilias };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.ACSBusca = API;
})(typeof window !== 'undefined' ? window : this);
