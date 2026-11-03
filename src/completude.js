/*
 * ACS DIGITAL — Motor de completude cadastral
 * Referência: "Campos para Completude de Cadastro — Versão 02/2023" (40 campos).
 *
 * Funciona no navegador (window.ACSCompletude) e no Node (module.exports).
 * Nenhuma dependência externa.
 */
(function (root) {
  'use strict';

  var SIM_NAO = ['Sim', 'Não'];

  // ---------------------------------------------------------------------------
  // 1. Os 40 campos, na sequência original. NÃO reordenar.
  //    escopo: 'pessoa' = gravado na ficha individual
  //            'familia' = gravado uma única vez na ficha familiar (domicílio)
  // ---------------------------------------------------------------------------
  var SECOES = [
    { id: 'ident', titulo: 'Identificação individual', campos: [1, 13] },
    { id: 'social', titulo: 'Informações sociais e de saúde', campos: [14, 19] },
    { id: 'endereco', titulo: 'Endereço e informações domiciliares', campos: [20, 29] },
    { id: 'saneamento', titulo: 'Saneamento e condições socioeconômicas', campos: [30, 35] },
    { id: 'docs', titulo: 'Documentação e informações complementares', campos: [36, 40] }
  ];

  var CAMPOS = [
    { n: 1, chave: 'nome', rotulo: 'Nome', escopo: 'pessoa', tipo: 'nome' },
    { n: 2, chave: 'data_nascimento', rotulo: 'Data de nascimento', escopo: 'pessoa', tipo: 'data_nascimento' },
    { n: 3, chave: 'cpf_dnv', rotulo: 'CPF/DNV', escopo: 'pessoa', tipo: 'cpf_dnv' },
    { n: 4, chave: 'cns', rotulo: 'CNS', escopo: 'pessoa', tipo: 'cns' },
    { n: 5, chave: 'nacionalidade', rotulo: 'Nacionalidade', escopo: 'pessoa', tipo: 'opcao',
      opcoes: ['Brasileira', 'Naturalizada', 'Estrangeira'] },
    { n: 6, chave: 'municipio_nascimento', rotulo: 'Município de nascimento', escopo: 'pessoa', tipo: 'texto' },
    { n: 7, chave: 'sexo', rotulo: 'Sexo biológico', escopo: 'pessoa', tipo: 'opcao', opcoes: ['Feminino', 'Masculino'] },
    { n: 8, chave: 'raca_cor', rotulo: 'Raça/cor', escopo: 'pessoa', tipo: 'opcao',
      opcoes: ['Branca', 'Preta', 'Parda', 'Amarela', 'Indígena'] },
    { n: 9, chave: 'deficiencia', rotulo: 'Deficiência', escopo: 'pessoa', tipo: 'opcao',
      opcoes: ['Não possui', 'Auditiva', 'Visual', 'Intelectual/Cognitiva', 'Física', 'Múltipla', 'Outra'] },
    { n: 10, chave: 'situacao_familiar', rotulo: 'Situação familiar', escopo: 'pessoa', tipo: 'opcao',
      opcoes: [
        'Convive com companheiro(a) e filho(s)',
        'Convive com companheiro(a), sem filhos',
        'Convive com companheiro(a), filho(s) e/ou outros familiares',
        'Convive com familiar(es), sem companheiro(a)',
        'Convive com outra(s) pessoa(s), sem laços familiares',
        'Vive só'
      ] },
    { n: 11, chave: 'frequenta_escola', rotulo: 'Frequenta a escola', escopo: 'pessoa', tipo: 'opcao', opcoes: SIM_NAO },
    { n: 12, chave: 'escolaridade', rotulo: 'Escolaridade', escopo: 'pessoa', tipo: 'opcao',
      opcoes: [
        'Nenhuma', 'Creche', 'Pré-escola', 'Classe de alfabetização',
        'Ensino fundamental incompleto', 'Ensino fundamental completo',
        'Ensino fundamental especial', 'EJA — fundamental',
        'Ensino médio incompleto', 'Ensino médio completo', 'Ensino médio especial', 'EJA — médio',
        'Ensino superior incompleto', 'Ensino superior completo', 'Pós-graduação',
        'Alfabetização para adultos'
      ] },
    { n: 13, chave: 'nis', rotulo: 'NIS', escopo: 'pessoa', tipo: 'nis' },

    { n: 14, chave: 'territorio_social', rotulo: 'Pertence ao território social', escopo: 'pessoa', tipo: 'opcao', opcoes: SIM_NAO },
    { n: 15, chave: 'cartao_familia_carioca', rotulo: 'Cartão Família Carioca', escopo: 'pessoa', tipo: 'opcao', opcoes: SIM_NAO },
    { n: 16, chave: 'auxilio_brasil', rotulo: 'Possui Auxílio Brasil', escopo: 'pessoa', tipo: 'opcao', opcoes: SIM_NAO,
      rotuloConfiguravel: true },
    { n: 17, chave: 'plano_saude', rotulo: 'Plano de saúde', escopo: 'pessoa', tipo: 'opcao', opcoes: SIM_NAO },
    { n: 18, chave: 'fuma', rotulo: 'Fuma', escopo: 'pessoa', tipo: 'opcao', opcoes: SIM_NAO },
    { n: 19, chave: 'religiao', rotulo: 'Religião', escopo: 'pessoa', tipo: 'opcao',
      opcoes: ['Católica', 'Evangélica', 'Espírita', 'Umbanda', 'Candomblé', 'Outra', 'Sem religião'] },

    { n: 20, chave: 'endereco', rotulo: 'Endereço', escopo: 'familia', tipo: 'texto' },
    { n: 21, chave: 'numero', rotulo: 'Número', escopo: 'familia', tipo: 'numero_endereco' },
    { n: 22, chave: 'bairro', rotulo: 'Bairro', escopo: 'familia', tipo: 'texto' },
    { n: 23, chave: 'cep', rotulo: 'CEP', escopo: 'familia', tipo: 'cep' },
    { n: 24, chave: 'telefone', rotulo: 'Telefone', escopo: 'pessoa', tipo: 'telefone' },
    { n: 25, chave: 'situacao_moradia', rotulo: 'Família — situação de moradia', escopo: 'familia', tipo: 'opcao',
      opcoes: ['Próprio', 'Financiado', 'Alugado', 'Arrendado', 'Cedido', 'Ocupação', 'Situação de rua', 'Outra'] },
    { n: 26, chave: 'tempo_moradia', rotulo: 'Família — tempo de moradia', escopo: 'familia', tipo: 'opcao',
      opcoes: ['Menos de 1 ano', '1 a 5 anos', '5 a 10 anos', 'Mais de 10 anos'] },
    { n: 27, chave: 'comodos', rotulo: 'Família — quantidade de cômodos', escopo: 'familia', tipo: 'comodos' },
    { n: 28, chave: 'energia_eletrica', rotulo: 'Família — energia elétrica', escopo: 'familia', tipo: 'opcao', opcoes: SIM_NAO },
    { n: 29, chave: 'material_paredes', rotulo: 'Família — material predominante das paredes externas', escopo: 'familia', tipo: 'opcao',
      opcoes: ['Alvenaria/tijolo com revestimento', 'Alvenaria/tijolo sem revestimento', 'Taipa com revestimento',
        'Taipa sem revestimento', 'Madeira aparelhada', 'Material aproveitado', 'Palha', 'Outro material'] },

    { n: 30, chave: 'filtro_agua', rotulo: 'Família — possui filtro de água', escopo: 'familia', tipo: 'opcao', opcoes: SIM_NAO },
    { n: 31, chave: 'tratamento_agua', rotulo: 'Família — tratamento da água', escopo: 'familia', tipo: 'opcao',
      opcoes: ['Filtração', 'Fervura', 'Cloração', 'Água mineral', 'Sem tratamento'] },
    { n: 32, chave: 'abastecimento_agua', rotulo: 'Família — abastecimento de água', escopo: 'familia', tipo: 'opcao',
      opcoes: ['Rede encanada até o domicílio', 'Poço ou nascente', 'Cisterna', 'Carro-pipa', 'Outro'] },
    { n: 33, chave: 'escoamento_sanitario', rotulo: 'Família — escoamento do banheiro ou sanitário', escopo: 'familia', tipo: 'opcao',
      opcoes: ['Rede coletora de esgoto ou pluvial', 'Fossa séptica', 'Fossa rudimentar',
        'Direto para rio, lago ou mar', 'Céu aberto', 'Outra forma'] },
    { n: 34, chave: 'destino_lixo', rotulo: 'Família — destino do lixo', escopo: 'familia', tipo: 'opcao',
      opcoes: ['Coletado', 'Queimado/enterrado', 'Céu aberto', 'Outro'] },
    { n: 35, chave: 'renda_familiar', rotulo: 'Família — renda familiar', escopo: 'familia', tipo: 'opcao',
      opcoes: ['Sem renda', 'Até 1/4 salário mínimo', '1/4 a 1/2 salário mínimo', '1/2 a 1 salário mínimo',
        '1 a 2 salários mínimos', '2 a 3 salários mínimos', '3 a 4 salários mínimos', 'Mais de 4 salários mínimos'] },

    { n: 36, chave: 'cadunico', rotulo: 'CadÚnico', escopo: 'pessoa', tipo: 'opcao', opcoes: SIM_NAO },
    { n: 37, chave: 'certidao_nascimento', rotulo: 'Certidão de nascimento', escopo: 'pessoa', tipo: 'opcao', opcoes: SIM_NAO },
    { n: 38, chave: 'creche', rotulo: 'A criança está matriculada na creche ou pré-escola', escopo: 'pessoa', tipo: 'opcao', opcoes: SIM_NAO },
    { n: 39, chave: 'cuidador', rotulo: 'Principal cuidador', escopo: 'pessoa', tipo: 'cuidador' },
    { n: 40, chave: 'parentesco_cuidador', rotulo: 'Parentesco', escopo: 'pessoa', tipo: 'opcao',
      opcoes: ['Mãe', 'Pai', 'Avó/Avô', 'Irmã/Irmão', 'Tia/Tio', 'Madrasta/Padrasto', 'Outro parente', 'Não parente'] }
  ];

  // ---------------------------------------------------------------------------
  // 2. Regras por faixa etária (tabela da referência).
  //    'O' = obrigatório, 'N' = NSA, 'C' = condicional
  // ---------------------------------------------------------------------------
  function faixaRegras(def) {
    var r = {};
    def.forEach(function (d) { for (var i = d[0]; i <= d[1]; i++) r[i] = d[2]; });
    return r;
  }

  var REGRAS = {
    maior: faixaRegras([[1, 12, 'O'], [13, 13, 'N'], [14, 35, 'O'], [36, 40, 'N']]),
    menor: faixaRegras([[1, 9, 'O'], [10, 12, 'N'], [13, 13, 'C'], [14, 17, 'O'], [18, 19, 'N'],
      [20, 23, 'O'], [24, 24, 'N'], [25, 35, 'O'], [36, 36, 'C'], [37, 40, 'O']])
  };

  // Condição de NIS (13) e CadÚnico (36) para menores de 6 anos:
  // beneficiário de transferência de renda OU vinculado a território social.
  function condicaoBeneficio(pessoa) {
    return pessoa.territorio_social === 'Sim' ||
      pessoa.cartao_familia_carioca === 'Sim' ||
      pessoa.auxilio_brasil === 'Sim';
  }

  // ---------------------------------------------------------------------------
  // 3. Validações ("preenchido corretamente")
  // ---------------------------------------------------------------------------
  var VALORES_ARTIFICIAIS = ['-', '--', '.', '0', '00', 'na', 'n/a', 'nsa', 'x', 'xx', 'xxx',
    'sem', 'nao sei', 'não sei', 'teste', 'null', 'undefined', 'nenhum', 'ignorado', '?'];

  function soDigitos(v) { return String(v == null ? '' : v).replace(/\D/g, ''); }
  function vazio(v) { return v == null || String(v).trim() === ''; }
  function artificial(v) {
    var s = String(v).trim().toLowerCase();
    return VALORES_ARTIFICIAIS.indexOf(s) >= 0 || /^(.)\1+$/.test(s.replace(/\s/g, '')) && s.length > 1;
  }

  function validarCPF(v) {
    var c = soDigitos(v);
    if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
    var s = 0, i;
    for (i = 0; i < 9; i++) s += +c[i] * (10 - i);
    var d1 = (s * 10) % 11; if (d1 === 10) d1 = 0;
    if (d1 !== +c[9]) return false;
    s = 0;
    for (i = 0; i < 10; i++) s += +c[i] * (11 - i);
    var d2 = (s * 10) % 11; if (d2 === 10) d2 = 0;
    return d2 === +c[10];
  }

  function validarDNV(v) {
    var c = soDigitos(v);
    return c.length === 11 && !/^(\d)\1{10}$/.test(c);
  }

  function validarCNS(v) {
    var c = soDigitos(v);
    if (c.length !== 15) return false;
    var i, soma = 0;
    if (/^[12]/.test(c)) {
      var pis = c.substr(0, 11);
      for (i = 0; i < 11; i++) soma += +pis[i] * (15 - i);
      var resto = soma % 11, dv = 11 - resto, res;
      if (dv === 11) dv = 0;
      if (dv === 10) {
        soma += 2; resto = soma % 11; dv = 11 - resto;
        res = pis + '001' + dv;
      } else {
        res = pis + '000' + dv;
      }
      return res === c;
    }
    if (/^[789]/.test(c)) {
      for (i = 0; i < 15; i++) soma += +c[i] * (15 - i);
      return soma % 11 === 0;
    }
    return false;
  }

  function validarNIS(v) {
    var c = soDigitos(v);
    if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
    var pesos = [3, 2, 9, 8, 7, 6, 5, 4, 3, 2], s = 0;
    for (var i = 0; i < 10; i++) s += +c[i] * pesos[i];
    var dv = 11 - (s % 11); if (dv >= 10) dv = 0;
    return dv === +c[10];
  }

  function parseData(v) {
    if (!v) return null;
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v));
    if (!m) return null;
    var d = new Date(+m[1], +m[2] - 1, +m[3]);
    if (d.getFullYear() !== +m[1] || d.getMonth() !== +m[2] - 1 || d.getDate() !== +m[3]) return null;
    return d;
  }

  function idadeEmAnos(nasc, hoje) {
    var d = parseData(nasc); if (!d) return null;
    var h = hoje || new Date();
    var idade = h.getFullYear() - d.getFullYear();
    if (h.getMonth() < d.getMonth() || (h.getMonth() === d.getMonth() && h.getDate() < d.getDate())) idade--;
    return idade;
  }

  // Retorna null se válido, ou a mensagem do problema.
  function validarCampo(campo, valor, ctx) {
    var hoje = (ctx && ctx.hoje) || new Date();
    if (campo.tipo === 'cpf_dnv') {
      var tipo = valor && valor.tipo, num = valor && valor.numero;
      if (vazio(num)) return 'não informado';
      if (tipo === 'CPF') return validarCPF(num) ? null : 'CPF inválido';
      if (tipo === 'DNV') return validarDNV(num) ? null : 'DNV inválida (11 dígitos)';
      return 'informe se é CPF ou DNV';
    }
    if (campo.tipo === 'cuidador') {
      if (!valor) return 'não informado';
      if (valor.pessoaId) return null;
      if (!vazio(valor.nome) && !artificial(valor.nome) && String(valor.nome).trim().length >= 3) return null;
      return 'não informado';
    }
    if (vazio(valor)) return 'não informado';
    if (typeof valor === 'string' && artificial(valor) && campo.tipo !== 'numero_endereco') return 'valor não aceito';
    switch (campo.tipo) {
      case 'nome':
        return String(valor).trim().split(/\s+/).filter(function (p) { return p.length >= 2; }).length >= 2
          ? null : 'informe nome e sobrenome';
      case 'data_nascimento':
        var d = parseData(valor);
        if (!d) return 'data inválida';
        if (d > hoje) return 'data no futuro';
        if (idadeEmAnos(valor, hoje) > 130) return 'data improvável';
        return null;
      case 'cns': return validarCNS(valor) ? null : 'CNS inválido';
      case 'nis': return validarNIS(valor) ? null : 'NIS inválido';
      case 'cep': return soDigitos(valor).length === 8 && !/^0{8}$/.test(soDigitos(valor)) ? null : 'CEP inválido';
      case 'telefone':
        var t = soDigitos(valor);
        return (t.length === 10 || t.length === 11) && !/^(\d)\1+$/.test(t) ? null : 'telefone inválido';
      case 'comodos':
        var n = Number(valor);
        return Number.isInteger(n) && n >= 1 && n <= 50 ? null : 'quantidade inválida';
      case 'numero_endereco':
        var s = String(valor).trim();
        return s.length >= 1 && s !== '-' && s !== '.' ? null : 'não informado';
      case 'opcao':
        return campo.opcoes.indexOf(valor) >= 0 ? null : 'opção inválida';
      default:
        return String(valor).trim().length >= 2 ? null : 'não informado';
    }
  }

  // ---------------------------------------------------------------------------
  // 4. Faixa etária e regra de exatamente 6 anos (configurável, sem presunção)
  // ---------------------------------------------------------------------------
  function determinarFaixa(pessoa, config, hoje) {
    var idade = idadeEmAnos(pessoa.data_nascimento, hoje);
    if (idade == null || idade < 0) return { faixa: null, idade: null, motivo: 'Informe a data de nascimento para definir a faixa etária.' };
    if (idade > 6) return { faixa: 'maior', idade: idade };
    if (idade < 6) return { faixa: 'menor', idade: idade };
    var regra = config && config.regraSeisAnos;
    if (regra === 'maior' || regra === 'menor') return { faixa: regra, idade: idade, seisAnos: true };
    return { faixa: null, idade: idade, seisAnos: true, motivo: 'Regra para exatamente 6 anos não configurada (Configurações).' };
  }

  // ---------------------------------------------------------------------------
  // 5. Classificação por cores — limites exatos, sem sobreposição
  // ---------------------------------------------------------------------------
  function classificar(percentual) {
    if (percentual >= 95) return 'verde';
    if (percentual >= 75) return 'amarelo';
    return 'vermelho';
  }

  // Exibição em número inteiro. Arredonda PARA BAIXO para que o número exibido
  // nunca contradiga a cor (ex.: 94,6% exibe 94% amarelo, e não 95% amarelo).
  function percentualExibido(p) {
    return Math.floor(p + 1e-9);
  }

  // ---------------------------------------------------------------------------
  // 6. Cálculo
  //    pessoa: objeto com as chaves de escopo 'pessoa'
  //    familia: objeto com as chaves de escopo 'familia' (compartilhadas)
  // ---------------------------------------------------------------------------
  function calcular(pessoa, familia, config, hoje) {
    pessoa = pessoa || {}; familia = familia || {};
    hoje = hoje || new Date();
    var fx = determinarFaixa(pessoa, config, hoje);
    var regras = fx.faixa ? REGRAS[fx.faixa] : null;
    var condicao = condicaoBeneficio(pessoa);

    var campos = [], aplicaveis = 0, preenchidos = 0;
    var pendentes = [], condicionaisPendentes = [], nsa = [], indefinidos = [];

    CAMPOS.forEach(function (c) {
      var valor = c.escopo === 'familia' ? familia[c.chave] : pessoa[c.chave];
      var regra;
      if (regras) {
        regra = regras[c.n];
      } else {
        // Faixa indefinida: só conta o que é obrigatório nas duas faixas.
        var a = REGRAS.maior[c.n], b = REGRAS.menor[c.n];
        regra = (a === 'O' && b === 'O') ? 'O' : 'I';
      }
      var status, problema = null, condicional = false;
      if (regra === 'N') {
        status = 'nsa';
      } else if (regra === 'I') {
        status = 'indefinido';
      } else if (regra === 'C' && !condicao) {
        status = 'nsa'; condicional = true;
      } else {
        condicional = regra === 'C';
        problema = validarCampo(c, valor, { hoje: hoje });
        status = problema ? 'pendente' : 'preenchido';
      }
      var item = { n: c.n, chave: c.chave, rotulo: c.rotulo, escopo: c.escopo, status: status,
        condicional: condicional, problema: problema };
      campos.push(item);
      if (status === 'preenchido') { aplicaveis++; preenchidos++; }
      else if (status === 'pendente') {
        aplicaveis++;
        (condicional ? condicionaisPendentes : pendentes).push(item);
      } else if (status === 'nsa') nsa.push(item);
      else indefinidos.push(item);
    });

    var percentual = aplicaveis ? (preenchidos / aplicaveis) * 100 : 0;
    return {
      faixa: fx.faixa, idade: fx.idade, seisAnos: !!fx.seisAnos, aviso: fx.motivo || null,
      condicaoBeneficio: condicao,
      aplicaveis: aplicaveis, preenchidos: preenchidos,
      percentual: percentual, exibido: percentualExibido(percentual),
      cor: classificar(percentual),
      pendentes: pendentes, condicionaisPendentes: condicionaisPendentes,
      nsa: nsa, indefinidos: indefinidos, campos: campos
    };
  }

  var API = {
    VERSAO_REFERENCIA: '02/2023',
    SECOES: SECOES, CAMPOS: CAMPOS, REGRAS: REGRAS,
    calcular: calcular, classificar: classificar, percentualExibido: percentualExibido,
    validarCampo: validarCampo, validarCPF: validarCPF, validarCNS: validarCNS, validarNIS: validarNIS,
    idadeEmAnos: idadeEmAnos, determinarFaixa: determinarFaixa, condicaoBeneficio: condicaoBeneficio,
    soDigitos: soDigitos, parseData: parseData
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.ACSCompletude = API;
})(typeof window !== 'undefined' ? window : this);
