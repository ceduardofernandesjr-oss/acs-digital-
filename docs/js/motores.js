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

/*
 * ACS DIGITAL — Motor de produtividade de visitas domiciliares
 * Funções puras (sem DOM). Navegador: window.ACSProdutividade · Node: module.exports
 *
 * Regras de contabilização:
 *  - Só "Visita realizada" entra no total de visitas realizadas.
 *  - Morador ausente, Recusa, Imóvel fechado, Endereço não localizado = tentativa não concluída.
 *  - Visita reagendada também não é realizada: entra como tentativa não concluída (tipo "reagendada").
 *  - Uma visita = um registro (id único), mesmo atendendo vários moradores.
 *  - Uma visita pode ter várias linhas de cuidado, mas conta UMA vez no total.
 */
(function (root) {
  'use strict';

  var REALIZADA = 'Visita realizada';
  var TENTATIVAS = ['Morador ausente', 'Recusa', 'Imóvel fechado', 'Endereço não localizado', 'Visita reagendada'];

  var LINHAS = [
    ['has', 'Hipertensos (HAS)'], ['dm', 'Diabéticos (DM)'], ['gestante', 'Gestantes'],
    ['tuberculose', 'Tuberculose'], ['crianca', 'Crianças'], ['saude_mental', 'Saúde Mental'],
    ['hanseniase', 'Hanseníase'], ['idoso', 'Idosos'], ['acamado', 'Pessoas acamadas'],
    ['demais', 'Demais moradores']
  ];
  var LINHAS_CONDICAO = ['has', 'dm', 'gestante', 'tuberculose', 'saude_mental', 'hanseniase', 'acamado'];
  var IDADE_CRIANCA_MAX = 11;   // 0 a 11 anos (ECA)
  var IDADE_IDOSO_MIN = 60;

  // ---------------- datas (ISO yyyy-mm-dd, horário local) ----------------
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parse(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || ''));
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
  }
  function addDias(s, n) { var d = parse(s); d.setDate(d.getDate() + n); return iso(d); }
  function diasNoMes(mes) { var a = +mes.slice(0, 4), m = +mes.slice(5, 7); return new Date(a, m, 0).getDate(); }
  function mesDe(s) { return String(s).slice(0, 7); }
  function mesAnterior(mes) { var a = +mes.slice(0, 4), m = +mes.slice(5, 7) - 1; if (m === 0) { a--; m = 12; } return a + '-' + pad(m); }
  function mesSeguinte(mes) { var a = +mes.slice(0, 4), m = +mes.slice(5, 7) + 1; if (m === 13) { a++; m = 1; } return a + '-' + pad(m); }
  function inicioSemana(s) { var d = parse(s), dw = (d.getDay() + 6) % 7; d.setDate(d.getDate() - dw); return iso(d); } // segunda-feira
  function diasEntre(de, ate) { return Math.round((parse(ate) - parse(de)) / 86400000) + 1; }
  function ehDiaUtil(s) { var w = parse(s).getDay(); return w !== 0 && w !== 6; }
  function contarDias(de, ate, base) {
    if (!de || !ate || ate < de) return 0;
    if (base !== 'uteis') return diasEntre(de, ate);
    var n = 0; for (var d = de; d <= ate; d = addDias(d, 1)) if (ehDiaUtil(d)) n++;
    return n;
  }
  function idadeNaData(nasc, data) {
    var n = parse(nasc), d = parse(data); if (!n || !d) return null;
    var i = d.getFullYear() - n.getFullYear();
    if (d.getMonth() < n.getMonth() || (d.getMonth() === n.getMonth() && d.getDate() < n.getDate())) i--;
    return i;
  }

  // ---------------- períodos ----------------
  // tipo: hoje | 7d | 30d | mes | mes_anterior | personalizado
  function periodo(tipo, hoje, de, ate) {
    switch (tipo) {
      case 'hoje': return { de: hoje, ate: hoje, rotulo: 'Hoje' };
      case '7d': return { de: addDias(hoje, -6), ate: hoje, rotulo: 'Últimos 7 dias' };
      case '30d': return { de: addDias(hoje, -29), ate: hoje, rotulo: 'Últimos 30 dias' };
      case 'semana': var s = inicioSemana(hoje); return { de: s, ate: addDias(s, 6), rotulo: 'Esta semana' };
      case 'mes': var m = mesDe(hoje); return { de: m + '-01', ate: m + '-' + pad(diasNoMes(m)), rotulo: 'Mês atual' };
      case 'mes_anterior': var ma = mesAnterior(mesDe(hoje)); return { de: ma + '-01', ate: ma + '-' + pad(diasNoMes(ma)), rotulo: 'Mês anterior' };
      default:
        var d1 = de || hoje, d2 = ate || hoje;
        if (d2 < d1) { var t = d1; d1 = d2; d2 = t; }
        return { de: d1, ate: d2, rotulo: 'Período personalizado' };
    }
  }

  // ---------------- classificação ----------------
  function ehRealizada(v) { return v && v.situacao === REALIZADA; }
  function ehTentativa(v) { return v && TENTATIVAS.indexOf(v.situacao) >= 0; }

  // Linhas de cuidado de uma pessoa na data da visita
  function linhasDaPessoa(p, data) {
    var l = [], c = (p && p.condicoes) || {};
    LINHAS_CONDICAO.forEach(function (k) { if (c[k]) l.push(k); });
    var i = idadeNaData(p && p.data_nascimento, data);
    if (i != null && i >= 0 && i <= IDADE_CRIANCA_MAX) l.push('crianca');
    if (i != null && i >= IDADE_IDOSO_MIN) l.push('idoso');
    return l;
  }
  // Sugestão de linhas para uma visita (a partir dos moradores atendidos)
  function sugerirLinhas(pessoaIds, pessoas, data) {
    var s = {};
    (pessoaIds || []).forEach(function (id) {
      var p = pessoas.get ? pessoas.get(id) : pessoas[id];
      if (p) linhasDaPessoa(p, data).forEach(function (k) { s[k] = true; });
    });
    return LINHAS.map(function (x) { return x[0]; }).filter(function (k) { return s[k]; });
  }
  // Linhas efetivas: as gravadas na visita (array, mesmo vazio) ou, em registros
  // antigos sem o campo, as derivadas dos moradores. Sem nenhuma → "demais".
  function linhasDaVisita(v, pessoas) {
    var l = Array.isArray(v.linhas) ? v.linhas.filter(function (k) { return k !== 'demais'; }) : sugerirLinhas(v.pessoaIds, pessoas, v.data);
    return l.length ? l : ['demais'];
  }
  // ACS responsável: campo novo acsId; em registros antigos, o autor do primeiro histórico
  function acsDaVisita(v) {
    if (v.acsId) return v.acsId;
    return (v.historico && v.historico[0] && v.historico[0].por) || null;
  }

  // ---------------- filtragem ----------------
  // f: { de, ate, micro, linha, pessoaId, situacao ('' | 'realizadas' | 'tentativas' | situação exata), incluirDemo, acsId }
  function filtrar(visitas, f, ctx) {
    f = f || {};
    var fam = ctx.familias, pes = ctx.pessoas;
    return visitas.filter(function (v) {
      if (!v || !v.data) return false;
      if (f.de && v.data < f.de) return false;
      if (f.ate && v.data > f.ate) return false;
      if (f.incluirDemo === false && v.demo) return false;
      if (f.acsId && acsDaVisita(v) !== f.acsId) return false;
      if (f.micro) { var fm = fam.get ? fam.get(v.familiaId) : fam[v.familiaId]; if (!fm || fm.microarea !== f.micro) return false; }
      if (f.pessoaId && (v.pessoaIds || []).indexOf(f.pessoaId) < 0) return false;
      if (f.situacao === 'realizadas' && !ehRealizada(v)) return false;
      if (f.situacao === 'tentativas' && !ehTentativa(v)) return false;
      if (f.situacao && f.situacao !== 'realizadas' && f.situacao !== 'tentativas' && v.situacao !== f.situacao) return false;
      if (f.linha && linhasDaVisita(v, pes).indexOf(f.linha) < 0) return false;
      return true;
    });
  }

  // ---------------- resumo / agregações ----------------
  function resumo(visitas, ctx) {
    var r = { realizadas: 0, tentativas: 0, porSituacao: {}, porLinha: {}, pessoasPorLinha: {}, porMicro: {}, porDia: {},
      pessoasAtendidas: 0, familiasVisitadas: 0, demo: 0 };
    LINHAS.forEach(function (l) { r.porLinha[l[0]] = 0; r.pessoasPorLinha[l[0]] = 0; });
    TENTATIVAS.concat([REALIZADA]).forEach(function (s) { r.porSituacao[s] = 0; });
    var pessoas = {}, familias = {}, pesLinha = {};
    visitas.forEach(function (v) {
      if (v.demo) r.demo++;
      if (v.situacao in r.porSituacao) r.porSituacao[v.situacao]++;
      if (ehTentativa(v)) { r.tentativas++; return; }
      if (!ehRealizada(v)) return;
      r.realizadas++;
      familias[v.familiaId] = true;
      (v.pessoaIds || []).forEach(function (id) { pessoas[id] = true; });
      linhasDaVisita(v, ctx.pessoas).forEach(function (k) {
        r.porLinha[k]++;                                // cada visita conta 1x por linha
        (v.pessoaIds || []).forEach(function (id) { (pesLinha[k] || (pesLinha[k] = {}))[id] = true; });
      });
      var fm = ctx.familias.get ? ctx.familias.get(v.familiaId) : ctx.familias[v.familiaId];
      var mi = (fm && fm.microarea) || 'Sem microárea';
      r.porMicro[mi] = (r.porMicro[mi] || 0) + 1;
      r.porDia[v.data] = (r.porDia[v.data] || 0) + 1;
    });
    r.pessoasAtendidas = Object.keys(pessoas).length;
    r.familiasVisitadas = Object.keys(familias).length;
    Object.keys(pesLinha).forEach(function (k) { r.pessoasPorLinha[k] = Object.keys(pesLinha[k]).length; });
    return r;
  }

  function serieDiaria(porDia, de, ate) {
    var l = []; for (var d = de; d <= ate; d = addDias(d, 1)) l.push([d, porDia[d] || 0]); return l;
  }
  function serieSemanal(porDia, de, ate) {
    var m = {}, ordem = [];
    for (var d = de; d <= ate; d = addDias(d, 1)) { var s = inicioSemana(d); if (!(s in m)) { m[s] = 0; ordem.push(s); } m[s] += porDia[d] || 0; }
    return ordem.map(function (s) { return [s, m[s]]; });
  }
  function serieMensal(visitasRealizadas, mesFinal, n) {
    var meses = [], m = mesFinal; for (var i = 0; i < n; i++) { meses.unshift(m); m = mesAnterior(m); }
    var c = {}; meses.forEach(function (x) { c[x] = 0; });
    visitasRealizadas.forEach(function (v) { var k = mesDe(v.data); if (k in c) c[k]++; });
    return meses.map(function (x) { return [x, c[x]]; });
  }
  // acumulado por dia do mês (para comparar meses)
  function acumuladoMes(visitasRealizadas, mes, ateDia) {
    var n = diasNoMes(mes), por = new Array(n).fill(0);
    visitasRealizadas.forEach(function (v) { if (mesDe(v.data) === mes) por[+v.data.slice(8, 10) - 1]++; });
    var out = [], acc = 0, lim = ateDia == null ? n : Math.min(n, ateDia);
    for (var i = 0; i < lim; i++) { acc += por[i]; out.push(acc); }
    return out;
  }

  // ---------------- meta mensal ----------------
  // metasDoc: { meses: { 'aaaa-mm': { valor, historico:[{valor, em}] } } }
  function metaDoMes(metasDoc, mes) {
    var x = metasDoc && metasDoc.meses && metasDoc.meses[mes];
    return x && x.valor > 0 ? x.valor : null;
  }
  // Cálculo da meta: base 'uteis' (seg–sex) ou 'corridos'
  function calcularMeta(meta, realizadas, mes, hoje, base) {
    var total = contarDias(mes + '-01', mes + '-' + pad(diasNoMes(mes)), base);
    var mesHoje = mesDe(hoje), decorridos;
    if (mes < mesHoje) decorridos = total;
    else if (mes > mesHoje) decorridos = 0;
    else decorridos = contarDias(mes + '-01', hoje, base);
    var media = decorridos ? realizadas / decorridos : 0;
    var projecao = mes < mesHoje ? realizadas : (decorridos ? Math.round(media * total) : realizadas);
    var r = {
      meta: meta, realizadas: realizadas,
      restantes: meta ? Math.max(0, meta - realizadas) : null,
      percentual: meta ? (realizadas / meta) * 100 : null,
      mediaDiaria: media, projecao: projecao,
      diasDecorridos: decorridos, diasTotais: total, diasRestantes: Math.max(0, total - decorridos),
      base: base === 'uteis' ? 'uteis' : 'corridos'
    };
    // ritmo necessário para bater a meta nos dias que faltam
    r.necessarioPorDia = meta && r.diasRestantes ? Math.max(0, meta - realizadas) / r.diasRestantes : null;
    r.projecaoAtinge = meta ? projecao >= meta : null;
    return r;
  }
  function fmtPct(p, casas) {
    if (p == null) return '—';
    return p.toFixed(casas == null ? 2 : casas).replace('.', ',') + '%';
  }

  var API = {
    REALIZADA: REALIZADA, TENTATIVAS: TENTATIVAS, LINHAS: LINHAS, LINHAS_CONDICAO: LINHAS_CONDICAO,
    IDADE_CRIANCA_MAX: IDADE_CRIANCA_MAX, IDADE_IDOSO_MIN: IDADE_IDOSO_MIN,
    iso: iso, parse: parse, addDias: addDias, diasNoMes: diasNoMes, mesDe: mesDe, mesAnterior: mesAnterior, mesSeguinte: mesSeguinte,
    inicioSemana: inicioSemana, contarDias: contarDias, idadeNaData: idadeNaData,
    periodo: periodo, ehRealizada: ehRealizada, ehTentativa: ehTentativa,
    linhasDaPessoa: linhasDaPessoa, sugerirLinhas: sugerirLinhas, linhasDaVisita: linhasDaVisita, acsDaVisita: acsDaVisita,
    filtrar: filtrar, resumo: resumo, serieDiaria: serieDiaria, serieSemanal: serieSemanal, serieMensal: serieMensal,
    acumuladoMes: acumuladoMes, metaDoMes: metaDoMes, calcularMeta: calcularMeta, fmtPct: fmtPct
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.ACSProdutividade = API;
})(typeof window !== 'undefined' ? window : this);

