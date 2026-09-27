import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import * as echarts from 'echarts'
import { api } from '../api'
import { fmtNum, toNum, deptName, labelFor } from '../chartLogic'

const TABLE = 'indicadores_departamento_2025'

function stats(pts) {
  const n = pts.length
  const mx = pts.reduce((s, p) => s + p.x, 0) / n
  const my = pts.reduce((s, p) => s + p.y, 0) / n
  let sxy = 0, sxx = 0, syy = 0
  for (const p of pts) { sxy += (p.x - mx) * (p.y - my); sxx += (p.x - mx) ** 2; syy += (p.y - my) ** 2 }
  const r = sxy / Math.sqrt(sxx * syy || 1)
  const b = sxy / (sxx || 1)
  const a = my - b * mx
  return { r, a, b, mx, my }
}

export default function Correlacion() {
  // axes arrive preselected via ?x=&y= (the /graficos picker links here)
  const [searchParams, setSearchParams] = useSearchParams()
  const [rows, setRows] = useState(null)
  const [xv, setXv] = useState(searchParams.get('x') || 'Educacion (anios)')
  const [yv, setYv] = useState(searchParams.get('y') || 'Pobreza')
  const el = useRef(null)
  const chart = useRef(null)

  useEffect(() => {
    api.data('enaho', TABLE, { limit: 40 }).then((d) => setRows(d.rows)).catch(() => {})
  }, [])

  const indicators = useMemo(() =>
    rows ? Object.keys(rows[0]).filter((c) => c !== 'dep') : [], [rows])

  // keep the pair shareable in the address bar
  useEffect(() => {
    if (!indicators.length) return
    setSearchParams({ x: xv, y: yv }, { replace: true })
  }, [xv, yv, indicators.length]) // eslint-disable-line

  const pts = useMemo(() => rows ? rows.map((r) => ({
    name: deptName(String(r.dep).padStart(2, '0')), x: toNum(r[xv]), y: toNum(r[yv]),
  })).filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y)) : [], [rows, xv, yv])

  const st = useMemo(() => pts.length > 2 ? stats(pts) : null, [pts])

  useEffect(() => {
    if (!pts.length || !el.current) return
    if (!chart.current) chart.current = echarts.init(el.current)
    const ro = new ResizeObserver(() => chart.current && chart.current.resize())
    ro.observe(el.current)
    return () => ro.disconnect()
  }, [pts.length])

  useEffect(() => {
    if (!pts.length || !st || !chart.current) return
    const xs = pts.map((p) => p.x)
    const x0 = Math.min(...xs), x1 = Math.max(...xs)
    chart.current.setOption({
      textStyle: { fontFamily: '"Hanken Grotesk Variable", sans-serif' },
      grid: { left: 60, right: 28, top: 24, bottom: 52 },
      tooltip: {
        backgroundColor: '#fbf4e3', borderColor: '#cdba95', textStyle: { color: '#33281a' },
        formatter: (p) => p.seriesType === 'scatter'
          ? `<b>${p.data.name}</b><br/>${labelFor(xv)}: ${fmtNum(p.data.value[0])}<br/>${labelFor(yv)}: ${fmtNum(p.data.value[1])}`
          : '',
      },
      xAxis: {
        type: 'value', scale: true, name: labelFor(xv), nameLocation: 'middle', nameGap: 30,
        nameTextStyle: { color: '#5a5040', fontWeight: 700 },
        axisLabel: { color: '#8a7c62' }, splitLine: { lineStyle: { color: '#ece1cd' } },
      },
      yAxis: {
        type: 'value', scale: true, name: labelFor(yv),
        nameTextStyle: { color: '#5a5040', fontWeight: 700 },
        axisLabel: { color: '#8a7c62' }, splitLine: { lineStyle: { color: '#ece1cd' } },
      },
      series: [
        {
          type: 'line', silent: true, showSymbol: false,
          data: [[x0, st.a + st.b * x0], [x1, st.a + st.b * x1]],
          lineStyle: { color: '#157a6e', width: 2, type: 'dashed' },
        },
        {
          type: 'scatter', symbolSize: 12,
          data: pts.map((p) => ({ name: p.name, value: [p.x, p.y] })),
          itemStyle: { color: '#c85a34', opacity: 0.85, borderColor: '#fff', borderWidth: 1 },
          label: { show: true, formatter: (p) => p.data.name, position: 'right',
            color: '#5a5040', fontSize: 10, hideOverlap: true },
          emphasis: { itemStyle: { color: '#157a6e' }, label: { fontWeight: 700, fontSize: 12 } },
        },
      ],
      animationDuration: 500,
    }, true)
  }, [pts, st, xv, yv])

  if (!rows) return <div className="loading">Cargando…</div>

  const strength = st ? (Math.abs(st.r) >= 0.7 ? 'fuerte' : Math.abs(st.r) >= 0.4 ? 'moderada' : 'débil') : ''
  const dir = st && st.r >= 0 ? 'positiva' : 'negativa'
  const more = st && st.r >= 0 ? 'más' : 'menos'

  return (
    <div className="corr">
      <div className="cmp-head">
        <div className="exp-crumb">HERRAMIENTA</div>
        <h1>Explorador de correlaciones</h1>
        <p>Relación entre dos indicadores a nivel departamental (ENAHO 2025). Cada punto es un departamento.</p>
      </div>

      <div className="corr-controls">
        <div className="corr-sel"><label>Eje X</label>
          <select value={xv} onChange={(e) => setXv(e.target.value)}>
            {indicators.map((c) => <option key={c} value={c}>{labelFor(c)}</option>)}
          </select>
        </div>
        <div className="corr-vs">vs</div>
        <div className="corr-sel"><label>Eje Y</label>
          <select value={yv} onChange={(e) => setYv(e.target.value)}>
            {indicators.map((c) => <option key={c} value={c}>{labelFor(c)}</option>)}
          </select>
        </div>
        {st && (
          <div className={'corr-r ' + dir}>
            <div className="corr-r-val">r = {st.r.toFixed(2)}</div>
            <div className="corr-r-lbl">correlación {strength} {dir}</div>
          </div>
        )}
      </div>

      <div className="chart-row">
        <div className="corr-panel"><div ref={el} className="corr-chart" /></div>
        {st && (
          <aside className="lectura">
            <div className="lectura-head">Lectura</div>
            <p className="lectura-main">
              Cada punto es un departamento. Los que tienen más{' '}
              {labelFor(xv).toLowerCase()} tienden a tener {more}{' '}
              {labelFor(yv).toLowerCase()}.
            </p>
            <ul className="lectura-list">
              <li>La correlación es {strength} y {dir} (r = {st.r.toFixed(2)}).</li>
              <li>Explica el {Math.round(st.r * st.r * 100)}% de la variación entre departamentos (R²).</li>
              <li>La línea punteada es la tendencia: los puntos lejos de ella son las excepciones.</li>
              <li>Correlación no es causalidad: prueba otros pares con los selectores.</li>
            </ul>
            <div className="lectura-src">Fuente: ENAHO — INEI</div>
          </aside>
        )}
      </div>
    </div>
  )
}
