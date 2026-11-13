// Ações na NBR 6118. Os coeficientes estão em content/normas/nbr-6118/dados/acoes.json, no formato
// padrão lido pelo motor genérico (js/calc/comum/combinacoes.js); este módulo só o reexporta.
//
// TODO-NORMA: validar com NBR 6118:2023, Tabelas 11.1 e 11.2 e itens 11.8.2 e 11.8.3.

export { categoriaDeUso, acoesDaViga, combinacoesDaViga } from '../comum/combinacoes.js';
