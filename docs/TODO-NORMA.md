# TODO-NORMA

Tudo o que precisa ser conferido com a NBR 6118:2023 pelo responsável técnico. Item marcado com [x] foi validado; o restante continua pendente.

**Como validar um valor:** confira com a norma, corrija se necessário no arquivo de `content/normas/nbr-6118/dados/` indicado em cada seção, troque `"pendenteValidacao": true` por `false` no bloco e marque o item aqui. O selo "valor em validação" some sozinho da interface.

## 1. Valores normativos

Seções 1.1 a 1.3 validadas pelo responsável técnico em 13/11/2026, sem correções. Os blocos de `dados/` estão com `"pendenteValidacao": false` e o selo saiu da interface.

### 1.1 Durabilidade (`dados/durabilidade.json`)

- [x] **Tabela 6.1** (`classesAgressividade`): classes I a IV, agressividade, risco de deterioração e tipos de ambiente. Os nomes dos ambientes estão resumidos com palavras próprias.
- [x] **Tabela 7.1** (`qualidadeConcreto.armado`): relação a/c máxima e classe mínima de concreto por classe, para concreto armado.

  | CAA | a/c máx. | Classe mín. |
  |---|---|---|
  | I | 0,65 | C20 |
  | II | 0,60 | C25 |
  | III | 0,55 | C30 |
  | IV | 0,45 | C40 |

- [x] **Tabela 7.2** (`cobrimentoNominal.armado`): cobrimento nominal em mm, para Δc = 10 mm, concreto armado.

  | Elemento | I | II | III | IV |
  |---|---|---|---|---|
  | Laje | 20 | 25 | 35 | 45 |
  | Viga ou pilar | 25 | 30 | 40 | 50 |
  | Em contato com o solo | 30 | 30 | 40 | 50 |

- [x] **Item 7.4.7.3** (`deltaC.padrao`): Δc = 10 mm em obras correntes.
- [x] **Item 7.4.7.4** (`deltaC.controleRigoroso`): Δc = 5 mm com controle rigoroso de execução.
- [x] **Tabela 13.4** (`aberturaFissuras.armado`): w_k máximo para concreto armado: 0,4 mm (I), 0,3 mm (II e III), 0,2 mm (IV).

### 1.2 Propriedades dos materiais (`dados/materiais.json`)

- [x] **Item 8.2.1** (`classes`): classes de C20 a C90; grupo I até C50, grupo II acima.
- [x] **Item 8.2.5** (`resistenciaTracao`): coeficientes das expressões da tração média.

  | Grupo | Forma da expressão | Coeficientes |
  |---|---|---|
  | I | k · fck^(n/d) | k = 0,3; expoente 2/3 |
  | II | k · ln(1 + a · fck) | k = 2,12; a = 0,11 |

  Valores característicos: inferior = 0,7 × média; superior = 1,3 × média.
- [x] **Item 8.2.8** (`moduloElasticidade`): coeficientes do módulo inicial.

  | Grupo | Forma da expressão | Coeficientes |
  |---|---|---|
  | I | αE · k · √fck | k = 5600 |
  | II | k · αE · (fck/10 + p)^(1/3) | k = 21 500; p = 1,25 |

  αE: 1,2 (basalto e diabásio), 1,0 (granito e gnaisse), 0,9 (calcário), 0,7 (arenito).
  αi = 0,8 + 0,2 · fck/80, limitado a 1,0.
- [x] **Tabela 12.1** (`coeficientesPonderacao`): γc = 1,4 e γs = 1,15, combinações normais.
- [x] **Item 8.3 e Tabela 8.3** (`acos`): CA-25 (250 MPa, lisa), CA-50 (500 MPa, nervurada), CA-60 (600 MPa, entalhada).

### 1.3 Aderência e ancoragem (`dados/ancoragem.json`)

- [x] **Item 9.3.2.1** (`eta1`): 1,0 (lisa), 1,4 (entalhada), 2,25 (nervurada).
- [x] **Item 9.3.2.1** (`eta2`): 1,0 (boa aderência), 0,7 (má aderência).
- [x] **Item 9.3.2.1** (`eta3`): 1,0 para φ < 32 mm; (132 − φ)/100 a partir daí.
- [x] **Item 9.4.2.4** (`comprimentoBasico`): piso de 25 φ para o comprimento básico.
- [x] **Item 9.4.2.5** (`alfaGancho`): α = 1,0 sem gancho e 0,7 com gancho.
- [x] **Item 9.4.2.5** (`comprimentoMinimo`): maior entre 0,3 lb, 10 φ e 100 mm.

