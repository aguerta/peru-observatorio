import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { api } from '../api'
import EChart from './EChart'
import { buildOption } from '../chartLogic'

// A section's featured lead chart: one table, one series, live.
export default function FeaturedChart({ schema, table, series, x, type = 'line', caption }) {
  const nav = useNavigate()
  const [rows, setRows] = useState(null)
  useEffect(() => {
    let alive = true
    api.data(schema, table, { order: x, limit: 8000 })
      .then((d) => { if (alive) setRows(d.rows) }).catch(() => {})
    return () => { alive = false }
  }, [schema, table, x])

  const option = useMemo(() => {
    if (!rows?.length) return null
    // null/'' must stay out of the line: Number(null) is 0 and fabricates a 0% point
    const clean = rows
      .map((r) => ({ ...r, [series]: (r[series] == null || r[series] === '') ? NaN : Number(r[series]) }))
      .filter((r) => Number.isFinite(r[series]))
    return buildOption({ rows: clean, x, series: [series], type, ytitle: series,
      xIsDept: false })
  }, [rows, x, series, type])

  return (
    <motion.div className="featured"
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 0.61, 0.36, 1] }}>
      <div className="featured-body">
        {option ? <EChart option={option} height={340} />
          : <div className="skeleton sk-chart" style={{ height: 340 }} />}
      </div>
      <div className="featured-foot">
        <p>{caption}</p>
        <button className="featured-link" onClick={() => nav(`/db/${schema}/${table}`)}>
          Ver indicador completo →
        </button>
      </div>
    </motion.div>
  )
}
