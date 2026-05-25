# 🔧 Correção de Deployment — EduGest-PIM

**Data:** 2026-05-24  
**Status:** 🔄 Em processo de correção

---

## Problemas Identificados e Corrigidos

### 1. ❌ Servidor escutando em localhost
**Problema:** Fastify configurado para escutar em `127.0.0.1:3000`  
**Causa:** `apps/api/src/server.ts` linha 16 estava hardcoded  
**Solução:** Mudado para `0.0.0.0:3000` para aceitar conexões externas

```typescript
// Antes
const HOST = process.env.HOST || '127.0.0.1'

// Depois
const HOST = process.env.HOST || '0.0.0.0'
```

---

### 2. ❌ apps/web como submodule inválido
**Problema:** GitHub Actions falhava com `npm error No workspaces found: --workspace=web`  
**Causa:** `apps/web` estava marcado como submodule do git sem configuração válida  
**Solução:** Normalizado como diretório regular no repositório

```bash
git rm --cached apps/web
rm -rf apps/web/.git
git add apps/web/
```

---

## Commits Realizados

| Commit | Mensagem | Status |
|--------|----------|--------|
| `bce8451` | fix: change server host from 127.0.0.1 to 0.0.0.0 | ✅ Completo |
| `2ab315d` | fix: normalize apps/web from submodule to regular directory | ✅ Completo |

---

## Próximas Etapas

1. **GitHub Actions em execução** → Docker build + push ACR + restart container
2. **Teste da aplicação** → Validar endpoints HTTP
3. **DNS apontando** (opcional) → Configure pmi.plantaoti.com.br

---

## URLs de Teste

- **Health Check:** `http://20.232.74.136:3000/api/health`
- **Analyze Form:** `http://20.232.74.136:3000/analyze`
- **Publish Endpoint:** `POST http://20.232.74.136:3000/api/publish`

---

**Aguardando:** Container reiniciar com nova imagem (~5 minutos)

