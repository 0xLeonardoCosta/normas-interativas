// Testes de combinações de ações, fissuração e exigências de detalhamento.
// LÓGICA: tabelas fictícias, com números escolhidos para dar contas exatas.
// CONSISTÊNCIA: propriedades que os dados reais precisam ter, sem fixar números em validação.
import { afirmar } from './harness.js';
import { fator, combinar, combinarTodas, momentoBiapoiada } from '../js/calc/comum/combinacoes.js';
import { acoesDaViga, combinacoesDaViga } from '../js/calc/nbr6118/acoes.js';
import { secaoEstadioII, tensaoNaArmadura, areaDeEnvolvimento, aberturaEstimada, fissuracaoDaViga } from '../js/calc/nbr6118/fissuracao.js';
import { exigenciasDeCobrimento, espacamentoMinimoHorizontal } from '../js/calc/nbr6118/detalhamento.js';

const ELU = { id: 'u', permanente: ['gama'], principal: ['gama'], secundarias: ['gama', 'psi0'] };
const FREQ = { id: 'f', permanente: [], principal: ['psi1'], secundarias: ['psi2'] };
const G = { id: 'g', tipo: 'permanente', valor: 10, coeficientes: { gama: 2 } };
const Q1 = { id: 'q1', tipo: 'variavel', valor: 10, coeficientes: { gama: 3, psi0: 0.5, psi1: 0.4, psi2: 0.2 } };
const Q2 = { id: 'q2', tipo: 'variavel', valor: 20, coeficientes: { gama: 3, psi0: 0.1, psi1: 0.5, psi2: 0.3 } };

const FIS = {
  estadioII: { alfaE: { valor: 10 } },
  aberturaEstimada: { divisor: 10, fatorTracao: 2, coeficienteTaxa: 1, constanteTaxa: 10 },
  regiaoDeEnvolvimento: { raioEmDiametros: { valor: 2 } },
};

const DET = {
  cobrimentoEBarra: { fatorDiametro: { valor: 1 } },
  cobrimentoEAgregado: { fatorCobrimento: { valor: 1.2 } },
  espacamentoHorizontal: { absoluto: { valor: 20 }, fatorDiametro: { valor: 1 }, fatorAgregado: { valor: 1.2 } },
};

