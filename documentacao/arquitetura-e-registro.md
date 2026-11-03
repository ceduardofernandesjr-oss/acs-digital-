# ACS DIGITAL — Arquitetura e registro de desenvolvimento

App piloto (v3): https://claude.ai/artifact/DRVSUKk823oTgvEX7kDNt6
Última atualização: 02/11/2026 (v3 — Busca Rápida, Central de Pendências e Agenda Inteligente)

---

## 1. Arquitetura proposta

O desenvolvimento acontece em **duas camadas**, para entregar algo utilizável já e não reconstruir depois.

**Piloto (no ar; v1 a v3).** Aplicativo web de página única, hospedado no claude.ai, com banco de dados real (documentos JSON persistentes, em tempo real). O acesso é restrito ao proprietário e aos editores autorizados, por regra aplicada no servidor (`read: admin, write: admin`). Ele abre no celular, no tablet e no computador.
- Motivo: validar o fluxo do ACS (cadastro → completude → visita) com dados fictícios, sem custo de infraestrutura.
- Limites conhecidos: não instala como PWA, não funciona offline (o ambiente não permite *service workers*) e é de um único usuário/equipe. Comporta até 25 mil registros.

**Produção / SaaS (próximas etapas).** Next.js + TypeScript + Tailwind, com Supabase (PostgreSQL, autenticação, RLS e *storage*), PWA com *service worker* e fila offline em IndexedDB criptografado.
- Esquema relacional pronto em `schema.sql`, com multi-município, perfis e auditoria.
- O **motor de completude é o mesmo código** nas duas camadas (`completude.js`, sem dependências). Isso garante cálculo idêntico no piloto, no app de produção e em *triggers*/relatórios.
- O mesmo vale para o **motor de produtividade** (`produtividade.js`): períodos, contabilização, linhas de cuidado e meta.
- E, na v3, para os motores de **busca** (`busca.js`), **pendências** (`pendencias.js`) e **agenda** (`agenda.js`). Todos são funções puras, testadas em Node.

Decisões técnicas:
| Decisão | Motivo |
|---|---|
| Motor de completude isolado e testado | É a regra de negócio crítica: um único lugar para corrigir e testar |
| Dados da família gravados uma única vez | Evita duplicidade; uma alteração reflete em todos os integrantes |
| Histórico dentro de cada registro (últimas 30 alterações) | Auditoria sem estourar o limite de documentos do piloto. Na produção, vai para a tabela `auditoria` |
| Exibir o percentual arredondado **para baixo** | Garante que o número nunca contradiga a cor (94,6% aparece como 94% amarelo, e não como 95% amarelo) |
| Regra de 6 anos sem padrão | A referência não define. Até o administrador escolher, a pessoa fica como "faixa indefinida" e só contam os campos obrigatórios nas duas faixas |

## 2. Estrutura de dados (piloto)

- `familias/{id}`: código (F0001…), responsável (id da pessoa), endereço (campos 20–23), complemento, microárea, unidade, equipe, telefone, data do cadastro, situação (Ativa/Mudou-se/Inativa/Arquivada), campos 25–35 do domicílio, observações, histórico.
- `pessoas/{id}`: familiaId, situação cadastral, campos individuais (1–19, 24, 36–40), condições acompanhadas (HAS, DM, gestante, acamado, domiciliado, saúde mental), DUM, observações, histórico.
- `visitas/{id}`: familiaId, pessoaIds[], data, hora, tipo, motivo, situação (6 opções), situação encontrada, orientações, encaminhamentos, observações, resultado, histórico.
- `visitas/{id}` (campos novos na v2): `acsId` (ACS responsável) e `linhas[]` (linhas de cuidado da visita, gravadas no momento do registro).
- `metas/{acsId}` (novo na v2): `meses: { "aaaa-mm": { valor, historico: [{ valor, em, por }] } }` e `mediaBase` ("uteis" ou "corridos").
- `familias/{id}` (campos novos na v2): `latitude`, `longitude` e `coordVerificadas`.
- `pessoas.condicoes` (chaves novas na v2): `tuberculose` e `hanseniase`.
- `agenda/{id}` (novo na v3): categoria, título, morador, família, linha de cuidado, data, horário, endereço, motivo, observações, situação, ACS responsável e histórico. Também guarda os vínculos `visitaId`, `origemVisitaId`, `reagendadoDe` e `reagendadoPara`.
  - Categorias: visita domiciliar, retorno, acompanhamento de linha de cuidado, atividade administrativa, reunião e ação coletiva.
  - Situações: Agendado, Concluído, Não realizado, Reagendado e Cancelado.
