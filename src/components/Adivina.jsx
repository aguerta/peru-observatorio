import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { api } from '../api'
import { toNum } from '../chartLogic'

// Adivina el Perú: apuesta tu intuición con un slider y mira qué tan lejos
// estás del dato oficial. La brecha percepción-realidad ES el hallazgo.
const QS = [
  { q: '¿Qué porcentaje de peruanos vive en pobreza?', min: 0, max: 80, unit: '%',
    schema: 'enaho', table: 'official_poverty_replication', col: 'poverty_pct', tcol: 'year' },
  { q: '¿Cuántos de cada 100 trabajadores son informales?', min: 0, max: 100, unit: '%',
    schema: 'enaho', table: 'informalidad_reconstruida', col: 'informal_reconstruido', tcol: 'year' },
  { q: '¿Cuánto vive al mes el hogar peruano del medio, por persona?', min: 200, max: 3000, unit: ' soles',
    schema: 'enaho', table: 'income_percentiles_tiempo', col: 'mediana', tcol: 'year' },
  { q: '¿Qué porcentaje de hogares tiene celular?', min: 0, max: 100, unit: '%',
    schema: 'enaho', table: 'vivienda_servicios_2004_2025', col: 'p1142', tcol: 'year' },
  { q: '¿Cuántos hijos tiene una mujer peruana en promedio?', min: 0, max: 6, unit: '', step: 0.1,
    schema: 'endes', table: 'endes_indicadores', col: 'tfr', tcol: 'anio' },
]

export default function Adivina() {
  const nav = useNavigate()
  const [truth, setTruth] = useState({})
  const [i, setI] = useState(0)
  const [guess, setGuess] = useState(null)
  const [shown, setShown] = useState(false)
  const [misses, setMisses] = useState([])

  useEffect(() => {
    let alive = true
    QS.forEach((s, j) => {
      api.data(s.schema, s.table, { cols: [s.tcol, s.col], order: s.tcol, desc: true, limit: 1 })
        .then((d) => {
          if (!alive) return
          const v = toNum(d.rows[0]?.[s.col])
          if (Number.isFinite(v)) setTruth((cur) => ({ ...cur, [j]: v }))
        }).catch(() => {})
    })
    return () => { alive = false }
  }, [])

  const s = QS[i]
  const real = truth[i]
  const g = guess ?? (s.min + s.max) / 2
  const pos = (v) => `${100 * (v - s.min) / (s.max - s.min)}%`
  const fmt = (v) => v >= 100 ? Math.round(v) : +v.toFixed(1)
  const done = i >= QS.length - 1 && shown
  const avgMiss = misses.length ? Math.round(misses.reduce((a, b) => a + b, 0) / misses.length) : 0

  const reveal = () => {
    setShown(true)
    if (Number.isFinite(real)) {
      setMisses((m) => [...m, Math.abs(100 * (g - real) / (s.max - s.min))])
    }
  }
  const next = () => { setI(i + 1); setGuess(null); setShown(false) }

  return (
    <div className="adivina">
      <div className="exp-crumb">JUEGO</div>
      <h1>Adivina el Perú</h1>
      <p className="gf-lead">Cinco preguntas. Mueve la barra a lo que crees, revela el dato
        oficial y mira qué tan bien conoces tu país.</p>

      <AnimatePresence mode="wait">
        <motion.div key={i} className="adv-card"
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
          <div className="adv-n">{i + 1} / {QS.length}</div>
          <h2 className="adv-q">{s.q}</h2>
          <div className="adv-track">
            <div className="adv-fill" style={{ width: pos(g) }} />
            {shown && Number.isFinite(real) && (
              <motion.div className="adv-real" initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }} style={{ left: pos(real) }}>
                <span>{fmt(real)}{s.unit}</span>
              </motion.div>
            )}
          </div>
          <input type="range" className="adv-range" min={s.min} max={s.max} step={s.step || 1}
            value={g} disabled={shown} aria-label={s.q}
            onChange={(e) => setGuess(+e.target.value)} />
          <div className="adv-row">
            <div className="adv-guess">Tu apuesta: <b>{fmt(g)}{s.unit}</b></div>
            {!shown
              ? <button className="hero-cta" style={{ margin: 0 }} onClick={reveal}>Revelar →</button>
              : !done
                ? <button className="hero-cta" style={{ margin: 0 }} onClick={next}>Siguiente →</button>
                : null}
          </div>
          {shown && Number.isFinite(real) && (
            <motion.p className="adv-verdict" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {Math.abs(g - real) / (s.max - s.min) < 0.06
                ? '🎯 Casi exacto. Conoces tu país.'
                : g > real ? `La realidad es menor: ${fmt(real)}${s.unit}. Apostaste ${fmt(g)}${s.unit}.`
                : `La realidad es mayor: ${fmt(real)}${s.unit}. Apostaste ${fmt(g)}${s.unit}.`}
              {' '}<button className="adv-link" onClick={() => nav(`/db/${s.schema}/${s.table}`)}>Ver la serie →</button>
            </motion.p>
          )}
          {done && (
            <motion.div className="adv-final" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              Desvío promedio: <b>{avgMiss}%</b> de la escala.
              {avgMiss <= 10 ? ' Nivel: economista de a pie.' : avgMiss <= 22 ? ' Nivel: lector curioso.' : ' El Perú real sorprende, ¿no?'}
              <button className="hero-cta" style={{ marginLeft: 12 }}
                onClick={() => { setI(0); setGuess(null); setShown(false); setMisses([]) }}>
                Jugar de nuevo
              </button>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
