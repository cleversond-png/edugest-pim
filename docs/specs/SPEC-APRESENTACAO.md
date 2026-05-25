# SPEC-APRESENTACAO — Geração de Apresentações (EduGest-PIM)

> **Objetivo**: definir o banco de slides por produto, os perfis de cliente e o fluxo de geração automática de apresentações `.pptx`.
>
> O comercial informa o cliente e a dor. O sistema monta a apresentação.
>
> Referências:
> - `SPEC-PRODUTO.md` → perfis de cliente e produtos obrigatórios
> - `SPEC-GRAPH.md` → publicação no SharePoint
> - Stack: `pptxgenjs` para geração de `.pptx`

---

## 0) Princípios

### 0.1 Lego de slides
A apresentação é montada combinando slides de um banco — não gerada do zero a cada vez. Marketing cadastra os slides canônicos de cada produto uma vez. O sistema combina.

### 0.2 Suporte M365 sempre entra
O slide de Suporte M365 é obrigatório em 100% das propostas, independente do perfil ou seleção manual.

### 0.3 Comercial ajusta antes de gerar
O sistema pré-seleciona os slides pelo perfil. O comercial pode adicionar ou remover produtos antes de confirmar a geração.

### 0.4 Produto sem slides = aviso, não bloqueio
Se um produto selecionado não tiver slides cadastrados, o sistema exibe aviso amarelo mas gera a apresentação com os demais produtos. O slide faltante é substituído por um placeholder.

### 0.5 Formato de saída
`.pptx` para download e link no SharePoint. O comercial baixa, ajusta se necessário e apresenta.

---

## 1) Modelo do banco de slides (`ProductSlide`)

```typescript
type ProductSlide = {
  id: string
  productSlug: string           // referência ao produto
  titulo: string                // ex: "Visão Geral — Integrador Big Brain"
  tipo: SlideType
  ordem: number                 // ordem sugerida dentro do produto (1, 2, 3...)
  conteudo: string              // texto/bullets do slide
  notasApresentador: string     // notas do apresentador
  imagemUrl?: string            // imagem/screenshot (opcional)
  pptxBase64?: string           // slide original exportado do PowerPoint (opcional)
  ativo: boolean
  criadoEm: string
  atualizadoEm: string
}

type SlideType =
  | 'VISAO_GERAL'       // o que é o produto
  | 'COMO_FUNCIONA'     // funcionamento / demo
  | 'DIFERENCIAIS'      // por que escolher
  | 'CASES'             // casos de sucesso
  | 'INTEGRACAO'        // como integra com outros sistemas
  | 'ROADMAP'           // o que vem por aí
  | 'PLACEHOLDER'       // slide gerado quando não há slides cadastrados
```

---

## 2) Anatomia de uma apresentação gerada

```
Slide 1  — CAPA              (template fixo — nome + logo do cliente)
Slide 2  — CENÁRIO ATUAL     (gerado por IA a partir da dor informada)
Slide 3  — DORES             (gerado por IA — bullets das dores do cliente)
Slide 4+ — PRODUTO 1         (slides do banco — vindos do marketing)
Slide N+ — PRODUTO 2         (slides do banco)
Slide N+ — PRODUTO 3         (slides do banco)
...
Slide -2 — PRÓXIMOS PASSOS   (template fixo — dependências + CTA)
Slide -1 — CONTATO           (template fixo — logo BB + dados do comercial)
```

### 2.1 Slides fixos (sempre presentes, não editáveis pelo comercial)

**Capa**:
- Logo da empresa (Big Brain) no canto superior
- Nome do cliente centralizado (grande)
- Logo do cliente (upload opcional)
- Data automática

**Próximos Passos**:
- Lista de produtos selecionados com tipo de contratação
- Dependências obrigatórias destacadas
- CTA: "Vamos começar?"

**Contato**:
- Logo Big Brain
- Nome e e-mail do comercial (configurado no perfil)
- Site e telefone

### 2.2 Slides dinâmicos (gerados por IA)

**Cenário Atual** (slide 2):
Gerado a partir do campo `dorCliente` informado pelo comercial. IA converte em 3–5 bullets descrevendo o cenário atual do cliente.

**Dores** (slide 3):
Gerado a partir do mesmo campo. IA extrai as dores em formato visual — bullets curtos, impactantes.

### 2.3 Slides de produto (banco)
Para cada produto selecionado, o sistema busca os slides cadastrados e os insere na ordem definida pelo `ordem` do `ProductSlide`.

---

## 3) Perfis de cliente e seleção automática

