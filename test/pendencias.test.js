// Testes do motor da Central de Pendências — node --test test/pendencias.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../src/completude.js');
const PD = require('../src/pendencias.js');

const HOJE = '2026-11-02';
const FAM = { situacao_moradia: 'Alugado', tempo_moradia: '1 a 5 anos', comodos: 4, energia_eletrica: 'Sim', material_paredes: 'Alvenaria/tijolo com revestimento', filtro_agua: 'Sim', tratamento_agua: 'Filtração', abastecimento_agua: 'Rede encanada até o domicílio', escoamento_sanitario: 'Rede coletora de esgoto ou pluvial', destino_lixo: 'Coletado', renda_familiar: '1 a 2 salários mínimos' };
const f1 = Object.assign({ id: 'f1', codigo: 'F0001', endereco: 'Rua A', numero: '1', bairro: 'Centro', cep: '20000001', microarea: '01', responsavelId: 'p1', situacao: 'Ativa', criadoEm: '2026-01-01T12:00:00Z', atualizadoEm: '2026-10-01T12:00:00Z' }, FAM);
const f2 = { id: 'f2', codigo: 'F0002', endereco: 'Rua B', microarea: '02', situacao: 'Ativa', criadoEm: '2026-10-20T12:00:00Z' }; // incompleta
const base = { criadoEm: '2026-06-01T12:00:00Z', atualizadoEm: '2026-10-10T12:00:00Z', situacao: 'Ativo' };
const pessoas = new Map([
  ['p1', Object.assign({ id: 'p1', familiaId: 'f1', nome: 'Ana Teste', data_nascimento: '1960-01-01', condicoes: { has: true, dm: true }, telefone: '' }, base)],
  ['p2', Object.assign({ id: 'p2', familiaId: 'f1', nome: 'Bia Teste', data_nascimento: '2025-08-01', condicoes: {} }, base)],
  ['p3', Object.assign({ id: 'p3', familiaId: 'f2', nome: 'Caio Teste', data_nascimento: '1990-01-01', condicoes: { tuberculose: true } }, base)],
  ['p4', Object.assign({ id: 'p4', familiaId: 'f2', nome: 'Duda Teste', data_nascimento: '1990-01-01', condicoes: { gestante: true } }, base, { situacao: 'Mudou-se' })]
]);
const familias = new Map([['f1', f1], ['f2', f2]]);
const CFG = { prazos: { familia: 30, gestante: 30, crianca: 30, hasdm: 30, idoso: 90, acamado: 30 }, mesesAtualizacao: 12, diasProximos: 2 };
function comp() { const m = new Map(); pessoas.forEach(p => m.set(p.id, C.calcular(p, familias.get(p.familiaId), {}, new Date(2026, 10, 2)))); return m; }
function calc(extra) {
  return PD.calcular(Object.assign({ pessoas, familias, visitas: [], agenda: [], estados: new Map(), config: CFG, hoje: HOJE, comp: comp(), C }, extra || {}));
}
const tipos = (r, alvo) => r.abertas.filter(p => !alvo || p.alvo === alvo).map(p => p.tipo).sort();

test('A. cadastro: individual, familiar, telefone/endereço', () => {
  const r = calc();
  assert.ok(tipos(r, 'p1').includes('cad_individual'));
  assert.ok(tipos(r, 'p1').includes('contato'));        // telefone vazio (adulto)
  assert.ok(!tipos(r, 'p2').includes('contato') || r.abertas.find(p => p.alvo === 'p2' && p.tipo === 'contato').detalhe.indexOf('telefone') < 0, 'criança < 6: telefone é NSA');
  assert.ok(tipos(r, 'f2').includes('cad_familiar'));
  assert.ok(!tipos(r, 'f1').includes('cad_familiar'));
  assert.ok(tipos(r, 'p3').includes('contato'));        // família sem número/bairro
});

test('pessoas inativas não geram pendência', () => {
  assert.equal(calc().abertas.filter(p => p.alvo === 'p4').length, 0);
});

