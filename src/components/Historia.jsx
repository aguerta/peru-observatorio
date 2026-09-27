import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useInView } from 'framer-motion'
import * as echarts from 'echarts'
import { api } from '../api'
import { toNum } from '../chartLogic'

const ACCENT = '#c85a34'
const STEPS = [
  { kicker: '2004', title: 'Más de la mitad del país era pobre', from: 2004, to: 2004, focus: 2004,
    text: 'A comienzos de siglo, 58.7% de los peruanos vivía en pobreza monetaria. La pobreza era la condición de la mayoría.' },
  { kicker: '2004 – 2019', title: 'Quince años de caída sostenida', from: 2004, to: 2019, focus: 2019,
    text: 'En los años del crecimiento acelerado y la expansión de programas sociales, la pobreza cayó a 20.2% en 2019 — menos de la mitad que en 2004 y una de las reducciones más rápidas de la región. Cuánto puso cada factor sigue siendo debate: la serie muestra la cronología, no el reparto causal.' },
  { kicker: '2020', title: 'La pandemia borró años de progreso', from: 2019, to: 2020, focus: 2020,
    text: 'En un solo año, la pobreza saltó a 30.1%. El confinamiento golpeó con más fuerza al empleo informal, y una década de avances se deshizo en meses.' },
  { kicker: '2021 – 2025', title: 'Una recuperación que aún no cierra', from: 2020, to: 2025, focus: 2025,
    text: 'La pobreza bajó desde el pico, pero se estancó: 25.7% en 2025, todavía por encima del nivel pre-pandemia. La cicatriz del COVID sigue abierta.' },
  { kicker: 'Detrás del promedio', title: 'La pobreza es rotacional', from: 2004, to: 2025, focus: null,
    text: 'El número anual esconde algo más profundo: los hogares entran y salen de la pobreza año a año. Solo una minoría es pobre de forma crónica.',
    cta: { label: 'Ver la dinámica de la pobreza →', to: '/db/panel/panel_pobreza_dinamica_2007_2011' } },
]

function Step({ i, step, onActive, nav }) {
  const ref = useRef(null)
  const inView = useInView(ref, { margin: '-45% 0px -45% 0px' })
  useEffect(() => { if (inView) onActive(i) }, [inView, i])
  return (
    <div ref={ref} className={'scrolly-step' + (inView ? ' on' : '')}>
      <div className="step-kicker">{step.kicker}</div>
      <h2>{step.title}</h2>
      <p>{step.text}</p>
      {step.cta && (
        <button className="step-cta" onClick={() => nav(step.cta.to)}>{step.cta.label}</button>
      )}
    </div>
  )
}

export default function Historia() {
  const nav = useNavigate()
  const [data, setData] = useState(null)
  const [active, setActive] = useState(0)
  const el = useRef(null)
  const chart = useRef(null)

  useEffect(() => {
    api.data('enaho', 'official_poverty_replication',
      { cols: ['year', 'poverty_pct'], order: 'year', limit: 100 })
      .then((d) => setData(d.rows.map((r) => ({ year: +r.year, v: toNum(r.poverty_pct) }))))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!data || !el.current) return
    if (!chart.current) chart.current = echarts.init(el.current)
    const ro = new ResizeObserver(() => chart.current && chart.current.resize())
    ro.observe(el.current)
    return () => ro.disconnect()
  }, [data])

  const years = useMemo(() => data?.map((d) => d.year) || [], [data])

  useEffect(() => {
    if (!data || !chart.current) return
    const step = STEPS[active]
    const focalVal = step.focus != null ? data.find((d) => d.year === step.focus)?.v : null
    chart.current.setOption({
      textStyle: { fontFamily: '"Hanken Grotesk Variable", sans-serif' },
      grid: { left: 46, right: 24, top: 24, bottom: 40 },
      tooltip: { trigger: 'axis', valueFormatter: (v) => v?.toFixed(1) + '%' },
      xAxis: {
        type: 'category', data: years, boundaryGap: false,
        axisLine: { lineStyle: { color: '#d9cbae' } },
        axisLabel: { color: '#8a7c68', interval: 4 }, axisTick: { show: false },
      },
      yAxis: {
        type: 'value', max: 65, axisLabel: { color: '#8a7c68', formatter: '{value}%' },
        splitLine: { lineStyle: { color: '#ece1cd' } },
      },
      series: [{
        type: 'line', data: data.map((d) => d.v), smooth: 0.25, showSymbol: false,
        lineStyle: { width: 3, color: ACCENT },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [{ offset: 0, color: ACCENT + '33' }, { offset: 1, color: ACCENT + '00' }] } },
        markArea: {
          silent: true,
          itemStyle: { color: 'rgba(200,90,52,0.10)' },
          data: [[{ xAxis: String(step.from) }, { xAxis: String(step.to) }]],
        },
        markPoint: focalVal == null ? undefined : {
          symbol: 'circle', symbolSize: 11,
          itemStyle: { color: ACCENT, borderColor: '#fffdf7', borderWidth: 2 },
          label: {
            formatter: `${focalVal.toFixed(1)}%`,
            // leftmost point sits by the y-axis, so push its label right (and a
            // high value near the top pushes down) to avoid the axis labels
            position: step.focus === years[0] ? 'right'
              : step.focus === years[years.length - 1] ? 'left'
              : focalVal > 55 ? 'bottom' : 'top',
            distance: 8, color: '#34291c', fontWeight: 700, fontSize: 13,
          },
          data: [{ coord: [String(step.focus), focalVal] }],
        },
      }],
      animationDuration: 500,
    }, true)
  }, [active, data, years])

  return (
    <div className="historia">
      <div className="hist-head">
        <div className="exp-crumb">HISTORIA · POBREZA</div>
        <h1>Dos décadas de pobreza en el Perú</h1>
        <p className="hist-lead">De la mayoría a la cuarta parte —y el golpe de una pandemia. Desplázate para recorrer la serie.</p>
      </div>
      <div className="scrolly">
        <div className="scrolly-graphic">
          <div ref={el} className="scrolly-chart" />
          <div className="scrolly-progress">{active + 1} / {STEPS.length}</div>
        </div>
        <div className="scrolly-steps">
          {STEPS.map((s, i) => (
            <Step key={i} i={i} step={s} onActive={setActive} nav={nav} />
          ))}
        </div>
      </div>
    </div>
  )
}