```typescript
// Definido em SPEC-PRODUTO.md — replicado aqui para referência
const PERFIS: Record<string, { label: string, produtos: string[] }> = {
  ESCOLA_PEQUENA: {
    label: 'Escola Pequena (até ~500 alunos)',
    produtos: ['BB-SAAS-INT-001', 'BB-SAAS-INTRA-001', 'BB-SERV-FORM-001', 'BB-SERV-SUP-001']
  },
  ESCOLA_MEDIA: {
    label: 'Escola Média (500–2.000 alunos)',
    produtos: ['BB-SAAS-INT-001', 'BB-SAAS-INTRA-001', 'BB-SAAS-PORT-001', 'BB-SERV-FORM-001', 'BB-SERV-SUP-001']
  },
  REDE_GRANDE: {
    label: 'Rede / Grande (redes e grupos)',
    produtos: ['BB-SAAS-INT-001', 'BB-SAAS-INTRA-001', 'BB-SAAS-PORT-001', 'BB-SAAS-CO-001', 'BB-SAAS-HD-001', 'BB-SAAS-INS-001', 'BB-SERV-CONS-001', 'BB-SERV-FORM-001', 'BB-SERV-SUP-001']
  }
}

// Sempre obrigatório
const PRODUTO_OBRIGATORIO = 'BB-SERV-SUP-001'
```

---

## 4) Fluxo de geração

### Passo 1 — Comercial preenche o formulário

```
Campos obrigatórios:
- nomeCliente: string
- perfilCliente: 'ESCOLA_PEQUENA' | 'ESCOLA_MEDIA' | 'REDE_GRANDE'

Campos opcionais:
- logoCliente: File (upload)
- dorCliente: string (para slides dinâmicos)
- produtosAdicionais: string[] (slugs além do perfil)
- produtosRemovidos: string[] (slugs para remover do perfil)
- nomeComercial: string (para slide de contato)
- emailComercial: string
```

### Passo 2 — Sistema monta a lista de slides

```typescript
function montarListaSlides(input: ApresentacaoInput): SlideAgendado[] {
  // 1. Começa com o perfil
  const produtosDoPerfil = PERFIS[input.perfilCliente].produtos

  // 2. Adiciona extras e remove os solicitados
  const produtosFinal = [
    ...produtosDoPerfil.filter(p => !input.produtosRemovidos?.includes(p)),
    ...(input.produtosAdicionais ?? [])
  ]

  // 3. Garante que o obrigatório está presente (não pode remover)
  if (!produtosFinal.includes(PRODUTO_OBRIGATORIO)) {
    produtosFinal.push(PRODUTO_OBRIGATORIO)
  }

  // 4. Remove duplicatas
  const produtosUnicos = [...new Set(produtosFinal)]

  // 5. Monta agenda de slides
  return [
    { tipo: 'CAPA', dados: { nomeCliente: input.nomeCliente, logoCliente: input.logoCliente } },
    { tipo: 'CENARIO_ATUAL', dados: { dor: input.dorCliente } },
    { tipo: 'DORES', dados: { dor: input.dorCliente } },
    ...produtosUnicos.flatMap(slug => buscarSlidesDoProduto(slug)),
    { tipo: 'PROXIMOS_PASSOS', dados: { produtos: produtosUnicos } },
    { tipo: 'CONTATO', dados: { nome: input.nomeComercial, email: input.emailComercial } },
  ]
}
```

### Passo 3 — Sistema gera os slides dinâmicos via IA

Chamada ao Claude para gerar `CENARIO_ATUAL` e `DORES`:

```typescript
const promptCenario = `
Você é um consultor de vendas B2B especializado em tecnologia educacional.
O comercial acabou de sair de uma reunião com este cliente:

NOME DO CLIENTE: ${nomeCliente}
PERFIL: ${perfilLabel}
DOR RELATADA: ${dorCliente}

Gere EXATAMENTE 2 seções em JSON:
1. "cenarioAtual": array de 3-4 bullets descrevendo o cenário atual do cliente (problemas, processos manuais, ineficiências)
2. "dores": array de 3-5 bullets com as dores principais em formato impactante (curto, direto)

Responda APENAS com JSON, sem texto adicional.
`
```

### Passo 4 — Sistema monta o `.pptx`

Usando `pptxgenjs`:

```typescript
async function gerarPptx(
  agenda: SlideAgendado[],
  template: PptxTemplate
): Promise<Buffer> {
  const pptx = new PptxGenJS()

  // Configurações globais
  pptx.layout = 'LAYOUT_WIDE' // 16:9
  pptx.theme = { headFontFace: 'Segoe UI', bodyFontFace: 'Segoe UI' }

  for (const slide of agenda) {
    const s = pptx.addSlide()
    await renderizarSlide(s, slide, template)
  }

  return await pptx.stream()
}
```

### Passo 5 — Salvar no SharePoint e disponibilizar para download

