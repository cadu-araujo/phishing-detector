from pathlib import Path
from datetime import date
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, Image, HRFlowable
)
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics


ROOT = Path(r"C:\Programas IA\Phishing")
OUTPUT = ROOT / "output" / "pdf" / "sistema-fieam-finalidade-e-funcoes.pdf"
LOGO = ROOT / "assets" / "logo-fieam.png"
OUTPUT.parent.mkdir(parents=True, exist_ok=True)

NAVY = colors.HexColor("#11201E")
INK = colors.HexColor("#172322")
MUTED = colors.HexColor("#52615D")
TEAL = colors.HexColor("#2C9A8B")
MINT = colors.HexColor("#E8F5EE")
LIME = colors.HexColor("#C9EE64")
PAPER = colors.HexColor("#F3F5F0")
LINE = colors.HexColor("#DCE8E2")
GREEN = colors.HexColor("#23633B")
AMBER = colors.HexColor("#8A6827")

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="CoverTitle", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=28, leading=33, textColor=colors.white, alignment=TA_LEFT, spaceAfter=12))
styles.add(ParagraphStyle(name="CoverSub", parent=styles["Normal"], fontName="Helvetica", fontSize=12, leading=18, textColor=colors.HexColor("#C5D4D0"), spaceAfter=7))
styles.add(ParagraphStyle(name="H1F", parent=styles["Heading1"], fontName="Helvetica-Bold", fontSize=19, leading=23, textColor=NAVY, spaceBefore=4, spaceAfter=10))
styles.add(ParagraphStyle(name="H2F", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=13, leading=17, textColor=INK, spaceBefore=12, spaceAfter=6))
styles.add(ParagraphStyle(name="BodyF", parent=styles["BodyText"], fontName="Helvetica", fontSize=9.5, leading=14, textColor=MUTED, spaceAfter=6))
styles.add(ParagraphStyle(name="SmallF", parent=styles["BodyText"], fontName="Helvetica", fontSize=8, leading=11, textColor=MUTED, spaceAfter=4))
styles.add(ParagraphStyle(name="TableF", parent=styles["BodyText"], fontName="Helvetica", fontSize=7.6, leading=10, textColor=INK))
styles.add(ParagraphStyle(name="TableHeadF", parent=styles["BodyText"], fontName="Helvetica-Bold", fontSize=7.7, leading=10, textColor=colors.white))
styles.add(ParagraphStyle(name="CalloutF", parent=styles["BodyText"], fontName="Helvetica", fontSize=9.2, leading=14, textColor=GREEN, leftIndent=2))
styles.add(ParagraphStyle(name="FlowF", parent=styles["BodyText"], fontName="Helvetica-Bold", fontSize=8.5, leading=11, textColor=INK, alignment=TA_CENTER))
styles.add(ParagraphStyle(name="CaptionF", parent=styles["BodyText"], fontName="Helvetica-Oblique", fontSize=7.8, leading=10, textColor=MUTED, alignment=TA_CENTER, spaceBefore=3))


def P(text, style="BodyF"):
    return Paragraph(text, styles[style])


def bullets(items):
    return [P(f"- {item}", "BodyF") for item in items]


def table(data, widths, header=True, small=False):
    converted = []
    for row_index, row in enumerate(data):
        converted.append([P(str(value), "TableHeadF" if header and row_index == 0 else "TableF") for value in row])
    t = Table(converted, colWidths=widths, repeatRows=1 if header else 0, hAlign="LEFT")
    commands = [
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), 0.35, LINE),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]
    if header:
        commands += [("BACKGROUND", (0, 0), (-1, 0), NAVY), ("TEXTCOLOR", (0, 0), (-1, 0), colors.white)]
        start = 1
    else:
        start = 0
    for row_index in range(start, len(data)):
        commands.append(("BACKGROUND", (0, row_index), (-1, row_index), colors.white if row_index % 2 else colors.HexColor("#F8FAF7")))
    t.setStyle(TableStyle(commands))
    return t


def callout(title, text, background=MINT, color=GREEN):
    content = Table([[P(f"<b>{title}</b><br/>{text}", "CalloutF")]], colWidths=[174 * mm])
    content.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), background),
        ("BOX", (0, 0), (-1, -1), 0.6, LINE),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 9),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
    ]))
    return content


