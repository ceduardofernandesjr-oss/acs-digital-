/*
 * ACS DIGITAL — Motor da Central de Pendências (funções puras)
 * Navegador: window.ACSPendencias · Node: module.exports
 *
 * Princípios:
 *  - As pendências automáticas são CALCULADAS a partir dos cadastros, visitas e agenda;
 *    por isso se atualizam sozinhas a cada alteração e nunca ficam duplicadas.
 *  - Chave única por situação: tipo:alvo:identificadaEm. A mesma situação gera sempre a
 *    mesma chave; se for resolvida e voltar a ocorrer depois, é uma nova ocorrência.
 *  - Só as AÇÕES do ACS são gravadas (resolver com justificativa, justificativas,
 *    observações manuais) e permanecem no histórico.
 *  - Níveis (alta / atenção / informativo) e prazos vêm da configuração da equipe.
 *    O sistema não faz classificação de risco clínico.
 */
(function (root) {
  'use strict';

  var NIVEIS = [['alta', 'Prioridade alta'], ['atencao', 'Atenção'], ['info', 'Informativo']];
  var ORDEM_NIVEL = { alta: 0, atencao: 1, info: 2 };
  var CATS = [['cadastro', 'Cadastro'], ['linha', 'Linhas de cuidado'], ['visita', 'Visitas domiciliares'], ['agenda', 'Agenda'], ['manual', 'Observações manuais']];
  var CAT_VISITA = ['visita', 'retorno', 'acompanhamento'];

  var TIPOS = {
    cad_individual: { cat: 'cadastro', nome: 'Cadastro individual incompleto', nivel: 'atencao', regra: 'Completude abaixo de 95% (amarelo ou vermelho) ou faixa etária indefinida.' },
    cad_dados: { cat: 'cadastro', nome: 'Dados obrigatórios não preenchidos', nivel: 'info', regra: 'Cadastro verde (95% ou mais) que ainda tem campo obrigatório pendente.' },
    cad_familiar: { cat: 'cadastro', nome: 'Cadastro familiar incompleto', nivel: 'atencao', regra: 'Família sem responsável, sem microárea ou com dados do domicílio pendentes (campos 20–23 e 25–35).' },
    contato: { cat: 'cadastro', nome: 'Telefone ou endereço ausente', nivel: 'atencao', regra: 'Telefone ausente ou inválido (quando o campo se aplica à faixa etária) ou endereço sem logradouro, número ou bairro.' },
    cad_desatualizado: { cat: 'cadastro', nome: 'Cadastro precisa de atualização', nivel: 'info', regra: 'Sem atualização há mais tempo que o configurado (meses).' },
    l_gestante: { cat: 'linha', linha: 'gestante', prazo: 'gestante', nome: 'Gestante com acompanhamento pendente', nivel: 'atencao' },
    l_has: { cat: 'linha', linha: 'has', prazo: 'hasdm', nome: 'Hipertenso sem acompanhamento no período', nivel: 'atencao' },
    l_dm: { cat: 'linha', linha: 'dm', prazo: 'hasdm', nome: 'Diabético sem acompanhamento no período', nivel: 'atencao' },
    l_crianca: { cat: 'linha', linha: 'crianca2', prazo: 'crianca', nome: 'Criança (menor de 2 anos) com acompanhamento pendente', nivel: 'atencao' },
    l_tuberculose: { cat: 'linha', linha: 'tuberculose', prazo: 'tuberculose', nome: 'Tuberculose: acompanhamento pendente', nivel: 'atencao' },
    l_hanseniase: { cat: 'linha', linha: 'hanseniase', prazo: 'hanseniase', nome: 'Hanseníase: acompanhamento pendente', nivel: 'atencao' },
    l_saude_mental: { cat: 'linha', linha: 'saude_mental', prazo: 'saude_mental', nome: 'Saúde mental: acompanhamento pendente', nivel: 'atencao' },
    l_idoso: { cat: 'linha', linha: 'idoso', prazo: 'idoso', nome: 'Idoso sem acompanhamento no período', nivel: 'atencao' },
    l_acamado: { cat: 'linha', linha: 'acamado', prazo: 'acamado', nome: 'Pessoa acamada sem visita no período', nivel: 'atencao' },
    familia_sem_visita: { cat: 'visita', prazo: 'familia', nome: 'Família sem visita no prazo', nivel: 'info' },
    v_agendada_hoje: { cat: 'visita', nome: 'Visita agendada para hoje, ainda não realizada', nivel: 'info', regra: 'Compromisso de visita com data de hoje e situação "Agendado".' },
    v_atrasada: { cat: 'visita', nome: 'Visita agendada atrasada', nivel: 'alta', regra: 'Compromisso de visita com data já passada que continua "Agendado".' },
    v_retorno_programado: { cat: 'visita', nome: 'Retorno programado', nivel: 'info', regra: 'Retorno agendado para os próximos dias (antecedência configurada).' },
    v_reagendar: { cat: 'visita', nome: 'Visita não concluída — reagendar', nivel: 'atencao', regra: 'Tentativa sem sucesso (situações configuradas) ou compromisso "Não realizado", sem visita realizada nem novo agendamento depois.' },
    a_hoje: { cat: 'agenda', nome: 'Compromisso de hoje', nivel: 'info', regra: 'Atividade agendada para hoje.' },
    a_retorno_hoje: { cat: 'agenda', nome: 'Retorno previsto para hoje', nivel: 'atencao', regra: 'Retorno agendado para hoje e ainda não concluído.' },
    a_proximo: { cat: 'agenda', nome: 'Compromisso próximo', nivel: 'info', regra: 'Atividade agendada para os próximos dias (antecedência configurada).' },
    a_atrasada: { cat: 'agenda', nome: 'Atividade atrasada', nivel: 'atencao', regra: 'Atividade com data já passada que continua "Agendado".' },
    manual: { cat: 'manual', nome: 'Observação manual', nivel: 'atencao', regra: 'Registrada pelo ACS.' }
  };
  var TENTATIVAS_PADRAO = ['Morador ausente', 'Imóvel fechado', 'Endereço não localizado', 'Visita reagendada'];

  // ---------- datas ----------
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function isoLocal(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function dataDe(ts) { if (!ts) return null; if (/^\d{4}-\d{2}-\d{2}$/.test(ts)) return ts; var d = new Date(ts); return isNaN(d) ? null : isoLocal(d); }
  function parse(s) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; }
  function addDias(s, n) { var d = parse(s); d.setDate(d.getDate() + n); return isoLocal(d); }
  function addMeses(s, n) { var d = parse(s); d.setMonth(d.getMonth() + n); return isoLocal(d); }
  function idade(nasc, hoje) { var n = parse(nasc), h = parse(hoje); if (!n || !h) return null; var i = h.getFullYear() - n.getFullYear(); if (h.getMonth() < n.getMonth() || (h.getMonth() === n.getMonth() && h.getDate() < n.getDate())) i--; return i; }

  function chave(tipo, alvo, desde) { return tipo + ':' + alvo + ':' + (desde || 'sd'); }
  function nivelDe(tipo, config) { var n = config && config.niveisPendencia && config.niveisPendencia[tipo]; return n === 'alta' || n === 'atencao' || n === 'info' ? n : TIPOS[tipo].nivel; }
  function prazoDe(k, config) { var v = config && config.prazos && config.prazos[k]; return v > 0 ? +v : null; }

  // ---------- cálculo ----------
  // ctx: { pessoas: Map, familias: Map, visitas: [], agenda: [], estados: Map, config, hoje, comp: Map, C }
  function calcular(ctx) {
    var hoje = ctx.hoje, cfg = ctx.config || {}, C = ctx.C;
    var abertas = [], porChave = {}, naoConfigurados = [];
    var getF = function (id) { return ctx.familias.get(id); };

    function add(p) {
      var t = TIPOS[p.tipo];
      p.cat = t.cat; p.nivel = p.nivel || nivelDe(p.tipo, cfg); p.titulo = p.titulo || t.nome;
      p.regra = p.regra || t.regra; p.origem = p.origem || 'auto';
      p.key = p.key || chave(p.tipo, p.alvo, p.desde);
      if (porChave[p.key]) return;                    // nunca duplica
      p.hoje = p.vence === hoje; p.atrasada = !!(p.vence && p.vence < hoje);
      porChave[p.key] = p; abertas.push(p);
    }

    // famílias e pessoas ativas
    var famAtivas = [], ativos = [];
    ctx.familias.forEach(function (f) { if ((f.situacao || 'Ativa') === 'Ativa') famAtivas.push(f); });
    ctx.pessoas.forEach(function (p) { var f = getF(p.familiaId); if ((p.situacao || 'Ativo') === 'Ativo' && (!f || (f.situacao || 'Ativa') === 'Ativa')) ativos.push(p); });

    // última visita realizada por pessoa/família
    var ultP = {}, ultF = {};
    (ctx.visitas || []).forEach(function (v) {
      if (v.situacao !== 'Visita realizada' || !v.data) return;
      if (!ultF[v.familiaId] || ultF[v.familiaId] < v.data) ultF[v.familiaId] = v.data;
      (v.pessoaIds || []).forEach(function (id) { if (!ultP[id] || ultP[id] < v.data) ultP[id] = v.data; });
    });

    // ===== A. Cadastro =====
    ativos.forEach(function (p) {
      var f = getF(p.familiaId) || {}, r = ctx.comp.get(p.id), desdeP = dataDe(p.atualizadoEm || p.criadoEm) || hoje, demo = !!p.demo;
      if (r && (!r.faixa || r.cor !== 'verde')) {
        add({ tipo: 'cad_individual', alvo: p.id, pessoaId: p.id, familiaId: p.familiaId, desde: desdeP, vence: null, demo: demo,
          detalhe: r.faixa ? r.exibido + '% (' + r.cor + ') — ' + (r.pendentes.length + r.condicionaisPendentes.length) + ' campo(s) pendente(s)' : (r.aviso || 'Faixa etária indefinida') });
      } else if (r && (r.pendentes.length || r.condicionaisPendentes.length)) {
        add({ tipo: 'cad_dados', alvo: p.id, pessoaId: p.id, familiaId: p.familiaId, desde: desdeP, vence: null, demo: demo,
          detalhe: 'Pendente: ' + r.pendentes.concat(r.condicionaisPendentes).map(function (c) { return c.n + '. ' + c.rotulo.replace('Família — ', ''); }).join(', ') });
      }
      var falta = [];
      var telAplica = r && r.campos && r.campos[23] && r.campos[23].status !== 'nsa' && r.campos[23].status !== 'indefinido';
      if (telAplica && C.validarCampo({ tipo: 'telefone' }, p.telefone) !== null) falta.push('telefone');
      if (!f.endereco || !f.numero || !f.bairro) falta.push('endereço');
      if (falta.length) add({ tipo: 'contato', alvo: p.id, pessoaId: p.id, familiaId: p.familiaId, desde: desdeP, vence: null, demo: demo, detalhe: 'Ausente ou inválido: ' + falta.join(' e ') });
      var meses = cfg.mesesAtualizacao || 12, ref = dataDe(p.atualizadoEm || p.criadoEm);
      if (ref && addMeses(ref, meses) < hoje) add({ tipo: 'cad_desatualizado', alvo: p.id, pessoaId: p.id, familiaId: p.familiaId, desde: addMeses(ref, meses), vence: null, demo: demo, detalhe: 'Última atualização em ' + ref.split('-').reverse().join('/'), regra: 'Sem atualização há mais de ' + meses + ' meses (Configurações).' });
    });
    var CF = C.CAMPOS.filter(function (c) { return c.escopo === 'familia'; });
    famAtivas.forEach(function (f) {
      var falta = CF.filter(function (c) { return C.validarCampo(c, f[c.chave]) !== null; }).map(function (c) { return c.rotulo.replace('Família — ', ''); });
      if (!f.responsavelId) falta.unshift('responsável');
      if (!f.microarea) falta.unshift('microárea');
      if (falta.length) add({ tipo: 'cad_familiar', alvo: f.id, familiaId: f.id, desde: dataDe(f.atualizadoEm || f.criadoEm) || hoje, vence: null, demo: !!f.demo, detalhe: 'Pendente: ' + falta.slice(0, 6).join(', ') + (falta.length > 6 ? ' e mais ' + (falta.length - 6) : '') });
    });

    // ===== B. Linhas de cuidado =====
    var TL = ['l_gestante', 'l_has', 'l_dm', 'l_crianca', 'l_tuberculose', 'l_hanseniase', 'l_saude_mental', 'l_idoso', 'l_acamado'];
    TL.forEach(function (tipo) {
      var t = TIPOS[tipo], pz = prazoDe(t.prazo, cfg);
      var temAlguem = ativos.some(function (p) { return pertence(p, t.linha, hoje); });
      if (!pz) { if (temAlguem) naoConfigurados.push(tipo); return; }
      ativos.forEach(function (p) {
        if (!pertence(p, t.linha, hoje)) return;
        var u = ultP[p.id], venc;
        if (u) { venc = addDias(u, pz + 1); if (venc > hoje) return; }
        else venc = dataDe(p.criadoEm) || hoje;
        add({ tipo: tipo, alvo: p.id, pessoaId: p.id, familiaId: p.familiaId, desde: venc, vence: venc, demo: !!p.demo, linha: t.linha === 'crianca2' ? 'crianca' : t.linha,
          detalhe: u ? 'Última visita realizada em ' + u.split('-').reverse().join('/') : 'Nenhuma visita realizada registrada',
          regra: 'Sem visita realizada com esta pessoa há mais de ' + pz + ' dias (prazo configurado pela equipe).' });
      });
    });
    var pzF = prazoDe('familia', cfg);
    if (pzF) famAtivas.forEach(function (f) {
      var u = ultF[f.id], venc;
      if (u) { venc = addDias(u, pzF + 1); if (venc > hoje) return; } else venc = dataDe(f.criadoEm) || hoje;
      add({ tipo: 'familia_sem_visita', alvo: f.id, familiaId: f.id, desde: venc, vence: venc, demo: !!f.demo,
        detalhe: u ? 'Última visita realizada em ' + u.split('-').reverse().join('/') : 'Nenhuma visita realizada registrada', regra: 'Família sem visita realizada há mais de ' + pzF + ' dias (prazo configurado).' });
    });

    // ===== C/D. Agenda e visitas =====
    var dias = cfg.diasProximos > 0 ? +cfg.diasProximos : 2, limite = addDias(hoje, dias);
    var reag = {};
    function candReag(fid, c) { var at = reag[fid]; c.n = (at ? at.n : 0) + 1; if (!at || c.ref > at.ref) reag[fid] = c; else at.n = c.n; }
    var agenda = ctx.agenda || [];
    agenda.forEach(function (a) {
      if (!a.data) return;
      var ehVis = CAT_VISITA.indexOf(a.categoria) >= 0, base = { alvo: a.id, agendaId: a.id, pessoaId: a.pessoaId || null, familiaId: a.familiaId || null, demo: !!a.demo };
      var det = (a.titulo || '') + (a.hora ? ' às ' + a.hora : '');
      if (a.situacao === 'Agendado') {
        if (a.data < hoje) add(Object.assign(base, { tipo: ehVis ? 'v_atrasada' : 'a_atrasada', desde: addDias(a.data, 1), vence: a.data, detalhe: det + ' — previsto para ' + a.data.split('-').reverse().join('/') }));
        else if (a.data === hoje) add(Object.assign(base, { tipo: a.categoria === 'retorno' ? 'a_retorno_hoje' : (ehVis ? 'v_agendada_hoje' : 'a_hoje'), desde: a.data, vence: a.data, detalhe: det }));
        else if (a.data <= limite) {
          if (a.categoria === 'retorno') add(Object.assign(base, { tipo: 'v_retorno_programado', desde: dataDe(a.criadoEm) || hoje, vence: a.data, detalhe: det + ' — ' + a.data.split('-').reverse().join('/') }));
          else if (!ehVis) add(Object.assign(base, { tipo: 'a_proximo', desde: dataDe(a.criadoEm) || hoje, vence: a.data, detalhe: det + ' — ' + a.data.split('-').reverse().join('/') }));
        }
      } else if (a.situacao === 'Não realizado' && ehVis && !a.reagendadoPara && a.familiaId) {
        candReag(a.familiaId, { ref: a.data + ' ' + (a.hora || '00:00'), data: a.data, hora: a.hora, agendaId: a.id, pessoaId: a.pessoaId || null, demo: !!a.demo, detalhe: det + ' — não realizado em ' + a.data.split('-').reverse().join('/'), ignorar: a.id });
      }
    });
    var tent = Array.isArray(cfg.tentativasReagendar) ? cfg.tentativasReagendar : TENTATIVAS_PADRAO;
    (ctx.visitas || []).forEach(function (v) {
      if (tent.indexOf(v.situacao) < 0 || !v.data) return;
      var f = getF(v.familiaId); if (!f || (f.situacao || 'Ativa') !== 'Ativa') return;
      if (v.agendaId) { var ag = agenda.filter(function (a) { return a.id === v.agendaId; })[0]; if (ag && ag.situacao === 'Não realizado' && !ag.reagendadoPara) return; } // já coberta pelo compromisso
      candReag(v.familiaId, { ref: v.data + ' ' + (v.hora || '00:00'), data: v.data, hora: v.hora, visitaId: v.id, pessoaId: (v.pessoaIds || [])[0] || null, demo: !!v.demo,
        detalhe: v.situacao + ' em ' + v.data.split('-').reverse().join('/') + (v.hora ? ' às ' + v.hora : ''), ignorar: null });
    });
    // Uma única pendência "reagendar" por família: a tentativa mais recente ainda sem retorno
    Object.keys(reag).forEach(function (fid) {
      var c = reag[fid];
      if (resolvidoDepois(fid, c.data, c.hora, c.ignorar)) return;
      add({ tipo: 'v_reagendar', alvo: fid, familiaId: fid, pessoaId: c.pessoaId, agendaId: c.agendaId || null, visitaId: c.visitaId || null, desde: c.data, vence: null, demo: c.demo,
        detalhe: c.detalhe + (c.n > 1 ? ' (' + c.n + ' tentativas sem sucesso)' : '') });
    });
    function resolvidoDepois(famId, data, hora, ignorarAgendaId) {
      var ref = data + ' ' + (hora || '00:00');
      var visita = (ctx.visitas || []).some(function (x) { return x.familiaId === famId && x.situacao === 'Visita realizada' && (x.data + ' ' + (x.hora || '23:59')) > ref; });
      var novo = agenda.some(function (a) { return a.id !== ignorarAgendaId && a.familiaId === famId && CAT_VISITA.indexOf(a.categoria) >= 0 && (a.situacao === 'Agendado' || a.situacao === 'Concluído') && a.data >= data; });
      return visita || novo;
    }

    // ===== Observações manuais e estados =====
    var resolvidas = [];
    (ctx.estados || new Map()).forEach(function (st, k) {
      if (st.origem === 'manual') {
        if (st.status === 'resolvida') resolvidas.push(Object.assign({ key: k, tipo: 'manual', cat: 'manual' }, st));
        else add({ key: k, tipo: 'manual', alvo: k, origem: 'manual', titulo: st.titulo, detalhe: st.detalhe || '', nivel: st.nivel || 'atencao', pessoaId: st.pessoaId || null, familiaId: st.familiaId || null,
          desde: dataDe(st.criadoEm) || hoje, vence: st.prazo || null, justificativas: st.justificativas || [], demo: !!st.demo });
      } else if (st.status === 'resolvida') {
        resolvidas.push(Object.assign({ key: k }, st));
      }
    });
    abertas = abertas.filter(function (p) {
      var st = ctx.estados && ctx.estados.get(p.key);
      if (st && st.origem !== 'manual') { p.justificativas = st.justificativas || []; if (st.status === 'resolvida') return false; }
      return true;
    });
    abertas.sort(function (a, b) {
      return (ORDEM_NIVEL[a.nivel] - ORDEM_NIVEL[b.nivel]) || (b.atrasada - a.atrasada) || String(a.vence || '9999').localeCompare(String(b.vence || '9999')) || a.titulo.localeCompare(b.titulo);
    });
    resolvidas.sort(function (a, b) { return String(b.resolvidaEm || '').localeCompare(String(a.resolvidaEm || '')); });
    return { abertas: abertas, resolvidas: resolvidas, naoConfigurados: naoConfigurados, contagens: contar(abertas) };
  }

  function pertence(p, linha, hoje) {
    var c = p.condicoes || {}, i = idade(p.data_nascimento, hoje);
    if (linha === 'crianca2') return i != null && i >= 0 && i < 2;
    if (linha === 'idoso') return i != null && i >= 60;
    return !!c[linha];
  }
  function contar(l) {
    var c = { urgentes: 0, hoje: 0, atrasadas: 0, cadastro: 0, linhas: 0, reagendar: 0, total: l.length };
    l.forEach(function (p) {
      if (p.nivel === 'alta') c.urgentes++;
      if (p.hoje) c.hoje++;
      if (p.atrasada) c.atrasadas++;
      if (p.cat === 'cadastro' && p.tipo !== 'cad_desatualizado') c.cadastro++;
      if (p.cat === 'linha') c.linhas++;
      if (p.tipo === 'v_reagendar') c.reagendar++;
    });
    return c;
  }
  var CARDS = [
    ['urgentes', 'Pendências urgentes', function (p) { return p.nivel === 'alta'; }],
    ['hoje', 'Pendências de hoje', function (p) { return p.hoje; }],
    ['atrasadas', 'Pendências atrasadas', function (p) { return p.atrasada; }],
    ['cadastro', 'Cadastros incompletos', function (p) { return p.cat === 'cadastro' && p.tipo !== 'cad_desatualizado'; }],
    ['linhas', 'Acompanhamentos pendentes', function (p) { return p.cat === 'linha'; }],
    ['reagendar', 'Visitas para reagendar', function (p) { return p.tipo === 'v_reagendar'; }]
  ];

  var API = { NIVEIS: NIVEIS, CATS: CATS, TIPOS: TIPOS, CARDS: CARDS, TENTATIVAS_PADRAO: TENTATIVAS_PADRAO, CAT_VISITA: CAT_VISITA,
    calcular: calcular, chave: chave, nivelDe: nivelDe, dataDe: dataDe, addDias: addDias };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.ACSPendencias = API;
})(typeof window !== 'undefined' ? window : this);
