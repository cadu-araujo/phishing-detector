const viewLabels = { dashboard: 'Visão geral', campaigns: 'Campanhas', layouts: 'Layouts', people: 'Pessoas', groups: 'Grupos', training: 'Treinamentos', reports: 'Relatórios', audit: 'Auditoria', settings: 'Configurações' };
const viewRoot = document.querySelector('#view-root');
const breadcrumb = document.querySelector('#breadcrumb-current');
let currentView = 'dashboard';
let toastTimer;
let dashboardRefreshCleanup = null;
let dashboardLatestKey = '';
let trainingRefreshCleanup = null;

const layoutTemplates = {
  institutional: { label: 'Portal educativo neutro', kicker: 'Comunicado de segurança', title: 'Revise o conteúdo antes de continuar', copy: 'Um modelo seguro para orientar a pessoa até um treinamento, sem imitar telas de autenticação ou pedir credenciais.', button: 'Abrir conteúdo educativo →' },
  benefits: { label: 'Comunicado de benefícios', kicker: 'Pessoas e benefícios', title: 'Há um novo material para sua revisão', copy: 'Use este formato para campanhas educativas sobre contexto, urgência e verificação de mensagens.', button: 'Ver material educativo →' },
  shared: { label: 'Documento compartilhado', kicker: 'Colaboração', title: 'Confira o documento de aprendizagem', copy: 'Uma experiência curta e contextual para ensinar a verificar remetentes, links e solicitações incomuns.', button: 'Abrir documento educativo →' }
};

let trainingCourses = {
  phishing: {
    title: 'Phishing: identificar, reportar e agir',
    shortTitle: 'Phishing',
    description: 'Aprenda a reconhecer mensagens manipuladoras, validar links e reportar tentativas com segurança.',
    duration: '10 min',
    level: 'Essencial',
    objectives: ['Reconhecer sinais de urgência e engenharia social', 'Validar remetente, endereço e destino do link', 'Reportar sem responder nem compartilhar dados'],
    modules: [
      { title: '1. O que é phishing', text: 'Phishing é uma tentativa de manipular alguém para clicar, abrir um arquivo ou compartilhar uma informação. A mensagem pode parecer legítima, mas o contexto, o endereço do remetente e o pedido precisam fazer sentido juntos.', points: ['Desconfie de urgência artificial, ameaça ou prêmio inesperado.', 'Confirme a solicitação por um canal corporativo conhecido.', 'Nunca informe senha, código MFA ou dados sensíveis a partir de um link recebido.'] },
      { title: '2. Pare, verifique e só então aja', text: 'Antes de clicar, passe o cursor sobre o link e confira o domínio real. Procure pequenas alterações no endereço, remetentes externos, anexos inesperados e pedidos que fogem do processo normal.', points: ['Confira o domínio completo, não apenas o nome exibido.', 'Não habilite macros, scripts ou conteúdo ativo de arquivos desconhecidos.', 'Se houver dúvida, abra o portal pelo favorito oficial ou digite o endereço manualmente.'] },
      { title: '3. Como reportar', text: 'Ao identificar uma mensagem suspeita, preserve o contexto e use o canal oficial de reporte da organização. Evite encaminhar a mensagem para colegas, responder ao remetente ou testar o link em outros dispositivos.', points: ['Use o botão ou canal corporativo de reporte.', 'Informe assunto, remetente e motivo da suspeita.', 'Se clicou, reporte imediatamente e siga a orientação da equipe de segurança.'] }
    ],
    quiz: { question: 'Você recebe um e-mail urgente com um link para “regularizar o acesso”. Qual é a atitude mais segura?', options: ['Clicar rapidamente para evitar o bloqueio.', 'Responder pedindo confirmação ao remetente.', 'Validar o endereço por canal oficial e reportar se houver dúvida.'], answer: 2 }
  },
  malware: {
    title: 'Malware: reduzir o risco no dia a dia',
    shortTitle: 'Malware',
    description: 'Entenda como arquivos, links e dispositivos podem introduzir códigos maliciosos e como interromper o risco.',
    duration: '10 min',
    level: 'Essencial',
    objectives: ['Identificar arquivos e comportamentos de risco', 'Usar atualizações e proteção como barreiras', 'Isolar e reportar um possível incidente'],
    modules: [
      { title: '1. Como o malware chega', text: 'Malware é um software criado para causar dano, espionar, interromper ou obter acesso indevido. Ele pode chegar por anexos, links, pendrives, instaladores falsos ou sites comprometidos.', points: ['Trate executáveis, atalhos e arquivos compactados inesperados como suspeitos.', 'Não instale programas fora do catálogo ou sem aprovação.', 'Não conecte dispositivos removíveis desconhecidos ao equipamento corporativo.'] },
      { title: '2. Barreiras simples', text: 'Atualizações, antivírus, menor privilégio e cópias de segurança reduzem o impacto, mas dependem de hábitos consistentes. A proteção não substitui a análise do contexto.', points: ['Mantenha sistema e aplicativos atualizados pelo canal oficial.', 'Não desative a proteção para abrir um arquivo ou acelerar uma tarefa.', 'Use somente contas e permissões necessárias para o trabalho.'] },
      { title: '3. Suspeita ou incidente', text: 'Comportamentos como janelas inesperadas, lentidão súbita, arquivos renomeados ou alertas de segurança devem ser reportados. Interromper a propagação cedo ajuda a proteger outras pessoas.', points: ['Pare de interagir com o conteúdo suspeito.', 'Desconecte a rede apenas se essa for a orientação do procedimento interno.', 'Contate a equipe responsável e registre o que aconteceu, sem apagar evidências.'] }
    ],
    quiz: { question: 'Um anexo inesperado pede para habilitar macros. O que você faz?', options: ['Habilita macros para visualizar o documento.', 'Fecha o arquivo e reporta pelo canal oficial.', 'Envia o arquivo para um colega testar.'], answer: 1 }
  },
  passwords: {
    title: 'Troca periódica de senha',
    shortTitle: 'Troca de senha',
    description: 'Aprenda a manter senhas fortes, únicas e protegidas, seguindo a política corporativa sem criar atalhos inseguros.',
    duration: '8 min',
    level: 'Essencial',
    objectives: ['Criar frases-senha únicas e difíceis de adivinhar', 'Usar MFA e gerenciador aprovado', 'Trocar senhas quando a política ou um risco exigir'],
    modules: [
      { title: '1. Senha forte e única', text: 'Uma senha deve ser longa, exclusiva para cada serviço e difícil de associar à pessoa. Reutilizar a mesma senha amplia o impacto de qualquer vazamento.', points: ['Prefira uma frase-senha longa e exclusiva.', 'Não use nome, data, empresa, time ou padrão previsível.', 'Nunca compartilhe sua senha com colegas ou por e-mail.'] },
      { title: '2. Troca com segurança', text: 'A troca periódica deve seguir a política oficial e ocorrer no portal conhecido. Trocas forçadas e frequentes demais podem levar a padrões previsíveis; por isso, siga o prazo e troque imediatamente diante de suspeita de exposição.', points: ['Acesse o portal pelo endereço oficial ou favorito corporativo.', 'Use MFA quando disponível e nunca compartilhe o código.', 'Se esquecer a senha, utilize o fluxo oficial de recuperação.'] },
      { title: '3. Proteção contínua', text: 'A segurança da conta também depende de dispositivos atualizados, bloqueio de tela e atenção a solicitações de redefinição. Uma mensagem inesperada sobre senha pode ser phishing.', points: ['Confirme pedidos de redefinição pelo canal oficial.', 'Use o gerenciador de senhas aprovado pela organização.', 'Reporte notificações de login ou redefinição que você não iniciou.'] }
    ],
    quiz: { question: 'Quando uma senha deve ser trocada?', options: ['Sempre que uma mensagem inesperada pedir, usando o link dela.', 'Somente quando a política exigir ou houver suspeita de exposição, pelo canal oficial.', 'Depois de compartilhar a senha com outra pessoa.'], answer: 1 }
  }
};
let trainingCoursesLoaded = false;
let trainingCoursesLoading = false;

function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character])); }
function getSavedLayouts() { try { const saved = JSON.parse(localStorage.getItem('fpap_layouts') || '[]'); return Array.isArray(saved) ? saved : []; } catch (error) { return []; } }
function getCampaignDrafts() { try { const saved = JSON.parse(localStorage.getItem('fpap_campaign_drafts') || '[]'); return Array.isArray(saved) ? saved : []; } catch (error) { return []; } }
function normalizeCampaignEmails(value) { return [...new Set(String(value || '').split(/[\n,;]+/).map(email => email.trim().toLowerCase()).filter(Boolean))]; }
function isCorporateCampaignEmail(email) { return /^[^@\s]+@fieam\.org\.br$/i.test(email); }
function formatLayoutDate(value) { const date = new Date(value); return Number.isNaN(date.getTime()) ? 'data não informada' : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date); }
function updateCampaignCountChrome() {
  const count = getCampaignDrafts().length;
  const label = `${count} campanha${count === 1 ? '' : 's'} neste ciclo`;
  const sidebarCount = document.querySelector('#sidebar-campaign-count');
  if (sidebarCount) sidebarCount.textContent = label;
  const navCount = document.querySelector('.nav-item[data-view="campaigns"] .nav-count');
  if (navCount) navCount.textContent = String(count);
}
function dashboardCampaignOptions() {
  const drafts = getCampaignDrafts().filter(draft => draft && draft.id).slice().reverse();
  return drafts.length
    ? drafts.map(draft => `<option value="${escapeHtml(draft.id)}">${escapeHtml(draft.name || 'Campanha sem nome')}</option>`).join('')
    : '<option value="">Nenhuma campanha local enviada</option>';
}

function trendSvg() { return `<svg viewBox="0 0 90 22" aria-label="Tendência positiva"><polyline points="0,17 12,16 24,18 36,11 48,13 60,6 72,8 90,2" fill="none" stroke="#a8e6dc" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`; }

function dashboardView() {
  const drafts = getCampaignDrafts().filter(draft => draft && draft.id);
  const latestDraft = drafts[drafts.length - 1];
  const latestName = escapeHtml(latestDraft?.name || 'Nenhuma campanha criada');
  const latestRecipients = Array.isArray(latestDraft?.recipientEmails) ? latestDraft.recipientEmails.length : 0;
  return `<div class="dashboard-view generic-view">
    <div class="page-header"><div class="page-title"><h1>Resiliência não é um clique.</h1><p>Bom dia, Lucas. Este é o pulso do programa de conscientização do Sistema FIEAM.</p></div><div class="page-actions"><button class="button" data-action="export">Exportar visão</button><button class="button primary" data-action="new-campaign"><span class="plus">+</span>Nova campanha</button></div></div>
    <section class="signal-strip" aria-label="Indicadores corporativos">
      <div class="signal-lead"><span class="signal-label">Dados do ambiente</span><h2>Métricas reais da sua operação.</h2><small id="dashboard-last-updated">Atualização automática a cada 5 s.</small></div>
      <div class="signal-stat"><small>Campanhas locais</small><strong id="dashboard-campaign-total">${drafts.length}</strong><em class="neutral">rascunhos salvos neste navegador</em></div>
      <div class="signal-stat"><small>E-mails enviados</small><strong id="dashboard-sent-total">—</strong><em class="neutral">eventos reais do servidor</em></div>
      <div class="signal-stat"><small>Interações registradas</small><strong id="dashboard-interactions-total">—</strong><em class="neutral">orientações concluídas</em></div>
    </section>
    <div class="dashboard-grid">
      <div>
        <section class="panel campaign-panel"><div class="panel-heading"><div><h2>Campanha em andamento</h2><p>Acompanhamento do ciclo atual</p></div><button class="text-link" data-view-link="campaigns">Ver todas →</button></div>
          <div class="campaign-feature"><div class="campaign-topline"><div class="campaign-ident"><div class="campaign-icon">⌁</div><div><h3>${latestName}</h3><small>${latestDraft ? 'Campanha local · dados vinculados a este navegador' : 'Crie uma campanha para acompanhar os dados reais'}</small></div></div><span class="status ${latestDraft ? 'scheduled' : ''}">${latestDraft ? 'Rascunho' : 'Sem campanha'}</span></div>
            <div class="campaign-body"><div class="campaign-copy"><h4>Acompanhamento sem dados inventados.</h4><p>Esta área mostra somente campanhas salvas e eventos registrados no servidor local. Nenhuma métrica demonstrativa é exibida como resultado real.</p><div class="campaign-meta"><span class="meta-chip">Destinatários <b id="dashboard-latest-recipients">${latestRecipients}</b></span><span class="meta-chip">Envios <b id="dashboard-latest-sent">—</b></span><span class="meta-chip">Interações <b id="dashboard-latest-interactions">—</b></span></div></div>
              <div class="progress-wrap"><div class="progress-label"><span>Dados disponíveis</span><b id="dashboard-latest-status">aguardando</b></div><div class="progress-track"><div class="progress-fill" id="dashboard-latest-progress" style="width:0%"></div></div><div class="progress-detail"><span id="dashboard-latest-detail">Nenhum envio contabilizado</span><span>sem estimativas</span></div><div class="trend-line">A evolução aparece após novos eventos.</div></div></div>
          </div>
        </section>
        <section class="panel sector-table"><div class="table-toolbar"><div><strong>Leitura por setor</strong><p class="table-toolbar-note" id="sector-insight-meta">Eventos reais da campanha selecionada</p></div><select class="select-control" id="dashboard-campaign-filter" aria-label="Selecionar campanha">${dashboardCampaignOptions()}</select></div><div style="overflow-x:auto"><table class="data-table"><thead><tr><th>Setor / grupo</th><th>Entregues</th><th>Cliques</th><th>Interações</th><th>Click rate</th></tr></thead><tbody id="sector-insight-body"><tr><td colspan="5" class="campaign-empty-state">Carregando eventos da campanha…</td></tr></tbody></table></div></section>
        <div class="lower-grid"><section class="panel history-panel"><div class="panel-heading"><div><h2>Evolução observada</h2><p>Comparativo após campanhas reais</p></div><span class="status scheduled">Sem histórico</span></div><div class="empty-note"><strong>Ainda não há histórico suficiente.</strong><span>Envie campanhas controladas para comparar os resultados reais.</span></div></section>
          <section class="panel activity-panel"><div class="panel-heading"><div><h2>Atividade recente</h2><p>Trilha administrativa</p></div><button class="text-link" data-view-link="audit">Abrir auditoria →</button></div><div class="empty-note"><strong>Sem atividade demonstrativa.</strong><span>Os eventos aparecerão aqui quando forem registrados.</span></div></section></div>
      </div>
      <aside class="panel side-panel"><div class="positive-story"><div class="story-symbol">✦</div><h3>O comportamento correto também conta.</h3><p>Os resultados exibidos nesta área vêm somente dos eventos registrados nas campanhas locais.</p><div class="story-footer"><span>Estado dos dados</span><strong>real</strong></div></div><div class="action-list"><h3>Próximas ações</h3><div class="action-item"><div class="action-number">01</div><div><strong>Preparar uma campanha</strong><small>Crie um rascunho e associe destinatários autorizados.</small><button class="text-link" data-action="new-campaign">Criar campanha →</button></div></div><div class="action-item"><div class="action-number">02</div><div><strong>Organizar grupos</strong><small>Associe pessoas a setores para preencher a leitura por setor.</small><button class="text-link" data-view-link="groups">Abrir grupos →</button></div></div><div class="action-item"><div class="action-number">03</div><div><strong>Revisar os eventos</strong><small>Confira cliques e orientações registradas no servidor local.</small><button class="text-link" data-view-link="audit">Abrir auditoria →</button></div></div></div></aside>
    </div>
  </div>`;
}

function layoutsView() {
  const template = layoutTemplates.institutional;
  const storedLayouts = getSavedLayouts();
  const savedLayouts = storedLayouts.slice().reverse().map((layout, index) => ({...layout, storageIndex: storedLayouts.length - 1 - index}));
  const savedLayoutMarkup = savedLayouts.length ? savedLayouts.map(layout => `<div class="saved-layout-row"><div class="saved-layout-info"><span class="layout-type-mark">▧</span><div><strong>${escapeHtml(layout.name || 'Layout sem nome')}</strong><small>${escapeHtml(layout.templateLabel || layoutTemplates[layout.template]?.label || 'Modelo educativo')} · salvo em ${formatLayoutDate(layout.savedAt)}</small></div></div><span class="status scheduled">Rascunho</span><div class="saved-layout-actions"><button type="button" class="text-link" data-layout-edit="${layout.storageIndex}" aria-label="Editar ${escapeHtml(layout.name || 'layout')}">Editar</button><button type="button" class="text-link danger" data-layout-delete="${layout.storageIndex}" aria-label="Excluir ${escapeHtml(layout.name || 'layout')}">Excluir</button></div></div>`).join('') : `<div class="empty-note saved-layout-empty"><strong>Nenhum layout salvo ainda.</strong><span>Preencha o nome, escolha um modelo e clique em “Salvar layout educativo”.</span></div>`;
  return `<div class="generic-view layout-builder-view">
    <div class="page-header"><div class="page-title"><h1>Layouts</h1><p>Monte experiências educativas seguras para suas campanhas controladas.</p></div><div class="page-actions"><span class="status">Sem coleta de credenciais</span></div></div>
    <div class="layout-builder-grid">
      <section class="panel layout-preview-panel"><div class="panel-heading"><div><h2>Prévia do layout</h2><p>Modelo institucional neutro · somente treinamento</p></div><span class="status scheduled">Simulação local</span></div>
        <div class="layout-preview-shell"><div class="layout-browser-bar"><span class="layout-browser-dots">● ● ●</span><span>training.local/learning</span><b>AMBIENTE DE TESTE</b></div><div class="layout-preview-canvas"><img class="layout-preview-logo" src="assets/logo-fieam.png" alt="Sistema FIEAM"><div class="layout-education-banner">SIMULAÇÃO AUTORIZADA · NÃO SOLICITA CREDENCIAIS</div><div class="layout-preview-card"><small id="layout-preview-kicker">${template.kicker}</small><h3 id="layout-preview-title">${template.title}</h3><p id="layout-preview-copy">${template.copy}</p><button type="button" class="button primary" data-action="toast" data-message="A prévia é educativa e não solicita credenciais.">Abrir conteúdo educativo →</button></div><small class="layout-preview-footer">Programa de conscientização · ambiente de treinamento</small></div></div>
      </section>
      <aside class="panel layout-controls-panel"><div class="panel-heading"><div><h2>Configurar layout</h2><p>Escolha um modelo permitido para a campanha.</p></div></div><form id="layout-form" class="settings-form"><div class="form-field"><label for="layout-name">Nome do layout</label><input id="layout-name" name="layout_name" value="Portal educativo — modelo 01" required></div><div class="form-field"><label for="layout-template">Modelo educativo</label><select id="layout-template" name="layout_template">${Object.entries(layoutTemplates).map(([key, value]) => `<option value="${key}">${value.label}</option>`).join('')}</select></div><div class="layout-safety-note"><strong>Limites de segurança</strong><span>✓ sem campos de senha ou código</span><span>✓ sem cópia de login de terceiros</span><span>✓ aviso educativo visível</span></div><button type="submit" class="button primary full-button">Salvar layout educativo</button></form></aside>
    </div>
    <section class="panel saved-layouts-panel"><div class="panel-heading"><div><h2>Layouts salvos</h2><p>Rascunhos disponíveis para revisão e associação a uma campanha.</p></div><span class="status scheduled">${savedLayouts.length} rascunho${savedLayouts.length === 1 ? '' : 's'}</span></div><div class="saved-layout-list">${savedLayoutMarkup}</div></section>
    <section class="panel layout-guidance-panel"><div class="panel-heading"><div><h2>Como usar</h2><p>Conecte o layout a uma campanha e revise o objetivo educativo antes da publicação.</p></div><span class="status finished">Pronto para revisão</span></div><div class="layout-guidance-grid"><div><strong>1 · Escolha o contexto</strong><small>Benefícios, colaboração ou comunicado institucional.</small></div><div><strong>2 · Revise a prévia</strong><small>O banner de simulação permanece visível para a pessoa.</small></div><div><strong>3 · Publique com aprovação</strong><small>Use somente grupos e destinatários autorizados.</small></div></div></section>
  </div>`;
}

