# 🔗 SHAREPOINT + MICROSOFT GRAPH SETUP

## 🔑 Permissões necessárias

Application Permissions:

- Sites.ReadWrite.All
- Files.ReadWrite.All

Obrigatório:
✅ Admin Consent

---

## 🔐 Autenticação

Client Credentials Flow

---

## 📍 Identificação

Você precisa:

- SITE_ID
- DRIVE_ID (document library)

---

## 📁 Estrutura recomendada

EduGest-PIM/
  ├── Opportunity_{ID}/
        ├── solutionPack.json
        ├── erp_payload.json
        ├── summary.md
        ├── recommendation.md

---

## 🧪 Fluxo esperado

1. Criar pasta
2. Subir arquivos JSON
3. Subir arquivos markdown

---

## 📌 Arquivos gerados

- solutionPack.json → completo
- erp_payload.json → integração ERP
- summary.md → resumo executivo
- recommendation.md → visão comercial

---

## ⚠️ Observações

- Sem Graph API não existe publicação real
- Validar permissões antes de implementar
- Usar Application (não delegated)

---

## ✅ Próximo passo técnico

Criar client Graph com:

- @azure/identity
- @microsoft/microsoft-graph-client