import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { api } from '../api'

// Dos Perús: dos distritos cara a cara, las barras crecen una contra otra.
// El contraste ES el hallazgo — Miraflores contra el altiplano.
const COLORS = ['#c85a34', '#3f5aa6']
const METRICS = [
  { col: 'keiko_share_2026', label: 'Voto Keiko 2026', unit: '%', max: 100 },
  { col: 'keiko_share_2021', label: 'Voto Keiko 2021', unit: '%', max: 100 },
  { col: 'participacion', label: 'Participación', unit: '%', max: 100 },
]

function Picker({ rows, sel, setSel, color }) {
  const deps = useMemo(() => [...new Set(rows.map((r) => r.departamento))].sort(), [rows])
  const provs = useMemo(() => [...new Set(rows.filter((r) => r.departamento === sel.dep).map((r) => r.provincia))].sort(), [rows, sel.dep])
  const pv = provs.includes(sel.prov) ? sel.prov : provs[0]
  const dists = useMemo(() => rows.filter((r) => r.departamento === sel.dep && r.provincia === pv).map((r) => r.distrito).sort(), [rows, sel.dep, pv])
  const dt = dists.includes(sel.dist) ? sel.dist : dists[0]
  return (
    <div className="dp-picker" style={{ '--c': color }}>
      <select aria-label="Departamento" value={sel.dep}
        onChange={(e) => setSel({ dep: e.target.value, prov: null, dist: null })}>
        {deps.map((x) => <option key={x}>{x}</option>)}
      </select>
      <select aria-label="Provincia" value={pv || ''}
        onChange={(e) => setSel({ ...sel, prov: e.target.value, dist: null })}>
        {provs.map((x) => <option key={x}>{x}</option>)}
      </select>
      <select aria-label="Distrito" value={dt || ''}
        onChange={(e) => setSel({ ...sel, dist: e.target.value })}>
        {dists.map((x) => <option key={x}>{x}</option>)}
      </select>
    </div>
  )
}

export default function DosPerus() {
  const [rows, setRows] = useState(null)
  const [a, setA] = useState({ dep: 'LIMA', prov: 'LIMA', dist: 'MIRAFLORES' })
  const [b, setB] = useState({ dep: 'PUNO', prov: null, dist: null })

  useEffect(() => {
    api.data('enaho', 'voto_keiko_distrito_2021_2026', { limit: 3000 })
      .then((d) => setRows(d.rows)).catch(() => setRows([]))
  }, [])

  const find = (sel) => {
    if (!rows) return null
    const provs = [...new Set(rows.filter((r) => r.departamento === sel.dep).map((r) => r.provincia))].sort()
    const pv = provs.includes(sel.prov) ? sel.prov : provs[0]
    const dists = rows.filter((r) => r.departamento === sel.dep && r.provincia === pv)
    return dists.find((r) => r.distrito === sel.dist) || dists[0]
  }
  const ra = find(a), rb = find(b)

  if (!rows) return <div className="skeleton sk-chart" style={{ height: 300, marginTop: 30 }} />

  return (
    <div className="dosperus">
      <div className="exp-crumb">CARA A CARA</div>
      <h1>Dos Perús</h1>
      <p className="gf-lead">Elige dos distritos y míralos frente a frente en la segunda
        vuelta de 2026. El país cabe entero en la distancia entre dos barras.</p>

      <div className="dp-heads">
        <Picker rows={rows} sel={a} setSel={setA} color={COLORS[0]} />
        <div className="dp-vs">VS</div>
        <Picker rows={rows} sel={b} setSel={setB} color={COLORS[1]} />
      </div>

      {ra && rb && (
        <div className="dp-body">
          <div className="dp-names">
            <div style={{ color: COLORS[0] }}>{ra.distrito}<span> · {ra.departamento}</span></div>
            <div style={{ color: COLORS[1], textAlign: 'right' }}>{rb.distrito}<span> · {rb.departamento}</span></div>
          </div>
          {METRICS.map((m) => {
            const va = Number(ra[m.col]) || 0, vb = Number(rb[m.col]) || 0
            return (
              <div key={m.col} className="dp-metric">
                <div className="dp-label">{m.label}</div>
                <div className="dp-bars">
                  <div className="dp-side left">
                    <span className="dp-val">{va.toFixed(1)}{m.unit}</span>
                    <motion.div className="dp-bar" style={{ background: COLORS[0] }}
                      animate={{ width: `${100 * va / m.max}%` }}
                      transition={{ duration: 0.7, ease: [0.22, 0.61, 0.36, 1] }} />
                  </div>
                  <div className="dp-side">
                    <motion.div className="dp-bar" style={{ background: COLORS[1] }}
                      animate={{ width: `${100 * vb / m.max}%` }}
                      transition={{ duration: 0.7, ease: [0.22, 0.61, 0.36, 1] }} />
                    <span className="dp-val">{vb.toFixed(1)}{m.unit}</span>
                  </div>
                </div>
              </div>
            )
          })}
          <div className="dp-foot">
            <span>{Math.round(ra.electores).toLocaleString('es-PE')} electores</span>
            <span className="dp-gap">
              Brecha en 2026: <b>{Math.abs(ra.keiko_share_2026 - rb.keiko_share_2026).toFixed(1)} puntos</b>
            </span>
            <span>{Math.round(rb.electores).toLocaleString('es-PE')} electores</span>
          </div>
        </div>
      )}
    </div>
  )
}