function settingsView() {
  return `<div class='generic-view'><div class='page-header'><div class='page-title'><h1>Configurações</h1><p>Defina o remetente autorizado e as barreiras do disparo piloto.</p></div><div class='page-actions'><span class='status scheduled'>Modo controlado</span></div></div><div class='settings-layout'><section class='panel settings-panel'><div class='panel-heading'><div><h2>Remetente de campanha</h2><p>Identidade do e-mail de simulação.</p></div><span class='status'>Allowlist ativa</span></div><form id='sender-config-form' class='settings-form'><div class='form-grid'><div class='form-field'><label>E-mail remetente</label><input id='sender-email' name='sender_email' type='email' placeholder='seguranca@fieam.org.br' required><small class='form-help'>Use uma caixa institucional autorizada.</small></div><div class='form-field'><label>Nome exibido</label><input id='sender-name' name='sender_name' placeholder='Segurança da Informação · FIEAM' required></div><div class='form-field'><label for='smtp-user'>Usuário SMTP</label><input id='smtp-user' name='smtp_user' type='email' placeholder='caixa@fieam.org.br' required><small class='form-help'>Normalmente é o e-mail completo da mesma caixa remetente.</small></div><div class='form-field'><label>SMTP relay / host</label><input id='smtp-host' name='smtp_host' placeholder='smtp.office365.com'></div><div class='form-field'><label>Porta</label><input id='smtp-port' name='smtp_port' type='number' placeholder='587'></div><div class='form-field'><label for='smtp-security'>Criptografia</label><select id='smtp-security' name='smtp_security'><option value='starttls'>TLS/STARTTLS (recomendado)</option><option value='ssl'>SSL/TLS</option></select><small class='form-help'>Microsoft 365 usa TLS/STARTTLS na porta 587.</small></div><div class='form-field'><label for='smtp-password'>Senha SMTP</label><input id='smtp-password' name='smtp_password' type='password' autocomplete='current-password' placeholder='Senha da caixa de e-mail'><small class='form-help'>Usada somente no servidor local; não é salva no arquivo de configuração.</small></div><div class='form-field full'><label for='allowed-domains'>Domínios autorizados</label><textarea id='allowed-domains' name='allowed_domains' rows='3' placeholder='fieam.org.br&#10;outro-dominio.org.br' required></textarea><small class='form-help'>Um domínio por linha; também aceita vírgulas e ponto e vírgula. Destinatários fora da lista serão bloqueados.</small></div></div><div class='secret-callout'><span>♢</span><div><strong>Segredo fora da interface</strong><small>O usuário pode ser salvo como configuração; a senha fica somente na memória do servidor local e precisa ser informada novamente após reiniciar.</small></div></div><div class='form-actions'><button type='submit' class='button primary'>Salvar configuração</button></div></form></section><aside class='panel test-panel'><div class='panel-heading'><div><h2>Enviar e-mail teste</h2><p>Somente para destinatário interno aprovado.</p></div></div><form id='send-test-form' class='settings-form'><div class='form-field'><label>Destinatário de teste</label><input id='test-recipient' type='email' placeholder='seu.nome@fieam.org.br' required></div><div class='form-field'><label>Assunto</label><input id='test-subject' value='[SIMULAÇÃO FPAP] Atualização de benefícios' required></div><div class='test-checklist'><strong>Antes de enviar</strong><span>✓ remetente autorizado</span><span>✓ destinatário interno</span><span>✓ landing educativa</span><span>✓ sem coleta de credenciais</span></div><button type='submit' class='button primary full-button'>Enviar teste controlado</button></form></aside></div></div>`;
}
function genericView(view) {
  const campaignDrafts = getCampaignDrafts();
  const campaignRows = [...campaignDrafts].reverse().map(draft => `<tr><td><span class="sector-name"><i class="sector-bullet" style="background:#efbf5b"></i>${escapeHtml(draft.name || 'Campanha sem nome')}</span></td><td><span class="status ${draft.status === 'Enviada' ? 'finished' : 'scheduled'}">${escapeHtml(draft.status || 'Rascunho')}</span></td><td class="table-muted">${formatLayoutDate(draft.sentAt || draft.createdAt)}</td><td class="table-muted">${escapeHtml(draft.audience || 'Campanha piloto · 50 usuários')} · ${draft.recipientCount || draft.recipientEmails?.length || 0} destinatário(s)</td><td class="table-rate">—</td></tr>`).join('');
  const configs = {
    campaigns: { title: 'Campanhas', desc: 'Acompanhe somente as campanhas educativas criadas neste ambiente.', action: 'Nova campanha', metrics: ['0', '0', '0', '0'], labels: ['Campanhas criadas', 'Destinatários', 'Cliques', 'Interações'], rows: campaignRows },
    people: { title: 'Pessoas', desc: 'Base sincronizada com o diretório corporativo.', action: 'Sincronizar agora', metrics: ['2.430', '2.391', '4', '09 ago'], labels: ['Colaboradores', 'Ativos', 'Unidades', 'Última sync'], rows: ['Ana Paula Mendes','Carlos Eduardo Lima','Joana Ribeiro','Mateus Santos','Renata Carvalho'].map((n,i)=>`<tr><td><span class="sector-name"><i class="sector-bullet" style="background:${['#68bcb0','#efbf5b','#94a9dc','#bfdd70','#d88d73'][i]}"></i>${n}</span></td><td class="table-muted">${['Financeiro','Tecnologia','RH','Administrativo','Compras'][i]}</td><td class="table-muted">Sistema FIEAM</td><td><span class="status">Ativo</span></td><td class="table-muted">Grupo padrão</td></tr>`).join('') },
    groups: { title: 'Grupos', desc: 'Segmentos automáticos e personalizados para campanhas.', action: 'Novo grupo', metrics: ['18', '12', '4', '2.430'], labels: ['Grupos totais', 'Automáticos', 'Pilotos', 'Membros'], rows: ['Financeiro · ativos','Gestores · todas as unidades','Campanha piloto · 50 usuários','Tecnologia · ativos'].map((n,i)=>`<tr><td><span class="sector-name"><i class="sector-bullet" style="background:${['#efbf5b','#68bcb0','#94a9dc','#bfdd70'][i]}"></i>${n}</span></td><td class="table-muted">${['Regra automática','Regra automática','Personalizado','Regra automática'][i]}</td><td class="table-muted">${[86,214,50,72][i]} membros</td><td><span class="status ${i===2?'scheduled':''}">${i===2?'Piloto':'Sincronizado'}</span></td><td class="table-muted">há ${i+1}h</td></tr>`).join('') },
    training: { title: 'Treinamentos', desc: 'Conteúdo contextual para transformar interação em aprendizado.', action: 'Novo treinamento', metrics: ['8', '91%', '118', '3'], labels: ['Conteúdos ativos', 'Conclusão média', 'Concluídos agora', 'Em revisão'], rows: ['Como identificar páginas falsas de autenticação','Verifique links antes de abrir documentos','Como validar solicitações incomuns','Reporte: o caminho mais seguro'].map((n,i)=>`<tr><td><span class="sector-name"><i class="sector-bullet" style="background:${['#68bcb0','#efbf5b','#94a9dc','#bfdd70'][i]}"></i>${n}</span></td><td class="table-muted">${['Autenticação','Colaboração','Engenharia social','Cultura de reporte'][i]}</td><td class="table-muted">${[342,281,190,407][i]} acessos</td><td class="table-rate rate-good">${[94,89,88,96][i]}%</td><td><span class="status">Ativo</span></td></tr>`).join('') },
    reports: { title: 'Relatórios', desc: 'Leituras executivas e comparativos do programa.', action: 'Exportar relatório', metrics: ['6', '-61,9%', '39%', '94%'], labels: ['Campanhas no ciclo', 'Evolução do clique', 'Reporte atual', 'Treinamento'], rows: ['Relatório executivo · Q3 2026','Atualização de benefícios','Evolução por setor · 6 meses','Relatório de treinamento'].map((n,i)=>`<tr><td><span class="sector-name"><i class="sector-bullet" style="background:${['#68bcb0','#efbf5b','#94a9dc','#bfdd70'][i]}"></i>${n}</span></td><td class="table-muted">${['10 ago 2026','16 ago 2026','10 ago 2026','10 ago 2026'][i]}</td><td class="table-muted">${['Executivo','Campanha','Comparativo','Educação'][i]}</td><td><span class="status finished">Pronto</span></td><td><button class="text-link" data-action="export">Baixar PDF →</button></td></tr>`).join('') },
    audit: { title: 'Auditoria', desc: 'Histórico de ações administrativas e aprovações.', action: 'Exportar trilha', metrics: ['184', '0', '12', '100%'], labels: ['Eventos no mês', 'Alertas', 'Consultas restritas', 'Cobertura'], rows: ['Marina Alves aprovou a campanha FPAP-2026-08','Lucas Cordeiro exportou visão executiva','Sincronização do grupo Financeiro concluída','Camila Rocha alterou template de benefícios'].map((n,i)=>`<tr><td><span class="sector-name"><i class="sector-bullet" style="background:${['#68bcb0','#94a9dc','#bfdd70','#efbf5b'][i]}"></i>${n}</span></td><td class="table-muted">${['10 ago · 08:21','10 ago · 05:14','09 ago · 18:42','08 ago · 15:09'][i]}</td><td class="table-muted">${['Aprovação','Exportação','Sincronização','Edição'][i]}</td><td class="table-muted">Concluído</td><td class="table-muted">ID-00${184-i}</td></tr>`).join('') },
    settings: { title: 'Configurações', desc: 'Políticas, integrações e limites que protegem o programa.', action: 'Salvar alterações', metrics: ['3', '5', '60/min', 'MFA'], labels: ['Domínios permitidos', 'Administradores', 'Limite de envio', 'Acesso'], rows: ['Domínios autorizados','Aprovação em duas etapas','Janela permitida de disparo','Retenção de eventos individualizados'].map((n,i)=>`<tr><td><span class="sector-name"><i class="sector-bullet" style="background:${['#68bcb0','#efbf5b','#94a9dc','#bfdd70'][i]}"></i>${n}</span></td><td class="table-muted">${['fieam.org.br · 1 domínio','Ativo','08:00—18:00 BRT','180 dias'][i]}</td><td><span class="status">Protegido</span></td><td class="table-muted">Atualizado por SI</td><td><button class="text-link" data-action="toast" data-message="Configuração pronta para edição.">Editar →</button></td></tr>`).join('') }
  };
  const c = configs[view];
  return `<div class="generic-view"><div class="page-header"><div class="page-title"><h1>${c.title}</h1><p>${c.desc}</p></div><div class="page-actions"><button class="button" data-action="export">Exportar</button><button class="button primary" data-action="${view==='campaigns'?'new-campaign':'toast'}" data-message="A ação está disponível no próximo passo do MVP."><span class="plus">+</span>${c.action}</button></div></div><div class="metric-row">${c.metrics.map((m,i)=>`<div class="metric-box"><small>${c.labels[i]}</small><strong>${m}</strong><span>${i===0?'neste ciclo':'↑ 6,4% vs. anterior'}</span></div>`).join('')}</div><section class="panel generic-table-panel"><div class="table-toolbar"><strong>${view==='audit'?'Trilha de eventos':view==='settings'?'Políticas ativas':`Visão de ${c.title.toLowerCase()}`}</strong><div class="generic-toolbar"><select class="select-control"><option>Todos os status</option><option>Ativos</option><option>Finalizados</option></select></div></div><div style="overflow-x:auto"><table class="data-table"><thead><tr><th>Registro</th><th>Contexto</th><th>Data</th><th>Status</th><th>Ação</th></tr></thead><tbody>${c.rows}</tbody></table></div></section></div>`;
}

function getTrainingProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem('fpap_training_progress') || '{}');
    return saved && typeof saved === 'object' ? saved : {};
  } catch (error) { return {}; }
}
function saveTrainingProgress(progress) { localStorage.setItem('fpap_training_progress', JSON.stringify(progress)); }
function trainingProgress(courseId) {
  const course = trainingCourses[courseId];
  const saved = getTrainingProgress()[courseId] || {};
  const completedModules = Array.isArray(saved.completedModules) ? saved.completedModules : [];
  const total = (course?.modules.length || 0) + 1;
  const done = completedModules.length + (saved.quizPassed ? 1 : 0);
  return { percent: Math.min(100, Math.round((done / total) * 100)), completedModules, quizPassed: Boolean(saved.quizPassed), completedAt: saved.completedAt || '' };
}
function trainingStatus(courseId) {
  const progress = trainingProgress(courseId);
  if (progress.percent === 100) return '<span class="status finished">Concluído</span>';
  if (progress.percent > 0) return `<span class="status scheduled">${progress.percent}% concluído</span>`;
  return '<span class="status">Não iniciado</span>';
}
function trainingView() {
  const courses = Object.entries(trainingCourses).map(([id, course]) => {
    const progress = trainingProgress(id);
    return `<article class="training-course-card"><div class="training-course-topline"><span class="training-course-icon">${id === 'phishing' ? '◈' : id === 'malware' ? '⌁' : '✓'}</span><div>${trainingStatus(id)}</div></div>${course.custom ? '<span class="training-custom-label">Curso personalizado</span>' : ''}<h2>${escapeHtml(course.title)}</h2><p>${escapeHtml(course.description)}</p><div class="training-course-meta"><span>${escapeHtml(course.duration)}</span><span>${course.modules.length} módulos + avaliação</span><span>${escapeHtml(course.level)}</span></div><div class="training-progress"><div class="training-progress-label"><span>Progresso</span><strong>${progress.percent}%</strong></div><div class="progress-track"><div class="progress-fill" style="width:${progress.percent}%"></div></div></div><div class="training-objectives"><strong>Você vai aprender</strong>${course.objectives.map(item => `<span>✓ ${escapeHtml(item)}</span>`).join('')}</div><div class="training-course-actions"><button type="button" class="button primary" data-training-open="${id}">${progress.percent ? 'Continuar curso' : 'Abrir curso'}</button><button type="button" class="button" data-training-invite="${id}">Enviar convite</button>${course.custom ? `<button type="button" class="text-link" data-training-edit="${escapeHtml(id)}">Editar</button><button type="button" class="text-link danger" data-training-delete="${escapeHtml(id)}">Excluir</button>` : ''}</div></article>`;
  }).join('');
  const trackingMarkup = `<section class="panel training-tracking-panel"><div class="panel-heading"><div><h2>Acompanhamento dos convites</h2><p>Veja quem recebeu, abriu o curso e concluiu a avaliação. A atualização ocorre automaticamente.</p></div><span class="status scheduled" id="training-tracking-updated">Atualizando…</span></div><div class="training-tracking-metrics"><div class="metric-box"><small>Convites enviados</small><strong id="training-sent-count">—</strong><span>por curso</span></div><div class="metric-box"><small>Não abriram</small><strong id="training-not-opened-count">—</strong><span>sem acesso ao link</span></div><div class="metric-box"><small>Abertos</small><strong id="training-opened-count">—</strong><span>acessaram o link</span></div><div class="metric-box"><small>Não concluídos</small><strong id="training-pending-count">—</strong><span>abertos sem finalizar</span></div><div class="metric-box"><small>Concluídos</small><strong id="training-completed-count">—</strong><span>avaliação aprovada</span></div></div><div class="table-toolbar training-tracking-toolbar"><strong>Detalhamento por destinatário</strong><span class="form-help">Sem senha, código MFA ou conteúdo privado</span></div><div style="overflow-x:auto"><table class="data-table"><thead><tr><th>Curso</th><th>Destinatário</th><th>Status</th><th>Última atualização</th></tr></thead><tbody id="training-tracking-body"><tr><td colspan="4" class="campaign-empty-state">Carregando acompanhamento…</td></tr></tbody></table></div></section>`;
  return `<div class="generic-view training-view"><div class="page-header"><div class="page-title"><h1>Treinamentos</h1><p>Administre cursos, convites e o progresso dos usuários em um só lugar.</p></div><div class="page-actions"><span class="status scheduled">Visão administrativa</span><button class="button" data-training-export>Exportar relatório</button><button class="button primary" data-training-create><span class="plus">+</span>Criar treinamento</button></div></div><section class="training-intro panel"><div><span class="signal-label">Programa de aprendizagem</span><h2>Aprender, praticar e reportar.</h2><p>Os cursos predefinidos podem ser enviados para usuários autorizados. Crie conteúdos próprios para adaptar a orientação à realidade da sua equipe.</p></div><div class="training-intro-stat"><strong>${Object.keys(trainingCourses).length}</strong><span>cursos disponíveis</span></div></section><section class="training-course-grid">${courses}</section>${trackingMarkup}<section class="panel training-send-guidance"><div class="panel-heading"><div><h2>Administração segura</h2><p>O administrador acompanha somente convite, abertura e conclusão. Nenhum curso solicita senha, código MFA ou conteúdo privado.</p></div><span class="status finished">Uso educativo</span></div><div class="layout-guidance-grid"><div><strong>1 · Crie o conteúdo</strong><small>Defina três módulos, objetivos e uma avaliação final.</small></div><div><strong>2 · Envie para usuários</strong><small>Use pessoas cadastradas e destinatários dentro da allowlist configurada.</small></div><div><strong>3 · Leia o relatório</strong><small>Separe quem não abriu, quem abriu sem finalizar e quem concluiu.</small></div></div></section></div>`;
}
function normalizeTrainingCourse(course) {
  if (!course || !course.id || !course.title) return null;
  const modules = Array.isArray(course.modules) ? course.modules.map(module => Array.isArray(module) ? {title: module[0] || 'Módulo', text: module[1] || '', points: Array.isArray(module[2]) ? module[2] : []} : {title: module.title || 'Módulo', text: module.text || '', points: Array.isArray(module.points) ? module.points : []}) : [];
  return {...course, modules, objectives: Array.isArray(course.objectives) ? course.objectives : modules.slice(0, 3).map(module => module.title), quiz: course.quiz || {question: 'Qual é a atitude mais segura?', options: ['Seguir o canal oficial.', 'Compartilhar a informação.', 'Ignorar o alerta.'], answer: 0}};
}
async function loadTrainingCourses() {
  if (trainingCoursesLoaded || trainingCoursesLoading) return;
  trainingCoursesLoading = true;
  try {
    const response = await fetch('/api/training-courses');
    if (!response.ok) throw new Error('training-courses');
    const customCourses = (await response.json()).courses || [];
    customCourses.map(normalizeTrainingCourse).filter(Boolean).forEach(course => { trainingCourses[course.id] = {...course, custom: true}; });
    trainingCoursesLoaded = true;
    if (currentView === 'training' && !document.querySelector('#training-invite-form') && !document.querySelector('#training-course-form')) render('training');
  } catch (error) {
    showToast('Não foi possível carregar os cursos personalizados.');
  } finally { trainingCoursesLoading = false; }
}
function courseEditorModal(courseId = '') {
  const editing = Boolean(courseId && trainingCourses[courseId]?.custom);
  const course = editing ? trainingCourses[courseId] : {title: '', shortTitle: '', description: '', duration: '10 min', level: 'Essencial', objectives: ['', '', ''], modules: [{title: '', text: '', points: ['', '', '']}, {title: '', text: '', points: ['', '', '']}, {title: '', text: '', points: ['', '', '']}], quiz: {question: '', options: ['', '', ''], answer: 0}};
  const modules = [0, 1, 2].map(index => { const module = course.modules[index] || {title: '', text: '', points: []}; return `<fieldset class="course-module-editor"><legend>Módulo ${index + 1}</legend><div class="form-field"><label for="course-module-title-${index}">Título</label><input id="course-module-title-${index}" data-course-module-title="${index}" value="${escapeHtml(module.title)}" maxlength="120" required></div><div class="form-field"><label for="course-module-text-${index}">Conteúdo</label><textarea id="course-module-text-${index}" data-course-module-text="${index}" rows="3" maxlength="700" required>${escapeHtml(module.text)}</textarea></div><div class="form-field"><label>Pontos principais</label><textarea data-course-module-points="${index}" rows="3" maxlength="500" placeholder="Um ponto por linha" required>${escapeHtml((module.points || []).join('\n'))}</textarea></div></fieldset>`; }).join('');
  document.querySelector('#modal-root').innerHTML = `<div class="modal-backdrop" data-close-course-modal><div class="modal training-course-editor-modal" role="dialog" aria-modal="true" aria-labelledby="course-editor-title"><div class="modal-head"><div><h2 id="course-editor-title">${editing ? 'Editar treinamento' : 'Criar treinamento'}</h2><p>Monte um curso educativo com três módulos e uma avaliação final.</p></div><button class="modal-close" data-close-course-modal aria-label="Fechar">×</button></div><form class="modal-form" id="training-course-form"><div class="course-editor-grid"><div class="form-field"><label for="course-title">Título do curso</label><input id="course-title" name="title" value="${escapeHtml(course.title)}" maxlength="150" required placeholder="Ex.: Segurança no uso de dispositivos"></div><div class="form-field"><label for="course-short-title">Nome curto</label><input id="course-short-title" name="shortTitle" value="${escapeHtml(course.shortTitle)}" maxlength="60" required placeholder="Ex.: Dispositivos"></div><div class="form-field full"><label for="course-description">Resumo</label><textarea id="course-description" name="description" rows="3" maxlength="500" required placeholder="Explique o que o usuário aprenderá.">${escapeHtml(course.description)}</textarea></div><div class="form-field"><label for="course-duration">Duração</label><input id="course-duration" name="duration" value="${escapeHtml(course.duration)}" maxlength="30" required></div><div class="form-field"><label for="course-level">Nível</label><select id="course-level" name="level"><option ${course.level === 'Essencial' ? 'selected' : ''}>Essencial</option><option ${course.level === 'Intermediário' ? 'selected' : ''}>Intermediário</option><option ${course.level === 'Avançado' ? 'selected' : ''}>Avançado</option></select></div><div class="form-field full"><label for="course-objectives">Objetivos do curso</label><textarea id="course-objectives" name="objectives" rows="3" maxlength="500" required placeholder="Um objetivo por linha">${escapeHtml((course.objectives || []).join('\n'))}</textarea></div></div><div class="course-module-grid">${modules}</div><fieldset class="course-quiz-editor"><legend>Avaliação final</legend><div class="form-field"><label for="course-quiz-question">Pergunta</label><textarea id="course-quiz-question" name="quizQuestion" rows="2" maxlength="300" required>${escapeHtml(course.quiz.question)}</textarea></div><div class="course-quiz-options">${[0,1,2].map(index => `<div class="form-field"><label for="course-quiz-option-${index}">Alternativa ${index + 1}</label><input id="course-quiz-option-${index}" data-course-quiz-option="${index}" value="${escapeHtml(course.quiz.options[index] || '')}" maxlength="220" required></div>`).join('')}</div><div class="form-field"><label for="course-quiz-answer">Resposta correta</label><select id="course-quiz-answer" name="quizAnswer">${[0,1,2].map(index => `<option value="${index}" ${Number(course.quiz.answer) === index ? 'selected' : ''}>Alternativa ${index + 1}</option>`).join('')}</select></div></fieldset><div class="send-campaign-warning"><strong>Regras de segurança</strong><span>O curso não pode solicitar senha, código MFA ou qualquer credencial. O convite abre somente conteúdo educativo.</span></div><div class="form-actions"><button type="button" class="button" data-close-course-modal>Cancelar</button><button type="submit" class="button primary">${editing ? 'Salvar alterações' : 'Criar treinamento'}</button></div></form></div></div>`;
  document.querySelectorAll('[data-close-course-modal]').forEach(button => button.addEventListener('click', event => { if (event.target === button) document.querySelector('#modal-root').innerHTML = ''; }));
  document.querySelector('#training-course-form').addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.target;
    const payload = Object.fromEntries(new FormData(form));
    const modulesPayload = [0, 1, 2].map(index => ({title: form.querySelector(`[data-course-module-title="${index}"]`).value.trim(), text: form.querySelector(`[data-course-module-text="${index}"]`).value.trim(), points: form.querySelector(`[data-course-module-points="${index}"]`).value.split(/\n+/).map(item => item.trim()).filter(Boolean)}));
    const customCourse = {id: editing ? courseId : undefined, title: payload.title.trim(), shortTitle: payload.shortTitle.trim(), description: payload.description.trim(), duration: payload.duration.trim(), level: payload.level, objectives: payload.objectives.split(/\n+/).map(item => item.trim()).filter(Boolean), modules: modulesPayload, quiz: {question: payload.quizQuestion.trim(), options: [0,1,2].map(index => form.querySelector(`[data-course-quiz-option="${index}"]`).value.trim()), answer: Number(payload.quizAnswer)}};
    const submit = form.querySelector('button[type="submit"]'); submit.disabled = true;
    try {
      const response = await fetch('/api/training-courses', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(customCourse)});
      const result = await response.json(); if (!response.ok) throw new Error(result.error || 'curso não salvo');
      const saved = normalizeTrainingCourse(result.course); trainingCourses[saved.id] = {...saved, custom: true}; trainingCoursesLoaded = true;
      document.querySelector('#modal-root').innerHTML = ''; render('training'); showToast(`Treinamento “${saved.title}” ${editing ? 'atualizado' : 'criado'}.`);
    } catch (error) { submit.disabled = false; showToast(`Treinamento não salvo: ${error.message}.`); }
  });
}
async function deleteTrainingCourse(courseId) {
  const course = trainingCourses[courseId];
  if (!course?.custom || !window.confirm(`Excluir o treinamento “${course.title}”? Os convites já enviados continuarão no relatório.`)) return;
  try {
    const response = await fetch('/api/training-courses/delete', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({id: courseId})});
    const result = await response.json(); if (!response.ok) throw new Error(result.error || 'curso não excluído');
    delete trainingCourses[courseId]; render('training'); showToast('Treinamento excluído.');
  } catch (error) { showToast(`Treinamento não excluído: ${error.message}.`); }
}
function openTrainingCourse(courseId) {
  const course = trainingCourses[courseId];
  if (!course) return;
  const progress = trainingProgress(courseId);
  let moduleIndex = Math.min(progress.completedModules.length, course.modules.length - 1);
  const renderCourse = () => {
    const module = course.modules[moduleIndex];
    const currentDone = progress.completedModules.includes(moduleIndex);
    document.querySelector('#modal-root').innerHTML = `<div class="modal-backdrop" data-close-training-modal><div class="modal training-course-modal" role="dialog" aria-modal="true" aria-labelledby="training-modal-title"><div class="modal-head"><div><span class="training-modal-eyebrow">Curso educativo · ${escapeHtml(course.level)}</span><h2 id="training-modal-title">${escapeHtml(course.title)}</h2><p>Módulo ${moduleIndex + 1} de ${course.modules.length} · ${escapeHtml(course.duration)}</p></div><button class="modal-close" data-close-training-modal aria-label="Fechar">×</button></div><div class="training-module-tabs">${course.modules.map((item, index) => `<button type="button" class="training-module-tab ${index === moduleIndex ? 'active' : ''} ${progress.completedModules.includes(index) ? 'done' : ''}" data-training-module="${index}">${index + 1}</button>`).join('')}<span class="training-module-line"></span><span class="training-module-tab ${progress.quizPassed ? 'done' : ''} ${moduleIndex === course.modules.length - 1 && progress.completedModules.length === course.modules.length ? 'active' : ''}">✓</span></div><div class="modal-form training-module-body"><span class="training-module-label">Módulo ${moduleIndex + 1}</span><h3>${escapeHtml(module.title.replace(/^\d+\.\s*/, ''))}</h3><p class="training-module-text">${escapeHtml(module.text)}</p><div class="training-points">${module.points.map(point => `<div><span>✓</span><p>${escapeHtml(point)}</p></div>`).join('')}</div><div class="training-module-actions"><button type="button" class="button" data-close-training-modal>Fechar</button><button type="button" class="button primary" data-training-next>${currentDone ? (moduleIndex === course.modules.length - 1 ? 'Ir para avaliação' : 'Próximo módulo') : 'Marcar módulo como lido'}</button></div></div></div></div>`;
    document.querySelectorAll('[data-training-module]').forEach(button => button.addEventListener('click', () => { moduleIndex = Number(button.dataset.trainingModule); renderCourse(); }));
    document.querySelectorAll('[data-close-training-modal]').forEach(button => button.addEventListener('click', event => { if (event.target === button) document.querySelector('#modal-root').innerHTML = ''; }));
    document.querySelector('[data-training-next]').addEventListener('click', () => {
      const latest = getTrainingProgress();
      const state = latest[courseId] || { completedModules: [], quizPassed: false };
      state.completedModules = [...new Set([...(state.completedModules || []), moduleIndex])].sort();
      latest[courseId] = state;
      saveTrainingProgress(latest);
      if (moduleIndex < course.modules.length - 1) { moduleIndex += 1; renderCourse(); } else renderTrainingQuiz(courseId);
    });
  };
  renderCourse();
}
function renderTrainingQuiz(courseId) {
  const course = trainingCourses[courseId];
  const quiz = course.quiz;
  document.querySelector('#modal-root').innerHTML = `<div class="modal-backdrop" data-close-training-modal><div class="modal training-course-modal" role="dialog" aria-modal="true" aria-labelledby="training-quiz-title"><div class="modal-head"><div><span class="training-modal-eyebrow">Avaliação rápida · ${escapeHtml(course.shortTitle)}</span><h2 id="training-quiz-title">Confira o que você aprendeu</h2><p>Uma pergunta para concluir o curso.</p></div><button class="modal-close" data-close-training-modal aria-label="Fechar">×</button></div><form class="modal-form training-quiz-form" id="training-quiz-form"><p class="training-quiz-question">${escapeHtml(quiz.question)}</p><div class="training-quiz-options">${quiz.options.map((option, index) => `<label><input type="radio" name="answer" value="${index}" required><span>${escapeHtml(option)}</span></label>`).join('')}</div><div class="training-module-actions"><button type="button" class="button" data-close-training-modal>Fechar</button><button type="submit" class="button primary">Concluir curso</button></div></form></div></div>`;
  document.querySelectorAll('[data-close-training-modal]').forEach(button => button.addEventListener('click', event => { if (event.target === button) document.querySelector('#modal-root').innerHTML = ''; }));
  document.querySelector('#training-quiz-form').addEventListener('submit', event => {
    event.preventDefault();
    const answer = Number(new FormData(event.target).get('answer'));
    if (answer !== quiz.answer) { showToast('Resposta incorreta. Revise os módulos e tente novamente.'); return; }
    const progress = getTrainingProgress();
    progress[courseId] = {...(progress[courseId] || {}), completedModules: course.modules.map((item, index) => index), quizPassed: true, completedAt: new Date().toISOString()};
    saveTrainingProgress(progress);
    document.querySelector('#modal-root').innerHTML = `<div class="modal-backdrop" data-close-training-modal><div class="modal training-complete-modal" role="dialog" aria-modal="true"><div class="training-complete-mark">✓</div><h2>Curso concluído</h2><p>Você concluiu <strong>${escapeHtml(course.title)}</strong>. Continue praticando a validação e o reporte seguro.</p><button type="button" class="button primary" data-close-training-modal>Voltar aos treinamentos</button></div></div>`;
    document.querySelectorAll('[data-close-training-modal]').forEach(button => button.addEventListener('click', event => { if (event.target === button) { document.querySelector('#modal-root').innerHTML = ''; render('training'); } }));
  });
}
function openTrainingInvite(courseId = 'phishing') {
  const people = getLocalPeople().filter(person => isCorporateCampaignEmail(person.email));
  const courseOptions = Object.entries(trainingCourses).map(([id, course]) => `<option value="${id}" ${id === courseId ? 'selected' : ''}>${escapeHtml(course.title)}</option>`).join('');
  const peopleOptions = people.length ? people.map(person => `<label class="training-recipient-option"><input type="checkbox" name="training-person" value="${escapeHtml(person.email)}"><span>${escapeHtml(person.email)}</span></label>`).join('') : '<div class="empty-note training-people-empty"><strong>Nenhuma pessoa corporativa cadastrada</strong><span>Cadastre destinatários em Pessoas ou use a lista manual abaixo.</span></div>';
  document.querySelector('#modal-root').innerHTML = `<div class="modal-backdrop" data-close-training-invite><div class="modal training-invite-modal" role="dialog" aria-modal="true" aria-labelledby="training-invite-title"><div class="modal-head"><div><h2 id="training-invite-title">Enviar convite de treinamento</h2><p>Convite educativo para endereços corporativos autorizados.</p></div><button class="modal-close" data-close-training-invite aria-label="Fechar">×</button></div><form class="modal-form" id="training-invite-form"><div class="send-campaign-warning"><strong>Uso seguro e autorizado</strong><span>O convite leva a um curso sem login e sem coleta de senha, código MFA ou qualquer credencial. O servidor ainda valida a allowlist SMTP.</span></div><div class="form-field"><label for="training-course-select">Curso</label><select id="training-course-select" name="course_id">${courseOptions}</select></div><div class="form-field"><label>Pessoas cadastradas</label><div class="training-recipient-list">${peopleOptions}</div>${people.length ? '<button type="button" class="text-link" id="training-select-all">Selecionar todas</button>' : ''}</div><div class="form-field"><label for="training-recipients">E-mails adicionais</label><textarea id="training-recipients" name="recipients" rows="3" placeholder="uma.pessoa@fieam.org.br&#10;outro.nome@fieam.org.br"></textarea><small class="form-help">Um endereço por linha. Somente destinatários corporativos permitidos serão aceitos.</small></div><div class="form-field"><label for="training-subject">Assunto</label><input id="training-subject" name="subject" maxlength="180" value="[TREINAMENTO FIEAM] Curso de conscientização" required></div><div class="form-actions"><button type="button" class="button" data-close-training-invite>Cancelar</button><button type="submit" class="button primary">Enviar convites</button></div></form></div></div>`;
  document.querySelectorAll('[data-close-training-invite]').forEach(button => button.addEventListener('click', event => { if (event.target === button) document.querySelector('#modal-root').innerHTML = ''; }));
  document.querySelector('#training-select-all')?.addEventListener('click', () => document.querySelectorAll('input[name="training-person"]').forEach(input => { input.checked = true; }));
  document.querySelector('#training-course-select').addEventListener('change', event => { const course = trainingCourses[event.target.value]; document.querySelector('#training-subject').value = `[TREINAMENTO FIEAM] ${course.shortTitle}`; });
  document.querySelector('#training-invite-form').addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.target;
    const selected = [...form.querySelectorAll('input[name="training-person"]:checked')].map(input => input.value);
    const manual = normalizeCampaignEmails(form.querySelector('#training-recipients').value);
    const recipients = [...new Set([...selected, ...manual])];
    if (!recipients.length) { showToast('Selecione ou informe ao menos um e-mail corporativo.'); return; }
    if (recipients.some(email => !isCorporateCampaignEmail(email))) { showToast('Use somente e-mails corporativos @fieam.org.br.'); return; }
    const submit = form.querySelector('button[type="submit"]'); submit.disabled = true;
    try {
      const response = await fetch('/api/send-training', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ course_id: form.querySelector('#training-course-select').value, recipients, subject: form.querySelector('#training-subject').value }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'falha no envio');
      document.querySelector('#modal-root').innerHTML = '';
      showToast(`${result.sent} convite${result.sent === 1 ? '' : 's'} enviado${result.sent === 1 ? '' : 's'} com sucesso.`);
    } catch (error) { submit.disabled = false; showToast(`Convites não enviados: ${error.message}.`); }
  });
}
function trainingRecipientRows(events) {
  const byCorrelation = new Map();
  events.forEach(event => {
    if (!event.correlation_id || !trainingCourses[event.course_id]) return;
    const current = byCorrelation.get(event.correlation_id) || { correlationId: event.correlation_id, courseId: event.course_id, recipient: event.recipient || '', sent: false, opened: false, completed: false, lastTimestamp: event.timestamp || '' };
    current.recipient = current.recipient || event.recipient || '';
    current.lastTimestamp = new Date(event.timestamp || 0) > new Date(current.lastTimestamp || 0) ? event.timestamp : current.lastTimestamp;
    if (event.type === 'sent') current.sent = true;
    if (event.type === 'opened') current.opened = true;
    if (event.type === 'completed') current.completed = true;
    byCorrelation.set(event.correlation_id, current);
  });
  return [...byCorrelation.values()].sort((a, b) => new Date(b.lastTimestamp || 0) - new Date(a.lastTimestamp || 0));
}
async function bindTrainingTracking() {
  if (trainingRefreshCleanup) trainingRefreshCleanup();
  const body = document.querySelector('#training-tracking-body');
  const update = events => {
    const rows = trainingRecipientRows(events);
    const sent = rows.filter(row => row.sent);
    const opened = sent.filter(row => row.opened || row.completed);
    const completed = sent.filter(row => row.completed);
    const pending = opened.filter(row => !row.completed);
    const notOpened = sent.filter(row => !row.opened && !row.completed);
    const setText = (id, value) => { const element = document.querySelector(`#${id}`); if (element) element.textContent = String(value); };
    setText('training-sent-count', sent.length);
    setText('training-not-opened-count', notOpened.length);
    setText('training-opened-count', opened.length);
    setText('training-pending-count', pending.length);
    setText('training-completed-count', completed.length);
    const label = document.querySelector('#training-tracking-updated');
    if (label) label.textContent = `Atualizado às ${new Intl.DateTimeFormat('pt-BR', {hour: '2-digit', minute: '2-digit', second: '2-digit'}).format(new Date())}`;
    if (!body) return;
    body.innerHTML = rows.length ? rows.map(row => {
      const status = row.completed ? ['Concluído', 'finished'] : row.opened ? ['Aberto · não concluído', 'scheduled'] : ['Enviado · não aberto', ''];
      return `<tr><td>${escapeHtml(trainingCourses[row.courseId]?.shortTitle || row.courseId)}</td><td class="table-muted">${escapeHtml(row.recipient || 'Destinatário não identificado')}</td><td><span class="status ${status[1]}">${status[0]}</span></td><td class="table-muted">${formatLayoutDate(row.lastTimestamp)}</td></tr>`;
    }).join('') : '<tr><td colspan="4" class="campaign-empty-state">Nenhum convite de treinamento enviado ainda.</td></tr>';
  };
  const load = async () => {
    try {
      const response = await fetch('/api/training-events');
      if (!response.ok) throw new Error('training-events');
      update((await response.json()).events || []);
    } catch (error) {
      if (body) body.innerHTML = '<tr><td colspan="4" class="campaign-empty-state">Não foi possível carregar o acompanhamento dos treinamentos.</td></tr>';
    }
  };
  const timer = window.setInterval(load, 5000);
  trainingRefreshCleanup = () => { window.clearInterval(timer); trainingRefreshCleanup = null; };
  load();
}
async function exportTrainingReport() {
  try {
    const response = await fetch('/api/training-events');
    if (!response.ok) throw new Error('training-events');
    const rows = trainingRecipientRows((await response.json()).events || []);
    const csvRows = rows.map(row => {
      const status = row.completed ? 'Concluído' : row.opened ? 'Aberto - não concluído' : 'Enviado - não aberto';
      return [trainingCourses[row.courseId]?.title || row.courseId, row.recipient || 'Não identificado', status, formatLayoutDate(row.lastTimestamp)].map(value => `"${String(value).replaceAll('"', '""')}"`).join(',');
    });
    const blob = new Blob([['Curso,Destinatário,Status,Última atualização', ...csvRows].join('\n')], {type: 'text/csv;charset=utf-8'});
    const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'relatorio-treinamentos.csv'; link.click(); URL.revokeObjectURL(url);
    showToast(rows.length ? 'Relatório de treinamentos exportado.' : 'Não há convites de treinamento para exportar.');
  } catch (error) { showToast('Não foi possível exportar o relatório de treinamentos.'); }
}
function bindTrainingEvents() {
  document.querySelectorAll('[data-training-open]').forEach(button => button.addEventListener('click', () => openTrainingCourse(button.dataset.trainingOpen)));
  document.querySelectorAll('[data-training-invite]').forEach(button => button.addEventListener('click', () => openTrainingInvite(button.dataset.trainingInvite)));
  document.querySelector('[data-training-create]')?.addEventListener('click', () => courseEditorModal());
  document.querySelectorAll('[data-training-edit]').forEach(button => button.addEventListener('click', () => courseEditorModal(button.dataset.trainingEdit)));
  document.querySelectorAll('[data-training-delete]').forEach(button => button.addEventListener('click', () => deleteTrainingCourse(button.dataset.trainingDelete)));
  document.querySelector('[data-training-export]')?.addEventListener('click', exportTrainingReport);
  loadTrainingCourses();
  bindTrainingTracking();
}

