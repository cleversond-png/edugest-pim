# SPEC-GERACAO-DOCS — Geração de Documentos por Público (EduGest-PIM)

> **Objetivo**: definir como o sistema gera automaticamente os arquivos `.md` e `.html` por público a partir do cadastro de produto.
>
> Cada produto gera 1 arquivo MASTER + 6 visões por público + 3 exports JSON.
> Todos publicados no SharePoint em `Central do Produto/{Produto}/`.
>
> Referências:
> - `SPEC-PRODUTO.md` — campos do cadastro
> - `SPEC-GRAPH.md` — publicação no SharePoint
> - `SHAREPOINT_SETUP.md` — credenciais e estrutura

---

## 0) Princípios

### 0.1 MASTER é a fonte — visões são derivadas
O `MASTER.md` contém todos os campos do cadastro. Os arquivos de visão são recortes gerados por IA a partir do MASTER, escritos para cada público específico.

### 0.2 Otimizado para o Copilot
Cada arquivo tem um bloco `copilot-hints` no frontmatter com as perguntas que aquele arquivo sabe responder. Isso aumenta a precisão das respostas do Copilot M365.

### 0.3 Geração automática, edição manual permitida
O sistema gera os arquivos via IA (Claude). O conteúdo pode ser editado manualmente no SharePoint depois — mas na próxima geração o arquivo é sobrescrito.

### 0.4 Idempotente
Gerar documentos para o mesmo produto duas vezes sobrescreve os arquivos. Não duplica.

---

## 1) Estrutura de arquivos no SharePoint

```
SharePoint/Central do Produto/
└── {produto-slug}/
    ├── {Produto}-MASTER.md          ← cadastro completo (fonte da verdade)
    ├── {Produto}-MASTER.html        ← versão visual navegável
    ├── visoes/
    │   ├── {Produto}-Financeiro.md
    │   ├── {Produto}-Comercial.md
    │   ├── {Produto}-PreVenda.md
    │   ├── {Produto}-Marketing.md
    │   ├── {Produto}-Suporte.md
    │   └── {Produto}-Onboarding.md
    └── exports/
        ├── {Produto}-ERP.json       ← importação Sankhya
        ├── {Produto}-CRM.json       ← sync Ploomes
        └── {Produto}-Partner.json   ← Partner Center MS
```

Exemplo para "Integrador Big Brain":
```
Central do Produto/
└── integrador-big-brain/
    ├── IntegradorBigBrain-MASTER.md
    ├── IntegradorBigBrain-MASTER.html
    ├── visoes/
    │   ├── IntegradorBigBrain-Financeiro.md
    │   ├── IntegradorBigBrain-Comercial.md
    │   └── ...
    └── exports/
        ├── IntegradorBigBrain-ERP.json
        └── ...
```

---

## 2) Arquivo MASTER

O MASTER é gerado diretamente dos campos do banco — sem IA, sem interpretação. É um espelho fiel do cadastro.

### 2.1 Estrutura do MASTER.md