test('B. linhas: sem visita gera, visita recente resolve, prazo não configurado não inventa', () => {
  let r = calc();
  assert.ok(tipos(r, 'p1').includes('l_has') && tipos(r, 'p1').includes('l_dm') && tipos(r, 'p1').includes('l_idoso'));
  assert.ok(tipos(r, 'p2').includes('l_crianca'));
  assert.ok(!tipos(r, 'p3').includes('l_tuberculose'), 'tuberculose sem prazo configurado');
  assert.deepEqual(r.naoConfigurados, ['l_tuberculose']);
  const visitas = [{ id: 'v1', familiaId: 'f1', pessoaIds: ['p1', 'p2'], data: '2026-10-25', situacao: 'Visita realizada' }];
  r = calc({ visitas });
  assert.ok(!tipos(r, 'p1').includes('l_has') && !tipos(r, 'p2').includes('l_crianca'), 'visita recente resolve automaticamente');
  r = calc({ config: Object.assign({}, CFG, { prazos: Object.assign({}, CFG.prazos, { tuberculose: 15 }) }) });
  assert.ok(tipos(r, 'p3').includes('l_tuberculose'), 'com prazo configurado passa a avaliar');
});

test('B. data de identificação = dia seguinte ao fim do prazo', () => {
  const visitas = [{ id: 'v1', familiaId: 'f1', pessoaIds: ['p1'], data: '2026-09-01', situacao: 'Visita realizada' }];
  const p = calc({ visitas }).abertas.find(x => x.tipo === 'l_has');
  assert.equal(p.desde, '2026-10-02'); // 01/09 + 30 dias + 1
  assert.equal(p.atrasada, true);
  assert.equal(p.key, 'l_has:p1:2026-10-02');
});

test('tentativas que não são "Visita realizada" não resolvem acompanhamento', () => {
  const visitas = [{ id: 'v1', familiaId: 'f1', pessoaIds: ['p1'], data: '2026-11-01', situacao: 'Morador ausente' }];
  assert.ok(tipos(calc({ visitas }), 'p1').includes('l_has'));
});

test('sem duplicidade: mesma situação, mesma chave, uma pendência', () => {
  const r = calc(); const keys = r.abertas.map(p => p.key);
  assert.equal(new Set(keys).size, keys.length);
  assert.deepEqual(calc().abertas.map(p => p.key), keys, 'determinístico');
});

test('C. reagendar: tentativa sem retorno; resolve com visita ou novo agendamento; Recusa não entra', () => {
  const v = { id: 'vt', familiaId: 'f1', pessoaIds: [], data: '2026-10-30', hora: '09:00', situacao: 'Morador ausente' };
  assert.ok(tipos(calc({ visitas: [v] }), 'f1').includes('v_reagendar'));
  assert.ok(!tipos(calc({ visitas: [Object.assign({}, v, { situacao: 'Recusa' })] }), 'f1').includes('v_reagendar'));
  const duas = calc({ visitas: [v, Object.assign({}, v, { id: 'vt2', data: '2026-10-20' })] }).abertas.filter(p => p.tipo === 'v_reagendar');
  assert.equal(duas.length, 1, 'uma por família'); assert.equal(duas[0].desde, '2026-10-30'); assert.match(duas[0].detalhe, /2 tentativas/);
  const depois = { id: 'vr', familiaId: 'f1', pessoaIds: ['p1'], data: '2026-10-30', hora: '15:00', situacao: 'Visita realizada' };
  assert.ok(!tipos(calc({ visitas: [v, depois] }), 'f1').includes('v_reagendar'));
  const ag = { id: 'a1', familiaId: 'f1', categoria: 'visita', data: '2026-11-05', situacao: 'Agendado' };
  assert.ok(!tipos(calc({ visitas: [v], agenda: [ag] }), 'f1').includes('v_reagendar'));
});

