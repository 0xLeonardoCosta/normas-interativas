// Cálculos de durabilidade da NBR 6118 — funções puras, sem DOM, sem fetch.
//
// TODO-NORMA: validar com NBR 6118:2023, Tabelas 6.1, 7.1, 7.2 e 13.4 e itens 7.4.7.2 a 7.4.7.4.
// Nenhum valor normativo é escrito neste arquivo: todos vêm de
// content/normas/nbr-6118/dados/durabilidade.json (parâmetro `tabelas`), onde cada bloco
// carrega "pendenteValidacao" e a referência do item.

export const CLASSES = ['I', 'II', 'III', 'IV'];

function exigir(condicao, mensagem) {
  if (!condicao) throw new RangeError(mensagem);
}

function linha(tabela, tipo, nome) {
  const dados = tabela?.[tipo];
  exigir(dados, `${nome}: tipo de concreto não suportado: ${tipo}`);
  return dados;
}

/** Dados descritivos de uma classe de agressividade ambiental (CAA). */
export function classeAgressividade(tabelas, caa) {
  const item = tabelas.classesAgressividade.itens.find((i) => i.id === caa);
  exigir(item, `classe de agressividade desconhecida: ${caa}`);
  return item;
}

/**
 * Requisitos de durabilidade a partir da CAA e do tipo de elemento.
 *
 * c_nom = c_min + Δc (item 7.4.7.2). A tabela de cobrimentos é escrita para um Δc de referência
 * (`deltaCDaTabela`); com controle rigoroso de execução o Δc muda e o c_nom acompanha.
 *
 * Unidades: mm para cobrimentos, MPa para a classe (C25 → 25).
 */
export function requisitosDurabilidade(tabelas, { caa, elemento, controleRigoroso = false, tipo = 'armado' }) {
  classeAgressividade(tabelas, caa);
  const qualidade = linha(tabelas.qualidadeConcreto, tipo, 'qualidade do concreto')[caa];
  const porElemento = linha(tabelas.cobrimentoNominal, tipo, 'cobrimento')[elemento];
  exigir(porElemento, `tipo de elemento desconhecido: ${elemento}`);

  const deltaC = (controleRigoroso ? tabelas.deltaC.controleRigoroso : tabelas.deltaC.padrao).valor;
  const cobrimentoMinimo = porElemento[caa] - tabelas.cobrimentoNominal.deltaCDaTabela;
  exigir(cobrimentoMinimo > 0 && deltaC >= 0, 'tabelas de cobrimento inconsistentes');

  return {
    caa,
    elemento,
    controleRigoroso,
    relacaoAcMax: qualidade.relacaoAcMax,
    classeConcretoMin: qualidade.classeMin,
    deltaC,
    cobrimentoMinimo,
    cobrimentoNominal: cobrimentoMinimo + deltaC,
  };
}

/** Abertura máxima característica de fissuras w_k (mm) para a CAA. */
export function limiteAberturaFissuras(tabelas, caa, tipo = 'armado') {
  classeAgressividade(tabelas, caa);
  return linha(tabelas.aberturaFissuras, tipo, 'abertura de fissuras')[caa];
}

// --- Geometria da seção (não normativa: apenas consequência do cobrimento) -------------------

/**
 * Altura útil d (mm) para uma camada de barras: distância da borda comprimida ao centro da
 * armadura tracionada. d = h − c − φt − φl/2.
 */
export function alturaUtil({ h, c, fiT, fiL }) {
  exigir([h, c, fiT, fiL].every((v) => Number.isFinite(v) && v >= 0), 'alturaUtil: entradas inválidas');
  return h - c - fiT - fiL / 2;
}

/**
 * Espaçamento livre horizontal (mm) entre n barras de uma camada.
 * Negativo significa que as barras não cabem na largura. Com n < 2 não há espaçamento (null).
 */
export function espacamentoLivre({ bw, c, fiT, fiL, n }) {
  exigir(Number.isInteger(n) && n >= 1, 'espacamentoLivre: n deve ser inteiro ≥ 1');
  if (n < 2) return null;
  return (bw - 2 * (c + fiT) - n * fiL) / (n - 1);
}