```markdown
---
produto: {nomeComercial}
codigo: {codigo}
slug: {slug}
versao: {versao}
status: {status}
atualizado: {updatedAt}
geradoEm: {ISO-8601}
---

# {nomeComercial}

**Código**: {codigo} | **Tipo**: {tipoProduto} | **Natureza**: {natureza} | **Status**: {status}

---

## Identidade

- **Nome Comercial**: {nomeComercial}
- **Nome Interno**: {nomeInterno}
- **Categoria**: {categoria} / {subcategoria}
- **Produto Core**: {produtoCore}
- **Integra Jornada**: {integraJornada}

## Descrição Comercial

{descricaoComercialCurta}

## Proposta de Valor

{proposta_valor}

## Dores Atendidas

{doresAtendidas[]}

## Público-Alvo

{publicoAlvo[]}

## Diferenciais

{diferenciais[]}

## Dependência Comercial

- **Tipo**: {dependenciaComercial}
- **Produto Base**: {produtoBase ?? "Nenhuma"}
- **Observações**: {observacoesComerciais}

## Perfis de Cliente

{perfilCliente[]}

---

## Financeiro / ERP

- **Modelo Contratado**: {modeloContratado}
- **Modelo Faturamento**: {modeloFaturamento}
- **Tipo de Receita**: {tipoReceita}
- **Unidade de Medida**: {unidadeMedida}
- **Gera ARR**: {geraARR}
- **Centro de Resultado**: {centroResultado}
- **Grupo Código**: {grupoCodigo} — {grupoDescricao}

---

## Fiscal

- **Código NBS**: {codigoNBS}
- **Tem ISS**: {temISS}
- **Alíquota ISS**: {aliquotaISS}%
- **Código de Serviço**: {codigoServico}
- **Status Fiscal**: {fiscalStatus}
- **Observações Fiscais**: {observacoesFiscais}

---

## Técnico

- **Arquitetura HLD**: {arquiteturaHLD}
- **Requisitos Mínimos**: {requisitosMinimos[]}
- **Tecnologias Base**: {tecnologiasBase[]}
- **Modelo de Deployment**: {modeloDeployment}
- **Integrações Suportadas**: {integracoesSuportadas[]}
- **Limitações Conhecidas**: {limitacoesConhecidas}
- **Tempo de Implementação**: {tempoImplementacao}

---

## Suporte

- **SLA**: {slaAtendimento}
- **FAQ**: {faq[]}
- **Problemas Conhecidos**: {problemasConhecidos[]}
- **Troubleshooting**: {troubleshootingGuia}

---

## Marketing

- **Short Pitch**: {shortPitch}
- **Cases**: {cases[]}
- **Objeções**: {objecoesRespostas[]}
- **Script de Venda**: {scriptVenda}

---

## Onboarding

{contextoGeral}

**Por que existe**: {porQueExiste}
**Para quem é**: {paraquemE}
**Não confundir com**: {naoConfundirCom}
**Roadmap**: {roadmapPublico}

---

## Origem

- **Tipo**: {origemTipo}
- **Descrição**: {origemDescricao}
- **Segmento**: {origemClienteSegmento}
- **Data**: {origemData}
- **Responsável**: {origemResponsavel}

---

## Tags Copilot

{tagsCopilot[]}
```

---

## 3) Arquivos de visão por público

Cada visão é gerada por IA (Claude) a partir do MASTER. O prompt instrui o modelo a escrever **para aquele público específico**, usando a linguagem e o nível de detalhe adequado.

### 3.1 Template de frontmatter (todos os arquivos de visão)

```markdown
---
produto: {nomeComercial}
publico: {Público}
versao: {versao}
atualizado: {ISO-8601}
copilot-hints:
  - "{pergunta 1 que este arquivo sabe responder}"
  - "{pergunta 2}"
  - "{pergunta 3}"
  - "{pergunta 4}"
---
```

---

### 3.2 Financeiro.md

**Objetivo**: responder perguntas fiscais e de receita com precisão.

**Copilot hints padrão**:
- `"{produto} tem ISS?"`
- `"qual o código NBS do {produto}?"`
- `"{produto} gera ARR?"`
- `"qual o tipo de receita do {produto}?"`
- `"modelo de faturamento do {produto}"`

**Seções obrigatórias**:
1. Classificação fiscal (NBS, ISS, código de serviço)
2. Tipo de receita (ARR/NRR/Pontual) com explicação
3. Modelo de contratação e faturamento
4. Centro de resultado
5. Status de validação fiscal (aviso se `A_VALIDAR`)
6. Observações para o time financeiro

**Tom**: técnico, direto, sem narrativa.

---

### 3.3 Comercial.md

**Objetivo**: responder perguntas sobre dependências, o que vender junto e como posicionar.

**Copilot hints padrão**:
- `"o que preciso vender junto com {produto}?"`
- `"dependências do {produto}"`
- `"{produto} gera ARR?"`
- `"objeções mais comuns sobre {produto}"`
- `"script de venda do {produto}"`

**Seções obrigatórias**:
1. Descrição comercial curta (copy-paste ready)
2. Dependências e o que vende junto
3. Perfis de cliente ideais
4. Proposta de valor em bullets
5. Objeções e respostas (top 5)
6. Script de venda (roteiro)
7. Próximos passos sugeridos

**Tom**: linguagem de vendas, orientado a ação.

---

### 3.4 PreVenda.md

**Objetivo**: dar autonomia ao comercial para responder questões técnicas sem chamar pré-venda.