Arquivo salvo em:
```
Central do Produto/_apresentacoes/
└── {nomeCliente}-{YYYY-MM-DD}.pptx
```

---

## 5) Endpoint de geração

### `POST /api/apresentacoes/gerar`

**Request**:
```json
{
  "nomeCliente": "Colégio São Paulo",
  "perfilCliente": "ESCOLA_MEDIA",
  "logoCliente": "base64...",
  "dorCliente": "Precisamos reduzir o retrabalho administrativo e modernizar a comunicação interna",
  "produtosAdicionais": ["BB-SAAS-AGN-001"],
  "produtosRemovidos": [],
  "nomeComercial": "João Silva",
  "emailComercial": "joao@bigbrain.com.br"
}
```

**Response**:
```json
{
  "status": "SUCCESS",
  "nomeArquivo": "ColégioSãoPaulo-2026-05-25.pptx",
  "totalSlides": 18,
  "produtos": ["BB-SAAS-INT-001", "BB-SAAS-INTRA-001", "BB-SAAS-PORT-001", "BB-SERV-FORM-001", "BB-SERV-SUP-001", "BB-SAAS-AGN-001"],
  "avisos": [],
  "downloadUrl": "/api/apresentacoes/download/ColégioSãoPaulo-2026-05-25.pptx",
  "sharepointUrl": "https://eduproms.sharepoint.com/...",
  "durationMs": 4200
}
```

Se produto sem slides:
```json
{
  "avisos": [
    {
      "produto": "BB-SAAS-AGN-001",
      "tipo": "SEM_SLIDES",
      "mensagem": "Agenda Inteligente não tem slides cadastrados. Slide placeholder incluído."
    }
  ]
}
```

---

## 6) Cadastro de slides pelo Marketing

### `POST /api/products/:slug/slides` — Adicionar slide

**Request**:
```json
{
  "titulo": "Visão Geral — Integrador Big Brain",
  "tipo": "VISAO_GERAL",
  "ordem": 1,
  "conteudo": "• Integra sistemas educacionais ao Microsoft 365\n• Provisionamento automático de usuários\n• Sincronização em tempo real",
  "notasApresentador": "Enfatizar que a integração é bidirecional",
  "pptxBase64": "base64 do slide exportado do PowerPoint original"
}
```

### `GET /api/products/:slug/slides` — Listar slides do produto

### `PUT /api/products/:slug/slides/:id` — Atualizar slide

### `DELETE /api/products/:slug/slides/:id` — Remover slide

### `POST /api/products/:slug/slides/reorder` — Reordenar slides

---

## 7) UI — Formulário de geração

### Campos do formulário

```
┌─────────────────────────────────────┐
│  Nova Apresentação                  │
├─────────────────────────────────────┤
│  Nome do Cliente *                  │
│  [Colégio São Paulo_______________] │
│                                     │
│  Logo do Cliente                    │
│  [Upload de imagem...]              │
│                                     │
│  Perfil do Cliente *                │
│  ○ Escola Pequena                   │
│  ● Escola Média                     │
│  ○ Rede / Grande                    │
│                                     │
│  Produtos pré-selecionados:         │
│  ✓ Integrador Big Brain             │
│  ✓ Intranet SaaS                    │
│  ✓ Portal Institucional             │
│  ✓ Formação Microsoft               │
│  ✓ Suporte M365 (obrigatório 🔒)    │
│  [+ Adicionar produto]              │
│                                     │
│  Dor principal do cliente           │
│  [textarea...]                      │
│                                     │
│  Seus dados (slide de contato)      │
│  Nome: [___] E-mail: [___]          │
│                                     │
│  [  Gerar Apresentação →  ]         │
└─────────────────────────────────────┘
```

### Estados de UX

| Estado | Comportamento |
|---|---|
| Gerando | Spinner com "Montando sua apresentação..." |
| Produto sem slides | Badge amarelo ⚠ no produto |
| Suporte removido | Não permite — botão bloqueado com tooltip |
| Sucesso | Botão "Baixar .pptx" + link SharePoint |
| Erro | Toast com motivo |

---

## 8) Dependências técnicas

Adicionar ao `apps/api/package.json`:
```json
"pptxgenjs": "^3.12.0"
```

---

## 9) Definition of Done

- `POST /api/apresentacoes/gerar` retorna `.pptx` válido.
- Perfil pré-seleciona produtos corretamente.
- Suporte M365 sempre presente e não removível.
- Slides dinâmicos (cenário/dores) gerados por IA quando `dorCliente` fornecido.
- Produto sem slides exibe aviso mas não bloqueia geração.
- Logo do cliente inserida na capa e nos demais slides.
- Arquivo salvo no SharePoint em `_apresentacoes/`.
- Marketing consegue cadastrar slides por produto via API.
