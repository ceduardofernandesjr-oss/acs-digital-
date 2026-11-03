// Teste ponta a ponta da versão de produção (navegador real + Supabase falso). Dados 100% fictícios.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const { criar } = require('./fake');
const DIST = path.join(__dirname, '..', 'prod', 'dist');
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.txt': 'text/plain' };
const SHOTS = path.join(__dirname, 'shots'); fs.mkdirSync(SHOTS, { recursive: true });

let falhas = 0;
const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✘ ') + m); if (!c) falhas++; };
const esperar = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const srv = http.createServer((q, r) => {
    let f = decodeURIComponent(new URL(q.url, 'http://x').pathname); if (f.endsWith('/')) f += 'index.html';
    const p = path.join(DIST, f);
    if (!p.startsWith(DIST) || !fs.existsSync(p)) { r.writeHead(404); return r.end('404'); }
    r.writeHead(200, { 'content-type': TIPOS[path.extname(p)] || 'application/octet-stream', 'cache-control': 'no-cache' }); fs.createReadStream(p).pipe(r);
  }).listen(0);
  const BASE = 'http://localhost:' + srv.address().port + '/';
  const fake = criar(), S = fake.S;
  const browser = await chromium.launch();
  const erros = [];

  async function contexto(nome, opts) {
    const ctx = await browser.newContext(Object.assign({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', acceptDownloads: true }, opts || {}));
    await ctx.route(fake.URLBASE + '/**', r => fake.rota(r));
    await ctx.routeWebSocket(/supabase\.co\/realtime/, ws => fake.ligarWS(ws));
    const page = await ctx.newPage();
    page.on('pageerror', e => erros.push(nome + ': ' + e.message));
    page.on('console', m => { const t = m.text(); if (m.type() === 'error' && !/Failed to load resource|ERR_INTERNET_DISCONNECTED|net::ERR|WebSocket/.test(t)) erros.push(nome + ': ' + t); if (/Content Security Policy/i.test(t)) erros.push(nome + ' CSP: ' + t); });
    page.shot = n => page.screenshot({ path: path.join(SHOTS, n + '.png') });
    return { ctx, page };
  }
  const visivel = (page, sel) => page.$eval(sel, e => !e.hidden && getComputedStyle(e).display !== 'none').catch(() => false);
  const textoView = page => page.$eval('#view', e => e.innerText);
  const sync = page => page.$eval('#sync', e => e.innerText.trim());
  const docs = (col) => [...S.docs.values()].filter(d => d.colecao === col);
  async function irPara(page, h) { await page.evaluate(h => { location.hash = '#painel'; setTimeout(() => location.hash = '#' + h, 30); }, h); await page.waitForTimeout(350); if (await page.$('#modal.aberto [data-act=descartar]')) { await page.click('[data-act=descartar]'); await page.waitForTimeout(200); } }
  async function entrar(page, email, senha) { await page.waitForSelector('#paLogin'); await page.fill('#pa_email', email); await page.fill('#pa_senha', senha); await page.click('#paLogin button[type=submit]'); }
  async function abrirConta(page) { await page.click('#btnConta'); await page.waitForSelector('#prodPainel.aberto'); }

  // ------------------------------------------------------------------ 1. Configuração inicial
  console.log('1. Primeira configuração');
  const A = await contexto('admin');
  await A.page.goto(BASE);
  await A.page.waitForSelector('#paLogin');
  ok(await visivel(A.page, '#prodAuth'), 'tela de login cobre o app antes de entrar');
  await A.page.shot('01-login');
  await A.page.click('[data-pa=telaConfigurar]'); await A.page.waitForSelector('#paConfigurar');
  const preencherConfig = async codigo => {
    const v = { organizacao: 'Secretaria Fictícia de Saúde', municipio: 'Cidade Exemplo', uf: 'RJ', unidade: 'UBS Exemplo Fictícia', cnes: '0000001', equipe: 'Equipe Azul', ine: '0000000001', nome: 'Ana Admin Fictícia', email: 'admin@teste.local', senha: 'Senha123forte', senha2: 'Senha123forte', codigo };
    for (const k in v) await A.page.fill('#pa_' + k, v[k]);
    await A.page.click('#paConfigurar button[type=submit]');
  };
  await preencherConfig('codigo-errado'); await A.page.waitForSelector('.pa-erro:not([hidden])');
  ok((await A.page.textContent('.pa-erro')).includes('Código de configuração inválido'), 'código errado é recusado');
  await A.page.shot('02-configurar');
  await preencherConfig(S.codigo);
  await A.page.waitForSelector('#prodAuth', { state: 'hidden', timeout: 10000 });
  await A.page.waitForFunction(() => document.querySelector('#sync').innerText.includes('Salvo'), null, { timeout: 8000 });
  ok(!(await visivel(A.page, '#prodAuth')), 'após configurar, entra direto no app');
  ok(await A.page.$('#btnConta'), 'botão Minha conta aparece na barra');
  ok(S.perfis.size === 1 && [...S.perfis.values()][0].papel === 'administrador', 'administrador criado no servidor');
  const eqAzul = S.equipes[0].id;
  await A.page.shot('03-app-vazio');

  // ------------------------------------------------------------------ 2. Cadastro com gravação no servidor
  console.log('2. Cadastro grava no servidor, por equipe');
  await irPara(A.page, 'familias'); await A.page.click('[data-act=novaFamilia]'); await A.page.waitForSelector('#formFamilia');
  await A.page.fill('input[name=endereco]', 'Rua das Acácias Fictícia'); await A.page.fill('input[name=numero]', '10'); await A.page.fill('input[name=bairro]', 'Bairro Teste');
  await A.page.fill('#formFamilia input[name=cep]', '20000123'); await A.page.fill('input[name=microarea]', '01');
  await A.page.click('#formFamilia button[type=submit]'); await A.page.waitForTimeout(600);
  await A.page.click('[data-act=novaPessoaFam]'); await A.page.waitForSelector('#formPessoa');
  await A.page.fill('input[name=nome]', 'Joana Fictícia Lima'); await A.page.fill('input[name=data_nascimento]', '1985-03-14');
  await A.page.check('input[name=ehResponsavel]'); await A.page.selectOption('select[name=sexo]', 'Feminino');
  await A.page.click('#formPessoa button[type=submit]'); await A.page.waitForTimeout(800);
  const fam = docs('familias')[0], pes = docs('pessoas')[0];
  ok(fam && fam.equipe_id === eqAzul && fam.dados.endereco === 'Rua das Acácias Fictícia', 'família gravada no servidor na equipe certa');
  ok(pes && pes.dados.nome === 'Joana Fictícia Lima', 'pessoa gravada no servidor');
  ok(fam && fam.versao >= 2, 'família recebeu nova versão ao definir responsável (versão ' + (fam && fam.versao) + ')');
  ok((await sync(A.page)) === 'Salvo', 'indicador de sincronização: Salvo');
  ok(S.log.some(l => l.acao === 'criou' && l.colecao === 'familias'), 'trilha de auditoria registrou a criação');

  // configuração da equipe (admin pode)
  await irPara(A.page, 'configuracoes'); await A.page.waitForSelector('#formConfig');
  ok(!(await A.page.$eval('#formConfig button[type=submit]', b => b.disabled)), 'administração pode salvar configurações');
  await A.page.fill('#formConfig input[name=microareas]', '01, 02'); await A.page.click('#formConfig button[type=submit]'); await A.page.waitForTimeout(500);
  ok(docs('config')[0] && docs('config')[0].dados.microareas === '01, 02', 'configuração salva no servidor');
  const txtCfg = await textoView(A.page);
  ok(/conta pessoal/.test(txtCfg) && !/claude\.ai/i.test(txtCfg), 'texto de segurança de produção (sem menção ao piloto)');

  // ------------------------------------------------------------------ 3. Exportações (bibliotecas locais, CSP)
  console.log('3. Exportações');
  const [dl] = await Promise.all([A.page.waitForEvent('download'), A.page.click('[data-act=exportar][data-t=familias]')]);
  ok(/\.csv$/.test(dl.suggestedFilename()), 'CSV exportado: ' + dl.suggestedFilename());
  await irPara(A.page, 'visitas'); await A.page.click('[data-act=visAba][data-a=relatorios]'); await A.page.waitForTimeout(300);
  const [dlx] = await Promise.all([A.page.waitForEvent('download', { timeout: 20000 }), A.page.click('[data-act=relExportar][data-f=xlsx]')]);
  ok(/\.xlsx$/.test(dlx.suggestedFilename()), 'Excel exportado com biblioteca local');
  const [dlp] = await Promise.all([A.page.waitForEvent('download', { timeout: 20000 }), A.page.click('[data-act=relExportar][data-f=pdf]')]);
  const pdfPath = path.join(SHOTS, 'rel.pdf'); await dlp.saveAs(pdfPath);
  ok(fs.readFileSync(pdfPath).slice(0, 4).toString() === '%PDF', 'PDF exportado com biblioteca local');

  // ------------------------------------------------------------------ 4. Gestão de usuários
  console.log('4. Usuários e equipes');
  await abrirConta(A.page); await A.page.shot('04-conta');
  await A.page.click('[data-pp=gestao]'); await A.page.waitForSelector('[data-pp=novoUsuario]');
  async function novaConta(nome, email, papel) {
    await A.page.click('[data-pp=novoUsuario]'); await A.page.waitForSelector('#ppUsuario');
    await A.page.fill('#ppUsuario #pa_nome', nome); await A.page.fill('#ppUsuario #pa_email', email);
    await A.page.selectOption('#ppUsuario select[name=papel]', papel);
    if (papel !== 'coordenador') await A.page.selectOption('#ppUsuario select[name=equipe_id]', eqAzul);
    const senha = await A.page.inputValue('#ppUsuario input[name=senha]');
    await A.page.click('#ppUsuario button[type=submit]'); await A.page.waitForSelector('.pp-cred');
    return senha;
  }
  const senhaAcs = await novaConta('Maria ACS Fictícia', 'acs@teste.local', 'acs');
  ok(/^[A-Za-z0-9]{10}$/.test(senhaAcs) && /\d/.test(senhaAcs), 'senha temporária gerada (10 caracteres, letras e números)');
  ok((await A.page.textContent('.pp-cred')).includes('acs@teste.local'), 'dados de acesso exibidos para entregar à pessoa');
  await A.page.shot('05-conta-criada');
  const senhaVis = await novaConta('Vera Visualizadora', 'vis@teste.local', 'visualizador');
  const pAcs = [...S.perfis.values()].find(p => p.email === 'acs@teste.local');
  ok(pAcs && pAcs.equipe_id === eqAzul && pAcs.trocar_senha, 'perfil ACS vinculado à equipe e com troca de senha obrigatória');
  await A.page.click('[data-pp=aba][data-v=equipes]'); await A.page.waitForTimeout(200);
  await A.page.click('[data-pp=novaUnidade]'); await A.page.fill('#ppUnidade #pa_nome', 'Clínica Fictícia Norte'); await A.page.click('#ppUnidade button[type=submit]'); await A.page.waitForTimeout(400);
  const uNorte = S.unidades.find(u => u.nome === 'Clínica Fictícia Norte');
  await A.page.click('[data-pp=novaEquipe][data-id="' + uNorte.id + '"]'); await A.page.fill('#ppEquipe #pa_nome', 'Equipe Verde'); await A.page.click('#ppEquipe button[type=submit]'); await A.page.waitForTimeout(500);
  ok(S.equipes.some(e => e.nome === 'Equipe Verde' && e.unidade_id === uNorte.id), 'nova unidade e equipe criadas');
  await A.page.shot('06-equipes');
  await A.page.click('[data-pp=fechar]');

  // dados locais cifrados
  const bruto = await A.page.evaluate(async () => {
    const dbs = await indexedDB.databases(); const nome = dbs.map(d => d.name).find(n => /^acs-digital-/.test(n));
    const db = await new Promise(r => { const q = indexedDB.open(nome); q.onsuccess = () => r(q.result); });
    const todos = await new Promise(r => { const q = db.transaction('docs').objectStore('docs').getAll(); q.onsuccess = () => r(q.result); });
    const txt = todos.map(x => new TextDecoder('latin1').decode(new Uint8Array(x.ct))).join('|');
    db.close();
    return { n: todos.length, semDados: todos.every(x => !('dados' in x) && x.iv && x.ct), vazou: /Acácias|Joana|Fict/.test(txt) || /Ac.cias|Joana/.test(JSON.stringify(todos)) };
  });
  ok(bruto.n >= 3 && bruto.semDados, 'cópia local guardada só em forma cifrada (' + bruto.n + ' registros)');
  ok(!bruto.vazou, 'nomes e endereços não aparecem em texto claro no aparelho');

  // troca de equipe
  await abrirConta(A.page); await A.page.click('[data-pp=trocarEquipe]'); await A.page.waitForSelector('[data-pa=abrirEquipe]');
  const nEq = await A.page.$$eval('[data-pa=abrirEquipe]', l => l.length);
  ok(nEq === 2, 'administração escolhe entre as 2 equipes da organização');
  const eqVerde = S.equipes.find(e => e.nome === 'Equipe Verde').id;
  await A.page.click('[data-pa=abrirEquipe][data-id="' + eqVerde + '"]'); await A.page.waitForLoadState('load'); await A.page.waitForSelector('#btnConta', { timeout: 10000 });
  await A.page.waitForTimeout(800); await irPara(A.page, 'familias');
  ok(!(await textoView(A.page)).includes('Acácias'), 'na Equipe Verde não aparecem as famílias da Equipe Azul');
  await abrirConta(A.page); await A.page.click('[data-pp=trocarEquipe]'); await A.page.click('[data-pa=abrirEquipe][data-id="' + eqAzul + '"]');
  await A.page.waitForLoadState('load'); await A.page.waitForSelector('#btnConta', { timeout: 10000 }); await A.page.waitForTimeout(800);

  // sair apaga os dados do aparelho
  await abrirConta(A.page); await A.page.click('[data-pp=sair]'); await A.page.waitForSelector('#paLogin', { timeout: 10000 });
  const resto = await A.page.evaluate(async () => ({ dbs: (await indexedDB.databases()).map(d => d.name).filter(n => /^acs-digital/.test(n)), ls: Object.keys(localStorage).filter(k => /^acs/i.test(k)) }));
  ok(!resto.dbs.length && !resto.ls.length, 'ao sair, dados locais e sessão são apagados do aparelho');

  // ------------------------------------------------------------------ 5. ACS: primeiro acesso
  console.log('5. ACS — primeiro acesso, permissões e tempo real');
  const B = await contexto('acs');
  await B.page.goto(BASE); await entrar(B.page, 'acs@teste.local', 'senha-errada1'); await B.page.waitForSelector('.pa-erro:not([hidden])');
  ok((await B.page.textContent('.pa-erro')).includes('incorretos'), 'senha errada é recusada');
  await B.page.fill('#pa_senha', senhaAcs); await B.page.click('#paLogin button[type=submit]');
  await B.page.waitForSelector('#paTrocar');
  ok(true, 'senha temporária obriga a criar senha pessoal');
  await B.page.fill('#pa_senha', senhaAcs); await B.page.fill('#pa_senha2', senhaAcs); await B.page.click('#paTrocar button[type=submit]');
  await B.page.waitForSelector('#paTrocar .pa-erro:not([hidden])');
  ok((await B.page.textContent('.pa-erro')).includes('diferente'), 'não aceita repetir a senha temporária');
  await B.page.fill('#pa_senha', 'MinhaSenha2026'); await B.page.fill('#pa_senha2', 'MinhaSenha2026'); await B.page.click('#paTrocar button[type=submit]');
  await B.page.waitForSelector('#prodAuth', { state: 'hidden', timeout: 10000 });
  ok(!pAcs.trocar_senha, 'servidor registrou a troca de senha');
  await B.page.waitForTimeout(800);
  await irPara(B.page, 'familias');
  ok((await textoView(B.page)).includes('Acácias'), 'ACS vê a família cadastrada pela equipe');
  await irPara(B.page, 'configuracoes'); await B.page.waitForSelector('#formConfig');
  ok(await B.page.$eval('#formConfig button[type=submit]', b => b.disabled), 'ACS não altera configurações da equipe');
  ok((await textoView(B.page)).includes('definidas pela coordenação'), 'aviso explica que a coordenação define as configurações');
  ok(!(await B.page.$('[data-act=carregarDemo]')), 'ACS não carrega base fictícia na produção');
  // tempo real
  await irPara(B.page, 'familias');
  fake.alterarDireto(eqAzul, 'familias', fam.id, d => { d.endereco = 'Rua das Acácias Fictícia (atualizada)'; });
  await B.page.waitForTimeout(1200);
  ok((await textoView(B.page)).includes('(atualizada)'), 'alteração feita por outra pessoa chega em tempo real');

  // ------------------------------------------------------------------ 6. Sem internet
  console.log('6. Trabalho sem internet');
  await B.page.click('[data-act=abrirFamilia]'); await B.page.waitForTimeout(400);
  await B.ctx.setOffline(true); S.offline = true;
  await B.page.click('[data-act=abrirPessoa]').catch(() => { }); await B.page.waitForTimeout(300);
  await B.page.click('[data-act=novaVisitaPessoa]'); await B.page.waitForSelector('#formVisita');
  await B.page.fill('textarea[name=orientacoes]', 'Orientação registrada sem internet (fictício).');
  const nVisAntes = docs('visitas').length;
  await B.page.click('#formVisita button[type=submit]'); await B.page.waitForTimeout(700);
  ok(docs('visitas').length === nVisAntes, 'sem internet, nada chega ao servidor ainda');
  ok(/1 a enviar/.test(await sync(B.page)), 'indicador mostra "1 a enviar" (' + await sync(B.page) + ')');
  ok(!(await B.page.$$eval('.toast.erro', t => t.length)), 'nenhum erro mostrado ao salvar sem internet');
  await B.page.shot('07-offline');
  await B.ctx.setOffline(false); S.offline = false;
  await B.page.waitForFunction(() => document.querySelector('#sync').innerText.includes('Salvo'), null, { timeout: 8000 }).catch(() => { });
  ok(docs('visitas').length === nVisAntes + 1, 'ao voltar a internet, a visita foi enviada');
  ok((await sync(B.page)) === 'Salvo', 'indicador volta para Salvo');
  const vis = docs('visitas').slice(-1)[0];
  ok(vis && vis.dados.acsId === pAcs.user_id && vis.atualizado_por === pAcs.user_id, 'visita registrada com autoria do ACS');

  // ------------------------------------------------------------------ 7. Conflito
  console.log('7. Conflito de edição');
  await irPara(B.page, 'familias'); await B.page.click('[data-act=abrirFamilia]'); await B.page.waitForTimeout(300);
  await B.ctx.setOffline(true); S.offline = true;
  await B.page.click('[data-act=editarFamilia]'); await B.page.waitForSelector('#formFamilia');
  await B.page.fill('#formFamilia input[name=numero]', '88'); await B.page.click('#formFamilia button[type=submit]'); await B.page.waitForTimeout(500);
  S.offline = false; fake.alterarDireto(eqAzul, 'familias', fam.id, d => { d.numero = '99'; }); S.offline = true;
  await B.ctx.setOffline(false); S.offline = false;
  await B.page.waitForSelector('#btnConta .badge:not([hidden])', { timeout: 8000 }).catch(() => { });
  ok((await B.page.$eval('#btnConta .badge', b => !b.hidden && b.textContent)) === '1', 'conflito sinalizado no botão Minha conta');
  ok(S.docs.get(eqAzul + '|familias|' + fam.id).dados.numero === '99', 'a alteração da outra pessoa não foi sobrescrita');
  await abrirConta(B.page); await B.page.shot('08-conflito');
  const tConf = await B.page.textContent('#prodCaixa');
  ok(/Conflitos para revisar \(1\)/.test(tConf) && /número/.test(tConf), 'conflito listado com os campos diferentes');
  await B.page.click('[data-pp=manterMinha]'); await B.page.waitForTimeout(800);
  ok(S.docs.get(eqAzul + '|familias|' + fam.id).dados.numero === '88', 'ao escolher "aplicar a minha versão", ela é gravada');
  ok(!(await B.page.$eval('#btnConta .badge', b => !b.hidden)), 'conflito resolvido some da lista');
  await B.page.click('[data-pp=fechar]');

  // ------------------------------------------------------------------ 8. Visualizador
  console.log('8. Visualizador');
  const C = await contexto('vis');
  await C.page.goto(BASE); await entrar(C.page, 'vis@teste.local', senhaVis); await C.page.waitForSelector('#paTrocar');
  await C.page.fill('#pa_senha', 'VeraSenha2026'); await C.page.fill('#pa_senha2', 'VeraSenha2026'); await C.page.click('#paTrocar button[type=submit]');
  await C.page.waitForSelector('#prodAuth', { state: 'hidden', timeout: 10000 }); await C.page.waitForTimeout(800);
  await irPara(C.page, 'familias');
  const tv = await textoView(C.page);
  ok(tv.includes('somente para visualização') && tv.includes('Acácias'), 'visualizador consulta, com aviso de somente leitura');
  await C.page.click('[data-act=abrirFamilia]'); await C.page.waitForTimeout(300); await C.page.click('[data-act=editarFamilia]').catch(() => { }); await C.page.waitForTimeout(300);
  ok(await C.page.$eval('#formFamilia button[type=submit]', b => b.disabled).catch(() => true), 'visualizador não consegue salvar alterações');
  const nAntes = S.log.length; await C.page.evaluate(() => claude.use('db').then(db => db.collection('familias').doc('x1').set({ codigo: 'F9' })).catch(e => window.__err = e.code));
  ok(S.log.length === nAntes && (await C.page.evaluate(() => window.__err)) === 'invalid_argument', 'gravação forçada pelo visualizador é bloqueada');

  // ------------------------------------------------------------------ 9. Desativação
  console.log('9. Desativar conta');
  await A.page.fill('#pa_email', 'admin@teste.local'); await A.page.fill('#pa_senha', 'Senha123forte'); await A.page.click('#paLogin button[type=submit]');
  await A.page.waitForSelector('[data-pa=abrirEquipe]'); ok(true, 'ao entrar de novo, administração escolhe a equipe');
  await A.page.click('[data-pa=abrirEquipe][data-id="' + eqAzul + '"]');
  await A.page.waitForSelector('#prodAuth', { state: 'hidden', timeout: 10000 }); await A.page.waitForTimeout(500);
  await abrirConta(A.page); await A.page.click('[data-pp=gestao]'); await A.page.waitForSelector('[data-pp=desativar]');
  await A.page.click('[data-pp=desativar][data-id="' + pAcs.user_id + '"]'); await A.page.waitForTimeout(500);
  ok(!pAcs.ativo, 'conta do ACS desativada pela administração');
  await B.page.reload(); await B.page.waitForSelector('#prodAuth:not([hidden]) h2', { timeout: 10000 });
  ok((await B.page.textContent('#prodAuth')).includes('desativada'), 'ACS desativado perde o acesso ao reabrir o app');
  const restoB = await B.page.evaluate(async () => (await indexedDB.databases()).map(d => d.name).filter(n => /^acs-digital/.test(n)));
  ok(!restoB.length, 'dados locais do ACS desativado foram apagados do aparelho');

  // ------------------------------------------------------------------ 10. App instalável e abertura sem internet
  console.log('10. Instalação e abertura sem internet');
  const D = await contexto('pwa', { serviceWorkers: 'allow' });
  await D.page.goto(BASE); await entrar(D.page, 'admin@teste.local', 'Senha123forte');
  await D.page.waitForSelector('[data-pa=abrirEquipe]'); await D.page.click('[data-pa=abrirEquipe][data-id="' + eqAzul + '"]');
  await D.page.waitForSelector('#prodAuth', { state: 'hidden', timeout: 10000 });
  await D.page.waitForFunction(() => navigator.serviceWorker.controller || navigator.serviceWorker.ready, null, { timeout: 10000 });
  await D.page.evaluate(() => navigator.serviceWorker.ready); await D.page.waitForTimeout(1500);
  const man = await D.page.evaluate(() => fetch('manifest.webmanifest').then(r => r.json()));
  ok(man.display === 'standalone' && man.icons.length === 3, 'manifesto de aplicativo instalável');
  await D.ctx.setOffline(true); S.offline = true;
  await D.page.reload(); await D.page.waitForSelector('#btnConta', { timeout: 15000 }).catch(() => { });
  await D.page.waitForTimeout(1200); await irPara(D.page, 'familias');
  const toff = await textoView(D.page).catch(() => '');
  ok(toff.includes('Acácias'), 'sem internet, o app abre e mostra os dados guardados no aparelho');
  ok(/Sem conexão/.test(await sync(D.page).catch(() => '')) || /Sem conexão/.test(toff), 'app indica que está sem conexão');
  await D.page.shot('09-offline-aberto');
  await D.ctx.setOffline(false); S.offline = false;

  // ------------------------------------------------------------------ desktop
  await A.page.setViewportSize({ width: 1280, height: 800 }); await A.page.click('[data-pp=fechar]').catch(() => { });
  await irPara(A.page, 'painel'); await A.page.waitForTimeout(400); await A.page.shot('10-desktop');
  await abrirConta(A.page); await A.page.click('[data-pp=gestao]'); await A.page.waitForSelector('.pp-user'); await A.page.shot('11-desktop-gestao');

  console.log('ERROS DE CONSOLE:', erros.length ? erros : 'nenhum');
  console.log(falhas ? 'FALHAS: ' + falhas : 'TODOS OS TESTES PASSARAM');
  await browser.close(); srv.close();
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error('ERRO NO TESTE', e); process.exit(2); });
