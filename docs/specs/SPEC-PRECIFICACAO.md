# SPEC-PRECIFICACAO — Precificação de Produtos (EduGest-PIM)

> **Objetivo**: definir os campos de precificação que entram no cadastro de produto (Fase 1) e documentar o que fica reservado para a calculadora dinâmica (Fase 2 — produtos Azure/SQL com preço variável).
>
> Referência:
> - `SPEC-PRODUTO.md` — modelo de cadastro
> - Portfólio atual: SaaS BB, Serviços Profissionais, Licenciamento MS, Crédito

---

## 0) Princípios

### 0.1 Fase 1 — Referência, não calculadora
Os campos de precificação da Fase 1 **informam** o comercial. Não calculam automaticamente. O objetivo é que o comercial saiba o preço base sem precisar ligar para alguém.

### 0.2 Preço por modelo de contratação
O preço varia por `modeloContratado` (`SUBSCRICAO`, `PONTUAL`, `CREDITO`, `CONSUMO`). Cada modelo tem campos diferentes.

### 0.3 Faixa por perfil de cliente
Produtos SaaS BB têm preço por faixa de tamanho de cliente (pequena, média, grande). O cadastro deve registrar essas faixas.

### 0.4 Fase 2 reservada para Azure/SQL
Produtos com consumo variável (Azure, SQL, Copilot por usuário) terão calculadora dinâmica na Fase 2. Por ora, entram com preço base estimado.

---

## 1) Bloco de Precificação — Fase 1

Campos adicionados ao modelo `Product` (complementam `SPEC-PRODUTO.md`):

### 1.1 Campos base (todos os produtos)

| Campo | Tipo | Descrição |
|---|---|---|
| `precificacaoStatus` | enum | `PUBLICADO` / `RASCUNHO` / `A_REVISAR` |
| `moeda` | string | `BRL` (padrão) |
| `precoBaseUnitario` | decimal | preço unitário de referência |
| `margemSugerida` | decimal | % de margem sugerida pelo produto |
| `descontoMaximo` | decimal | % máximo de desconto permitido |
| `requerAprovacaoDesconto` | boolean | acima do desconto máximo, requer aprovação |
| `observacoesPrecificacao` | text | regras especiais, exceções, como negociar |
| `precificacaoFase2` | boolean | `true` = calculadora dinâmica (Fase 2) |

### 1.2 Faixas por perfil (SaaS BB e Licenciamento)

```typescript
type FaixaPreco = {
  perfil: 'ESCOLA_PEQUENA' | 'ESCOLA_MEDIA' | 'REDE_GRANDE'
  qtdMinima: number
  qtdMaxima: number | null    // null = sem limite superior
  precoUnitario: decimal
  precoMensalTotal?: decimal  // calculado: qtd * precoUnitario
  descricaoFaixa: string      // ex: "1–200 alunos: R$ 5,00/aluno/mês"
}
```

Campo no produto:
```
faixasPreco: FaixaPreco[]
```

### 1.3 Campos para Subscrição (SaaS / Licenciamento)

| Campo | Tipo | Descrição |
|---|---|---|
| `precoMensalBase` | decimal | mensalidade base |
| `precoAnualBase` | decimal | anual base (geralmente com desconto) |
| `descontoAnual` | decimal | % de desconto para pagamento anual |
| `unidadeCobranca` | enum | `POR_ALUNO` / `POR_USUARIO` / `POR_ESCOLA` / `FIXO` |
| `minimoContratavel` | number | mínimo de unidades por contrato |

### 1.4 Campos para Pontual (Serviços Profissionais)

| Campo | Tipo | Descrição |
|---|---|---|
| `precoMinimoProjetoR` | decimal | valor mínimo de projeto |
| `precoMaximoProjetoR` | decimal | valor máximo de projeto (referência) |
| `precoHoraR` | decimal | se cobrado por hora |
| `estimativaHorasProjeto` | number | horas estimadas (médio projeto) |
| `composicaoPreco` | text | como o preço é composto (horas, fases, etc.) |

### 1.5 Campos para Crédito / Booking

| Campo | Tipo | Descrição |
|---|---|---|
| `precoHoraCredito` | decimal | valor da hora de crédito |
| `pacoteMinHoras` | number | mínimo de horas por pacote |
| `pacotesDisponiveis` | PacoteCredito[] | pacotes padrão |

```typescript
type PacoteCredito = {
  nome: string          // ex: "Pacote 10h"
  horas: number
  precoTotal: decimal
  desconto: decimal     // % em relação ao preço avulso
}
```

---

## 2) Campos por produto do portfólio atual

