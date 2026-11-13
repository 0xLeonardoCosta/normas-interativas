# TODO-NORMA

Tudo o que precisa ser conferido com a NBR 6118:2023 pelo responsável técnico. Item marcado com [x] foi validado; o restante continua pendente.

**Como validar um valor:** confira com a norma, corrija se necessário no arquivo de `content/normas/nbr-6118/dados/` indicado em cada seção, troque `"pendenteValidacao": true` por `false` no bloco e marque o item aqui. O selo "valor em validação" some sozinho da interface.

## 1. Valores normativos

Validados pelo responsável técnico em 13/11/2026, sem correções. Os blocos de `dados/` estão com `"pendenteValidacao": false` e o selo saiu da interface.

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

## 2. Regras de cálculo

Em `js/calc/nbr6118/durabilidade.js`:

- [ ] **Item 7.4.7.2:** c_nom = c_min + Δc. O simulador obtém o c_min subtraindo o Δc de referência da Tabela 7.2 e soma o Δc escolhido. Confirmar que é assim que a redução do item 7.4.7.4 deve ser aplicada à tabela.
- [ ] Altura útil d = h − c_nom − φt − φl/2, para uma camada de barras (geometria, não é exigência da norma).

Em `js/calc/nbr6118/materiais.js`:

- [ ] fcd = fck / γc. O simulador mostra só essa divisão; não aplica fatores adicionais sobre a tensão no concreto usados no dimensionamento à flexão.
- [ ] fctd = fctk,inf / γc.
- [ ] Forma das expressões de fct,m, Eci e Ecs nos dois grupos de resistência.

Em `js/calc/nbr6118/ancoragem.js`:

- [ ] fbd = η1 · η2 · η3 · fctd.
- [ ] lb = (φ/4) · (fyd/fbd), com piso em diâmetros.
- [ ] lb,nec = α · lb · (As,calc / As,ef), com piso em lb,mín.

## 3. Pontos que a norma trata e o app ainda não considera

Decidir se entram, e como:

- [ ] Notas da Tabela 6.1 que admitem classe mais branda para certos microclimas. Hoje o texto apenas manda consultar as notas.
- [ ] Notas da Tabela 7.2 (reduções para lajes e vigas com revestimento, exigência específica para trechos de pilares em contato com o solo junto às fundações, entre outras).
- [ ] Itens 7.4.7.5 e 7.4.7.6: relação do cobrimento com o diâmetro da barra e com a dimensão máxima do agregado. São citados no conceito sem números.
- [ ] Concreto protendido: Tabelas 7.1, 7.2 e 13.4 têm valores próprios. O simulador cobre só concreto armado.
- [ ] Espaçamento mínimo entre barras (item 18.3.2.2): o simulador mostra o espaço livre, mas não o compara com o mínimo.

- [ ] Critérios geométricos das zonas de boa e má aderência (item 9.3.1). O conteúdo descreve o motivo físico e manda consultar o item; o simulador deixa o usuário escolher a zona.
- [ ] Condição de cobrimento lateral para valer a redução do gancho (item 9.4.2.5) e os demais casos de α (barras transversais soldadas). O simulador só tem "com gancho" e "sem gancho".
- [ ] Dimensões dos ganchos e diâmetros de dobramento (item 9.4.2.3).
- [ ] Ancoragem em apoios, emendas por traspasse e ancoragem de barras comprimidas.
- [ ] Fatores aplicados à resistência do concreto no dimensionamento (além de γc), em especial para o grupo II.
- [ ] Módulo de elasticidade: a norma permite ensaio no lugar da estimativa; o simulador só estima.
- [ ] Bitolas oferecidas no simulador de ancoragem não são restringidas por categoria de aço.

## 4. Referências de item citadas no conteúdo

Conferir se a numeração bate com a edição de 2023:

- [ ] 6.3 (mecanismos de deterioração), 6.4 e Tabela 6.1
- [ ] 7.4, 7.4.2 e Tabela 7.1
- [ ] 7.4.7, 7.4.7.2, 7.4.7.3, 7.4.7.4, 7.4.7.5, 7.4.7.6 e Tabela 7.2
- [ ] 13.4, 13.4.2 e Tabela 13.4
- [ ] 17.3.3 (estado-limite de abertura de fissuras)
- [ ] 8.2.1, 8.2.5, 8.2.8, 8.3 e Tabela 8.3
- [ ] 9.3.1, 9.3.2.1, 9.4.2.1, 9.4.2.3, 9.4.2.4 e 9.4.2.5
- [ ] 12.3.3 e Tabela 12.1

## 5. Conteúdo didático em rascunho

Os oito conceitos estão com `status: "rascunho"`. Ao revisar, troque para `"revisado"`.

- [ ] Classe de agressividade ambiental
- [ ] Qualidade do concreto: relação a/c e classe
- [ ] Cobrimento nominal. Atenção ao trecho que usa o modelo x ≈ k√t: é uma simplificação da literatura, não está na norma.
- [ ] Tolerância de execução (Δc)
- [ ] Limites de abertura de fissuras
- [ ] fck e as propriedades do concreto
- [ ] Aderência entre aço e concreto. Atenção à explicação do fendilhamento e das zonas de aderência: é o modelo físico usual da literatura, escrito com palavras próprias.
- [ ] Comprimento de ancoragem
- [ ] Fluxograma "Do ambiente ao cobrimento": a sequência de perguntas simplifica a Tabela 6.1 em quatro ambientes.
- [ ] Notas de Pareto (importância, frequência, dificuldade, tempo) de cada conceito: são estimativas minhas.
