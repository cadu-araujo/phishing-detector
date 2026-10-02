# Roadmap arquitetural e funcional

## Premissas de ordenação

Uma etapa só pode começar quando suas dependências técnicas, de dados e de contratos estiverem concluídas. A implementação da arquitetura-alvo deve preservar o uso educativo autorizado e não introduzir captura de credenciais.

## Sprint 0 - Baseline e governança documental

**Estado: em andamento.**

Entregas:

- Inventariar o comportamento do MVP atual.
- Aprovar os bounded contexts propostos.
- Consolidar glossário, lacunas e ADRs.
- Definir política de retenção, auditoria e acesso aos dados de campanha.

Dependências para avançar: aprovação do mapa de contextos e definição do primeiro módulo de implementação.

## Sprint 1 - Fundação da plataforma na stack corporativa

**Estado: planejada.**

Entregas:

- Criar solução .NET com Clean Architecture.
- Configurar SQL Server e Entity Framework Core.
- Criar autenticação, autorização, gestão de sessão e auditoria administrativa.
- Criar frontend Angular com shell, navegação e contratos tipados.
- Definir versionamento de API e observabilidade.

Dependências: Sprint 0 aprovada.

## Sprint 2 - Pessoas e grupos

**Estado: planejada.**

Entregas:

- Persistir pessoas, setores, grupos e associações.
- Validar e-mails e domínios autorizados.
- Criar importação controlada e trilha de alterações.
- Expor consulta paginada para campanhas e relatórios.

Dependências: fundação de autenticação, banco e autorização.

## Sprint 3 - Layouts educativos

**Estado: planejada.**

Entregas:

- Versionar layouts, textos, logo e botão.
- Implementar pré-visualização e validação de conteúdo seguro.
- Impedir campos de credencial, senha e código MFA.

Dependências: pessoas/grupos não são obrigatórios para editar um layout, mas o contrato de identidade e auditoria da Sprint 1 é obrigatório.

## Sprint 4 - Campanhas educativas

**Estado: bloqueada até a aprovação do módulo atual.**

Entregas:

- Criar rascunho, revisar, agendar, enviar e encerrar campanha.
- Associar layout e público versionados.
- Persistir estados e transições com idempotência.
- Integrar provedor SMTP corporativo com segredo fora do banco.

Dependências: Sprints 1, 2 e 3.

## Sprint 5 - Rastreamento e relatórios

**Estado: planejada.**

Entregas:

- Registrar envio, clique e conclusão educativa.
- Agregar resultados por campanha, setor e grupo.
- Implementar retenção, anonimização e exportação autorizada.
- Diferenciar claramente não enviado, enviado, aberto, clicado e concluído.

Dependências: Sprint 4 e política LGPD aprovada.

## Sprint 6 - Treinamentos

**Estado: planejada.**

Entregas:

- Criar cursos personalizados e módulos.
- Convidar pessoas por e-mail.
- Acompanhar enviado, aberto, em andamento, concluído e pendente.
- Emitir relatório administrativo e histórico de versões.

Dependências: fundação, pessoas/grupos, SMTP e rastreamento.

