import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { api } from '../api'
import { fmtNum, toNum } from '../chartLogic'
import MiniSpark from './MiniSpark'

function Stat3({ schema, table, parts }) {
  const [vals, setVals] = useState(null)
  useEffect(() => {
    let alive = true
    api.data(schema, table, { limit: 1 }).then((d) => {
      if (alive && d.rows[0]) setVals(d.rows[0])
    }).catch(() => {})
    return () => { alive = false }
  }, [schema, table])
  if (!vals) return <div className="skeleton" style={{ height: 96, borderRadius: 8 }} />
  const max = Math.max(...parts.map((p) => Number(vals[p.col]) || 0))
  return (
    <div className="stat3">
      {parts.map((p) => {
        const v = Number(vals[p.col]) || 0
        return (
          <div key={p.col} className="stat3-row">
            <span className="stat3-label">{p.label}</span>
            <span className="stat3-bar">
              <motion.span className="stat3-fill" style={{ background: p.color }}
                initial={{ width: 0 }} whileInView={{ width: `${(v / max) * 100}%` }}
                viewport={{ once: true }} transition={{ duration: 0.8, ease: [0.22, 0.61, 0.36, 1] }} />
            </span>
            <span className="stat3-val">{fmtNum(v)}%</span>
          </div>
        )
      })}
    </div>
  )
}

function Spark({ schema, table, col, tcol, color }) {
  const [v, setV] = useState(null)
  useEffect(() => {
    let alive = true
    api.data(schema, table, { cols: [tcol, col], order: tcol, limit: 4000 }).then((d) => {
      if (!alive) return
      setV(d.rows.map((r) => toNum(r[col])).filter((x) => Number.isFinite(x)))
    }).catch(() => {})
    return () => { alive = false }
  }, [schema, table, col, tcol])
  if (!v) return <div className="skeleton" style={{ height: 60, borderRadius: 8 }} />
  return (
    <div className="finding-spark">
      <MiniSpark values={v} color={color} height={60} />
      <div className="finding-endpoints">
        <span>{fmtNum(v[0])}</span><span>→</span><span>{fmtNum(v[v.length - 1])}</span>
      </div>
    </div>
  )
}

export default function Finding({ kicker, title, insight, link, viz, variants }) {
  const nav = useNavigate()
  return (
    <motion.button className="finding" variants={variants}
      whileHover={{ y: -4 }} onClick={() => nav(`/db/${link}`)}>
      <div className="finding-kicker">{kicker}</div>
      <h3 className="finding-title">{title}</h3>
      {viz.kind === 'stat3'
        ? <Stat3 {...viz} />
        : <Spark {...viz} />}
      <p className="finding-insight">{insight}</p>
      <span className="finding-go">Explorar →</span>
    </motion.button>
  )
}