def flow(items):
    # Three stages per row keep the diagram inside the A4 text frame.
    rows = []
    for start in range(0, len(items), 3):
        chunk = items[start:start + 3]
        row = []
        for index in range(3):
            row.append(P(chunk[index], "FlowF") if index < len(chunk) else "")
            if index < 2:
                row.append(P("→", "FlowF") if index + 1 < len(chunk) else "")
        rows.append(row)
    widths = [50 * mm, 5 * mm, 50 * mm, 5 * mm, 50 * mm]
    t = Table(rows, colWidths=widths, hAlign="LEFT")
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8FAF7")),
        ("BOX", (0, 0), (-1, -1), 0.5, LINE),
        ("INNERGRID", (0, 0), (-1, -1), 0.35, LINE),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
    ]))
    return t


def header_footer(canvas, doc):
    canvas.saveState()
    width, height = A4
    canvas.setFillColor(PAPER)
    canvas.rect(0, 0, width, height, fill=1, stroke=0)
    canvas.setFillColor(NAVY)
    canvas.rect(0, height - 12 * mm, width, 12 * mm, fill=1, stroke=0)
    canvas.setFillColor(colors.HexColor("#A8E6DC"))
    canvas.setFont("Helvetica-Bold", 7.5)
    canvas.drawString(18 * mm, height - 7.5 * mm, "SISTEMA FIEAM  /  FINALIDADE E FUNÇÕES")
    canvas.setFillColor(colors.HexColor("#7F8E89"))
    canvas.setFont("Helvetica", 7.5)
    canvas.drawString(18 * mm, 9 * mm, "Documento institucional - uso interno autorizado")
    canvas.drawRightString(width - 18 * mm, 9 * mm, f"Página {doc.page}")
    canvas.restoreState()


frame = Frame(18 * mm, 17 * mm, 174 * mm, 254 * mm, leftPadding=0, rightPadding=0, topPadding=5 * mm, bottomPadding=7 * mm, id="normal")
doc = BaseDocTemplate(str(OUTPUT), pagesize=A4, rightMargin=18 * mm, leftMargin=18 * mm, topMargin=18 * mm, bottomMargin=17 * mm, title="Sistema FIEAM - Finalidade e Funções", author="Sistema FIEAM")
doc.addPageTemplates([PageTemplate(id="main", frames=[frame], onPage=header_footer)])

story = []

# Cover
story.append(Spacer(1, 27 * mm))
cover = Table([[Image(str(LOGO), width=48 * mm, height=28 * mm), P("SISTEMA FIEAM", "CoverTitle")]], colWidths=[55 * mm, 119 * mm], rowHeights=[35 * mm])
cover.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, -1), NAVY),
    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ("LEFTPADDING", (0, 0), (-1, -1), 16),
    ("RIGHTPADDING", (0, 0), (-1, -1), 16),
    ("TOPPADDING", (0, 0), (-1, -1), 12),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
]))
story.append(cover)
story.append(Spacer(1, 18 * mm))
story.append(P("Finalidade e funções do aplicativo", "H1F"))
story.append(P("Documento de referência funcional para o Sistema FIEAM, uma plataforma interna de conscientização em segurança da informação, campanhas educativas controladas e acompanhamento de treinamentos.", "BodyF"))
story.append(Spacer(1, 7 * mm))
story.append(callout("Finalidade principal", "Apoiar a equipe autorizada de Segurança da Informação na criação de campanhas educativas, envio controlado para destinatários corporativos, treinamento de usuários e leitura dos resultados comportamentais sem coletar senhas, códigos MFA ou credenciais."))
story.append(Spacer(1, 11 * mm))
story.append(P(f"Versão documental: 01/10/2026<br/>Ambiente: aplicação local com acesso autorizado na rede interna<br/>Escopo: funções disponíveis no sistema e seus limites operacionais", "SmallF"))
story.append(PageBreak())

# 1 Purpose and principles
story.append(P("1. Finalidade, escopo e princípios", "H1F"))
story.extend(bullets([
    "Promover aprendizado prático sobre phishing, malware, senhas e comportamentos seguros.",
    "Permitir campanhas educativas controladas para destinatários corporativos autorizados.",
    "Concentrar dados reais de campanhas e treinamentos em uma visão administrativa.",
    "Registrar somente eventos necessários para saber se uma mensagem foi enviada, aberta ou concluída.",
    "Manter a experiência educativa sem campos de senha, código MFA ou coleta de credenciais.",
]))
story.append(P("O sistema não substitui um SIEM, um gateway de e-mail, um diretório corporativo ou uma plataforma completa de gestão de aprendizagem. Ele funciona como uma camada local de orquestração e acompanhamento do programa educativo.", "BodyF"))
story.append(P("Fluxo operacional resumido", "H2F"))
story.append(flow(["Administrador entra", "Configura remetente", "Cadastra pessoas", "Cria campanha/curso", "Envia convite", "Acompanha"]));
story.append(P("Figura 1 - Fluxo operacional do programa educativo", "CaptionF"))
story.append(P("Princípios de segurança", "H2F"))
story.append(table([
    ["Princípio", "Aplicação no app"],
    ["Uso autorizado", "O envio depende de sessão administrativa, allowlist de domínios e configuração SMTP."],
    ["Minimização", "O rastreamento usa identificador do convite, destinatário, curso e estado; não registra senha ou código."],
    ["Transparência", "Os cursos informam que não solicitam credenciais e a área administrativa identifica os estados."],
    ["Controle local", "Rascunhos, pessoas, grupos e layouts ficam no navegador; configuração e eventos de servidor ficam em arquivos locais."],
], [46 * mm, 128 * mm]))
story.append(PageBreak())

