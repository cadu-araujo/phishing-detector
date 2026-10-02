import json
import hashlib
import hmac
import os
import re
import secrets
import socket
import smtplib
import ssl
import time
import uuid
from datetime import datetime, timezone
from email.message import EmailMessage
from email.utils import parseaddr
from html import escape as html_escape
from http.cookies import SimpleCookie
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from threading import Lock, Thread
from urllib.parse import parse_qs, quote, urlparse

ROOT = os.path.dirname(os.path.abspath(__file__))
PORT = int(os.getenv("FPAP_PORT", "8765"))
ADMIN_USERNAME = os.getenv("FPAP_ADMIN_USER", "admin.fieam")
ADMIN_PASSWORD_SALT = os.getenv("FPAP_ADMIN_PASSWORD_SALT", "fpap-admin-2026")
ADMIN_PASSWORD_HASH = os.getenv(
    "FPAP_ADMIN_PASSWORD_HASH",
    "7e09de3348fc1e884d1f6b35591ec34b441ee13573f5d3ae43ca0ab537c62a57",
)
SESSION_COOKIE = "fpap_session"
SESSION_TTL_SECONDS = 8 * 60 * 60
SESSIONS = {}
SESSION_LOCK = Lock()


def detect_lan_host():
    """Return the active IPv4 address that other internal computers can reach."""
    try:
        probe = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        probe.connect(("10.10.4.254", 1))
        address = probe.getsockname()[0]
        probe.close()
        if address and not address.startswith("127."):
            return address
    except OSError:
        pass
    return "127.0.0.1"


def password_matches(password):
    candidate = hashlib.pbkdf2_hmac(
        "sha256",
        str(password or "").encode("utf-8"),
        ADMIN_PASSWORD_SALT.encode("utf-8"),
        210000,
        dklen=32,
    ).hex()
    return hmac.compare_digest(candidate, ADMIN_PASSWORD_HASH)


def create_session():
    token = secrets.token_urlsafe(32)
    with SESSION_LOCK:
        SESSIONS[token] = time.time() + SESSION_TTL_SECONDS
    return token


def session_from_request(handler):
    cookies = SimpleCookie()
    try:
        cookies.load(handler.headers.get("Cookie", ""))
    except Exception:
        return ""
    session = cookies.get(SESSION_COOKIE)
    return session.value if session else ""


def is_authenticated(handler):
    token = session_from_request(handler)
    if not token:
        return False
    now = time.time()
    with SESSION_LOCK:
        expires_at = SESSIONS.get(token)
        if expires_at is None:
            return False
        if expires_at <= now:
            SESSIONS.pop(token, None)
            return False
        SESSIONS[token] = now + SESSION_TTL_SECONDS
    return True


LAN_HOST = detect_lan_host()
BIND_HOST = os.getenv("FPAP_BIND_HOST", f"127.0.0.1 + {LAN_HOST}")
PUBLIC_BASE_URL = os.getenv("FPAP_PUBLIC_BASE_URL", f"http://{LAN_HOST}:{PORT}")
DEFAULT_CONFIG = {
    "sender_email": os.getenv("FPAP_SENDER_EMAIL", ""),
    "sender_name": os.getenv("FPAP_SENDER_NAME", "Segurança da Informação · FIEAM"),
    "smtp_user": os.getenv("FPAP_SMTP_USER", ""),
    "reply_to": os.getenv("FPAP_REPLY_TO", ""),
    "smtp_host": os.getenv("FPAP_SMTP_HOST", ""),
    "smtp_port": os.getenv("FPAP_SMTP_PORT", "587"),
    "smtp_security": os.getenv("FPAP_SMTP_SECURITY", "starttls"),
    "allowed_domains": os.getenv("FPAP_ALLOWED_DOMAINS", "fieam.org.br"),
}
CONFIG_PATH = os.path.join(ROOT, "config.local.json")
EVENTS_PATH = os.path.join(ROOT, "tracking.events.jsonl")
TRAINING_EVENTS_PATH = os.path.join(ROOT, "training.events.jsonl")
TRAINING_COURSES_PATH = os.path.join(ROOT, "training.courses.json")
EVENT_LOCK = Lock()
ALLOWED_EVENT_TYPES = {"sent", "click", "orientation_complete"}
ALLOWED_TRAINING_EVENT_TYPES = {"sent", "opened", "completed"}
TRAINING_EMAIL_COURSES = {
    "phishing": {
        "title": "Phishing: identificar, reportar e agir",
        "summary": "Reconheça urgência artificial, valide remetentes e links e reporte mensagens suspeitas com segurança.",
    },
    "malware": {
        "title": "Malware: reduzir o risco no dia a dia",
        "summary": "Aprenda a lidar com anexos, instaladores, dispositivos removíveis e sinais de um possível incidente.",
    },
    "passwords": {
        "title": "Troca periódica de senha",
        "summary": "Use senhas únicas, MFA e os canais oficiais para manter suas contas protegidas.",
    },
}


