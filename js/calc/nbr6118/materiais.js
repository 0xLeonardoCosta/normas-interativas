// Propriedades do concreto em função do fck — funções puras, sem DOM, sem fetch.
//
// TODO-NORMA: validar com NBR 6118:2023, itens 8.2.1, 8.2.5 e 8.2.8 e Tabela 12.1.
// A FORMA das expressões está neste arquivo; todo coeficiente vem de
// content/normas/nbr-6118/dados/materiais.json (parâmetro `t`), onde cada bloco carrega
// "pendenteValidacao" e a referência do item.
//
// Unidades: MPa.

function exigir(condicao, mensagem) {
  if (!condicao) throw new RangeError(mensagem);
}

const potencia = (base, [numerador, denominador]) => Math.pow(base, numerador / denominador);

function conferirFck(t, fck) {
  exigir(Number.isFinite(fck), 'fck deve ser um número');
  exigir(fck >= t.classes.fckMin && fck <= t.classes.fckMax, `fck fora das classes cobertas: ${fck}`);
}

/** Grupo de resistência: 'I' até o limite do grupo I, 'II' acima dele. */
export function grupoDeResistencia(t, fck) {
  conferirFck(t, fck);
  return fck <= t.classes.limiteGrupoI ? 'I' : 'II';
}

/** Resistência de cálculo à compressão: fcd = fck / γc. */
export function resistenciaDeCalculo(t, fck) {
  conferirFck(t, fck);
  return fck / t.coeficientesPonderacao.gamaC.valor;
}

/**
 * Resistência à tração direta: média e valores característicos inferior e superior.
 * Grupo I: fct,m = k · fck^(n/d). Grupo II: fct,m = k · ln(1 + a · fck).
 */
export function resistenciaTracao(t, fck) {
  const r = t.resistenciaTracao;
  const media = grupoDeResistencia(t, fck) === 'I'
    ? r.grupoI.coeficiente * potencia(fck, r.grupoI.expoente)
    : r.grupoII.coeficiente * Math.log(1 + r.grupoII.fatorFck * fck);
  return { media, inferior: r.fatorInferior.valor * media, superior: r.fatorSuperior.valor * media };
}

/** Resistência de cálculo à tração: fctd = fctk,inf / γc. */
export function tracaoDeCalculo(t, fck) {
  return resistenciaTracao(t, fck).inferior / t.coeficientesPonderacao.gamaC.valor;
}

/**
 * Módulo de elasticidade inicial (Eci) e secante (Ecs), conforme o agregado graúdo.
 * Grupo I: Eci = αE · k · √fck. Grupo II: Eci = k · αE · (fck / d + p)^(n/d).
 * Ecs = αi · Eci, com αi = base + inclinação · fck / fckRef, limitado ao máximo.
 */
export function moduloElasticidade(t, fck, agregado) {
  const m = t.moduloElasticidade;
  const alfaE = m.alfaE[agregado]?.valor;
  exigir(Number.isFinite(alfaE), `agregado desconhecido: ${agregado}`);
  const inicial = grupoDeResistencia(t, fck) === 'I'
    ? alfaE * m.grupoI.coeficiente * Math.sqrt(fck)
    : m.grupoII.coeficiente * alfaE * potencia(fck / m.grupoII.divisorFck + m.grupoII.parcela, m.grupoII.expoente);
  const alfaI = Math.min(m.alfaI.maximo, m.alfaI.base + (m.alfaI.inclinacao * fck) / m.alfaI.fckReferencia);
  return { alfaE, alfaI, inicial, secante: alfaI * inicial };
}

/** Dados de uma categoria de aço (fyk e conformação superficial). */
export function categoriaDeAco(t, idAco) {
  const aco = t.acos.itens.find((a) => a.id === idAco);
  exigir(aco, `aço desconhecido: ${idAco}`);
  return aco;
}

/** Resistência de cálculo ao escoamento do aço: fyd = fyk / γs. */
export function escoamentoDeCalculo(t, idAco) {
  return categoriaDeAco(t, idAco).fyk / t.coeficientesPonderacao.gamaS.valor;
}
