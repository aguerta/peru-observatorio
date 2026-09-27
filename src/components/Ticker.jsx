import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { toNum } from '../chartLogic'

// Newsroom ticker: a slow marquee of the country's live numbers with their
// direction vs the previous period. Every chip is clickable.
const ITEMS = [
  { label: 'Pobreza', schema: 'enaho', table: 'official_poverty_replication', col: 'poverty_pct', tcol: 'year', unit: '%', goodDown: true },
  { label: 'Ingreso mediano', schema: 'enaho', table: 'income_percentiles_tiempo', col: 'mediana', tcol: 'year', unit: '', prefix: 'S/ ' },
  { label: 'Desempleo Lima', schema: 'epen', table: 'epen_lima_movil_2001_2026', col: 'tasa_desempleo', tcol: 'ym', unit: '%', goodDown: true },
  { label: 'Informalidad', schema: 'enaho', table: 'informalidad_reconstruida', col: 'informal_reconstruido', tcol: 'year', unit: '%', goodDown: true },
  { label: 'Fecundidad', schema: 'endes', table: 'endes_indicadores', col: 'tfr', tcol: 'anio', unit: '' },
  { label: 'Desnutrición infantil', schema: 'endes', table: 'endes_indicadores', col: 'desnutricion', tcol: 'anio', unit: '%', goodDown: true },
  { label: 'Con seguro de salud', schema: 'enaho', table: 'seguro_salud_2004_2025', col: 'Algun seguro de salud', tcol: 'year', unit: '%' },
  { label: 'Brecha p90/p10', schema: 'enaho', table: 'income_percentiles_tiempo', col: 'ratio_p90_p10', tcol: 'year', unit: '×', goodDown: true },
  { label: 'Gini', schema: 'enaho', table: 'gini_nacional_tiempo', col: 'gini', tcol: 'year', unit: '', goodDown: true },
]

export default function Ticker() {
  const nav = useNavigate()
  const [vals, setVals] = useState({})

  useEffect(() => {
    let alive = true
    ITEMS.forEach((it) => {
      api.data(it.schema, it.table, { cols: [it.tcol, it.col], order: it.tcol, desc: true, limit: 2 })
        .then((d) => {
          if (!alive) return
          const v = d.rows.map((r) => toNum(r[it.col])).filter(Number.isFinite)
          if (v.length) setVals((cur) => ({ ...cur, [it.label]: { now: v[0], prev: v[1] } }))
        }).catch(() => {})
    })
    return () => { alive = false }
  }, [])

  const chips = ITEMS.filter((it) => vals[it.label])
  if (!chips.length) return null
  const fmt = (v) => v >= 100 ? Math.round(v).toLocaleString('es-PE') : (+v.toFixed(v < 10 ? 2 : 1)).toString()

  const Chip = ({ it }) => {
    const { now, prev } = vals[it.label]
    const up = prev != null && now > prev
    const flat = prev == null || Math.abs(now - prev) < 1e-9
    const good = flat ? null : (it.goodDown ? !up : up)
    return (
      <button className="tick-chip" onClick={() => nav(`/db/${it.schema}/${it.table}`)}>
        <span className="tick-label">{it.label}</span>
        <span className="tick-val">{it.prefix || ''}{fmt(now)}{it.unit}</span>
        {!flat && (
          <span className={'tick-dir ' + (good ? 'good' : 'bad')}>{up ? '▲' : '▼'}</span>
        )}
      </button>
    )
  }

  return (
    <div className="ticker" aria-hidden="false">
      <div className="ticker-track">
        {[0, 1].map((rep) => (
          <div key={rep} className="ticker-group">
            {chips.map((it) => <Chip key={rep + it.label} it={it} />)}
          </div>
        ))}
      </div>
    </div>
  )
}
