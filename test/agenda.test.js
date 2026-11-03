// Testes do motor da Agenda Inteligente — node --test test/agenda.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('../src/agenda.js');
const HOJE = '2026-11-02'; // segunda

const itens = [
  { id: 'a1', categoria: 'visita', data: HOJE, hora: '09:00', situacao: 'Agendado' },
  { id: 'a2', categoria: 'retorno', data: '2026-11-04', hora: '10:00', situacao: 'Agendado' },
  { id: 'a3', categoria: 'retorno', data: '2026-10-30', situacao: 'Agendado' },        // atrasado
  { id: 'a4', categoria: 'reuniao', data: HOJE, hora: '14:00', situacao: 'Agendado' },
  { id: 'a5', categoria: 'visita', data: '2026-11-01', situacao: 'Concluído' },
  { id: 'a6', categoria: 'visita', data: HOJE, situacao: 'Cancelado' },
  { id: 'a7', categoria: 'administrativa', data: '2026-11-03', hora: '08:00', situacao: 'Agendado' },
  { id: 'a8', categoria: 'visita', data: '2026-11-20', situacao: 'Agendado' }
];

test('indicadores por período', () => {
  const r = A.indicadores(itens, '2026-10-27', '2026-11-08', HOJE);
  assert.deepEqual(r, { hoje: 2, visitasProgramadas: 2, retornos: 1, concluidas: 1, pendentes: 5, atrasados: 1 });
  const h = A.indicadores(itens, HOJE, HOJE, HOJE);
  assert.equal(h.hoje, 2); assert.equal(h.pendentes, 2); assert.equal(h.atrasados, 1, 'atrasados aparecem mesmo filtrando hoje');
});

test('lembretes: véspera, manhã, horário, atrasado', () => {
  const ids = (hora, cfg) => A.lembretes(itens, { data: HOJE, hora }, cfg).map(l => l.item.id + ':' + l.tipo);
  assert.deepEqual(ids('06:00'), ['a3:atrasado', 'a7:vespera']);                       // antes da manhã
  assert.deepEqual(ids('07:30'), ['a3:atrasado', 'a1:manha', 'a4:manha', 'a7:vespera']);
  assert.deepEqual(ids('08:40'), ['a1:horario', 'a3:atrasado', 'a4:manha', 'a7:vespera']); // 20 min antes das 09:00
  assert.deepEqual(ids('08:40', { vespera: false, antecedenciaMin: 10 }), ['a3:atrasado', 'a1:manha', 'a4:manha']);
  assert.ok(!ids('10:30').includes('a1:horario'), 'depois de 1h do horário volta a ser lembrete do dia');
});

test('proximidade: só coordenadas verificadas; vizinho mais próximo; sem coordenada vai ao fim por endereço', () => {
  const pts = { a: { lat: -22.900, lng: -43.200 }, b: { lat: -22.950, lng: -43.250 }, c: { lat: -22.901, lng: -43.201 } };
  const l = [{ id: 'a', hora: '08:00' }, { id: 'b', hora: '09:00' }, { id: 'c', hora: '10:00' }, { id: 'x', hora: '07:00' }, { id: 'y', hora: '07:30' }];
  const end = { x: { micro: '02', bairro: 'B', endereco: 'Rua Z', numero: '5' }, y: { micro: '01', bairro: 'A', endereco: 'Rua A', numero: '10' } };
  const r = A.ordenarProximidade(l, i => pts[i.id] || null, i => end[i.id]);
  assert.deepEqual(r.ordem.map(i => i.id), ['a', 'c', 'b', 'y', 'x']);
  assert.equal(r.comCoord, 3); assert.equal(r.semCoord.length, 2);
  assert.ok(r.totalKm > 0 && r.totalKm < 10);
});

test('rota no Google Maps com paradas', () => {
  assert.equal(A.rotaMaps([{ lat: 1, lng: 2 }]), null);
  const u = decodeURIComponent(A.rotaMaps([{ lat: 1, lng: 2 }, { lat: 3, lng: 4 }, { lat: 5, lng: 6 }]));
  assert.equal(u, 'https://www.google.com/maps/dir/?api=1&origin=1,2&destination=5,6&waypoints=3,4');
});

test('agrupamento por horário, microárea, linha e endereço', () => {
  const ctx = { micro: a => ({ a1: '01', a4: '' })[a.id], linhas: a => ({ a1: ['HAS', 'DM'] })[a.id] || [], endereco: a => ({ a1: 'Rua A' })[a.id] };
  const l = [itens[3], itens[0]];
  assert.deepEqual(A.agrupar(l, 'horario', ctx)[0].itens.map(a => a.id), ['a1', 'a4']);
  assert.deepEqual(A.agrupar(l, 'microarea', ctx).map(g => g.rotulo), ['Microárea 01', 'Sem microárea']);
  const gl = A.agrupar(l, 'linha', ctx);
  assert.deepEqual(gl.map(g => g.rotulo), ['DM', 'HAS', 'Sem linha de cuidado']);
  assert.deepEqual(A.agrupar(l, 'endereco', ctx).map(g => g.rotulo), ['Rua A', 'Sem endereço']);
});

test('semana e grade do mês (segunda a domingo)', () => {
  assert.deepEqual(A.semana('2026-11-05'), ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08']);
  const g = A.gradeMes('2026-11');
  assert.equal(g[0][0].data, '2026-10-26'); assert.equal(g[0][0].doMes, false);
  assert.equal(g[g.length - 1][6].data, '2026-12-06');
  assert.equal(g.flat().filter(d => d.doMes).length, 30);
});

test('categorias de visita e rótulos', () => {
  assert.ok(A.ehVisita('retorno') && A.ehVisita('acompanhamento') && !A.ehVisita('reuniao'));
  assert.equal(A.rotCat('acao_coletiva'), 'Ação coletiva');
  assert.equal(A.SITUACOES.join(), 'Agendado,Concluído,Não realizado,Reagendado,Cancelado');
});