export default function suiteEstruturas(teste, ambiente) {
  // --- Combinações (motor genérico) -------------------------------------------------------------
  teste('combinações: produto dos coeficientes nomeados', () => {
    afirmar.aprox(fator(Q1, ['gama', 'psi0']), 1.5);
    afirmar.igual(fator(Q1, []), 1);
    afirmar.lanca(() => fator(G, ['psi1']));
  });

  teste('combinações: cada variável é tentada como principal e vale a maior', () => {
    const u = combinar(ELU, [G, Q1, Q2]);
    afirmar.aprox(u.valor, 95); // 2·10 + 3·20 + 3·0,5·10
    afirmar.igual(u.principal, 'q2');
    const f = combinar(FREQ, [G, Q1, Q2]);
    afirmar.aprox(f.valor, 22); // 10 + 0,5·20 + 0,2·10
    afirmar.igual(f.principal, 'q2');
    afirmar.igual(f.parcelas.map((p) => p.papel), ['permanente', 'secundarias', 'principal']);
  });

  teste('combinações: só permanentes, várias normas e entradas inválidas', () => {
    const r = combinar(ELU, [G]);
    afirmar.aprox(r.valor, 20);
    afirmar.igual(r.principal, null);
    const todas = combinarTodas([ELU, FREQ], [G, Q1]);
    afirmar.aprox(todas.u.valor, 50);
    afirmar.aprox(todas.f.valor, 14);
    afirmar.lanca(() => combinar({ permanente: [], principal: [] }, [G]));
    afirmar.lanca(() => combinar(ELU, [{ id: 'x', tipo: 'excepcional', valor: 1, coeficientes: {} }]));
    afirmar.lanca(() => combinar(ELU, [{ ...G, valor: -1 }]));
    afirmar.aprox(momentoBiapoiada(8, 5), 25);
  });

  teste('dados reais: ELU ≥ frequente ≥ quase permanente, e ψ2 ≤ ψ1 ≤ ψ0 ≤ 1', async () => {
    const t = await ambiente.lerJSON('content/normas/nbr-6118/dados/acoes.json');
    const ids = t.combinacoes.itens.map((c) => c.id);
    afirmar.igual(ids, ['elu', 'els-frequente', 'els-quase-permanente']);
    for (const c of t.fatoresDeCombinacao.itens) {
      afirmar.ok(c.psi2 <= c.psi1 && c.psi1 <= c.psi0 && c.psi0 <= 1, `ψ fora de ordem em ${c.id}`);
      const r = combinacoesDaViga(t, { g: 20, q: 10, categoria: c.id });
      afirmar.ok(r.elu.valor >= r['els-frequente'].valor && r['els-frequente'].valor >= r['els-quase-permanente'].valor, c.id);
      afirmar.aprox(r['els-quase-permanente'].valor, 20 + c.psi2 * 10, 1e-9);
    }
    afirmar.lanca(() => acoesDaViga(t, { g: 1, q: 1, categoria: 'hangar' }));
  });

  // --- Fissuração -------------------------------------------------------------------------------
  teste('fissuração: linha neutra e inércia no estádio II', () => {
    const s = secaoEstadioII({ bw: 100, d: 20, As: 50, alfaE: 10 });
    afirmar.aprox(s.x, 10, 1e-9);
    afirmar.aprox(s.I, 250000 / 3, 1e-6);
    afirmar.aprox(tensaoNaArmadura({ M: 1e6, d: 20, x: s.x, I: s.I, alfaE: 10 }), 1200, 1e-6);
    afirmar.lanca(() => secaoEstadioII({ bw: 0, d: 20, As: 50, alfaE: 10 }));
  });

  teste('fissuração: área de envolvimento limitada pelo raio e pelas faces', () => {
    afirmar.aprox(areaDeEnvolvimento(FIS, { fi: 10, lados: { esquerda: 5, direita: 30, abaixo: 10, acima: 100 } }), 750);
  });

  teste('fissuração: vale a menor das duas expressões', () => {
    const a = aberturaEstimada(FIS, { fi: 10, eta1: 1, sigmaS: 100, Es: 1000, fctm: 10, rhoR: 0.05 });
    afirmar.aprox(a.w1, 2);
    afirmar.aprox(a.w2, 3);
    afirmar.aprox(a.wk, 2);
    afirmar.igual(a.governa, 'w1');
    const b = aberturaEstimada(FIS, { fi: 10, eta1: 1, sigmaS: 100, Es: 1000, fctm: 10, rhoR: 1 });
    afirmar.aprox(b.wk, 1.1);
    afirmar.igual(b.governa, 'w2');
  });

  teste('dados reais: abertura cresce com o momento e com a bitola, e a tensão é plausível', async () => {
    const [fis, mat, anc, dur] = await Promise.all(['fissuracao', 'materiais', 'ancoragem', 'durabilidade']
      .map((n) => ambiente.lerJSON(`content/normas/nbr-6118/dados/${n}.json`)));
    const tab = { fis, mat, anc, dur };
    const base = { fck: 25, aco: 'CA-50', bw: 200, h: 500, c: 30, fiT: 5, fi: 16, n: 3, Mk: 60, caa: 'II' };
    const r = fissuracaoDaViga(tab, base);
    afirmar.ok(r.sigmaS > 100 && r.sigmaS < r.fyk, `σs implausível: ${r.sigmaS}`);
    afirmar.ok(r.x > 0 && r.x < r.d);
    afirmar.ok(typeof r.atende === 'boolean');
    afirmar.ok(fissuracaoDaViga(tab, { ...base, Mk: 80 }).wk > r.wk, 'mais momento deveria abrir mais');
    // Mesma área aproximada: 2 φ20 (628 mm²) contra 5 φ12,5 (614 mm²). Barras finas fissuram menos.
    afirmar.ok(fissuracaoDaViga(tab, { ...base, fi: 12.5, n: 5 }).wk < fissuracaoDaViga(tab, { ...base, fi: 20, n: 2 }).wk);
    afirmar.lanca(() => fissuracaoDaViga(tab, { ...base, n: 1 }));
    afirmar.lanca(() => fissuracaoDaViga(tab, { ...base, bw: 80, n: 6 }));
  });

  // --- Detalhamento -----------------------------------------------------------------------------
  teste('detalhamento: cobrimento × barra e cobrimento × agregado', () => {
    const ok = exigenciasDeCobrimento(DET, { cNom: 25, fi: 20, dmax: 19 });
    afirmar.igual([ok.atendeBarra, ok.atendeAgregado], [true, true]);
    afirmar.aprox(ok.dmaxPermitido, 30);
    const ruim = exigenciasDeCobrimento(DET, { cNom: 15, fi: 20, dmax: 19 });
    afirmar.igual([ruim.atendeBarra, ruim.atendeAgregado], [false, false]);
  });

  teste('detalhamento: espaçamento mínimo é o maior dos três critérios', () => {
    afirmar.igual(espacamentoMinimoHorizontal(DET, { fi: 25, dmax: 19 }).governa, 'diametro');
    const ag = espacamentoMinimoHorizontal(DET, { fi: 10, dmax: 25 });
    afirmar.aprox(ag.minimo, 30);
    afirmar.igual(ag.governa, 'agregado');
    afirmar.igual(espacamentoMinimoHorizontal(DET, { fi: 10, dmax: 9.5 }).governa, 'absoluto');
  });
}
