# Estado atual e análise de lacunas

## Evidência observada

| Área | Estado real observado | Lacuna em relação à arquitetura-alvo |
| --- | --- | --- |
| Backend | `server.py` usa `http.server`, `ThreadingHTTPServer` e funções de domínio no mesmo módulo. | Não há .NET, camadas Clean Architecture, DI formal ou contratos versionados. |
| Frontend | `dashboard.html`, `app.js` e `styles.css` formam uma SPA vanilla com navegação por views. | Não há Angular, componentes tipados ou cliente gerado a partir de contrato. |
| Persistência | `localStorage`, `config.local.json`, `tracking.events.jsonl`, `training.events.jsonl` e `training.courses.json`. | Não há SQL Server, EF Core, transações, migrações ou concorrência relacional. |
| Autenticação | Sessão em memória com cookie HttpOnly e TTL de oito horas. | Sessões são perdidas ao reiniciar; não há RBAC persistente, MFA administrativo ou rotação de segredo documentada. |
| SMTP | Envio por `smtplib`, STARTTLS/SSL, allowlist e senha somente em variável de ambiente/memória. | Não há provedor abstraído, fila, retry, idempotência de disparo ou telemetria de entrega. |
| Campanhas | Rascunhos e destinatários ficam no navegador; eventos de envio/clique ficam no servidor. | O agregado da campanha não é uma unidade transacional única. |
| Treinamentos | Cursos predefinidos e personalizados; eventos `sent`, `opened`, `completed`. | Não há histórico de versões, turma, tentativa de avaliação ou política de retenção. |
| Relatórios | Dashboard e exportação CSV são derivados de dados locais/eventos. | Não há modelo de leitura dedicado, autorização por escopo ou reconciliação de dados. |

## Riscos e impactos prioritários

1. **Integridade do estado:** salvar campanha, destinatários e disparo em locais diferentes pode produzir divergência entre o que foi revisado e o que foi enviado.
2. **Confidencialidade de PII:** eventos armazenam destinatário e os cadastros locais contêm e-mails; falta política formal de retenção, exportação e exclusão.
3. **Disponibilidade:** envio síncrono em uma requisição pode sofrer timeout parcial e não informar claramente quais mensagens foram entregues.
4. **Segurança operacional:** o código contém valores padrão de identidade administrativa e salt; a implantação precisa exigir configuração externa e rotação.
5. **Rastreabilidade:** há rastreio de clique, mas não há confirmação de abertura de e-mail nem identificação confiável de encaminhamento.
6. **Doc rot já detectado:** o `README.md` descreve o MVP e ainda usa a nomenclatura FPAP em vários pontos, enquanto a interface visível usa Sistema FIEAM. O glossário desta pasta passa a ser a referência para resolver a divergência.

## Escopo não prometido pelo estado atual

- Leitura automática da caixa de respostas.
- Identificação confiável de encaminhamento.
- Coleta de IP ou credenciais.
- Entrega garantida de todos os e-mails sem fila e reconciliação do provedor.
- Atualização em tempo real distribuída entre vários administradores.

