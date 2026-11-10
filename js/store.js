// Store global mínimo (padrão observer) + persistência segura em localStorage.

const CHAVE = 'normas-interativas:v1';

export function criarStore(inicial, { chave, persistir } = {}) {
  let estado = inicial;
  const ouvintes = new Set();

  if (chave) {
    try {
      const salvo = JSON.parse(globalThis.localStorage?.getItem(chave) || 'null');
      if (salvo && typeof salvo === 'object') estado = mesclar(inicial, salvo);
    } catch {
      // Sem acesso ao armazenamento (modo privado, cota): segue só em memória.
    }
  }

  function salvar() {
    if (!chave) return;
    try {
      globalThis.localStorage?.setItem(chave, JSON.stringify(persistir ? persistir(estado) : estado));
    } catch {
      // Falha ao salvar não pode quebrar a interface.
    }
  }

  return {
    get: () => estado,
    set(mudanca) {
      const novo = typeof mudanca === 'function' ? mudanca(estado) : { ...estado, ...mudanca };
      if (novo === estado) return;
      const antigo = estado;
      estado = novo;
      salvar();
      for (const ouvinte of [...ouvintes]) ouvinte(estado, antigo);
    },
    assinar(ouvinte) {
      ouvintes.add(ouvinte);
      return () => ouvintes.delete(ouvinte);
    },
  };
}

function mesclar(base, salvo) {
  const saida = { ...base };
  for (const [k, v] of Object.entries(salvo)) {
    if (!(k in base)) continue;
    const ehObjeto = v && typeof v === 'object' && !Array.isArray(v);
    saida[k] = ehObjeto && base[k] && typeof base[k] === 'object' ? { ...base[k], ...v } : v;
  }
  return saida;
}

export const store = criarStore(
  {
    tema: 'sistema', // 'sistema' | 'claro' | 'escuro'
    progresso: {
      lidos: {}, // { [idConceito]: timestamp }
      quiz: {}, // { [idConceito]: { acertos, total } }
    },
    mapa: { expandidos: null, vista: null }, // só em memória
  },
  { chave: CHAVE, persistir: ({ tema, progresso }) => ({ tema, progresso }) },
);

export const acoes = {
  definirTema(tema) {
    store.set({ tema });
  },
  marcarLido(id, lido = true) {
    store.set((e) => {
      const lidos = { ...e.progresso.lidos };
      if (lido) lidos[id] = Date.now();
      else delete lidos[id];
      return { ...e, progresso: { ...e.progresso, lidos } };
    });
  },
  registrarQuiz(id, acertos, total) {
    store.set((e) => ({
      ...e,
      progresso: { ...e.progresso, quiz: { ...e.progresso.quiz, [id]: { acertos, total } } },
    }));
  },
  lembrarMapa(mapa) {
    store.set((e) => ({ ...e, mapa: { ...e.mapa, ...mapa } }));
  },
};