def load_custom_training_courses():
    try:
        with open(TRAINING_COURSES_PATH, "r", encoding="utf-8") as file:
            saved = json.load(file)
        return saved if isinstance(saved, list) else []
    except (FileNotFoundError, json.JSONDecodeError):
        return []


def training_course_catalog():
    catalog = {key: dict(value) for key, value in TRAINING_EMAIL_COURSES.items()}
    for course in load_custom_training_courses():
        if isinstance(course, dict) and course.get("id"):
            catalog[str(course["id"])] = course
    return catalog


def normalize_training_course(payload, existing_id=""):
    title = str(payload.get("title", "")).replace("\r", " ").replace("\n", " ").strip()[:150]
    short_title = str(payload.get("shortTitle", "")).replace("\r", " ").replace("\n", " ").strip()[:60]
    description = str(payload.get("description", "")).replace("\r", " ").replace("\n", " ").strip()[:500]
    duration = str(payload.get("duration", "10 min")).replace("\r", " ").replace("\n", " ").strip()[:30]
    level = str(payload.get("level", "Essencial")).strip()
    objectives = [str(item).strip()[:180] for item in payload.get("objectives", []) if str(item).strip()][:6]
    modules = []
    for raw_module in payload.get("modules", []):
        if not isinstance(raw_module, dict):
            continue
        points = [str(item).strip()[:220] for item in raw_module.get("points", []) if str(item).strip()][:6]
        modules.append({"title": str(raw_module.get("title", "")).strip()[:120], "text": str(raw_module.get("text", "")).strip()[:700], "points": points})
    quiz = payload.get("quiz") if isinstance(payload.get("quiz"), dict) else {}
    options = [str(item).strip()[:220] for item in quiz.get("options", [])]
    try:
        answer = int(quiz.get("answer", 0))
    except (TypeError, ValueError):
        answer = 0
    if not title or not short_title or not description or len(objectives) < 1 or len(modules) != 3 or any(not module["title"] or not module["text"] or not module["points"] for module in modules):
        raise ValueError("Preencha título, resumo, objetivos e os três módulos do treinamento.")
    if level not in {"Essencial", "Intermediário", "Avançado"} or not duration:
        raise ValueError("Informe duração e nível válidos.")
    if not str(quiz.get("question", "")).strip() or len(options) != 3 or any(not option for option in options) or answer not in {0, 1, 2}:
        raise ValueError("Preencha a pergunta, as três alternativas e a resposta correta.")
    course_id = existing_id if re.fullmatch(r"custom-[a-f0-9]{12}", existing_id or "") else f"custom-{uuid.uuid4().hex[:12]}"
    return {"id": course_id, "title": title, "shortTitle": short_title, "description": description, "summary": description, "duration": duration, "level": level, "objectives": objectives, "modules": modules, "quiz": {"question": str(quiz["question"]).strip()[:300], "options": options, "answer": answer}, "createdAt": str(payload.get("createdAt") or datetime.now(timezone.utc).isoformat()), "updatedAt": datetime.now(timezone.utc).isoformat()}


def save_training_course(payload):
    existing_id = str(payload.get("id", ""))
    courses = load_custom_training_courses()
    if existing_id and not any(course.get("id") == existing_id for course in courses):
        raise ValueError("Treinamento personalizado não encontrado.")
    course = normalize_training_course(payload, existing_id)
    if existing_id:
        courses = [course if item.get("id") == existing_id else item for item in courses]
    else:
        courses.append(course)
    with open(TRAINING_COURSES_PATH, "w", encoding="utf-8") as file:
        json.dump(courses[-100:], file, ensure_ascii=False, indent=2)
    return course


def delete_training_course(course_id):
    if not re.fullmatch(r"custom-[a-f0-9]{12}", str(course_id or "")):
        raise ValueError("Somente treinamentos personalizados podem ser excluídos.")
    courses = load_custom_training_courses()
    remaining = [course for course in courses if course.get("id") != course_id]
    if len(remaining) == len(courses):
        raise ValueError("Treinamento personalizado não encontrado.")
    with open(TRAINING_COURSES_PATH, "w", encoding="utf-8") as file:
        json.dump(remaining, file, ensure_ascii=False, indent=2)
