# EduGest-PIM

Sistema de análise e recomendação automática de soluções Microsoft para oportunidades de vendas.

## 🎯 Arquitetura

**Monorepo** com:
- `apps/api` — Backend Fastify com orquestrador de agentes IA
- `apps/web` — Frontend Next.js 14 com análise visual
- `packages/core` — Tipos TypeScript compartilhados

## 🚀 Quick Start

### Desenvolvimento Local

```bash
# Instalar dependências
npm ci

# API (porta 3000)
npm run dev --workspace=@edugest-pim/api

# Web (porta 3001 em outro terminal)
PORT=3001 npm run dev --workspace=web
```

Acesse: `http://localhost:3001/analyze`

### Build Produção

```bash
npm run build --workspace=@edugest-pim/api
npm run build --workspace=web

# Testar startup
node start.js
```

## 📦 Deployment

**Automático via GitHub Actions** → Azure App Service

Veja [DEPLOYMENT.md](./DEPLOYMENT.md) para setup completo.

### URL de Produção

`https://pmi.plantaoti.com.br`

## 🏗️ Estrutura

```
edugest-pim/
├── apps/
│   ├── api/              # Fastify backend
│   │   ├── src/
│   │   ├── tests/
│   │   └── package.json
│   │
│   └── web/              # Next.js frontend
│       ├── app/
│       ├── components/
│       ├── lib/
│       └── package.json
│
├── packages/
│   └── core/             # Types compartilhados
│
├── Dockerfile            # Build multi-stage
├── start.js              # Entry point produção
├── DEPLOYMENT.md         # Setup Azure + GitHub Actions
└── package.json          # Workspace root
```

## 🔧 Tecnologias

| Camada | Stack |
|--------|-------|
| **Frontend** | Next.js 14, React 19, TypeScript, Tailwind CSS |
| **Backend** | Fastify, TypeScript, Pino logger |
| **IA** | Claude API + Anthropic SDK |
| **BD** | Prisma + SharePoint (Microsoft Graph) |
| **DevOps** | Docker, GitHub Actions, Azure App Service |

## 🧪 Testes

```bash
# API
npm run test --workspace=@edugest-pim/api

# Coverage
npm run test:coverage --workspace=@edugest-pim/api
```

## 📝 Licença

ISC

## 👤 Autor

Cleverson Drobnievski <cleversond@gmail.com>
