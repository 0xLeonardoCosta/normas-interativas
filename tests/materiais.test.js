// Testes das funções de cálculo de materiais e de ancoragem.
// LÓGICA: tabelas fictícias, com números escolhidos para dar contas exatas.
// CONSISTÊNCIA: propriedades que os dados reais precisam ter, sem fixar números em validação.
import { afirmar } from './harness.js';
import {
  grupoDeResistencia,
  resistenciaDeCalculo,
  resistenciaTracao,
  tracaoDeCalculo,
  moduloElasticidade,
  escoamentoDeCalculo,
} from '../js/calc/nbr6118/materiais.js';
import { eta3, resistenciaAderencia, comprimentoBasico, comprimentoNecessario } from '../js/calc/nbr6118/ancoragem.js';

const MAT = {
  classes: { fckMin: 10, limiteGrupoI: 40, fckMax: 100 },
  resistenciaTracao: {
    grupoI: { coeficiente: 2, expoente: [1, 2] },
    grupoII: { coeficiente: 3, fatorFck: (Math.E - 1) / 50 },
    fatorInferior: { valor: 0.5 },
    fatorSuperior: { valor: 2 },
  },
  moduloElasticidade: {
    grupoI: { coeficiente: 100 },
    grupoII: { coeficiente: 10, divisorFck: 10, parcela: 3, expoente: [1, 3] },
    alfaE: { x: { valor: 2 } },
    alfaI: { base: 0.5, inclinacao: 0.5, fckReferencia: 100, maximo: 0.8 },
  },
  coeficientesPonderacao: { gamaC: { valor: 2 }, gamaS: { valor: 2 } },
  acos: { itens: [{ id: 'A', fyk: 460, superficie: 'lisa' }] },
};

const ANC = {
  eta1: { lisa: { valor: 1 }, nervurada: { valor: 2 } },
  eta2: { boa: { valor: 1 }, ma: { valor: 0.5 } },
  eta3: { diametroLimite: { valor: 30 }, base: 130, divisor: 100 },
  comprimentoBasico: { minimoEmDiametros: { valor: 20 } },
  alfaGancho: { semGancho: { valor: 1 }, comGancho: { valor: 0.5 } },
  comprimentoMinimo: { fracaoDoBasico: { valor: 0.4 }, emDiametros: { valor: 12 }, absoluto: { valor: 90 } },
};

