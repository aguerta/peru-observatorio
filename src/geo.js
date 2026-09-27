// Shared: project the departments GeoJSON to SVG paths (equirectangular w/ cos-lat).
let _cache = null

export async function loadDepts() {
  if (_cache) return _cache
  const geo = await fetch('geo/peru_departments.geojson').then((r) => r.json())
  _cache = project(geo)
  return _cache
}

export function project(geo, W = 460, PAD = 10) {
  let minLon = 180, maxLon = -180, minLat = 90, maxLat = -90
  const rings = []
  const push = (coords, name, code) => {
    for (const [lon, lat] of coords) {
      if (lon < minLon) minLon = lon; if (lon > maxLon) maxLon = lon
      if (lat < minLat) minLat = lat; if (lat > maxLat) maxLat = lat
    }
    rings.push({ coords, name, code })
  }
  for (const f of geo.features) {
    const g = f.geometry, nm = f.properties.name, cd = f.properties.code
    if (g.type === 'Polygon') g.coordinates.forEach((r) => push(r, nm, cd))
    else if (g.type === 'MultiPolygon') g.coordinates.forEach((p) => p.forEach((r) => push(r, nm, cd)))
  }
  const midLat = ((minLat + maxLat) / 2) * Math.PI / 180
  const k = Math.cos(midLat)
  const scale = (W - 2 * PAD) / ((maxLon - minLon) * k)
  const H = (maxLat - minLat) * scale + 2 * PAD
  const X = (lon) => PAD + (lon * k - minLon * k) * scale
  const Y = (lat) => PAD + (maxLat - lat) * scale
  const byDept = {}
  for (const { coords, name, code } of rings) {
    const d = coords.map(([lon, lat], i) =>
      `${i ? 'L' : 'M'}${X(lon).toFixed(1)} ${Y(lat).toFixed(1)}`).join('') + 'Z'
    if (!byDept[name]) byDept[name] = { code, d: '' }
    byDept[name].d += d
  }
  return { W, H, paths: Object.entries(byDept).map(([name, v]) => ({ name, code: v.code, d: v.d })) }
}