test('C/D. agenda: hoje, atrasada, retorno programado/hoje, próximos, não realizado', () => {
  const agenda = [
    { id: 'a1', categoria: 'visita', familiaId: 'f1', data: HOJE, situacao: 'Agendado', titulo: 'Visita' },
    { id: 'a2', categoria: 'retorno', familiaId: 'f1', pessoaId: 'p1', data: '2026-10-31', situacao: 'Agendado', titulo: 'Retorno' },
    { id: 'a3', categoria: 'retorno', familiaId: 'f1', data: HOJE, situacao: 'Agendado' },
    { id: 'a4', categoria: 'retorno', familiaId: 'f1', data: '2026-11-04', situacao: 'Agendado', criadoEm: '2026-11-01T10:00:00Z' },
    { id: 'a5', categoria: 'reuniao', data: '2026-11-03', situacao: 'Agendado' },
    { id: 'a6', categoria: 'reuniao', data: '2026-10-29', situacao: 'Agendado' },
    { id: 'a7', categoria: 'visita', familiaId: 'f2', data: '2026-10-28', situacao: 'Não realizado' },
    { id: 'a8', categoria: 'visita', familiaId: 'f1', data: '2026-11-10', situacao: 'Agendado' },  // fora da janela
    { id: 'a9', categoria: 'retorno', familiaId: 'f1', data: '2026-10-01', situacao: 'Concluído' }
  ];
  const r = calc({ agenda });
  const t = id => tipos(r, id);
  assert.deepEqual(t('a1'), ['v_agendada_hoje']);
  assert.deepEqual(t('a2'), ['v_atrasada']);
  assert.deepEqual(t('a3'), ['a_retorno_hoje']);
  assert.deepEqual(t('a4'), ['v_retorno_programado']);
  assert.deepEqual(t('a5'), ['a_proximo']);
  assert.deepEqual(t('a6'), ['a_atrasada']);
  assert.deepEqual(t('f2').filter(x => x === 'v_reagendar'), ['v_reagendar']);
  assert.equal(r.abertas.find(p => p.tipo === 'v_reagendar' && p.familiaId === 'f2').agendaId, 'a7');
  assert.deepEqual(t('a8'), []); assert.deepEqual(t('a9'), []);
  assert.equal(r.abertas.find(p => p.alvo === 'a2').nivel, 'alta');
});

test('níveis configuráveis', () => {
  const r = calc({ config: Object.assign({}, CFG, { niveisPendencia: { l_has: 'alta', cad_individual: 'info' } }) });
  assert.equal(r.abertas.find(p => p.tipo === 'l_has').nivel, 'alta');
  assert.equal(r.abertas.find(p => p.tipo === 'cad_individual').nivel, 'info');
  assert.equal(r.abertas.find(p => p.tipo === 'l_dm').nivel, 'atencao');
});

test('resolvida manualmente sai das abertas e vai ao histórico; nova ocorrência reaparece', () => {
  const key = 'l_has:p1:2026-06-01';
  const estados = new Map([[key, { status: 'resolvida', origem: 'auto', tipo: 'l_has', resolvidaEm: '2026-11-02T10:00:00Z', justificativas: [{ texto: 'Acompanhado na UBS' }] }]]);
  let r = calc({ estados });
  assert.ok(!r.abertas.some(p => p.key === key));
  assert.equal(r.resolvidas[0].key, key);
  const visitas = [{ id: 'v1', familiaId: 'f1', pessoaIds: ['p1'], data: '2026-09-01', situacao: 'Visita realizada' }];
  r = calc({ estados, visitas });
  assert.ok(r.abertas.some(p => p.key === 'l_has:p1:2026-10-02'), 'nova ocorrência tem nova chave');
});

test('justificativa sem resolver mantém aberta; manual é diferenciada', () => {
  const estados = new Map([
    ['cad_individual:p1:2026-10-10', { status: 'aberta', origem: 'auto', justificativas: [{ texto: 'Morador não tem documento' }] }],
    ['m_1', { origem: 'manual', status: 'aberta', titulo: 'Levar exame', nivel: 'alta', pessoaId: 'p1', criadoEm: '2026-11-01T10:00:00Z', prazo: HOJE }],
    ['m_2', { origem: 'manual', status: 'resolvida', titulo: 'Antiga', resolvidaEm: '2026-10-01T10:00:00Z' }]
  ]);
  const r = calc({ estados });
  const ci = r.abertas.find(p => p.key === 'cad_individual:p1:2026-10-10');
  assert.equal(ci.justificativas.length, 1);
  const m = r.abertas.find(p => p.key === 'm_1');
  assert.equal(m.origem, 'manual'); assert.equal(m.nivel, 'alta'); assert.equal(m.hoje, true);
  assert.ok(r.resolvidas.some(p => p.key === 'm_2'));
});

test('contagens dos cards', () => {
  const agenda = [{ id: 'a2', categoria: 'retorno', familiaId: 'f1', data: '2026-10-31', situacao: 'Agendado' }];
  const c = calc({ agenda, visitas: [{ id: 'vt', familiaId: 'f2', data: '2026-10-30', situacao: 'Imóvel fechado' }] }).contagens;
  assert.equal(c.urgentes, 1); assert.equal(c.reagendar, 1);
  assert.ok(c.cadastro >= 3 && c.linhas >= 4 && c.atrasadas >= 5);
});
