import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'

// Open-data hub: every table in the observatory, searchable, with direct CSV
// download and a link to its chart. The whole catalog in one page.
export default function Datos() {
  const nav = useNavigate()
  const [index, setIndex] = useState([])
  const [q, setQ] = useState('')

  useEffect(() => {
    fetch('/api/index').then((r) => r.json()).then(setIndex).catch(() => {})
  }, [])

  const groups = useMemo(() => {
    const s = q.trim().toLowerCase()
    const hit = index.filter((x) => !s
      || x.title.toLowerCase().includes(s) || (x.theme || '').toLowerCase().includes(s)
      || (x.section || '').toLowerCase().includes(s) || x.table.toLowerCase().includes(s))
    const by = {}
    hit.forEach((x) => { (by[x.section] = by[x.section] || []).push(x) })
    return Object.entries(by)
  }, [index, q])

  const total = groups.reduce((s, [, xs]) => s + xs.length, 0)

  return (
    <div className="datos">
      <div className="exp-crumb">DATOS ABIERTOS</div>
      <h1>Todos los datos, descargables</h1>
      <p className="datos-lead">
        Las {index.length} tablas del observatorio en CSV, listas para usar en R,
        Stata, Python o Excel. También puedes consultarlas por{' '}
        <a href="/docs" target="_blank" rel="noreferrer">API REST</a>. Si publicas
        con ellas, usa el botón Citar de cada indicador.
      </p>
      <input className="datos-search" placeholder="Filtrar tablas… (pobreza, gini, migración)"
        value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="datos-count">{total} tablas</div>

      {groups.map(([section, xs]) => (
        <div key={section} className="datos-group">
          <div className="section-label">{section}</div>
          <div className="datos-list">
            {xs.map((x) => (
              <div key={x.schema + x.table} className="datos-row">
                <button className="datos-title" onClick={() => nav(`/db/${x.schema}/${x.table}`)}>
                  {x.title}
                </button>
                <span className="datos-table">{x.table}.csv</span>
                <a className="datos-dl" href={api.downloadUrl(x.schema, x.table)}>CSV ↓</a>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