### 1.4 Ações e combinações (`dados/acoes.json`) — novo, pendente

- [ ] **Tabela 11.1** (`ponderacao`): γg = 1,4 e γq = 1,4, combinações normais, efeito desfavorável.
- [ ] **Tabela 11.2** (`fatoresDeCombinacao`): ψ0, ψ1 e ψ2 por uso.

  | Uso | ψ0 | ψ1 | ψ2 |
  |---|---|---|---|
  | Residencial | 0,5 | 0,4 | 0,3 |
  | Escritórios, lojas, edifícios públicos | 0,7 | 0,6 | 0,4 |
  | Bibliotecas, arquivos, oficinas, garagens | 0,8 | 0,7 | 0,6 |

- [ ] **Itens 11.8.2 e 11.8.3** (`combinacoes`): ELU = γg·g + γq·Q1 + Σ γq·ψ0·Qi; frequente = g + ψ1·Q1 + Σ ψ2·Qi; quase permanente = g + Σ ψ2·Qi.

### 1.5 Fissuração (`dados/fissuracao.json` e `dados/materiais.json`) — novo, pendente

- [ ] **Item 17.3.3.2** (`estadioII.alfaE`): αe = 15 no cálculo da tensão no aço no estádio II.
- [ ] **Item 17.3.3.2** (`aberturaEstimada`): w = φ/(12,5·η1) · σs/Es · 3σs/fctm e w = φ/(12,5·η1) · σs/Es · (4/ρr + 45); vale o menor.
- [ ] **Item 17.3.3.2** (`regiaoDeEnvolvimento`): cada lado da área Acr vai até 7,5 φ do eixo da barra.
- [ ] **Item 8.3.5** (`materiais.json`, `moduloAco`): Es = 210 GPa.

### 1.6 Cobrimento e espaçamento (`dados/detalhamento.json`) — novo, pendente

- [ ] **Item 7.4.7.5** (`cobrimentoEBarra`): c_nom ≥ φ da barra.
- [ ] **Item 7.4.7.6** (`cobrimentoEAgregado`): dmáx ≤ 1,2 · c_nom.
- [ ] **Item 18.3.2.2** (`espacamentoHorizontal`): espaço livre ≥ maior entre 20 mm, φ e 1,2 · dmáx.

## 2. Regras de cálculo

### 2.1 Validadas em 13/11/2026

- [x] c_nom = c_min + Δc, com c_min obtido tirando o Δc de referência da Tabela 7.2 (itens 7.4.7.2 e 7.4.7.4).
- [x] Altura útil d = h − c_nom − φt − φl/2 (geometria).
- [x] fcd = fck/γc; fctd = fctk,inf/γc; forma das expressões de fct,m, Eci e Ecs.
- [x] fbd = η1·η2·η3·fctd; lb = (φ/4)·(fyd/fbd) com piso; lb,nec = α·lb·(As,calc/As,ef) com piso.

### 2.2 Novas, pendentes

Em `js/calc/comum/combinacoes.js` (motor usado por qualquer norma):

- [ ] Com várias ações variáveis, cada uma é testada como principal e vale a combinação de maior valor.
- [ ] Ações permanentes sempre com o coeficiente desfavorável. O simulador não trata o caso de permanente favorável (γg menor).

Em `js/calc/nbr6118/fissuracao.js`:

- [ ] Seção retangular no estádio II: linha neutra por bw·x²/2 = αe·As·(d − x) e inércia I = bw·x³/3 + αe·As·(d − x)².
- [ ] σs = αe · M · (d − x) / I, com M da combinação frequente informado pelo usuário.
- [ ] **Dúvida:** a área Acr de cada barra é limitada a 7,5 φ do eixo, às faces da peça e à metade da distância até a barra vizinha. Para cima, só pelos 7,5 φ (não pela linha neutra). Está certo?
- [ ] São calculadas a barra de canto e uma barra interna; vale a maior abertura.
- [ ] Uma camada de barras iguais, flexão simples, aço CA-50.

