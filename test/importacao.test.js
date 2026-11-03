// Testes do motor de importação (layout VitaCare "Lista de Famílias"), com dados 100% fictícios
const test = require('node:test');
const assert = require('node:assert');
const I = require('../src/importacao.js');

function arquivo() {
  return [
    ['Lista de Famílias', '', '', '', ''],
    ['Área:', '9999 - EQUIPE TESTE', '', '', ''],
    ['Micro Área: ', '01', '', '', ''],
    ['Extraído: ', '03.11.2026', '', '', ''],
    ['Número de Família (Número interno de Família)', 'Estado', 'Nome', 'Nome Logradouro (Endereço/Número/Complemento)', ''],
    ['100000000001', '', '(10000000000101) ANA FICTICIA SILVA', 'RUA DAS FLORES FICTICIA, 10, CASA 01', ''],
    ['', '', '(10000000000102) BRUNO FICTICIO SILVA', '', ''],
    ['', 'Óbito', '(10000000000103) CARLOS FICTICIO SILVA', '', ''],
    ['100000000002 ( 1 )', '', '(10000000000204) DANIELA FICTICIA SOUZA', 'RUA DAS FLORES FICTICIA, 22', ''],
    ['', '', '(10000000000201) EDUARDO FICTICIO SOUZA', '', ''],
    ['10000000003', 'Mudou-se', '(1000000000301) FABIANA FICTICIA LIMA', 'TRAVESSA TESTE, 5, FUNDOS, APTO 2', ''],
    ['100000000004', 'Óbito', '(10000000000401) GERALDO FICTICIO', '', ''],
    ['', '', '', '', ''],
    ['Processado por computador. Sistema de teste', '', '', '', '']
  ];
}
let n = 0; const novoId = p => p + '_' + (++n);

test('reconhece o layout do VitaCare e lê o cabeçalho', () => {
  const r = I.reconhecer(arquivo());
  assert.strictEqual(r.tipo, 'vitacare-familias');
  assert.deepStrictEqual(r.meta, { titulo: 'Lista de Famílias', area: '9999 - EQUIPE TESTE', microarea: '01', extraido: '2026-11-03' });
  assert.strictEqual(I.reconhecer([['Nome', 'Idade'], ['x', '1']]), null);
  assert.ok(I.ler([['a', 'b']]).erro);
});

test('monta famílias e moradores, com código VitaCare e situação', () => {
  const l = I.ler(arquivo());
  assert.strictEqual(l.familias.length, 4);
  assert.deepStrictEqual(l.familias.map(f => f.pessoas.length), [3, 2, 1, 1]);
  const f1 = l.familias[0];
  assert.strictEqual(f1.numero, '100000000001');
  assert.deepStrictEqual([f1.endereco, f1.numero_casa, f1.complemento], ['RUA DAS FLORES FICTICIA', '10', 'CASA 01']);
  assert.strictEqual(f1.pessoas[0].vitacareId, '10000000000101');
  assert.strictEqual(f1.pessoas[0].seq, '01');
  assert.strictEqual(f1.pessoas[0].nome, 'ANA FICTICIA SILVA');
  assert.strictEqual(f1.pessoas[2].situacao, 'Óbito');
  assert.strictEqual(l.familias[1].numero, '100000000002', 'remove o "( 1 )" do número');
  assert.strictEqual(l.familias[2].pessoas[0].situacao, 'Mudou-se', 'Estado na linha da família é da pessoa');
  assert.strictEqual(l.familias[2].complemento, 'FUNDOS, APTO 2');
  assert.ok(l.avisos.some(a => /sem endereço/.test(a.msg)));
  assert.strictEqual(l.erros.length, 0, 'rodapé do relatório é ignorado');
});

test('responsável: final 01 ativo; senão o primeiro ativo; família só com óbito fica sem responsável', () => {
  const l = I.ler(arquivo());
  assert.strictEqual(I.escolherResponsavel(l.familias[0], 'seq01').nome, 'ANA FICTICIA SILVA');
  assert.strictEqual(I.escolherResponsavel(l.familias[1], 'seq01').nome, 'EDUARDO FICTICIO SOUZA');
  assert.strictEqual(I.escolherResponsavel(l.familias[1], 'primeiro').nome, 'DANIELA FICTICIA SOUZA');
  assert.strictEqual(I.escolherResponsavel(l.familias[3], 'seq01'), null);
});

