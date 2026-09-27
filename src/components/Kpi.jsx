import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { api } from '../api'
import { fmtNum, toNum } from '../chartLogic'
import MiniSpark from './MiniSpark'

// A live KPI tile: pulls a temporal series, shows the latest value, the change
// vs the first observation, and a sparkline. Clicking opens the explorer.
export default function Kpi({ schema, table, col, tcol, label, unit = '', color, variants }) {
  const nav = useNavigate()
  const [s, setS] = useState(null)

  useEffect(() => {
    let alive = true
    api.data(schema, table, { cols: [tcol, col], order: tcol, limit: 4000 })
      .then((d) => {
        if (!alive) return
        const rows = d.rows.filter((r) => Number.isFinite(toNum(r[col])))
        const pts = rows.map((r) => toNum(r[col]))
        if (!pts.length) return
        const yr = (v) => String(v).slice(0, 4) // year from year or YYYYMM
        setS({
          values: pts, latest: pts[pts.length - 1], first: pts[0],
          from: yr(rows[0][tcol]), to: yr(rows[rows.length - 1][tcol]),
        })
      }).catch(() => {})
    return () => { alive = false }
  }, [schema, table, col, tcol])

  const delta = s ? s.latest - s.first : 0
  const up = delta >= 0

  return (
    <motion.button className="kpi" variants={variants}
      whileHover={{ y: -4 }} whileTap={{ scale: 0.98 }}
      style={{ '--kpi': color }}
      onClick={() => nav(`/db/${schema}/${table}`)}>
      <div className="kpi-label">{label}</div>
      {s ? (
        <>
          <div className="kpi-value">
            {fmtNum(s.latest)}<span className="kpi-unit">{unit}</span>
          </div>
          <div className="kpi-spark"><MiniSpark values={s.values} color={color} /></div>
          <div className={'kpi-delta ' + (up ? 'up' : 'down')}>
            {up ? '▲' : '▼'} {fmtNum(Math.abs(delta))}{unit}
            <span className="kpi-span">{s.from}–{s.to}</span>
          </div>
        </>
      ) : (
        <div className="skeleton" style={{ height: 92, marginTop: 8, borderRadius: 8 }} />
      )}
    </motion.button>
  )
}
