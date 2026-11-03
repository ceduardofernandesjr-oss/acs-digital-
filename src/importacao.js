/* ACS DIGITAL — motor de importação (funções puras, sem dependência de tela)
 * Formato suportado: VitaCare "Lista de Famílias" (.xls/.xlsx/.csv), lido como matriz de linhas.
 *   Títulos: "Lista de Famílias" / "Área: | <código> - <equipe>" / "Micro Área: | 01" / "Extraído: | 03.11.2026"
 *   Cabeçalho: Número de Família | Estado | Nome | Nome Logradouro (Endereço/Número/Complemento)
 *   Linha de família: nº da família + 1º morador + endereço; linhas seguintes: demais moradores.
 *   Nome: "(<nº família><seq 2 dígitos>) NOME COMPLETO"; Estado: vazio | Óbito | Mudou-se (da pessoa).
 * A importação é idempotente: famílias e pessoas são reconhecidas pelo código VitaCare; nada é apagado.
 */
(function (root) {
  'use strict';

  function txt(v) { return String(v == null ? '' : v).replace(/\s+/g, ' ').trim(); }
  function semAcento(s) { return txt(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }

  // ---------------------------------------------------------------- reconhecimento
  function acharCabecalho(linhas) {
    for (var i = 0; i < Math.min(linhas.length, 30); i++) {
      var l = (linhas[i] || []).map(semAcento);
      var iFam = l.findIndex(function (c) { return c.indexOf('numero de familia') === 0; });
      var iNome = l.findIndex(function (c) { return c === 'nome'; });
      var iEnd = l.findIndex(function (c) { return c.indexOf('nome logradouro') === 0 || c.indexOf('logradouro') === 0; });
      if (iFam >= 0 && iNome >= 0) return { linha: i, fam: iFam, nome: iNome, end: iEnd, estado: l.findIndex(function (c) { return c === 'estado'; }) };
    }
    return null;
  }
  function metaTitulos(linhas, ate) {
    var m = { titulo: '', area: '', microarea: '', extraido: '' };
    for (var i = 0; i < ate; i++) {
      var cs = (linhas[i] || []).map(txt).filter(Boolean);
      if (!cs.length) continue;
      var k = semAcento(cs[0]).replace(/:$/, '').trim(), v = cs.slice(1).join(' ');
      if (i === 0 && cs.length === 1) m.titulo = cs[0];
      if (k === 'area') m.area = v;
      else if (k === 'micro area' || k === 'microarea') m.microarea = v;
      else if (k === 'extraido') m.extraido = dataBR(v) || v;
    }
    return m;
  }
  function dataBR(v) { var x = /^(\d{2})[./-](\d{2})[./-](\d{4})$/.exec(txt(v)); return x ? x[3] + '-' + x[2] + '-' + x[1] : ''; }

  function reconhecer(linhas) {
    var c = acharCabecalho(linhas || []);
    if (!c) return null;
    var meta = metaTitulos(linhas, c.linha);
    if (!/famil/i.test(semAcento(meta.titulo)) && c.end < 0) return null;
    return { tipo: 'vitacare-familias', rotulo: 'VitaCare — Lista de Famílias', cab: c, meta: meta };
  }

  // ---------------------------------------------------------------- leitura
  function separarEndereco(s) {
    s = txt(s); if (!s) return { endereco: '', numero: '', complemento: '' };
    var p = s.split(',').map(txt);
    var r = { endereco: p[0] || '', numero: '', complemento: '' };
    if (p.length >= 2) {
      if (/^(\d+[a-z]?|s\/?n)$/i.test(p[1])) { r.numero = p[1].toUpperCase().replace('S/N', 'S/N'); r.complemento = p.slice(2).filter(Boolean).join(', '); }
      else r.complemento = p.slice(1).filter(Boolean).join(', ');
    }
    return r;
  }
  function situacaoPessoa(estado) {
    var e = semAcento(estado);
    if (!e) return 'Ativo';
    if (e.indexOf('obito') >= 0 || e.indexOf('falec') >= 0) return 'Óbito';
    if (e.indexOf('mudou') >= 0) return 'Mudou-se';
    if (e.indexOf('inativ') >= 0) return 'Inativo';
    return 'Ativo';
  }

  // Lê a matriz de linhas. Retorna { meta, familias:[{numero, endereco, numero_casa, complemento, enderecoOriginal, pessoas:[{vitacareId, seq, nome, situacao, estadoOriginal}]}], avisos:[], erros:[] }
  function ler(linhas) {
    var rec = reconhecer(linhas);
    if (!rec) return { erro: 'Formato não reconhecido. No momento a importação aceita a "Lista de Famílias" exportada do VitaCare.' };
    var c = rec.cab, fams = [], atual = null, avisos = [], erros = [], vistosFam = {}, vistosPes = {};
    for (var i = c.linha + 1; i < linhas.length; i++) {
      var l = linhas[i] || [], nl = i + 1;
      var famCel = txt(l[c.fam]), nomeCel = txt(l[c.nome]), endCel = c.end >= 0 ? txt(l[c.end]) : '', est = c.estado >= 0 ? txt(l[c.estado]) : '';
      if (!famCel && !nomeCel && !endCel) continue;
      if (famCel && !/^\d/.test(famCel) && !nomeCel) continue; // rodapé ("Processado por computador...")
      if (famCel) {
        var num = (/^\d+/.exec(famCel) || [''])[0];
        if (!num) { erros.push({ linha: nl, msg: 'Número de família inválido.' }); atual = null; continue; }
        if (vistosFam[num]) { avisos.push({ linha: nl, msg: 'Família ' + num + ' aparece mais de uma vez; os moradores foram juntados.' }); atual = vistosFam[num]; }
        else {
          var e = separarEndereco(endCel);
          atual = { numero: num, endereco: e.endereco, numero_casa: e.numero, complemento: e.complemento, enderecoOriginal: endCel, linha: nl, pessoas: [] };
          vistosFam[num] = atual; fams.push(atual);
          if (!endCel) avisos.push({ linha: nl, msg: 'Família ' + num + ' sem endereço no arquivo.' });
        }
      }
      if (!nomeCel) { if (!famCel) erros.push({ linha: nl, msg: 'Linha sem nome de morador.' }); continue; }
      if (!atual) { erros.push({ linha: nl, msg: 'Morador sem família antes dele no arquivo.' }); continue; }
      var m = /^\((\d*)\)\s*(.*)$/.exec(nomeCel), id = m ? m[1] : '', nome = txt(m ? m[2] : nomeCel);
      if (!nome) { erros.push({ linha: nl, msg: 'Morador sem nome.' }); continue; }
      if (!id) { id = atual.numero + '-' + semAcento(nome).replace(/[^a-z0-9]+/g, '-'); avisos.push({ linha: nl, msg: 'Morador sem código VitaCare; reconhecido pelo nome dentro da família.' }); }
      if (vistosPes[id]) { avisos.push({ linha: nl, msg: 'Morador repetido no arquivo (mesmo código); considerado uma vez.' }); continue; }
      var seq = id.indexOf(atual.numero) === 0 ? id.slice(atual.numero.length) : '';
      var p = { vitacareId: id, seq: seq, nome: nome, situacao: situacaoPessoa(est), estadoOriginal: est, linha: nl };
      vistosPes[id] = p; atual.pessoas.push(p);
    }
    return { tipo: rec.tipo, rotulo: rec.rotulo, meta: rec.meta, familias: fams, avisos: avisos, erros: erros };
  }

  // ---------------------------------------------------------------- responsável
  // regra 'seq01': morador de final 01 (se existir e estiver ativo); senão o 1º ativo listado.
  // regra 'primeiro': 1º morador ativo listado.
  function escolherResponsavel(f, regra) {
    var ativos = f.pessoas.filter(function (p) { return p.situacao === 'Ativo'; });
    if (!ativos.length) return null;
    if (regra !== 'primeiro') { var u = ativos.filter(function (p) { return p.seq === '01'; })[0]; if (u) return u; }
    return ativos[0];
  }

  // ---------------------------------------------------------------- plano
  // existentes: { familias: [{id, ...}], pessoas: [{id, ...}] }
  // opcoes: { regraResponsavel, microarea, unidade, equipe, porRua: { 'NOME DA RUA': { bairro, cep } }, hoje: 'aaaa-mm-dd', novoId(prefixo), proximoNumeroCodigo }
  // Retorna { familias:[{acao:'criar'|'atualizar'|'manter', id, doc, mudou:[campos]}], pessoas:[...], resumo, foraDoArquivo }
  function planejar(lido, existentes, o) {
    o = o || {};
    var porVitaF = {}, porVitaP = {};
    (existentes.familias || []).forEach(function (f) { if (f.vitacare && f.vitacare.numero) porVitaF[f.vitacare.numero] = f; });
    (existentes.pessoas || []).forEach(function (p) { if (p.vitacareId) porVitaP[p.vitacareId] = p; });
    var cod = o.proximoNumeroCodigo || 1, planoF = [], planoP = [], noArquivoF = {}, noArquivoP = {};
    var origem = { sistema: 'VitaCare', area: lido.meta.area || '', microarea: lido.meta.microarea || '', extraidoEm: lido.meta.extraido || '' };
    lido.familias.forEach(function (f) {
      noArquivoF[f.numero] = 1;
      var ex = porVitaF[f.numero], fid = ex ? ex.id : o.novoId('f');
      var rua = o.porRua && o.porRua[f.endereco] || {};
      var idsPorVita = {};
      f.pessoas.forEach(function (p) {
        noArquivoP[p.vitacareId] = 1;
        var exP = porVitaP[p.vitacareId], pid = exP ? exP.id : o.novoId('p');
        idsPorVita[p.vitacareId] = pid;
        var novo = { nome: p.nome, situacao: p.situacao, familiaId: fid, vitacareId: p.vitacareId };
        if (!exP) { planoP.push({ acao: 'criar', id: pid, doc: Object.assign({ condicoes: {} }, novo), mudou: [] }); return; }
        var mud = [], doc = Object.assign({}, exP);
        // não sobrescreve o que o ACS já corrigiu: nome só muda se veio diferente do que foi importado da última vez
        if (p.nome !== exP.nome && (!exP.vitacareNome || exP.vitacareNome !== p.nome)) { doc.nome = p.nome; mud.push('nome'); }
        if (p.situacao !== 'Ativo' && exP.situacao !== p.situacao) { doc.situacao = p.situacao; mud.push('situacao'); }
        if (exP.familiaId !== fid) { doc.familiaId = fid; mud.push('familiaId'); }
        doc.vitacareNome = p.nome;
        planoP.push({ acao: mud.length ? 'atualizar' : 'manter', id: pid, doc: doc, mudou: mud });
      });
      var resp = escolherResponsavel(f, o.regraResponsavel);
      var respId = resp ? idsPorVita[resp.vitacareId] : null;
      if (!ex) {
        var doc = {
          codigo: 'F' + String(cod++).padStart(4, '0'), endereco: f.endereco, numero: f.numero_casa, complemento: f.complemento,
          bairro: rua.bairro || '', cep: (rua.cep || '').replace(/\D/g, ''), microarea: o.microarea != null ? o.microarea : (lido.meta.microarea || ''),
          unidade: o.unidade || '', equipe: o.equipe || '', telefone: '', data_cadastro: o.hoje || '', situacao: 'Ativa',
          responsavelId: respId, vitacare: Object.assign({ numero: f.numero }, origem)
        };
        planoF.push({ acao: 'criar', id: fid, doc: doc, mudou: [], pessoas: f.pessoas.length });
        return;
      }
      var d2 = Object.assign({}, ex), mf = [];
      var imp = ex.vitacare || {};
      // endereço: só atualiza se mudou no VitaCare em relação à última importação (preserva correções do ACS)
      if (f.enderecoOriginal && imp.enderecoOriginal !== f.enderecoOriginal) {
        if (ex.endereco !== f.endereco) { d2.endereco = f.endereco; mf.push('endereco'); }
        if (ex.numero !== f.numero_casa) { d2.numero = f.numero_casa; mf.push('numero'); }
        if ((ex.complemento || '') !== f.complemento) { d2.complemento = f.complemento; mf.push('complemento'); }
      }
      if (!ex.bairro && rua.bairro) { d2.bairro = rua.bairro; mf.push('bairro'); }
      if (!ex.cep && rua.cep) { d2.cep = rua.cep.replace(/\D/g, ''); mf.push('cep'); }
      if (!ex.responsavelId && respId) { d2.responsavelId = respId; mf.push('responsavelId'); }
      d2.vitacare = Object.assign({}, imp, { numero: f.numero }, origem, { enderecoOriginal: f.enderecoOriginal });
      planoF.push({ acao: mf.length ? 'atualizar' : 'manter', id: fid, doc: d2, mudou: mf, pessoas: f.pessoas.length });
    });
    planoF.forEach(function (x) { if (x.acao === 'criar') { var f = lido.familias.filter(function (y) { return y.numero === x.doc.vitacare.numero; })[0]; x.doc.vitacare.enderecoOriginal = f.enderecoOriginal; } });
    planoP.forEach(function (x) { if (x.acao === 'criar') x.doc.vitacareNome = x.doc.nome; });
    var fora = {
      familias: (existentes.familias || []).filter(function (f) { return f.vitacare && f.vitacare.numero && !noArquivoF[f.vitacare.numero] && (!lido.meta.microarea || f.vitacare.microarea === lido.meta.microarea); }).length,
      pessoas: (existentes.pessoas || []).filter(function (p) { return p.vitacareId && !noArquivoP[p.vitacareId] && noArquivoF[String(p.vitacareId).slice(0, -2)]; }).length
    };
    function conta(l, a) { return l.filter(function (x) { return x.acao === a; }).length; }
    var sit = {}; lido.familias.forEach(function (f) { f.pessoas.forEach(function (p) { if (p.situacao !== 'Ativo') sit[p.situacao] = (sit[p.situacao] || 0) + 1; }); });
    return {
      familias: planoF, pessoas: planoP, foraDoArquivo: fora, proximoNumeroCodigo: cod,
      resumo: {
        familias: { criar: conta(planoF, 'criar'), atualizar: conta(planoF, 'atualizar'), manter: conta(planoF, 'manter') },
        pessoas: { criar: conta(planoP, 'criar'), atualizar: conta(planoP, 'atualizar'), manter: conta(planoP, 'manter') },
        situacoes: sit, semResponsavel: planoF.filter(function (x) { return !x.doc.responsavelId; }).length
      }
    };
  }

  // Ruas distintas (para completar bairro e CEP uma vez por rua)
  function ruas(lido) {
    var m = {};
    lido.familias.forEach(function (f) { if (f.endereco) m[f.endereco] = (m[f.endereco] || 0) + 1; });
    return Object.keys(m).sort().map(function (k) { return { rua: k, familias: m[k] }; });
  }

  var API = { reconhecer: reconhecer, ler: ler, planejar: planejar, ruas: ruas, separarEndereco: separarEndereco, situacaoPessoa: situacaoPessoa, escolherResponsavel: escolherResponsavel };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.ACSImportacao = API;
})(this);