- `pendencias/{chave}` (novo na v3): guarda **apenas as ações do ACS** — status, justificativas (com data e autor) e resolução — e as observações manuais.
- `visitas/{id}` (campo novo na v3): `agendaId`, o compromisso concluído por esta visita.
- `config/geral` (chaves novas na v3): prazos de tuberculose, hanseníase e saúde mental (vazios = não avaliar), `niveisPendencia`, `tentativasReagendar`, `diasProximos` e `lembretes` (véspera, manhã com horário, no horário com antecedência).
- `config/geral`: agente, município, unidade, equipe, microáreas, regra de 6 anos, rótulo do campo 16, prazos dos alertas e meses para considerar um cadastro desatualizado.

Produção: ver `schema.sql` (organizações → unidades → equipes → microáreas; usuários com perfis; famílias; pessoas; visitas + visita_pessoas; auditoria; RLS por organização).

### Migração v1 → v2 (segura e aditiva)
- Não houve reescrita de nenhum documento existente: somente campos e coleção novos.
- **Visitas antigas sem `acsId`:** o ACS responsável é lido do autor do primeiro registro do histórico da visita.
- **Visitas antigas sem `linhas`:** as linhas são derivadas, na leitura, das condições e da idade dos moradores atendidos na data da visita.
- **Lista de linhas vazia (`[]`):** quando gravada explicitamente, significa "Demais moradores".
- Analisado antes de publicar: o banco ao vivo tinha 5 famílias, 13 pessoas e 17 visitas fictícias, sem configuração salva. Nada foi alterado.

### Migração v2 → v3 (segura e aditiva)
- Foram criadas duas coleções (`agenda` e `pendencias`), um campo opcional na visita e chaves novas na configuração. Nenhum documento existente foi reescrito.
- As pendências automáticas **não são gravadas**: são calculadas a cada mudança nos dados. Por isso não duplicam e se resolvem sozinhas quando o dado muda.
  - A chave de cada uma é `tipo:alvo:identificadaEm`.
  - A data de identificação é derivada dos dados (ex.: dia seguinte ao fim do prazo).
- As novas coleções ficam protegidas pela mesma regra do servidor (só proprietário e editores). Isso foi verificado no banco ao vivo: a escrita como Colaborador foi recusada.

## 3. Relacionamento família ↔ pessoas

```
Família/Domicílio 1 ──── N Pessoa
     │ responsavelId ──────► Pessoa
Pessoa.cuidador.pessoaId ──► Pessoa (mesma família) | ou nome livre
Visita N ──── 1 Família ; Visita N ──── N Pessoa
```
- Na ficha individual, os campos com prefixo "Família —" (e o endereço) aparecem marcados como dado compartilhado. Editar ali grava na família e atualiza a completude de todos os integrantes.
- Cada pessoa tem o próprio percentual. O campo familiar conta para cada integrante, mas fica armazenado uma única vez.

## 4. Os 40 campos (sequência da referência 02/2023)

| Nº | Campo | Onde fica | > 6 anos | < 6 anos |
|---|---|---|---|---|
| 1–9 | Nome, Data de nascimento, CPF/DNV, CNS, Nacionalidade, Município de nascimento, Sexo biológico, Raça/cor, Deficiência | Pessoa | Obrigatório | Obrigatório |
| 10–12 | Situação familiar, Frequenta a escola, Escolaridade | Pessoa | Obrigatório | NSA |
| 13 | NIS | Pessoa | NSA | Condicional |
| 14–17 | Território social, Cartão Família Carioca, Auxílio Brasil, Plano de saúde | Pessoa | Obrigatório | Obrigatório |
| 18–19 | Fuma, Religião | Pessoa | Obrigatório | NSA |
| 20–23 | Endereço, Número, Bairro, CEP | Família | Obrigatório | Obrigatório |
| 24 | Telefone | Pessoa | Obrigatório | NSA |
| 25–35 | Situação de moradia … Renda familiar | Família | Obrigatório | Obrigatório |
| 36 | CadÚnico | Pessoa | NSA | Condicional |
| 37–40 | Certidão de nascimento, Creche/pré-escola, Principal cuidador, Parentesco | Pessoa | NSA | Obrigatório |

