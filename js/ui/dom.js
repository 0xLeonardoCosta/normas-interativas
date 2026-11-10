// Criação de elementos sem framework: h() para HTML, s() para SVG.
const SVG_NS = 'http://www.w3.org/2000/svg';

function aplicar(el, attrs, filhos) {
  for (const [chave, valor] of Object.entries(attrs || {})) {
    if (valor == null || valor === false) continue;
    if (chave === 'style' && typeof valor === 'object') {
      for (const [p, v] of Object.entries(valor)) {
        if (v != null) el.style.setProperty(p, String(v));
      }
    } else if (chave === 'html') {
      el.innerHTML = valor;
    } else if (chave.startsWith('on') && typeof valor === 'function') {
      el.addEventListener(chave.slice(2).toLowerCase(), valor);
    } else {
      el.setAttribute(chave, valor === true ? '' : valor);
    }
  }
  for (const filho of filhos.flat(Infinity)) {
    if (filho == null || filho === false) continue;
    el.append(filho.nodeType ? filho : document.createTextNode(String(filho)));
  }
  return el;
}

export const h = (tag, attrs, ...filhos) => aplicar(document.createElement(tag), attrs, filhos);
export const s = (tag, attrs, ...filhos) => aplicar(document.createElementNS(SVG_NS, tag), attrs, filhos);

export function numero(valor, casas = 0) {
  return Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
}
