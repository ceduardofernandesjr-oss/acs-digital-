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
