import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useInView } from 'framer-motion'
import * as echarts from 'echarts'
import { api } from '../api'
import { toNum } from '../chartLogic'

// Scrollytelling: la historia de la desigualdad via percentiles de ingreso real
// (income_percentiles_tiempo, metodo ipcr_0 oficial). Las tres series se
// indexan a 2004=100: si la linea del p10 sube mas que la del p90, el
// crecimiento fue pro-pobre. Complemento de Historia (pobreza).

const COLORS = { p10: '#157a6e', mediana: '#3f5aa6', p90: '#c85a34' }
const LABELS = { p10: 'Percentil 10 (los más pobres)', mediana: 'Mediana', p90: 'Percentil 90 (los más ricos)' }

const STEPS = [
  { kicker: '2004', title: 'Un país diez veces desigual', from: 2004, to: 2004,
    text: 'En 2004, un hogar del percentil 90 vivía con S/ 1,650 reales per cápita al mes. Uno del percentil 10, con S/ 170: casi diez veces menos. Las tres líneas parten juntas en 100 — lo que importa es cuál crece más.' },
  { kicker: '2004 – 2013', title: 'El boom levantó más a los de abajo', from: 2004, to: 2013,
    text: 'La década del boom hizo crecer el ingreso real de todos, pero no por igual: el percentil 10 crecía 6.6% al año frente a 4.3% del percentil 90. La brecha p90/p10 cayó de 9.7 a 8.0.' },
  { kicker: '2013 – 2019', title: 'El motor se enfría, la brecha sigue cerrando', from: 2013, to: 2019,
    text: 'Con menos viento a favor, el patrón se mantuvo: abajo se crecía a 3-4% anual y arriba a menos de 1%. Para 2019 la brecha p90/p10 era 6.9 — la menor del período.' },
  { kicker: '2020', title: 'El COVID golpeó a todos — y más a los pobres', from: 2019, to: 2020,
    text: 'La pandemia hundió el ingreso de toda la distribución, pero el percentil 10 cayó 31% en un año, frente a 17% del percentil 90. La brecha rebotó a 8.2.' },
  { kicker: '2020 – 2025', title: 'Abajo se recuperó. Arriba, no', from: 2020, to: 2025,
    text: 'La recuperación fue asimétrica al revés: en 2025 el percentil 10 ya supera su nivel de 2019 (S/ 384), mientras la mitad superior sigue por debajo — el percentil 90 pierde ingreso real desde 2019. La brecha p90/p10 tocó su mínimo histórico: 6.2.',
    cta: { label: 'Ver quién ganó con el crecimiento →', to: '/db/enaho/gic_periodos' } },
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

export default function Desigualdad() {
  const nav = useNavigate()
  const [data, setData] = useState(null)
  const [active, setActive] = useState(0)
  const el = useRef(null)
  const chart = useRef(null)

  useEffect(() => {
    api.data('enaho', 'income_percentiles_tiempo',
      { cols: ['year', 'p10', 'mediana', 'p90'], order: 'year', limit: 100 })
      .then((d) => setData(d.rows.map((r) => ({
        year: +r.year, p10: toNum(r.p10), mediana: toNum(r.mediana), p90: toNum(r.p90),
      }))))
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
    const base = data[0]
    const keys = ['p10', 'mediana', 'p90']
    chart.current.setOption({
      textStyle: { fontFamily: '"Hanken Grotesk Variable", sans-serif' },
      grid: { left: 46, right: 24, top: 44, bottom: 40 },
      legend: {
        top: 0, left: 40, icon: 'roundRect', itemWidth: 14, itemHeight: 4,
        textStyle: { color: '#5c5040', fontSize: 12 },
        data: keys.map((k) => LABELS[k]),
      },
      tooltip: {
        trigger: 'axis',
        valueFormatter: (v) => (v == null ? '' : v.toFixed(0) + ' (2004=100)'),
      },
      xAxis: {
        type: 'category', data: years, boundaryGap: false,
        axisLine: { lineStyle: { color: '#d9cbae' } },
        axisLabel: { color: '#8a7c68', interval: 4 }, axisTick: { show: false },
      },
      yAxis: {
        type: 'value', axisLabel: { color: '#8a7c68' },
        splitLine: { lineStyle: { color: '#ece1cd' } },
        min: 80,
      },
      series: keys.map((k) => ({
        name: LABELS[k],
        type: 'line', smooth: 0.25, showSymbol: false,
        data: data.map((d) => 100 * d[k] / base[k]),
        lineStyle: { width: k === 'mediana' ? 2.5 : 3, color: COLORS[k] },
        emphasis: { focus: 'series' },
        markArea: k === 'p10' ? {
          silent: true,
          itemStyle: { color: 'rgba(63,90,166,0.08)' },
          data: [[{ xAxis: String(step.from) }, { xAxis: String(step.to) }]],
        } : undefined,
        endLabel: {
          show: true, formatter: () => LABELS[k].split(' ')[0] === 'Mediana' ? 'Mediana' : LABELS[k].match(/Percentil \d+/)[0],
          color: COLORS[k], fontWeight: 600, fontSize: 11, distance: 6,
        },
      })),
      animationDuration: 500,
    }, true)
  }, [active, data, years])

  return (
    <div className="historia">
      <div className="hist-head">
        <div className="exp-crumb">HISTORIA · DESIGUALDAD</div>
        <h1>El crecimiento que llegó primero a los pobres</h1>
        <p className="hist-lead">Ingreso real per cápita por percentil, indexado a 2004 = 100.
          Cuando la línea verde sube más que la roja, el país se hace menos desigual.
          Desplázate para recorrer la serie.</p>
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
