# Planilha de Escalabilidade Multi-Instituições (Volly)

Este plano descreve as mudanças necessárias para transformar o sistema atual em uma plataforma SaaS (Software as a Service) multi-inquilino (multi-tenant), permitindo que múltiplas instituições operem de forma isolada, mas com a capacidade de interagir em um feed compartilhado.

## Objetivos
1. **Isolamento de Dados**: Garantir que a Equipe A da Instituição X não veja dados da Instituição Y.
2. **Hierarquia Flexível**: Suporte a múltiplas equipes/departamentos dentro de cada instituição.
3. **Feed Interconectado**: Permitir que publicações alcancem usuários de outras instituições conforme as regras de visibilidade.
4. **Escalabilidade**: Estrutura pronta para milhares de usuários e centenas de instituições.

## Design de Arquitetura: Multi-Tenancy com ID de Tenant
Utilizaremos a estratégia de **Shared Database, Shared Schema**, que é a mais eficiente no Supabase. Cada tabela terá uma coluna `institution_id` para filtrar os dados.

---

## Mudanças Propostas

### 1. Banco de Dados (Supabase/PostgreSQL)

#### [NEW] Tabela: institutions
Criar uma tabela central para as instituições.
- `id` (UUID, PK)
- `name` (TEXT)
- `slug` (TEXT, UNIQUE) - Ex: 'ong-esperanca'
- `logo_url` (TEXT)
- `settings` (JSONB) - Para cores customizadas, regras de negócio.

#### [MODIFY] Quase todas as tabelas
Adicionar `institution_id UUID REFERENCES institutions(id)` às tabelas:
- `profiles` (ou criar uma tabela de junção `institution_members`)
- `departments`
- `events`
- `posts` (Feed)

#### [MODIFY] Tabela: posts
Para o "Feed sem colisão mas relacionado":
- Adicionar coluna `visibility` (ENUM: 'INTERNAL', 'PARTNERS', 'GLOBAL').
- **INTERNAL**: Apenas membros da instituição vêm.
- **GLOBAL**: Aparece no feed de todos os usuários do app, independente da instituição.

#### [MODIFY] RLS (Row Level Security)
Atualizar as políticas para:
- `USING (institution_id = auth.jwt() ->> 'institution_id')` ou via uma função auxiliar `get_my_institution()`.

---

### 2. Lógica de Negócio e Feed Shared

#### Mecanismo de Feed Relacionado
Para evitar colisão mas permitir interação:
1. **Query Híbrida**: O feed carregará `WHERE institution_id = X OR visibility = 'GLOBAL'`.
2. **Contexto de Origem**: Cada post no feed exibirá a logo/nome da instituição de origem (ex: "Postado por João em *Instituição Esperança*").

---

### 3. Planos de Escalamento

| Nível | Foco | Estratégia |
| :--- | :--- | :--- |
| **Fase 1: Multi-Tenant Core** | Isolamento total | Adição de `institution_id` e RLS rigoroso. Cada instituição é uma bolha. |
| **Fase 2: Ecossistema** | Colaboração | Implementação da visibilidade 'GLOBAL' e perfis de instituições que podem ser seguidos. |
| **Fase 3: Enterprise** | Customização | Subdomínios (ex: `ong1.volly.com`), SSO (Single Sign-On) e relatórios agregados por holding. |

---

## Questões em Aberto (Open Questions)

1. **Um usuário pode ser voluntário em mais de uma instituição ao mesmo tempo?** 
   (Isso define se o `institution_id` fica direto no `profiles` ou em uma tabela `memberships`).

2. **Como será o cadastro de uma nova instituição?**
   (Via landing page self-service ou via painel Admin central?).

3. **No feed compartilhado, o que define se um post deve ser global?**
   (Opção do usuário no momento da postagem ou regra automática para certos tipos de eventos?).

---

## Plano de Verificação

### Testes Automatizados
- Scripts SQL para tentar acessar dados da Instituição A logado como usuário da Instituição B.
- Teste de performance de query no Feed com filtros cruzados.

### Verificação Manual
- Simulação de dois contextos (Browser A = Instituição 1, Browser B = Instituição 2) e validação do Feed e Departamentos.
