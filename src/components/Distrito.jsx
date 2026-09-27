import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { api } from '../api'
import { fmtNum } from '../chartLogic'

// Mi distrito: pick departamento -> provincia -> distrito and read its card.
// Single source (voto_keiko_distrito_2021_2026, ONPE) so no ubigeo-system
// merges are needed. Averages are voter-weighted.
const T = { schema: 'enaho', table: 'voto_keiko_distrito_2021_2026' }

function wavg(rows, col) {
  let n = 0, dsum = 0
  for (const r of rows) {
    const v = Number(r[col]), w = Number(r.electores)
    if (Number.isFinite(v) && Number.isFinite(w)) { n += v * w; dsum += w }
  }
  return dsum ? n / dsum : null
}

function Big({ label, value, suffix = '%', sub }) {
  return (
    <div className="dist-big">
      <div className="dist-big-v">{value == null ? '—' : fmtNum(value)}{value == null ? '' : suffix}</div>
      <div className="dist-big-l">{label}</div>
      {sub && <div className="dist-big-s">{sub}</div>}
    </div>
  )
}

export default function Distrito() {
  const [rows, setRows] = useState(null)
  const [dep, setDep] = useState('LIMA')
  const [prov, setProv] = useState(null)
  const [dist, setDist] = useState(null)

  useEffect(() => {
    api.data(T.schema, T.table, { limit: 3000 }).then((d) => setRows(d.rows)).catch(() => setRows([]))
  }, [])

  const deps = useMemo(() => rows ? [...new Set(rows.map((r) => r.departamento))].sort() : [], [rows])
  const provs = useMemo(() => rows ? [...new Set(rows.filter((r) => r.departamento === dep).map((r) => r.provincia))].sort() : [], [rows, dep])
  const dists = useMemo(() => rows ? rows.filter((r) => r.departamento === dep && r.provincia === (prov || provs[0])).map((r) => r.distrito).sort() : [], [rows, dep, prov, provs])

  const pv = prov || provs[0]
  const dt = dist && dists.includes(dist) ? dist : dists[0]
  const row = useMemo(() => rows?.find((r) => r.departamento === dep && r.provincia === pv && r.distrito === dt), [rows, dep, pv, dt])

  const ctx = useMemo(() => {
    if (!rows || !row) return null
    const inProv = rows.filter((r) => r.departamento === dep && r.provincia === pv)
    const inDep = rows.filter((r) => r.departamento === dep)
    const rank = [...inProv].sort((a, b) => b.keiko_share_2026 - a.keiko_share_2026)
      .findIndex((r) => r.distrito === dt) + 1
    return {
      provAvg: wavg(inProv, 'keiko_share_2026'),
      depAvg: wavg(inDep, 'keiko_share_2026'),
      natAvg: wavg(rows, 'keiko_share_2026'),
      rank, nProv: inProv.length,
    }
  }, [rows, row, dep, pv, dt])

  if (!rows) return <div className="skeleton sk-chart" style={{ height: 300, marginTop: 30 }} />

  return (
    <div className="distrito">
      <div className="exp-crumb">MI DISTRITO</div>
      <h1>¿Cómo votó tu distrito?</h1>
      <p className="gf-lead">Elige tu distrito y compáralo con su provincia, su departamento
        y el país. Segunda vuelta presidencial, voto por Keiko Fujimori (% de válidos, ONPE).</p>

      <div className="dist-picks" role="group" aria-label="Selección de distrito">
        <label>Departamento
          <select value={dep} aria-label="Departamento"
            onChange={(e) => { setDep(e.target.value); setProv(null); setDist(null) }}>
            {deps.map((x) => <option key={x}>{x}</option>)}
          </select>
        </label>
        <label>Provincia
          <select value={pv || ''} aria-label="Provincia"
            onChange={(e) => { setProv(e.target.value); setDist(null) }}>
            {provs.map((x) => <option key={x}>{x}</option>)}
          </select>
        </label>
        <label>Distrito
          <select value={dt || ''} aria-label="Distrito" onChange={(e) => setDist(e.target.value)}>
            {dists.map((x) => <option key={x}>{x}</option>)}
          </select>
        </label>
      </div>

      {row && ctx && (
        <motion.div key={row.ubigeo_onpe} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}>
          <div className="dist-card">
            <div className="dist-name">{row.distrito} <span>· {row.provincia}, {row.departamento}</span></div>
            <div className="dist-bigs">
              <Big label="Keiko 2026" value={row.keiko_share_2026}
                sub={`2021: ${fmtNum(row.keiko_share_2021)}%`} />
              <Big label="Cambio 2021→2026" value={+(row.keiko_share_2026 - row.keiko_share_2021).toFixed(1)} suffix="pp" />
              <Big label="Participación" value={row.participacion} />
              <Big label="Electores" value={row.electores} suffix="" />
            </div>
            <div className="dist-ctx">
              <div>Provincia: <b>{fmtNum(ctx.provAvg)}%</b></div>
              <div>Departamento: <b>{fmtNum(ctx.depAvg)}%</b></div>
              <div>Perú (doméstico): <b>{fmtNum(ctx.natAvg)}%</b></div>
              <div>Puesto en su provincia: <b>{ctx.rank}</b> de {ctx.nProv}</div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
