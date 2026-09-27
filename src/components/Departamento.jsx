import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import * as echarts from 'echarts'
import { api } from '../api'
import { fmtNum, toNum, deptName } from '../chartLogic'
import CountUp from './CountUp'

const TERRA = '#c85a34'
const NAT = '#a09274'

// panel_departamento indicators shown in the two-decades grid
const PANEL_IND = [
  { k: 'pobreza', label: 'Pobreza (%)' },
  { k: 'ingreso_real_pc', label: 'Ingreso real per cápita (S/.)' },
  { k: 'analfabetismo_15', label: 'Analfabetismo (%)' },
  { k: 'educ_anios_25', label: 'Años de educación (25+)' },
  { k: 'pct_sis', label: 'Afiliados al SIS (%)' },
  { k: 'lengua_indigena', label: 'Lengua indígena (%)' },
]
// hero chips from the 2025 synthesis (label -> column)
const CHIPS = [
  { col: 'Pobreza', label: 'Pobreza', unit: '%', lowIsGood: true },
  { col: 'Ingreso real pc', label: 'Ingreso real pc', unit: ' S/.', lowIsGood: false },
  { col: 'Educacion (anios)', label: 'Educación', unit: ' años', lowIsGood: false },
  { col: 'Analfabetismo', label: 'Analfabetismo', unit: '%', lowIsGood: true },
]
const RANK_COLS = ['Pobreza', 'Ingreso real pc', 'Educacion (anios)', 'Analfabetismo',
  'Afiliado SIS', 'Confianza inst.']

// name -> two-digit code, via chartLogic's canonical ordering
export function deptCode(name) {
  for (let i = 1; i <= 25; i++) if (deptName(i) === name) return String(i).padStart(2, '0')
  return null
}

function Mini({ series, natSeries, years, label }) {
  const el = useRef(null)
  useEffect(() => {
    const c = echarts.init(el.current)
    const ro = new ResizeObserver(() => c.resize())
    ro.observe(el.current)
    c.setOption({
      textStyle: { fontFamily: '"Hanken Grotesk Variable", sans-serif' },
      grid: { left: 42, right: 40, top: 26, bottom: 22 },
      tooltip: { trigger: 'axis', valueFormatter: (v) => fmtNum(v),
        backgroundColor: '#fffdf7', borderColor: '#d9cbae', textStyle: { color: '#34291c' } },
      title: { text: label, left: 0, top: 0, textStyle: { fontSize: 12.5, fontWeight: 700, color: '#5a5040' } },
      xAxis: { type: 'category', data: years, axisLabel: { color: '#a09478', fontSize: 10, interval: 6 },
        axisTick: { show: false }, axisLine: { lineStyle: { color: '#e3d6ba' } } },
      yAxis: { type: 'value', scale: true, axisLabel: { color: '#a09478', fontSize: 10, formatter: (v) => fmtNum(v) },
        splitLine: { lineStyle: { color: '#efe4cd' } } },
      series: [
        { name: 'Promedio dptos.', type: 'line', data: natSeries, smooth: 0.3, showSymbol: false,
          lineStyle: { width: 1.4, type: 'dashed', color: NAT }, itemStyle: { color: NAT }, silent: true },
        { name: 'Departamento', type: 'line', data: series, smooth: 0.3, showSymbol: false,
          lineStyle: { width: 2.6, color: TERRA }, itemStyle: { color: TERRA },
          areaStyle: { opacity: 0.07, color: TERRA },
          endLabel: { show: true, valueAnimation: true, color: TERRA, fontWeight: 800, fontSize: 11,
            formatter: (p) => fmtNum(p.value), distance: 5 } },
      ],
      animationDuration: 700,
    })
    return () => { ro.disconnect(); c.dispose() }
  }, [series, natSeries, years, label])
  return <div ref={el} className="dpto-mini" />
}

