// Monta a versão de produção do ACS DIGITAL em prod/dist (publicada no GitHub Pages)
// Reaproveita os mesmos motores e telas do piloto; só troca a camada de plataforma.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const RAIZ = path.join(__dirname, '..'), SRC = path.join(RAIZ, 'src');
const VND = fs.existsSync(path.join(RAIZ, 'node_modules', 'jspdf')) ? path.join(RAIZ, 'node_modules') : path.join(RAIZ, 'vendor-build', 'node_modules');
const DIST = process.argv[2] ? path.resolve(process.argv[2]) : path.join(__dirname, 'dist');
const CONFIG = { url: 'https://mmgseftxommheneyilzb.supabase.co', chave: 'sb_publishable_xJqyfqYu3P7NVzaQRrIpmA_z4n8giRb' };
const ler = p => fs.readFileSync(path.join(SRC, p), 'utf8');

function trocar(txt, de, para, nome) {
  const n = txt.split(de).length - 1;
  if (n !== 1) throw new Error('Substituição "' + nome + '" encontrou ' + n + ' ocorrências (esperado 1)');
  return txt.replace(de, () => para);
}

// --- app (telas) com ajustes de produção ---
const uis = ['visitas-ui.js', 'busca-ui.js', 'pendencias-ui.js', 'agenda-ui.js', 'importacao-ui.js'].map(ler).join('\n');
let app = ler('app.js').replace('/*__VISITAS_UI__*/', () => uis);
const T = [
  ['semBanco', "O banco de dados não está disponível nesta visualização. Abra o ACS DIGITAL pelo link no claude.ai, com sua conta, para salvar e consultar cadastros.", 'Não foi possível abrir os dados. Recarregue a página ou saia e entre novamente.'],
  ['offline', 'Sem conexão com o banco no momento. Os dados exibidos podem estar desatualizados; tente salvar quando a conexão voltar.', 'Sem conexão no momento. Pode continuar trabalhando: as alterações ficam guardadas neste aparelho, protegidas, e são enviadas quando a internet voltar.'],
  ['sync', "  if (S.offline) return setSync('erro', 'Sem conexão');\n  setSync('', 'Salvo');", "  var np = PROD.pendentes();\n  if (np) return setSync(navigator.onLine ? 'salvando' : 'erro', navigator.onLine ? 'Enviando…' : np + ' a enviar');\n  if (S.offline || !navigator.onLine) return setSync('erro', 'Sem conexão');\n  setSync('', 'Salvo');"],
  ['expor', 'marcarNav();\niniciarBanco();\n})();', 'marcarNav();\nwindow.__acsAtualizarSync = atualizarSync;\niniciarBanco();\n})();'],
  ['naoBloquear', "    if (e && e.code === 'invalid_argument') S.podeEscrever = false;\n", ''],
  ['cfgRo', 'function viewConfig() {\n  var c = cfg(), ro = somenteLeitura();', 'function viewConfig() {\n  var c = cfg(), ro = somenteLeitura() || !PROD.podeConfigurar();'],
  ['cfgAviso', `var h = '<form id="formConfig"><div class="card"><h2>Agente e área de atuação</h2><div class="grid g2">' +\n    campoTxt('Nome do agente', 'agente', c.agente)`,
    `var h = (ro && !somenteLeitura() ? '<div class="aviso">As configurações da equipe são definidas pela coordenação. Aqui você pode consultá-las.</div>' : '') + '<form id="formConfig"><div class="card"><h2>Equipe e área de atuação</h2><div class="grid g2">' +\n    campoTxt('Profissional de referência da equipe', 'agente', c.agente)`],
  ['nomeAcs', "  if (id === S.me) return cfg().agente || 'Você';\n  return 'Outro usuário autorizado';", "  if (id === S.me) return PROD.nomeUsuario() || 'Você';\n  return PROD.nomeDe(id) || 'Outro usuário autorizado';"],
  ['relAcs', "['ACS', cfg().agente || nomeAcs(S.me)]", "['ACS', nomeAcs(S.me)]"],
  ['hist', "(r.por ? 'outro usuário autorizado' : 'sistema')", "(r.por ? (PROD.nomeDe(r.por) || 'outro usuário autorizado') : 'sistema')"],
  ['pendPor', "(p.resolvidaPor === S.me ? 'você' : 'outro usuário autorizado')", "(p.resolvidaPor === S.me ? 'você' : (PROD.nomeDe(p.resolvidaPor) || 'outro usuário autorizado'))"],
  ['libXlsx', "xlsx: ['https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js']", "xlsx: ['vendor/xlsx.full.min.js']"],
  ['libPdf', "jspdf: ['https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js']", "jspdf: ['vendor/jspdf.umd.min.js']"],
  ['libTab', "autotable: ['https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js']", "autotable: ['vendor/jspdf.plugin.autotable.min.js']"],
  ['seguranca', 'Somente o proprietário e editores autorizados deste aplicativo leem e alteram os dados (regra de acesso aplicada no servidor). Cada alteração registra data, ação e campos alterados. Esta versão piloto não substitui o sistema oficial (e-SUS APS / prontuário) e não deve receber dados reais sem autorização institucional.',
    'Cada profissional entra com conta pessoal e vê somente os dados das equipes a que tem acesso (regra aplicada no servidor). ACS edita os dados da própria equipe; coordenação, os da unidade; visualizadores apenas consultam. Cada alteração fica registrada com data, autor e versão, e nada é apagado definitivamente. Os dados guardados no aparelho para uso sem internet ficam cifrados e são apagados ao sair. O ACS DIGITAL não substitui o e-SUS APS nem o prontuário, e só deve receber dados reais com autorização institucional e avaliação de segurança e LGPD.']
];
T.forEach(([nome, de, para]) => { app = trocar(app, de, para, nome); });
if (/claude\.ai|claude\.use\('/.test(app.replace("claude.use('db')", '').replace("claude.use('user')", '').replace("claude.use('downloads')", ''))) throw new Error('Ainda há menções à plataforma do piloto no app');

const motores = ['completude.js', 'produtividade.js', 'busca.js', 'pendencias.js', 'agenda.js', 'importacao.js'].map(ler).join('\n');
const plataforma = fs.readFileSync(path.join(__dirname, 'plataforma.js'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, 'plataforma.css'), 'utf8');
const cfgJs = 'window.ACS_CONFIG = ' + JSON.stringify(CONFIG) + ';\n';

const arquivos = {
  'js/config.js': cfgJs, 'js/plataforma.js': plataforma, 'js/motores.js': motores, 'js/app.js': app,
  'vendor/supabase.js': fs.readFileSync(path.join(VND, '@supabase/supabase-js/dist/umd/supabase.js')),
  'vendor/xlsx.full.min.js': fs.readFileSync(path.join(VND, 'xlsx/dist/xlsx.full.min.js')),
  'vendor/jspdf.umd.min.js': fs.readFileSync(path.join(VND, 'jspdf/dist/jspdf.umd.min.js')),
  'vendor/jspdf.plugin.autotable.min.js': fs.readFileSync(path.join(VND, 'jspdf-autotable/dist/jspdf.plugin.autotable.min.js'))
};
const hash = crypto.createHash('sha256'); Object.keys(arquivos).sort().forEach(k => hash.update(k).update(arquivos[k]));
hash.update(css); hash.update(ler('shell.html'));
const VERSAO = hash.digest('hex').slice(0, 10);

// --- index.html ---
let shell = ler('shell.html');
shell = trocar(shell, '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">\n', '', 'fontes');
const sup = new URL(CONFIG.url).host;
const csp = ["default-src 'self'", "script-src 'self'", "style-src 'self' 'unsafe-inline'", "img-src 'self' data: blob:", "font-src 'self'",
  "connect-src 'self' https://" + sup + " wss://" + sup, "worker-src 'self'", "manifest-src 'self'", "object-src 'none'", "base-uri 'none'", "form-action 'none'"].join('; ');
shell = trocar(shell, '<meta name="viewport" content="width=device-width, initial-scale=1">',
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n' +
  '<meta http-equiv="Content-Security-Policy" content="' + csp + '">\n<meta name="referrer" content="no-referrer">\n' +
  '<meta name="theme-color" content="#1554C0">\n<meta name="description" content="ACS DIGITAL — cadastro, visitas e acompanhamento para Agentes Comunitários de Saúde.">\n' +
  '<link rel="manifest" href="manifest.webmanifest">\n<link rel="icon" href="icons/icon-192.png">\n<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">\n' +
  '<meta name="apple-mobile-web-app-capable" content="yes">\n<meta name="apple-mobile-web-app-title" content="ACS DIGITAL">\n<meta name="mobile-web-app-capable" content="yes">', 'meta');
shell = trocar(shell, '</style>\n</head>', '</style>\n<style>\n' + css + '</style>\n</head>', 'css');
const v = '?v=' + VERSAO;
shell = shell.replace(/<script>\n\/\*__COMPLETUDE__\*\/\n<\/script>\n<script>\n\/\*__PRODUTIVIDADE__\*\/\n<\/script>\n<script>\n\/\*__MOTORES_V3__\*\/\n<\/script>\n<script>\n\/\*__APP__\*\/\n<\/script>/, () =>
  ['js/config.js', 'vendor/supabase.js', 'js/plataforma.js', 'js/motores.js', 'js/app.js'].map(s => '<script src="' + s + v + '"></script>').join('\n') +
  '\n<noscript><p style="padding:20px">O ACS DIGITAL precisa de JavaScript ativado.</p></noscript>');
if (/__APP__|<script>\n/.test(shell)) throw new Error('Scripts embutidos não substituídos');
arquivos['index.html'] = shell;

// --- manifest, service worker ---
arquivos['manifest.webmanifest'] = JSON.stringify({
  name: 'ACS DIGITAL', short_name: 'ACS DIGITAL', description: 'Cadastro, visitas e acompanhamento para Agentes Comunitários de Saúde',
  lang: 'pt-BR', start_url: './', scope: './', display: 'standalone', orientation: 'portrait', background_color: '#0E3D8F', theme_color: '#1554C0',
  icons: [{ src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' }, { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }]
}, null, 2);
const precache = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'js/config.js', 'vendor/supabase.js', 'js/plataforma.js', 'js/motores.js', 'js/app.js', 'vendor/xlsx.full.min.js', 'vendor/jspdf.umd.min.js', 'vendor/jspdf.plugin.autotable.min.js'];
arquivos['sw.js'] = fs.readFileSync(path.join(__dirname, 'sw.js'), 'utf8').replace('__VERSAO__', VERSAO).replace('__ARQUIVOS__', JSON.stringify(precache));
arquivos['.nojekyll'] = '';
arquivos['versao.txt'] = VERSAO + '\n';

fs.rmSync(DIST, { recursive: true, force: true });
Object.entries(arquivos).forEach(([n, c]) => { const p = path.join(DIST, n); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, c); });
fs.cpSync(path.join(__dirname, 'icons'), path.join(DIST, 'icons'), { recursive: true });
console.log('ACS DIGITAL produção', VERSAO, '→', DIST);
