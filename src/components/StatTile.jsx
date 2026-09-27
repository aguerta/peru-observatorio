import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { api } from '../api'
import { fmtNum } from '../chartLogic'

// A single headline value read from the first row of a (small) table.
export default function StatTile({ schema, table, col, label, unit = '', color, variants }) {
  const nav = useNavigate()
  const [val, setVal] = useState(null)
  useEffect(() => {
    let alive = true
    api.data(schema, table, { cols: [col], limit: 1 })
      .then((d) => { if (alive && d.rows[0]) setVal(Number(d.rows[0][col])) })
      .catch(() => {})
    return () => { alive = false }
  }, [schema, table, col])
  return (
    <motion.button className="kpi" variants={variants}
      whileHover={{ y: -4 }} whileTap={{ scale: 0.98 }} style={{ '--kpi': color }}
      onClick={() => nav(`/db/${schema}/${table}`)}>
      <div className="kpi-label">{label}</div>
      {val == null
        ? <div className="skeleton" style={{ height: 40, marginTop: 8, borderRadius: 8 }} />
        : <div className="kpi-value" style={{ marginTop: 10 }}>{fmtNum(val)}<span className="kpi-unit">{unit}</span></div>}
    </motion.button>
  )
}