Em `js/calc/nbr6118/detalhamento.js`:

- [ ] Comparação do cobrimento com o diâmetro da barra longitudinal e com a brita; do espaço livre com o mínimo horizontal.

## 3. Pontos que a norma trata e o app ainda não considera

Decididos em 13/11/2026 (o responsável técnico delegou a decisão; registro em `docs/DECISOES.md`, decisão 21):

- [x] Notas da Tabela 6.1 (classe mais branda em microclimas): **fica fora**. O texto já manda consultar as notas; transformar exceções em regra automática induziria a usar a classe mais branda sem critério.
- [x] Notas da Tabela 7.2 (reduções e exigências específicas): **fica fora** pelo mesmo motivo.
- [x] Itens 7.4.7.5 e 7.4.7.6 (cobrimento x barra e x agregado): **entrou**. O simulador de cobrimento ganhou a escolha da brita e avisa quando o cobrimento não atende.
- [x] Concreto protendido: **fica fora** até existir um tema de protensão; os valores são outros e mudariam todos os simuladores.
- [x] Espaçamento mínimo entre barras (item 18.3.2.2): **entrou** no simulador de cobrimento.
- [x] Critério geométrico das zonas de boa e má aderência (item 9.3.1): **fica fora**. Depende da altura da peça e da posição de cada barra; o usuário escolhe a zona e o texto explica o critério.
- [x] Cobrimento lateral para valer a redução do gancho e demais casos de α: **fica fora**; o simulador mantém o aviso.
- [x] Dimensões de ganchos e diâmetros de dobramento (item 9.4.2.3): **fica fora**; candidato a um conceito próprio de detalhamento.
- [x] Ancoragem em apoios, emendas por traspasse e barras comprimidas: **fica fora agora**; candidatos a conceitos próprios.
- [x] Fatores sobre a resistência do concreto no dimensionamento (além de γc): **fica fora** até existir o conceito de flexão.
- [x] Módulo de elasticidade por ensaio: **fica fora**; o simulador mostra a estimativa, e o texto diz que o ensaio pode substituí-la.
- [x] Bitolas por categoria de aço: **fica fora**; a restrição vem de outra norma (NBR 7480), que ainda não está no app.

Novos pontos, abertos pelos simuladores desta etapa:

- [ ] Momento de fissuração: o simulador de fissuras não confere se a seção chega a fissurar (supõe que sim).
- [ ] Ação permanente favorável e combinações especiais ou excepcionais.

## 4. Referências de item citadas no conteúdo

Conferidas em 13/11/2026:

- [x] 6.3, 6.4 e Tabela 6.1
- [x] 7.4, 7.4.2 e Tabela 7.1
- [x] 7.4.7, 7.4.7.2, 7.4.7.3, 7.4.7.4, 7.4.7.5, 7.4.7.6 e Tabela 7.2
- [x] 13.4, 13.4.2 e Tabela 13.4
- [x] 17.3.3
- [x] 8.2.1, 8.2.5, 8.2.8, 8.3 e Tabela 8.3
- [x] 9.3.1, 9.3.2.1, 9.4.2.1, 9.4.2.3, 9.4.2.4 e 9.4.2.5
- [x] 12.3.3 e Tabela 12.1

Novas, pendentes:

- [ ] 8.3.5 (módulo de elasticidade do aço)
- [ ] 11.7, Tabela 11.1 e Tabela 11.2
- [ ] 11.8.2 e 11.8.3
- [ ] 17.3.3.2
- [ ] 18.3.2.2

## 5. Conteúdo didático

Revisados em 13/11/2026 (`status: "revisado"`): os oito conceitos de durabilidade, materiais e ancoragem, o fluxograma "Do ambiente ao cobrimento" e as notas de Pareto.

Novos, pendentes:

- [ ] Conceito **Combinações de ações** (`content/normas/nbr-6118/conceitos/combinacoes-de-acoes.json`), inclusive as notas de Pareto.
- [ ] Exemplo novo em **Limites de abertura de fissuras** ("Mesma área de aço, bitolas diferentes") e o simulador de fissuração.
- [ ] Textos de aviso dos simuladores de cobrimento (brita e espaçamento) e de fissuração.
