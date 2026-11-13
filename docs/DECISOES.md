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
- `#/grafo` era uma tela "em breve" (implementada na Fase 2, decisão 15).
- Lighthouse não foi medido nesta máquina (sem Node nem Chrome de linha de comando). Medir no site publicado.

## 14. Fórmulas normativas: a forma no código, os coeficientes nos dados

**O quê:** nos módulos `js/calc/nbr6118/materiais.js` e `ancoragem.js`, a estrutura de cada expressão (potência, logaritmo, produto) está no código, com o comentário `TODO-NORMA`. Todo coeficiente, expoente e limite vem de `dados/materiais.json` e `dados/ancoragem.json`. Expoentes fracionários são gravados como par `[numerador, denominador]`.

**Por quê:** mantém a regra da decisão 1 (um único lugar para validar números) sem inventar uma linguagem de fórmulas em JSON. Os testes de lógica usam coeficientes fictícios que dão contas exatas.

**Consequência:** `norma.json` passou a declarar os arquivos de valores no campo `dados`, e os testes percorrem essa lista.

## 15. Grafo global

- **Layout:** d3-force 3.0.0 pela CDN, usado só para as posições. O desenho é SVG próprio, como no mapa. Se a CDN falhar, o grafo aparece em círculo, sem física.
- **Entrada sem "explosão":** a simulação roda 260 passos antes da primeira pintura. Depois disso ela só volta a rodar ao arrastar um nó ou mudar um filtro, no laço de animação compartilhado.
- **Nós:** um por conceito, com raio proporcional ao score de Pareto e preenchido quando lido. Conexões para normas ainda não disponíveis viram nós tracejados, sem link.
- **Arestas:** uma por par de conceitos. Se A cita B e B cita A, vale a primeira declaração na ordem do índice.
- **Filtros:** tema, status e score mínimo. Filtrar refaz a simulação só com os nós visíveis e enquadra de novo.
- **Arrastar:** o nó segue o ponteiro e volta a obedecer às forças ao ser solto (não fica fixado).
- **Concessão:** como no mapa, as arestas mudam o atributo `d` a cada quadro.

**Descartado:** canvas (perderia foco por teclado e nomes acessíveis; com dezenas de nós o SVG dá conta) e nós para os temas (o grafo mostra relações entre conceitos; a hierarquia já está no mapa).

## 16. Painel de progresso

**O quê:** rota `#/progresso`, com números gerais, próximo conceito pelo Pareto e um cartão por tema. O CLAUDE.md lista assuntos (Flexão, Cisalhamento, Punção...) que hoje não são temas de `norma.json`; o painel segue os temas existentes e ganhará esses recortes quando houver conceitos para eles.

**Apagar progresso:** confirmação no próprio botão (segundo clique em até 4 s), sem diálogo.

**Checklist:** o estado passou a ser salvo (`progresso.checklist`), revendo a decisão 12.

## 17. Novos simuladores

- **Propriedades do concreto:** dois gráficos (tração e módulo) em função do fck, com marcador no valor atual. Os eixos são fixos para o agregado mais rígido, para a troca de agregado ser comparável.
- **Ancoragem:** barra desenhada em escala; a escala se ajusta por mola quando o comprimento muda muito. As bitolas são as comerciais usuais e servem só ao desenho; o simulador não impede combinações que o mercado não oferece (por exemplo CA-60 em bitola grossa).
- **Fora desta etapa:** simuladores de fissuração e de estados-limites. As expressões envolvem mais hipóteses de engenharia do que as desta etapa e pedem definição do responsável técnico antes.
- Os controles (grupo de opções, deslizante, alternador, painéis) foram extraídos para `js/simuladores/controles.js`.

## 18. Scripts Node rodados com Bun nesta máquina

`tools/test.js` e `tools/build-index.js` usam só APIs do Node e rodam igual com `bun`. O GitHub Actions continua usando Node 22.

## 19. Combinações de ações: motor genérico, regras como dados

**O quê:** `js/calc/comum/combinacoes.js` combina ações de qualquer norma de forma linear. Cada combinação é descrita em `dados/acoes.json` como a lista de coeficientes que multiplicam cada papel (permanentes, variável principal, variáveis secundárias); cada variável é tentada como principal e vale o maior resultado. O simulador `js/simuladores/comum/combinacoes.js` é registrado por norma com `paraNorma('<id>')`.

**Por quê:** o responsável técnico quer reaproveitar o simulador nas próximas normas (o projeto caminha para um "livro" de mapas mentais com várias normas). NBR 6118/8681, Eurocode e ACI combinam ações como somas de produtos de coeficientes; muda só a tabela. Isso abre uma exceção à decisão 14: aqui a regra de combinação também é dado, porque é ela que varia entre normas.

**Descartado:** um simulador por norma (duplicaria a interface) e uma linguagem de fórmulas genérica em JSON (complexa demais para o ganho).

## 20. Fissuração calculada a partir do momento e da seção

**O quê:** o simulador de abertura de fissuras calcula a linha neutra e a tensão no aço no estádio II a partir do momento em serviço (combinação frequente) e da seção retangular, só para concreto armado, como pedido pelo responsável técnico. Avalia a barra de canto e uma interna e mostra a maior abertura, com as duas expressões da norma e a que governa.

**Simplificações declaradas:** uma camada de barras iguais, CA-50, sem verificação do momento de fissuração. A regra da área de envolvimento está em `docs/TODO-NORMA.md` como dúvida.

## 21. Pontos fora do app: decisão delegada

O responsável técnico pediu que eu decidisse item a item. Critério: entra o que é verificação geométrica direta e cabe no simulador existente sem novas hipóteses de engenharia (cobrimento x barra, cobrimento x brita, espaçamento mínimo). Fica fora o que depende de exceções da norma, de outra norma ainda ausente ou de um conceito que ainda não existe. A lista com o motivo de cada um está em `docs/TODO-NORMA.md`, seção 3.