Aplicáveis: **34** (> 6 anos) · **32 a 34** (< 6 anos, conforme a condição).

**Condição de NIS/CadÚnico (< 6 anos):** pertence a território social **ou** tem Cartão Família Carioca **ou** recebe o benefício do campo 16.

**Pressupostos a confirmar com as imagens originais**, que não chegaram com o texto:
- opções da "Situação familiar" (campo 10), no padrão de convivência;
- opções de escolaridade, moradia, água, esgoto, lixo e renda (padrão e-SUS);
- a condição acima.

As opções ficam em um único lugar do código e são fáceis de ajustar.

## 5. Algoritmo de completude

```
faixa  = idade > 6 → "maior" | idade < 6 → "menor" | idade = 6 → config.regraSeisAnos (ou indefinida)
para cada campo 1..40:
  regra = tabela[faixa][n]   (O / N / C)
  N → NSA (fora do cálculo)
  C e condição falsa → NSA ;  C e verdadeira → conta
  O/C → válido? preenchido : pendente
percentual = preenchidos / aplicáveis × 100 (precisão interna)
cor = ≥ 95 verde | ≥ 75 amarelo | < 75 vermelho
```
Validação de "preenchido corretamente":
- CPF e CNS com dígito verificador; NIS com dígito; DNV com 11 dígitos;
- CEP com 8 dígitos; telefone com 10–11 dígitos; cômodos de 1 a 50;
- nome e sobrenome; data de nascimento válida e não futura;
- opções dentro da lista.

Valores artificiais ("xxx", "-", "0", "n/a", "não sei", repetições) **não contam**.

O recálculo é automático: a cada tecla na ficha, a cada alteração da família, ao mudar a regra de 6 anos e na mudança de faixa por aniversário (a idade é calculada pela data atual).

**Testes automatizados:** `node --test test/completude.test.js`, com 20 testes, todos passando. Cobrem:
- tabela de regras e limites de cor (95/94, 75/74);
- garantia de que o número exibido nunca contradiz a cor;
- verde com pendência continua mostrando a pendência;
- condicionais e regra de 6 anos;
- aniversário mudando de faixa;
- dado familiar alterando todos os integrantes;
- documentos inválidos e valores artificiais.

## 5b. Regras de produtividade (v2)

- **Visita realizada:** só a situação "Visita realizada" entra no total.
- **Tentativa não concluída:** Morador ausente, Recusa, Imóvel fechado, Endereço não localizado e também **Visita reagendada** (não foi realizada).
- **Um registro por visita**, com id único, mesmo atendendo vários moradores (`pessoaIds[]`).
- **Linhas de cuidado:**
  - HAS, DM, Gestantes, Tuberculose, Saúde Mental, Hanseníase e Acamados vêm das condições da pessoa;
  - Crianças são as de 0–11 anos e Idosos os de 60+, pela idade **na data da visita**;
  - sem linha = Demais moradores;
  - são sugeridas automaticamente no formulário e podem ser ajustadas;
  - a visita conta 1x em cada linha e **1x no total geral**.
- **Períodos:**
  - Hoje;
  - 7 dias (hoje − 6);
  - 30 dias (hoje − 29);
  - Mês atual;
  - Mês anterior;
  - Tudo;
  - Personalizado (inverte as datas se vierem trocadas).
  - Semana: de segunda a domingo.
- **Meta:**
  - individual por ACS e por mês;
  - nunca é definida automaticamente;
  - cada alteração vai para o histórico.
- **Fórmulas da meta:**
  - restantes = máx(0, meta − realizadas);
  - % = realizadas ÷ meta × 100, exibido com 2 casas (ex.: 85/120 = 70,83%);
  - média diária = realizadas ÷ dias decorridos (dias úteis seg–sex, por padrão, ou dias corridos, escolha do ACS);
  - projeção = média × dias do mês (mês encerrado: projeção = realizado);
  - necessário por dia = restantes ÷ dias restantes.
- **Registros fictícios:**
  - entram nos números por padrão, com aviso visível, e podem ser ocultados com um toque;
  - os relatórios exportados trazem o aviso.