function render(view = currentView) { currentView = view; breadcrumb.textContent = viewLabels[view]; viewRoot.innerHTML = view === 'dashboard' ? dashboardView() : view === 'layouts' ? layoutsView() : view === 'settings' ? settingsView() : view === 'training' ? trainingView() : genericView(view); document.querySelectorAll('.nav-item').forEach(btn => btn.classList.toggle('active', btn.dataset.view === view)); bindViewEvents(); if (view === 'layouts') bindLayoutEvents(); if (view === 'settings') bindSettingsEvents(); if (view === 'training') bindTrainingEvents(); }

function showToast(message) { const toast = document.querySelector('#toast'); toast.textContent = message; toast.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 3200); }
async function logout() { try { await fetch('/api/logout', { method: 'POST' }); } finally { window.location.assign('/login.html'); } }

async function exportReport() {
  try {
    const response = await fetch('/api/events');
    if (!response.ok) throw new Error('events');
    const events = (await response.json()).events || [];
    const campaignIds = new Set(getCampaignDrafts().map(draft => draft?.id).filter(Boolean));
    const totals = new Map();
    campaignIds.forEach(campaignId => dashboardSectorRows(events, campaignId).forEach(row => {
      const current = totals.get(row.sector) || {sector: row.sector, delivered: 0, clicks: 0, interactions: 0};
      current.delivered += row.delivered;
      current.clicks += row.clicks;
      current.interactions += row.interactions;
      totals.set(row.sector, current);
    }));
    const rows = [...totals.values()].sort((a, b) => b.delivered - a.delivered || a.sector.localeCompare(b.sector, 'pt-BR'));
    const csv = ['Setor,Entregues,Cliques,Interações,Click Rate', ...rows.map(row => {
      const rate = row.delivered ? `${((row.clicks / row.delivered) * 100).toFixed(1).replace('.', ',')}%` : '0,0%';
      return [row.sector, row.delivered, row.clicks, row.interactions, rate].map(value => `"${String(value).replaceAll('"', '""')}"`).join(',');
    })].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'fpap-visao-executiva.csv';
    link.click();
    URL.revokeObjectURL(url);
    showToast(rows.length ? 'Relatório real exportado com sucesso.' : 'Não há dados reais agrupados para exportar.');
  } catch (error) {
    showToast('Não foi possível exportar os eventos reais.');
  }
}

function campaignModal() { document.querySelector('#modal-root').innerHTML = `<div class="modal-backdrop" data-close-modal><div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="modal-head"><div><h2 id="modal-title">Nova campanha</h2><p>Crie um rascunho seguro para revisão.</p></div><button class="modal-close" data-close-modal aria-label="Fechar">×</button></div><form class="modal-form" id="campaign-form"><div class="form-grid"><div class="form-field full"><label for="campaign-name">Nome da campanha</label><input id="campaign-name" name="name" required placeholder="Ex.: Atualização de benefícios" /></div><div class="form-field"><label for="campaign-audience">Público</label><select id="campaign-audience"><option>Campanha piloto · 50 usuários</option><option>Financeiro · 86 usuários</option><option>Gestores · 214 usuários</option></select></div><div class="form-field"><label for="campaign-difficulty">Dificuldade</label><select id="campaign-difficulty"><option>Nível 1 · Fácil</option><option>Nível 2 · Moderado</option><option>Nível 3 · Difícil</option></select></div><div class="form-field full"><label for="campaign-template">Template de simulação</label><select id="campaign-template"><option>Documento compartilhado · colaboração</option><option>Atualização de benefícios · RH</option><option>Validação de acesso · suporte técnico</option></select><small class="form-help">Templates só podem usar remetentes e domínios autorizados.</small></div><div class="form-field full"><label for="campaign-description">Objetivo educativo</label><textarea id="campaign-description" placeholder="O que esta campanha deve ajudar a reconhecer?"></textarea></div></div><div class="form-actions"><button type="button" class="button" data-close-modal>Cancelar</button><button type="submit" class="button primary">Salvar como rascunho</button></div></form></div></div>`; document.querySelector('#campaign-name').focus(); document.querySelector('#campaign-form').addEventListener('submit', e => { e.preventDefault(); const payload = Object.fromEntries(new FormData(e.target)); const draft = { name: String(payload.name || '').trim() || 'Campanha sem nome', audience: document.querySelector('#campaign-audience').value, difficulty: document.querySelector('#campaign-difficulty').value, template: document.querySelector('#campaign-template').value, description: document.querySelector('#campaign-description').value.trim(), createdAt: new Date().toISOString() }; const drafts = getCampaignDrafts(); drafts.push(draft); localStorage.setItem('fpap_campaign_drafts', JSON.stringify(drafts.slice(-20))); document.querySelector('#modal-root').innerHTML = ''; render('campaigns'); showToast(`Campanha “${draft.name}” salva como rascunho.`); }); document.querySelectorAll('[data-close-modal]').forEach(el => el.addEventListener('click', e => { if (e.target === el) document.querySelector('#modal-root').innerHTML = ''; })); }

async function bindSettingsEvents() {
  const configForm = document.querySelector('#sender-config-form'); const testForm = document.querySelector('#send-test-form');
  try { const response = await fetch('/api/config'); if (response.ok) { const config = await response.json(); document.querySelector('#sender-email').value = config.sender_email || ''; document.querySelector('#sender-name').value = config.sender_name || ''; document.querySelector('#smtp-user').value = config.smtp_user || ''; document.querySelector('#reply-to').value = config.reply_to || ''; document.querySelector('#smtp-host').value = config.smtp_host || ''; document.querySelector('#smtp-port').value = config.smtp_port || ''; document.querySelector('#smtp-security').value = config.smtp_security || 'starttls'; document.querySelector('#allowed-domains').value = config.allowed_domains || ''; } } catch (error) { showToast('Servidor local offline: modo de configuração visual.'); }
  configForm.addEventListener('submit', async event => { event.preventDefault(); const payload = Object.fromEntries(new FormData(configForm)); try { const response = await fetch('/api/config', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) }); if (!response.ok) throw new Error('config'); document.querySelector('#smtp-password').value = ''; showToast('Configuração salva no servidor local.'); } catch (error) { const safePayload = {...payload}; delete safePayload.smtp_password; localStorage.setItem('fpap_sender_config', JSON.stringify(safePayload)); document.querySelector('#smtp-password').value = ''; showToast('Configuração salva localmente; a senha não foi armazenada.'); } });
  testForm.addEventListener('submit', async event => { event.preventDefault(); const recipient = document.querySelector('#test-recipient').value; const subject = document.querySelector('#test-subject').value; try { const response = await fetch('/api/send-test', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({recipient, subject}) }); const result = await response.json(); if (!response.ok) throw new Error(result.error || 'falha no envio'); showToast('E-mail teste enviado com sucesso.'); } catch (error) { showToast('Teste não enviado: ' + error.message + '.'); } });
}
function bindLayoutEvents() { const form = document.querySelector('#layout-form'); const template = document.querySelector('#layout-template'); const submitButton = form.querySelector('button[type="submit"]'); const updatePreview = () => { const selected = layoutTemplates[template.value] || layoutTemplates.institutional; document.querySelector('#layout-preview-kicker').textContent = selected.kicker; document.querySelector('#layout-preview-title').textContent = selected.title; document.querySelector('#layout-preview-copy').textContent = selected.copy; }; template.addEventListener('change', updatePreview); form.addEventListener('submit', event => { event.preventDefault(); const payload = Object.fromEntries(new FormData(form)); const layoutName = String(payload.layout_name || '').trim() || 'Layout sem nome'; const saved = getSavedLayouts(); const editIndex = form.dataset.editIndex === undefined ? -1 : Number(form.dataset.editIndex); const record = { name: layoutName, template: payload.layout_template, templateLabel: layoutTemplates[payload.layout_template]?.label || 'Modelo educativo', savedAt: new Date().toISOString() }; if (editIndex >= 0 && saved[editIndex]) saved[editIndex] = {...saved[editIndex], ...record}; else saved.push(record); localStorage.setItem('fpap_layouts', JSON.stringify(saved.slice(-20))); delete form.dataset.editIndex; render('layouts'); showToast(`Layout “${layoutName}” ${editIndex >= 0 ? 'atualizado' : 'salvo'} para revisão.`); }); document.querySelectorAll('[data-layout-edit]').forEach(button => button.addEventListener('click', () => { const index = Number(button.dataset.layoutEdit); const saved = getSavedLayouts()[index]; if (!saved) return; document.querySelector('#layout-name').value = saved.name || ''; template.value = saved.template || 'institutional'; form.dataset.editIndex = String(index); submitButton.textContent = 'Atualizar layout educativo'; updatePreview(); form.scrollIntoView({behavior:'smooth', block:'start'}); showToast(`Editando “${saved.name || 'layout sem nome'}”.`); })); document.querySelectorAll('[data-layout-delete]').forEach(button => button.addEventListener('click', () => { const index = Number(button.dataset.layoutDelete); const saved = getSavedLayouts(); const target = saved[index]; if (!target) return; if (!window.confirm(`Excluir o layout “${target.name || 'Layout sem nome'}”?`)) return; saved.splice(index, 1); localStorage.setItem('fpap_layouts', JSON.stringify(saved)); render('layouts'); showToast('Layout excluído.'); })); updatePreview(); }
function bindViewEvents() { document.querySelectorAll('[data-view-link]').forEach(el => el.addEventListener('click', () => render(el.dataset.viewLink))); document.querySelectorAll('[data-action]').forEach(el => el.addEventListener('click', () => { if (el.dataset.action === 'new-campaign') campaignModal(); else if (el.dataset.action === 'export') exportReport(); else if (el.dataset.action === 'logout') logout(); else showToast(el.dataset.message || 'Ação registrada.'); })); const filter = document.querySelector('#sector-filter'); if (filter) filter.addEventListener('change', () => showToast(`Filtro alterado para “${filter.value}”.`)); }

document.querySelectorAll('.nav-item').forEach(btn => btn.addEventListener('click', () => { render(btn.dataset.view); document.querySelector('.sidebar').classList.remove('open'); })); document.querySelector('.mobile-menu').addEventListener('click', () => document.querySelector('.sidebar').classList.toggle('open')); document.querySelector('#global-search').addEventListener('input', e => { if (e.target.value.length > 2) showToast(`Busca pronta para “${e.target.value}”.`); }); render();
function bindLayoutEvents() {
  const form = document.querySelector('#layout-form');
  const template = document.querySelector('#layout-template');
  const layoutName = document.querySelector('#layout-name');
  const submitButton = form.querySelector('button[type="submit"]');
  const panelTitle = form.closest('.panel')?.querySelector('h2');
  const updatePreview = () => {
    const selected = layoutTemplates[template.value] || layoutTemplates.institutional;
    document.querySelector('#layout-preview-kicker').textContent = selected.kicker;
    document.querySelector('#layout-preview-title').textContent = selected.title;
    document.querySelector('#layout-preview-copy').textContent = selected.copy;
  };
  let cancelButton = form.querySelector('[data-layout-cancel-edit]');
  if (!cancelButton) {
    cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.className = 'button';
    cancelButton.dataset.layoutCancelEdit = 'true';
    cancelButton.textContent = 'Cancelar edição';
    cancelButton.hidden = true;
    submitButton.parentElement?.insertBefore(cancelButton, submitButton);
  }
  const resetEditState = () => {
    delete form.dataset.editIndex;
    if (panelTitle) panelTitle.textContent = 'Configurar layout';
    submitButton.textContent = 'Salvar layout educativo';
    cancelButton.hidden = true;
    layoutName.value = 'Portal educativo — modelo 01';
    template.value = 'institutional';
    updatePreview();
  };
  template.addEventListener('change', updatePreview);
  form.addEventListener('submit', event => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(form));
    const name = String(payload.layout_name || '').trim() || 'Layout sem nome';
    const saved = getSavedLayouts();
    const editIndex = form.dataset.editIndex === undefined ? -1 : Number(form.dataset.editIndex);
    const record = { name, template: payload.layout_template, templateLabel: layoutTemplates[payload.layout_template]?.label || 'Modelo educativo', savedAt: new Date().toISOString() };
    if (editIndex >= 0 && saved[editIndex]) saved[editIndex] = {...saved[editIndex], ...record}; else saved.push(record);
    localStorage.setItem('fpap_layouts', JSON.stringify(saved.slice(-20)));
    render('layouts');
    showToast(`Layout “${name}” ${editIndex >= 0 ? 'atualizado' : 'salvo'} para revisão.`);
  });
  cancelButton.addEventListener('click', () => { resetEditState(); layoutName.focus(); showToast('Edição cancelada.'); });
  document.querySelectorAll('[data-layout-edit]').forEach(button => button.addEventListener('click', () => {
    const index = Number(button.dataset.layoutEdit);
    const saved = getSavedLayouts()[index];
    if (!saved) { showToast('Este layout não está mais disponível.'); return; }
    layoutName.value = saved.name || '';
    template.value = saved.template || 'institutional';
    form.dataset.editIndex = String(index);
    if (panelTitle) panelTitle.textContent = 'Editar layout salvo';
    submitButton.textContent = 'Atualizar layout educativo';
    cancelButton.hidden = false;
    updatePreview();
    form.scrollIntoView({behavior:'smooth', block:'center'});
    layoutName.focus({preventScroll:true});
    showToast(`Layout “${saved.name || 'sem nome'}” carregado para edição.`);
  }));
  document.querySelectorAll('[data-layout-delete]').forEach(button => button.addEventListener('click', () => {
    const index = Number(button.dataset.layoutDelete);
    const saved = getSavedLayouts();
    const target = saved[index];
    if (!target) return;
    if (!window.confirm(`Excluir o layout “${target.name || 'Layout sem nome'}”?`)) return;
    saved.splice(index, 1);
    localStorage.setItem('fpap_layouts', JSON.stringify(saved));
    render('layouts');
    showToast('Layout excluído.');
  }));
  updatePreview();
}
function campaignDraftsForUi() {
  return getCampaignDrafts().map((draft, index) => ({...draft, storageIndex: index}));
}

function saveCampaignDrafts(drafts) {
  localStorage.setItem('fpap_campaign_drafts', JSON.stringify(drafts.slice(-20)));
}

