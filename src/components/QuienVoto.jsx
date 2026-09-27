import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useInView } from 'framer-motion'
import * as echarts from 'echarts'
import { api } from '../api'
import { toNum, deptName } from '../chartLogic'

// ¿Quién votó por Keiko? — scrollytelling donde el gráfico CAMBIA con cada
// paso. Correlaciones citadas del análisis distrital congelado (ONPE 99.44%,
// ponderado por electores): pobreza −0.05, lengua indígena −0.83,
// tamaño +0.62, persistencia 2021→2026 +0.991.
const ACC = '#3f5aa6'
const TERRA = '#c85a34'

const STEPS = [
  { k: 'EL RESULTADO', title: 'Un país partido en dos', chart: 'deps',
    text: 'En la segunda vuelta de 2026 el voto por Keiko Fujimori fue de 13.7% en Puno a 65.9% en el Callao. No hay término medio: la costa norte y Lima de un lado, el sur andino del otro.' },
  { k: 'LA SOSPECHA OBVIA', title: 'No es la pobreza', chart: 'pobreza',
    text: 'La explicación fácil sería el dinero: los pobres contra ella, los ricos con ella. Los datos la desmienten: la correlación departamental entre pobreza y voto es −0.05, básicamente cero. Loreto, con 40% de pobreza, le dio 53%. Apurímac, con la mitad de esa pobreza, le dio 19%. La nube no tiene pendiente.' },
  { k: 'LA GRIETA REAL', title: 'Es la lengua', chart: 'lengua',
    text: 'Donde la mayoría aprendió quechua o aimara de niña, el voto por Keiko se derrumba: la correlación departamental con lengua indígena es −0.83, la más fuerte de todos los indicadores. Le siguen el empleo agrícola (−0.63) y el analfabetismo (−0.60). La grieta es etnolingüística y agraria, no económica.' },
  { k: 'EL GRADIENTE URBANO', title: 'Ciudad grande, voto fujimorista', chart: 'quintiles',
    text: 'Ordena los 1,874 distritos por tamaño y aparece el otro eje: en los cuatro quintiles menores su voto ronda 28-33%, en el quintil de las ciudades grandes salta a 54%. Ganó más de 50% en solo 1 de cada 5 distritos, pero esos concentran el 60% del electorado.' },
  { k: 'CINCO AÑOS DESPUÉS', title: 'El mapa está congelado', chart: 'persistencia',
    text: 'Cada punto es un distrito: su voto de 2021 contra el de 2026. La correlación distrital es 0.991 — con otro rival y cinco años de distancia, el mapa fujimorista y antifujimorista casi no se movió. Mejoró apenas +0.4pp a nivel nacional, ganando más en los distritos chicos y rurales donde sigue siendo más débil.' },
  { k: 'LA LECTURA', title: 'Identidad antes que bolsillo', chart: 'deps',
    text: 'Ninguno de los dos polos se explica por cuánto tiene la gente. Los datos describen dos electorados con perfiles territoriales distintos — uno urbano, costeño y castellanohablante, otro andino, agrario y con menos confianza en el Estado — y la asociación es descriptiva, no un destino causal. Dentro de casa la elección quedó casi empatada y la decidió el voto del exterior.',
    cta: { label: 'Explora el voto distrito por distrito →', to: '/db/enaho/voto_keiko_distrito_2021_2026' } },
]

function Step({ i, step, onActive, nav }) {
  const ref = useRef(null)
  const inView = useInView(ref, { margin: '-45% 0px -45% 0px' })
  useEffect(() => { if (inView) onActive(i) }, [inView, i])
  return (
    <div ref={ref} className={'scrolly-step' + (inView ? ' on' : '')}>
      <div className="step-kicker">{step.k}</div>
      <h2>{step.title}</h2>
      <p>{step.text}</p>
      {step.cta && <button className="step-cta" onClick={() => nav(step.cta.to)}>{step.cta.label}</button>}
    </div>
  )
}

const nrm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()

