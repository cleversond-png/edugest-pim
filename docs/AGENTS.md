# 🧠 AGENTS GOVERNANCE — EDUGEST PIM

## 🎯 Objetivo
Garantir consistência, previsibilidade e execução eficiente dos agentes.

---

## 📏 REGRAS PRINCIPAIS

### 🔹 MatchingAgent
- Deve usar score (sem fallback)
- Deve sempre justificar recomendações
- Deve incluir dependências obrigatórias

---

### 🔹 ERP Mapper
- Deve usar produtos com erp_code válido
- Deve marcar blocked = true se houver "A VALIDAR"
- Nunca liberar payload incompleto

---

### 🔹 Orquestrador
- Ordem obrigatória:
  Diagnosis → Matching → ERP
- Não pode pular etapas

---

## 🔗 Integrações

- ERP: Sankhya
- Conteúdo: SharePoint (Microsoft Graph)
- API principal: /api/analyze

---

## ⚠️ PROIBIÇÕES

🚫 Não usar fallback sem score  
🚫 Não omitir dependências  
🚫 Não inventar dados  
🚫 Não quebrar contrato V4  

---

## 🧠 CONTEXTO OBRIGATÓRIO

Antes de qualquer execução, ler:

- /docs/CHECKPOINT.md
- /docs/STATE.json

---

## 🔄 CHECKPOINT MODE

Quando contexto < 30%:

1. Atualizar CHECKPOINT.md
2. Atualizar STATE.json
3. Resumir estado atual
4. Continuar execução

---

## 🔄 EXECUÇÃO MODULAR (CRÍTICO)

Para cada módulo:

1. Implementar código
2. Criar testes
3. Validar funcionamento
4. Só então avançar

🚫 Nunca desenvolver múltiplos módulos ao mesmo tempo  
🚫 Nunca pular validação  

---

## ✅ ESTABILIDADE

- Nunca quebrar testes existentes
- Corrigir erros antes de avançar
- Garantir integridade do pipeline

---

## 🤖 AUTONOMIA

### ✅ Pode decidir sozinho

- Estrutura de código
- Organização de arquivos
- Implementação técnica

---

### ⚠️ Deve consultar quando

- Alterar arquitetura
- Conflito de regras
- Risco de perda de dados

---

### 🧠 Regra de dúvida

- Escolher opção mais conservadora
- Registrar em DECISOES.md

---

## 📘 DECISION LOG

Arquivo obrigatório:

`/docs/DECISOES.md`

Formato:

- Data  
- Decisão  
- Motivo  
- Impacto  

---

## ✅ BOAS PRÁTICAS

- TypeScript
- Logs estruturados
- Validação de entrada
- Tratamento de erro
- Código modular