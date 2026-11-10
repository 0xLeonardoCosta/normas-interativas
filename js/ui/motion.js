// Movimento com física de mola. Um único laço de rAF compartilhado.

const consultaReduzido =
  typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

export const movimentoReduzido = () => consultaReduzido.matches;

const ativos = new Set();
let quadro = 0;
let anterior = 0;

function laco(agora) {
  const dt = Math.min(0.05, (agora - anterior) / 1000 || 0.016);
  anterior = agora;
  for (const item of [...ativos]) {
    if (item.passo(dt) === false) ativos.delete(item);
  }
  quadro = ativos.size ? requestAnimationFrame(laco) : 0;
}

/** Registra algo que avança a cada quadro. `passo(dt)` devolve false quando termina. */
export function animar(passo) {
  const item = { passo };
  ativos.add(item);
  if (!quadro) {
    anterior = performance.now();
    quadro = requestAnimationFrame(laco);
  }
  return () => ativos.delete(item);
}

/**
 * Mola amortecida. `definir(alvo)` pode ser chamado a qualquer momento:
 * a velocidade atual é preservada, então interrupções ficam naturais.
 */
export function criarMola({ valor = 0, rigidez = 220, amortecimento = 26, precisao = 0.001, aoMudar }) {
  let x = valor;
  let v = 0;
  let alvo = valor;
  let cancelar = null;

  function passo(dt) {
    // Subpassos fixos mantêm a integração estável mesmo com quadros longos.
    const n = Math.max(1, Math.ceil(dt / 0.004));
    const hh = dt / n;
    for (let i = 0; i < n; i++) {
      v += (-rigidez * (x - alvo) - amortecimento * v) * hh;
      x += v * hh;
    }
    if (Math.abs(v) < precisao * 10 && Math.abs(x - alvo) < precisao) {
      x = alvo;
      v = 0;
      cancelar = null;
      aoMudar(x, true);
      return false;
    }
    aoMudar(x, false);
    return true;
  }

  return {
    get valor() {
      return x;
    },
    get alvo() {
      return alvo;
    },
    definir(novo, { imediato = false } = {}) {
      alvo = novo;
      if (imediato || movimentoReduzido()) {
        cancelar?.();
        cancelar = null;
        x = novo;
        v = 0;
        aoMudar(x, true);
        return;
      }
      if (!cancelar) cancelar = animar(passo);
    },
    parar() {
      cancelar?.();
      cancelar = null;
    },
  };
}
