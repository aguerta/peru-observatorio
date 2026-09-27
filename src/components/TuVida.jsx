import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { api } from '../api'
import MiniSpark from './MiniSpark'
import { toNum } from '../chartLogic'

// El Perú de tu vida: periodismo personalizado. El lector pone su año de
// nacimiento y cada indicador se narra contra SU biografía (los datos ENAHO
// empiezan en 2004, así que anclamos en el primer año en que "te vimos").
const SERIES = [
  { key: 'pobreza', schema: 'enaho', table: 'official_poverty_replication', col: 'poverty_pct', tcol: 'year',
    unit: '%', color: '#c85a34', better: 'down', label: 'Pobreza',
    phrase: (a, b, age) => `Cuando tenías ${age} años, ${a}% de los peruanos era pobre. Hoy es ${b}%.` },
  { key: 'mediana', schema: 'enaho', table: 'income_percentiles_tiempo', col: 'mediana', tcol: 'year',
    unit: '', prefix: 'S/ ', color: '#157a6e', better: 'up', label: 'Ingreso del hogar del medio',
    phrase: (a, b, age) => `El hogar típico vivía con S/ ${a} por persona al mes (en soles de hoy). Ahora vive con S/ ${b}.` },
  { key: 'celular', schema: 'enaho', table: 'vivienda_servicios_2004_2025', col: 'p1142', tcol: 'year',
    unit: '%', color: '#3f5aa6', better: 'up', label: 'Hogares con celular',
    phrase: (a, b, age) => `Solo ${a} de cada 100 hogares tenía celular. Hoy son ${b}.` },
  { key: 'desnutricion', schema: 'endes', table: 'endes_indicadores', col: 'desnutricion', tcol: 'anio',
    unit: '%', color: '#9c6b2f', better: 'down', label: 'Desnutrición infantil',
    phrase: (a, b, age) => `${a}% de los niños tenía desnutrición crónica. Hoy es ${b}%.` },
  { key: 'tfr', schema: 'endes', table: 'endes_indicadores', col: 'tfr', tcol: 'anio',
    unit: '', color: '#8a4a6b', better: null, label: 'Hijos por mujer',
    phrase: (a, b, age) => `Una mujer tenía en promedio ${a} hijos. Hoy tiene ${b}.` },
  { key: 'educ', schema: 'endes', table: 'endes_indicadores', col: 'educ_anios', tcol: 'anio',
    unit: '', color: '#157a6e', better: 'up', label: 'Años de educación',
    phrase: (a, b, age) => `Los adultos tenían ${a} años de estudios en promedio. Hoy tienen ${b}.` },
]

const fmt = (v) => v >= 100 ? Math.round(v).toLocaleString('es-PE') : +v.toFixed(1)

export default function TuVida() {
  const nav = useNavigate()
  const [birth, setBirth] = useState(1990)
  const [go, setGo] = useState(false)
  const [data, setData] = useState({})

  useEffect(() => {
    let alive = true
    SERIES.forEach((s) => {
      api.data(s.schema, s.table, { cols: [s.tcol, s.col], order: s.tcol, limit: 100 })
        .then((d) => {
          if (!alive) return
          const rows = d.rows.map((r) => [Number(r[s.tcol]), toNum(r[s.col])])
            .filter((r) => Number.isFinite(r[0]) && Number.isFinite(r[1]))
          setData((cur) => ({ ...cur, [s.key]: rows }))
        }).catch(() => {})
    })
    return () => { alive = false }
  }, [])

  const cards = useMemo(() => {
    if (!go) return null
    return SERIES.map((s) => {
      const rows = data[s.key]
      if (!rows?.length) return null
      const anchor = rows.find((r) => r[0] >= birth) || rows[0]
      const last = rows[rows.length - 1]
      if (anchor[0] >= last[0]) return null
      const age = Math.max(0, anchor[0] - birth)
      const delta = last[1] - anchor[1]
      const good = s.better == null ? null : (s.better === 'down' ? delta < 0 : delta > 0)
      return {
        ...s, rows,
        text: s.phrase(fmt(anchor[1]), fmt(last[1]), age),
        anchorYear: anchor[0], lastYear: last[0], good,
        pct: Math.abs(100 * delta / anchor[1]).toFixed(0),
        dir: delta < 0 ? 'cayó' : 'subió',
      }
    }).filter(Boolean)
  }, [go, birth, data])

  const age = new Date().getFullYear() - birth

  return (
    <div className="tuvida">
      <div className="exp-crumb">TU HISTORIA</div>
      <h1>El Perú de tu vida</h1>
      <p className="gf-lead">Dinos cuándo naciste y te contamos cómo cambió el país
        mientras crecías, con los datos oficiales de cada año.</p>

      <div className="tv-input">
        <label htmlFor="tv-year">Nací en</label>
        <input id="tv-year" type="number" min="1940" max="2015" value={birth}
          onChange={(e) => { setBirth(+e.target.value); setGo(false) }} />
        <button className="hero-cta" style={{ margin: 0 }}
          onClick={() => setGo(true)} disabled={birth < 1940 || birth > 2015}>
          Cuéntame →
        </button>
      </div>

      <AnimatePresence>
        {cards && (
          <motion.div key={birth} className="tv-grid" initial="hidden" animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.12 } } }}>
            <motion.p className="tv-intro"
              variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}>
              Tienes {age} años. {birth < 2004
                ? `Los datos nacionales empiezan en 2004, cuando tenías ${2004 - birth}: desde ahí te contamos.`
                : 'Naciste dentro de la era de los datos: te contamos desde tu año.'}
            </motion.p>
            {cards.map((c) => (
              <motion.button key={c.key} className="tv-card"
                variants={{ hidden: { opacity: 0, y: 22 }, show: { opacity: 1, y: 0 } }}
                whileHover={{ y: -4 }}
                onClick={() => nav(`/db/${c.schema}/${c.table}`)}>
                <div className="tv-label" style={{ color: c.color }}>{c.label}</div>
                <p className="tv-text">{c.text}</p>
                <MiniSpark values={c.rows.map((r) => r[1])} color={c.color} height={44} />
                <div className="tv-meta">
                  {c.anchorYear} → {c.lastYear}
                  <span className={c.good == null ? '' : c.good ? 'tv-good' : 'tv-bad'}>
                    {' '}· {c.dir} {c.pct}%
                  </span>
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