function campaignModalV2(editIndex = -1) {
  const drafts = getCampaignDrafts();
  const draft = editIndex >= 0 ? drafts[editIndex] : null;
  const savedLayouts = getSavedLayouts();
  const groups = getLocalGroups();
  const groupOptions = `<option value="">Sem grupo selecionado</option>${groups.map(group => `<option value="${escapeHtml(group.id)}">${escapeHtml(group.name)}</option>`).join('')}`;
  const layoutOptions = savedLayouts.length
    ? savedLayouts.map((layout, index) => `<option value="${index}">${escapeHtml(layout.name || 'Layout sem nome')}</option>`).join('')
    : '<option value="">Nenhum layout salvo — use o modelo seguro padrão</option>';
  document.querySelector('#modal-root').innerHTML = `<div class="modal-backdrop" data-close-campaign-modal><div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="modal-head"><div><h2 id="modal-title">${editIndex >= 0 ? 'Editar campanha' : 'Nova campanha'}</h2><p>Prepare uma simulação educativa autorizada para revisão.</p></div><button class="modal-close" data-close-campaign-modal aria-label="Fechar">×</button></div><form class="modal-form" id="campaign-form-v2"><div class="form-grid"><div class="form-field full"><label for="campaign-name-v2">Nome da campanha</label><input id="campaign-name-v2" name="name" required placeholder="Ex.: Atualização de benefícios" value="${escapeHtml(draft?.name || '')}" /></div><div class="form-field"><label for="campaign-audience-v2">Público</label><select id="campaign-audience-v2" name="audience"><option>Campanha piloto · 50 usuários</option><option>Financeiro · 86 usuários</option><option>Gestores · 214 usuários</option></select></div><div class="form-field"><label for="campaign-difficulty-v2">Dificuldade</label><select id="campaign-difficulty-v2" name="difficulty"><option>Nível 1 · Fácil</option><option>Nível 2 · Moderado</option><option>Nível 3 · Difícil</option></select></div><div class="form-field full"><label for="campaign-group-v2">Grupo de teste local</label><select id="campaign-group-v2" name="groupId">${groupOptions}</select><small class="form-help">Usado apenas para organizar a simulação local; nenhum e-mail será enviado automaticamente.</small></div><div class="form-field full"><label for="campaign-layout-v2">Layout educativo</label><select id="campaign-layout-v2" name="layoutIndex">${layoutOptions}</select><small class="form-help">O layout deve ser educativo, sem imitar login de terceiros e sem solicitar credenciais.</small></div><div class="form-field full"><label for="campaign-template-v2">Tema da simulação</label><select id="campaign-template-v2" name="template"><option>Documento compartilhado · colaboração</option><option>Atualização de benefícios · RH</option><option>Validação de acesso · suporte técnico</option></select></div><div class="form-field full"><label for="campaign-description-v2">Objetivo educativo</label><textarea id="campaign-description-v2" name="description" placeholder="O que esta campanha deve ajudar a reconhecer?">${escapeHtml(draft?.description || '')}</textarea></div></div><div class="form-actions"><button type="button" class="button" data-close-campaign-modal>Cancelar</button><button type="button" data-campaign-submit class="button primary">${editIndex >= 0 ? 'Atualizar rascunho' : 'Salvar como rascunho'}</button></div></form></div></div>`;
  const form = document.querySelector('#campaign-form-v2');
  const audience = document.querySelector('#campaign-audience-v2');
  const difficulty = document.querySelector('#campaign-difficulty-v2');
  const group = document.querySelector('#campaign-group-v2');
  const layout = document.querySelector('#campaign-layout-v2');
  const template = document.querySelector('#campaign-template-v2');
  if (draft) {
    audience.value = draft.audience || audience.value;
    difficulty.value = draft.difficulty || difficulty.value;
    group.value = draft.groupId || group.value;
    layout.value = draft.layoutIndex === undefined ? '' : String(draft.layoutIndex);
    template.value = draft.template || template.value;
  } else if (groups.length === 1) {
    group.value = groups[0].id;
  }
  document.querySelector('#campaign-name-v2').focus();
  let isSaving = false;
  const saveCampaign = event => {
    if (isSaving) return;
    isSaving = true;
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(form));
    const record = {
      id: draft?.id || `campaign-${Date.now()}`,
      name: String(payload.name || '').trim() || 'Campanha sem nome',
      audience: payload.audience,
      difficulty: payload.difficulty,
      groupId: payload.groupId || '',
      layoutIndex: payload.layoutIndex === '' ? null : Number(payload.layoutIndex),
      template: payload.template,
      description: String(payload.description || '').trim(),
      createdAt: draft?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'Rascunho'
    };
    const nextDrafts = getCampaignDrafts();
    if (editIndex >= 0 && nextDrafts[editIndex]) nextDrafts[editIndex] = {...nextDrafts[editIndex], ...record};
    else nextDrafts.push(record);
    saveCampaignDrafts(nextDrafts);
    document.querySelector('#modal-root').innerHTML = '';
    render('campaigns');
    showToast(`Campanha “${record.name}” ${editIndex >= 0 ? 'atualizada' : 'salva'} como rascunho.`);
  };
  form.addEventListener('submit', saveCampaign);
  document.querySelector('[data-campaign-submit]').addEventListener('click', saveCampaign);
  document.querySelectorAll('[data-close-campaign-modal]').forEach(element => element.addEventListener('click', event => {
    if (event.target === element) document.querySelector('#modal-root').innerHTML = '';
  }));
}

function campaignTableMarkup() {
  const drafts = campaignDraftsForUi().slice().reverse();
  const draftRows = drafts.map(draft => `<tr><td><span class="sector-name"><i class="sector-bullet" style="background:#efbf5b"></i>${escapeHtml(draft.name || 'Campanha sem nome')}</span></td><td><span class="status scheduled">Rascunho</span></td><td class="table-muted">${formatLayoutDate(draft.createdAt)}</td><td class="table-muted">${escapeHtml(draft.audience || 'Campanha piloto · 50 usuários')}</td><td><button type="button" class="text-link" data-campaign-edit="${draft.storageIndex}">Editar</button><button type="button" class="text-link danger" data-campaign-delete="${draft.storageIndex}">Excluir</button></td></tr>`).join('');
  const staticRows = campaignData.map(campaign => `<tr><td><span class="sector-name"><i class="sector-bullet" style="background:${campaign.color}"></i>${escapeHtml(campaign.name)}</span></td><td><span class="status ${campaign.statusClass}">${escapeHtml(campaign.status)}</span></td><td class="table-muted">${escapeHtml(campaign.date)}</td><td class="table-muted">${escapeHtml(campaign.audience)}</td><td class="table-rate">${escapeHtml(campaign.rate)}</td></tr>`).join('');
  return draftRows + staticRows;
}

function enhanceCampaignView() {
  const table = document.querySelector('.generic-table-panel');
  if (!table) return;
  const headers = table.querySelectorAll('thead th');
  ['Campanha', 'Status', 'Criada em', 'Público', 'Ações'].forEach((label, index) => { if (headers[index]) headers[index].textContent = label; });
  const body = table.querySelector('tbody');
  if (body) body.innerHTML = campaignTableMarkup();
  table.querySelectorAll('[data-campaign-edit]').forEach(button => button.addEventListener('click', () => campaignModalV2(Number(button.dataset.campaignEdit))));
  table.querySelectorAll('[data-campaign-delete]').forEach(button => button.addEventListener('click', () => {
    const index = Number(button.dataset.campaignDelete);
    const drafts = getCampaignDrafts();
    const target = drafts[index];
    if (!target || !window.confirm(`Excluir a campanha “${target.name || 'Campanha sem nome'}”?`)) return;
    drafts.splice(index, 1);
    saveCampaignDrafts(drafts);
    render('campaigns');
    showToast('Campanha excluída.');
  }));
}

const fpapBaseRender = render;
render = function(view = currentView) {
  fpapBaseRender(view);
  if (view === 'campaigns') enhanceCampaignView();
};

document.addEventListener('click', event => {
  const actionElement = event.target.closest('[data-action="new-campaign"]');
  if (!actionElement) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  campaignModalV2();
}, true);
function campaignTableMarkup() {
  const drafts = campaignDraftsForUi().slice().reverse();
  if (!drafts.length) return '<tr><td colspan="5" class="campaign-empty-state">Nenhuma campanha criada ainda. Clique em “Nova campanha” para salvar o primeiro rascunho.</td></tr>';
  return drafts.map(draft => `<tr><td><span class="sector-name"><i class="sector-bullet" style="background:#efbf5b"></i>${escapeHtml(draft.name || 'Campanha sem nome')}</span></td><td><span class="status scheduled">Rascunho</span></td><td class="table-muted">${formatLayoutDate(draft.createdAt)}</td><td class="table-muted">${escapeHtml(draft.audience || 'Campanha piloto · 50 usuários')}</td><td><button type="button" class="text-link" data-campaign-edit="${draft.storageIndex}">Editar</button><button type="button" class="text-link danger" data-campaign-delete="${draft.storageIndex}">Excluir</button></td></tr>`).join('');
}
function enhanceCampaignView() {
  const table = document.querySelector('.generic-table-panel');
  if (!table) return;
  const headers = table.querySelectorAll('thead th');
  ['Campanha', 'Status', 'Criada em', 'Público', 'Ações'].forEach((label, index) => { if (headers[index]) headers[index].textContent = label; });
  const body = table.querySelector('tbody');
  if (body) body.innerHTML = campaignTableMarkup();
  const firstMetric = document.querySelector('.metric-row .metric-box');
  if (firstMetric) {
    const metricLabel = firstMetric.querySelector('small');
    const metricValue = firstMetric.querySelector('strong');
    const metricNote = firstMetric.querySelector('span');
    if (metricLabel) metricLabel.textContent = 'Campanhas criadas';
    if (metricValue) metricValue.textContent = String(campaignDraftsForUi().length);
    if (metricNote) metricNote.textContent = 'neste navegador';
  }
  const navCount = document.querySelector('.nav-item[data-view="campaigns"] .nav-count');
  if (navCount) navCount.textContent = String(campaignDraftsForUi().length);
  table.querySelectorAll('[data-campaign-edit]').forEach(button => button.addEventListener('click', () => campaignModalV2(Number(button.dataset.campaignEdit))));
  table.querySelectorAll('[data-campaign-delete]').forEach(button => button.addEventListener('click', () => {
    const index = Number(button.dataset.campaignDelete);
    const drafts = getCampaignDrafts();
    const target = drafts[index];
    if (!target || !window.confirm(`Excluir a campanha “${target.name || 'Campanha sem nome'}”?`)) return;
    drafts.splice(index, 1);
    saveCampaignDrafts(drafts);
    render('campaigns');
    showToast('Campanha excluída.');
  }));
}
function getLocalPeople() { try { const saved = JSON.parse(localStorage.getItem('fpap_people') || '[]'); return Array.isArray(saved) ? saved : []; } catch (error) { return []; } }
function saveLocalPeople(people) { localStorage.setItem('fpap_people', JSON.stringify(people.slice(-500))); }
function getLocalGroups() { try { const saved = JSON.parse(localStorage.getItem('fpap_groups') || '[]'); return Array.isArray(saved) ? saved : []; } catch (error) { return []; } }
function saveLocalGroups(groups) { localStorage.setItem('fpap_groups', JSON.stringify(groups.slice(-100))); }
function groupNameById(groupId, groups = getLocalGroups()) { return groups.find(group => group.id === groupId)?.name || 'Sem grupo'; }

function peopleModalV2() {
  const groups = getLocalGroups();
  const groupOptions = `<option value="">Sem grupo</option>${groups.map(group => `<option value="${escapeHtml(group.id)}">${escapeHtml(group.name)}</option>`).join('')}`;
  document.querySelector('#modal-root').innerHTML = `<div class="modal-backdrop" data-close-people-modal><div class="modal" role="dialog" aria-modal="true" aria-labelledby="people-modal-title"><div class="modal-head"><div><h2 id="people-modal-title">Adicionar pessoas</h2><p>Inclua destinatários internos autorizados e associe-os a um grupo.</p></div><button class="modal-close" data-close-people-modal aria-label="Fechar">×</button></div><form class="modal-form" id="people-form-v2"><div class="form-field"><label for="people-emails-v2">E-mails corporativos</label><textarea id="people-emails-v2" name="emails" required placeholder="uma.pessoa@fieam.org.br\noutro.nome@fieam.org.br"></textarea><small class="form-help">Use um e-mail por linha. A lista aceita somente endereços válidos.</small></div><div class="form-field"><label for="people-group-v2">Adicionar ao grupo</label><select id="people-group-v2" name="groupId">${groupOptions}</select><small class="form-help">Você também pode trocar o grupo diretamente na tabela Pessoas.</small></div><div class="form-actions"><button type="button" class="button" data-close-people-modal>Cancelar</button><button type="button" data-people-submit class="button primary">Adicionar e-mails</button></div></form></div></div>`;
  const form = document.querySelector('#people-form-v2');
  document.querySelector('#people-emails-v2').focus();
  let isSaving = false;
  const savePeople = event => {
    if (isSaving) return;
    isSaving = true;
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(form));
    const people = getLocalPeople();
    const existing = new Set(people.map(person => person.email.toLowerCase()));
    const emails = String(payload.emails || '').split(/[\n,;]+/).map(email => email.trim().toLowerCase()).filter(Boolean);
    const valid = emails.filter(email => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email));
    const added = valid.filter(email => !existing.has(email));
    added.forEach(email => people.push({ id: `person-${Date.now()}-${Math.random().toString(16).slice(2)}`, email, groupId: payload.groupId || '', addedAt: new Date().toISOString() }));
    saveLocalPeople(people);
    document.querySelector('#modal-root').innerHTML = '';
    render('people');
    const rejected = emails.length - valid.length;
    const duplicated = valid.length - added.length;
    showToast(`${added.length} e-mail${added.length === 1 ? '' : 's'} adicionado${added.length === 1 ? '' : 's'}${rejected || duplicated ? `; ${rejected + duplicated} ignorado${rejected + duplicated === 1 ? '' : 's'}` : ''}.`);
  };
  form.addEventListener('submit', savePeople);
  document.querySelector('[data-people-submit]').addEventListener('click', savePeople);
  document.querySelectorAll('[data-close-people-modal]').forEach(element => element.addEventListener('click', event => { if (event.target === element) document.querySelector('#modal-root').innerHTML = ''; }));
}

function groupModalV2() {
  document.querySelector('#modal-root').innerHTML = `<div class="modal-backdrop" data-close-group-modal><div class="modal" role="dialog" aria-modal="true" aria-labelledby="group-modal-title"><div class="modal-head"><div><h2 id="group-modal-title">Novo grupo</h2><p>Organize pessoas para uma campanha controlada.</p></div><button class="modal-close" data-close-group-modal aria-label="Fechar">×</button></div><form class="modal-form" id="group-form-v2"><div class="form-field"><label for="group-name-v2">Nome do grupo</label><input id="group-name-v2" name="name" required placeholder="Ex.: Campanha piloto · agosto" /></div><div class="form-field"><label for="group-description-v2">Descrição</label><textarea id="group-description-v2" name="description" placeholder="Finalidade deste grupo"></textarea></div><div class="form-actions"><button type="button" class="button" data-close-group-modal>Cancelar</button><button type="button" data-group-submit class="button primary">Salvar grupo</button></div></form></div></div>`;
  const form = document.querySelector('#group-form-v2');
  document.querySelector('#group-name-v2').focus();
  let isSaving = false;
  const saveGroup = event => {
    if (isSaving) return;
    isSaving = true;
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(form));
    const name = String(payload.name || '').trim();
    const groups = getLocalGroups();
    if (!name) { isSaving = false; showToast('Informe um nome para o grupo.'); return; }
    if (groups.some(group => group.name.toLowerCase() === name.toLowerCase())) { isSaving = false; showToast('Já existe um grupo com esse nome.'); return; }
    groups.push({ id: `group-${Date.now()}`, name, description: String(payload.description || '').trim(), createdAt: new Date().toISOString() });
    saveLocalGroups(groups);
    document.querySelector('#modal-root').innerHTML = '';
    render('groups');
    showToast(`Grupo “${name}” criado.`);
  };
  form.addEventListener('submit', saveGroup);
  document.querySelector('[data-group-submit]').addEventListener('click', saveGroup);
  document.querySelectorAll('[data-close-group-modal]').forEach(element => element.addEventListener('click', event => { if (event.target === element) document.querySelector('#modal-root').innerHTML = ''; }));
}

function peopleViewV2() {
  const people = getLocalPeople();
  const groups = getLocalGroups();
  const rows = people.length ? people.map(person => `<tr><td><span class="sector-name"><i class="sector-bullet" style="background:#68bcb0"></i>${escapeHtml(person.email)}</span></td><td class="table-muted">${escapeHtml(person.name || person.email.split('@')[0])}</td><td><select class="inline-select" data-person-group="${escapeHtml(person.id)}"><option value="">Sem grupo</option>${groups.map(group => `<option value="${escapeHtml(group.id)}" ${person.groupId === group.id ? 'selected' : ''}>${escapeHtml(group.name)}</option>`).join('')}</select></td><td class="table-muted">${formatLayoutDate(person.addedAt)}</td><td><button type="button" class="text-link danger" data-person-delete="${escapeHtml(person.id)}">Excluir</button></td></tr>`).join('') : '<tr><td colspan="5" class="campaign-empty-state">Nenhuma pessoa adicionada. Clique em “Adicionar pessoas” para começar.</td></tr>';
  return `<div class="generic-view"><div class="page-header"><div class="page-title"><h1>Pessoas</h1><p>Adicione e-mails internos e organize os participantes por grupo.</p></div><div class="page-actions"><button class="button" data-action="new-group">Novo grupo</button><button class="button primary" data-action="new-person"><span class="plus">+</span>Adicionar pessoas</button></div></div><div class="metric-row"><div class="metric-box"><small>Pessoas cadastradas</small><strong>${people.length}</strong><span>neste navegador</span></div><div class="metric-box"><small>Grupos disponíveis</small><strong>${groups.length}</strong><span>organização local</span></div><div class="metric-box"><small>Com grupo</small><strong>${people.filter(person => person.groupId).length}</strong><span>associadas</span></div><div class="metric-box"><small>Sem grupo</small><strong>${people.filter(person => !person.groupId).length}</strong><span>pendentes</span></div></div><section class="panel generic-table-panel"><div class="table-toolbar"><strong>Lista de pessoas</strong><div class="generic-toolbar"><span class="status scheduled">Somente dados locais</span></div></div><div style="overflow-x:auto"><table class="data-table"><thead><tr><th>E-mail</th><th>Nome</th><th>Grupo</th><th>Adicionado em</th><th>Ação</th></tr></thead><tbody>${rows}</tbody></table></div></section></div>`;
}