- **Google Maps:**
  - prioridade do destino: coordenadas verificadas > endereço completo > coordenadas não verificadas > endereço parcial;
  - "COMO CHEGAR" abre a rota (`maps/dir`) e o endereço clicável abre a busca (`maps/search`);
  - quando o endereço está incompleto, aparece "Corrigir endereço".

**Testes:** `node --test test/produtividade.test.js`, com 15 testes passando. Cobrem:
- períodos e virada de ano;
- tentativas fora do total;
- vários moradores em 1 registro;
- linhas sem duplicar o total;
- prioridade das linhas gravadas;
- idade na data da visita;
- filtros combinados;
- exclusão dos fictícios;
- ACS dos registros antigos;
- meta 120/85 = 35 restantes e 70,83%;
- média e projeção em dias úteis e corridos;
- séries diária, semanal, mensal e acumulada.

## 5c. Regras da v3

**Busca Rápida.**
- Campos pesquisados: nome (inclusive incompleto), CPF/DNV, CNS, data de nascimento (dd/mm/aaaa, dd/mm ou aaaa-mm-dd), telefone (com ou sem máscara), endereço, número da residência, bairro, código da família (ex.: F0001, exige o "F") e microárea.
- Ignora maiúsculas e acentos.
- Cada palavra digitada precisa casar com o início de uma palavra do cadastro. Assim, palavras de pessoas diferentes não se misturam.
- **Semelhantes:** tolera 1 letra diferente em palavras de 5 ou mais letras. Esses resultados vêm sempre depois dos exatos e marcados "Semelhante".
- **Homônimos:** são sinalizados.
- O nome do responsável encontra a **família**, e não os outros moradores da casa.

**Central de Pendências.**
- **Cadastro:**
  - individual abaixo de 95% ou com faixa indefinida;
  - dados obrigatórios pendentes em cadastro verde;
  - família incompleta;
  - telefone (quando aplicável à faixa etária) ou endereço ausente;
  - desatualizado.
- **Linhas de cuidado:** sem visita realizada dentro do prazo configurado.
  - Linhas avaliadas: gestante, HAS, DM, criança menor de 2 anos, idoso, acamado; e tuberculose, hanseníase e saúde mental **só se a equipe configurar o prazo**.
- **Visitas:**
  - agendada hoje;
  - atrasada;
  - retorno programado;
  - reagendar: tentativa configurada (padrão: tudo menos Recusa) ou compromisso "Não realizado", sem visita realizada nem novo agendamento depois. É **1 pendência por família**;
  - família sem visita no prazo.
- **Agenda:** compromisso de hoje, retorno hoje, compromissos próximos (antecedência configurável) e atividade atrasada.
- **Níveis:** vermelho = alta, amarelo = atenção, azul = informativo. São configuráveis por tipo.
  - Os padrões são operacionais (atraso de agenda = alta; acompanhamento sem visita = atenção) e **não** são classificação de risco clínico.
  - Cada pendência mostra a regra e a data de identificação.
- **Ações:**
  - abrir cadastro, histórico, registrar visita, agendar retorno;
  - justificar (fica aberta);
  - resolver (justificativa obrigatória; vai ao histórico);
  - reabrir;
  - observação manual (separada das automáticas).
- Visualizar não resolve nada.

**Agenda Inteligente.**
- Cinco abas: Hoje (com atrasados), Semana, Calendário, Retornos e Pendências.
- Indicadores (com filtro de período e microárea): hoje, visitas programadas, retornos, concluídas, pendentes e atrasados. Os atrasados são contados em qualquer período.
- **Integração com visitas:**
  - "Registrar visita" a partir do compromisso abre o formulário já vinculado;
  - compromissos abertos da família aparecem para concluir;
  - visita realizada → "Concluído"; tentativa → "Não realizado". Em ambos, o compromisso guarda o `visitaId`. **Nenhuma visita extra é criada**.
- **AGENDAR RETORNO:** fica no formulário da visita, nos cartões de visita, na ficha individual e nas pendências. Cria um compromisso "Retorno" vinculado ao morador e à visita de origem.
- **Reagendar:** cria o novo compromisso e marca o anterior como "Reagendado", com os dois ligados.
- **Cancelar:** exige motivo; o compromisso não é apagado.
- **Lembretes dentro do app (sino):**
  - véspera, manhã (horário configurável), no horário (antecedência configurável) e atrasados;
  - "dispensar" só esconde o aviso no aparelho;
  - notificação do navegador opcional, com texto genérico (sem nomes nem dados de saúde).