/*
 * ACS DIGITAL — Motor da Busca Rápida (funções puras)
 * Navegador: window.ACSBusca · Node: module.exports
 *
 * Procura em: nome, CPF/DNV, CNS, data de nascimento, telefone, endereço, número,
 * bairro, família (código e responsável) e microárea.
 * - Sem diferença de maiúsculas/minúsculas e acentos.
 * - Nomes incompletos: cada palavra digitada precisa casar com o início de alguma palavra.
 * - Semelhantes: tolera 1 letra diferente (palavras com 5+ letras) e marca o resultado
 *   como "semelhante", sempre abaixo dos resultados exatos.
 * - Homônimos: pessoas com o mesmo nome completo são sinalizadas para não confundir.
 */
(function (root) {
  'use strict';

  function norm(s) { return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim(); }
  function dig(s) { return String(s == null ? '' : s).replace(/\D/g, ''); }
  var IGNORAR = ['de', 'da', 'do', 'das', 'dos', 'e', 'rua', 'r', 'av', 'avenida', 'travessa', 'tv', 'n', 'no', 'numero', 'microarea', 'ma', 'familia'];

  function lev1(a, b) { // distância de edição <= 1 ?
    if (a === b) return true;
    var la = a.length, lb = b.length;
    if (Math.abs(la - lb) > 1) return false;
    var i = 0, j = 0, dif = 0;
    while (i < la && j < lb) {
      if (a[i] === b[j]) { i++; j++; continue; }
      if (++dif > 1) return false;
      if (la > lb) i++; else if (lb > la) j++; else { i++; j++; }
    }
    return dif + (la - i) + (lb - j) <= 1;
  }

  // Interpreta datas: dd/mm/aaaa, dd/mm, dd-mm-aaaa, aaaa-mm-dd
  function parseDataConsulta(q) {
    var m = /^(\d{1,2})[\/.-](\d{1,2})(?:[\/.-](\d{2,4}))?$/.exec(q.trim());
    if (m) { var a = m[3] ? (m[3].length === 2 ? (+m[3] > 30 ? '19' : '20') + m[3] : m[3]) : null; return { d: pad(+m[1]), m: pad(+m[2]), a: a }; }
    m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(q.trim());
    if (m) return { d: m[3], m: m[2], a: m[1] };
    return null;
  }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function palavras(s) { return norm(s).split(/[^a-z0-9]+/).filter(Boolean); }

  // Monta o índice de uma pessoa (campos já normalizados)
  function indexar(p, f, resp) {
    f = f || {};
    return {
      nome: palavras(p.nome),
      nomeFull: norm(p.nome),
      cpf: dig(p.cpf_dnv && p.cpf_dnv.numero),
      cns: dig(p.cns),
      tel: dig(p.telefone),
      telFam: dig(f.telefone),
      nasc: p.data_nascimento || '',
      endereco: palavras(f.endereco),
      numero: norm(f.numero),
      bairro: palavras(f.bairro),
      complemento: palavras(f.complemento),
      familia: norm(f.codigo),
      resp: palavras(resp && resp.nome),
      micro: norm(f.microarea)
    };
  }

  // Avalia uma consulta contra o índice. Retorna null ou { score, campos:[], semelhante }
  function avaliar(q, ix) {
    var qn = norm(q); if (!qn) return null;
    var qd = dig(q), campos = {}, score = 0, semelhante = false;

    // 1) Data de nascimento
    var dt = parseDataConsulta(q);
    if (dt && ix.nasc) {
      var p = ix.nasc.split('-');
      if (p[2] === dt.d && p[1] === dt.m && (!dt.a || p[0] === dt.a)) return { score: 90, campos: ['Data de nascimento'], semelhante: false };
      return null;
    }
    // 2) Somente números (CPF, CNS, telefone, número da casa, microárea, código da família)
    var soNum = /^[\d\s().+\-\/]+$/.test(q) && qd.length > 0;
    if (soNum) {
      if (qd.length >= 3 && ix.cpf && ix.cpf.indexOf(qd) >= 0) { campos.CPF = 1; score = Math.max(score, ix.cpf === qd ? 100 : 70); }
      if (qd.length >= 3 && ix.cns && ix.cns.indexOf(qd) >= 0) { campos.CNS = 1; score = Math.max(score, ix.cns === qd ? 100 : 70); }
      if (qd.length >= 4 && ix.tel && (ix.tel.indexOf(qd) >= 0 || ('55' + ix.tel).indexOf(qd) >= 0)) { campos.Telefone = 1; score = Math.max(score, 80); }
      if (qd.length >= 4 && ix.telFam && ix.telFam.indexOf(qd) >= 0) { campos['Telefone da família'] = 1; score = Math.max(score, 60); }
      if (qd.length >= 6 && ix.nasc && ix.nasc.replace(/-/g, '').indexOf(qd) >= 0) { campos['Data de nascimento'] = 1; score = Math.max(score, 60); }
      if (qd.length <= 2 && ix.micro && dig(ix.micro) === qd.padStart(2, '0')) { campos['Microárea'] = 1; score = Math.max(score, 40); }
      if (qd.length <= 5 && ix.numero && dig(ix.numero) === qd) { campos['Número da residência'] = 1; score = Math.max(score, 45); }
      var lc = Object.keys(campos); return lc.length ? { score: score, campos: lc, semelhante: false } : null;
    }
    // 3) Texto: cada palavra precisa casar (prefixo) com alguma palavra de algum campo
    var toks = palavras(q).filter(function (t) { return IGNORAR.indexOf(t) < 0; });
    if (!toks.length) return null;
    // O nome do responsável só é usado na busca de FAMÍLIAS (ix.ehFamilia), nunca para
    // listar outros moradores da casa — evita confundir pessoas.
    var grupos = [['Nome', ix.nome, 30], ['Endereço', ix.endereco, 18], ['Bairro', ix.bairro, 14], ['Complemento', ix.complemento, 8]];
    if (ix.ehFamilia) grupos.push(['Responsável', ix.resp, 26]);
    var total = 0;
    for (var i = 0; i < toks.length; i++) {
      var t = toks[i], melhor = 0, campo = null, sem = false;
      // código da família (f0001) e microárea por número
      if (ix.familia && (ix.familia === t || (t.length >= 2 && ix.familia.indexOf(t) === 0 && /^f\d/.test(t)))) { melhor = 40; campo = 'Família'; }
      if (/^\d{1,5}$/.test(t)) {
        if (ix.numero && dig(ix.numero) === t) { melhor = Math.max(melhor, 16); campo = campo || 'Número da residência'; }
        if (ix.micro && dig(ix.micro) === t.padStart(2, '0')) { melhor = Math.max(melhor, 12); campo = campo || 'Microárea'; }
      }
      for (var g = 0; g < grupos.length; g++) {
        var ws = grupos[g][1], peso = grupos[g][2];
        for (var w = 0; w < ws.length; w++) {
          var pal = ws[w], pts = 0;
          if (pal === t) pts = peso + 6;
          else if (pal.indexOf(t) === 0) pts = peso + (t.length >= 3 ? 3 : 0);
          else if (t.length >= 4 && pal.indexOf(t) > 0) pts = peso - 6;
          if (pts > melhor) { melhor = pts; campo = grupos[g][0]; sem = false; }
        }
      }
      if (!melhor && t.length >= 5) { // tolerância a 1 letra diferente
        for (var g2 = 0; g2 < grupos.length && !melhor; g2++) {
          var ws2 = grupos[g2][1];
          for (var w2 = 0; w2 < ws2.length; w2++) {
            var pal2 = ws2[w2], cand = pal2.length > t.length ? pal2.slice(0, t.length + 1) : pal2;
            if (lev1(t, pal2) || (pal2.length > t.length && (lev1(t, pal2.slice(0, t.length)) || lev1(t, cand)))) { melhor = grupos[g2][2] - 12; campo = grupos[g2][0]; sem = true; break; }
          }
        }
      }
      if (!melhor) return null;
      if (sem) semelhante = true;
      total += melhor; campos[campo] = 1;
    }
    // bônus: consulta igual ao início do nome completo
    var qJunta = toks.join(' ');
    if (ix.nomeFull === qn) total += 40; else if (ix.nomeFull.indexOf(qn) === 0) total += 20;
    return { score: total / toks.length + (semelhante ? -15 : 0) + (ix.nomeFull.indexOf(qJunta) >= 0 ? 5 : 0), campos: Object.keys(campos), semelhante: semelhante };
  }

  // pessoas: array; familias: Map|obj; retorna resultados ordenados
  function buscar(q, pessoas, familias, opts) {
    opts = opts || {};
    var getF = function (id) { return familias.get ? familias.get(id) : familias[id]; };
    var getP = opts.pessoasMap ? function (id) { return opts.pessoasMap.get(id); } : function () { return null; };
    var res = [];
    var contNome = {};
    pessoas.forEach(function (p) { var k = norm(p.nome); contNome[k] = (contNome[k] || 0) + 1; });
    pessoas.forEach(function (p) {
      if (opts.filtro && !opts.filtro(p)) return;
      var f = getF(p.familiaId), resp = f && f.responsavelId ? getP(f.responsavelId) : null;
      var r = avaliar(q, indexar(p, f, resp));
      if (r) res.push({ pessoa: p, familia: f || null, score: r.score, campos: r.campos, semelhante: r.semelhante, homonimo: contNome[norm(p.nome)] > 1 });
    });
    res.sort(function (a, b) { return (a.semelhante - b.semelhante) || (b.score - a.score) || (norm(a.pessoa.nome) < norm(b.pessoa.nome) ? -1 : 1); });
    return res;
  }

  // Famílias que casam pela identificação/endereço (para a seção "Famílias")
  function buscarFamilias(q, familias, pessoasMap) {
    var out = [];
    (familias.forEach ? familias : []).forEach(function (f) {
      var resp = f.responsavelId && pessoasMap ? pessoasMap.get(f.responsavelId) : null;
      var ix = indexar({ nome: '' }, f, resp); ix.ehFamilia = true;
      var r = avaliar(q, ix);
      if (r) out.push({ familia: f, score: r.score, campos: r.campos });
    });
    out.sort(function (a, b) { return b.score - a.score; });
    return out;
  }

  var API = { norm: norm, dig: dig, lev1: lev1, parseDataConsulta: parseDataConsulta, indexar: indexar, avaliar: avaliar, buscar: buscar, buscarFamilias: buscarFamilias };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.ACSBusca = API;
})(typeof window !== 'undefined' ? window : this);

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