# 2 Modules
story.append(P("2. Mapa funcional do aplicativo", "H1F"))
story.append(P("O Sistema FIEAM está organizado em três eixos: Operação, Aprendizado e Governança.", "BodyF"))
story.append(table([
    ["Eixo", "Módulo", "Finalidade"],
    ["Operação", "Visão geral", "Dashboard com campanhas locais, envios, cliques, interações e leitura por setor."],
    ["Operação", "Campanhas", "Criar, editar, salvar rascunhos, adicionar destinatários, revisar assunto e enviar."],
    ["Operação", "Layouts", "Criar, editar, excluir e associar modelos educativos com logo FIEAM."],
    ["Operação", "Pessoas", "Cadastrar e-mails corporativos, excluir e associar pessoas a grupos."],
    ["Operação", "Grupos", "Criar, editar, excluir e incluir pessoas em grupos de campanha."],
    ["Aprendizado", "Treinamentos", "Executar cursos, criar cursos personalizados, enviar convites e acompanhar conclusão."],
    ["Aprendizado", "Relatórios", "Acesso ao espaço de relatórios e exportações disponíveis no ambiente."],
    ["Governança", "Auditoria", "Consultar eventos de campanha, cliques e orientações concluídas."],
    ["Governança", "Configurações", "Configurar remetente, SMTP, criptografia, Reply-To, senha em memória e domínios."],
], [25 * mm, 38 * mm, 111 * mm]))
story.append(P("Perfis e atores", "H2F"))
story.append(table([
    ["Ator", "Responsabilidades"],
    ["Administrador / Gestor de SI", "Configura o ambiente, cria cursos e campanhas, cadastra destinatários, envia convites e interpreta resultados."],
    ["Usuário corporativo convidado", "Recebe e-mail educativo, abre o conteúdo, estuda os módulos e responde a avaliação sem informar credenciais."],
    ["Servidor local", "Autentica sessão, entrega páginas, envia e-mails pelo SMTP, registra eventos e disponibiliza APIs protegidas."],
], [50 * mm, 124 * mm]))
story.append(PageBreak())

# 3 dashboard campaigns
story.append(P("3. Visão geral e campanhas educativas", "H1F"))
story.append(P("A Visão geral mostra somente dados vinculados às campanhas locais e aos eventos registrados pelo servidor. O dashboard atualiza automaticamente e permite acompanhar o ciclo operacional.", "BodyF"))
story.append(table([
    ["Função", "Como funciona"],
    ["Indicadores", "Campanhas locais, e-mails enviados e interações registradas."],
    ["Campanha em andamento", "Exibe o rascunho mais recente, destinatários, envios e interações."],
    ["Leitura por setor", "Agrupa entregues, cliques e interações usando os grupos atribuídos às pessoas."],
    ["Atualização", "Consulta eventos do servidor periodicamente e reage a mudanças locais de pessoas, grupos e campanhas."],
    ["Exportação", "Gera CSV com setor, entregues, cliques, interações e click rate."],
], [48 * mm, 126 * mm]))
story.append(P("Nova campanha", "H2F"))
story.extend(bullets([
    "Criar rascunho com nome, público, dificuldade, template e objetivo educativo.",
    "Editar dados da campanha antes do envio.",
    "Associar grupo e destinatários corporativos.",
    "Revisar o assunto enviado e o layout selecionado.",
    "Enviar somente após confirmação no modal de disparo.",
]))
story.append(callout("Importante", "As campanhas devem permanecer dentro de um programa educativo interno e autorizado. O app é configurado para não solicitar senhas, códigos MFA ou credenciais."))
story.append(PageBreak())

