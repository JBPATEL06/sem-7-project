# AI Manager Skills Guide & Usage Instructions

This workspace contains **80 curated, production-focused skills** located under [`.agents/skills/`](file:///d:/Projets/sem-7-project/.agents/skills). These skills extend agent workflows with verified architectural patterns, security standards, testing recipes, and design system guidelines tailored directly to the **AI Manager (`dbci`)** stack.

---

## 🧭 Quick Decision Matrix: "What are you doing?"

| If your task is... | Primary Skill(s) to Invoke | Secondary / Supporting Skill |
|---|---|---|
| **Building / editing React UI components or screens** | [`react-patterns`](file:///d:/Projets/sem-7-project/.agents/skills/react-patterns/SKILL.md), [`react-best-practices`](file:///d:/Projets/sem-7-project/.agents/skills/react-best-practices/SKILL.md) | [`tailwind-patterns`](file:///d:/Projets/sem-7-project/.agents/skills/tailwind-patterns/SKILL.md), [`radix-ui-design-system`](file:///d:/Projets/sem-7-project/.agents/skills/radix-ui-design-system/SKILL.md) |
| **Styling with TailwindCSS v4 or theming** | [`tailwind-patterns`](file:///d:/Projets/sem-7-project/.agents/skills/tailwind-patterns/SKILL.md) | [`tailwind-design-system`](file:///d:/Projets/sem-7-project/.agents/skills/tailwind-design-system/SKILL.md) |
| **Working on OpenPencil Studio / Figma integration** | [`stitch-ui-design`](file:///d:/Projets/sem-7-project/.agents/skills/stitch-ui-design/SKILL.md), [`design-md`](file:///d:/Projets/sem-7-project/.agents/skills/design-md/SKILL.md) | [`ui-ux-designer`](file:///d:/Projets/sem-7-project/.agents/skills/ui-ux-designer/SKILL.md), [`ui-visual-validator`](file:///d:/Projets/sem-7-project/.agents/skills/ui-visual-validator/SKILL.md) |
| **Managing React global / complex state** | [`react-state-management`](file:///d:/Projets/sem-7-project/.agents/skills/react-state-management/SKILL.md) | [`zustand-store-ts`](file:///d:/Projets/sem-7-project/.agents/skills/zustand-store-ts/SKILL.md) |
| **Writing TypeScript types, generics, or schemas** | [`typescript-advanced-types`](file:///d:/Projets/sem-7-project/.agents/skills/typescript-advanced-types/SKILL.md) | [`typescript-expert`](file:///d:/Projets/sem-7-project/.agents/skills/typescript-expert/SKILL.md), [`typescript-pro`](file:///d:/Projets/sem-7-project/.agents/skills/typescript-pro/SKILL.md) |
| **Building Express routes, middleware, or controllers** | [`nodejs-backend-patterns`](file:///d:/Projets/sem-7-project/.agents/skills/nodejs-backend-patterns/SKILL.md) | [`nodejs-best-practices`](file:///d:/Projets/sem-7-project/.agents/skills/nodejs-best-practices/SKILL.md), [`cc-skill-backend-patterns`](file:///d:/Projets/sem-7-project/.agents/skills/cc-skill-backend-patterns/SKILL.md) |
| **Designing REST APIs, contracts, or endpoints** | [`api-design-principles`](file:///d:/Projets/sem-7-project/.agents/skills/api-design-principles/SKILL.md) | [`api-patterns`](file:///d:/Projets/sem-7-project/.agents/skills/api-patterns/SKILL.md), [`api-documentation-generator`](file:///d:/Projets/sem-7-project/.agents/skills/api-documentation-generator/SKILL.md) |
| **Executing or optimizing SQL queries / SQLite** | [`sql-optimization-patterns`](file:///d:/Projets/sem-7-project/.agents/skills/sql-optimization-patterns/SKILL.md) | [`sql-pro`](file:///d:/Projets/sem-7-project/.agents/skills/sql-pro/SKILL.md) |
| **PostgreSQL schemas, queries, or indexes** | [`postgresql`](file:///d:/Projets/sem-7-project/.agents/skills/postgresql/SKILL.md) | [`postgres-best-practices`](file:///d:/Projets/sem-7-project/.agents/skills/postgres-best-practices/SKILL.md) |
| **Database migrations & schema versioning** | [`database-migration`](file:///d:/Projets/sem-7-project/.agents/skills/database-migration/SKILL.md) | [`database-migrations-migration-observability`](file:///d:/Projets/sem-7-project/.agents/skills/database-migrations-migration-observability/SKILL.md), [`database-design`](file:///d:/Projets/sem-7-project/.agents/skills/database-design/SKILL.md) |
| **Writing Vitest / Jest unit tests** | [`testing-patterns`](file:///d:/Projets/sem-7-project/.agents/skills/testing-patterns/SKILL.md), [`javascript-testing-patterns`](file:///d:/Projets/sem-7-project/.agents/skills/javascript-testing-patterns/SKILL.md) | [`unit-testing-test-generate`](file:///d:/Projets/sem-7-project/.agents/skills/unit-testing-test-generate/SKILL.md) |
| **TDD feature implementation (Red-Green-Refactor)** | [`test-driven-development`](file:///d:/Projets/sem-7-project/.agents/skills/test-driven-development/SKILL.md), [`tdd-workflow`](file:///d:/Projets/sem-7-project/.agents/skills/tdd-workflow/SKILL.md) | [`tdd-workflows-tdd-red`](file:///d:/Projets/sem-7-project/.agents/skills/tdd-workflows-tdd-red/SKILL.md), [`tdd-workflows-tdd-green`](file:///d:/Projets/sem-7-project/.agents/skills/tdd-workflows-tdd-green/SKILL.md), [`tdd-workflows-tdd-refactor`](file:///d:/Projets/sem-7-project/.agents/skills/tdd-workflows-tdd-refactor/SKILL.md) |
| **E2E browser testing / Playwright** | [`playwright-skill`](file:///d:/Projets/sem-7-project/.agents/skills/playwright-skill/SKILL.md) | [`webapp-testing`](file:///d:/Projets/sem-7-project/.agents/skills/webapp-testing/SKILL.md), [`e2e-testing-patterns`](file:///d:/Projets/sem-7-project/.agents/skills/e2e-testing-patterns/SKILL.md) |
| **Debugging an error, crash, or unexpected behavior** | [`systematic-debugging`](file:///d:/Projets/sem-7-project/.agents/skills/systematic-debugging/SKILL.md) | Global `debug_issue` skill |
| **Reviewing code or preparing PR** | [`code-review-excellence`](file:///d:/Projets/sem-7-project/.agents/skills/code-review-excellence/SKILL.md), [`requesting-code-review`](file:///d:/Projets/sem-7-project/.agents/skills/requesting-code-review/SKILL.md) | [`receiving-code-review`](file:///d:/Projets/sem-7-project/.agents/skills/receiving-code-review/SKILL.md) |
| **Handling API keys, secrets, or encryption** | [`secrets-management`](file:///d:/Projets/sem-7-project/.agents/skills/secrets-management/SKILL.md) | [`auth-implementation-patterns`](file:///d:/Projets/sem-7-project/.agents/skills/auth-implementation-patterns/SKILL.md), [`api-security-best-practices`](file:///d:/Projets/sem-7-project/.agents/skills/api-security-best-practices/SKILL.md) |
| **Security audit & vulnerability scanning** | [`top-web-vulnerabilities`](file:///d:/Projets/sem-7-project/.agents/skills/top-web-vulnerabilities/SKILL.md) | [`vulnerability-scanner`](file:///d:/Projets/sem-7-project/.agents/skills/vulnerability-scanner/SKILL.md), Global `security_audit` |
| **Building or integrating Model Context Protocol (MCP)** | [`mcp-builder`](file:///d:/Projets/sem-7-project/.agents/skills/mcp-builder/SKILL.md), [`mcp-builder-ms`](file:///d:/Projets/sem-7-project/.agents/skills/mcp-builder-ms/SKILL.md) | [`tool-design`](file:///d:/Projets/sem-7-project/.agents/skills/tool-design/SKILL.md) |
| **Crafting AI agent prompts or LLM architecture** | [`prompt-engineering`](file:///d:/Projets/sem-7-project/.agents/skills/prompt-engineering/SKILL.md), [`llm-app-patterns`](file:///d:/Projets/sem-7-project/.agents/skills/llm-app-patterns/SKILL.md) | [`prompt-engineer`](file:///d:/Projets/sem-7-project/.agents/skills/prompt-engineer/SKILL.md), [`prompt-engineering-patterns`](file:///d:/Projets/sem-7-project/.agents/skills/prompt-engineering-patterns/SKILL.md) |
| **Configuring Turborepo, workspace builds or cache** | [`turborepo-caching`](file:///d:/Projets/sem-7-project/.agents/skills/turborepo-caching/SKILL.md) | [`monorepo-architect`](file:///d:/Projets/sem-7-project/.agents/skills/monorepo-architect/SKILL.md), [`monorepo-management`](file:///d:/Projets/sem-7-project/.agents/skills/monorepo-management/SKILL.md) |
| **Containerizing services or Docker orchestration** | [`docker-expert`](file:///d:/Projets/sem-7-project/.agents/skills/docker-expert/SKILL.md) | [`github-actions-templates`](file:///d:/Projets/sem-7-project/.agents/skills/github-actions-templates/SKILL.md) |
| **Planning complex features or multi-step work** | [`planning-with-files`](file:///d:/Projets/sem-7-project/.agents/skills/planning-with-files/SKILL.md), [`plan-writing`](file:///d:/Projets/sem-7-project/.agents/skills/plan-writing/SKILL.md) | [`subagent-driven-development`](file:///d:/Projets/sem-7-project/.agents/skills/subagent-driven-development/SKILL.md) |
| **Verifying feature completion before claiming done** | [`verification-before-completion`](file:///d:/Projets/sem-7-project/.agents/skills/verification-before-completion/SKILL.md) | Mandatory Project Rules Section 0.5 |

---

## 📚 Detailed Domain Breakdown

### 1. Frontend, React 18 & Design Studio
Use these skills when developing in `packages/ai-manager-web/src/` (components, pages, hooks, styling).

- [`react-patterns`](file:///d:/Projets/sem-7-project/.agents/skills/react-patterns/SKILL.md): Composition, custom hook extraction, container/presentational split, TypeScript props typing.
- [`react-best-practices`](file:///d:/Projets/sem-7-project/.agents/skills/react-best-practices/SKILL.md): Render performance, memoization (`useMemo`, `useCallback`), preventing re-render storms.
- [`react-ui-patterns`](file:///d:/Projets/sem-7-project/.agents/skills/react-ui-patterns/SKILL.md): Data fetching states (`loading`, `error`, `empty`, `success`), skeleton loaders, error boundaries.
- [`react-state-management`](file:///d:/Projets/sem-7-project/.agents/skills/react-state-management/SKILL.md): Context vs store selection, derived state, state colocation.
- [`react-modernization`](file:///d:/Projets/sem-7-project/.agents/skills/react-modernization/SKILL.md): Modern React 18 patterns, hooks lifecycle, concurrency.
- [`tailwind-patterns`](file:///d:/Projets/sem-7-project/.agents/skills/tailwind-patterns/SKILL.md): Tailwind CSS v4 CSS-first `@theme` configuration, token mapping, dark mode variants.
- [`tailwind-design-system`](file:///d:/Projets/sem-7-project/.agents/skills/tailwind-design-system/SKILL.md): Reusable component token systems, layout containers, typography hierarchies.
- [`radix-ui-design-system`](file:///d:/Projets/sem-7-project/.agents/skills/radix-ui-design-system/SKILL.md): Accessible headless primitives (modals, dropdowns, tooltips, tabs).
- [`stitch-ui-design`](file:///d:/Projets/sem-7-project/.agents/skills/stitch-ui-design/SKILL.md): Designing UI layouts, screen flows, and interactive mockups.
- [`design-md`](file:///d:/Projets/sem-7-project/.agents/skills/design-md/SKILL.md): Semantic design system documentation (`DESIGN.md`).
- [`ui-skills`](file:///d:/Projets/sem-7-project/.agents/skills/ui-skills/SKILL.md): Opinionated UI constraints to avoid generic designs.
- [`ui-ux-designer`](file:///d:/Projets/sem-7-project/.agents/skills/ui-ux-designer/SKILL.md): Design aesthetic refinement, spacing, micro-interactions, color harmony.
- [`ui-visual-validator`](file:///d:/Projets/sem-7-project/.agents/skills/ui-visual-validator/SKILL.md): Visual verification of layouts, alignment, and theme responsiveness.
- [`zustand-store-ts`](file:///d:/Projets/sem-7-project/.agents/skills/zustand-store-ts/SKILL.md): Type-safe store creation with selector subscriptions.

> [!IMPORTANT]
> **OpenPencil / Figma Rule**: Per project rules in `AGENTS.md`, AI Manager Figma functionality MUST 100% utilize `@open-pencil/*` code, never custom canvas engines.

---

### 2. TypeScript & Code Standards
Use these skills to enforce clean, robust code across all packages.

- [`typescript-expert`](file:///d:/Projets/sem-7-project/.agents/skills/typescript-expert/SKILL.md): Type safety best practices, interface design, type guards.
- [`typescript-advanced-types`](file:///d:/Projets/sem-7-project/.agents/skills/typescript-advanced-types/SKILL.md): Conditional types, generics, template literals, union discrimination.
- [`typescript-pro`](file:///d:/Projets/sem-7-project/.agents/skills/typescript-pro/SKILL.md): Idiomatic TypeScript patterns and build configurations (`tsconfig`).
- [`modern-javascript-patterns`](file:///d:/Projets/sem-7-project/.agents/skills/modern-javascript-patterns/SKILL.md): ES2022+ features, async/await pipelines, iterators, destructuring.
- [`javascript-mastery`](file:///d:/Projets/sem-7-project/.agents/skills/javascript-mastery/SKILL.md): Deep engine semantics, event loop, memory closures.
- [`javascript-pro`](file:///d:/Projets/sem-7-project/.agents/skills/javascript-pro/SKILL.md): Functional and object-oriented JS programming patterns.
- [`cc-skill-coding-standards`](file:///d:/Projets/sem-7-project/.agents/skills/cc-skill-coding-standards/SKILL.md): Universal readability, formatting, and linting rules.
- [`cc-skill-frontend-patterns`](file:///d:/Projets/sem-7-project/.agents/skills/cc-skill-frontend-patterns/SKILL.md): Frontend architecture patterns and folder organization.
- [`clean-code`](file:///d:/Projets/sem-7-project/.agents/skills/clean-code/SKILL.md): Robert C. Martin clean code principles (SOLID, single responsibility, meaningful naming).

---

### 3. Backend, Node.js & API Engineering
Use these skills when developing in `packages/ai-manager-web/server/` or backend core packages.

- [`nodejs-backend-patterns`](file:///d:/Projets/sem-7-project/.agents/skills/nodejs-backend-patterns/SKILL.md): Middleware pipelines, error handlers, async controller wrappers.
- [`nodejs-best-practices`](file:///d:/Projets/sem-7-project/.agents/skills/nodejs-best-practices/SKILL.md): Production architecture, graceful shutdowns, uncaught exceptions handling.
- [`cc-skill-backend-patterns`](file:///d:/Projets/sem-7-project/.agents/skills/cc-skill-backend-patterns/SKILL.md): Server-side structuring, separation of concerns.
- [`api-design-principles`](file:///d:/Projets/sem-7-project/.agents/skills/api-design-principles/SKILL.md): RESTful URLs, idempotent methods, HTTP status codes, consistent JSON envelopes.
- [`api-patterns`](file:///d:/Projets/sem-7-project/.agents/skills/api-patterns/SKILL.md): Pagination, filtering, batch processing, rate-limit responses.
- [`api-documentation-generator`](file:///d:/Projets/sem-7-project/.agents/skills/api-documentation-generator/SKILL.md): Documenting endpoints, schemas, parameters, and responses.
- [`api-security-best-practices`](file:///d:/Projets/sem-7-project/.agents/skills/api-security-best-practices/SKILL.md): Parameter validation, CORS hardening, header injection protection.

---

### 4. Database, SQL, PostgreSQL & Migrations
Core domain of the AI Manager platform (`dbci`).

- [`database-design`](file:///d:/Projets/sem-7-project/.agents/skills/database-design/SKILL.md): Normalization, relational modeling, entity relationships, foreign keys.
- [`database-migration`](file:///d:/Projets/sem-7-project/.agents/skills/database-migration/SKILL.md): Zero-downtime migrations, schema evolution, rollback scripts.
- [`database-migrations-migration-observability`](file:///d:/Projets/sem-7-project/.agents/skills/database-migrations-migration-observability/SKILL.md): CDC, migration telemetry, change auditing.
- [`sql-optimization-patterns`](file:///d:/Projets/sem-7-project/.agents/skills/sql-optimization-patterns/SKILL.md): `EXPLAIN QUERY PLAN`, index strategies (composite, covering), N+1 query elimination.
- [`sql-pro`](file:///d:/Projets/sem-7-project/.agents/skills/sql-pro/SKILL.md): Advanced SQL syntax, subqueries, window functions, CTEs.
- [`postgresql`](file:///d:/Projets/sem-7-project/.agents/skills/postgresql/SKILL.md): Postgres-specific data types (JSONB, UUID), constraints, indexing.
- [`postgres-best-practices`](file:///d:/Projets/sem-7-project/.agents/skills/postgres-best-practices/SKILL.md): Connection pooling (`pg`), transactions, query performance tuning.
- [`nosql-expert`](file:///d:/Projets/sem-7-project/.agents/skills/nosql-expert/SKILL.md): Document store patterns (MongoDB, Mongoose schemas, Atlas search).

---

### 5. Testing, QA, Playwright & Debugging
Use for all verification, test generation, and bug fixing.

- [`testing-patterns`](file:///d:/Projets/sem-7-project/.agents/skills/testing-patterns/SKILL.md): Test factories, mocking strategies, test isolation.
- [`javascript-testing-patterns`](file:///d:/Projets/sem-7-project/.agents/skills/javascript-testing-patterns/SKILL.md): Vitest / Jest configuration, async testing, assertion patterns.
- [`unit-testing-test-generate`](file:///d:/Projets/sem-7-project/.agents/skills/unit-testing-test-generate/SKILL.md): Edge-case coverage, happy path, boundary condition tests.
- [`test-driven-development`](file:///d:/Projets/sem-7-project/.agents/skills/test-driven-development/SKILL.md): TDD philosophy and workflow execution.
- [`tdd-workflow`](file:///d:/Projets/sem-7-project/.agents/skills/tdd-workflow/SKILL.md): Standard Red-Green-Refactor loop.
- [`tdd-workflows-tdd-red`](file:///d:/Projets/sem-7-project/.agents/skills/tdd-workflows-tdd-red/SKILL.md): Formulating failing test specifications before writing code.
- [`tdd-workflows-tdd-green`](file:///d:/Projets/sem-7-project/.agents/skills/tdd-workflows-tdd-green/SKILL.md): Minimal implementation required to pass red tests.
- [`tdd-workflows-tdd-refactor`](file:///d:/Projets/sem-7-project/.agents/skills/tdd-workflows-tdd-refactor/SKILL.md): Code cleanup without changing external behavior.
- [`tdd-workflows-tdd-cycle`](file:///d:/Projets/sem-7-project/.agents/skills/tdd-workflows-tdd-cycle/SKILL.md): Cycle orchestration across multi-step features.
- [`playwright-skill`](file:///d:/Projets/sem-7-project/.agents/skills/playwright-skill/SKILL.md): Automated browser testing, selectors, assertions, recording.
- [`webapp-testing`](file:///d:/Projets/sem-7-project/.agents/skills/webapp-testing/SKILL.md): Web testing workflows against local dev servers.
- [`e2e-testing-patterns`](file:///d:/Projets/sem-7-project/.agents/skills/e2e-testing-patterns/SKILL.md): Resilient end-to-end user journeys and flake reduction.
- [`systematic-debugging`](file:///d:/Projets/sem-7-project/.agents/skills/systematic-debugging/SKILL.md): Scientific root-cause hypothesis, binary search isolation, fix verification.
- [`lint-and-validate`](file:///d:/Projets/sem-7-project/.agents/skills/lint-and-validate/SKILL.md): Automated static checking, ESLint rules, and build validation.

---

### 6. Architecture, Monorepo & CI/CD
Use when touching workspace structure, build scripts, Docker, or GitHub Actions.

- [`turborepo-caching`](file:///d:/Projets/sem-7-project/.agents/skills/turborepo-caching/SKILL.md): Turborepo pipeline configuration, remote & local build cache optimization.
- [`monorepo-architect`](file:///d:/Projets/sem-7-project/.agents/skills/monorepo-architect/SKILL.md): Package boundary definitions, workspace dependencies, shared libraries.
- [`monorepo-management`](file:///d:/Projets/sem-7-project/.agents/skills/monorepo-management/SKILL.md): Package versioning, scripts orchestration, monorepo refactoring.
- [`architecture-patterns`](file:///d:/Projets/sem-7-project/.agents/skills/architecture-patterns/SKILL.md): Clean Architecture, Hexagonal / Ports-and-Adapters, DDD principles.
- [`docker-expert`](file:///d:/Projets/sem-7-project/.agents/skills/docker-expert/SKILL.md): Multi-stage Dockerfiles, image minimization, `docker-compose` networks.
- [`github-actions-templates`](file:///d:/Projets/sem-7-project/.agents/skills/github-actions-templates/SKILL.md): Production CI/CD pipelines, automated test runs, artifact storage.
- [`git-advanced-workflows`](file:///d:/Projets/sem-7-project/.agents/skills/git-advanced-workflows/SKILL.md): Interactive rebase, cherry-pick, worktree management, conflict resolution.
- [`code-review-excellence`](file:///d:/Projets/sem-7-project/.agents/skills/code-review-excellence/SKILL.md): High-standard PR reviews, constructive feedback, anti-pattern detection.
- [`requesting-code-review`](file:///d:/Projets/sem-7-project/.agents/skills/requesting-code-review/SKILL.md): Preparing PR diffs, self-review checklists, verification reports.
- [`receiving-code-review`](file:///d:/Projets/sem-7-project/.agents/skills/receiving-code-review/SKILL.md): Addressing reviewer comments with technical rigor without blind reverts.

---

### 7. Security, Auth & Secrets Management
Mandatory checks for authentication, authorization, or sensitive data.

- [`secrets-management`](file:///d:/Projets/sem-7-project/.agents/skills/secrets-management/SKILL.md): Storing credentials, `.env` hygiene, AES-256 encryption at rest.
- [`auth-implementation-patterns`](file:///d:/Projets/sem-7-project/.agents/skills/auth-implementation-patterns/SKILL.md): JWT tokens, password hashing (bcrypt), RBAC (User vs Admin), session guards.
- [`top-web-vulnerabilities`](file:///d:/Projets/sem-7-project/.agents/skills/top-web-vulnerabilities/SKILL.md): OWASP Top 10 prevention (SQL injection, XSS, CSRF, broken access control).
- [`vulnerability-scanner`](file:///d:/Projets/sem-7-project/.agents/skills/vulnerability-scanner/SKILL.md): Static code scanning for secrets exposure and insecure dependencies.

---

### 8. AI Platform, MCP & LLM Agent Architecture
Directly powers AI Manager's intelligent features and MCP ecosystem.

- [`mcp-builder`](file:///d:/Projets/sem-7-project/.agents/skills/mcp-builder/SKILL.md): Building Model Context Protocol servers with JSON-RPC schemas and resource tools.
- [`mcp-builder-ms`](file:///d:/Projets/sem-7-project/.agents/skills/mcp-builder-ms/SKILL.md): Multi-server MCP architectures and protocol bridges.
- [`llm-app-patterns`](file:///d:/Projets/sem-7-project/.agents/skills/llm-app-patterns/SKILL.md): RAG architectures, streaming responses, prompt IDE designs, context injection.
- [`prompt-engineering`](file:///d:/Projets/sem-7-project/.agents/skills/prompt-engineering/SKILL.md): System prompt optimization, Chain-of-Thought, few-shot conditioning.
- [`prompt-engineer`](file:///d:/Projets/sem-7-project/.agents/skills/prompt-engineer/SKILL.md): Prompt conversion using formal frameworks (RTF, RISE, STAR).
- [`prompt-engineering-patterns`](file:///d:/Projets/sem-7-project/.agents/skills/prompt-engineering-patterns/SKILL.md): Production prompting patterns for deterministic output formatting (JSON schemas).
- [`agent-memory-mcp`](file:///d:/Projets/sem-7-project/.agents/skills/agent-memory-mcp/SKILL.md): Hybrid memory systems for agent state persistence.
- [`agent-memory-systems`](file:///d:/Projets/sem-7-project/.agents/skills/agent-memory-systems/SKILL.md): Short-term vs long-term vector/indexed knowledge architectures.
- [`multi-agent-patterns`](file:///d:/Projets/sem-7-project/.agents/skills/multi-agent-patterns/SKILL.md): Orchestrator, peer-to-peer, and hierarchical multi-agent coordination.
- [`tool-design`](file:///d:/Projets/sem-7-project/.agents/skills/tool-design/SKILL.md): Designing agent tools that minimize hallucination and maximize ergonomics.

---

### 9. Planning & Verification Workflows
Ensures strict compliance with the **Completion Gate (Rule Section 0.5)**.

- [`planning-with-files`](file:///d:/Projets/sem-7-project/.agents/skills/planning-with-files/SKILL.md): Manus-style planning with structured files for complex tasks.
- [`plan-writing`](file:///d:/Projets/sem-7-project/.agents/skills/plan-writing/SKILL.md): Structured implementation breakdowns with explicit acceptance criteria.
- [`subagent-driven-development`](file:///d:/Projets/sem-7-project/.agents/skills/subagent-driven-development/SKILL.md): Delegating independent steps to autonomous subagents.
- [`verification-before-completion`](file:///d:/Projets/sem-7-project/.agents/skills/verification-before-completion/SKILL.md): Strictly verifying running processes before declaring any task done.

---

## 🛠️ How to Invoke Skills

1. **Before any non-trivial task**: Review the [Decision Matrix](#-quick-decision-matrix-what-are-you-doing) above.
2. **Open the skill**: Use `view_file` to read the corresponding `SKILL.md` (e.g. `view_file` on [react-patterns](file:///d:/Projets/sem-7-project/.agents/skills/react-patterns/SKILL.md)).
3. **Execute following the skill's instructions**: Apply the documented conventions, patterns, and tests.
4. **Adhere to the Completion Gate**: Run real verification commands and paste terminal output before claiming completion.
