# TODO-NORMA

Tudo o que precisa ser conferido com a NBR 6118:2023 pelo responsável técnico. Nada desta lista deve ser tratado como validado.

**Como validar um valor:** confira com a norma, corrija se necessário em `content/normas/nbr-6118/dados/durabilidade.json`, troque `"pendenteValidacao": true` por `false` no bloco e marque o item aqui. O selo "valor em validação" some sozinho da interface.

## 1. Valores normativos

Fonte única: `content/normas/nbr-6118/dados/durabilidade.json`. Os valores foram preenchidos de memória para o simulador funcionar e estão todos com selo.

- [ ] **Tabela 6.1** (`classesAgressividade`): classes I a IV, agressividade, risco de deterioração e tipos de ambiente. Os nomes dos ambientes estão resumidos com palavras próprias.
- [ ] **Tabela 7.1** (`qualidadeConcreto.armado`): relação a/c máxima e classe mínima de concreto por classe, para concreto armado.

  | CAA | a/c máx. | Classe mín. |
  |---|---|---|
  | I | 0,65 | C20 |
  | II | 0,60 | C25 |
  | III | 0,55 | C30 |
  | IV | 0,45 | C40 |

- [ ] **Tabela 7.2** (`cobrimentoNominal.armado`): cobrimento nominal em mm, para Δc = 10 mm, concreto armado.

  | Elemento | I | II | III | IV |
  |---|---|---|---|---|
  | Laje | 20 | 25 | 35 | 45 |
  | Viga ou pilar | 25 | 30 | 40 | 50 |
  | Em contato com o solo | 30 | 30 | 40 | 50 |

- [ ] **Item 7.4.7.3** (`deltaC.padrao`): Δc = 10 mm em obras correntes.
- [ ] **Item 7.4.7.4** (`deltaC.controleRigoroso`): Δc = 5 mm com controle rigoroso de execução.
- [ ] **Tabela 13.4** (`aberturaFissuras.armado`): w_k máximo para concreto armado: 0,4 mm (I), 0,3 mm (II e III), 0,2 mm (IV).

## 2. Regras de cálculo

Em `js/calc/nbr6118/durabilidade.js`:

- [ ] **Item 7.4.7.2:** c_nom = c_min + Δc. O simulador obtém o c_min subtraindo o Δc de referência da Tabela 7.2 e soma o Δc escolhido. Confirmar que é assim que a redução do item 7.4.7.4 deve ser aplicada à tabela.
- [ ] Altura útil d = h − c_nom − φt − φl/2, para uma camada de barras (geometria, não é exigência da norma).

## 3. Pontos que a norma trata e o app ainda não considera

Decidir se entram, e como:

- [ ] Notas da Tabela 6.1 que admitem classe mais branda para certos microclimas. Hoje o texto apenas manda consultar as notas.
- [ ] Notas da Tabela 7.2 (reduções para lajes e vigas com revestimento, exigência específica para trechos de pilares em contato com o solo junto às fundações, entre outras).
- [ ] Itens 7.4.7.5 e 7.4.7.6: relação do cobrimento com o diâmetro da barra e com a dimensão máxima do agregado. São citados no conceito sem números.
- [ ] Concreto protendido: Tabelas 7.1, 7.2 e 13.4 têm valores próprios. O simulador cobre só concreto armado.
- [ ] Espaçamento mínimo entre barras (item 18.3.2.2): o simulador mostra o espaço livre, mas não o compara com o mínimo.

## 4. Referências de item citadas no conteúdo

Conferir se a numeração bate com a edição de 2023:

- [ ] 6.3 (mecanismos de deterioração), 6.4 e Tabela 6.1
- [ ] 7.4, 7.4.2 e Tabela 7.1
- [ ] 7.4.7, 7.4.7.2, 7.4.7.3, 7.4.7.4, 7.4.7.5, 7.4.7.6 e Tabela 7.2
- [ ] 13.4, 13.4.2 e Tabela 13.4
- [ ] 17.3.3 (estado-limite de abertura de fissuras)

## 5. Conteúdo didático em rascunho

Os cinco conceitos estão com `status: "rascunho"`. Ao revisar, troque para `"revisado"`.

- [ ] Classe de agressividade ambiental
- [ ] Qualidade do concreto: relação a/c e classe
- [ ] Cobrimento nominal. Atenção ao trecho que usa o modelo x ≈ k√t: é uma simplificação da literatura, não está na norma.
- [ ] Tolerância de execução (Δc)
- [ ] Limites de abertura de fissuras
- [ ] Fluxograma "Do ambiente ao cobrimento": a sequência de perguntas simplifica a Tabela 6.1 em quatro ambientes.
- [ ] Notas de Pareto (importância, frequência, dificuldade, tempo) de cada conceito: são estimativas minhas.
