// Distância até o local da captação, sem chave de API:
// endereço → coordenadas pelo OpenStreetMap (Nominatim) e rota de carro pelo OSRM.
// Se a rota falhar, usa a linha reta × 1,3 (média de desvio das estradas).

export interface Place { label: string; lat: number; lng: number }

export async function searchPlaces(q: string): Promise<Place[]> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=br&accept-language=pt-BR&q=${encodeURIComponent(q)}`
  const r = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!r.ok) throw new Error('Busca de endereço indisponível agora.')
  const rows = (await r.json()) as { display_name: string; lat: string; lon: string }[]
  return rows.map((x) => ({ label: x.display_name.split(', ').slice(0, 4).join(', '), lat: Number(x.lat), lng: Number(x.lon) }))
}

const straightKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const R = 6371, rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/** Km de carro, só ida, arredondado. */
export async function drivingKm(from: { lat: number; lng: number }, to: { lat: number; lng: number }): Promise<{ km: number; estimated: boolean }> {
  try {
    const r = await fetch(`https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=false`)
    const d = (await r.json()) as { code: string; routes?: { distance: number }[] }
    if (d.code === 'Ok' && d.routes?.[0]) return { km: Math.round(d.routes[0].distance / 1000), estimated: false }
  } catch { /* cai para a estimativa */ }
  return { km: Math.round(straightKm(from, to) * 1.3), estimated: true }
}
