# Normas Interativas

Plataforma de aprendizado visual de normas técnicas brasileiras de engenharia, começando pela **NBR 6118:2023**. Mapa mental, conceitos conectados, simuladores e fluxogramas de decisão.

> Ferramenta de estudo. Não substitui a consulta à norma vigente.
> O conteúdo é explicação própria com referência aos itens da norma; nenhum texto, tabela ou figura da ABNT é reproduzido.

Site estático: HTML, CSS e módulos ES nativos. Sem etapa de build e sem dependências instaladas.

## Rodar localmente

O app usa `fetch` para ler o conteúdo, então não funciona abrindo o arquivo direto (`file://`). Sirva a pasta com qualquer servidor estático:

```bash
python3 -m http.server 8000
```

Depois abra `http://localhost:8000`. No Windows o comando costuma ser `python -m http.server 8000`.

## Testes

- No navegador: abra `http://localhost:8000/tests.html`.
- No terminal (Node 20 ou mais novo): `node tools/test.js`. Com Bun também funciona: `bun tools/test.js`.

Os dois rodam os mesmos arquivos de `tests/`: validador de conteúdo (schema, conexões quebradas, índice em dia) e testes das funções de cálculo. O GitHub Actions roda `node tools/test.js` antes de publicar.

## Estrutura

```
index.html                 shell do app
css/                       tokens.css (design tokens) + estilos
js/
  main.js, router.js, store.js, registry.js
  content/                 carregamento, validador, índice, Markdown, Pareto, grafo (sem DOM)
  calc/<norma>/            cálculos em funções puras, com testes
  simuladores/             controles compartilhados
  simuladores/<norma>/     simuladores e resolvedores de fluxograma
  ui/                      componentes, telas, movimento e pan/zoom
content/
  normas.json              catálogo de normas
  normas/<pasta>/
    norma.json             metadados e temas
    index.json             gerado por tools/build-index.js
    conceitos/<slug>.json  um arquivo por conceito
    dados/<nome>.json      valores normativos (fonte única)
    fluxogramas/<slug>.json
tools/                     build-index.js e test.js (Node, sem dependências)
tests/                     testes compartilhados entre Node e navegador
docs/                      DECISOES.md e TODO-NORMA.md
```

## Como adicionar um conceito

1. Crie `content/normas/nbr-6118/conceitos/<slug>.json`. O `id` é `nbr6118:<slug>` e o slug precisa ser igual ao nome do arquivo.
2. Preencha os campos obrigatórios:

   | Campo | Observação |
   |---|---|
   | `id`, `norma`, `versao`, `tema` | `tema` é um dos ids de `norma.json` |
   | `titulo`, `resumo` | resumo com até 280 caracteres |
   | `oQueE`, `porQueExiste` | Markdown simples e fórmulas `$...$` / `$$...$$` |
   | `referencias[]` | `{ item, descricao }` |
   | `conexoes[]` | `{ alvo, tipo }`, com tipo `depende-de`, `influencia` ou `relacionado` |
   | `pareto` | `importancia`, `frequencia`, `dificuldade` (1 a 5) e `tempoEstudoMin` |
   | `status` | `rascunho` ou `revisado` |

3. Opcionais (a seção some da tela se o campo não existir): `ondeSeAplica[]`, `quandoUsar`, `errosComuns[]`, `exemplos[] {titulo, texto}`, `valores[] {rotulo, dado, unidade?}`, `simuladores[]`, `diagramas[]`, `fluxograma`, `quiz[] {pergunta, opcoes[], correta, explicacao}`, `checklist[]`, `tags[]`.
4. Atualize o índice e rode os testes:

   ```bash
   node tools/build-index.js
   ```

   ```bash
   node tools/test.js
   ```

Nenhum código precisa mudar. O conceito aparece no mapa, na busca e na página "Os 20%". Um tema deixa de aparecer como "em breve" assim que recebe o primeiro conceito.

### Valores normativos

Números da norma nunca são escritos no texto do conceito nem no código. Eles ficam em `content/normas/<pasta>/dados/<nome>.json`, cada bloco com `referencia` e `pendenteValidacao`. O conceito aponta para eles pelo campo `valores`:

```json
{ "rotulo": "Δc em obras correntes", "dado": "durabilidade/deltaC.padrao" }
```

Um arquivo novo de valores precisa ser listado no campo `dados` de `norma.json`, para os testes o conferirem. Enquanto `pendenteValidacao` for `true`, a interface mostra o selo "valor em validação". A lista do que falta conferir está em `docs/TODO-NORMA.md`.

## Como adicionar uma norma

1. Acrescente a norma em `content/normas.json` (`id`, `pasta`, `nome`, `titulo`, `versao`, `disponivel: true`).
2. Crie `content/normas/<pasta>/norma.json` com `id`, `nome`, `titulo`, `versao`, `temas[]` (`id`, `nome`, `matiz` de 0 a 360 para a cor, `descricao`) e, se houver valores normativos, `dados[]` com os nomes dos arquivos de `dados/`.
3. Crie a pasta `conceitos/` com pelo menos um conceito e rode `node tools/build-index.js`.

Conexões entre normas usam o id completo, por exemplo `nbr12655:requisitos-de-durabilidade`. Se a norma de destino ainda não existe, o validador só avisa e a interface mostra o link como "em breve".

Observação: nesta fase a home mostra o mapa da primeira norma disponível do catálogo. O seletor de norma entra junto com a segunda norma (Fase 3).

## Como adicionar um simulador ou fluxograma

- Simulador: crie o módulo em `js/simuladores/<norma>/`, exportando `montar(container)` que devolve uma função de limpeza, e registre o id em `js/registry.js`. Depois cite o id em `simuladores[]` do conceito.
- Fluxograma: crie o JSON em `content/normas/<pasta>/fluxogramas/` (nós `pergunta` com opções e um nó `resultado` com um `resolvedor` registrado) e cite o id no campo `fluxograma` do conceito.

## Telas

| Rota | Tela |
|---|---|
| `#/` | Mapa mental da norma |
| `#/pareto` | Os 20%: conceitos por ordem de retorno |
| `#/grafo` | Grafo de conceitos, com filtros por tema, status e prioridade |
| `#/progresso` | Progresso geral e por tema |
| `#/conceito/<id>` | Página de um conceito |

## Atalhos

| Tecla | Ação |
|---|---|
| `Ctrl+K` / `⌘K` ou `/` | Busca |
| Setas | Navegar entre os nós do mapa e do grafo |
| `Enter` | Expandir tema ou abrir conceito |
| `+` `-` `0` | Zoom e enquadrar o mapa ou o grafo |
| `Esc` | Voltar |

## Publicação

O workflow `.github/workflows/pages.yml` roda os testes e publica o site no GitHub Pages a cada push na `main`. Em Settings → Pages, a opção Source precisa estar em "GitHub Actions".