function groupsViewV2() {
  const groups = getLocalGroups();
  const people = getLocalPeople();
  const rows = groups.length ? groups.map(group => { const memberCount = people.filter(person => person.groupId === group.id).length; return `<tr><td><span class="sector-name"><i class="sector-bullet" style="background:#94a9dc"></i>${escapeHtml(group.name)}</span></td><td class="table-muted">${escapeHtml(group.description || 'Grupo local para campanha controlada')}</td><td class="table-muted">${memberCount}</td><td class="table-muted">${formatLayoutDate(group.createdAt)}</td></tr>`; }).join('') : '<tr><td colspan="4" class="campaign-empty-state">Nenhum grupo criado. Clique em “Novo grupo” para organizar suas pessoas.</td></tr>';
  return `<div class="generic-view"><div class="page-header"><div class="page-title"><h1>Grupos</h1><p>Organize pessoas para campanhas educativas controladas.</p></div><div class="page-actions"><button class="button primary" data-action="new-group"><span class="plus">+</span>Novo grupo</button></div></div><div class="metric-row"><div class="metric-box"><small>Grupos criados</small><strong>${groups.length}</strong><span>neste navegador</span></div><div class="metric-box"><small>Pessoas vinculadas</small><strong>${people.filter(person => person.groupId).length}</strong><span>associadas</span></div><div class="metric-box"><small>Pessoas sem grupo</small><strong>${people.filter(person => !person.groupId).length}</strong><span>pendentes</span></div><div class="metric-box"><small>Limite local</small><strong>100</strong><span>grupos</span></div></div><section class="panel generic-table-panel"><div class="table-toolbar"><strong>Grupos salvos</strong><span class="status scheduled">Dados locais</span></div><div style="overflow-x:auto"><table class="data-table"><thead><tr><th>Grupo</th><th>Descrição</th><th>Pessoas</th><th>Criado em</th></tr></thead><tbody>${rows}</tbody></table></div></section></div>`;
}

function bindPeopleEventsV2() {
  document.querySelectorAll('[data-person-group]').forEach(select => select.addEventListener('change', () => {
    const people = getLocalPeople();
    const person = people.find(item => item.id === select.dataset.personGroup);
    if (!person) return;
    person.groupId = select.value;
    saveLocalPeople(people);
    showToast('Grupo da pessoa atualizado.');
  }));
  document.querySelectorAll('[data-person-delete]').forEach(button => button.addEventListener('click', () => {
    const people = getLocalPeople();
    const person = people.find(item => item.id === button.dataset.personDelete);
    if (!person || !window.confirm(`Excluir ${person.email}?`)) return;
    saveLocalPeople(people.filter(item => item.id !== person.id));
    render('people');
    showToast('Pessoa excluída.');
  }));
}

const fpapRenderWithPeople = render;
render = function(view = currentView) {
  if (view !== 'people' && view !== 'groups') { fpapRenderWithPeople(view); return; }
  currentView = view;
  breadcrumb.textContent = viewLabels[view];
  viewRoot.innerHTML = view === 'people' ? peopleViewV2() : groupsViewV2();
  document.querySelectorAll('.nav-item').forEach(button => button.classList.toggle('active', button.dataset.view === view));
  document.querySelectorAll('[data-action]').forEach(element => element.addEventListener('click', () => {
    if (element.dataset.action === 'new-person') peopleModalV2();
    else if (element.dataset.action === 'new-group') groupModalV2();
  }));
  if (view === 'people') bindPeopleEventsV2();
};
document.addEventListener('click', event => {
  const closeButton = event.target.closest('[data-close-campaign-modal], [data-close-people-modal], [data-close-group-modal], [data-close-group-people-modal], [data-close-send-campaign-modal]');
  const modalBackdrop = event.target.closest('.modal-backdrop');
  const clickedBackdrop = modalBackdrop && event.target === modalBackdrop;
  if (closeButton?.tagName === 'BUTTON' || clickedBackdrop) document.querySelector('#modal-root').innerHTML = '';
});

function campaignModalV3(editIndex = -1) {
  const drafts = getCampaignDrafts();
  const draft = editIndex >= 0 ? drafts[editIndex] : null;
  const savedLayouts = getSavedLayouts();
  const groups = getLocalGroups();
  const layoutOptions = savedLayouts.length
    ? savedLayouts.map((layout, index) => `<option value="${index}">${escapeHtml(layout.name || 'Layout sem nome')}</option>`).join('')
    : '<option value="">Nenhum layout salvo — use o modelo seguro padrão</option>';
  const groupOptions = `<option value="">Sem grupo selecionado</option>${groups.map(group => `<option value="${escapeHtml(group.id)}">${escapeHtml(group.name)}</option>`).join('')}`;
  const draftGroupPeople = new Set(getLocalPeople().filter(person => person.groupId === draft?.groupId).map(person => String(person.email || '').toLowerCase()));
  const savedRecipients = Array.isArray(draft?.directRecipients)
    ? draft.directRecipients.join('\n')
    : (Array.isArray(draft?.recipientEmails) ? draft.recipientEmails.filter(email => !draftGroupPeople.has(String(email).toLowerCase())).join('\n') : '');
  document.querySelector('#modal-root').innerHTML = `<div class="modal-backdrop" data-close-campaign-modal><div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="modal-head"><div><h2 id="modal-title">${editIndex >= 0 ? 'Editar campanha' : 'Nova campanha'}</h2><p>Prepare uma simulação educativa autorizada para revisão.</p></div><button class="modal-close" data-close-campaign-modal aria-label="Fechar">×</button></div><form class="modal-form" id="campaign-form-v3"><div class="form-grid"><div class="form-field full"><label for="campaign-name-v3">Nome da campanha</label><input id="campaign-name-v3" name="name" required maxlength="120" placeholder="Ex.: Atualização de benefícios" value="${escapeHtml(draft?.name || '')}" /></div><div class="form-field"><label for="campaign-audience-v3">Público</label><select id="campaign-audience-v3" name="audience"><option>Campanha piloto · 50 usuários</option><option>Financeiro · 86 usuários</option><option>Gestores · 214 usuários</option></select></div><div class="form-field"><label for="campaign-difficulty-v3">Dificuldade</label><select id="campaign-difficulty-v3" name="difficulty"><option>Nível 1 · Fácil</option><option>Nível 2 · Moderado</option><option>Nível 3 · Difícil</option></select></div><div class="form-field full"><label for="campaign-group-v3">Grupo de teste local</label><select id="campaign-group-v3" name="groupId">${groupOptions}</select><small class="form-help">Você pode usar um grupo salvo ou informar os endereços abaixo.</small></div><div class="form-field full"><label for="campaign-recipients-v3">E-mails corporativos da campanha</label><textarea id="campaign-recipients-v3" name="recipients" maxlength="4000" rows="4" placeholder="uma.pessoa@fieam.org.br\noutro.nome@fieam.org.br">${escapeHtml(savedRecipients)}</textarea><small class="form-help">Um e-mail por linha. Aceita somente endereços @fieam.org.br e fica salvo localmente no rascunho.</small></div><div class="form-field full"><label for="campaign-layout-v3">Layout educativo</label><select id="campaign-layout-v3" name="layoutIndex">${layoutOptions}</select><small class="form-help">O layout deve ser educativo, sem imitar login de terceiros e sem solicitar credenciais.</small></div><div class="form-field full"><label for="campaign-template-v3">Tema da simulação</label><select id="campaign-template-v3" name="template"><option>Documento compartilhado · colaboração</option><option>Atualização de benefícios · RH</option><option>Validação de acesso · suporte técnico</option></select></div><div class="form-field full"><label for="campaign-description-v3">Objetivo educativo</label><textarea id="campaign-description-v3" name="description" maxlength="1000" placeholder="O que esta campanha deve ajudar a reconhecer?">${escapeHtml(draft?.description || '')}</textarea></div></div><div class="form-actions"><button type="button" class="button" data-close-campaign-modal>Cancelar</button><button type="button" data-campaign-submit-v3 class="button primary">${editIndex >= 0 ? 'Atualizar rascunho' : 'Salvar como rascunho'}</button></div></form></div></div>`;
  const form = document.querySelector('#campaign-form-v3');
  const audience = document.querySelector('#campaign-audience-v3');
  const difficulty = document.querySelector('#campaign-difficulty-v3');
  const group = document.querySelector('#campaign-group-v3');
  const layout = document.querySelector('#campaign-layout-v3');
  const template = document.querySelector('#campaign-template-v3');
  if (draft) {
    audience.value = draft.audience || audience.value;
    difficulty.value = draft.difficulty || difficulty.value;
    group.value = draft.groupId || group.value;
    layout.value = draft.layoutIndex === undefined || draft.layoutIndex === null ? '' : String(draft.layoutIndex);
    template.value = draft.template || template.value;
  } else if (groups.length === 1) {
    group.value = groups[0].id;
  }
  document.querySelector('#campaign-name-v3').focus();
  let isSaving = false;
  const saveCampaign = event => {
    if (isSaving) return;
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(form));
    const directRecipients = normalizeCampaignEmails(payload.recipients);
    const invalidRecipients = directRecipients.filter(email => !isCorporateCampaignEmail(email));
    if (invalidRecipients.length) {
      showToast('Use somente e-mails corporativos terminados em @fieam.org.br.');
      return;
    }
    const preservedExclusions = payload.groupId && payload.groupId === draft?.groupId && Array.isArray(draft?.excludedRecipients) ? draft.excludedRecipients : [];
    const excludedSet = new Set(preservedExclusions.map(email => String(email).toLowerCase()));
    const groupRecipients = getLocalPeople().filter(person => person.groupId === payload.groupId && !excludedSet.has(String(person.email || '').toLowerCase())).map(person => person.email.toLowerCase());
    const recipientEmails = [...new Set([...directRecipients, ...groupRecipients])];
    if (!recipientEmails.length) {
      showToast('Informe ao menos um e-mail corporativo ou selecione um grupo.');
      return;
    }
    isSaving = true;
    const record = { id: draft?.id || `campaign-${Date.now()}`, name: String(payload.name || '').trim() || 'Campanha sem nome', audience: payload.audience, difficulty: payload.difficulty, groupId: payload.groupId || '', directRecipients, recipientEmails, excludedRecipients: [...excludedSet], recipientCount: recipientEmails.length, layoutIndex: payload.layoutIndex === '' ? null : Number(payload.layoutIndex), template: payload.template, description: String(payload.description || '').trim(), createdAt: draft?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString(), status: 'Rascunho' };
    const nextDrafts = getCampaignDrafts();
    if (editIndex >= 0 && nextDrafts[editIndex]) nextDrafts[editIndex] = {...nextDrafts[editIndex], ...record};
    else nextDrafts.push(record);
    saveCampaignDrafts(nextDrafts);
    document.querySelector('#modal-root').innerHTML = '';
    render('campaigns');
    showToast(`Campanha “${record.name}” ${editIndex >= 0 ? 'atualizada' : 'salva'} com ${record.recipientCount} destinatário${record.recipientCount === 1 ? '' : 's'} local${record.recipientCount === 1 ? '' : 'is'}.`);
  };
  form.addEventListener('submit', saveCampaign);
  document.querySelector('[data-campaign-submit-v3]').addEventListener('click', saveCampaign);
  document.querySelectorAll('[data-close-campaign-modal]').forEach(element => element.addEventListener('click', event => { if (event.target === element) document.querySelector('#modal-root').innerHTML = ''; }));
}

campaignModalV2 = campaignModalV3;
const fpapSettingsView = settingsView;
settingsView = function settingsViewV2() {
  return fpapSettingsView().replace('E-mail remetente', 'E-mail para disparo (remetente)').replace('Use uma caixa institucional autorizada.', 'É a caixa institucional que aparece como remetente autorizado.').replace("<div class='form-field'><label>SMTP relay / host</label>", "<div class='form-field'><label for='reply-to'>Caixa de respostas (Reply-To)</label><input id='reply-to' name='reply_to' type='email' placeholder='respostas@fieam.org.br'><small class='form-help'>As respostas do teste serão direcionadas para esta caixa.</small></div><div class='form-field'><label>SMTP relay / host</label>");
};

function trackingView() {
  return `<div class="generic-view"><div class="page-header"><div class="page-title"><h1>Rastreio da campanha</h1><p>Eventos mínimos da simulação educativa, sem capturar credenciais ou conteúdo privado.</p></div><div class="page-actions"><span class="status scheduled">Dados locais</span><button class="button" data-action="refresh-tracking">Atualizar</button></div></div><div class="metric-row"><div class="metric-box"><small>Mensagens registradas</small><strong id="tracking-sent">0</strong><span>envio controlado</span></div><div class="metric-box"><small>Cliques</small><strong id="tracking-clicks">0</strong><span>link educativo acessado</span></div><div class="metric-box"><small>Orientações concluídas</small><strong id="tracking-completed">0</strong><span>ação voluntária</span></div><div class="metric-box"><small>Respostas</small><strong>Reply-To</strong><span>visualize na caixa configurada</span></div></div><section class="panel generic-table-panel"><div class="table-toolbar"><strong>Atividade da simulação</strong><span class="status scheduled">10 por página · sem IP ou senha</span></div><div style="overflow-x:auto"><table class="data-table"><thead><tr><th>Destinatário</th><th>Evento</th><th>Campanha</th><th>Data</th></tr></thead><tbody id="tracking-events-body"><tr><td colspan="4" class="campaign-empty-state">Carregando eventos locais…</td></tr></tbody></table></div><div id="tracking-pagination" class="tracking-pagination" aria-live="polite"></div></section><section class="panel tracking-guidance"><div class="panel-heading"><div><h2>Limites do rastreio</h2><p>O painel registra somente o que a simulação consegue observar.</p></div></div><div class="layout-guidance-grid"><div><strong>Cliques</strong><small>O link passa pelo servidor local e registra o acesso antes de abrir a orientação.</small></div><div><strong>Respostas</strong><small>O cabeçalho Reply-To direciona respostas para a caixa configurada; a leitura automática ainda requer integração autorizada com o mailbox.</small></div><div><strong>Encaminhamentos</strong><small>Não há como identificar com certeza para quem uma mensagem foi encaminhada; um novo clique no link pode ser registrado.</small></div></div></section></div>`;
}

async function bindTrackingView() {
  const body = document.querySelector('#tracking-events-body');
  const pagination = document.querySelector('#tracking-pagination');
  const pageSize = 10;
  let currentPage = 1;
  let orderedEvents = [];
  const renderPagination = () => {
    if (!pagination) return;
    const total = orderedEvents.length;
    const pageCount = Math.ceil(total / pageSize);
    if (!total) {
      pagination.innerHTML = '';
      return;
    }
    const firstItem = ((currentPage - 1) * pageSize) + 1;
    const lastItem = Math.min(currentPage * pageSize, total);
    pagination.innerHTML = `<span class="tracking-pagination-summary">Exibindo ${firstItem}–${lastItem} de ${total} evento${total === 1 ? '' : 's'}</span><div class="tracking-pagination-actions"><button type="button" class="button" data-tracking-page="prev" ${currentPage === 1 ? 'disabled' : ''} aria-label="Ir para a página anterior">Anterior</button><span class="tracking-pagination-page">Página ${currentPage} de ${pageCount}</span><button type="button" class="button" data-tracking-page="next" ${currentPage === pageCount ? 'disabled' : ''} aria-label="Ir para a próxima página">Próxima</button></div>`;
    pagination.querySelectorAll('[data-tracking-page]').forEach(button => button.addEventListener('click', () => {
      if (button.disabled) return;
      currentPage += button.dataset.trackingPage === 'next' ? 1 : -1;
      renderEvents();
    }));
  };
  const renderEvents = () => {
    const labels = { sent: 'Enviado', click: 'Clique', orientation_complete: 'Orientação concluída' };
    const start = (currentPage - 1) * pageSize;
    const rows = orderedEvents.slice(start, start + pageSize).map(event => `<tr><td><span class="tracking-recipient">${escapeHtml(event.recipient || 'Não identificado')}</span></td><td><span class="status ${event.type === 'click' ? 'scheduled' : ''}">${escapeHtml(labels[event.type] || event.type)}</span></td><td class="table-muted">${escapeHtml(event.campaign_id || 'teste')}</td><td class="table-muted">${formatLayoutDate(event.timestamp)}</td></tr>`).join('');
    body.innerHTML = rows || '<tr><td colspan="4" class="campaign-empty-state">Nenhum evento registrado ainda.</td></tr>';
    document.querySelector('#tracking-sent').textContent = String(orderedEvents.filter(event => event.type === 'sent').length);
    document.querySelector('#tracking-clicks').textContent = String(orderedEvents.filter(event => event.type === 'click').length);
    document.querySelector('#tracking-completed').textContent = String(orderedEvents.filter(event => event.type === 'orientation_complete').length);
    renderPagination();
  };
  try {
    const response = await fetch('/api/events');
    if (!response.ok) throw new Error('events');
    orderedEvents = ((await response.json()).events || []).slice().reverse();
    renderEvents();
  } catch (error) {
    body.innerHTML = '<tr><td colspan="4" class="campaign-empty-state">Não foi possível carregar os eventos. Verifique se o servidor local está ativo.</td></tr>';
    if (pagination) pagination.innerHTML = '<span class="tracking-pagination-summary">Paginação indisponível enquanto os eventos não carregam.</span>';
  }
  document.querySelector('[data-action="refresh-tracking"]')?.addEventListener('click', () => bindTrackingView());
}

const fpapRenderWithTracking = render;
render = function renderWithTracking(view = currentView) {
  if (view !== 'audit') { fpapRenderWithTracking(view); return; }
  currentView = view;
  breadcrumb.textContent = viewLabels[view];
  viewRoot.innerHTML = trackingView();
  document.querySelectorAll('.nav-item').forEach(button => button.classList.toggle('active', button.dataset.view === view));
  bindTrackingView();
};

