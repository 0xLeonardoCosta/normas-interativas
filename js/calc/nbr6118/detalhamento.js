// Exigências geométricas de cobrimento e espaçamento de barras — funções puras.
//
// TODO-NORMA: validar com NBR 6118:2023, itens 7.4.7.5, 7.4.7.6 e 18.3.2.2.
// Todo coeficiente vem de content/normas/nbr-6118/dados/detalhamento.json (parâmetro `t`).
// Unidades: mm.

function exigir(condicao, mensagem) {
  if (!condicao) throw new RangeError(mensagem);
}

const positivo = (v) => Number.isFinite(v) && v > 0;

/**
 * Cobrimento x barra e cobrimento x agregado.
 * O cobrimento precisa ser ao menos proporcional ao diâmetro da barra, e o agregado graúdo
 * precisa caber nele (dimensão máxima limitada a um múltiplo do cobrimento).
 */
export function exigenciasDeCobrimento(t, { cNom, fi, dmax }) {
  exigir([cNom, fi, dmax].every(positivo), 'exigenciasDeCobrimento: entradas inválidas');
  const minimoPorBarra = t.cobrimentoEBarra.fatorDiametro.valor * fi;
  const dmaxPermitido = t.cobrimentoEAgregado.fatorCobrimento.valor * cNom;
  return {
    minimoPorBarra,
    atendeBarra: cNom >= minimoPorBarra,
    dmaxPermitido,
    atendeAgregado: dmax <= dmaxPermitido,
  };
}

/** Espaço livre mínimo horizontal entre barras da mesma camada: o maior entre absoluto, φ e dmax. */
export function espacamentoMinimoHorizontal(t, { fi, dmax }) {
  exigir([fi, dmax].every(positivo), 'espacamentoMinimoHorizontal: entradas inválidas');
  const e = t.espacamentoHorizontal;
  const parcelas = {
    absoluto: e.absoluto.valor,
    diametro: e.fatorDiametro.valor * fi,
    agregado: e.fatorAgregado.valor * dmax,
  };
  const [governa, minimo] = Object.entries(parcelas).reduce((a, b) => (b[1] > a[1] ? b : a));
  return { minimo, governa, parcelas };
}