EMAIL_LAYOUTS = {
    "institutional": {
        "kicker": "Comunicado de segurança",
        "title": "Revise o conteúdo antes de continuar",
        "copy": "Um modelo seguro para orientar a pessoa até um treinamento, sem imitar telas de autenticação ou pedir credenciais.",
        "button": "Abrir conteúdo educativo →",
        "accent": "#2c9a8b",
    },
    "benefits": {
        "kicker": "Pessoas e benefícios",
        "title": "Há um novo material para sua revisão",
        "copy": "Use este formato para campanhas educativas sobre contexto, urgência e verificação de mensagens.",
        "button": "Ver material educativo →",
        "accent": "#6a8f35",
    },
    "shared": {
        "kicker": "Colaboração",
        "title": "Confira o documento de aprendizagem",
        "copy": "Uma experiência curta e contextual para ensinar a verificar remetentes, links e solicitações incomuns.",
        "button": "Abrir documento educativo →",
        "accent": "#536ea8",
    },
}


def load_config():
    config = DEFAULT_CONFIG.copy()
    try:
        with open(CONFIG_PATH, "r", encoding="utf-8") as file:
            saved = json.load(file)
            config.update({key: value for key, value in saved.items() if key in config})
    except (FileNotFoundError, json.JSONDecodeError):
        pass
    return config


def save_config(payload):
    allowed_domains = normalize_allowed_domains(payload.get("allowed_domains", ""))
    safe = {
        "sender_email": str(payload.get("sender_email", "")).strip(),
        "sender_name": str(payload.get("sender_name", "")).strip(),
        "smtp_user": str(payload.get("smtp_user") or os.getenv("FPAP_SMTP_USER", "")).strip(),
        "reply_to": str(payload.get("reply_to", "")).strip(),
        "smtp_host": str(payload.get("smtp_host", "")).strip(),
        "smtp_port": str(payload.get("smtp_port", "587")).strip(),
        "smtp_security": str(payload.get("smtp_security", "starttls")).strip().lower(),
        "allowed_domains": ", ".join(allowed_domains),
    }
    if not safe["sender_email"] or "@" not in safe["sender_email"]:
        raise ValueError("Informe um e-mail remetente válido.")
    if safe["smtp_user"] and not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", safe["smtp_user"]):
        raise ValueError("Informe um usuário SMTP válido.")
    if safe["reply_to"] and not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", safe["reply_to"]):
        raise ValueError("Informe uma caixa de respostas válida.")
    if not allowed_domains:
        raise ValueError("Informe ao menos um domínio autorizado.")
    invalid_domains = [domain for domain in allowed_domains if not re.fullmatch(r"(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}", domain)]
    if invalid_domains:
        raise ValueError("Use somente nomes de domínio válidos, sem http:// ou caminhos.")
    try:
        smtp_port = int(safe["smtp_port"] or "587")
    except ValueError as error:
        raise ValueError("A porta SMTP deve ser numérica.") from error
    if not 1 <= smtp_port <= 65535:
        raise ValueError("A porta SMTP deve estar entre 1 e 65535.")
    smtp_password = str(payload.get("smtp_password", ""))
    if safe["smtp_user"]:
        os.environ["FPAP_SMTP_USER"] = safe["smtp_user"]
    if smtp_password:
        os.environ["FPAP_SMTP_PASSWORD"] = smtp_password
    if safe["smtp_security"] not in {"starttls", "ssl"}:
        raise ValueError("Selecione uma criptografia SMTP válida.")
    with open(CONFIG_PATH, "w", encoding="utf-8") as file:
        json.dump(safe, file, ensure_ascii=False, indent=2)
    return safe


