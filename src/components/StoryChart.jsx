import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { api } from '../api'
import EChart from './EChart'
import MapChart from './MapChart'
import FlowMapChart from './FlowMapChart'
import BarRaceChart from './BarRaceChart'
import { buildOption, deptName } from '../chartLogic'

// A full-size, live chart embedded on the home page next to a short narrative.
export default function StoryChart({
  kicker, title, lede, schema, table, kind, series, x, mapCol, ylabel,
  entityCol = 'dep', timeCol, flow, level = 'dept', height = 380, reverse, cta = 'Explora el dato →', href,
}) {
  const nav = useNavigate()
  const [rows, setRows] = useState(null)
  const [mapData, setMapData] = useState(null)

  useEffect(() => {
    let alive = true
    if (kind === 'map') {
      api.map(schema, table, mapCol).then((d) => { if (alive) setMapData(d) }).catch(() => {})
    } else {
      api.data(schema, table, { order: x || timeCol, limit: 8000 })
        .then((d) => { if (alive) setRows(d.rows) }).catch(() => {})
    }
    return () => { alive = false }
  }, [schema, table, kind, mapCol, x, timeCol])

  const lineOpt = useMemo(() => {
    if (kind !== 'line' || !rows?.length) return null
    // null/'' must stay out of the line: Number(null) is 0 and fabricates a 0% point
    const clean = rows
      .map((r) => ({ ...r, [series]: (r[series] == null || r[series] === '') ? NaN : Number(r[series]) }))
      .filter((r) => Number.isFinite(r[series]))
    return buildOption({ rows: clean, x, series: [series], type: 'line', ytitle: ylabel || series })
  }, [rows, kind, series, x, ylabel])

  // flow map: show the most recent year only (rows carry a year axis)
  const flowRows = useMemo(() => {
    if (kind !== 'flowmap' || !rows) return null
    if (!timeCol) return rows
    const yrs = [...new Set(rows.map((r) => r[timeCol]))].sort((a, b) => Number(b) - Number(a))
    return rows.filter((r) => String(r[timeCol]) === String(yrs[0]))
  }, [rows, kind, timeCol])

  const Skeleton = () => <div className="skeleton sk-chart" style={{ height }} />

  return (
    <motion.section className={'story' + (reverse ? ' rev' : '')}
      initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-90px' }}
      transition={{ duration: 0.55, ease: [0.22, 0.61, 0.36, 1] }}>
      <div className="story-text">
        <div className="story-kicker">{kicker}</div>
        <h2>{title}</h2>
        <p>{lede}</p>
        <button className="story-link" onClick={() => nav(href || `/db/${schema}/${table}`)}>{cta}</button>
      </div>
      <div className="story-chart">
        {kind === 'line' && (lineOpt ? <EChart option={lineOpt} height={height} /> : <Skeleton />)}
        {kind === 'map' && (mapData ? <MapChart data={mapData.data} level={level} min={mapData.min} max={mapData.max} title={title} height={height} /> : <Skeleton />)}
        {kind === 'flowmap' && (flowRows ? <FlowMapChart rows={flowRows} flow={flow} height={height} /> : <Skeleton />)}
        {kind === 'race' && (rows ? <BarRaceChart rows={rows} entityCol={entityCol} valueCol={series} timeCol={timeCol} nameFn={deptName} height={height} topN={12} /> : <Skeleton />)}
      </div>
    </motion.section>
  )
}