function campaignSendModal(campaignIndex) {
  const drafts = getCampaignDrafts();
  const campaign = drafts[campaignIndex];
  const simulationSubjectPrefix = '[SIMULAÇÃO FPAP]';
  const defaultSubject = `${simulationSubjectPrefix} ${campaign?.name || 'Simulação educativa'}`;
  const normalizeCampaignSubject = value => {
    const text = String(value || '').replace(/[\r\n]+/g, ' ').trim().slice(0, 180);
    if (!text) return defaultSubject;
    return text.toLocaleUpperCase('pt-BR').startsWith(simulationSubjectPrefix) ? text : `${simulationSubjectPrefix} ${text}`;
  };
  let recipients = normalizeCampaignEmails(campaign?.recipientEmails || []);
  const savedLayouts = getSavedLayouts();
  const selectedLayout = Number.isInteger(campaign?.layoutIndex) ? savedLayouts[campaign.layoutIndex] : null;
  const layoutTemplate = selectedLayout?.template || 'institutional';
  const layoutName = selectedLayout?.name || layoutTemplates[layoutTemplate]?.label || 'Portal educativo neutro';
  const layoutText = { kicker: selectedLayout?.kicker || layoutTemplates[layoutTemplate]?.kicker, title: selectedLayout?.title || layoutTemplates[layoutTemplate]?.title, copy: selectedLayout?.copy || layoutTemplates[layoutTemplate]?.copy, button: selectedLayout?.button || layoutTemplates[layoutTemplate]?.button };
  if (!campaign) { showToast('Campanha não encontrada.'); return; }
  if (!recipients.length) { showToast('Adicione destinatários à campanha antes do envio.'); return; }
  const groupRecipientSet = new Set(getLocalPeople().filter(person => person.groupId === campaign.groupId).map(person => String(person.email || '').toLowerCase()));
  document.querySelector('#modal-root').innerHTML = `<div class="modal-backdrop" data-close-send-campaign-modal><div class="modal" role="dialog" aria-modal="true" aria-labelledby="send-campaign-modal-title"><div class="modal-head"><div><h2 id="send-campaign-modal-title">Enviar campanha</h2><p>Disparo controlado para destinatários corporativos autorizados.</p></div><button class="modal-close" data-close-send-campaign-modal aria-label="Fechar">×</button></div><div class="modal-form"><div class="send-campaign-warning"><strong>Revise antes de confirmar</strong><span>Esta ação enviará a simulação educativa para <b id="send-campaign-count">${recipients.length} destinatário${recipients.length === 1 ? '' : 's'}</b>. O limite é de 50 endereços da allowlist.</span></div><div class="form-field"><label>Campanha</label><div class="form-readonly">${escapeHtml(campaign.name || 'Campanha sem nome')}</div></div><div class="form-field"><label>Layout que será enviado</label><div class="form-readonly">${escapeHtml(layoutName)}</div><small class="form-help">O e-mail usará o modelo salvo, com a logo FIEAM e o aviso visível de simulação.</small></div><div class="form-field"><label>Destinatários</label><div class="form-readonly"><div id="send-campaign-recipients" class="send-recipient-list"></div></div><small class="form-help">Remova aqui qualquer endereço que não deve participar deste disparo.</small></div><div class="form-field"><label for="send-campaign-subject">Assunto enviado</label><input id="send-campaign-subject" type="text" maxlength="180" value="${escapeHtml(campaign.subject || defaultSubject)}" required><small class="form-help">Você pode editar o assunto. A identificação ${simulationSubjectPrefix} será mantida para deixar claro que é uma simulação educativa.</small></div><div class="form-actions"><button type="button" class="button" data-close-send-campaign-modal>Cancelar</button><button type="button" class="button primary" data-send-campaign-confirm>Confirmar envio</button></div></div></div></div>`;
  const updateRecipientReview = () => {
    const list = document.querySelector('#send-campaign-recipients');
    const count = document.querySelector('#send-campaign-count');
    if (count) count.textContent = `${recipients.length} destinatário${recipients.length === 1 ? '' : 's'}`;
    if (list) list.innerHTML = recipients.length ? recipients.map(email => `<span class="send-recipient-row"><span>${escapeHtml(email)}</span><button type="button" class="text-link danger send-recipient-remove" data-remove-campaign-recipient="${escapeHtml(email)}">Remover</button></span>`).join('') : '<span class="form-help">Nenhum destinatário selecionado.</span>';
    document.querySelectorAll('[data-remove-campaign-recipient]').forEach(button => button.addEventListener('click', () => {
      recipients = recipients.filter(email => email !== button.dataset.removeCampaignRecipient);
      updateRecipientReview();
    }));
  };
  updateRecipientReview();
  let isSending = false;
  document.querySelector('[data-send-campaign-confirm]').addEventListener('click', async event => {
    if (isSending) return;
    if (!recipients.length) { showToast('Selecione ao menos um destinatário para enviar.'); return; }
    const subjectInput = document.querySelector('#send-campaign-subject');
    const subject = normalizeCampaignSubject(subjectInput?.value);
    if (subjectInput) subjectInput.value = subject;
    isSending = true;
    event.currentTarget.disabled = true;
    event.currentTarget.textContent = 'Enviando…';
    try {
      const response = await fetch('/api/send-campaign', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ campaign_id: campaign.id, campaign_name: campaign.name, layout_template: layoutTemplate, layout_text: layoutText, subject, recipients }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'falha no envio');
      const nextDrafts = getCampaignDrafts();
      if (nextDrafts[campaignIndex]) nextDrafts[campaignIndex] = {...nextDrafts[campaignIndex], subject, recipientEmails: recipients, directRecipients: recipients.filter(email => !groupRecipientSet.has(email)), excludedRecipients: [...groupRecipientSet].filter(email => !recipients.includes(email)), recipientCount: recipients.length, status: 'Enviada', sentAt: new Date().toISOString(), sentCount: result.sent || recipients.length};
      saveCampaignDrafts(nextDrafts);
      document.querySelector('#modal-root').innerHTML = '';
      render('campaigns');
      showToast(`Campanha enviada para ${result.sent || recipients.length} destinatário${(result.sent || recipients.length) === 1 ? '' : 's'}.`);
    } catch (error) {
      isSending = false;
      event.currentTarget.disabled = false;
      event.currentTarget.textContent = 'Confirmar envio';
      showToast('Envio não concluído: ' + error.message + '.');
    }
  });
}

const fpapCampaignTableMarkup = campaignTableMarkup;
campaignTableMarkup = function campaignTableMarkupWithSend() {
  const drafts = campaignDraftsForUi().slice().reverse();
  if (!drafts.length) return '<tr><td colspan="5" class="campaign-empty-state">Nenhuma campanha criada ainda. Clique em “Nova campanha” para salvar o primeiro rascunho.</td></tr>';
  return drafts.map(draft => `<tr><td><span class="sector-name"><i class="sector-bullet" style="background:#efbf5f"></i>${escapeHtml(draft.name || 'Campanha sem nome')}</span></td><td><span class="status ${draft.status === 'Enviada' ? 'finished' : 'scheduled'}">${escapeHtml(draft.status || 'Rascunho')}</span></td><td class="table-muted">${formatLayoutDate(draft.sentAt || draft.createdAt)}</td><td class="table-muted">${escapeHtml(draft.audience || 'Campanha piloto · 50 usuários')} · ${draft.recipientCount || draft.recipientEmails?.length || 0} destinatário(s)</td><td><button type="button" class="text-link" data-campaign-send="${draft.storageIndex}">Enviar</button><button type="button" class="text-link" data-campaign-edit="${draft.storageIndex}">Editar</button><button type="button" class="text-link danger" data-campaign-delete="${draft.storageIndex}">Excluir</button></td></tr>`).join('');
};

const fpapEnhanceCampaignView = enhanceCampaignView;
enhanceCampaignView = function enhanceCampaignViewWithSend() {
  fpapEnhanceCampaignView();
  document.querySelectorAll('[data-campaign-send]').forEach(button => button.addEventListener('click', () => campaignSendModal(Number(button.dataset.campaignSend))));
};

const fpapRenderWithSendCampaign = render;
render = function renderWithSendCampaign(view = currentView) {
  fpapRenderWithSendCampaign(view);
};

function layoutsViewV2() {
  const template = layoutTemplates.institutional;
  const storedLayouts = getSavedLayouts();
  const savedLayouts = storedLayouts.slice().reverse().map((layout, index) => ({...layout, storageIndex: storedLayouts.length - 1 - index}));
  const savedLayoutMarkup = savedLayouts.length ? savedLayouts.map(layout => `<div class="saved-layout-row"><div class="saved-layout-info"><span class="layout-type-mark">▧</span><div><strong>${escapeHtml(layout.name || 'Layout sem nome')}</strong><small>${escapeHtml(layout.templateLabel || layoutTemplates[layout.template]?.label || 'Modelo educativo')} · salvo em ${formatLayoutDate(layout.savedAt)}</small></div></div><span class="status scheduled">Rascunho</span><div class="saved-layout-actions"><button type="button" class="text-link" data-layout-edit="${layout.storageIndex}" aria-label="Editar ${escapeHtml(layout.name || 'layout')}">Editar</button><button type="button" class="text-link danger" data-layout-delete="${layout.storageIndex}" aria-label="Excluir ${escapeHtml(layout.name || 'layout')}">Excluir</button></div></div>`).join('') : `<div class="empty-note saved-layout-empty"><strong>Nenhum layout salvo ainda.</strong><span>Preencha os textos, escolha um modelo e clique em “Salvar layout educativo”.</span></div>`;
  return `<div class="generic-view layout-builder-view"><div class="page-header"><div class="page-title"><h1>Layouts</h1><p>Monte experiências educativas seguras para suas campanhas controladas.</p></div><div class="page-actions"><span class="status">Sem coleta de credenciais</span></div></div><div class="layout-builder-grid"><section class="panel layout-preview-panel"><div class="panel-heading"><div><h2>Prévia do layout</h2><p>Modelo institucional neutro · somente treinamento</p></div><span class="status scheduled">Simulação local</span></div><div class="layout-preview-shell"><div class="layout-browser-bar"><span class="layout-browser-dots">● ● ●</span><span>training.local/learning</span><b>AMBIENTE DE TESTE</b></div><div class="layout-preview-canvas"><img class="layout-preview-logo" src="assets/logo-fieam.png" alt="Sistema FIEAM"><div class="layout-education-banner">SIMULAÇÃO AUTORIZADA · NÃO SOLICITA CREDENCIAIS</div><div class="layout-preview-card"><small id="layout-preview-kicker">${escapeHtml(template.kicker)}</small><h3 id="layout-preview-title">${escapeHtml(template.title)}</h3><p id="layout-preview-copy">${escapeHtml(template.copy)}</p><button type="button" class="button primary" id="layout-preview-button" data-action="toast" data-message="A prévia é educativa e não solicita credenciais.">${escapeHtml(template.button)}</button></div><small class="layout-preview-footer">Programa de conscientização · ambiente de treinamento</small></div></div></section><aside class="panel layout-controls-panel"><div class="panel-heading"><div><h2 id="layout-editor-title">Criar layout educativo</h2><p>Edite os textos e confira a prévia antes de salvar.</p></div></div><form id="layout-form" class="settings-form"><div class="form-field"><label for="layout-name">Nome do layout</label><input id="layout-name" name="layout_name" value="Portal educativo — modelo 01" maxlength="120" required></div><div class="form-field"><label for="layout-template">Modelo educativo</label><select id="layout-template" name="layout_template">${Object.entries(layoutTemplates).map(([key, value]) => `<option value="${key}">${escapeHtml(value.label)}</option>`).join('')}</select></div><div class="form-field"><label for="layout-kicker">Chamada curta</label><input id="layout-kicker" name="layout_kicker" value="${escapeHtml(template.kicker)}" maxlength="90" placeholder="Ex.: Comunicado de segurança"><small class="form-help">Uma frase curta acima do título.</small></div><div class="form-field"><label for="layout-title">Título principal</label><input id="layout-title" name="layout_title" value="${escapeHtml(template.title)}" maxlength="180" required placeholder="Ex.: Revise o conteúdo antes de continuar"></div><div class="form-field"><label for="layout-copy">Texto principal</label><textarea id="layout-copy" name="layout_copy" maxlength="600" rows="4" required placeholder="Explique o objetivo educativo da comunicação.">${escapeHtml(template.copy)}</textarea><small class="form-help">O texto será usado na prévia e no e-mail, sem campos de senha ou código.</small></div><div class="form-field"><label for="layout-button">Texto do botão</label><input id="layout-button" name="layout_button" value="${escapeHtml(template.button)}" maxlength="80" required placeholder="Ex.: Abrir conteúdo educativo →"><small class="form-help">Use uma ação educativa e clara, sem solicitar senha ou código.</small></div><div class="layout-safety-note"><strong>Limites de segurança</strong><span>✓ sem campos de senha ou código</span><span>✓ sem cópia de login de terceiros</span><span>✓ aviso educativo visível</span></div><div class="form-actions layout-form-actions"><button type="button" class="button" data-layout-cancel-edit hidden>Cancelar edição</button><button type="submit" class="button primary full-button">Salvar layout educativo</button></div></form></aside></div><section class="panel saved-layouts-panel"><div class="panel-heading"><div><h2>Layouts salvos</h2><p>Rascunhos disponíveis para revisão e associação a uma campanha.</p></div><span class="status scheduled">${savedLayouts.length} rascunho${savedLayouts.length === 1 ? '' : 's'}</span></div><div class="saved-layout-list">${savedLayoutMarkup}</div></section><section class="panel layout-guidance-panel"><div class="panel-heading"><div><h2>Como usar</h2><p>Salve o layout, associe-o a uma campanha e revise o objetivo educativo antes do envio.</p></div><span class="status finished">Pronto para revisão</span></div><div class="layout-guidance-grid"><div><strong>1 · Edite os textos</strong><small>A prévia atualiza enquanto você escreve.</small></div><div><strong>2 · Revise a prévia</strong><small>O banner de simulação permanece visível para a pessoa.</small></div><div><strong>3 · Associe à campanha</strong><small>O e-mail usará o layout salvo e a logo FIEAM.</small></div></div></section></div>`;
}

function bindLayoutEventsV2() {
  const form = document.querySelector('#layout-form');
  const template = document.querySelector('#layout-template');
  const layoutName = document.querySelector('#layout-name');
  const kicker = document.querySelector('#layout-kicker');
  const title = document.querySelector('#layout-title');
  const copy = document.querySelector('#layout-copy');
  const buttonText = document.querySelector('#layout-button');
  const submitButton = form.querySelector('button[type="submit"]');
  const panelTitle = document.querySelector('#layout-editor-title');
  const cancelButton = form.querySelector('[data-layout-cancel-edit]');
  const updatePreview = () => {
    document.querySelector('#layout-preview-kicker').textContent = kicker.value.trim() || layoutTemplates[template.value]?.kicker || '';
    document.querySelector('#layout-preview-title').textContent = title.value.trim() || layoutTemplates[template.value]?.title || '';
    document.querySelector('#layout-preview-copy').textContent = copy.value.trim() || layoutTemplates[template.value]?.copy || '';
    document.querySelector('#layout-preview-button').textContent = buttonText.value.trim() || layoutTemplates[template.value]?.button || '';
  };
  const loadTemplateDefaults = () => {
    const selected = layoutTemplates[template.value] || layoutTemplates.institutional;
    kicker.value = selected.kicker;
    title.value = selected.title;
    copy.value = selected.copy;
    buttonText.value = selected.button;
    updatePreview();
  };
  const resetEditState = () => {
    delete form.dataset.editIndex;
    panelTitle.textContent = 'Criar layout educativo';
    submitButton.textContent = 'Salvar layout educativo';
    cancelButton.hidden = true;
    layoutName.value = 'Portal educativo — modelo 01';
    template.value = 'institutional';
    loadTemplateDefaults();
  };
  template.addEventListener('change', loadTemplateDefaults);
  [kicker, title, copy, buttonText].forEach(field => field.addEventListener('input', updatePreview));
  form.addEventListener('submit', event => {
    event.preventDefault();
    const name = layoutName.value.trim() || 'Layout sem nome';
    const saved = getSavedLayouts();
    const editIndex = form.dataset.editIndex === undefined ? -1 : Number(form.dataset.editIndex);
    const selected = layoutTemplates[template.value] || layoutTemplates.institutional;
    const record = { name, template: template.value, templateLabel: selected.label, kicker: kicker.value.trim() || selected.kicker, title: title.value.trim() || selected.title, copy: copy.value.trim() || selected.copy, button: buttonText.value.trim() || selected.button, savedAt: new Date().toISOString() };
    if (editIndex >= 0 && saved[editIndex]) saved[editIndex] = {...saved[editIndex], ...record}; else saved.push(record);
    localStorage.setItem('fpap_layouts', JSON.stringify(saved.slice(-20)));
    render('layouts');
    showToast(`Layout “${name}” ${editIndex >= 0 ? 'atualizado' : 'salvo'} para revisão.`);
  });
  cancelButton.addEventListener('click', () => { resetEditState(); layoutName.focus(); showToast('Edição cancelada.'); });
  document.querySelectorAll('[data-layout-edit]').forEach(button => button.addEventListener('click', () => {
    const index = Number(button.dataset.layoutEdit);
    const saved = getSavedLayouts()[index];
    if (!saved) { showToast('Este layout não está mais disponível.'); return; }
    const selected = layoutTemplates[saved.template] || layoutTemplates.institutional;
    layoutName.value = saved.name || '';
    template.value = saved.template || 'institutional';
    kicker.value = saved.kicker || selected.kicker;
    title.value = saved.title || selected.title;
    copy.value = saved.copy || selected.copy;
    buttonText.value = saved.button || selected.button;
    form.dataset.editIndex = String(index);
    panelTitle.textContent = 'Editar layout salvo';
    submitButton.textContent = 'Atualizar layout educativo';
    cancelButton.hidden = false;
    updatePreview();
    form.scrollIntoView({behavior:'smooth', block:'center'});
    layoutName.focus({preventScroll:true});
    showToast(`Layout “${saved.name || 'sem nome'}” carregado para edição.`);
  }));
  document.querySelectorAll('[data-layout-delete]').forEach(button => button.addEventListener('click', () => {
    const index = Number(button.dataset.layoutDelete);
    const saved = getSavedLayouts();
    const target = saved[index];
    if (!target) return;
    if (!window.confirm(`Excluir o layout “${target.name || 'Layout sem nome'}”?`)) return;
    saved.splice(index, 1);
    localStorage.setItem('fpap_layouts', JSON.stringify(saved));
    render('layouts');
    showToast('Layout excluído.');
  }));
  updatePreview();
}

layoutsView = layoutsViewV2;
bindLayoutEvents = bindLayoutEventsV2;

const fpapLayoutsViewWithoutFooter = layoutsView;
layoutsView = function layoutsViewWithoutTrainingFooter() {
  return fpapLayoutsViewWithoutFooter().replace(/<small class="layout-preview-footer">[^<]*<\/small>/g, '');
};