| Produto | Modelo | Unidade | Campo principal |
|---|---|---|---|
| Integrador Big Brain | Subscrição | Por aluno/mês | `precoMensalBase` + `faixasPreco` |
| Agenda Inteligente | Subscrição | Por aluno/mês | `precoMensalBase` + `faixasPreco` |
| Relatórios Inteligentes | Subscrição | Por escola/mês | `precoMensalBase` |
| Centro de Operações | Subscrição | Por escola/mês | `precoMensalBase` + `faixasPreco` |
| Hub Docente | Subscrição | Por usuário/mês | `precoMensalBase` |
| Insights | Subscrição | Por escola/mês | `precoMensalBase` |
| Portal Institucional | Pontual | Por projeto | `precoMinimoProjetoR` + `precoMaximoProjetoR` |
| Intranet SaaS | Pontual | Por projeto | `precoMinimoProjetoR` + `precoMaximoProjetoR` |
| Formação Microsoft | Pontual | Por turma/hora | `precoHoraR` |
| Suporte M365 | Subscrição | Por escola/mês | `precoMensalBase` |
| Consultoria | Crédito | Por hora | `precoHoraCredito` |
| Booking de Horas | Crédito | Por hora | `precoHoraCredito` + `pacotesDisponiveis` |
| M365 A1/A3/A5 | Licença MS | Por licença/mês | `precoMensalBase` (fase 2) |
| Copilot M365 | Licença MS | Por usuário/mês | `precoMensalBase` (fase 2) |

> Licenciamento Microsoft (`A1`, `A3`, `A5`, `Copilot`) entra na Fase 2 como calculadora dinâmica — o preço varia com promoções Microsoft e número de licenças. Na Fase 1, entram com `precificacaoFase2 = true` e preço de referência.

---

## 3) Visão do Comercial.md (precificação)

Os campos de precificação alimentam uma seção no `{Produto}-Comercial.md`:

```markdown
## Precificação de Referência

**Modelo**: Subscrição mensal por aluno

| Faixa | Qtd. Alunos | Preço/aluno/mês | Mínimo mensal |
|-------|-------------|-----------------|---------------|
| Escola Pequena | 1–500 | R$ 5,00 | R$ 500,00 |
| Escola Média | 501–2.000 | R$ 4,00 | R$ 2.000,00 |
| Rede / Grande | 2.001+ | Negociar | — |

**Desconto máximo**: 15% (acima disso, requer aprovação da diretoria)
**Desconto anual**: 10% para pagamento anual

> ⚠️ Estes valores são de referência. Consulte o gestor comercial para propostas com desconto acima do limite.
```

---

## 4) Reservas para Fase 2

Os seguintes cenários **não entram na Fase 1** mas devem ter campo `precificacaoFase2 = true` no cadastro para sinalizar que a lógica está reservada:

### 4.1 Licenciamento Microsoft (Azure/M365)
- Preço varia com promoções Microsoft (CSP)
- Desconto por volume de licenças
- Coexistência de planos (A1/A3/A5)
- **Fase 2**: calculadora que puxa preço atualizado via API Microsoft Partner Center

### 4.2 Consumo Azure / SQL
- Produtos que dependem de recursos Azure (Storage, SQL, Functions)
- Preço varia com uso real
- **Fase 2**: estimativa de consumo baseada em porte do cliente

### 4.3 Bundle dinâmico
- Desconto automático quando produto X + Y são vendidos juntos
- **Fase 2**: regras de bundle configuráveis por par de produtos

### 4.4 Aprovação de desconto
- Fluxo de aprovação quando desconto > `descontoMaximo`
- **Fase 2**: workflow com notificação para gestor

---

## 5) Campos no formulário de cadastro (UI)

### Seção "Precificação" no formulário de produto

```
┌─────────────────────────────────────────────┐
│  Precificação                               │
├─────────────────────────────────────────────┤
│  Status: ○ Publicado  ○ Rascunho  ○ Revisar │
│                                             │
│  Modelo de cobrança: [Subscrição ▼]         │
│  Unidade: [Por aluno/mês ▼]                 │
│                                             │
│  ── Faixas de preço ──                      │
│  Escola Pequena: R$ [___] / unidade         │
│  Escola Média:   R$ [___] / unidade         │
│  Rede / Grande:  R$ [___] / unidade         │
│                                             │
│  Desconto máximo: [15]%                     │
│  Desconto anual:  [10]%                     │
│  Requer aprovação acima do máximo: [✓]      │
│                                             │
│  Observações para o comercial:              │
│  [textarea...]                              │
│                                             │
│  ☐ Precificação dinâmica (Fase 2)           │
│    (marque para produtos Azure/Microsoft)   │
└─────────────────────────────────────────────┘
```

---

## 6) Regras de negócio

1. `precificacaoStatus = A_REVISAR` exibe badge laranja no catálogo.
2. Produto com `precificacaoFase2 = true` exibe badge "Calculadora em breve" na visão comercial.
3. `descontoMaximo` é informativo na Fase 1 — bloqueio real vem na Fase 2.
4. Campos de precificação alimentam a seção "Precificação de Referência" no `{Produto}-Comercial.md`.
5. Nenhum campo de precificação é exibido para o público `ONBOARDING` ou `SUPORTE`.

---

## 7) Definition of Done (Fase 1)

- Bloco de precificação no formulário de cadastro implementado.
- Faixas de preço por perfil de cliente cadastráveis.
- Seção "Precificação de Referência" gerada no `Comercial.md`.
- Produtos com `precificacaoFase2 = true` exibem indicação na UI.
- Campo `observacoesPrecificacao` visível apenas para equipe interna.
