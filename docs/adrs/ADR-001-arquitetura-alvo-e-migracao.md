# ADR-001 - Arquitetura-alvo e migração progressiva

- **Status:** Proposta
- **Data:** 2026-10-01
- **Decisores:** A confirmar com a equipe responsável pelo produto

## Contexto

O projeto atual é um MVP local em Python, HTML, CSS, JavaScript e arquivos JSON/JSONL. A diretriz arquitetural corporativa exige .NET (C#), Entity Framework Core, SQL Server e Angular, com Clean Architecture, SOLID e Clean Code.

## Decisão proposta

Adotar uma migração progressiva para Clean Architecture, mantendo o MVP como referência comportamental temporária e extraindo os bounded contexts em contratos de aplicação antes da substituição da persistência.

Camadas-alvo:

- **Domain:** entidades, value objects, invariantes e eventos de domínio.
- **Application:** casos de uso, DTOs, portas de mensageria e políticas.
- **Infrastructure:** EF Core, SQL Server, SMTP/OAuth, armazenamento e observabilidade.
- **Presentation:** API .NET versionada e frontend Angular.

## Alternativas consideradas

| Alternativa | Decisão | Motivo |
| --- | --- | --- |
| Reescrever tudo de uma vez | Rejeitada | Alto risco de perder regras já exercitadas e dificultar validação. |
| Manter o MVP indefinidamente | Rejeitada | Persistência local e envio síncrono não atendem governança corporativa. |
| Migrar por bounded context | Recomendada | Permite validar contratos, dados e segurança em etapas. |

## Consequências

- Será necessário mapear os dados locais antes da migração.
- O primeiro contrato prioritário é o de Campanhas Educativas.
- A coexistência temporária exige identificação de fonte de verdade e reconciliação.
- Nenhuma etapa de migração deve habilitar captura de credenciais ou ampliar o público sem autorização.