def record_event(event_type, correlation_id, campaign_id="", recipient=""):
    if event_type not in ALLOWED_EVENT_TYPES or not re.fullmatch(r"[A-Za-z0-9_-]{8,120}", correlation_id or ""):
        return None
    event = {
        "type": event_type,
        "correlation_id": correlation_id,
        "campaign_id": str(campaign_id or "")[:120],
        "recipient": str(recipient or "")[:254],
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    with EVENT_LOCK, open(EVENTS_PATH, "a", encoding="utf-8") as file:
        file.write(json.dumps(event, ensure_ascii=False) + "\n")
    return event


def list_events(campaign_id=""):
    events = []
    try:
        with open(EVENTS_PATH, "r", encoding="utf-8") as file:
            for line in file:
                try:
                    event = json.loads(line)
                except json.JSONDecodeError:
                    continue
                if not campaign_id or event.get("campaign_id") == campaign_id:
                    events.append(event)
    except FileNotFoundError:
        pass
    return events[-1000:]


def record_training_event(event_type, correlation_id, course_id, recipient=""):
    if event_type not in ALLOWED_TRAINING_EVENT_TYPES:
        return None
    if not re.fullmatch(r"[A-Za-z0-9_-]{8,120}", correlation_id or "") or course_id not in training_course_catalog():
        return None
    with EVENT_LOCK:
        events = []
        try:
            with open(TRAINING_EVENTS_PATH, "r", encoding="utf-8") as file:
                events = [json.loads(line) for line in file if line.strip()]
        except (FileNotFoundError, json.JSONDecodeError):
            events = []
        if event_type != "sent" and not any(item.get("type") == "sent" and item.get("correlation_id") == correlation_id and item.get("course_id") == course_id for item in events):
            return None
        if any(item.get("type") == event_type and item.get("correlation_id") == correlation_id for item in events):
            return next(item for item in events if item.get("type") == event_type and item.get("correlation_id") == correlation_id)
        event = {"type": event_type, "correlation_id": correlation_id, "course_id": course_id, "recipient": str(recipient or "")[:254], "timestamp": datetime.now(timezone.utc).isoformat()}
        with open(TRAINING_EVENTS_PATH, "a", encoding="utf-8") as file:
            file.write(json.dumps(event, ensure_ascii=False) + "\n")
        return event


def list_training_events():
    events = []
    try:
        with open(TRAINING_EVENTS_PATH, "r", encoding="utf-8") as file:
            for line in file:
                try:
                    event = json.loads(line)
                except json.JSONDecodeError:
                    continue
                if event.get("type") in ALLOWED_TRAINING_EVENT_TYPES and event.get("course_id") in training_course_catalog():
                    events.append(event)
    except FileNotFoundError:
        pass
    return events[-2000:]


def normalize_allowed_domains(value):
    domains = []
    for item in re.split(r"[,;\r\n]+", str(value or "")):
        domain = item.strip().lower().lstrip("@").rstrip(".")
        if domain and domain not in domains:
            domains.append(domain)
    return domains


def allowed_recipient(address, config):
    parsed = parseaddr(address)[1].lower()
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", parsed):
        return False
    domain = parsed.rsplit("@", 1)[1]
    allowed = normalize_allowed_domains(config.get("allowed_domains", ""))
    return any(domain == item or domain.endswith("." + item) for item in allowed)


def resolve_email_layout(layout_template="institutional", layout_text=None):
    layout = dict(EMAIL_LAYOUTS.get(str(layout_template or "institutional"), EMAIL_LAYOUTS["institutional"]))
    if isinstance(layout_text, dict):
        for field, limit in (("kicker", 90), ("title", 180), ("copy", 600), ("button", 80)):
            value = str(layout_text.get(field, "")).replace("\r", " ").replace("\n", " ").strip()[:limit]
            if value:
                layout[field] = value
    return layout


def send_test_email(recipient, subject, campaign_id="test", campaign_name="Atualização de benefícios", layout_template="institutional", layout_text=None):
    config = load_config()
    if not allowed_recipient(recipient, config):
        raise ValueError("Destinatário bloqueado: o domínio não está na allowlist.")
    smtp_host = config["smtp_host"]
    smtp_port = int(config["smtp_port"] or "587")
    smtp_security = str(config.get("smtp_security", "starttls")).strip().lower()
    smtp_user = os.getenv("FPAP_SMTP_USER", "") or config.get("smtp_user", "")
    smtp_password = os.getenv("FPAP_SMTP_PASSWORD", "")
    sender_email = config["sender_email"]
    if not smtp_host or not sender_email:
        raise RuntimeError("Configure o remetente e FPAP_SMTP_HOST antes do envio.")
    if not smtp_user or not smtp_password:
        raise RuntimeError("Configure FPAP_SMTP_USER e FPAP_SMTP_PASSWORD antes do envio.")

    correlation_id = uuid.uuid4().hex
    campaign_id = str(campaign_id or "test")[:120]
    tracking_url = f"{PUBLIC_BASE_URL}/track/click?campaign={quote(campaign_id)}&cid={quote(correlation_id)}"
    message = EmailMessage()
    safe_campaign_name = str(campaign_name or "Simulação educativa").replace("\r", " ").replace("\n", " ")[:120]
    safe_subject = str(subject or f"[SIMULAÇÃO FPAP] {safe_campaign_name}").replace("\r", " ").replace("\n", " ").strip()[:180]
    if not safe_subject.upper().startswith("[SIMULAÇÃO FPAP]"):
        safe_subject = f"[SIMULAÇÃO FPAP] {safe_subject}"[:180]
    message["Subject"] = safe_subject
    message["From"] = f"{config['sender_name']} <{sender_email}>"
    message["To"] = recipient
    message["Reply-To"] = config.get("reply_to") or sender_email
    message["X-FPAP-Correlation-ID"] = correlation_id
    message.set_content(
        "Esta é uma simulação controlada do programa FPAP.\\n\\n"
        "Acesse a página educativa para concluir o teste: "
        f"{tracking_url}\\n\\n"
        "Nenhuma senha ou credencial deve ser informada."
    )
    layout = resolve_email_layout(layout_template, layout_text)
    layout_kicker = html_escape(layout["kicker"])
    layout_title = html_escape(layout["title"])
    layout_copy = html_escape(layout["copy"])
    layout_button = html_escape(layout["button"])
    layout_accent = layout["accent"]
    message.add_alternative(
        f"""<html><body style='margin:0;background:#f3f5f0;font-family:Arial,sans-serif;color:#172322'>
        <div style='width:100%;padding:28px 0;background:#f3f5f0'>
          <div style='width:88%;max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #dce8e2'>
            <div style='padding:16px 22px 10px;border-bottom:1px solid #edf1ed'><img src='cid:fpap-logo' alt='Sistema FIEAM' width='150' height='88' style='display:block;width:150px;max-width:100%;height:auto'></div>
            <div style='padding:11px 26px;background:#e8f5ee;border-bottom:1px solid #a8ddbd;color:#23633b;font-size:13px'><strong>SIMULAÇÃO AUTORIZADA FPAP</strong> · treinamento</div>
            <div style='padding:28px 26px 30px'>
              <div style='margin-bottom:10px;color:{layout_accent};font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:.04em'>{layout_kicker}</div>
              <h1 style='margin:0 0 12px;color:#172322;font-size:25px;line-height:1.2'>{layout_title}</h1>
              <p style='margin:0 0 22px;color:#52615d;font-size:15px;line-height:1.55'>{layout_copy}</p>
              <p style='margin:0 0 22px;color:#52615d;font-size:14px;line-height:1.55'>Esta comunicação faz parte da campanha educativa <strong>{html_escape(safe_campaign_name)}</strong>.</p>
              <a href='{tracking_url}' style='display:inline-block;padding:12px 18px;background:{layout_accent};color:#ffffff;text-decoration:none;font-size:14px;font-weight:bold'>{layout_button}</a>
            </div>
            <div style='padding:15px 26px;border-top:1px solid #edf1ed;color:#61706e;font-size:12px;line-height:1.5'>Simulação autorizada FPAP · não informe senhas ou códigos.</div>
          </div>
        </div>
        </body></html>""",
        subtype="html",
    )
    logo_path = os.path.join(ROOT, "assets", "logo-fieam.png")
    try:
        with open(logo_path, "rb") as logo_file:
            html_part = message.get_payload()[-1]
            html_part.add_related(logo_file.read(), maintype="image", subtype="png", cid="<fpap-logo>")
    except FileNotFoundError:
        pass
    context = ssl.create_default_context()
    try:
        smtp_client = smtplib.SMTP_SSL if smtp_security == "ssl" else smtplib.SMTP
        with smtp_client(smtp_host, smtp_port, timeout=20, **({"context": context} if smtp_security == "ssl" else {})) as smtp:
            if smtp_security == "starttls":
                smtp.starttls(context=context)
            smtp.login(smtp_user, smtp_password)
            smtp.send_message(message)
    except smtplib.SMTPAuthenticationError as error:
        smtp_error = str(getattr(error, "smtp_error", b""), "utf-8", errors="ignore")
        if "5.7.139" in smtp_error:
            raise RuntimeError(
                "Microsoft 365 rejeitou a autenticação SMTP (535 5.7.139). "
                "Habilite o Authenticated SMTP para esta caixa ou configure OAuth2."
            ) from error
        if "5.7.57" in smtp_error or getattr(error, "smtp_code", 0) in {530, 535}:
            raise RuntimeError(
                "Microsoft 365 recusou a autenticação SMTP. Verifique FPAP_SMTP_USER, "
                "FPAP_SMTP_PASSWORD e se o SMTP AUTH esta habilitado para essa caixa."
            ) from error
        raise RuntimeError("Falha de autenticacao no servidor SMTP.") from error
    except smtplib.SMTPException as error:
        raise RuntimeError("Falha na comunicacao com o servidor SMTP.") from error
    record_event("sent", correlation_id, campaign_id, recipient)
    return correlation_id


def send_campaign_emails(recipients, subject, campaign_id, campaign_name, layout_template="institutional", layout_text=None):
    config = load_config()
    if not isinstance(recipients, list):
        raise ValueError("A lista de destinatários é inválida.")
    normalized = []
    for recipient in recipients or []:
        parsed = parseaddr(str(recipient))[1].lower()
        if parsed and parsed not in normalized:
            normalized.append(parsed)
    if not normalized:
        raise ValueError("A campanha não possui destinatários cadastrados.")
    if len(normalized) > 50:
        raise ValueError("O disparo controlado aceita no máximo 50 destinatários por vez.")
    blocked = [recipient for recipient in normalized if not allowed_recipient(recipient, config)]
    if blocked:
        raise ValueError("Há destinatários fora da allowlist configurada.")
    correlations = [send_test_email(recipient, subject, campaign_id, campaign_name, layout_template, layout_text) for recipient in normalized]
    return correlations


def send_training_invitations(recipients, course_id, subject):
    course = training_course_catalog().get(str(course_id or ""))
    if not course:
        raise ValueError("Selecione um curso válido.")
    config = load_config()
    if not isinstance(recipients, list):
        raise ValueError("A lista de destinatários é inválida.")
    normalized = []
    for recipient in recipients or []:
        parsed = parseaddr(str(recipient))[1].lower()
        if parsed and parsed not in normalized:
            normalized.append(parsed)
    if not normalized:
        raise ValueError("Informe ao menos um destinatário corporativo.")
    if len(normalized) > 50:
        raise ValueError("O envio aceita no máximo 50 destinatários por vez.")
    blocked = [recipient for recipient in normalized if not allowed_recipient(recipient, config)]
    if blocked:
        raise ValueError("Há destinatários fora da allowlist configurada.")
    smtp_host = config["smtp_host"]
    smtp_port = int(config["smtp_port"] or "587")
    smtp_security = str(config.get("smtp_security", "starttls")).strip().lower()
    smtp_user = os.getenv("FPAP_SMTP_USER", "") or config.get("smtp_user", "")
    smtp_password = os.getenv("FPAP_SMTP_PASSWORD", "")
    sender_email = config["sender_email"]
    if not smtp_host or not sender_email:
        raise RuntimeError("Configure o remetente e FPAP_SMTP_HOST antes do envio.")
    if not smtp_user or not smtp_password:
        raise RuntimeError("Configure FPAP_SMTP_USER e FPAP_SMTP_PASSWORD antes do envio.")
    safe_subject = str(subject or f"[TREINAMENTO FIEAM] {course['title']}").replace("\r", " ").replace("\n", " ").strip()[:180]
    if not safe_subject.upper().startswith("[TREINAMENTO FIEAM]"):
        safe_subject = f"[TREINAMENTO FIEAM] {safe_subject}"[:180]
    context = ssl.create_default_context()
    sent = []
    for recipient in normalized:
        correlation_id = uuid.uuid4().hex
        training_url = f"{PUBLIC_BASE_URL}/training.html?course={quote(course_id)}&cid={quote(correlation_id)}"
        message = EmailMessage()
        message["Subject"] = safe_subject
        message["From"] = f"{config['sender_name']} <{sender_email}>"
        message["To"] = recipient
        message["Reply-To"] = config.get("reply_to") or sender_email
        message["X-FPAP-Training-ID"] = correlation_id
        message.set_content(
            f"Você foi convidado para o curso {course['title']}.\n\n"
            f"{course['summary']}\n\n"
            f"Acesse o curso: {training_url}\n\n"
            "O conteúdo é educativo e não solicita senha, código MFA ou qualquer credencial."
        )
        message.add_alternative(
            f"""<html><body style='margin:0;background:#f3f5f0;font-family:Arial,sans-serif;color:#172322'>
            <div style='width:100%;padding:28px 0;background:#f3f5f0'>
              <div style='width:88%;max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #dce8e2'>
                <div style='padding:16px 22px 10px;border-bottom:1px solid #edf1ed'><img src='cid:fpap-logo' alt='Sistema FIEAM' width='128' style='display:block;width:128px;max-width:100%;height:auto'></div>
                <div style='padding:11px 26px;background:#e8f5ee;border-bottom:1px solid #a8ddbd;color:#23633b;font-size:13px'><strong>Treinamento de conscientização</strong></div>
                <div style='padding:28px 26px 30px'>
                  <div style='margin-bottom:10px;color:#2c9a8b;font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:.04em'>Programa de aprendizagem</div>
                  <h1 style='margin:0 0 12px;color:#172322;font-size:25px;line-height:1.2'>{html_escape(course['title'])}</h1>
                  <p style='margin:0 0 22px;color:#52615d;font-size:15px;line-height:1.55'>{html_escape(course['summary'])}</p>
                  <a href='{training_url}' style='display:inline-block;padding:12px 18px;background:#19312d;color:#ffffff;text-decoration:none;font-size:14px;font-weight:bold'>Abrir treinamento</a>
                </div>
                <div style='padding:15px 26px;border-top:1px solid #edf1ed;color:#61706e;font-size:12px;line-height:1.5'>Conteúdo educativo do Sistema FIEAM · não solicita senhas ou códigos.</div>
              </div>
            </div>
            </body></html>""",
            subtype="html",
        )
        logo_path = os.path.join(ROOT, "assets", "logo-fieam.png")
        try:
            with open(logo_path, "rb") as logo_file:
                html_part = message.get_payload()[-1]
                html_part.add_related(logo_file.read(), maintype="image", subtype="png", cid="<fpap-logo>")
        except FileNotFoundError:
            pass
        try:
            smtp_client = smtplib.SMTP_SSL if smtp_security == "ssl" else smtplib.SMTP
            with smtp_client(smtp_host, smtp_port, timeout=20, **({"context": context} if smtp_security == "ssl" else {})) as smtp:
                if smtp_security == "starttls":
                    smtp.starttls(context=context)
                smtp.login(smtp_user, smtp_password)
                smtp.send_message(message)
        except smtplib.SMTPAuthenticationError as error:
            smtp_error = str(getattr(error, "smtp_error", b""), "utf-8", errors="ignore")
            if "5.7.139" in smtp_error:
                raise RuntimeError("Microsoft 365 rejeitou a autenticação SMTP (535 5.7.139). Habilite o Authenticated SMTP para esta caixa ou configure OAuth2.") from error
            raise RuntimeError("Microsoft 365 recusou a autenticação SMTP. Verifique as credenciais e se o SMTP AUTH está habilitado para essa caixa.") from error
        except smtplib.SMTPException as error:
            raise RuntimeError("Falha na comunicação com o servidor SMTP.") from error
        record_training_event("sent", correlation_id, course_id, recipient)
        sent.append(correlation_id)
    return sent


class FPAPHandler(SimpleHTTPRequestHandler):
    def _json(self, payload, status=200):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _redirect(self, location):
        self.send_response(303)
        self.send_header("Location", location)
        self.send_header("Cache-Control", "no-store")
        self.end_headers()

    def _unauthorized(self):
        return self._json({"error": "Sessão expirada. Faça login novamente."}, 401)

    def _set_session_cookie(self, token):
        self.send_header(
            "Set-Cookie",
            f"{SESSION_COOKIE}={token}; Path=/; HttpOnly; SameSite=Lax; Max-Age={SESSION_TTL_SECONDS}",
        )

    def do_GET(self):
        route = urlparse(self.path).path
        if route == "/":
            return self._redirect("/dashboard.html" if is_authenticated(self) else "/login.html")
        if route == "/dashboard.html" and not is_authenticated(self):
            return self._redirect("/login.html")
        if route in {"/api/config", "/api/events", "/api/training-events", "/api/training-courses"} and not is_authenticated(self):
            return self._unauthorized()
        if route == "/api/health":
            config = load_config()
            return self._json({
                "ok": True,
                "service": "fpap",
                "configuration": {
                    "smtp_host_configured": bool(config.get("smtp_host")),
                    "smtp_user_configured": bool(os.getenv("FPAP_SMTP_USER") or config.get("smtp_user")),
                    "smtp_password_configured": bool(os.getenv("FPAP_SMTP_PASSWORD")),
                    "smtp_security": config.get("smtp_security"),
                    "smtp_port": config.get("smtp_port"),
                    "allowed_domains_configured": bool(config.get("allowed_domains")),
                    "bind_host": BIND_HOST,
                    "public_base_url": PUBLIC_BASE_URL,
                },
            })
        if route == "/api/config":
            return self._json(load_config())
        if route == "/api/events":
            campaign_id = parse_qs(urlparse(self.path).query).get("campaign", [""])[0]
            return self._json({"events": list_events(campaign_id)})
        if route == "/api/training-events":
            return self._json({"events": list_training_events()})
        if route == "/api/training-courses":
            return self._json({"courses": load_custom_training_courses()})
        if route == "/api/training-course":
            course_id = parse_qs(urlparse(self.path).query).get("course", [""])[0]
            course = training_course_catalog().get(course_id)
            if not course:
                return self._json({"error": "Treinamento não encontrado."}, 404)
            return self._json(course)
        if route == "/training.html":
            query = parse_qs(urlparse(self.path).query)
            correlation_id = query.get("cid", [""])[0]
            course_id = query.get("course", [""])[0]
            if correlation_id and course_id in training_course_catalog():
                record_training_event("opened", correlation_id, course_id)
            return super().do_GET()
        if route == "/track/click":
            query = parse_qs(urlparse(self.path).query)
            correlation_id = query.get("cid", [""])[0]
            campaign_id = query.get("campaign", ["test"])[0]
            if not re.fullmatch(r"[A-Za-z0-9_-]{8,120}", correlation_id or ""):
                return self._json({"error": "Link de rastreio inválido."}, 400)
            record_event("click", correlation_id, campaign_id)
            self.send_response(303)
            self.send_header("Location", f"/landing.html?campaign={quote(campaign_id)}&cid={quote(correlation_id)}")
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            return
        return super().do_GET()

    def do_POST(self):
        route = urlparse(self.path).path
        try:
            length = int(self.headers.get("Content-Length", "0"))
            payload = json.loads(self.rfile.read(length) or b"{}")
            if route == "/api/login":
                username = str(payload.get("username", "")).strip()
                password = str(payload.get("password", ""))
                if not hmac.compare_digest(username, ADMIN_USERNAME) or not password_matches(password):
                    return self._json({"error": "Usuário ou senha inválidos."}, 401)
                token = create_session()
                body = json.dumps({"ok": True}, ensure_ascii=False).encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Cache-Control", "no-store")
                self.send_header("Content-Length", str(len(body)))
                self._set_session_cookie(token)
                self.end_headers()
                self.wfile.write(body)
                return
            if route == "/api/logout":
                token = session_from_request(self)
                with SESSION_LOCK:
                    SESSIONS.pop(token, None)
                body = b'{"ok":true}'
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Cache-Control", "no-store")
                self.send_header("Content-Length", str(len(body)))
                self.send_header("Set-Cookie", f"{SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0")
                self.end_headers()
                self.wfile.write(body)
                return
            if route == "/api/training-events":
                event_type = str(payload.get("type", ""))
                correlation_id = str(payload.get("correlation_id", ""))
                course_id = str(payload.get("course_id", ""))
                if event_type not in {"opened", "completed"}:
                    raise ValueError("Tipo de evento de treinamento não permitido.")
                event = record_training_event(event_type, correlation_id, course_id)
                if not event:
                    raise ValueError("Identificador de treinamento inválido.")
                return self._json({"ok": True})
            if route in {"/api/config", "/api/send-test", "/api/send-campaign", "/api/send-training", "/api/training-courses", "/api/training-courses/delete"} and not is_authenticated(self):
                return self._unauthorized()
            if route == "/api/config":
                return self._json({"ok": True, "config": save_config(payload)})
            if route == "/api/events":
                event_type = str(payload.get("type", ""))
                correlation_id = str(payload.get("correlation_id", ""))
                if event_type not in ALLOWED_EVENT_TYPES or event_type == "sent":
                    raise ValueError("Tipo de evento não permitido.")
                event = record_event(event_type, correlation_id, str(payload.get("campaign_id", "")))
                if not event:
                    raise ValueError("Identificador de rastreio inválido.")
                return self._json({"ok": True})
            if route == "/api/send-test":
                correlation_id = send_test_email(str(payload.get("recipient", "")), str(payload.get("subject", "")), str(payload.get("campaign_id", "test")))
                return self._json({"ok": True, "correlation_id": correlation_id})
            if route == "/api/send-campaign":
                campaign_id = str(payload.get("campaign_id", ""))[:120]
                campaign_name = str(payload.get("campaign_name", "Simulação educativa"))[:120]
                subject = str(payload.get("subject", ""))[:180]
                layout_template = str(payload.get("layout_template", "institutional"))
                layout_text = payload.get("layout_text")
                correlations = send_campaign_emails(payload.get("recipients", []), subject, campaign_id, campaign_name, layout_template, layout_text)
                return self._json({"ok": True, "campaign_id": campaign_id, "sent": len(correlations), "correlation_ids": correlations})
            if route == "/api/send-training":
                course_id = str(payload.get("course_id", ""))[:40]
                subject = str(payload.get("subject", ""))[:180]
                correlations = send_training_invitations(payload.get("recipients", []), course_id, subject)
                return self._json({"ok": True, "course_id": course_id, "sent": len(correlations), "correlation_ids": correlations})
            if route == "/api/training-courses":
                course = save_training_course(payload)
                return self._json({"ok": True, "course": course})
            if route == "/api/training-courses/delete":
                delete_training_course(str(payload.get("id", "")))
                return self._json({"ok": True})
            return self._json({"error": "Rota não encontrada."}, 404)
        except ValueError as error:
            return self._json({"error": str(error)}, 400)
        except Exception as error:
            return self._json({"error": str(error)}, 502)

    def log_message(self, format, *args):
        print("[FPAP]", format % args)


if __name__ == "__main__":
    os.chdir(ROOT)
    print(f"FPAP disponível localmente em http://127.0.0.1:{PORT}/dashboard.html")
    print(f"FPAP disponível na rede interna em {PUBLIC_BASE_URL}/dashboard.html")
    listen_hosts = ["127.0.0.1"]
    if LAN_HOST != "127.0.0.1":
        listen_hosts.append(LAN_HOST)
    servers = [ThreadingHTTPServer((host, PORT), FPAPHandler) for host in listen_hosts]
    for server in servers[1:]:
        Thread(target=server.serve_forever, daemon=True).start()
    servers[0].serve_forever()
