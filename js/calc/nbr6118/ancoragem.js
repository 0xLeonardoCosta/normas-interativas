// Aderência e ancoragem de barras tracionadas — funções puras, sem DOM, sem fetch.
//
// TODO-NORMA: validar com NBR 6118:2023, itens 9.3.2.1, 9.4.2.4 e 9.4.2.5.
// A FORMA das expressões está neste arquivo; todo coeficiente vem de
// content/normas/nbr-6118/dados/ancoragem.json (parâmetro `t`), onde cada bloco carrega
// "pendenteValidacao" e a referência do item.
//
// Unidades: mm e MPa.

function exigir(condicao, mensagem) {
  if (!condicao) throw new RangeError(mensagem);
}

const positivo = (v) => Number.isFinite(v) && v > 0;

/** Coeficiente η3: reduz a aderência de barras muito grossas. */
export function eta3(t, fi) {
  exigir(positivo(fi), 'diâmetro inválido');
  return fi < t.eta3.diametroLimite.valor ? 1 : (t.eta3.base - fi) / t.eta3.divisor;
}

/** Resistência de aderência de cálculo: fbd = η1 · η2 · η3 · fctd. */
export function resistenciaAderencia(t, { fctd, superficie, zona, fi }) {
  exigir(positivo(fctd), 'fctd inválido');
  const n1 = t.eta1[superficie]?.valor;
  const n2 = t.eta2[zona]?.valor;
  exigir(Number.isFinite(n1), `conformação superficial desconhecida: ${superficie}`);
  exigir(Number.isFinite(n2), `zona de aderência desconhecida: ${zona}`);
  const n3 = eta3(t, fi);
  return { eta1: n1, eta2: n2, eta3: n3, fbd: n1 * n2 * n3 * fctd };
}

/**
 * Comprimento de ancoragem básico: lb = (φ / 4) · (fyd / fbd), não menor que o mínimo em diâmetros.
 * Vem do equilíbrio: a força de escoamento da barra é transferida por aderência ao longo de lb.
 */
export function comprimentoBasico(t, { fi, fyd, fbd }) {
  exigir(positivo(fi) && positivo(fyd) && positivo(fbd), 'comprimentoBasico: entradas inválidas');
  const equilibrio = (fi / 4) * (fyd / fbd);
  const minimo = t.comprimentoBasico.minimoEmDiametros.valor * fi;
  return { equilibrio, minimo, lb: Math.max(equilibrio, minimo) };
}

/**
 * Comprimento de ancoragem necessário: lb,nec = α · lb · (As,calc / As,ef), não menor que lb,min.
 * lb,min é o maior entre uma fração de lb, um múltiplo do diâmetro e um valor absoluto.
 */
export function comprimentoNecessario(t, { lb, fi, gancho = false, razaoAs = 1 }) {
  exigir(positivo(lb) && positivo(fi), 'comprimentoNecessario: entradas inválidas');
  exigir(razaoAs > 0 && razaoAs <= 1, 'As,calc / As,ef deve estar entre 0 e 1');
  const alfa = (gancho ? t.alfaGancho.comGancho : t.alfaGancho.semGancho).valor;
  const m = t.comprimentoMinimo;
  const minimo = Math.max(m.fracaoDoBasico.valor * lb, m.emDiametros.valor * fi, m.absoluto.valor);
  const calculado = alfa * lb * razaoAs;
  return { alfa, calculado, minimo, lbNec: Math.max(calculado, minimo), governaMinimo: minimo > calculado };
}