/*
 * ACS DIGITAL — Motor da Agenda Inteligente (funções puras)
 * Navegador: window.ACSAgenda · Node: module.exports
 *
 * - O compromisso (agenda) e o registro efetivo da visita são coisas distintas:
 *   ao concluir, o compromisso guarda o id da visita (visitaId); nunca se cria
 *   uma segunda visita automaticamente.
 * - Proximidade geográfica só usa coordenadas VERIFICADAS. Sem elas, a ordem é por
 *   microárea, bairro, rua e número, sem afirmar precisão.
 */
(function (root) {
  'use strict';

  var CATEGORIAS = [['visita', 'Visita domiciliar'], ['retorno', 'Retorno'], ['acompanhamento', 'Acompanhamento de linha de cuidado'],
    ['administrativa', 'Atividade administrativa'], ['reuniao', 'Reunião'], ['acao_coletiva', 'Ação coletiva']];
  var SITUACOES = ['Agendado', 'Concluído', 'Não realizado', 'Reagendado', 'Cancelado'];
  var CAT_VISITA = ['visita', 'retorno', 'acompanhamento'];
  var LEMBRETES_PADRAO = { vespera: true, manha: true, horaManha: '07:00', horario: true, antecedenciaMin: 30 };

  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parse(s) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; }
  function addDias(s, n) { var d = parse(s); d.setDate(d.getDate() + n); return iso(d); }
  function min(h) { var m = /^(\d{1,2}):(\d{2})/.exec(h || ''); return m ? +m[1] * 60 + +m[2] : null; }
  function ehVisita(cat) { return CAT_VISITA.indexOf(cat) >= 0; }
  function rotCat(c) { var x = CATEGORIAS.filter(function (k) { return k[0] === c; })[0]; return x ? x[1] : c; }
  function ativo(a) { return a.situacao !== 'Cancelado' && a.situacao !== 'Reagendado'; }
  function ord(a, b) { return (a.data || '').localeCompare(b.data || '') || (a.hora || '99:99').localeCompare(b.hora || '99:99') || (a.titulo || '').localeCompare(b.titulo || ''); }

  function inicioSemana(s) { var d = parse(s), dw = (d.getDay() + 6) % 7; d.setDate(d.getDate() - dw); return iso(d); }
  function semana(ref) { var s = inicioSemana(ref), l = []; for (var i = 0; i < 7; i++) l.push(addDias(s, i)); return l; }
  function gradeMes(mes) { // semanas (seg..dom) que cobrem o mês; dias fora do mês vêm marcados
    var ini = inicioSemana(mes + '-01'), sem = [], d = ini;
    do { var w = []; for (var i = 0; i < 7; i++) { w.push({ data: d, doMes: d.slice(0, 7) === mes }); d = addDias(d, 1); } sem.push(w); } while (d.slice(0, 7) === mes);
    return sem;
  }

  // ---------- indicadores ----------
  function indicadores(itens, de, ate, hoje) {
    var r = { hoje: 0, visitasProgramadas: 0, retornos: 0, concluidas: 0, pendentes: 0, atrasados: 0 };
    itens.forEach(function (a) {
      if (!a.data) return;
      if (a.situacao === 'Agendado' && a.data < hoje) r.atrasados++;          // todos os vencidos ainda agendados
      if (a.data === hoje && ativo(a)) r.hoje++;
      if (a.data < de || a.data > ate) return;
      if (a.situacao === 'Agendado') {
        r.pendentes++;
        if (a.data >= hoje && ehVisita(a.categoria)) r.visitasProgramadas++;
        if (a.data >= hoje && a.categoria === 'retorno') r.retornos++;
      }
      if (a.situacao === 'Concluído') r.concluidas++;
    });
    return r;
  }

  // ---------- lembretes (dentro do app) ----------
  // agora: { data:'aaaa-mm-dd', hora:'hh:mm' }
  function lembretes(itens, agora, cfg) {
    cfg = Object.assign({}, LEMBRETES_PADRAO, cfg || {});
    var amanha = addDias(agora.data, 1), mAgora = min(agora.hora), out = [];
    itens.forEach(function (a) {
      if (a.situacao !== 'Agendado' || !a.data) return;
      var tipo = null;
      if (a.data < agora.data) tipo = 'atrasado';
      else if (a.data === agora.data) {
        var mh = min(a.hora);
        if (cfg.horario && mh != null && mAgora >= mh - (+cfg.antecedenciaMin || 0) && mAgora <= mh + 60) tipo = 'horario';
        else if (cfg.manha && mAgora >= (min(cfg.horaManha) || 0)) tipo = 'manha';
      } else if (a.data === amanha && cfg.vespera) tipo = 'vespera';
      if (tipo) out.push({ item: a, tipo: tipo, chave: a.id + ':' + tipo + ':' + a.data });
    });
    var pri = { horario: 0, atrasado: 1, manha: 2, vespera: 3 };
    out.sort(function (x, y) { return (pri[x.tipo] - pri[y.tipo]) || ord(x.item, y.item); });
    return out;
  }

  // ---------- proximidade ----------
  function haversineKm(a, b) {
    var R = 6371, rad = Math.PI / 180, dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  // coordDe(item) -> {lat,lng} somente se verificadas; enderecoDe(item) -> {micro,bairro,endereco,numero}
  function ordenarProximidade(itens, coordDe, enderecoDe) {
    var com = [], sem = [];
    itens.forEach(function (a) { var c = coordDe(a); if (c) com.push({ a: a, c: c }); else sem.push(a); });
    var ordem = [], totalKm = 0;
    if (com.length) {
      com.sort(function (x, y) { return ord(x.a, y.a); });
      var atual = com.shift(); ordem.push(atual.a);
      while (com.length) {
        var mi = 0, md = Infinity;
        for (var i = 0; i < com.length; i++) { var d = haversineKm(atual.c, com[i].c); if (d < md) { md = d; mi = i; } }
        totalKm += md; atual = com.splice(mi, 1)[0]; ordem.push(atual.a);
      }
    }
    var nComCoord = ordem.length;
    sem.sort(function (x, y) {
      var ex = enderecoDe(x) || {}, ey = enderecoDe(y) || {};
      return String(ex.micro || '~').localeCompare(String(ey.micro || '~')) || String(ex.bairro || '~').localeCompare(String(ey.bairro || '~')) ||
        String(ex.endereco || '~').localeCompare(String(ey.endereco || '~')) || ((parseInt(ex.numero, 10) || 99999) - (parseInt(ey.numero, 10) || 99999)) || ord(x, y);
    });
    return { ordem: ordem.concat(sem), comCoord: nComCoord, semCoord: sem, totalKm: totalKm };
  }
  function rotaMaps(pontos) { // pontos: [{lat,lng}] na ordem; até 10 pontos
    if (!pontos || pontos.length < 2) return null;
    var p = pontos.slice(0, 10), f = function (x) { return x.lat + ',' + x.lng; };
    var url = 'https://www.google.com/maps/dir/?api=1&origin=' + encodeURIComponent(f(p[0])) + '&destination=' + encodeURIComponent(f(p[p.length - 1]));
    if (p.length > 2) url += '&waypoints=' + encodeURIComponent(p.slice(1, -1).map(f).join('|'));
    return url;
  }

  // ---------- agrupamento ----------
  // por: horario | data | microarea | linha | endereco ; ctx: { micro(a), linhas(a)->[rotulos], endereco(a)->texto }
  function agrupar(itens, por, ctx) {
    var l = itens.slice().sort(ord);
    if (por === 'horario' || !por) return [{ rotulo: null, itens: l }];
    var g = {}, ordem = [];
    l.forEach(function (a) {
      var chaves = por === 'data' ? [a.data] : por === 'microarea' ? [ctx.micro(a) ? 'Microárea ' + ctx.micro(a) : 'Sem microárea'] :
        por === 'linha' ? (ctx.linhas(a).length ? ctx.linhas(a) : ['Sem linha de cuidado']) : [ctx.endereco(a) || 'Sem endereço'];
      chaves.forEach(function (k) { if (!g[k]) { g[k] = []; ordem.push(k); } g[k].push(a); });
    });
    ordem.sort(function (a, b) { return /^Sem /.test(a) - /^Sem /.test(b) || a.localeCompare(b); });
    return ordem.map(function (k) { return { rotulo: k, itens: g[k] }; });
  }

  var API = { CATEGORIAS: CATEGORIAS, SITUACOES: SITUACOES, CAT_VISITA: CAT_VISITA, LEMBRETES_PADRAO: LEMBRETES_PADRAO,
    ehVisita: ehVisita, rotCat: rotCat, ord: ord, ativo: ativo, semana: semana, inicioSemana: inicioSemana, gradeMes: gradeMes, addDias: addDias,
    indicadores: indicadores, lembretes: lembretes, haversineKm: haversineKm, ordenarProximidade: ordenarProximidade, rotaMaps: rotaMaps, agrupar: agrupar };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.ACSAgenda = API;
})(typeof window !== 'undefined' ? window : this);
