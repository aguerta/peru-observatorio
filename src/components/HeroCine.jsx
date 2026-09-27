import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import * as echarts from 'echarts'
import { api } from '../api'
import CountUp from './CountUp'
import { toNum } from '../chartLogic'

// Data cinema: the hero rotates through the country's biggest stories, each
// with its chart drawing itself and the headline number counting up. Built
// for the reader who falls in love with a moving line.
const SLIDES = [
  { kicker: 'POBREZA', head: 'La pobreza se partió a la mitad',
    schema: 'enaho', table: 'official_poverty_replication', col: 'poverty_pct', tcol: 'year',
    unit: '%', color: '#c85a34', sub: 'de los peruanos hoy · era 58.7% en 2004' },
  { kicker: 'CONECTIVIDAD', head: 'El celular conquistó el país',
    schema: 'enaho', table: 'vivienda_servicios_2004_2025', col: 'p1142', tcol: 'year',
    unit: '%', color: '#3f5aa6', sub: 'de los hogares tiene celular · era 16% en 2004' },
  { kicker: 'SALUD INFANTIL', head: 'La desnutrición colapsó',
    schema: 'endes', table: 'endes_indicadores', col: 'desnutricion', tcol: 'anio',
    unit: '%', color: '#157a6e', sub: 'de desnutrición crónica infantil · era 29% en 2004' },
  { kicker: 'DESIGUALDAD', head: 'La brecha, en mínimo histórico',
    schema: 'enaho', table: 'income_percentiles_tiempo', col: 'ratio_p90_p10', tcol: 'year',
    unit: '×', color: '#8a4a6b', sub: 'vive el p90 por cada sol del p10 · era 9.7× en 2004' },
]
const HOLD_MS = 6500

export default function HeroCine() {
  const nav = useNavigate()
  const [series, setSeries] = useState({})
  const [i, setI] = useState(0)
  const el = useRef(null)
  const chart = useRef(null)

  useEffect(() => {
    let alive = true
    SLIDES.forEach((s) => {
      api.data(s.schema, s.table, { cols: [s.tcol, s.col], order: s.tcol, limit: 200 })
        .then((d) => {
          if (!alive) return
          const rows = d.rows.map((r) => [r[s.tcol], toNum(r[s.col])])
            .filter((r) => Number.isFinite(r[1]))
          setSeries((cur) => ({ ...cur, [s.table + s.col]: rows }))
        }).catch(() => {})
    })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = setInterval(() => setI((x) => (x + 1) % SLIDES.length), HOLD_MS)
    return () => clearInterval(id)
  }, [])

  const slide = SLIDES[i]
  const data = series[slide.table + slide.col]
  const last = data?.length ? data[data.length - 1][1] : null

  useEffect(() => {
    if (!el.current) return
    if (!chart.current) {
      chart.current = echarts.init(el.current)
      const ro = new ResizeObserver(() => chart.current && chart.current.resize())
      ro.observe(el.current)
    }
    if (!data) return
    chart.current.setOption({
      grid: { left: 6, right: 6, top: 10, bottom: 6 },
      xAxis: { type: 'category', show: false, data: data.map((r) => r[0]), boundaryGap: false },
      yAxis: { type: 'value', show: false, min: (v) => v.min * 0.9 },
      series: [{
        type: 'line', data: data.map((r) => r[1]), smooth: 0.3, showSymbol: false,
        lineStyle: { width: 4, color: slide.color, cap: 'round' },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [{ offset: 0, color: slide.color + '44' }, { offset: 1, color: slide.color + '00' }] } },
      }],
      animationDuration: 1800, animationEasing: 'cubicOut',
    }, true)
  }, [data, i])

  return (
    <div className="cine" onClick={() => nav(`/db/${slide.schema}/${slide.table}`)}
      role="button" aria-label={slide.head} tabIndex={0}>
      <AnimatePresence mode="wait">
        <motion.div key={i} className="cine-text"
          initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -14 }} transition={{ duration: 0.45, ease: [0.22, 0.61, 0.36, 1] }}>
          <div className="cine-kicker" style={{ color: slide.color }}>{slide.kicker}</div>
          <div className="cine-head">{slide.head}</div>
          <div className="cine-num" style={{ color: slide.color }}>
            {last == null ? '…' : <CountUp to={last} decimals={last < 20 ? 1 : 0} suffix={slide.unit} />}
          </div>
          <div className="cine-sub">{slide.sub}</div>
        </motion.div>
      </AnimatePresence>
      <div ref={el} className="cine-chart" />
      <div className="cine-dots" onClick={(e) => e.stopPropagation()}>
        {SLIDES.map((s, j) => (
          <button key={j} className={'cine-dot' + (j === i ? ' on' : '')}
            aria-label={s.head} onClick={() => setI(j)} />
        ))}
      </div>
    </div>
  )
}
