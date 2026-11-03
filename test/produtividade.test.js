// Testes do motor de produtividade — node --test test/produtividade.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../src/produtividade.js');

const HOJE = '2026-11-02'; // segunda-feira

const pessoas = new Map([
  ['a', { id: 'a', data_nascimento: '1960-01-01', condicoes: { has: true, dm: true } }],     // 66 anos: HAS, DM, idoso
  ['b', { id: 'b', data_nascimento: '2022-05-01', condicoes: {} }],                          // criança
  ['c', { id: 'c', data_nascimento: '1990-03-03', condicoes: {} }],                          // adulto sem linha
  ['d', { id: 'd', data_nascimento: '1995-03-03', condicoes: { gestante: true, tuberculose: true } }],
  ['e', { id: 'e', data_nascimento: '1980-03-03', condicoes: { hanseniase: true, saude_mental: true, acamado: true } }]
]);
const familias = new Map([['F1', { microarea: '01' }], ['F2', { microarea: '02' }]]);
const ctx = { pessoas, familias };
const V = (id, data, situacao, fam, pes, extra) => Object.assign({ id, data, situacao, familiaId: fam, pessoaIds: pes }, extra || {});

const visitas = [
  V('v1', '2026-11-02', 'Visita realizada', 'F1', ['a', 'b']),          // hoje, 1 visita, 2 moradores
  V('v2', '2026-11-01', 'Visita realizada', 'F2', ['c']),               // domingo (demais)
  V('v3', '2026-10-30', 'Morador ausente', 'F1', []),                    // tentativa
  V('v4', '2026-10-28', 'Recusa', 'F2', []),
  V('v5', '2026-10-15', 'Visita realizada', 'F2', ['d']),
  V('v6', '2026-10-10', 'Imóvel fechado', 'F1', []),
  V('v7', '2026-09-30', 'Endereço não localizado', 'F2', []),
  V('v8', '2026-10-20', 'Visita realizada', 'F1', ['e']),
  V('v9', '2026-10-21', 'Visita reagendada', 'F1', [])
];

test('períodos: hoje, 7 dias, 30 dias, mês atual, mês anterior, personalizado', () => {
  assert.deepEqual(P.periodo('hoje', HOJE), { de: '2026-11-02', ate: '2026-11-02', rotulo: 'Hoje' });
  assert.equal(P.periodo('7d', HOJE).de, '2026-10-27');
  assert.equal(P.periodo('30d', HOJE).de, '2026-10-04');
  assert.deepEqual([P.periodo('mes', HOJE).de, P.periodo('mes', HOJE).ate], ['2026-11-01', '2026-11-30']);
  assert.deepEqual([P.periodo('mes_anterior', HOJE).de, P.periodo('mes_anterior', HOJE).ate], ['2026-10-01', '2026-10-31']);
  assert.deepEqual([P.periodo('mes_anterior', '2027-01-15').de, P.periodo('mes_anterior', '2027-01-15').ate], ['2026-12-01', '2026-12-31']);
  const p = P.periodo('personalizado', HOJE, '2026-10-31', '2026-10-01');
  assert.deepEqual([p.de, p.ate], ['2026-10-01', '2026-10-31']); // inverte se necessário
  assert.equal(P.periodo('semana', HOJE).de, '2026-11-02'); // segunda
  assert.equal(P.inicioSemana('2026-11-01'), '2026-10-26'); // domingo pertence à semana anterior
});

test('tentativas não contam como realizadas', () => {
  const r = P.resumo(visitas, ctx);
  assert.equal(r.realizadas, 4);
  assert.equal(r.tentativas, 5);
  assert.equal(r.porSituacao['Morador ausente'], 1);
  assert.equal(r.porSituacao['Visita reagendada'], 1);
});

test('visita com vários moradores é um único registro', () => {
  const r = P.resumo([visitas[0]], ctx);
  assert.equal(r.realizadas, 1);
  assert.equal(r.pessoasAtendidas, 2);
  assert.equal(r.familiasVisitadas, 1);
});

test('linhas de cuidado: visita conta 1x no total e 1x em cada linha', () => {
  const r = P.resumo([visitas[0]], ctx);
  assert.equal(r.realizadas, 1);
  assert.deepEqual([r.porLinha.has, r.porLinha.dm, r.porLinha.idoso, r.porLinha.crianca, r.porLinha.demais], [1, 1, 1, 1, 0]);
  const soma = Object.values(r.porLinha).reduce((a, b) => a + b, 0);
  assert.ok(soma > r.realizadas, 'soma por linha pode ser maior que o total, sem duplicar o total');
});

test('todas as linhas: TB, hanseníase, saúde mental, acamados, gestantes, demais', () => {
  const r = P.resumo(visitas, ctx);
  assert.equal(r.porLinha.tuberculose, 1);
  assert.equal(r.porLinha.gestante, 1);
  assert.equal(r.porLinha.hanseniase, 1);
  assert.equal(r.porLinha.saude_mental, 1);
  assert.equal(r.porLinha.acamado, 1);
  assert.equal(r.porLinha.demais, 1); // v2: adulto sem linha
});

test('linhas gravadas na visita têm prioridade (inclusive lista vazia = demais)', () => {
  assert.deepEqual(P.linhasDaVisita({ linhas: ['has'], pessoaIds: ['b'], data: HOJE }, pessoas), ['has']);
  assert.deepEqual(P.linhasDaVisita({ linhas: [], pessoaIds: ['a'], data: HOJE }, pessoas), ['demais']);
  assert.deepEqual(P.linhasDaVisita({ pessoaIds: ['a'], data: HOJE }, pessoas).sort(), ['dm', 'has', 'idoso']);
});

