# PROJETO: Biblioteca interativa de normas técnicas — começando pela NBR 6118:2023

Este arquivo é a especificação permanente do projeto. Leia-o inteiro no início de toda sessão. Decisões tomadas ao longo do projeto ficam registradas em `docs/DECISOES.md`.

## 1. Seu papel

Atue como engenheiro de software front-end sênior com forte senso de produto, UX e motion design. Eu sou engenheiro civil e sou o responsável pela validação técnica do conteúdo. Você constrói a plataforma; eu garanto a correção normativa.

## 2. Produto

Plataforma web de aprendizado visual e interativo de normas técnicas brasileiras de engenharia. NÃO é um site institucional, NÃO é um PDF online, NÃO reproduz o texto da norma.

* Público: estudantes de engenharia civil, recém-formados e engenheiros que querem revisar a norma.
* Problema: normas são densas, lineares e não explicam o "porquê" físico das exigências.
* Pergunta-guia de toda decisão: "Como tornar este conceito mais fácil de compreender, visualizar e aplicar?"
* Foco inicial: os 20% da NBR 6118 que geram 80% da aplicação prática (Princípio de Pareto).
* Visão de longo prazo: receber outras normas (NBR 6120, NBR 6122, NBR 12655, NBR 8800, Eurocode, ACI 318 etc.) com a mesma arquitetura. Escalabilidade é requisito desde o primeiro commit.

## 3. Regras inegociáveis

1. Direitos autorais (ABNT): nunca transcreva texto, tabelas ou figuras da norma. O conteúdo é explicação própria + referência ao item (ex.: "NBR 6118:2023, item 7.4.7.2").
2. Nunca invente valores normativos. Todo número, coeficiente ou tabela usado em conteúdo ou simulador entra marcado:
   * no código: `// TODO-NORMA: validar com NBR 6118:2023, Tabela X.X`
   * no JSON: campo `"pendenteValidacao": true` e a referência do item
   * na interface: selo discreto "valor em validação"

   Mantenha a lista atualizada em `docs/TODO-NORMA.md`. Eu preencho e valido.
3. Precisão > estética. Todo cálculo fica em funções puras em `js/calc/<norma>/`, com testes.
4. Dúvida técnica de engenharia → pergunte, não suponha.
5. A interface exibe o aviso: "Ferramenta de estudo. Não substitui a consulta à norma vigente."

## 4. Princípios de aprendizado

* Ensinar conceitos, não apresentar texto.
* Mostrar o motivo físico por trás de cada exigência normativa.
* Conectar assuntos: todo conceito tem relações explícitas com outros.
* Priorizar diagramas, fluxogramas de decisão e simuladores com sliders.
* O usuário explora o conhecimento em vez de ler capítulos longos.

## 5. O que aproveitar de cada referência

* Notion: leitura limpa em blocos, tipografia confortável.
* Obsidian: grafo de conhecimento e backlinks ("conceitos que apontam para cá").
* Duolingo: progresso visível e quizzes curtos. SEM mascote, excesso de cor ou gamificação infantil.
* Linear: velocidade, atalhos de teclado, command palette (⌘K / Ctrl+K).
* Figma / Miro: canvas com zoom e pan suaves.

## 6. Identidade visual

* Minimalista, muito espaço em branco, tipografia moderna (Inter ou Geist).
* Paleta neutra + 1 cor de destaque + 1 cor semântica discreta por tema.
* Cards discretos, ícones consistentes (Lucide, em SVG).
* Modo claro e escuro (seguindo o sistema, com alternância manual).
* Responsivo: o celular é uso real, não adaptação de última hora.
* Acessível: navegação por teclado, foco visível, contraste WCAG AA.

## 7. Experiência e fluidez (prioridade máxima depois da precisão técnica)

O app deve dar prazer de usar. Critérios concretos:

* 60 fps em todas as animações; anime apenas `transform` e `opacity`.
* Transições entre telas com View Transitions API (com fallback): o card do conceito "se expande" na página do conceito.
* Animações com física de mola (spring), nunca lineares; duração típica entre 150 e 350 ms.
* Canvas do mapa e do grafo: pan com inércia, zoom suave centrado no cursor, pinch-to-zoom no celular.
* Simuladores reagem em tempo real: o desenho muda enquanto o slider é arrastado, sem botão "calcular".
* Micro-interações: hover, foco, feedback de acerto/erro no quiz, progresso que "enche" ao concluir.
* Teclado em tudo: ⌘K busca, setas navegam no mapa, Esc volta.
* Nada de tela branca: estados de carregamento elegantes e pré-carregamento ao passar o mouse.
* Respeitar `prefers-reduced-motion`.
* Antes de dar uma etapa por pronta, revise a sensação de uso como um designer exigente e liste o que ainda parece travado ou sem polimento.

## 8. Stack (HTML, sem etapa de build)

* `index.html` + módulos ES nativos (`js/**/*.js`) + CSS próprio com variáveis (design tokens em `css/tokens.css`).
* Bibliotecas apenas via CDN em ES modules (esm.sh ou jsDelivr), com versões fixadas: KaTeX (fórmulas), Fuse.js (busca), d3-force (somente o motor de layout do grafo).
* Mapa mental, grafo e fluxogramas desenhados em SVG/Canvas próprios, para controle total da fluidez.
* Roteamento por hash: `#/`, `#/pareto`, `#/grafo`, `#/conceito/nbr6118:cobrimento-nominal`.
* Estado global em um store simples próprio (padrão observer). Progresso salvo em localStorage, sempre com try/catch.
* Todos os caminhos relativos (`./content/...`), porque o site será servido em subpasta no GitHub Pages.
* Rodar localmente com servidor estático (`python3 -m http.server`), já que fetch não funciona via `file://`. Documente isso no README.
* Código organizado para uma futura migração para Next.js sem reescrever o conteúdo: lógica de domínio, cálculos e conteúdo independentes da camada de UI.

## 9. Modelo de conteúdo (100% separado da interface)

Hierarquia: Norma → Versão → Tema → Conceito.

Temas da NBR 6118: Concreto, Armaduras, Durabilidade, Estados Limites, Dimensionamento, Detalhamento, Execução.

Estrutura de pastas:

```
content/
  normas.json                         # catálogo de normas disponíveis
  normas/nbr-6118/
    norma.json                        # metadados: id, nome, versão, temas, cores
    conceitos/<slug>.json             # um arquivo por conceito
    index.json                        # gerado: lista leve para busca, mapa e grafo
```

Campos de cada conceito:

* OBRIGATÓRIOS: `id` (com namespace, ex.: `nbr6118:cobrimento-nominal`), `norma`, `versao`, `tema`, `titulo`, `resumo` (≤ 280 caracteres), `oQueE`, `porQueExiste`, `referencias[] {item, descricao}`, `conexoes[] {alvo, tipo: "depende-de" | "influencia" | "relacionado"}`, `pareto {importancia 1-5, frequencia 1-5, dificuldade 1-5, tempoEstudoMin}`, `status: "rascunho" | "revisado"`.
* OPCIONAIS (a interface esconde seções vazias): `ondeSeAplica`, `quandoUsar`, `errosComuns[]`, `exemplos[]`, `diagramas[]`, `fluxograma`, `simuladores[]` (ids de componentes registrados), `quiz[]`, `checklist[]`, `tags[]`.
* Textos aceitam Markdown simples e fórmulas KaTeX (`$...$`).
* Conexões podem apontar para outras normas (ex.: `nbr12655:...`).

Requisitos de escalabilidade:

* Um validador (`js/content/validate.js`) checa o schema de todos os conceitos e acusa conexões quebradas. Rode-o nos testes.
* Um script simples (`tools/build-index.js`, Node, sem dependências) gera os `index.json` a partir dos conceitos.
* Adicionar um conceito ou uma norma nova = adicionar arquivos JSON, sem alterar código.
* Simuladores e diagramas são registrados por id em um registro central (`js/registry.js`).