**Copilot hints padrão**:
- `"requisitos técnicos do {produto}"`
- `"quanto tempo leva implementar {produto}?"`
- `"riscos do projeto de {produto}"`
- `"arquitetura do {produto}"`
- `"integrações que {produto} suporta"`

**Seções obrigatórias**:
1. Arquitetura de alto nível (HLD em linguagem acessível)
2. Requisitos mínimos (infra, licenças, pré-requisitos)
3. Integrações suportadas
4. Tempo e fases de implementação
5. Riscos comuns e mitigações
6. Limitações conhecidas (o que o produto não faz)
7. Perguntas técnicas frequentes

**Tom**: consultivo, cuidadoso com limitações.

---

### 3.5 Marketing.md

**Objetivo**: base para criação de materiais e apresentações.

**Copilot hints padrão**:
- `"proposta de valor do {produto}"`
- `"cases de sucesso do {produto}"`
- `"diferenciais do {produto}"`
- `"personas do {produto}"`

**Seções obrigatórias**:
1. Short pitch (1 frase impactante)
2. Proposta de valor completa
3. Dores que resolve
4. Diferenciais competitivos
5. Público-alvo e personas
6. Cases de sucesso
7. Sugestões de slide para apresentações

**Tom**: inspirador, orientado a resultado.

---

### 3.6 Suporte.md

**Objetivo**: base de conhecimento para o time de suporte responder clientes.

**Copilot hints padrão**:
- `"SLA do {produto}"`
- `"problemas conhecidos do {produto}"`
- `"como fazer troubleshooting do {produto}"`
- `"FAQ do {produto}"`

**Seções obrigatórias**:
1. SLA e canais de atendimento
2. FAQ (perguntas e respostas formatadas)
3. Problemas conhecidos e status
4. Guia de troubleshooting passo a passo
5. Links para base de conhecimento (KB)
6. Quando escalar para DEV

**Tom**: objetivo, instrucional.

---

### 3.7 Onboarding.md

**Objetivo**: integrar novos membros da equipe ao produto rapidamente.

**Copilot hints padrão**:
- `"o que é {produto}?"`
- `"para que serve {produto}?"`
- `"qual a diferença entre {produto} e {produto similar}?"`
- `"história do {produto}"`

**Seções obrigatórias**:
1. O que é (contexto geral acessível)
2. Por que existe (origem e dor original)
3. Para quem é (cliente ideal)
4. Como se posiciona no portfólio
5. Não confundir com... (produtos similares)
6. O que vem por aí (roadmap público)

**Tom**: didático, acolhedor para quem está chegando.

---

## 4) Prompt de geração (IA)

```typescript
export function buildDocGenerationPrompt(
  publico: PublicoAlvo,
  master: string,
  produto: string
): string {
  const instrucoes: Record<PublicoAlvo, string> = {
    FINANCEIRO: `Você é especialista em contabilidade e gestão financeira.
Escreva o documento para o time financeiro da empresa.
Priorize: classificação fiscal, tipo de receita, modelo de faturamento.
Use linguagem técnica e direta. Não use narrativa comercial.
Se algum campo fiscal estiver como "A_VALIDAR", destaque com aviso.`,

    COMERCIAL: `Você é um consultor de vendas B2B experiente.
Escreva o documento para o time comercial da empresa.
Priorize: como posicionar o produto, dependências, objeções, script de venda.
Use linguagem orientada a ação. Seja persuasivo mas honesto.
Formate objeções como: "Objeção: ... | Resposta: ..."`,

    PRE_VENDA: `Você é um arquiteto de soluções Microsoft.
Escreva o documento para consultores de pré-venda.
Priorize: requisitos técnicos, arquitetura, riscos, tempo de implementação.
Seja preciso com limitações — não prometa o que o produto não entrega.`,

    MARKETING: `Você é um redator de marketing B2B especializado em EdTech.
Escreva o documento para o time de marketing.
Priorize: proposta de valor, diferenciais, cases, personas.
Use linguagem inspiradora e orientada a resultado.`,

    SUPORTE: `Você é especialista em suporte técnico de software.
Escreva o documento para o time de suporte ao cliente.
Priorize: FAQ, troubleshooting, problemas conhecidos, SLA.
Seja objetivo e instrucional. Formate FAQ como: "P: ... | R: ..."`,

    ONBOARDING: `Você é responsável por integração de novos colaboradores.