export default function QuienVoto() {
  const nav = useNavigate()
  const [dep, setDep] = useState(null)      // dept vote rows (ONPE)
  const [ind, setInd] = useState(null)      // dept ENAHO indicators (INEI codes)
  const [dist, setDist] = useState(null)    // district rows
  const [active, setActive] = useState(0)
  const el = useRef(null)
  const chart = useRef(null)

  useEffect(() => {
    api.data('enaho', 'voto_keiko_departamento', { limit: 30 }).then((d) => setDep(d.rows)).catch(() => {})
    api.data('enaho', 'indicadores_departamento_2025', { limit: 30 }).then((d) => setInd(d.rows)).catch(() => {})
    api.data('enaho', 'voto_keiko_distrito_2021_2026',
      { cols: ['keiko_share_2021', 'keiko_share_2026', 'electores'], limit: 2000 })
      .then((d) => setDist(d.rows)).catch(() => {})
  }, [])

  // dept vote joined with ENAHO indicators by normalized name (INEI code -> name)
  const joined = useMemo(() => {
    if (!dep || !ind) return null
    const byName = {}
    ind.forEach((r) => { byName[nrm(deptName(r.dep))] = r })
    return dep.map((r) => ({ ...r, enaho: byName[nrm(r.departamento)] })).filter((r) => r.enaho)
  }, [dep, ind])

  const quintiles = useMemo(() => {
    if (!dist) return null
    const rows = dist.filter((r) => Number.isFinite(toNum(r.electores)))
      .sort((a, b) => a.electores - b.electores)
    const qs = []
    const n = rows.length
    for (let q = 0; q < 5; q++) {
      const seg = rows.slice(Math.floor(q * n / 5), Math.floor((q + 1) * n / 5))
      let num = 0, den = 0
      seg.forEach((r) => { num += toNum(r.keiko_share_2026) * r.electores; den += r.electores })
      qs.push(+(num / den).toFixed(1))
    }
    return qs
  }, [dist])

  useEffect(() => {
    if (!el.current) return
    if (!chart.current) {
      chart.current = echarts.init(el.current)
      const ro = new ResizeObserver(() => chart.current && chart.current.resize())
      ro.observe(el.current)
    }
  }, [])

  useEffect(() => {
    if (!chart.current) return
    const kind = STEPS[active].chart
    const base = {
      textStyle: { fontFamily: '"Hanken Grotesk Variable", sans-serif' },
      animationDuration: 700, animationEasing: 'cubicOut',
    }
    let opt = null
    if (kind === 'deps' && dep) {
      const rows = [...dep].sort((a, b) => a.keiko_share_2026 - b.keiko_share_2026)
      opt = { ...base,
        grid: { left: 110, right: 40, top: 12, bottom: 28 },
        tooltip: { trigger: 'axis', valueFormatter: (v) => v?.toFixed(1) + '%' },
        xAxis: { type: 'value', max: 70, axisLabel: { color: '#8a7c68', formatter: '{value}%' }, splitLine: { lineStyle: { color: '#ece1cd' } } },
        yAxis: { type: 'category', data: rows.map((r) => r.departamento), axisLabel: { color: '#5c5040', fontSize: 10.5 }, axisTick: { show: false }, axisLine: { show: false } },
        series: [{ type: 'bar', data: rows.map((r) => ({ value: r.keiko_share_2026, itemStyle: { color: r.keiko_share_2026 >= 50 ? TERRA : '#d9b38f', borderRadius: 3 } })), barMaxWidth: 12,
          markLine: { symbol: 'none', silent: true, lineStyle: { color: '#8a7c68', type: 'dashed' }, label: { formatter: '50%', color: '#8a7c68' }, data: [{ xAxis: 50 }] } }],
      }
    } else if ((kind === 'pobreza' || kind === 'lengua') && joined) {
      const xf = kind === 'pobreza' ? 'Pobreza' : 'Lengua indigena'
      opt = { ...base,
        grid: { left: 52, right: 24, top: 34, bottom: 44 },
        tooltip: { formatter: (p) => `<b>${p.data[2]}</b><br/>${xf}: ${p.data[0]}%<br/>Keiko 2026: ${p.data[1]}%` },
        xAxis: { type: 'value', name: xf + ' (%)', nameLocation: 'middle', nameGap: 28, nameTextStyle: { color: '#8a7c68', fontWeight: 700 }, axisLabel: { color: '#8a7c68' }, splitLine: { lineStyle: { color: '#ece1cd' } } },
        yAxis: { type: 'value', name: 'Voto Keiko 2026 (%)', nameTextStyle: { color: '#8a7c68', fontWeight: 700 }, axisLabel: { color: '#8a7c68' }, splitLine: { lineStyle: { color: '#ece1cd' } } },
        series: [{ type: 'scatter', symbolSize: 13,
          itemStyle: { color: kind === 'pobreza' ? '#9c6b2f' : ACC, opacity: 0.8 },
          label: { show: true, formatter: (p) => p.data[2], position: 'top', fontSize: 9, color: '#8a7c68' },
          labelLayout: { hideOverlap: true },
          data: joined.map((r) => [toNum(r.enaho[xf]), toNum(r.keiko_share_2026), r.departamento]) }],
      }
    } else if (kind === 'quintiles' && quintiles) {
      opt = { ...base,
        grid: { left: 52, right: 24, top: 30, bottom: 44 },
        tooltip: { trigger: 'axis', valueFormatter: (v) => v?.toFixed(1) + '%' },
        xAxis: { type: 'category', data: ['Q1 chicos', 'Q2', 'Q3', 'Q4', 'Q5 ciudades'], axisLabel: { color: '#8a7c68' }, axisTick: { show: false } },
        yAxis: { type: 'value', max: 60, axisLabel: { color: '#8a7c68', formatter: '{value}%' }, splitLine: { lineStyle: { color: '#ece1cd' } } },
        series: [{ type: 'bar', data: quintiles.map((v) => ({ value: v, itemStyle: { color: v > 50 ? TERRA : '#d9b38f', borderRadius: 4 } })), barMaxWidth: 60,
          label: { show: true, position: 'top', fontWeight: 800, color: '#34291c', formatter: (p) => p.value + '%' } }],
      }
    } else if (kind === 'persistencia' && dist) {
      opt = { ...base,
        grid: { left: 52, right: 24, top: 34, bottom: 44 },
        tooltip: { formatter: (p) => `2021: ${p.data[0]}%<br/>2026: ${p.data[1]}%` },
        xAxis: { type: 'value', max: 100, name: 'Voto Keiko 2021 (%)', nameLocation: 'middle', nameGap: 28, nameTextStyle: { color: '#8a7c68', fontWeight: 700 }, axisLabel: { color: '#8a7c68' }, splitLine: { lineStyle: { color: '#ece1cd' } } },
        yAxis: { type: 'value', max: 100, name: 'Voto Keiko 2026 (%)', nameTextStyle: { color: '#8a7c68', fontWeight: 700 }, axisLabel: { color: '#8a7c68' }, splitLine: { lineStyle: { color: '#ece1cd' } } },
        series: [
          { type: 'scatter', symbolSize: 4, itemStyle: { color: ACC, opacity: 0.35 }, large: true,
            data: dist.map((r) => [toNum(r.keiko_share_2021), toNum(r.keiko_share_2026)]) },
          { type: 'line', data: [[0, 0], [100, 100]], showSymbol: false, silent: true,
            lineStyle: { color: '#8a7c68', type: 'dashed', width: 1 } },
        ],
      }
    }
    if (opt) chart.current.setOption(opt, true)
  }, [active, dep, joined, quintiles, dist])

  return (
    <div className="historia">
      <div className="hist-head">
        <div className="exp-crumb">HISTORIA · ELECCIONES</div>
        <h1>El mapa de la grieta</h1>
        <p className="hist-lead">La segunda vuelta de 2026 en 1,874 distritos: qué separa al Perú fujimorista del antifujimorista — y por qué la grieta no es la que crees. Desplázate.</p>
      </div>
      <div className="scrolly">
        <div className="scrolly-graphic">
          <div ref={el} className="scrolly-chart" />
          <div className="scrolly-progress">{active + 1} / {STEPS.length}</div>
        </div>
        <div className="scrolly-steps">
          {STEPS.map((s, i) => <Step key={i} i={i} step={s} onActive={setActive} nav={nav} />)}
        </div>
      </div>
    </div>
  )
}
