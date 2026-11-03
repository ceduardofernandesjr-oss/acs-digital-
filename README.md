# ACS DIGITAL

Aplicativo para Agentes Comunitários de Saúde: cadastro familiar e individual com completude cadastral (40 campos, referência "Campos para Completude de Cadastro — Versão 02/2023"), visitas domiciliares, produtividade e metas, busca rápida, central de pendências e agenda inteligente.

**Endereço:** https://ceduardofernandesjr-oss.github.io/acs-digital-/

> O ACS DIGITAL não substitui o e-SUS APS nem o prontuário oficial. Antes de registrar dados reais de pacientes, a instituição deve autorizar o uso e concluir a avaliação de segurança e de adequação à LGPD.

## Primeiro acesso

1. Abra o endereço acima e toque em **Primeira configuração do sistema**.
2. Informe organização, unidade, equipe, seus dados e o **código de configuração** (o segredo `ACS_CODIGO_CONFIGURACAO` definido no Supabase). Essa tela funciona uma única vez e cria a conta de administração.
3. Em **Minha conta → Usuários e equipes**, crie as contas da equipe. Cada pessoa recebe uma senha temporária e cria a própria senha no primeiro acesso.

No celular, use "Adicionar à tela inicial" para instalar como aplicativo.

## Perfis de acesso

| Perfil | Vê | Altera |
|---|---|---|
| Administração | todas as unidades e equipes da organização | dados, configurações, usuários, unidades e equipes |
| Coordenação | equipes da própria unidade | dados, configurações; cria ACS e visualizadores da unidade |
| ACS | a própria equipe | cadastros, visitas, agenda, pendências e a própria meta |
| Visualizador | a própria equipe | nada |

As regras são aplicadas no banco (Row Level Security). O app só usa a chave publicável. As operações administrativas rodam em funções de servidor, que conferem quem está chamando.

## Segurança e privacidade

- Login individual. A senha temporária precisa ser trocada no primeiro acesso. Contas são desativadas, nunca apagadas.
- Cada alteração grava a versão, o autor e a data na trilha de auditoria. Exclusões são lógicas.
- Edições simultâneas são detectadas pela versão: nada é sobrescrito sem aviso, e a pessoa escolhe qual versão manter.
- Sem internet, o app continua funcionando. A cópia local fica cifrada (AES-GCM, chave não exportável) e é apagada ao sair.
- As notificações mostram só texto genérico, sem dados de saúde.
- A política de segurança de conteúdo (CSP) só permite scripts do próprio site e conexões com o projeto Supabase. Todas as bibliotecas são servidas localmente.

## Estrutura

```
docs/                 site publicado (gerado por `npm run build`; não editar à mão)
src/                  telas e motores (completude, produtividade, busca, pendências, agenda)
prod/plataforma.js    login, equipes, banco Supabase, cópia local cifrada, fila sem internet, conflitos
prod/functions/       funções de servidor (configurar, usuarios) — Supabase Edge Functions
prod/build-prod.js    monta o site de produção a partir de src/
test/                 testes unitários dos motores
e2e-prod/             teste ponta a ponta no navegador, com servidor Supabase simulado (dados fictícios)
documentacao/         arquitetura e registro de decisões
```

## Desenvolvimento

```bash
npm install
npm test            # testes unitários
npm run test:e2e    # teste ponta a ponta (Playwright)
npm run build       # atualiza docs/ para publicação
```

Use apenas dados fictícios em desenvolvimento e testes.