Escreva o documento para novos membros da equipe.
Priorize: contexto geral, por que o produto existe, posicionamento no portfólio.
Use linguagem acessível, evite jargões técnicos.`,
  }

  return `${instrucoes[publico]}

PRODUTO: ${produto}

DADOS DO CADASTRO (MASTER):
${master}

INSTRUÇÕES:
- Escreva em português do Brasil
- Use apenas informações presentes no cadastro — nunca invente dados
- Se um campo estiver vazio ou "A_VALIDAR", indique claramente
- Inclua o frontmatter YAML com copilot-hints específicos para este público
- Gere entre 4 e 6 copilot-hints como perguntas que o Copilot M365 pode receber sobre este produto
- Formato: Markdown puro`
}
```

---

## 5) Exports JSON

### 5.1 ERP-Sankhya.json

Gerado diretamente dos campos do banco — sem IA.

```json
{
  "blocked": false,
  "blockedReasons": [],
  "generatedAt": "ISO-8601",
  "produto": {
    "codigo": "BB-SAAS-INT-001",
    "nomeComercial": "Integrador Big Brain",
    "tipoProduto": "SAAS_BB",
    "grupoCodigo": "105001",
    "grupoDescricao": "INTEGRADOR",
    "modeloContratado": "SUBSCRICAO",
    "modeloFaturamento": "RECORRENTE",
    "unidadeMedida": "UNIDADE",
    "tipoReceita": "ARR",
    "codigoNBS": "...",
    "temISS": "NAO",
    "centroResultado": "...",
    "ativo": true
  }
}
```

> Se `fiscalStatus = A_VALIDAR`:
> ```json
> { "blocked": true, "blockedReasons": ["fiscalStatus: A_VALIDAR — codigoNBS não validado"] }
> ```

### 5.2 CRM-Ploomes.json

```json
{
  "generatedAt": "ISO-8601",
  "produto": {
    "nome": "Integrador Big Brain",
    "descricaoCurta": "...",
    "tipoProduto": "SaaS BB",
    "modeloContratado": "Subscrição",
    "dependencia": "Nenhuma",
    "perfilCliente": ["ESCOLA_PEQUENA", "ESCOLA_MEDIA", "REDE_GRANDE"],
    "ativo": true
  }
}
```

### 5.3 Partner-Center.json

```json
{
  "generatedAt": "ISO-8601",
  "produto": {
    "titulo": "Integrador Big Brain",
    "descricaoCurta": "...",
    "solutionAreas": ["ModernWork", "Education"],
    "offerType": "SaaS",
    "mercados": ["BR"],
    "idiomas": ["pt-BR"],
    "keywords": []
  }
}
```

---

## 6) Endpoint de geração

### `POST /api/products/:slug/generate-docs`

**Request**:
```json
{
  "targets": ["ALL"],
  "publish": true,
  "sharepoint": {
    "siteId": "...",
    "driveId": "...",
    "baseFolder": "Central do Produto"
  }
}
```

`targets` pode ser `["ALL"]` ou lista específica: `["FINANCEIRO", "COMERCIAL"]`

**Response**:
```json
{
  "status": "SUCCESS",
  "produto": "integrador-big-brain",
  "filesGenerated": 10,
  "files": [
    { "path": "visoes/IntegradorBigBrain-Financeiro.md", "status": "PUBLISHED" },
    { "path": "exports/IntegradorBigBrain-ERP.json", "status": "BLOCKED", "reason": "fiscalStatus: A_VALIDAR" }
  ],
  "sharepointFolder": "https://eduproms.sharepoint.com/..."
}
```

---

## 7) Atualização de tagsCopilot

Após gerar os documentos, o sistema extrai os `copilot-hints` gerados pela IA e salva de volta no banco no campo `tagsCopilot` do produto. Isso permite busca por produto via essas tags no futuro.

---

## 8) Definition of Done

- `POST /api/products/:slug/generate-docs` gera todos os arquivos.
- MASTER.md espelha fielmente o cadastro sem IA.
- 6 visões geradas por IA com frontmatter e copilot-hints corretos.
- Export ERP bloqueado quando `fiscalStatus = A_VALIDAR`.
- Todos os arquivos publicados no SharePoint em `Central do Produto/{slug}/`.
- `tagsCopilot` atualizado no banco após geração.
- Geração é idempotente (sobrescreve, não duplica).