function groupsViewV3() {
  const groups = getLocalGroups();
  const people = getLocalPeople();
  const rows = groups.length ? groups.map(group => {
    const memberCount = people.filter(person => person.groupId === group.id).length;
    return `<tr><td><span class="sector-name"><i class="sector-bullet" style="background:#94a9dc"></i>${escapeHtml(group.name)}</span></td><td class="table-muted">${escapeHtml(group.description || 'Grupo local para campanha controlada')}</td><td class="table-muted">${memberCount}</td><td class="table-muted">${formatLayoutDate(group.createdAt)}</td><td><span class="group-actions"><button type="button" class="text-link" data-group-people="${escapeHtml(group.id)}">Adicionar pessoas</button><button type="button" class="text-link" data-group-edit="${escapeHtml(group.id)}" aria-label="Editar ${escapeHtml(group.name)}">Editar</button><button type="button" class="text-link danger" data-group-delete="${escapeHtml(group.id)}" aria-label="Excluir ${escapeHtml(group.name)}">Excluir</button></span></td></tr>`;
  }).join('') : '<tr><td colspan="5" class="campaign-empty-state">Nenhum grupo criado. Clique em “Novo grupo” para organizar suas pessoas.</td></tr>';
  return `<div class="generic-view"><div class="page-header"><div class="page-title"><h1>Grupos</h1><p>Organize pessoas para campanhas educativas controladas.</p></div><div class="page-actions"><button class="button primary" data-action="new-group"><span class="plus">+</span>Novo grupo</button></div></div><div class="metric-row"><div class="metric-box"><small>Grupos criados</small><strong>${groups.length}</strong><span>neste navegador</span></div><div class="metric-box"><small>Pessoas vinculadas</small><strong>${people.filter(person => person.groupId).length}</strong><span>associadas</span></div><div class="metric-box"><small>Pessoas sem grupo</small><strong>${people.filter(person => !person.groupId).length}</strong><span>pendentes</span></div><div class="metric-box"><small>Limite local</small><strong>100</strong><span>grupos</span></div></div><section class="panel generic-table-panel"><div class="table-toolbar"><strong>Grupos salvos</strong><span class="status scheduled">Dados locais</span></div><div style="overflow-x:auto"><table class="data-table"><thead><tr><th>Grupo</th><th>Descrição</th><th>Pessoas</th><th>Criado em</th><th>Ação</th></tr></thead><tbody>${rows}</tbody></table></div></section></div>`;
}

function groupPeopleModalV2(groupId) {
  const group = getLocalGroups().find(item => item.id === groupId);
  if (!group) { showToast('Grupo não encontrado.'); return; }
  const people = getLocalPeople();
  const availablePeople = people.filter(person => person.groupId !== group.id);
  const currentMembers = people.filter(person => person.groupId === group.id);
  const options = availablePeople.length
    ? availablePeople.map(person => `<label class="group-person-option"><input type="checkbox" name="personIds" value="${escapeHtml(person.id)}"><span><strong>${escapeHtml(person.email)}</strong><small>${escapeHtml(person.name || 'Pessoa cadastrada')}</small></span></label>`).join('')
    : '<div class="empty-note group-people-empty"><strong>Nenhuma pessoa disponível</strong><span>Cadastre uma pessoa ou todas já estão neste grupo.</span></div>';
  document.querySelector('#modal-root').innerHTML = `<div class="modal-backdrop" data-close-group-people-modal><div class="modal" role="dialog" aria-modal="true" aria-labelledby="group-people-modal-title"><div class="modal-head"><div><h2 id="group-people-modal-title">Adicionar pessoas</h2><p>Inclua participantes no grupo “${escapeHtml(group.name)}”.</p></div><button class="modal-close" data-close-group-people-modal aria-label="Fechar">×</button></div><form class="modal-form" id="group-people-form-v2"><div class="form-field"><label>Pessoas disponíveis</label><div class="group-person-list">${options}</div><small class="form-help">Selecione pessoas já cadastradas. Para remover alguém, use a coluna Grupo na tela Pessoas.</small></div><div class="group-people-summary">${currentMembers.length ? `${currentMembers.length} pessoa${currentMembers.length === 1 ? '' : 's'} já vinculada${currentMembers.length === 1 ? '' : 's'} a este grupo.` : 'Este grupo ainda não possui pessoas.'}</div><div class="form-actions"><button type="button" class="button" data-close-group-people-modal>Cancelar</button>${availablePeople.length ? '<button type="button" data-group-people-submit class="button primary">Adicionar selecionadas</button>' : '<button type="button" data-group-new-person class="button primary">Cadastrar pessoa</button>'}</div></form></div></div>`;
  const form = document.querySelector('#group-people-form-v2');
  let isSaving = false;
  const saveMembers = event => {
    if (isSaving) return;
    event.preventDefault();
    const selectedIds = [...form.querySelectorAll('input[name="personIds"]:checked')].map(input => input.value);
    if (!selectedIds.length) { showToast('Selecione ao menos uma pessoa.'); return; }
    isSaving = true;
    const selected = new Set(selectedIds);
    const updatedPeople = getLocalPeople().map(person => selected.has(person.id) ? {...person, groupId: group.id} : person);
    saveLocalPeople(updatedPeople);
    document.querySelector('#modal-root').innerHTML = '';
    render('groups');
    showToast(`${selectedIds.length} pessoa${selectedIds.length === 1 ? '' : 's'} adicionada${selectedIds.length === 1 ? '' : 's'} ao grupo.`);
  };
  form.addEventListener('submit', saveMembers);
  document.querySelector('[data-group-people-submit]')?.addEventListener('click', saveMembers);
  document.querySelector('[data-group-new-person]')?.addEventListener('click', () => { document.querySelector('#modal-root').innerHTML = ''; peopleModalV2(); });
}

groupsViewV2 = groupsViewV3;
const fpapRenderWithGroupPeople = render;
render = function renderWithGroupPeople(view = currentView) {
  fpapRenderWithGroupPeople(view);
  if (view !== 'groups') return;
  document.querySelectorAll('[data-group-people]').forEach(button => button.addEventListener('click', () => groupPeopleModalV2(button.dataset.groupPeople)));
};

function dashboardSectorRows(events, campaignId) {
  const campaignEvents = events.filter(event => event.campaign_id === campaignId);
  const sentEvents = campaignEvents.filter(event => event.type === 'sent');
  const sentByCorrelation = new Map(sentEvents.map(event => [event.correlation_id, event]));
  const groups = new Map(getLocalGroups().map(group => [group.id, group.name]));
  const peopleByEmail = new Map(getLocalPeople().filter(person => groups.has(person.groupId)).map(person => [String(person.email || '').toLowerCase(), groups.get(person.groupId)]));
  const rows = new Map();
  const colors = ['#68bcb0', '#efbf5b', '#94a9dc', '#bfdd70', '#d88d73'];
  const ensureRow = sector => {
    if (!rows.has(sector)) rows.set(sector, { sector, delivered: 0, clicks: new Set(), interactions: new Set(), color: colors[rows.size % colors.length] });
    return rows.get(sector);
  };
  sentEvents.forEach(event => {
    const recipient = String(event.recipient || '').toLowerCase();
    const sector = peopleByEmail.get(recipient);
    if (sector) ensureRow(sector).delivered += 1;
  });
  campaignEvents.filter(event => event.type === 'click' || event.type === 'orientation_complete').forEach(event => {
    const sent = sentByCorrelation.get(event.correlation_id);
    const recipient = String(sent?.recipient || '').toLowerCase();
    const sector = peopleByEmail.get(recipient);
    if (!sector) return;
    const row = ensureRow(sector);
    if (event.type === 'click') row.clicks.add(event.correlation_id);
    if (event.type === 'orientation_complete') row.interactions.add(event.correlation_id);
  });
  return [...rows.values()].map(row => {
    const rate = row.delivered ? (row.clicks.size / row.delivered) * 100 : 0;
    return {...row, clicks: row.clicks.size, interactions: row.interactions.size, rate, tone: rate >= 10 ? 'warn' : 'good'};
  }).sort((a, b) => b.delivered - a.delivered || a.sector.localeCompare(b.sector, 'pt-BR'));
}

function bindDashboardInsights() {
  if (dashboardRefreshCleanup) dashboardRefreshCleanup();
  const filter = document.querySelector('#dashboard-campaign-filter');
  const body = document.querySelector('#sector-insight-body');
  const meta = document.querySelector('#sector-insight-meta');
  if (!filter || !body) return;
  let selectedCampaignId = filter.value;
  const setText = (selector, value) => { const element = document.querySelector(selector); if (element) element.textContent = String(value); };
  const renderRows = (events, campaignId) => {
    const localDrafts = getCampaignDrafts().filter(draft => draft && draft.id);
    const names = new Map(localDrafts.map(draft => [draft.id, draft.name || 'Campanha sem nome']));
    const rows = dashboardSectorRows(events, campaignId);
    const selectedName = names.get(campaignId) || `Campanha ${campaignId || 'não selecionada'}`;
    const campaignEvents = events.filter(event => event.campaign_id === campaignId);
    const sent = campaignEvents.filter(event => event.type === 'sent').length;
    const clicks = new Set(campaignEvents.filter(event => event.type === 'click').map(event => event.correlation_id)).size;
    const interactions = new Set(campaignEvents.filter(event => event.type === 'orientation_complete').map(event => event.correlation_id)).size;
    const latestDraft = localDrafts[localDrafts.length - 1];
    const latestEvents = latestDraft ? events.filter(event => event.campaign_id === latestDraft.id) : [];
    const latestRecipients = Array.isArray(latestDraft?.recipientEmails) ? latestDraft.recipientEmails.length : 0;
    const latestSent = latestEvents.filter(event => event.type === 'sent').length;
    const latestInteractions = new Set(latestEvents.filter(event => event.type === 'orientation_complete').map(event => event.correlation_id)).size;
    if (meta) meta.textContent = `${selectedName} · ${sent} enviados · ${clicks} cliques · ${interactions} interações`;
    setText('#dashboard-latest-sent', latestSent);
    setText('#dashboard-latest-interactions', latestInteractions);
    setText('#dashboard-latest-recipients', latestRecipients);
    setText('#dashboard-latest-status', latestSent ? 'registrado' : 'aguardando');
    setText('#dashboard-latest-detail', latestSent ? `${latestSent} envio${latestSent === 1 ? '' : 's'} contabilizado${latestSent === 1 ? '' : 's'}` : 'Nenhum envio contabilizado');
    body.innerHTML = rows.length ? rows.map(row => `<tr><td><span class="sector-name"><i class="sector-bullet" style="background:${row.color}"></i>${escapeHtml(row.sector)}</span></td><td class="table-muted">${row.delivered}</td><td class="table-muted">${row.clicks}</td><td class="table-muted">${row.interactions}</td><td class="table-rate rate-${row.tone}">${row.rate.toFixed(1).replace('.', ',')}%<span class="mini-bar"><i style="width:${Math.min(row.rate * 5, 100)}%"></i></span></td></tr>`).join('') : `<tr><td colspan="5" class="campaign-empty-state">Nenhum destinatário desta campanha está associado a um grupo. Cadastre as pessoas em Grupos para visualizar a leitura por setor.</td></tr>`;
  };
  const load = async () => {
    try {
      const response = await fetch('/api/events');
      if (response.status === 401) { window.location.assign('/login.html'); return; }
      if (!response.ok) throw new Error('events');
      const allEvents = (await response.json()).events || [];
      const localDrafts = getCampaignDrafts().filter(draft => draft && draft.id);
      const knownCampaignIds = new Set(localDrafts.map(draft => draft.id));
      const names = new Map(localDrafts.map(draft => [draft.id, draft.name || 'Campanha sem nome']));
      const events = allEvents.filter(event => knownCampaignIds.has(event.campaign_id));
      const optionIds = localDrafts.map(draft => draft.id);
      const optionMarkup = optionIds.length ? optionIds.map(id => `<option value="${escapeHtml(id)}">${escapeHtml(names.get(id))}</option>`).join('') : '<option value="">Nenhuma campanha local salva</option>';
      if (filter.innerHTML !== optionMarkup) filter.innerHTML = optionMarkup;
      const preferred = optionIds.includes(selectedCampaignId) ? selectedCampaignId : [...optionIds].reverse().find(id => events.some(event => event.campaign_id === id)) || optionIds[optionIds.length - 1] || '';
      selectedCampaignId = preferred;
      filter.value = selectedCampaignId;
      setText('#dashboard-campaign-total', localDrafts.length);
      setText('#dashboard-sent-total', events.filter(event => event.type === 'sent').length);
      setText('#dashboard-interactions-total', new Set(events.filter(event => event.type === 'orientation_complete').map(event => event.correlation_id)).size);
      setText('#dashboard-last-updated', `Atualizado às ${new Intl.DateTimeFormat('pt-BR', {timeStyle: 'medium'}).format(new Date())} · próxima atualização em até 5 s`);
      renderRows(events, selectedCampaignId);
      filter.onchange = () => { selectedCampaignId = filter.value; renderRows(events, selectedCampaignId); };
      const latestDraft = localDrafts[localDrafts.length - 1];
      const latestKey = latestDraft ? `${latestDraft.id}|${latestDraft.name}|${latestDraft.recipientEmails?.length || 0}` : 'empty';
      if (dashboardLatestKey && dashboardLatestKey !== latestKey) { dashboardLatestKey = latestKey; render('dashboard'); return; }
      dashboardLatestKey = latestKey;
    } catch (error) {
      body.innerHTML = '<tr><td colspan="5" class="campaign-empty-state">Não foi possível carregar os eventos locais. Verifique se o servidor está ativo.</td></tr>';
      if (meta) meta.textContent = 'Eventos indisponíveis';
    }
  };
  const refreshTimer = window.setInterval(load, 5000);
  const onStorage = event => {
    if (['fpap_campaign_drafts', 'fpap_people', 'fpap_groups'].includes(event.key)) load();
  };
  window.addEventListener('storage', onStorage);
  dashboardRefreshCleanup = () => {
    window.clearInterval(refreshTimer);
    window.removeEventListener('storage', onStorage);
    dashboardRefreshCleanup = null;
  };
  load();
}

const fpapRenderWithDashboardInsights = render;
render = function renderWithDashboardInsights(view = currentView) {
  fpapRenderWithDashboardInsights(view);
  if (view === 'dashboard') bindDashboardInsights();
};

function bindCampaignOverview() {
  const boxes = [...document.querySelectorAll('.metric-row .metric-box')];
  if (boxes.length < 4) return;
  const drafts = getCampaignDrafts();
  const campaignIds = new Set(drafts.map(draft => draft.id).filter(Boolean));
  const setMetric = (index, label, value, note) => {
    const box = boxes[index];
    if (!box) return;
    box.querySelector('small').textContent = label;
    box.querySelector('strong').textContent = String(value);
    box.querySelector('span').textContent = note;
  };
  setMetric(0, 'Campanhas criadas', drafts.length, 'neste navegador');
  const localRecipients = new Set(drafts.flatMap(draft => Array.isArray(draft.recipientEmails) ? draft.recipientEmails : []));
  setMetric(1, 'Destinatários', localRecipients.size, 'lista local');
  setMetric(2, 'Cliques', 0, 'eventos registrados');
  setMetric(3, 'Interações', 0, 'orientações concluídas');
  fetch('/api/events').then(response => response.ok ? response.json() : Promise.reject(new Error('events'))).then(payload => {
    const events = (payload.events || []).filter(event => campaignIds.has(event.campaign_id));
    const clicks = new Set(events.filter(event => event.type === 'click').map(event => event.correlation_id));
    const interactions = new Set(events.filter(event => event.type === 'orientation_complete').map(event => event.correlation_id));
    setMetric(2, 'Cliques', clicks.size, 'eventos registrados');
    setMetric(3, 'Interações', interactions.size, 'orientações concluídas');
  }).catch(() => {});
}

const fpapRenderWithCampaignOverview = render;
render = function renderWithCampaignOverview(view = currentView) {
  fpapRenderWithCampaignOverview(view);
  updateCampaignCountChrome();
  if (view === 'campaigns') bindCampaignOverview();
};

render('dashboard');

function groupModalV3(groupId = '') {
  const groups = getLocalGroups();
  const group = groupId ? groups.find(item => item.id === groupId) : null;
  if (groupId && !group) { showToast('Grupo não encontrado.'); return; }
  const editing = Boolean(group);
  document.querySelector('#modal-root').innerHTML = `<div class="modal-backdrop" data-close-group-modal><div class="modal" role="dialog" aria-modal="true" aria-labelledby="group-modal-title"><div class="modal-head"><div><h2 id="group-modal-title">${editing ? 'Editar grupo' : 'Novo grupo'}</h2><p>${editing ? 'Atualize o nome e a finalidade do grupo.' : 'Organize pessoas para uma campanha controlada.'}</p></div><button class="modal-close" data-close-group-modal aria-label="Fechar">×</button></div><form class="modal-form" id="group-form-v3"><div class="form-field"><label for="group-name-v3">Nome do grupo</label><input id="group-name-v3" name="name" required maxlength="120" placeholder="Ex.: Campanha piloto · agosto" value="${escapeHtml(group?.name || '')}" /></div><div class="form-field"><label for="group-description-v3">Descrição</label><textarea id="group-description-v3" name="description" maxlength="500" placeholder="Finalidade deste grupo">${escapeHtml(group?.description || '')}</textarea></div><div class="form-actions"><button type="button" class="button" data-close-group-modal>Cancelar</button><button type="submit" data-group-submit class="button primary">${editing ? 'Salvar alterações' : 'Salvar grupo'}</button></div></form></div></div>`;
  const form = document.querySelector('#group-form-v3');
  const nameInput = document.querySelector('#group-name-v3');
  nameInput.focus();
  let isSaving = false;
  const saveGroup = event => {
    event.preventDefault();
    if (isSaving) return;
    const payload = Object.fromEntries(new FormData(form));
    const name = String(payload.name || '').trim();
    if (!name) { showToast('Informe um nome para o grupo.'); nameInput.focus(); return; }
    isSaving = true;
    const nextGroups = getLocalGroups();
    if (editing) {
      const index = nextGroups.findIndex(item => item.id === group.id);
      if (index < 0) { showToast('Este grupo não está mais disponível.'); return; }
      nextGroups[index] = {...nextGroups[index], name, description: String(payload.description || '').trim(), updatedAt: new Date().toISOString()};
    } else {
      nextGroups.push({id: `group-${Date.now()}`, name, description: String(payload.description || '').trim(), createdAt: new Date().toISOString()});
    }
    saveLocalGroups(nextGroups);
    document.querySelector('#modal-root').innerHTML = '';
    render('groups');
    showToast(`Grupo “${name}” ${editing ? 'atualizado' : 'criado'}.`);
  };
  form.addEventListener('submit', saveGroup);
}

groupModalV2 = groupModalV3;

const fpapRenderWithGroupActions = render;
render = function renderWithGroupActions(view = currentView) {
  fpapRenderWithGroupActions(view);
  if (view !== 'groups') return;
  document.querySelectorAll('[data-group-edit]').forEach(button => button.addEventListener('click', () => groupModalV2(button.dataset.groupEdit)));
  document.querySelectorAll('[data-group-delete]').forEach(button => button.addEventListener('click', () => {
    const groupId = button.dataset.groupDelete;
    const groups = getLocalGroups();
    const target = groups.find(item => item.id === groupId);
    if (!target || !window.confirm(`Excluir o grupo “${target.name}”? As pessoas vinculadas ficarão sem grupo.`)) return;
    saveLocalGroups(groups.filter(item => item.id !== groupId));
    saveLocalPeople(getLocalPeople().map(person => person.groupId === groupId ? {...person, groupId: ''} : person));
    render('groups');
    showToast(`Grupo “${target.name}” excluído.`);
  }));
};
