# FPAP · FIEAM Phishing Awareness Platform

MVP frontend autocontido da plataforma interna de conscientização e gestão de risco humano do Sistema FIEAM.

## Executar

Execute `iniciar_sistema.bat` e acesse `http://127.0.0.1:8765/dashboard.html`.
O dashboard é servido exclusivamente pelo servidor local; não abra `dashboard.html` como arquivo (`file://`).

## Incluído no MVP visual

- Dashboard executivo com resiliência, click rate, report rate e evolução.
- Campanha atual com dados de entrega, contexto e treinamento.
- Leitura agregada por setor.
- Navegação entre campanhas, pessoas, grupos, treinamentos, relatórios, auditoria e configurações.
- Modal funcional para criar campanhas como rascunho.
- Campo de e-mail para disparo (remetente) e campo de destinatários corporativos por campanha, com allowlist local `@fieam.org.br`.
- Exportação CSV da visão por setor.
- Layout responsivo para desktop e mobile.
- Nenhuma captura ou persistência de credenciais.

Os dados são demonstrativos e devem ser substituídos por uma API autorizada antes de qualquer uso operacional.

## Disparo de e-mail teste

### Erro 535 / 5.7.57 no Microsoft 365

Esse erro indica que a conta nao foi autenticada pelo Exchange Online. Confirme que `FPAP_SMTP_USER` e o e-mail da caixa, que `FPAP_SMTP_PASSWORD` esta definido no ambiente do servidor e que o SMTP AUTH esta habilitado para a caixa. Depois, reinicie `iniciar_sistema.bat` para carregar as variaveis novamente. Nao salve a senha em `config.local.json` ou no frontend.

1. Confirme em `config.local.json` o remetente, o usuário SMTP, `smtp.office365.com`, porta `587`, `starttls` e a allowlist `fieam.org.br`.
2. Execute `iniciar_sistema.bat`. Se a senha não estiver no ambiente, abra **Configurações**, informe a senha da caixa autorizada e salve; ela fica somente na memória do processo.
3. Para uma sessão nova, a senha precisa ser informada novamente ou definida previamente como `FPAP_SMTP_PASSWORD` no ambiente do servidor. Nunca coloque a senha em `config.local.json`, no frontend ou no repositório.
4. Use **Enviar e-mail teste** somente após revisão e apenas para destinatário interno aprovado.

O dashboard continua disponível em `http://127.0.0.1:8765/dashboard.html` neste computador. Os links das campanhas usam automaticamente o endereço IPv4 da rede local quando o servidor é iniciado; para uma simulação interna autorizada, também é possível definir `FPAP_PUBLIC_BASE_URL` com um endereço HTTPS interno acessível. A porta TCP 8765 precisa estar liberada no firewall da rede e o computador deve permanecer ligado durante a campanha.

O backend valida domínios, usa TLS e envia somente uma mensagem educativa. A landing page não possui campos de senha e não coleta credenciais.

## Rastreio da simulação

- Cada teste recebe um identificador único.
- O link passa por `/track/click` antes de abrir a landing educativa.
- O painel **Auditoria** mostra envio, clique e conclusão da orientação.
- O cabeçalho `Reply-To` usa a caixa configurada para respostas.
- Encaminhamento não é identificado com certeza; se o link for acessado novamente, o clique pode ser registrado, sem revelar para quem a mensagem foi encaminhada.
- Os eventos ficam em `tracking.events.jsonl` e não incluem senha, MFA ou endereço IP.

A leitura automática da caixa de respostas exige uma integração autorizada com Microsoft 365 (OAuth/Graph ou mecanismo equivalente). O MVP não acessa a caixa de entrada automaticamente.
