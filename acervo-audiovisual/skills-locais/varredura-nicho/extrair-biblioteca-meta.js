// Cole no javascript_tool com a página de resultados da Biblioteca de Anúncios da Meta aberta.
// Rola a página para carregar mais anúncios e devolve a lista ordenada por dias no ar.
// Ajuste ROLAGENS para carregar mais (cada rolagem traz cerca de 30 anúncios).
const ROLAGENS = 6;
for (let i = 0; i < ROLAGENS; i++) {
  window.scrollTo(0, document.body.scrollHeight);
  await new Promise(r => setTimeout(r, 2500));
}

const meses = { jan: 0, fev: 1, mar: 2, abr: 3, mai: 4, jun: 5, jul: 6, ago: 7, set: 8, out: 9, nov: 10, dez: 11 };
const hoje = new Date();
const cartoes = document.body.innerText.split(/(?=Identificação da biblioteca:)/).slice(1);

const anuncios = cartoes.map(c => {
  const linhas = c.split('\n').map(l => l.trim()).filter(l => l && l !== '​');
  const id = (c.match(/Identificação da biblioteca: (\d+)/) || [])[1];
  const data = c.match(/Veiculação iniciada em (\d+) de (\w+) de (\d{4})/);
  const inicio = data ? new Date(+data[3], meses[data[2].slice(0, 3).toLowerCase()], +data[1]) : null;
  const versoes = +((c.match(/(\d+) anúncios? us(?:a|am) (?:esse|este)/) || [])[1] || 1);
  const iPat = linhas.indexOf('Patrocinado');
  const anunciante = iPat > 0 ? linhas[iPat - 1] : '';
  const fim = linhas.findIndex((l, i) => i > iPat && /^[A-Z0-9.-]+\.[A-Z]{2,}$/.test(l));
  const texto = linhas.slice(iPat + 1, fim > 0 ? fim : iPat + 8)
    .filter(l => !/^\d+:\d+ \/ \d+:\d+$/.test(l)).join(' ').slice(0, 600);
  const destino = fim > 0 ? linhas[fim] : '';
  const cta = fim > 0 ? linhas.slice(fim + 1, fim + 3).join(' | ') : '';
  return {
    id, link: `https://www.facebook.com/ads/library/?id=${id}`, anunciante,
    inicio: inicio ? inicio.toISOString().slice(0, 10) : '',
    dias_no_ar: inicio ? Math.round((hoje - inicio) / 864e5) : null,
    versoes, video: /\d+:\d+ \/ \d+:\d+/.test(c), destino, cta, texto,
  };
}).filter(a => a.id);

anuncios.sort((a, b) => (b.dias_no_ar || 0) - (a.dias_no_ar || 0));
JSON.stringify({ total: anuncios.length, anuncios }, null, 1);