export default function suiteMateriais(teste, ambiente) {
  teste('materiais: grupo de resistência e limites de fck', () => {
    afirmar.igual(grupoDeResistencia(MAT, 40), 'I');
    afirmar.igual(grupoDeResistencia(MAT, 45), 'II');
    afirmar.lanca(() => grupoDeResistencia(MAT, 5));
    afirmar.lanca(() => grupoDeResistencia(MAT, 101));
    afirmar.lanca(() => resistenciaDeCalculo(MAT, NaN));
  });

  teste('materiais: fcd, tração e fctd seguem as expressões', () => {
    afirmar.aprox(resistenciaDeCalculo(MAT, 30), 15);
    const g1 = resistenciaTracao(MAT, 25);
    afirmar.aprox(g1.media, 10);
    afirmar.aprox(g1.inferior, 5);
    afirmar.aprox(g1.superior, 20);
    afirmar.aprox(tracaoDeCalculo(MAT, 25), 2.5);
    afirmar.aprox(resistenciaTracao(MAT, 50).media, 3, 1e-9);
  });

  teste('materiais: módulo de elasticidade por grupo, com αi limitado', () => {
    const g1 = moduloElasticidade(MAT, 25, 'x');
    afirmar.aprox(g1.inicial, 1000);
    afirmar.aprox(g1.alfaI, 0.625);
    afirmar.aprox(g1.secante, 625);
    const g2 = moduloElasticidade(MAT, 50, 'x');
    afirmar.aprox(g2.inicial, 40, 1e-9);
    afirmar.aprox(g2.secante, 30, 1e-9);
    afirmar.aprox(moduloElasticidade(MAT, 100, 'x').alfaI, 0.8);
    afirmar.lanca(() => moduloElasticidade(MAT, 25, 'pedra-pomes'));
  });

  teste('materiais: fyd = fyk / γs e aço desconhecido gera erro', () => {
    afirmar.aprox(escoamentoDeCalculo(MAT, 'A'), 230);
    afirmar.lanca(() => escoamentoDeCalculo(MAT, 'B'));
  });

  teste('ancoragem: fbd = η1 · η2 · η3 · fctd', () => {
    afirmar.aprox(eta3(ANC, 20), 1);
    afirmar.aprox(eta3(ANC, 40), 0.9);
    const r = resistenciaAderencia(ANC, { fctd: 4, superficie: 'nervurada', zona: 'ma', fi: 20 });
    afirmar.igual([r.eta1, r.eta2, r.eta3], [2, 0.5, 1]);
    afirmar.aprox(r.fbd, 4);
    afirmar.lanca(() => resistenciaAderencia(ANC, { fctd: 4, superficie: 'rugosa', zona: 'boa', fi: 20 }));
    afirmar.lanca(() => resistenciaAderencia(ANC, { fctd: 4, superficie: 'lisa', zona: 'media', fi: 20 }));
  });

  teste('ancoragem: lb do equilíbrio, com piso em diâmetros', () => {
    const a = comprimentoBasico(ANC, { fi: 10, fyd: 400, fbd: 4 });
    afirmar.aprox(a.equilibrio, 250);
    afirmar.aprox(a.lb, 250);
    const b = comprimentoBasico(ANC, { fi: 10, fyd: 400, fbd: 8 });
    afirmar.aprox(b.equilibrio, 125);
    afirmar.aprox(b.lb, 200);
    afirmar.lanca(() => comprimentoBasico(ANC, { fi: 10, fyd: 400, fbd: 0 }));
  });

  teste('ancoragem: lb,nec com gancho, sobra de armadura e comprimento mínimo', () => {
    const reta = comprimentoNecessario(ANC, { lb: 250, fi: 10 });
    afirmar.aprox(reta.lbNec, 250);
    afirmar.aprox(reta.minimo, 120);
    afirmar.igual(reta.governaMinimo, false);
    const curta = comprimentoNecessario(ANC, { lb: 250, fi: 10, gancho: true, razaoAs: 0.6 });
    afirmar.aprox(curta.calculado, 75);
    afirmar.aprox(curta.lbNec, 120);
    afirmar.igual(curta.governaMinimo, true);
    afirmar.lanca(() => comprimentoNecessario(ANC, { lb: 250, fi: 10, razaoAs: 1.2 }));
  });

  teste('dados reais: propriedades do concreto crescem com o fck e não saltam entre os grupos', async () => {
    const t = await ambiente.lerJSON('content/normas/nbr-6118/dados/materiais.json');
    const agregados = Object.keys(t.moduloElasticidade.alfaE);
    let anterior = null;
    for (let fck = t.classes.fckMin; fck <= t.classes.fckMax; fck += 5) {
      const tr = resistenciaTracao(t, fck);
      const mod = moduloElasticidade(t, fck, agregados[0]);
      afirmar.ok(tr.inferior < tr.media && tr.media < tr.superior, `fck ${fck}: inferior < média < superior`);
      afirmar.ok(mod.secante <= mod.inicial, `fck ${fck}: Ecs ≤ Eci`);
      if (anterior) {
        afirmar.ok(tr.media > anterior.tr.media, `fck ${fck}: fct,m deveria crescer`);
        afirmar.ok(mod.inicial > anterior.mod.inicial, `fck ${fck}: Eci deveria crescer`);
        afirmar.ok(tr.media / anterior.tr.media < 1.25, `fck ${fck}: salto em fct,m`);
        afirmar.ok(mod.inicial / anterior.mod.inicial < 1.25, `fck ${fck}: salto em Eci`);
      }
      anterior = { tr, mod };
    }
    for (const aco of t.acos.itens) afirmar.ok(aco.fyk > 0 && typeof aco.superficie === 'string', aco.id);
  });

  teste('dados reais: ancoragem coerente (mais fck encurta, má aderência alonga, gancho não alonga)', async () => {
    const mat = await ambiente.lerJSON('content/normas/nbr-6118/dados/materiais.json');
    const anc = await ambiente.lerJSON('content/normas/nbr-6118/dados/ancoragem.json');
    for (const aco of mat.acos.itens) afirmar.ok(anc.eta1[aco.superficie], `η1 ausente para ${aco.superficie}`);
    const aco = mat.acos.itens[mat.acos.itens.length > 1 ? 1 : 0];
    const lb = (fck, zona, fi = 16) => {
      const { fbd } = resistenciaAderencia(anc, { fctd: tracaoDeCalculo(mat, fck), superficie: aco.superficie, zona, fi });
      return comprimentoBasico(anc, { fi, fyd: escoamentoDeCalculo(mat, aco.id), fbd }).lb;
    };
    afirmar.ok(lb(mat.classes.fckMin, 'boa') >= lb(mat.classes.limiteGrupoI, 'boa'));
    afirmar.ok(lb(mat.classes.fckMin, 'ma') > lb(mat.classes.fckMin, 'boa'));
    const base = lb(mat.classes.fckMin, 'boa');
    const reta = comprimentoNecessario(anc, { lb: base, fi: 16 });
    const gancho = comprimentoNecessario(anc, { lb: base, fi: 16, gancho: true });
    afirmar.ok(gancho.lbNec <= reta.lbNec);
    afirmar.ok(reta.lbNec >= reta.minimo && gancho.lbNec >= gancho.minimo);
  });
}
