
// ============================================================================
// BUSCA RÁPIDA (v3)
// ============================================================================
var BU = window.ACSBusca;
var PLACEHOLDER_BUSCA = 'Pesquisar morador, família ou endereço...';
S.busca = { q: '', micro: '', linha: '', faixa: '', sit: 'Ativo', limite: 30 };

function filtroBuscaFn() {
  var b = S.busca, hoje = hojeISO();
  return function (p) {
    var f = S.familias.get(p.familiaId);
    if (b.sit && (p.situacao || 'Ativo') !== b.sit) return false;
    if (b.micro && (!f || f.microarea !== b.micro)) return false;
    if (b.faixa && faixaIdade(idade(p)) !== b.faixa) return false;
    if (b.linha) {
      var l = P.linhasDaPessoa(p, hoje);
      if (b.linha === 'demais' ? l.length : l.indexOf(b.linha) < 0) return false;
    }
    return true;
  };
}
function destacarNome(nome, q) {
  var toks = BU.norm(q).split(/[^a-z0-9]+/).filter(function (t) { return t.length >= 1 && !/^\d+$/.test(t); });
  return String(nome || '').split(/(\s+)/).map(function (w) {
    var nw = BU.norm(w), tok = toks.filter(function (t) { return nw.indexOf(t) === 0; }).sort(function (a, b) { return b.length - a.length; })[0];
    return tok ? '<mark>' + esc(w.slice(0, tok.length)) + '</mark>' + esc(w.slice(tok.length)) : esc(w);
  }).join('');
}
function viewBusca() {
  var b = S.busca;
  var h = '<div class="buscabox"><div class="buscacampo">' + ico('busca', 'width="20" height="20" aria-hidden="true"') +
    '<input type="search" id="buscaInput" placeholder="' + PLACEHOLDER_BUSCA + '" value="' + esc(b.q) + '" autocomplete="off" enterkeyhint="search" aria-label="' + PLACEHOLDER_BUSCA + '"></div>';
  h += '<div class="filtros mt">' + selectHtml('micro', microareas(), b.micro, 'Todas as microáreas', 'data-bf="micro"') +
    selectHtml('linha', P.LINHAS, b.linha, 'Todas as linhas de cuidado', 'data-bf="linha"') +
    selectHtml('faixa', FAIXAS, b.faixa, 'Todas as idades', 'data-bf="faixa"') +
    selectHtml('sit', SITUACOES_PESSOA, b.sit, 'Todas as situações', 'data-bf="sit"') + '</div></div>';
  return h + '<div id="buscaRes" aria-live="polite">' + resultadosBusca() + '</div>';
}
function resultadosBusca() {
  var b = S.busca, q = b.q.trim();
  if (q.length < 2) {
    return '<div class="vazio"><strong>Digite ao menos 2 caracteres</strong>Você pode procurar por nome (mesmo incompleto), CPF, CNS, data de nascimento (dd/mm/aaaa), telefone, rua, número, bairro, código da família (ex.: F0001) ou microárea.</div>';
  }
  var t0 = performance.now();
  var res = BU.buscar(q, Array.from(S.pessoas.values()), S.familias, { pessoasMap: S.pessoas, filtro: filtroBuscaFn() });
  var fams = (b.micro || b.linha || b.faixa) ? [] : BU.buscarFamilias(q, S.familias, S.pessoas).filter(function (x) { return x.campos.some(function (c) { return c === 'Família' || c === 'Responsável'; }); }).slice(0, 5);
  var ms = Math.round(performance.now() - t0);
  var h = '<p class="contagem">' + plural(res.length, 'morador encontrado', 'moradores encontrados') + (fams.length ? ' · ' + plural(fams.length, 'família', 'famílias') : '') + ' <span style="opacity:.6">(' + ms + ' ms)</span></p>';
  if (fams.length) {
    h += '<h3 class="subtit">Famílias</h3><div class="lista">' + fams.map(function (x) {
      var f = x.familia, mem = (derivados().membros.get(f.id) || []).length;
      return '<div class="rcard"><div class="rtop"><button class="linkbtn forte" data-act="abrirFamilia" data-id="' + f.id + '">' + esc(nomeFamilia(f)) + '</button>' + demoChip(f) + '</div><div class="vmeta">Microárea ' + esc(f.microarea || '—') + ' · ' + plural(mem, 'integrante', 'integrantes') + '</div><div class="vmeta">' + linkEndereco(f) + '</div>' +
        (f.telefone && numeroWhatsApp(f.telefone) ? '<div class="vmeta telwa-txt">' + esc(fmtTelefone(f.telefone)) + iconeWhatsApp(f.telefone) + '</div>' : '') +
        '<div class="btns mt"><button class="btn peq sec" data-act="abrirFamilia" data-id="' + f.id + '">Ficha familiar</button></div></div>';
    }).join('') + '</div><h3 class="subtit">Moradores</h3>';
  }
  if (!res.length) return h + '<div class="vazio"><strong>Nenhum morador encontrado</strong>Confira a grafia ou tente parte do nome, o CPF, o CNS ou o endereço.' + (b.micro || b.linha || b.faixa || b.sit ? ' Há filtros ativos.' : '') + '</div>';
  var D = derivados();
  h += '<div class="lista">' + res.slice(0, b.limite).map(function (r) {
    var p = r.pessoa, f = r.familia, i = idade(p), comp = D.comp.get(p.id);
    var tel = p.telefone && numeroWhatsApp(p.telefone) ? '<span class="telwa-txt">' + esc(fmtTelefone(p.telefone)) + iconeWhatsApp(p.telefone) + '</span>' : '<span class="contagem" style="margin:0">Sem telefone válido</span>';
    var chips = '<span class="chip">Encontrado por: ' + esc(r.campos.join(', ')) + '</span>';
    if (r.semelhante) chips += '<span class="chip" style="background:var(--amarelo-cl);color:var(--amarelo)">! Semelhante — confira o nome</span>';
    if (r.homonimo) chips += '<span class="chip" style="background:var(--amarelo-cl);color:var(--amarelo)">! Mesmo nome de outro morador — confira nascimento e família</span>';
    return '<div class="rcard"><div class="rtop"><button class="linkbtn forte" data-act="abrirPessoa" data-id="' + p.id + '">' + destacarNome(p.nome, q) + '</button>' + demoChip(p) + '<span style="margin-left:auto">' + (comp ? indicador(comp) : '') + '</span></div>' +
      '<div class="vmeta">' + (i != null ? plural(i, 'ano', 'anos') + ' · nasc. ' + fmtData(p.data_nascimento) : 'Nascimento não informado') + ' · ' + (f ? 'Família ' + esc(f.codigo) : 'Sem família') + ' · Microárea ' + esc((f && f.microarea) || '—') + ((p.situacao || 'Ativo') !== 'Ativo' ? ' · ' + esc(p.situacao) : '') + '</div>' +
      '<div class="vmeta">' + tel + '</div>' + (f ? '<div class="vmeta">' + linkEndereco(f) + '</div>' : '') +
      '<div class="chips" style="margin-top:6px">' + chips + '</div>' +
      '<div class="btns mt"><button class="btn peq" data-act="abrirPessoa" data-id="' + p.id + '">Cadastro</button>' + (f ? '<button class="btn peq sec" data-act="abrirFamilia" data-id="' + f.id + '">Família</button>' : '') + '<button class="btn peq sec" data-act="visHistPessoa" data-id="' + p.id + '">Visitas</button></div></div>';
  }).join('') + '</div>';
  if (res.length > b.limite) h += '<button class="btn sec mt" style="width:100%" data-act="buscaMais">Mostrar mais (' + (res.length - b.limite) + ')</button>';
  return h;
}
function atualizarResultadosBusca() { var el = $('#buscaRes'); if (el) el.innerHTML = resultadosBusca(); }
function focarBusca() { var i = $('#buscaInput'); if (i) { i.focus(); try { i.setSelectionRange(i.value.length, i.value.length); } catch (e) { } } }
function irParaBusca(q) {
  S.busca.q = q || ''; S.busca.limite = 30;
  irPara('busca');
  focarBusca();                 // síncrono: mantém o teclado aberto no celular
  setTimeout(focarBusca, 30);   // reforço após a renderização
}
var tmrBuscaRapida;
document.addEventListener('input', function (ev) {
  var t = ev.target;
  if (t.id === 'buscaInput') { S.busca.q = t.value; S.busca.limite = 30; clearTimeout(tmrBuscaRapida); tmrBuscaRapida = setTimeout(atualizarResultadosBusca, 90); }
  else if (t.id === 'buscaPainel' && t.value) { var v = t.value; t.value = ''; irParaBusca(S.busca.q + v); }
});
// Tocar no campo do painel já abre a busca (antes da primeira tecla, sem perder letras)
document.addEventListener('focusin', function (ev) {
  if (ev.target && ev.target.id === 'buscaPainel') irParaBusca(S.busca.q);
});
document.addEventListener('change', function (ev) {
  var k = ev.target.getAttribute && ev.target.getAttribute('data-bf');
  if (k) { S.busca[k] = ev.target.value; S.busca.limite = 30; atualizarResultadosBusca(); }
});
ACOES_VIS.buscaMais = function () { S.busca.limite += 30; atualizarResultadosBusca(); };
ACOES_VIS.abrirBusca = function () { irParaBusca(S.busca.q); };