test('plano da primeira importação cria tudo, com códigos F sequenciais e bairro/CEP por rua', () => {
  const l = I.ler(arquivo());
  const p = I.planejar(l, { familias: [], pessoas: [] }, { novoId, proximoNumeroCodigo: 7, hoje: '2026-11-03', unidade: 'UBS', equipe: 'EQ', porRua: { 'RUA DAS FLORES FICTICIA': { bairro: 'Centro', cep: '20000-001' } } });
  assert.deepStrictEqual(p.resumo.familias, { criar: 4, atualizar: 0, manter: 0 });
  assert.deepStrictEqual(p.resumo.pessoas, { criar: 7, atualizar: 0, manter: 0 });
  assert.deepStrictEqual(p.familias.map(f => f.doc.codigo), ['F0007', 'F0008', 'F0009', 'F0010']);
  const f1 = p.familias[0].doc;
  assert.strictEqual(f1.bairro, 'Centro'); assert.strictEqual(f1.cep, '20000001'); assert.strictEqual(f1.microarea, '01');
  assert.strictEqual(f1.vitacare.numero, '100000000001'); assert.strictEqual(f1.vitacare.area, '9999 - EQUIPE TESTE');
  const ana = p.pessoas.find(x => x.doc.nome === 'ANA FICTICIA SILVA');
  assert.strictEqual(f1.responsavelId, ana.id);
  assert.strictEqual(ana.doc.familiaId, p.familias[0].id);
  assert.strictEqual(p.familias[2].doc.bairro, '', 'rua sem bairro informado fica vazia');
  assert.deepStrictEqual(p.resumo.situacoes, { 'Óbito': 2, 'Mudou-se': 1 });
  assert.strictEqual(p.resumo.semResponsavel, 2);
});

test('reimportar não duplica, preserva correções do ACS e só aplica o que mudou no VitaCare', () => {
  const l = I.ler(arquivo());
  const p1 = I.planejar(l, { familias: [], pessoas: [] }, { novoId, proximoNumeroCodigo: 1 });
  const fams = p1.familias.map(x => Object.assign({ id: x.id }, x.doc)), pes = p1.pessoas.map(x => Object.assign({ id: x.id }, x.doc));
  // ACS corrigiu o nome de Bruno e o complemento da família 1; marcou Eduardo como Mudou-se
  pes.find(x => x.nome === 'BRUNO FICTICIO SILVA').nome = 'Bruno Fictício da Silva';
  fams[0].complemento = 'Casa 1 (fundos)';
  pes.find(x => x.nome === 'EDUARDO FICTICIO SOUZA').situacao = 'Mudou-se';
  const p2 = I.planejar(l, { familias: fams, pessoas: pes }, { novoId, proximoNumeroCodigo: 5 });
  assert.deepStrictEqual(p2.resumo.familias, { criar: 0, atualizar: 0, manter: 4 });
  assert.deepStrictEqual(p2.resumo.pessoas, { criar: 0, atualizar: 0, manter: 7 });
  assert.strictEqual(p2.pessoas.find(x => x.doc.vitacareId === '10000000000102').doc.nome, 'Bruno Fictício da Silva');
  assert.strictEqual(p2.familias[0].doc.complemento, 'Casa 1 (fundos)');
  // novo arquivo: endereço mudou no VitaCare, novo morador, óbito novo
  const a = arquivo();
  a[5][3] = 'RUA NOVA FICTICIA, 99, CASA 01';
  a.splice(7, 0, ['', '', '(10000000000105) HELENA FICTICIA SILVA', '', '']);
  a[10][1] = 'Óbito'; // Eduardo: VitaCare passou a registrar óbito
  const p3 = I.planejar(I.ler(a), { familias: fams, pessoas: pes }, { novoId, proximoNumeroCodigo: 5 });
  assert.strictEqual(p3.resumo.pessoas.criar, 1);
  assert.deepStrictEqual(p3.familias[0].mudou.sort(), ['complemento', 'endereco', 'numero']);
  assert.strictEqual(p3.familias[0].doc.endereco, 'RUA NOVA FICTICIA');
  const edu = p3.pessoas.find(x => x.doc.vitacareId === '10000000000201');
  assert.deepStrictEqual(edu.mudou, ['situacao']);
  assert.strictEqual(edu.doc.situacao, 'Óbito');
  // Carlos (óbito) não volta a "Ativo" se sumir o Estado — a importação nunca reativa
  assert.strictEqual(p3.pessoas.find(x => x.doc.vitacareId === '10000000000103').doc.situacao, 'Óbito');
});

test('relata quem não está mais no arquivo, sem apagar', () => {
  const l = I.ler(arquivo());
  const p1 = I.planejar(l, { familias: [], pessoas: [] }, { novoId, proximoNumeroCodigo: 1 });
  const fams = p1.familias.map(x => Object.assign({ id: x.id }, x.doc)), pes = p1.pessoas.map(x => Object.assign({ id: x.id }, x.doc));
  const a = arquivo(); a.splice(6, 1); a.splice(10, 1);
  const p2 = I.planejar(I.ler(a), { familias: fams, pessoas: pes }, { novoId, proximoNumeroCodigo: 9 });
  assert.deepStrictEqual(p2.foraDoArquivo, { familias: 1, pessoas: 1 });
});

test('separação de endereço', () => {
  assert.deepStrictEqual(I.separarEndereco('RUA X, 12A, BLOCO 2, AP 101'), { endereco: 'RUA X', numero: '12A', complemento: 'BLOCO 2, AP 101' });
  assert.deepStrictEqual(I.separarEndereco('RUA X, S/N'), { endereco: 'RUA X', numero: 'S/N', complemento: '' });
  assert.deepStrictEqual(I.separarEndereco('RUA X, LOTE 3'), { endereco: 'RUA X', numero: '', complemento: 'LOTE 3' });
  assert.deepStrictEqual(I.separarEndereco(''), { endereco: '', numero: '', complemento: '' });
});