# 4 layouts people groups
story.append(P("4. Conteúdo, pessoas e grupos", "H1F"))
story.append(P("Layouts", "H2F"))
story.extend(bullets([
    "Usar modelos institucionais, benefícios ou documento compartilhado.",
    "Editar nome, chamada, título, texto principal e texto do botão.",
    "Visualizar a prévia com a logo FIEAM antes de salvar.",
    "Editar e excluir layouts salvos.",
    "Manter limites de segurança: sem campos de senha/código e sem cópia de login de terceiros.",
]))
story.append(P("Pessoas", "H2F"))
story.extend(bullets([
    "Adicionar um ou vários e-mails corporativos.",
    "Associar a pessoa a um grupo no cadastro ou diretamente na tabela.",
    "Atualizar o grupo e excluir uma pessoa.",
    "Usar os registros para compor destinatários de campanhas e treinamentos.",
]))
story.append(P("Grupos", "H2F"))
story.extend(bullets([
    "Criar grupos por setor, finalidade ou público da campanha.",
    "Editar nome e descrição.",
    "Adicionar pessoas cadastradas ao grupo.",
    "Excluir grupo preservando as pessoas e deixando-as sem grupo.",
]))
story.append(callout("Atenção aos dados locais", "Campanhas, layouts, pessoas e grupos são mantidos no armazenamento local do navegador. Para uso em outro computador, a base precisa ser cadastrada ou sincronizada novamente."))
story.append(PageBreak())

# 5 training
story.append(P("5. Treinamentos e administração do aprendizado", "H1F"))
story.append(P("A área de Treinamentos é a visão administrativa do programa de aprendizagem. Ela combina cursos predefinidos, cursos personalizados, convite por e-mail e acompanhamento por destinatário.", "BodyF"))
story.append(table([
    ["Curso predefinido", "Conteúdo"],
    ["Phishing: identificar, reportar e agir", "Sinais de engenharia social, validação de remetente e link, reporte seguro e resposta a incidentes."],
    ["Malware: reduzir o risco no dia a dia", "Anexos, instaladores, macros, atualizações, dispositivos removíveis e reporte de suspeitas."],
    ["Troca periódica de senha", "Frases-senha, exclusividade, MFA, gerenciador aprovado e troca pelo canal oficial."],
], [68 * mm, 106 * mm]))
story.append(P("Criação de cursos personalizados", "H2F"))
story.extend(bullets([
    "Definir título, nome curto, resumo, duração, nível e objetivos.",
    "Criar três módulos com título, conteúdo e pontos principais.",
    "Configurar pergunta, três alternativas e resposta correta da avaliação.",
    "Editar ou excluir cursos personalizados; convites já enviados permanecem no histórico.",
]))
story.append(P("Estados acompanhados", "H2F"))
story.append(table([
    ["Estado", "Significado"],
    ["Enviado - não aberto", "O convite foi enviado, mas não há abertura registrada."],
    ["Aberto - não concluído", "O destinatário acessou o curso, porém ainda não aprovou a avaliação."],
    ["Concluído", "A avaliação foi respondida corretamente e a conclusão foi registrada."],
    ["Não concluído", "Resumo administrativo de pessoas abertas sem finalização; usuários não abertos ficam separados."],
], [48 * mm, 126 * mm]))
story.append(PageBreak())

# 6 email and tracking
story.append(P("6. Remetente, SMTP e rastreamento", "H1F"))
story.append(P("A configuração de envio é feita em Configurações > Remetente de campanha.", "BodyF"))
story.append(table([
    ["Campo", "Finalidade"],
    ["E-mail remetente", "Caixa institucional que aparece como remetente."],
    ["Nome exibido", "Nome amigável usado no cabeçalho do e-mail."],
    ["Usuário SMTP", "Conta usada para autenticar no relay."],
    ["SMTP relay / host", "Servidor de envio, normalmente smtp.office365.com para Microsoft 365."],
    ["Porta e criptografia", "STARTTLS/TLS na porta 587 ou SSL/TLS conforme o relay autorizado."],
    ["Senha SMTP", "Mantida somente em memória do servidor local; não é salva no arquivo de configuração."],
    ["Reply-To", "Caixa que recebe respostas dos usuários."],
    ["Domínios autorizados", "Allowlist que bloqueia destinatários fora dos domínios permitidos."],
], [48 * mm, 126 * mm]))
story.append(P("Eventos de campanha", "H2F"))
story.extend(bullets([
    "sent: mensagem enviada pelo SMTP.",
    "click: link educativo acessado.",
    "orientation_complete: orientação concluída.",
    "training sent/opened/completed: ciclo específico dos cursos.",
]))
story.append(callout("Limite de observabilidade", "O app identifica abertura e conclusão do curso por convite. Ele não identifica com certeza encaminhamentos, não lê a caixa postal automaticamente e não captura credenciais."))
story.append(PageBreak())

