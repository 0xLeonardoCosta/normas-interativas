# Decisões do projeto

Registro das decisões relevantes: o quê, por quê e o que foi descartado. As mais recentes ficam no fim.

## 1. Valores normativos em JSON de dados, não no código nem no texto

**O quê:** todo número da norma mora em `content/normas/<pasta>/dados/<nome>.json`, com `referencia` e `pendenteValidacao` por bloco. As funções de cálculo recebem as tabelas por parâmetro. Os conceitos citam valores pelo campo `valores[] { rotulo, dado }`.

**Por quê:** um único lugar para validar e corrigir. O selo "valor em validação" é derivado do dado, então não há como um número aparecer na tela sem a marca. Os testes de lógica usam tabelas fictícias e não dependem dos valores reais.

**Descartado:** tabelas em `js/calc/.../tabelas.js` (como estava no plano inicial) duplicariam os números citados nos conceitos. Números escritos direto na prosa não carregam selo.

## 2. Temas "em breve" são derivados

**O quê:** não existe campo `emBreve`. Um tema sem conceitos aparece como "em breve".

**Por quê:** adicionar o primeiro conceito de um tema não exige editar `norma.json`.

## 3. Campos acrescentados ao schema do conceito

- `valores[]`: ver decisão 1.
- `ondeSeAplica` é lista de textos curtos, usada como "aplicações práticas" nos cards do Pareto.
- `exemplos[]` tem a forma `{ titulo, texto }`.
- `fluxograma` é o id de um arquivo em `fluxogramas/`. Os resultados numéricos vêm de um resolvedor registrado, para o JSON do fluxograma não conter números.

## 4. Score de Pareto

**O quê:** `score = (0,55 × importância + 0,45 × frequência) / 5 × 100`. Empate: menor tempo de estudo primeiro.

**Por quê:** a página responde "o que estudar primeiro para render mais". Dificuldade e tempo são mostrados no card, mas não rebaixam um conceito essencial só por ser difícil.

**Descartado:** dividir pelo tempo de estudo (premiaria conceitos triviais).

## 5. Mapa mental: árvore horizontal em SVG, animada por mola em JavaScript

**O quê:** layout próprio (função pura em `mapa-layout.js`), temas à direita e à esquerda da raiz e, em telas estreitas, todos à direita. Uma mola única interpola as posições a cada mudança de layout. Os conceitos de um tema seguem a ordem do Pareto.

**Por quê:** o layout em árvore acomoda qualquer número de conceitos sem sobreposição, o que um arranjo radial não garante. SVG dá foco por teclado e nomes acessíveis sem trabalho extra.

**Concessão consciente:** as curvas entre os nós mudam o atributo `d` durante a animação, o que foge da regra "animar só `transform` e `opacity`". Com poucas dezenas de nós o custo é desprezível. Se o mapa crescer muito, o caminho é desenhar as arestas em canvas.

**Descartado:** d3-force (reservado para o grafo da Fase 2) e canvas puro (perderia acessibilidade).

## 6. Componentes como funções fábrica, não Web Components

**O quê:** cada componente é uma função que devolve o elemento e, quando precisa, uma função de limpeza. Cada tela exporta `render(ctx)` e devolve `{ el, titulo, heroi?, destruir? }`.

**Por quê:** o plano previa Custom Elements, mas eles não trouxeram ganho aqui: o roteador já controla montagem e limpeza, e passar dados ricos por propriedades só acrescentava cerimônia. As funções também são mais fáceis de portar para componentes React numa migração para Next.js.

## 7. CSS em cinco arquivos

**O quê:** `tokens`, `base`, `shell`, `components` e `views`, em vez de um arquivo por componente.

**Por quê:** sem build, cada arquivo é uma requisição que bloqueia a primeira pintura.

## 8. `package.json` mínimo

**O quê:** existe só para declarar `"type": "module"` e dois scripts. Não há dependências.

**Por quê:** permite que `tools/*.js` e `tests/*.js` importem os mesmos módulos ES que o navegador usa. A alternativa era a extensão `.mjs`, que obrigaria a duplicar ou renomear módulos compartilhados.

## 9. Bibliotecas externas carregadas sob demanda

**O quê:** KaTeX 0.16.11 só é baixado quando a página tem fórmula. Fuse.js 7.0.0 é baixado com o navegador ocioso; se a CDN falhar, a busca cai para comparação simples de texto. As versões são fixas e vêm do jsDelivr.

**Por quê:** a home não paga por código que não usa, e o app continua utilizável sem a CDN (as fórmulas aparecem em TeX).

## 10. Simulador

- Cobre só concreto armado, com três tipos de elemento (laje, viga ou pilar, em contato com o solo) e a opção de controle rigoroso.
- O desenho é sempre um corte de viga em escala. Com "laje" selecionado, uma nota avisa que a seção é só referência visual.
- O cobrimento anima com mola até o novo valor; a geometria (sliders) responde no mesmo quadro.
- O simulador mostra o espaço livre entre barras, mas não o julga, porque o mínimo é um valor normativo ainda fora do escopo.
- As bitolas dos sliders são as comerciais usuais e servem apenas ao desenho.

## 11. Navegação no celular

**O quê:** a navegação principal vira barra inferior fixa. O desfoque do topo fica em um pseudo-elemento.

**Por quê:** `backdrop-filter` no próprio `header` cria um bloco de contenção e prendia a barra fixa dentro dele.

## 12. Progresso

**O quê:** "lido" é marcado pelo usuário com um botão no fim do conceito. O progresso fica em `localStorage`, na chave versionada `normas-interativas:v1`. O estado do checklist não é salvo.

**Por quê:** marcar automaticamente por rolagem infla o progresso. A chave versionada permite migrar o formato depois.

## 13. O que ficou fora da Fase 1

- A home mostra a primeira norma disponível; o seletor de norma entra com a segunda norma.
- `#/grafo` é uma tela "em breve".
- Lighthouse não foi medido nesta máquina (sem Node nem Chrome de linha de comando). Medir no site publicado.