- **Proximidade:**
  - usa só coordenadas **verificadas** (vizinho mais próximo, distância em linha reta);
  - os demais compromissos vêm depois, por microárea, bairro, rua e número, com aviso de que a localização não foi validada;
  - rota no Google Maps com até 10 paradas.

**Painel — MINHA ROTINA DE HOJE.**
- Mostra: visitas previstas, retornos, pendências que exigem atenção, compromissos do dia e cadastros para atualizar.
- Prioridades: atrasados primeiro, depois por horário, depois pendências de prioridade alta.
- Acessos rápidos: pesquisar, registrar visita, agendar retorno, pendências, agenda e novo cadastro.

**Indicadores de produção:** registros fictícios agora ficam **fora por padrão**, com a opção "Mostrar fictícios".

**Testes:** 64 testes unitários, todos passando:
- 20 de completude;
- 15 de produtividade;
- 10 de busca;
- 12 de pendências;
- 7 de agenda.

## 6. Planejamento

| Etapa | Conteúdo | Situação |
|---|---|---|
| 1 Planejamento | Arquitetura, banco, relacionamentos, permissões, navegação | ✅ |
| 2 Interface e cadastros | Identidade, painel, família, ficha 40 campos, regras por idade, completude | ✅ piloto |
| 3 Rotina do ACS | Visitas ✅ · produtividade e metas ✅ (v2) · agenda ✅ (v3) · central de pendências ✅ (v3) · busca rápida ✅ (v3) · fichas de acompanhamento (PA, glicemia, pré-natal…) pendentes | quase completa |
| 4 Recursos avançados | IA (ACS Assistente) · importação CSV/XLSX · mapa (Google Maps/COMO CHEGAR ✅ v2) · offline e sincronização | parcial (offline exige app de produção) |
| 5 Relatórios | Relatórios com filtros, PDF/Excel | produtividade em PDF/Excel ✅ (v2) · CSV ✅ · relatórios de cadastro pendentes |
| 6 Segurança | Supabase Auth, perfis, RLS por microárea, auditoria, backup | esquema pronto; implementação pendente |
| 7 Validação | Testes completos, responsividade, documentação | contínuo |

## 7. Registro do que foi feito (v1 — 02/11/2026)

Funciona no app publicado, com banco real:

- **Painel:**
  - 8 indicadores e 8 grupos, todos clicáveis;
  - 9 alertas configuráveis;
  - 4 gráficos: visitas por mês, completude, microárea e famílias por mês;
  - 6 atalhos.
- **Famílias:**
  - cadastro, edição e consulta, com código automático;
  - busca por nome, endereço ou código, e filtros por microárea, situação e domicílio incompleto;
  - lista de integrantes com indicador, histórico de visitas e de alterações;
  - aviso de endereço duplicado;
  - arquivar e reativar.
- **Pessoas:**
  - lista com idade, família, microárea, % e cor;
  - filtros por cor, microárea, faixa etária, grupo e situação;
  - busca por nome, CNS, CPF ou família;
  - bloqueio de CNS/CPF duplicado.
- **Ficha individual:**
  - 40 campos na ordem, em 5 seções;
  - status por campo (OK / Pendente / Condicional / NSA / Aguardando regra);
  - painel fixo com %, barra, contagens e pendências clicáveis que levam ao campo;
  - campos da família editáveis na própria ficha;
  - condições acompanhadas, com DUM → IG e DPP;
  - visitas da pessoa e histórico.
- **Visitas:**
  - registro rápido, com data e hora preenchidas e "Visita realizada" como padrão;
  - várias pessoas da mesma família, com "Marcar todos";
  - 6 situações, edição, exclusão e histórico;
  - filtros por período, microárea, situação e pessoa.
- **Completude cadastral:**
  - 6 indicadores clicáveis;
  - filtros Todos/Verdes/Amarelos/Vermelhos, por microárea, família e faixa etária;
  - lista com as pendências.
- **Configurações:**
  - dados do agente, microáreas e regra de 6 anos;
  - rótulo do campo 16;
  - prazos dos alertas e meses para atualização;
  - exportação CSV (famílias, pessoas + 40 campos + completude, visitas);
  - carregar e remover a base fictícia.