export default function Departamento() {
  const { code } = useParams()
  const nav = useNavigate()
  const name = deptName(Number(code))
  const [panel, setPanel] = useState(null)
  const [sint, setSint] = useState(null)
  const [gini, setGini] = useState(null)
  const [migra, setMigra] = useState(null)
  const [endes, setEndes] = useState(null)

  useEffect(() => {
    api.data('panel', 'panel_departamento_2004_2025', { limit: 8000 }).then((d) => setPanel(d.rows)).catch(() => {})
    api.data('enaho', 'indicadores_departamento_2025', { limit: 40 }).then((d) => setSint(d.rows)).catch(() => {})
    api.data('enaho', 'gini_departamento_tiempo', { limit: 1000 }).then((d) => setGini(d.rows)).catch(() => {})
    api.data('enaho', 'migracion_od_departamento', { limit: 4000 }).then((d) => setMigra(d.rows)).catch(() => {})
    api.data('endes', 'endes_dept_indicadores', { limit: 40 }).then((d) => setEndes(d.rows)).catch(() => {})
  }, [])

  const pad = String(code).padStart(2, '0')

  // two-decades series: dept vs simple average of departments
  const grids = useMemo(() => {
    if (!panel) return null
    const years = [...new Set(panel.map((r) => r.year))].sort()
    return PANEL_IND.map(({ k, label }) => {
      const rows = panel.filter((r) => r.indicator === k)
      const mine = years.map((y) => {
        const r = rows.find((q) => q.year === y && String(q.dpto).padStart(2, '0') === pad)
        return r ? +(+r.value).toFixed(2) : null
      })
      const nat = years.map((y) => {
        const vs = rows.filter((q) => q.year === y).map((q) => +q.value)
        return vs.length ? +(vs.reduce((a, b) => a + b, 0) / vs.length).toFixed(2) : null
      })
      return { k, label, years, mine, nat }
    })
  }, [panel, pad])

  // hero chips + rankings from the 2025 synthesis
  const row2025 = useMemo(() =>
    sint?.find((r) => String(r.dep).padStart(2, '0') === pad), [sint, pad])
  const ranks = useMemo(() => {
    if (!sint || !row2025) return null
    return RANK_COLS.map((col) => {
      const vals = sint.map((r) => ({ dep: r.dep, v: toNum(r[col]) })).filter((o) => Number.isFinite(o.v))
      const desc = col !== 'Pobreza' && col !== 'Analfabetismo' // higher is better except these
      vals.sort((a, b) => (desc ? b.v - a.v : a.v - b.v))
      const pos = vals.findIndex((o) => String(o.dep).padStart(2, '0') === pad) + 1
      return { col, pos, n: vals.length }
    })
  }, [sint, row2025, pad])

  // migration in/out for the latest year
  const flows = useMemo(() => {
    if (!migra) return null
    const yr = Math.max(...migra.map((r) => +r.anio))
    const y = migra.filter((r) => +r.anio === yr)
    const out = y.filter((r) => r.origen === name).sort((a, b) => b.personas - a.personas).slice(0, 5)
    const inn = y.filter((r) => r.destino === name).sort((a, b) => b.personas - a.personas).slice(0, 5)
    const outT = y.filter((r) => r.origen === name).reduce((s, r) => s + r.personas, 0)
    const innT = y.filter((r) => r.destino === name).reduce((s, r) => s + r.personas, 0)
    return { yr, out, inn, net: innT - outT }
  }, [migra, name])

  const giniNow = useMemo(() => {
    if (!gini) return null
    const mine = gini.filter((r) => String(r.dep).padStart(2, '0') === pad).sort((a, b) => a.anio - b.anio)
    return mine.length ? mine[mine.length - 1] : null
  }, [gini, pad])

  const endesRow = useMemo(() =>
    endes?.find((r) => String(r.dep).toUpperCase().startsWith(name.toUpperCase().slice(0, 6))), [endes, name])

  const natAvg = (col) => {
    if (!sint) return null
    const vs = sint.map((r) => toNum(r[col])).filter(Number.isFinite)
    return vs.reduce((a, b) => a + b, 0) / vs.length
  }

  const maxFlow = flows ? Math.max(...[...flows.out, ...flows.inn].map((f) => f.personas), 1) : 1

  return (
    <div className="dpto">
      <motion.header className="dpto-head" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 0.61, 0.36, 1] }}>
        <div className="exp-crumb">FICHA DEPARTAMENTAL</div>
        <div className="dpto-title-row">
          <h1>{name}</h1>
          <select className="dpto-select" value={pad}
            onChange={(e) => nav(`/dpto/${e.target.value}`)}>
            {Array.from({ length: 25 }, (_, i) => String(i + 1).padStart(2, '0'))
              .filter((c) => c !== '07')
              .map((c) => <option key={c} value={c}>{deptName(Number(c))}</option>)}
          </select>
        </div>
        <div className="dpto-chips">
          {CHIPS.map(({ col, label, unit, lowIsGood }) => {
            const v = row2025 ? toNum(row2025[col]) : null
            const avg = natAvg(col)
            const diff = v != null && avg != null ? v - avg : null
            const good = diff != null && (lowIsGood ? diff < 0 : diff > 0)
            return (
              <div key={col} className="dpto-chip">
                <div className="dc-label">{label}</div>
                <div className="dc-val">{v != null ? <CountUp to={v} decimals={v < 100 ? 1 : 0} suffix={unit} /> : '—'}</div>
                {diff != null && (
                  <div className={'dc-diff ' + (good ? 'good' : 'bad')}>
                    {diff >= 0 ? '▲' : '▼'} {fmtNum(Math.abs(diff))} vs promedio
                  </div>)}
              </div>)
          })}
          {giniNow && (
            <div className="dpto-chip">
              <div className="dc-label">Gini ({giniNow.anio})</div>
              <div className="dc-val"><CountUp to={giniNow.gini} decimals={2} /></div>
            </div>)}
        </div>
      </motion.header>

      {ranks && (
        <div className="dpto-ranks">
          {ranks.map((r) => (
            <div key={r.col} className={'rank-pill' + (r.pos <= 5 ? ' top' : r.pos > r.n - 5 ? ' low' : '')}>
              <span className="rank-pos">#{r.pos}</span>
              <span className="rank-col">{r.col}</span>
            </div>))}
          <span className="rank-note">posición entre {ranks[0]?.n} departamentos (mejor = #1)</span>
        </div>
      )}

      <div className="section-label">Dos décadas frente al país</div>
      <p className="dpto-note">Línea sólida: {name}. Punteada: promedio simple de los departamentos.</p>
      {grids
        ? <div className="dpto-grid">{grids.map((g) => {
            const first = g.mine.find((v) => v != null)
            const last = [...g.mine].reverse().find((v) => v != null)
            const natLast = [...g.nat].reverse().find((v) => v != null)
            const dir = last >= first ? 'subió' : 'bajó'
            const rel = natLast != null ? (last >= natLast ? 'por encima' : 'por debajo') : null
            return (
              <motion.div key={g.k} className="dpto-cell" initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.45 }}>
                <Mini series={g.mine} natSeries={g.nat} years={g.years} label={g.label} />
                {first != null && last != null && (
                  <p className="dpto-read">
                    {dir === 'subió' ? '▲' : '▼'} {dir} de {fmtNum(first)} a {fmtNum(last)}
                    {rel ? `, y hoy está ${rel} del promedio (${fmtNum(natLast)})` : ''}.
                  </p>
                )}
              </motion.div>
            )
          })}
          </div>
        : <div className="loading">Cargando…</div>}

      {flows && (flows.out.length || flows.inn.length) ? (
        <>
          <div className="section-label">Migración · {flows.yr}</div>
          <div className="dpto-migra">
            <div className="mig-col">
              <h3>Llegan desde</h3>
              {flows.inn.map((f) => (
                <button key={f.origen} className="mig-row" onClick={() => {
                  const c = deptCode(f.origen)
                  if (c) nav(`/dpto/${c}`)
                }}>
                  <span className="mig-name">{f.origen}</span>
                  <span className="mig-bar"><span style={{ width: `${100 * f.personas / maxFlow}%`, background: '#157a6e' }} /></span>
                  <span className="mig-val">{Math.round(f.personas).toLocaleString('es-PE')}</span>
                </button>))}
            </div>
            <div className="mig-col">
              <h3>Salen hacia</h3>
              {flows.out.map((f) => (
                <button key={f.destino} className="mig-row" onClick={() => {
                  const c = deptCode(f.destino)
                  if (c) nav(`/dpto/${c}`)
                }}>
                  <span className="mig-name">{f.destino}</span>
                  <span className="mig-bar"><span style={{ width: `${100 * f.personas / maxFlow}%`, background: TERRA }} /></span>
                  <span className="mig-val">{Math.round(f.personas).toLocaleString('es-PE')}</span>
                </button>))}
            </div>
            <div className="mig-net">
              <div className="dc-label">Saldo migratorio</div>
              <div className={'mig-net-val ' + (flows.net >= 0 ? 'good' : 'bad')}>
                {flows.net >= 0 ? '+' : '−'}{Math.abs(Math.round(flows.net)).toLocaleString('es-PE')}
              </div>
              <div className="mig-net-note">{flows.net >= 0 ? 'gana' : 'pierde'} población por migración interna</div>
            </div>
          </div>
        </>
      ) : null}

      {endesRow && (
        <>
          <div className="section-label">Salud y fertilidad (ENDES)</div>
          <div className="dpto-chips">
            {[['hijos_ceb', 'Hijos por mujer', ''], ['adol_madre', 'Madres adolescentes', '%'],
              ['anemia', 'Anemia infantil', '%'], ['desnutricion', 'Desnutrición crónica', '%'],
              ['parto_inst', 'Parto institucional', '%']].map(([k, label, unit]) => (
              <div key={k} className="dpto-chip">
                <div className="dc-label">{label}</div>
                <div className="dc-val">{fmtNum(toNum(endesRow[k]))}{unit}</div>
              </div>))}
          </div>
        </>
      )}

      <div className="dpto-foot">
        <button className="story-link" onClick={() => nav('/comparar')}>Comparar con otro departamento →</button>
      </div>
    </div>
  )
}
