// Testes do motor da Busca Rápida — node --test test/busca.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const B = require('../src/busca.js');

const familias = new Map([
  ['f1', { id: 'f1', codigo: 'F0001', endereco: 'Rua das Acácias', numero: '120', bairro: 'Centro', microarea: '01', responsavelId: 'p1', telefone: '2133334444' }],
  ['f2', { id: 'f2', codigo: 'F0002', endereco: 'Travessa São João', numero: '7', bairro: 'Vila Nova', microarea: '02', responsavelId: 'p3' }]
]);
const P = [
  { id: 'p1', familiaId: 'f1', nome: 'Maria José da Silva', data_nascimento: '1980-05-10', cpf_dnv: { tipo: 'CPF', numero: '52998224725' }, cns: '700000000000005', telefone: '21998765432' },
  { id: 'p2', familiaId: 'f1', nome: 'João Pedro da Silva', data_nascimento: '2015-01-02' },
  { id: 'p3', familiaId: 'f2', nome: 'Ana Paula Souza', data_nascimento: '1990-12-25', telefone: '(21) 97777-1111' },
  { id: 'p4', familiaId: 'f2', nome: 'Daniela Souza', data_nascimento: '2001-07-07' },
  { id: 'p5', familiaId: 'f2', nome: 'Maria José da Silva', data_nascimento: '1955-03-03' } // homônima
];
const pm = new Map(P.map(p => [p.id, p]));
const ids = (q, o) => B.buscar(q, P, familias, Object.assign({ pessoasMap: pm }, o)).map(r => r.pessoa.id);

test('nome completo e incompleto, sem acento e sem caixa', () => {
  assert.deepEqual(ids('maria jose'), ['p1', 'p5']);
  assert.deepEqual(ids('MARIA JOSÉ DA SILVA').sort(), ['p1', 'p5']);
  const jo = B.buscar('joao', P, familias, { pessoasMap: pm });
  assert.equal(jo[0].pessoa.id, 'p2'); assert.deepEqual(jo[0].campos, ['Nome']);      // nome primeiro
  assert.ok(jo.slice(1).every(r => r.campos.includes('Endereço')));                   // depois quem mora na Tv. São João
  assert.deepEqual(ids('jo pe'), ['p2']);            // prefixos parciais
  assert.deepEqual(ids('dani'), ['p4']);
});
test('todas as palavras precisam casar (não mistura moradores)', () => {
  assert.deepEqual(ids('ana souza'), ['p3']);
  assert.deepEqual(ids('daniela silva'), []);
});
test('CPF, CNS e telefone (com ou sem máscara)', () => {
  assert.deepEqual(ids('529.982.247-25'), ['p1']);
  assert.deepEqual(ids('52998'), ['p1']);
  assert.deepEqual(ids('700000000000005'), ['p1']);
  assert.deepEqual(ids('(21) 99876-5432'), ['p1']);
  assert.deepEqual(ids('97777'), ['p3']);
});
test('data de nascimento em vários formatos', () => {
  assert.deepEqual(ids('25/12/1990'), ['p3']);
  assert.deepEqual(ids('25/12'), ['p3']);
  assert.deepEqual(ids('1990-12-25'), ['p3']);
  assert.deepEqual(ids('10/05/80'), ['p1']);
});
test('endereço, número, bairro, família e microárea', () => {
  assert.deepEqual(ids('acacias').sort(), ['p1', 'p2']);
  assert.deepEqual(ids('rua das acacias 120').sort(), ['p1', 'p2']);
  assert.deepEqual(ids('vila nova').sort(), ['p3', 'p4', 'p5']);
  assert.deepEqual(ids('F0002').sort(), ['p3', 'p4', 'p5']);
  assert.deepEqual(ids('sao joao 7').sort(), ['p3', 'p4', 'p5']);
  const r = B.buscar('01', P, familias, { pessoasMap: pm });
  assert.deepEqual(r.map(x => x.pessoa.id).sort(), ['p1', 'p2']);
  assert.ok(r[0].campos.includes('Microárea'));
  assert.deepEqual(ids('0002'), []); // número solto não vira código de família (evita ambiguidade com microárea)
});
test('semelhantes: 1 letra diferente, sempre depois dos exatos e marcados', () => {
  const r = B.buscar('Danyela', P, familias, { pessoasMap: pm });
  assert.equal(r.length, 1); assert.equal(r[0].pessoa.id, 'p4'); assert.equal(r[0].semelhante, true);
  assert.deepEqual(ids('Dani'), ['p4']);
  assert.equal(B.buscar('Daniela', P, familias, { pessoasMap: pm })[0].semelhante, false);
  assert.deepEqual(ids('xyzw'), []);
});
test('homônimos são sinalizados', () => {
  const r = B.buscar('maria jose da silva', P, familias, { pessoasMap: pm });
  assert.ok(r.every(x => x.homonimo));
  assert.ok(!B.buscar('ana paula', P, familias, { pessoasMap: pm })[0].homonimo);
});
test('campos que justificaram o resultado', () => {
  assert.deepEqual(B.buscar('52998224725', P, familias)[0].campos, ['CPF']);
  assert.ok(B.buscar('centro', P, familias)[0].campos.includes('Bairro'));
});
test('filtro adicional e busca de famílias', () => {
  assert.deepEqual(ids('silva', { filtro: p => p.data_nascimento < '1960' }), ['p5']);
  const f = B.buscarFamilias('F0001', familias, pm);
  assert.equal(f[0].familia.id, 'f1');
  assert.equal(B.buscarFamilias('vila nova', familias, pm)[0].familia.id, 'f2');
  assert.equal(B.buscarFamilias('ana paula', familias, pm)[0].familia.id, 'f2'); // pelo responsável
  assert.deepEqual(ids('ana paula'), ['p3']); // mas os outros moradores da casa não aparecem como pessoa
});
test('lev1', () => {
  assert.ok(B.lev1('daniela', 'danyela')); assert.ok(B.lev1('maria', 'mari')); assert.ok(!B.lev1('maria', 'mario1'));
});