- **Segurança:**
  - leitura e escrita só para o proprietário e editores, verificado: um Contributor tem a escrita recusada;
  - histórico de alterações por registro;
  - nenhuma chave secreta no código.

Testado ponta a ponta em navegador, com 0 erros de console, cobrindo:
- carregar a base fictícia;
- apagar o CNS e ver 100% → 97% ao vivo, salvar e conferir no banco e no histórico;
- alterar o CEP pela ficha e ver todos os integrantes recalculados;
- criar família, depois integrante, depois visita;
- configurar a regra de 6 anos e ver o cadastro sair de "indefinida";
- exportar CSV.

## 7b. Registro v2 — Visitas domiciliares e produtividade (02/11/2026)

Implementado sobre a v1, sem reconstruir módulos:

- **Painel:**
  - card "VISITAS DOMICILIARES" com total realizadas, hoje, semana, mês, pendentes e tentativas no mês, todos clicáveis;
  - progresso da meta do mês;
  - os indicadores de visita saíram da grade geral para não duplicar;
  - grupos novos: Tuberculose, Hanseníase e Saúde mental.
- **Visitas domiciliares, aba Produtividade:**
  - filtros de período combináveis com microárea, linha de cuidado, paciente e situação;
  - 6 indicadores: realizadas, tentativas (por tipo), pessoas atendidas, famílias visitadas, média por dia e taxa de conclusão;
  - card da meta com seletor de mês, barra de progresso, restantes, %, média diária, projeção, ritmo necessário e histórico;
  - 10 linhas de cuidado clicáveis;
  - 7 gráficos: por dia, por semana, por mês, comparativo entre o mês atual e o anterior (acumulado), por microárea, por linha e evolução da meta.
- **Aba Registros (histórico detalhado):**
  - paciente(s), família, endereço completo clicável, microárea, data/hora, linhas, tipo, motivo, resultado, orientações, observações e ACS responsável;
  - ações: abrir cadastro, histórico, nova visita, editar, COMO CHEGAR;
  - Todas/Realizadas/Tentativas.
- **Aba Relatórios:**
  - tipos: diário, semanal, mensal, período personalizado, por microárea, por linha de cuidado e cumprimento de metas;
  - pré-visualização na tela;
  - exportação em **PDF** (jsPDF + autotable) e **Excel** (SheetJS), com abas Resumo e Visitas, autofiltro e aviso de fictícios;
  - as bibliotecas são carregadas sob demanda do jsDelivr (cdnjs como alternativa), em versões fixas.
- **Formulário de visita:**
  - linhas de cuidado sugeridas pelos moradores marcados, ajustáveis;
  - grava o ACS responsável;
  - mensagem diferente para tentativa.
- **Família:**
  - coordenadas opcionais (colar do Google Maps) e "conferidas no local";
  - validação de formato.
- **COMO CHEGAR:** no detalhe da família, na ficha individual e em cada visita da listagem.
- **CSV de visitas:** ganhou id, microárea, endereço, realizada (sim/não), linhas, ACS e fictício.
- **Ajuste de layout:** gráficos em 1 coluna no celular (também corrigido no painel da v1).

Validação:
- 35 testes unitários (20 completude + 15 produtividade);
- E2E do módulo com 56 verificações comparadas a cálculo independente, cobrindo:
  - contabilização e períodos;
  - visita com vários moradores;
  - linhas sem duplicar;
  - tentativas;
  - filtros por linha e paciente;
  - meta 120 → 100 com histórico e por mês;
  - Google Maps (endereço, coordenadas, recusa de coordenada inválida, correção);
  - os 7 relatórios;
  - Excel lido de volta e conferido, e PDF válido;
  - ocultar fictícios.
- Regressão E2E da v1 sem erros.

Não implementado nesta etapa:
- **Agenda:** ainda não existe; a integração com ela fica para a etapa da agenda. As pendências do painel já usam os registros de visita.
- **Impressão direta:** o ambiente bloqueia `window.print`; use o PDF.

## 7c. Registro v2.1 — Contato por WhatsApp (02/11/2026)

- Ícone verde de conversa, só ícone e sem texto, logo ao lado do telefone, em todas as telas que mostram telefone:
  - ficha individual (campo 24);
  - formulário da família;
  - detalhe da família.
