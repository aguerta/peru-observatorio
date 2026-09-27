import { useEffect, useMemo, useRef, useState } from 'react'
import * as echarts from 'echarts'
import { motion } from 'framer-motion'
import { api } from '../api'
import { fmtNum, toNum, deptName } from '../chartLogic'
import { loadDepts } from '../geo'

const TABLE = 'indicadores_departamento_2025'
const SLOT_COLORS = ['#c85a34', '#157a6e', '#3f5aa6']
// indicators shown on the radar (a readable subset); table shows all
const RADAR_KEYS = ['Pobreza', 'Ingreso real pc', 'Educacion (anios)', 'Analfabetismo',
  'Agua dentro', 'Afiliado SIS', 'Empleo agricola']

function MiniMap({ selected }) {
  const [proj, setProj] = useState(null)
  useEffect(() => { loadDepts().then(setProj).catch(() => {}) }, [])
  if (!proj) return <div style={{ height: 220 }} />
  const colorOf = (code) => {
    const i = selected.indexOf(code)
    return i >= 0 ? SLOT_COLORS[i] : '#b7a37a' // clearly darker than the cream panel
  }
  return (
    <svg viewBox={`0 0 ${proj.W} ${proj.H}`} style={{ width: '100%', maxWidth: 260 }}>
      {proj.paths.map((p) => (
        <path key={p.name} d={p.d} fill={colorOf(p.code)}
          stroke="#fdf6e8" strokeWidth={0.9} fillOpacity={1} />
      ))}
    </svg>
  )
}

