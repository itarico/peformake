// Marca da Ellcazo em texto SVG (sem React), para apresentações e PDFs montados como HTML.
/** A mesma marca em texto SVG, para documentos impressos (roteiro em PDF). */
export function ellcazoSvg(color = '#B5E61D', height = 34): string {
  const d = ['M2 2H466V157H190V236H466V391H190V462H470V617H2Z', 'M543 2H731V617H543Z', 'M822 1H1010V616H822Z', 'M6 693H469V848H193V1154H469V1308H6Z',
    'M542 693H1005V1308H818V848H730V1308H542Z', 'M4 1385H468V1504L440 1540L230 1845H468V2000H0V1846L215 1539H4Z', 'M544 1385H1011V2000H544ZM733 1539V1845H822V1539Z']
  return `<svg viewBox="0 0 1011 2000" height="${height}" role="img" aria-label="Ellcazo" fill="${color}" fill-rule="evenodd">${d.map((x) => `<path d="${x}"/>`).join('')}</svg>`
}
