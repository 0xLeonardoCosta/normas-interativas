// Abertura de fissuras em vigas de concreto armado — funções puras, sem DOM, sem fetch.
//
// TODO-NORMA: validar com NBR 6118:2023, item 17.3.3.2 (e 8.3.5 para Es).
// A FORMA das expressões está neste arquivo; todo coeficiente vem de
// content/normas/nbr-6118/dados/fissuracao.json (parâmetro `t`).
//
// Escopo: seção retangular, concreto armado, uma camada de barras iguais, flexão simples.
// Unidades: mm, MPa, N·mm. Momentos de entrada em kN·m.

import { resistenciaTracao, categoriaDeAco } from './materiais.js';

function exigir(condicao, mensagem) {
  if (!condicao) throw new RangeError(mensagem);
}

const positivo = (v) => Number.isFinite(v) && v > 0;

/**
 * Seção retangular fissurada (estádio II): concreto comprimido elástico, sem tração no concreto.
 * Linha neutra: bw · x² / 2 = αe · As · (d − x). Inércia: I = bw · x³ / 3 + αe · As · (d − x)².
 */
export function secaoEstadioII({ bw, d, As, alfaE }) {
  exigir([bw, d, As, alfaE].every(positivo), 'secaoEstadioII: entradas inválidas');
  const a = alfaE * As;
  const x = (a / bw) * (Math.sqrt(1 + (2 * bw * d) / a) - 1);
  const I = (bw * x ** 3) / 3 + a * (d - x) ** 2;
  return { x, I };
}

/** Tensão na armadura tracionada em serviço: σs = αe · M · (d − x) / I. M em N·mm. */
export function tensaoNaArmadura({ M, d, x, I, alfaE }) {
  exigir(Number.isFinite(M) && M >= 0 && [d, I, alfaE].every(positivo) && x < d, 'tensaoNaArmadura: entradas inválidas');
  return (alfaE * M * (d - x)) / I;
}

/**
 * Área de concreto que envolve uma barra (Acr): retângulo centrado no eixo da barra, com cada lado
 * limitado a `raio` diâmetros, às faces da peça e à metade da distância até a barra vizinha.
 * lados: distâncias livres do eixo da barra em cada direção { esquerda, direita, abaixo, acima }.
 */
export function areaDeEnvolvimento(t, { fi, lados }) {
  exigir(positivo(fi), 'areaDeEnvolvimento: diâmetro inválido');
  const r = t.regiaoDeEnvolvimento.raioEmDiametros.valor * fi;
  const lim = (v) => Math.min(r, Math.max(0, v));
  return (lim(lados.esquerda) + lim(lados.direita)) * (lim(lados.abaixo) + lim(lados.acima));
}

/**
 * Abertura característica estimada: o menor entre
 *   w1 = φ / (k · η1) · σs / Es · (a · σs / fctm)
 *   w2 = φ / (k · η1) · σs / Es · (b / ρr + c)
 */
export function aberturaEstimada(t, { fi, eta1, sigmaS, Es, fctm, rhoR }) {
  exigir([fi, eta1, Es, fctm, rhoR].every(positivo) && Number.isFinite(sigmaS) && sigmaS >= 0, 'aberturaEstimada: entradas inválidas');
  const e = t.aberturaEstimada;
  const base = (fi / (e.divisor * eta1)) * (sigmaS / Es);
  const w1 = base * ((e.fatorTracao * sigmaS) / fctm);
  const w2 = base * (e.coeficienteTaxa / rhoR + e.constanteTaxa);
  return { w1, w2, wk: Math.min(w1, w2), governa: w1 <= w2 ? 'w1' : 'w2' };
}

/**
 * Verificação completa de uma viga retangular.
 * tabelas: { fis, mat, anc, dur } (dados de fissuração, materiais, ancoragem e durabilidade).
 * entrada: { fck, aco, bw, h, c, fiT, fi, n, Mk (kN·m), caa }
 */
export function fissuracaoDaViga({ fis, mat, anc, dur }, { fck, aco, bw, h, c, fiT, fi, n, Mk, caa }) {
  exigir(Number.isInteger(n) && n >= 2, 'são necessárias pelo menos 2 barras');
  exigir([bw, h, c, fi].every(positivo) && fiT >= 0, 'geometria inválida');

  const alfaE = fis.estadioII.alfaE.valor;
  const Es = mat.moduloAco.valor;
  const { superficie, fyk } = categoriaDeAco(mat, aco);
  const eta1 = anc.eta1[superficie]?.valor;
  exigir(Number.isFinite(eta1), `η1 ausente para ${superficie}`);
  const fctm = resistenciaTracao(mat, fck).media;

  const eixoLateral = c + fiT + fi / 2; // da face lateral ao eixo da barra de canto
  const abaixo = c + fiT + fi / 2; // da face inferior ao eixo das barras
  const d = h - abaixo;
  exigir(d > 0, 'altura útil não positiva');
  const s = (bw - 2 * eixoLateral) / (n - 1); // distância entre eixos de barras vizinhas
  exigir(s > fi, 'as barras não cabem na largura');

  const As1 = (Math.PI * fi * fi) / 4;
  const As = n * As1;
  const secao = secaoEstadioII({ bw, d, As, alfaE });
  const sigmaS = tensaoNaArmadura({ M: Mk * 1e6, d, x: secao.x, I: secao.I, alfaE });

  // Barra de canto e, se houver, barra interna: vale a maior abertura.
  const acima = h - abaixo;
  const posicoes = [{ id: 'canto', lados: { esquerda: eixoLateral, direita: s / 2, abaixo, acima } }];
  if (n >= 3) posicoes.push({ id: 'interna', lados: { esquerda: s / 2, direita: s / 2, abaixo, acima } });
  const barras = posicoes.map((p) => {
    const Acr = areaDeEnvolvimento(fis, { fi, lados: p.lados });
    const rhoR = As1 / Acr;
    return { posicao: p.id, Acr, rhoR, ...aberturaEstimada(fis, { fi, eta1, sigmaS, Es, fctm, rhoR }) };
  });
  const critica = barras.reduce((a, b) => (b.wk > a.wk ? b : a));

  const limite = caa ? dur.aberturaFissuras.armado[caa] : null;
  return {
    d, As, alfaE, Es, eta1, fctm, fyk, s,
    x: secao.x, I: secao.I, sigmaS,
    sigmaC: (Mk * 1e6 * secao.x) / secao.I, // tensão no concreto na borda comprimida
    fyd: fyk / mat.coeficientesPonderacao.gamaS.valor,
    barras, critica, wk: critica.wk,
    limite, atende: limite == null ? null : critica.wk <= limite,
  };
}
