import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'

const W = 480, PAD = 12

// department -> predominant natural region (dominant-region convention)
const REGION_DEPTS = {
  Costa: ['Tumbes', 'Piura', 'Lambayeque', 'La Libertad', 'Lima', 'Callao',
    'Ica', 'Moquegua', 'Tacna'],
  Sierra: ['Cajamarca', 'Ancash', 'Huanuco', 'Pasco', 'Junin', 'Huancavelica',
    'Ayacucho', 'Apurimac', 'Cusco', 'Puno', 'Arequipa'],
  Selva: ['Amazonas', 'San Martin', 'Loreto', 'Ucayali', 'Madre de Dios'],
}
const REGION_OF = {}
for (const [reg, list] of Object.entries(REGION_DEPTS)) list.forEach((d) => { REGION_OF[d] = reg })
const REGION_COLOR = { Costa: '#e3c07a', Sierra: '#c0824a', Selva: '#83b25f' }
const REGION_HOVER = { Costa: '#d9ad57', Sierra: '#a86d38', Selva: '#6fa14a' }
const REGIONS = ['Costa', 'Sierra', 'Selva']

function project(geo) {
  let minLon = 180, maxLon = -180, minLat = 90, maxLat = -90
  const rings = []
  const push = (coords, name) => {
    for (const [lon, lat] of coords) {
      if (lon < minLon) minLon = lon; if (lon > maxLon) maxLon = lon
      if (lat < minLat) minLat = lat; if (lat > maxLat) maxLat = lat
    }
    rings.push({ coords, name })
  }
  for (const f of geo.features) {
    const g = f.geometry, nm = f.properties.name
    if (g.type === 'Polygon') g.coordinates.forEach((r) => push(r, nm))
    else if (g.type === 'MultiPolygon') g.coordinates.forEach((p) => p.forEach((r) => push(r, nm)))
  }
  const midLat = ((minLat + maxLat) / 2) * Math.PI / 180
  const k = Math.cos(midLat)
  const lonW = (maxLon - minLon) * k, latH = maxLat - minLat
  const scale = (W - 2 * PAD) / lonW
  const H = latH * scale + 2 * PAD
  const X = (lon) => PAD + (lon * k - minLon * k) * scale
  const Y = (lat) => PAD + (maxLat - lat) * scale
  const byDept = {}
  for (const { coords, name } of rings) {
    const d = coords.map(([lon, lat], i) =>
      `${i ? 'L' : 'M'}${X(lon).toFixed(1)} ${Y(lat).toFixed(1)}`).join('') + 'Z'
    byDept[name] = (byDept[name] || '') + d
  }
  return { paths: Object.entries(byDept).map(([name, d]) => ({ name, d })), H }
}

export default function PeruMapHero() {
  const [geo, setGeo] = useState(null)
  const [hover, setHover] = useState(null)
  useEffect(() => {
    fetch('/geo/peru_departments.geojson').then((r) => r.json()).then(setGeo).catch(() => {})
  }, [])
  const proj = useMemo(() => (geo ? project(geo) : null), [geo])
  if (!proj) return <div className="hero-map" />

  const hoverReg = hover ? REGION_OF[hover] : null

  return (
    <div className="hero-map">
      <svg viewBox={`0 0 ${W} ${proj.H}`} className="peru-svg"
        style={{ width: '100%', maxWidth: 440 }}>
        {proj.paths.map((p, i) => {
          const reg = REGION_OF[p.name] || 'Sierra'
          const on = hover === p.name
          return (
            <motion.path key={p.name} d={p.d}
              initial={{ pathLength: 0, fillOpacity: 0 }}
              animate={{ pathLength: 1, fillOpacity: on ? 1 : 0.9 }}
              transition={{
                pathLength: { delay: 0.15 + i * 0.045, duration: 1.1, ease: [0.22, 0.61, 0.36, 1] },
                fillOpacity: { delay: on ? 0 : 0.9 + i * 0.045, duration: 0.5 },
              }}
              onMouseEnter={() => setHover(p.name)}
              onMouseLeave={() => setHover(null)}
              fill={on ? REGION_HOVER[reg] : REGION_COLOR[reg]}
              stroke={on ? '#c85a34' : '#fffdf7'} strokeWidth={on ? 1.5 : 0.8}
              style={{ cursor: 'pointer' }} />
          )
        })}
      </svg>

      <motion.div className="hero-legend"
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.6, duration: 0.5 }}>
        {REGIONS.map((r) => (
          <span key={r} className={'leg-item' + (hoverReg && hoverReg !== r ? ' dim' : '')}>
            <span className="leg-dot" style={{ background: REGION_COLOR[r] }} />
            {r}
          </span>
        ))}
      </motion.div>

      <motion.div className="hero-map-tag"
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2 }}>
        {hover ? `${hover} · ${hoverReg}` : '3 regiones naturales'}
      </motion.div>
    </div>
  )
}