export default function Comparador() {
  const [rows, setRows] = useState(null)
  const [sel, setSel] = useState(['15', '21', '16']) // Lima, Puno, Loreto
  const radarRef = useRef(null)
  const chart = useRef(null)

  useEffect(() => {
    api.data('enaho', TABLE, { limit: 40 }).then((d) => setRows(d.rows)).catch(() => {})
  }, [])

  const byCode = useMemo(() => {
    const m = {}
    rows?.forEach((r) => { m[String(r.dep).padStart(2, '0')] = r })
    return m
  }, [rows])

  const indicators = useMemo(() =>
    rows ? Object.keys(rows[0]).filter((c) => c !== 'dep') : [], [rows])

  // national min/max/avg per indicator
  const stats = useMemo(() => {
    const s = {}
    for (const k of indicators) {
      const v = rows.map((r) => toNum(r[k])).filter(Number.isFinite)
      s[k] = { min: Math.min(...v), max: Math.max(...v), avg: v.reduce((a, b) => a + b, 0) / v.length }
    }
    return s
  }, [rows, indicators])

  // radar
  useEffect(() => {
    if (!rows || !radarRef.current) return
    if (!chart.current) chart.current = echarts.init(radarRef.current)
    const norm = (k, v) => stats[k].max === stats[k].min ? 50
      : ((v - stats[k].min) / (stats[k].max - stats[k].min)) * 100
    chart.current.setOption({
      color: SLOT_COLORS,
      textStyle: { fontFamily: '"Hanken Grotesk Variable", sans-serif' },
      tooltip: {},
      legend: { bottom: 0, textStyle: { color: '#6f6150' } },
      radar: {
        indicator: RADAR_KEYS.map((k) => ({ name: k.replace(' (anios)', ''), max: 100 })),
        radius: '66%', center: ['50%', '46%'],
        axisName: { color: '#4a4032', fontSize: 11, fontWeight: 600 },
        splitLine: { lineStyle: { color: '#c3ae83', width: 1 } },
        splitArea: { areaStyle: { color: ['#efe4c9', '#e3d4b2'] } },
        axisLine: { lineStyle: { color: '#c3ae83' } },
      },
      series: [{
        type: 'radar', symbolSize: 6, lineStyle: { width: 2.6 },
        data: sel.filter((c) => byCode[c]).map((c) => ({
          name: deptName(c), value: RADAR_KEYS.map((k) => +norm(k, toNum(byCode[c][k])).toFixed(1)),
          areaStyle: { opacity: 0.28 },
        })),
      }],
    }, true)
  }, [rows, sel, stats, byCode])

  useEffect(() => {
    const ro = new ResizeObserver(() => chart.current && chart.current.resize())
    if (radarRef.current) ro.observe(radarRef.current)
    return () => ro.disconnect()
  }, [])

  if (!rows) return <div className="loading">Cargando…</div>
  const options = Array.from({ length: 25 }, (_, i) => String(i + 1).padStart(2, '0'))
    .filter((c) => byCode[c])

  return (
    <div className="comparador">
      <div className="cmp-head">
        <div className="exp-crumb">HERRAMIENTA</div>
        <h1>Comparar departamentos</h1>
        <p>Elige hasta tres departamentos y compáralos indicador por indicador (ENAHO 2025).</p>
      </div>

      <div className="cmp-slots">
        {sel.map((code, i) => (
          <div key={i} className="cmp-slot" style={{ '--slot': SLOT_COLORS[i] }}>
            <span className="cmp-dot" style={{ background: SLOT_COLORS[i] }} />
            <select value={code} onChange={(e) => {
              const n = [...sel]; n[i] = e.target.value; setSel(n)
            }}>
              {options.map((c) => <option key={c} value={c}>{deptName(c)}</option>)}
            </select>
          </div>
        ))}
      </div>

      <div className="cmp-body">
        <div className="cmp-visual">
          <div ref={radarRef} className="cmp-radar" />
          <div className="cmp-map"><MiniMap selected={sel} /></div>
          <aside className="lectura cmp-lectura">
            <div className="lectura-head">Lectura</div>
            <p className="lectura-main">
              En el radar, más lejos del centro es un valor más alto en ese
              indicador (escala normalizada). La tabla trae los valores exactos
              contra el promedio nacional.
            </p>
            <ul className="lectura-list">
              {sel.map((c, i) => {
                const row = byCode[c]
                if (!row) return null
                let best = null
                indicators.forEach((k) => {
                  const v = toNum(row[k]); const avg = stats[k].avg
                  if (!Number.isFinite(v) || !avg) return
                  const d = (v - avg) / Math.abs(avg)
                  if (!best || Math.abs(d) > Math.abs(best.d)) best = { k, d }
                })
                return best ? (
                  <li key={c}><b style={{ color: SLOT_COLORS[i] }}>{deptName(c)}</b>: lo más
                    distintivo es {best.k.toLowerCase().replace(' (anios)', '')},{' '}
                    {Math.abs(best.d * 100).toFixed(0)}% {best.d >= 0 ? 'sobre' : 'bajo'} el promedio.</li>
                ) : null
              })}
            </ul>
            <div className="lectura-src">Fuente: ENAHO — INEI · 2025</div>
          </aside>
        </div>

        <div className="cmp-table-wrap">
          <table className="cmp-table">
            <thead>
              <tr>
                <th>Indicador</th>
                {sel.map((c, i) => <th key={i} style={{ color: SLOT_COLORS[i] }}>{deptName(c)}</th>)}
                <th className="cmp-nat">Prom. nacional</th>
              </tr>
            </thead>
            <tbody>
              {indicators.map((k) => (
                <tr key={k}>
                  <td className="cmp-ind">{k.replace(' (anios)', ' (años)')}</td>
                  {sel.map((c, i) => {
                    const v = byCode[c] ? toNum(byCode[c][k]) : NaN
                    const w = stats[k].max ? (v / stats[k].max) * 100 : 0
                    return (
                      <td key={i} className="cmp-cell">
                        <span className="cmp-val">{fmtNum(v)}</span>
                        <span className="cmp-bar"><motion.span className="cmp-fill"
                          style={{ background: SLOT_COLORS[i] }}
                          initial={{ width: 0 }} animate={{ width: `${Math.max(2, w)}%` }}
                          transition={{ duration: 0.6, ease: [0.22, 0.61, 0.36, 1] }} /></span>
                      </td>
                    )
                  })}
                  <td className="cmp-nat">{fmtNum(stats[k].avg)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="cmp-note">Radar en posición relativa nacional (0 = mínimo, 100 = máximo del país). La tabla muestra valores reales.</p>
    </div>
  )
}