## 10. Escopo por fases

### Fase 1 — MVP (construir agora)

1. Home com mapa mental da NBR 6118: nó central "NBR 6118" + 7 temas, expandir/colapsar até os conceitos, zoom e pan fluidos.
2. Página de conceito: seções, fórmulas em KaTeX, referências normativas, conceitos relacionados e backlinks.
3. Busca global com ⌘K / Ctrl+K.
4. "Os 20% da NBR 6118": cards ordenados por score derivado de `pareto`, mostrando importância, frequência, dificuldade, tempo de estudo e aplicações práticas.
5. Progresso local: conceito lido, quiz respondido, com indicador por tema.
6. UM simulador completo: Classe de Agressividade Ambiental → classe mínima de concreto e cobrimento nominal. O usuário escolhe o ambiente e o tipo de elemento; um corte de viga desenhado em escala mostra o cobrimento mudando em tempo real. Valores normativos com TODO-NORMA.
7. UM fluxograma de decisão interativo para o mesmo tema.
8. Conteúdo seed (status "rascunho"): 5 conceitos de Durabilidade — classe de agressividade ambiental, qualidade do concreto (relação a/c e classe), cobrimento nominal, tolerância de execução (Δc) e limites de abertura de fissuras. Inclua também os nós dos outros 6 temas no mapa (sem conceitos detalhados ainda, marcados como "em breve").

### Fase 2

* Grafo global estilo Obsidian: layout de força, arrastar nós, zoom, filtros por tema/status/Pareto, destacar vizinhos ao passar o mouse.
* Dashboard de progresso por tema (Durabilidade, Flexão, Cisalhamento, Punção, Detalhamento, Fissuração).
* Quizzes e checklists em todos os conceitos.
* Novos simuladores: comprimento de ancoragem, influência do fck, fissuração, estados limites.

### Fase 3

* Estudos de caso com decisões ramificadas e feedback (ex.: "Você está projetando uma ponte em ambiente marinho").
* Revisão espaçada.
* Segunda norma (NBR 6120 ou NBR 12655) para provar a arquitetura multinorma.
* Avaliar migração para Next.js e contas de usuário com sincronização.

## 11. Forma de trabalho

1. No início, apresente o plano: estrutura de pastas, schema do conceito, rotas, componentes e decisões técnicas com justificativa. Aguarde meu OK.
2. Depois do OK, execute a Fase 1 de forma autônoma, em etapas pequenas, com commits descritivos.
3. Registre decisões relevantes em `docs/DECISOES.md` (o quê, por quê, alternativas descartadas).
4. Ao fim de cada etapa, informe: o que foi feito, como testar e o que entrou em `docs/TODO-NORMA.md`.
5. Ao concluir a Fase 1, configure o deploy no GitHub Pages (ver seção 13).

## 12. Critérios de pronto da Fase 1

* Sem erros no console; validador de conteúdo e testes de cálculo passando (`tests.html`, rodando no navegador, e/ou `node tools/test.js`).
* Novo conceito adicionado apenas com um arquivo JSON + atualização do índice.
* Lighthouse: acessibilidade ≥ 95, performance ≥ 90.
* Funciona bem em tela de celular e em modo escuro.
* Transições e interações fluidas também em um celular intermediário.
* README com: como rodar localmente, como adicionar conceito, como adicionar norma.

## 13. Deploy (GitHub Pages)

* Crie `.nojekyll` na raiz.
* Crie um workflow do GitHub Actions (`.github/workflows/pages.yml`) que publica o site a partir da branch `main`.
* Se você não conseguir ativar o Pages pelas permissões da sessão, me diga exatamente quais cliques fazer em Settings → Pages (Source: "GitHub Actions").
* Ao final, informe o link público do site.