- O ícone abre `https://wa.me/55<DDD+número>` em nova aba ou no app do WhatsApp.
- Só aparece com telefone válido (10–11 dígitos com DDD). Um "+55" já digitado não é duplicado. O ícone se atualiza enquanto o número é digitado.
- O ícone é um desenho original de balão de conversa, e não o logotipo oficial do WhatsApp, que é marca registrada.
- Testes: 17 verificações próprias + regressão completa (35 unitários, E2E v1 e v2) sem falhas.

## 7d. Registro v3 — Busca Rápida, Central de Pendências e Agenda Inteligente (02/11/2026)

Desenvolvido e testado em três etapas, nesta ordem: busca → pendências → agenda. Os módulos anteriores foram preservados.

**Arquivos novos:**
- `src/busca.js`, `src/pendencias.js` e `src/agenda.js` (motores);
- `src/busca-ui.js`, `src/pendencias-ui.js` e `src/agenda-ui.js` (telas);
- `test/busca|pendencias|agenda.test.js`;
- `e2e/comum.js` e `e2e/run4|run5|run6.js`.

**Arquivos alterados:**
- `src/app.js`: navegação, painel, ligação da visita com a agenda, configurações e base fictícia;
- `src/visitas-ui.js`: "Agendar retorno" no cartão e fictícios fora dos indicadores por padrão;
- `src/shell.html`: sino, botão de busca e estilos;
- `build.js`.

**Mudanças de interface:**
- **Navegação:**
  - no celular, a barra inferior passou a Início, Agenda, Visitas, Pessoas e Mais. Famílias, Busca e Pendências ficam em "Mais", no menu lateral do computador e nos atalhos;
  - botões de busca e de lembretes no topo de todas as telas.
- **Painel:**
  - "Minha rotina de hoje" substituiu a linha de atalhos, que agora está dentro dela;
  - o card "Alertas" foi absorvido pela Central de Pendências, com as mesmas regras e prazos e mais ações.
- **Correções encontradas nos testes:**
  - perda da 2ª letra ao digitar rápido no campo de busca do painel;
  - ambiguidade "03" (microárea × família);
  - moradores da casa listados pelo nome do responsável;
  - filtro de card + categoria deixando a lista vazia;
  - duas pendências "reagendar" para a mesma família;
  - formulário de compromisso sem envio;
  - redesenho durante o evento de saída do campo de texto.

**Validação:**
- 64 testes unitários.
- 112 verificações de ponta a ponta das três etapas, cobrindo:
  - todos os campos e filtros da busca;
  - cards, níveis, justificar, resolver, reabrir e manual;
  - prazos e níveis configuráveis;
  - fluxo completo pesquisar → cadastro → histórico → visita → retorno → lembrete;
  - tentativa → não realizado → reagendar;
  - proximidade e rota com coordenadas verificadas;
  - agrupamentos;
  - lembretes;
  - somente leitura;
  - celular e computador.
- Regressão das versões anteriores (v1, v2 com 56 verificações, WhatsApp com 17) sem falhas.

**Limitações:**
- As pendências que se resolvem sozinhas (ex.: visita registrada) não ficam no histórico de resolvidas: o registro é a própria visita ou o histórico do cadastro. O histórico de resolvidas guarda as resoluções manuais.
- A notificação do navegador depende de o ambiente permitir. Os lembretes dentro do app sempre funcionam.

## 8. Pendências e próximos passos

1. Conferir o pressuposto do item 4 com as imagens originais (campo 10 e opções).
2. Fichas de acompanhamento (HAS com PA, DM com glicemia, pré-natal, criança, idoso, saúde mental, acamados).
3. Agenda ✅ (v3). Próximo: agenda compartilhada da equipe e sincronização com o calendário do celular.
4. Importação CSV/XLSX com mapeamento, pré-visualização, duplicidades e relatório de erros.
5. Relatórios de cadastro (famílias, pessoas, completude) em PDF/Excel. Os de produtividade já existem (v2).
6. Migração para Next.js + Supabase (PWA offline, perfis, RLS por microárea, multi-município).
7. ACS Assistente (IA), com revisão antes de salvar e sem envio de dados identificáveis sem base legal.
8. Antes de usar dados reais: avaliação de segurança, autorização institucional e adequação à LGPD.
