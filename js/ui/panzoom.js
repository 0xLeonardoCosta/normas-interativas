// Pan e zoom para canvas (mapa mental, e depois o grafo):
// arrastar com inércia, roda do mouse com zoom suave centrado no cursor, pinça no celular.
import { animar, movimentoReduzido } from './motion.js';

const limitar = (v, min, max) => Math.min(max, Math.max(min, v));

export function criarPanZoom(area, { min = 0.35, max = 2.5, inicial, aoMudar }) {
  const vista = { x: 0, y: 0, k: 1, ...inicial };
  const ponteiros = new Map();
  let arrastou = false;
  let capturado = false;
  let vel = { x: 0, y: 0 };
  let ultimoTempo = 0;
  let pinca = null;
  let pararInercia = null;
  let pararZoom = null;
  let pararIda = null;
  let zoomAlvo = null; // { k, px, py }

  const emitir = () => aoMudar({ ...vista });
  const local = (e) => {
    const r = area.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  function pararTudo() {
    pararInercia?.();
    pararZoom?.();
    pararIda?.();
    pararInercia = pararZoom = pararIda = zoomAlvo = null;
  }

  /** Muda a escala mantendo fixo o ponto (px, py) da tela. */
  function escalarEm(k, px, py) {
    const novo = limitar(k, min, max);
    const f = novo / vista.k;
    vista.x = px - (px - vista.x) * f;
    vista.y = py - (py - vista.y) * f;
    vista.k = novo;
  }

  function zoomSuave(k, px, py) {
    zoomAlvo = { k: limitar(k, min, max), px, py };
    if (movimentoReduzido()) {
      escalarEm(zoomAlvo.k, px, py);
      zoomAlvo = null;
      return emitir();
    }
    pararZoom ??= animar((dt) => {
      const falta = Math.log(zoomAlvo.k / vista.k);
      if (Math.abs(falta) < 0.002) {
        escalarEm(zoomAlvo.k, zoomAlvo.px, zoomAlvo.py);
        emitir();
        pararZoom = zoomAlvo = null;
        return false;
      }
      escalarEm(vista.k * Math.exp(falta * (1 - Math.exp(-dt * 16))), zoomAlvo.px, zoomAlvo.py);
      emitir();
      return true;
    });
  }

  function aoDescer(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    pararTudo();
    if (e.pointerType === 'mouse') ponteiros.clear(); // descarta ponteiro solto fora da área
    ponteiros.set(e.pointerId, local(e));
    arrastou = false;
    vel = { x: 0, y: 0 };
    ultimoTempo = e.timeStamp;
    if (ponteiros.size === 2) iniciarPinca();
  }

  function iniciarPinca() {
    const [a, b] = [...ponteiros.values()];
    pinca = { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
    arrastou = true;
  }

  function aoMover(e) {
    const antes = ponteiros.get(e.pointerId);
    if (!antes) return;
    const agora = local(e);
    ponteiros.set(e.pointerId, agora);

    if (ponteiros.size >= 2 && pinca) {
      const [a, b] = [...ponteiros.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const cx = (a.x + b.x) / 2;
      const cy = (a.y + b.y) / 2;
      vista.x += cx - pinca.cx;
      vista.y += cy - pinca.cy;
      escalarEm(vista.k * (dist / pinca.dist), cx, cy);
      pinca = { dist, cx, cy };
      return emitir();
    }

    const dx = agora.x - antes.x;
    const dy = agora.y - antes.y;
    if (!arrastou) {
      const inicio = antes.inicio || antes;
      agora.inicio = inicio;
      if (Math.hypot(agora.x - inicio.x, agora.y - inicio.y) < 5) return;
      arrastou = true;
      // Só captura depois de confirmar o arrasto, para não roubar o clique dos nós.
      try {
        area.setPointerCapture(e.pointerId);
        capturado = true;
      } catch {
        capturado = false;
      }
      area.classList.add('arrastando');
    }
    const dt = Math.max(1, e.timeStamp - ultimoTempo);
    ultimoTempo = e.timeStamp;
    vel = { x: 0.7 * (dx / dt) + 0.3 * vel.x, y: 0.7 * (dy / dt) + 0.3 * vel.y };
    vista.x += dx;
    vista.y += dy;
    emitir();
  }

  function aoSoltar(e) {
    if (!ponteiros.delete(e.pointerId)) return;
    if (capturado) {
      try {
        area.releasePointerCapture(e.pointerId);
      } catch {
        // ponteiro já liberado
      }
      capturado = false;
    }
    area.classList.remove('arrastando');
    const foiArrasto = arrastou;
    // O clique (se houver) chega logo depois do pointerup; passado isso, a marca não vale mais.
    setTimeout(() => (arrastou = false), 60);
    if (ponteiros.size === 1) {
      pinca = null;
      return;
    }
    if (pinca) {
      pinca = null;
      return;
    }
    const parado = e.timeStamp - ultimoTempo > 80;
    if (!foiArrasto || parado || movimentoReduzido() || Math.hypot(vel.x, vel.y) < 0.05) return;
    // Inércia: a velocidade decai exponencialmente (meia-vida ≈ 190 ms).
    let v = { x: vel.x * 1000, y: vel.y * 1000 };
    pararInercia = animar((dt) => {
      const atrito = Math.exp(-dt * 3.6);
      vista.x += v.x * dt;
      vista.y += v.y * dt;
      v = { x: v.x * atrito, y: v.y * atrito };
      emitir();
      if (Math.hypot(v.x, v.y) < 8) {
        pararInercia = null;
        return false;
      }
      return true;
    });
  }

  function aoRolar(e) {
    e.preventDefault();
    pararInercia?.();
    pararIda?.();
    pararInercia = pararIda = null;
    const p = local(e);
    const passo = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    // Com Ctrl (gesto de pinça no trackpad) os deltas são pequenos: amplifica.
    const fator = Math.exp(-passo * (e.ctrlKey ? 0.012 : 0.0022));
    zoomSuave((zoomAlvo?.k ?? vista.k) * fator, p.x, p.y);
  }

  // Um arrasto não deve virar clique no nó onde o ponteiro foi solto.
  function aoClicar(e) {
    if (arrastou) {
      e.preventDefault();
      e.stopPropagation();
      arrastou = false;
    }
  }

  area.addEventListener('pointerdown', aoDescer);
  area.addEventListener('pointermove', aoMover);
  area.addEventListener('pointerup', aoSoltar);
  area.addEventListener('pointercancel', aoSoltar);
  area.addEventListener('wheel', aoRolar, { passive: false });
  area.addEventListener('click', aoClicar, true);

  return {
    get vista() {
      return { ...vista };
    },
    definir(nova) {
      pararTudo();
      Object.assign(vista, nova);
      emitir();
    },
    /** Vai até uma vista com movimento suave. */
    irPara(nova) {
      pararTudo();
      if (movimentoReduzido()) return this.definir(nova);
      const de = { ...vista };
      let t = 0;
      pararIda = animar((dt) => {
        t = Math.min(1, t + dt / 0.32);
        const s = 1 - Math.pow(1 - t, 4);
        vista.x = de.x + (nova.x - de.x) * s;
        vista.y = de.y + (nova.y - de.y) * s;
        vista.k = de.k * Math.pow((nova.k ?? de.k) / de.k, s);
        emitir();
        if (t >= 1) pararIda = null;
        return t < 1;
      });
    },
    zoom(fator) {
      const r = area.getBoundingClientRect();
      zoomSuave((zoomAlvo?.k ?? vista.k) * fator, r.width / 2, r.height / 2);
    },
    deslocar(dx, dy) {
      this.irPara({ x: vista.x + dx, y: vista.y + dy, k: vista.k });
    },
    destruir() {
      pararTudo();
      area.removeEventListener('pointerdown', aoDescer);
      area.removeEventListener('pointermove', aoMover);
      area.removeEventListener('pointerup', aoSoltar);
      area.removeEventListener('pointercancel', aoSoltar);
      area.removeEventListener('wheel', aoRolar);
      area.removeEventListener('click', aoClicar, true);
    },
  };
}
