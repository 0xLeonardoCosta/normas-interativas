// Testes das funções de cálculo de durabilidade.
// Os testes de LÓGICA usam uma tabela fictícia, para não depender de valores normativos.
// Os testes de CONSISTÊNCIA conferem propriedades que os dados reais precisam ter,
// sem fixar números (que ainda estão em validação).
import { afirmar } from './harness.js';
import {
  CLASSES,
  requisitosDurabilidade,
  limiteAberturaFissuras,
  alturaUtil,
  espacamentoLivre,
} from '../js/calc/nbr6118/durabilidade.js';

const FICTICIA = {
  classesAgressividade: { itens: CLASSES.map((id) => ({ id, agressividade: id, risco: id, ambientes: [] })) },
  qualidadeConcreto: {
    armado: {
      I: { relacaoAcMax: 0.9, classeMin: 10 },
      II: { relacaoAcMax: 0.8, classeMin: 11 },
      III: { relacaoAcMax: 0.7, classeMin: 12 },
      IV: { relacaoAcMax: 0.6, classeMin: 13 },
    },
  },
  cobrimentoNominal: {
    deltaCDaTabela: 7,
    armado: { 'viga-pilar': { I: 17, II: 27, III: 37, IV: 47 } },
  },
  deltaC: { padrao: { valor: 7 }, controleRigoroso: { valor: 3 } },
  aberturaFissuras: { armado: { I: 0.9, II: 0.8, III: 0.7, IV: 0.6 } },
};

export default function suiteCalculo(teste, ambiente) {
  teste('requisitos: lê a linha certa da tabela', () => {
    const r = requisitosDurabilidade(FICTICIA, { caa: 'III', elemento: 'viga-pilar' });
    afirmar.igual(r.relacaoAcMax, 0.7);
    afirmar.igual(r.classeConcretoMin, 12);
    afirmar.igual(r.cobrimentoNominal, 37);
    afirmar.igual(r.cobrimentoMinimo, 30);
    afirmar.igual(r.deltaC, 7);
  });

  teste('requisitos: c_nom = c_min + Δc, e o controle rigoroso só muda o Δc', () => {
    const normal = requisitosDurabilidade(FICTICIA, { caa: 'II', elemento: 'viga-pilar' });
    const rigoroso = requisitosDurabilidade(FICTICIA, { caa: 'II', elemento: 'viga-pilar', controleRigoroso: true });
    afirmar.igual(rigoroso.cobrimentoMinimo, normal.cobrimentoMinimo);
    afirmar.igual(rigoroso.deltaC, 3);
    afirmar.igual(rigoroso.cobrimentoNominal, 23);
    for (const r of [normal, rigoroso]) afirmar.igual(r.cobrimentoNominal, r.cobrimentoMinimo + r.deltaC);
  });

  teste('requisitos: entradas desconhecidas geram erro em vez de valor inventado', () => {
    afirmar.lanca(() => requisitosDurabilidade(FICTICIA, { caa: 'V', elemento: 'viga-pilar' }));
    afirmar.lanca(() => requisitosDurabilidade(FICTICIA, { caa: 'I', elemento: 'casca' }));
    afirmar.lanca(() => requisitosDurabilidade(FICTICIA, { caa: 'I', elemento: 'viga-pilar', tipo: 'protendido' }));
    afirmar.lanca(() => limiteAberturaFissuras(FICTICIA, 'X'));
  });

  teste('fissuras: devolve o limite da classe', () => {
    afirmar.igual(limiteAberturaFissuras(FICTICIA, 'IV'), 0.6);
  });

  teste('altura útil: d = h − c − φt − φl/2', () => {
    afirmar.aprox(alturaUtil({ h: 500, c: 30, fiT: 5, fiL: 16 }), 457);
    afirmar.aprox(alturaUtil({ h: 400, c: 25, fiT: 6.3, fiL: 12.5 }), 362.45);
    afirmar.lanca(() => alturaUtil({ h: 500, c: NaN, fiT: 5, fiL: 16 }));
  });

  teste('altura útil: cada mm de cobrimento tira 1 mm de d', () => {
    const base = { h: 600, fiT: 5, fiL: 20 };
    afirmar.aprox(alturaUtil({ ...base, c: 25 }) - alturaUtil({ ...base, c: 40 }), 15);
  });

  teste('espaçamento livre entre barras', () => {
    // 200 − 2·(30+5) − 3·16 = 82 → dois vãos de 41 mm
    afirmar.aprox(espacamentoLivre({ bw: 200, c: 30, fiT: 5, fiL: 16, n: 3 }), 41);
    afirmar.igual(espacamentoLivre({ bw: 200, c: 30, fiT: 5, fiL: 16, n: 1 }), null);
    afirmar.ok(espacamentoLivre({ bw: 120, c: 40, fiT: 8, fiL: 25, n: 4 }) < 0, 'barras que não cabem → negativo');
    afirmar.lanca(() => espacamentoLivre({ bw: 200, c: 30, fiT: 5, fiL: 16, n: 0 }));
  });

  teste('dados reais: tabelas completas para todas as classes e elementos', async () => {
    const t = await ambiente.lerJSON('content/normas/nbr-6118/dados/durabilidade.json');
    afirmar.igual(t.classesAgressividade.itens.map((i) => i.id), CLASSES);
    for (const el of t.elementos) {
      for (const caa of CLASSES) {
        for (const controleRigoroso of [false, true]) {
          const r = requisitosDurabilidade(t, { caa, elemento: el.id, controleRigoroso });
          afirmar.ok(r.cobrimentoNominal > 0 && r.cobrimentoMinimo > 0, `${el.id}/${caa}`);
          afirmar.igual(r.cobrimentoNominal, r.cobrimentoMinimo + r.deltaC);
        }
        afirmar.ok(limiteAberturaFissuras(t, caa) > 0);
      }
    }
  });

  teste('dados reais: exigências não afrouxam quando a agressividade aumenta', async () => {
    const t = await ambiente.lerJSON('content/normas/nbr-6118/dados/durabilidade.json');
    for (const el of t.elementos) {
      for (let i = 1; i < CLASSES.length; i++) {
        const a = requisitosDurabilidade(t, { caa: CLASSES[i - 1], elemento: el.id });
        const b = requisitosDurabilidade(t, { caa: CLASSES[i], elemento: el.id });
        afirmar.ok(b.cobrimentoNominal >= a.cobrimentoNominal, `cobrimento ${el.id} ${CLASSES[i]}`);
        afirmar.ok(b.classeConcretoMin >= a.classeConcretoMin, `classe ${CLASSES[i]}`);
        afirmar.ok(b.relacaoAcMax <= a.relacaoAcMax, `a/c ${CLASSES[i]}`);
        afirmar.ok(limiteAberturaFissuras(t, CLASSES[i]) <= limiteAberturaFissuras(t, CLASSES[i - 1]), `w_k ${CLASSES[i]}`);
      }
    }
    afirmar.ok(t.deltaC.controleRigoroso.valor < t.deltaC.padrao.valor, 'Δc rigoroso deve ser menor que o padrão');
    afirmar.igual(t.cobrimentoNominal.deltaCDaTabela, t.deltaC.padrao.valor, 'Δc de referência da tabela');
  });
}
