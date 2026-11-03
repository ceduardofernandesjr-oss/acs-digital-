// Testes do motor de completude — executar com: node --test test/
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../src/completude.js');

const HOJE = new Date(2026, 10, 2); // 02/11/2026

// ---- geradores de documentos válidos (fictícios) ----
function gerarCNS(pis11) {
  let soma = 0;
  for (let i = 0; i < 11; i++) soma += +pis11[i] * (15 - i);
  let dv = 11 - (soma % 11);
  if (dv === 11) dv = 0;
  if (dv === 10) { soma += 2; dv = 11 - (soma % 11); return pis11 + '001' + dv; }
  return pis11 + '000' + dv;
}
function gerarNIS(base10) {
  const p = [3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let s = 0; for (let i = 0; i < 10; i++) s += +base10[i] * p[i];
  let dv = 11 - (s % 11); if (dv >= 10) dv = 0;
  return base10 + dv;
}
const CPF_OK = '52998224725';
const CNS_OK = gerarCNS('12345678901');
const NIS_OK = gerarNIS('1234567890');

const FAMILIA_COMPLETA = {
  endereco: 'Rua das Acácias', numero: '120', bairro: 'Centro', cep: '20000-123',
  situacao_moradia: 'Alugado', tempo_moradia: '1 a 5 anos', comodos: 4, energia_eletrica: 'Sim',
  material_paredes: 'Alvenaria/tijolo com revestimento', filtro_agua: 'Sim', tratamento_agua: 'Filtração',
  abastecimento_agua: 'Rede encanada até o domicílio', escoamento_sanitario: 'Rede coletora de esgoto ou pluvial',
  destino_lixo: 'Coletado', renda_familiar: '1 a 2 salários mínimos'
};

function adultoCompleto(extra) {
  return Object.assign({
    nome: 'Maria Fictícia Souza', data_nascimento: '1980-05-10',
    cpf_dnv: { tipo: 'CPF', numero: CPF_OK }, cns: CNS_OK, nacionalidade: 'Brasileira',
    municipio_nascimento: 'Rio de Janeiro', sexo: 'Feminino', raca_cor: 'Parda', deficiencia: 'Não possui',
    situacao_familiar: 'Vive só', frequenta_escola: 'Não', escolaridade: 'Ensino médio completo',
    territorio_social: 'Não', cartao_familia_carioca: 'Não', auxilio_brasil: 'Não', plano_saude: 'Não',
    fuma: 'Não', religiao: 'Sem religião', telefone: '(21) 99876-5432'
  }, extra || {});
}

function criancaCompleta(extra) {
  return Object.assign({
    nome: 'Ana Fictícia Lima', data_nascimento: '2023-03-15',
    cpf_dnv: { tipo: 'DNV', numero: '12345678901' }, cns: CNS_OK, nacionalidade: 'Brasileira',
    municipio_nascimento: 'Rio de Janeiro', sexo: 'Feminino', raca_cor: 'Preta', deficiencia: 'Não possui',
    territorio_social: 'Não', cartao_familia_carioca: 'Não', auxilio_brasil: 'Não', plano_saude: 'Não',
    certidao_nascimento: 'Sim', creche: 'Sim', cuidador: { nome: 'Joana Fictícia Lima' }, parentesco_cuidador: 'Mãe'
  }, extra || {});
}

test('são exatamente 40 campos, numerados de 1 a 40 na sequência', () => {
  assert.equal(C.CAMPOS.length, 40);
  C.CAMPOS.forEach((c, i) => assert.equal(c.n, i + 1));
  assert.equal(C.CAMPOS[12].rotulo, 'NIS');
  assert.equal(C.CAMPOS[35].rotulo, 'CadÚnico');
});

test('tabela de regras: maior que 6 anos', () => {
  const r = C.REGRAS.maior;
  for (let i = 1; i <= 12; i++) assert.equal(r[i], 'O');
  assert.equal(r[13], 'N');
  for (let i = 14; i <= 35; i++) assert.equal(r[i], 'O');
  for (let i = 36; i <= 40; i++) assert.equal(r[i], 'N');
});

test('tabela de regras: menor que 6 anos', () => {
  const r = C.REGRAS.menor;
  const esperado = { 13: 'C', 24: 'N', 36: 'C', 18: 'N', 19: 'N', 10: 'N', 11: 'N', 12: 'N' };
  for (let i = 1; i <= 40; i++) {
    const e = esperado[i] || 'O';
    assert.equal(r[i], e, 'campo ' + i);
  }
});

test('classificação de cores: limites exatos do enunciado', () => {
  const casos = [[100, 'verde'], [98, 'verde'], [95, 'verde'], [94, 'amarelo'], [94.99, 'amarelo'],
    [85, 'amarelo'], [75, 'amarelo'], [74.99, 'vermelho'], [74, 'vermelho'], [50, 'vermelho'], [20, 'vermelho'], [0, 'vermelho']];
  for (const [p, cor] of casos) assert.equal(C.classificar(p), cor, p + '%');
});

test('número exibido nunca contradiz a cor', () => {
  for (let a = 1; a <= 40; a++) for (let p = 0; p <= a; p++) {
    const pct = p / a * 100;
    assert.equal(C.classificar(C.percentualExibido(pct)), C.classificar(pct), `${p}/${a}`);
  }
});

test('adulto completo: 34 aplicáveis, 100%, verde, NIS e campos 36–40 NSA', () => {
  const r = C.calcular(adultoCompleto(), FAMILIA_COMPLETA, {}, HOJE);
  assert.equal(r.faixa, 'maior');
  assert.equal(r.aplicaveis, 34);
  assert.equal(r.preenchidos, 34);
  assert.equal(r.exibido, 100);
  assert.equal(r.cor, 'verde');
  assert.deepEqual(r.nsa.map(c => c.n), [13, 36, 37, 38, 39, 40]);
});

test('adulto sem CNS e sem telefone: 32/34 = 94% amarelo', () => {
  const r = C.calcular(adultoCompleto({ cns: '', telefone: '' }), FAMILIA_COMPLETA, {}, HOJE);
  assert.equal(r.preenchidos, 32);
  assert.equal(r.exibido, 94);
  assert.equal(r.cor, 'amarelo');
  assert.deepEqual(r.pendentes.map(c => c.n), [4, 24]);
});

test('verde com pendência continua mostrando a pendência', () => {
  // 33/34 = 97% — verde, mas com 1 pendência
  const r = C.calcular(adultoCompleto({ religiao: '' }), FAMILIA_COMPLETA, {}, HOJE);
  assert.equal(r.cor, 'verde');
  assert.equal(r.pendentes.length, 1);
  assert.equal(r.pendentes[0].chave, 'religiao');
});

test('adulto sem dados da família: 19/34 = 55% vermelho (15 campos familiares)', () => {
  const r = C.calcular(adultoCompleto(), {}, {}, HOJE);
  assert.equal(r.preenchidos, 19);
  assert.equal(r.exibido, 55);
  assert.equal(r.cor, 'vermelho');
});

test('documentos inválidos contam como pendentes', () => {
  const r = C.calcular(adultoCompleto({ cpf_dnv: { tipo: 'CPF', numero: '11111111111' }, cns: '123456789012345' }),
    FAMILIA_COMPLETA, {}, HOJE);
  const p = Object.fromEntries(r.pendentes.map(c => [c.chave, c.problema]));
  assert.equal(p.cpf_dnv, 'CPF inválido');
  assert.equal(p.cns, 'CNS inválido');
});

test('valores artificiais não contam como preenchimento', () => {
  const r = C.calcular(adultoCompleto({ municipio_nascimento: 'xxx', nome: 'Maria' }), FAMILIA_COMPLETA, {}, HOJE);
  const chaves = r.pendentes.map(c => c.chave);
  assert.ok(chaves.includes('municipio_nascimento'));
  assert.ok(chaves.includes('nome'));
});

test('criança < 6 sem benefício: NIS e CadÚnico NSA, 32 aplicáveis, 100%', () => {
  const r = C.calcular(criancaCompleta(), FAMILIA_COMPLETA, {}, HOJE);
  assert.equal(r.faixa, 'menor');
  assert.equal(r.aplicaveis, 32);
  assert.equal(r.exibido, 100);
  const nsa = r.nsa.map(c => c.n);
  assert.deepEqual(nsa, [10, 11, 12, 13, 18, 19, 24, 36]);
  assert.ok(r.nsa.find(c => c.n === 13).condicional);
});

test('criança < 6 com Auxílio Brasil: NIS e CadÚnico passam a contar', () => {
  const r = C.calcular(criancaCompleta({ auxilio_brasil: 'Sim' }), FAMILIA_COMPLETA, {}, HOJE);
  assert.equal(r.aplicaveis, 34);
  assert.equal(r.preenchidos, 32);
  assert.deepEqual(r.condicionaisPendentes.map(c => c.n), [13, 36]);
  assert.equal(r.cor, 'amarelo');
  const r2 = C.calcular(criancaCompleta({ auxilio_brasil: 'Sim', nis: NIS_OK, cadunico: 'Sim' }), FAMILIA_COMPLETA, {}, HOJE);
  assert.equal(r2.exibido, 100);
});

test('território social também ativa a condição', () => {
  const r = C.calcular(criancaCompleta({ territorio_social: 'Sim' }), FAMILIA_COMPLETA, {}, HOJE);
  assert.equal(r.aplicaveis, 34);
});

test('exatamente 6 anos sem configuração: não presume faixa', () => {
  const p = adultoCompleto({ data_nascimento: '2020-01-10' });
  const r = C.calcular(p, FAMILIA_COMPLETA, {}, HOJE);
  assert.equal(r.idade, 6);
  assert.equal(r.faixa, null);
  assert.ok(r.aviso);
  assert.ok(r.indefinidos.length > 0);
});

test('exatamente 6 anos com regra configurada', () => {
  const p = criancaCompleta({ data_nascimento: '2020-01-10' });
  assert.equal(C.calcular(p, FAMILIA_COMPLETA, { regraSeisAnos: 'menor' }, HOJE).faixa, 'menor');
  assert.equal(C.calcular(p, FAMILIA_COMPLETA, { regraSeisAnos: 'maior' }, HOJE).faixa, 'maior');
});

test('mudança de faixa por aniversário recalcula a regra', () => {
  const p = criancaCompleta({ data_nascimento: '2020-11-03' }); // faz 6 amanhã
  assert.equal(C.calcular(p, FAMILIA_COMPLETA, {}, HOJE).faixa, 'menor');
  assert.equal(C.calcular(p, FAMILIA_COMPLETA, {}, new Date(2027, 10, 3)).faixa, 'maior');
});

test('dado familiar compartilhado altera a completude de todos os integrantes', () => {
  const fam = Object.assign({}, FAMILIA_COMPLETA);
  const a = adultoCompleto(), b = criancaCompleta();
  assert.equal(C.calcular(a, fam, {}, HOJE).exibido, 100);
  assert.equal(C.calcular(b, fam, {}, HOJE).exibido, 100);
  fam.cep = '';
  assert.equal(C.calcular(a, fam, {}, HOJE).exibido, 97);
  assert.equal(C.calcular(b, fam, {}, HOJE).exibido, 96);
});

test('sem data de nascimento: faixa indefinida, conta só o comum às duas faixas', () => {
  const r = C.calcular(adultoCompleto({ data_nascimento: '' }), FAMILIA_COMPLETA, {}, HOJE);
  assert.equal(r.faixa, null);
  assert.ok(r.pendentes.some(c => c.chave === 'data_nascimento'));
});

test('validadores de documento', () => {
  assert.ok(C.validarCPF('529.982.247-25'));
  assert.ok(!C.validarCPF('529.982.247-24'));
  assert.ok(C.validarCNS(CNS_OK));
  assert.ok(!C.validarCNS('111111111111111'));
  assert.ok(C.validarNIS(NIS_OK));
});