test('criança/idoso pela idade na data da visita', () => {
  const p = { data_nascimento: '2014-11-10', condicoes: {} };
  assert.ok(P.linhasDaPessoa(p, '2026-11-09').includes('crianca')); // 11 anos
  assert.ok(!P.linhasDaPessoa(p, '2026-11-10').includes('crianca')); // 12 anos
  assert.ok(P.linhasDaPessoa({ data_nascimento: '1966-11-02' }, '2026-11-02').includes('idoso'));
});

test('filtros combinados: período + microárea + linha + paciente + situação', () => {
  const per = P.periodo('mes_anterior', HOJE);
  const f = (x) => P.filtrar(visitas, Object.assign({ de: per.de, ate: per.ate }, x), ctx).map(v => v.id);
  assert.deepEqual(f({}), ['v3', 'v4', 'v5', 'v6', 'v8', 'v9']);
  assert.deepEqual(f({ situacao: 'realizadas' }), ['v5', 'v8']);
  assert.deepEqual(f({ situacao: 'tentativas' }), ['v3', 'v4', 'v6', 'v9']);
  assert.deepEqual(f({ micro: '02' }), ['v4', 'v5']);
  assert.deepEqual(f({ linha: 'gestante' }), ['v5']);
  assert.deepEqual(f({ pessoaId: 'e' }), ['v8']);
  assert.deepEqual(f({ micro: '01', situacao: 'Recusa' }), []);
});

test('fictícios podem ser excluídos', () => {
  const vs = [V('x', HOJE, 'Visita realizada', 'F1', ['c'], { demo: true }), V('y', HOJE, 'Visita realizada', 'F1', ['c'])];
  assert.equal(P.filtrar(vs, { incluirDemo: false }, ctx).length, 1);
  assert.equal(P.resumo(vs, ctx).demo, 1);
});

test('ACS responsável: acsId ou autor do histórico em registros antigos', () => {
  assert.equal(P.acsDaVisita({ acsId: 'u1' }), 'u1');
  assert.equal(P.acsDaVisita({ historico: [{ por: 'u9' }] }), 'u9');
  assert.equal(P.acsDaVisita({}), null);
});

test('meta: exemplo do enunciado (120 / 85 → 35 restantes, 70,83%)', () => {
  const m = P.calcularMeta(120, 85, '2026-10', HOJE, 'corridos');
  assert.equal(m.restantes, 35);
  assert.equal(P.fmtPct(m.percentual), '70,83%');
  assert.equal(m.projecao, 85);                    // mês encerrado: projeção = realizado
  assert.equal(m.diasDecorridos, 31);
  assert.ok(Math.abs(m.mediaDiaria - 85 / 31) < 1e-9);
});

test('meta no mês corrente: média e projeção pelo ritmo (dias corridos e úteis)', () => {
  const c = P.calcularMeta(120, 10, '2026-11', '2026-11-10', 'corridos');
  assert.equal(c.diasDecorridos, 10); assert.equal(c.diasTotais, 30);
  assert.equal(c.mediaDiaria, 1); assert.equal(c.projecao, 30); assert.equal(c.projecaoAtinge, false);
  const u = P.calcularMeta(120, 14, '2026-11', '2026-11-10', 'uteis'); // 02–06 e 09–10 = 7 dias úteis
  assert.equal(u.diasDecorridos, 7); assert.equal(u.diasTotais, 21);
  assert.equal(u.mediaDiaria, 2); assert.equal(u.projecao, 42);
  assert.equal(u.restantes, 106);
  assert.ok(Math.abs(u.necessarioPorDia - 106 / 14) < 1e-9);
});

test('meta: sem meta, acima da meta, mês futuro', () => {
  const s = P.calcularMeta(null, 5, '2026-11', HOJE, 'uteis');
  assert.equal(s.restantes, null); assert.equal(s.percentual, null);
  const a = P.calcularMeta(100, 130, '2026-10', HOJE, 'uteis');
  assert.equal(a.restantes, 0); assert.equal(P.fmtPct(a.percentual), '130,00%');
  const f = P.calcularMeta(100, 0, '2026-12', HOJE, 'uteis');
  assert.equal(f.diasDecorridos, 0); assert.equal(f.mediaDiaria, 0);
});

test('meta do mês lida do histórico', () => {
  const doc = { meses: { '2026-11': { valor: 120, historico: [{ valor: 100 }, { valor: 120 }] } } };
  assert.equal(P.metaDoMes(doc, '2026-11'), 120);
  assert.equal(P.metaDoMes(doc, '2026-10'), null);
});

test('séries: diária, semanal, mensal e acumulado', () => {
  const real = visitas.filter(P.ehRealizada);
  const r = P.resumo(real, ctx);
  const d = P.serieDiaria(r.porDia, '2026-10-30', '2026-11-02');
  assert.deepEqual(d, [['2026-10-30', 0], ['2026-10-31', 0], ['2026-11-01', 1], ['2026-11-02', 1]]);
  const s = P.serieSemanal(r.porDia, '2026-10-26', '2026-11-08');
  assert.deepEqual(s, [['2026-10-26', 1], ['2026-11-02', 1]]);
  assert.deepEqual(P.serieMensal(real, '2026-11', 3), [['2026-09', 0], ['2026-10', 2], ['2026-11', 2]]);
  const ac = P.acumuladoMes(real, '2026-10', 20);
  assert.equal(ac.length, 20); assert.equal(ac[14], 1); assert.equal(ac[19], 2);
});