# 7 security architecture
story.append(P("7. Segurança, privacidade e operação técnica", "H1F"))
story.append(P("Autenticação", "H2F"))
story.extend(bullets([
    "Tela de login separada da área administrativa.",
    "Sessão com cookie HttpOnly e expiração do lado do servidor.",
    "Redirecionamento automático para login quando a sessão não é válida.",
    "Botão Sair revoga a sessão e retorna à tela de login.",
]))
story.append(P("Persistência e integração", "H2F"))
story.append(table([
    ["Componente", "Responsabilidade"],
    ["Browser localStorage", "Rascunhos de campanhas, layouts, pessoas, grupos e progresso local do administrador."],
    ["Arquivos JSON locais", "Configuração, eventos de campanha, eventos de treinamento e cursos personalizados."],
    ["Servidor Python local", "Autenticação, páginas, APIs, SMTP e registro de eventos."],
    ["SMTP corporativo", "Entrega de e-mails para os domínios autorizados."],
    ["Rede interna", "Acesso local e, quando habilitado, acesso pelo endereço LAN detectado pelo servidor."],
], [48 * mm, 126 * mm]))
story.append(P("Controles LGPD recomendados", "H2F"))
story.extend(bullets([
    "Usar apenas destinatários necessários para a finalidade educativa.",
    "Restringir acesso administrativo e proteger os arquivos locais do servidor.",
    "Definir prazo de retenção para eventos e relatórios.",
    "Informar a finalidade do programa, responsáveis e canal de dúvidas aos usuários.",
    "Evitar exportar listas de destinatários sem necessidade operacional.",
]))
story.append(PageBreak())

# 8 workflows and limitations
story.append(P("8. Procedimentos operacionais", "H1F"))
story.append(P("Preparar uma campanha", "H2F"))
story.append(flow(["Configurar SMTP", "Cadastrar pessoas", "Criar grupo", "Criar layout", "Criar campanha", "Revisar", "Enviar"]));
story.append(Spacer(1, 5 * mm))
story.append(P("Preparar um treinamento", "H2F"))
story.append(flow(["Abrir Treinamentos", "Criar ou escolher curso", "Selecionar usuários", "Enviar convite", "Acompanhar estados", "Exportar CSV"]));
story.append(P("Checklist antes de qualquer envio", "H2F"))
story.extend(bullets([
    "Confirmar autorização da campanha e do público.",
    "Validar remetente, Reply-To, criptografia, allowlist e SMTP AUTH.",
    "Revisar o assunto, logo, conteúdo e objetivo educativo.",
    "Confirmar que não há campos ou frases solicitando senha, código MFA ou credencial.",
    "Enviar primeiro um teste controlado para a caixa interna aprovada.",
    "Acompanhar os eventos e registrar a ação de encerramento do ciclo.",
]))
story.append(PageBreak())

# 9 current status
story.append(P("9. Estado atual e limites conhecidos", "H1F"))
story.append(P("Esta seção evita que a documentação prometa funções que ainda dependem de integração adicional.", "BodyF"))
story.append(table([
    ["Área", "Estado atual"],
    ["Dashboard", "Dados de campanhas e eventos locais com atualização automática."],
    ["Campanhas", "Rascunhos, edição, exclusão, seleção de destinatários, envio e rastreamento educativo."],
    ["Layouts", "Criação, edição, exclusão, prévia e associação ao envio."],
    ["Pessoas e grupos", "Cadastro e organização local no navegador."],
    ["Treinamentos", "Três cursos predefinidos, criação de cursos personalizados, convite, abertura, conclusão e relatório."],
    ["Relatório de treinamentos", "Exportação CSV baseada nos convites registrados pelo servidor."],
    ["Respostas de e-mail", "Reply-To direciona respostas; leitura automática da caixa depende de integração autorizada adicional."],
    ["Encaminhamentos", "Não há identificação confiável de quem recebeu uma mensagem encaminhada."],
    ["Relatórios executivos", "A exportação real está disponível no dashboard e na área de treinamentos; a área genérica de Relatórios pode ser expandida."],
], [48 * mm, 126 * mm]))
story.append(callout("Uso responsável", "Este aplicativo deve ser usado somente por equipes autorizadas, com finalidade de conscientização, melhoria de comportamento e redução de risco. Não deve ser usado para capturar credenciais ou realizar fraude."))
story.append(Spacer(1, 10 * mm))
story.append(P("Fim do documento", "CaptionF"))

doc.build(story)
print(OUTPUT)
