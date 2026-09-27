import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { api } from '../api'
import { toNum } from '../chartLogic'

// Dibuja la línea (you-draw-it): te damos la pobreza hasta 2015, dibujas con
// el dedo o el mouse lo que crees que pasó de 2016 a 2025, y la realidad se
// dibuja encima de tu trazo. La brecha entre ambas es la nota.
const W = 640, H = 360, PAD = { l: 44, r: 18, t: 18, b: 30 }
const SPLIT = 2015, YMAX = 65

export default function Dibuja() {
  const nav = useNavigate()
  const svgRef = useRef(null)
  const [rows, setRows] = useState(null)
  const [guess, setGuess] = useState({})       // year -> pct
  const [revealed, setRevealed] = useState(false)
  const drawing = useRef(false)

  useEffect(() => {
    api.data('enaho', 'official_poverty_replication',
      { cols: ['year', 'poverty_pct'], order: 'year', limit: 30 })
      .then((d) => setRows(d.rows.map((r) => [Number(r.year), toNum(r.poverty_pct)])
        .filter((r) => Number.isFinite(r[1]))))
      .catch(() => setRows([]))
  }, [])

  const years = useMemo(() => rows ? rows.map((r) => r[0]) : [], [rows])
  const drawYears = useMemo(() => years.filter((y) => y > SPLIT), [years])
  const x = (yr) => PAD.l + (W - PAD.l - PAD.r) * (yr - years[0]) / (years[years.length - 1] - years[0])
  const y = (v) => PAD.t + (H - PAD.t - PAD.b) * (1 - v / YMAX)
  const yInv = (py) => Math.max(0, Math.min(YMAX, YMAX * (1 - (py - PAD.t) / (H - PAD.t - PAD.b))))

  const known = useMemo(() => rows ? rows.filter((r) => r[0] <= SPLIT) : [], [rows])
  const complete = drawYears.length > 0 && drawYears.every((yr) => guess[yr] != null)

  const onPointer = (e) => {
    if (revealed || !rows || (e.type === 'pointermove' && !drawing.current)) return
    if (e.type === 'pointerdown') { drawing.current = true; e.target.setPointerCapture?.(e.pointerId) }
    const rect = svgRef.current.getBoundingClientRect()
    const px = (e.clientX - rect.left) * (W / rect.width)
    const py = (e.clientY - rect.top) * (H / rect.height)
    // snap to nearest drawable year column
    let best = null, bd = 1e9
    for (const yr of drawYears) {
      const d = Math.abs(x(yr) - px)
      if (d < bd) { bd = d; best = yr }
    }
    if (best != null && bd < 40) setGuess((g) => ({ ...g, [best]: +yInv(py).toFixed(1) }))
  }

  const path = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'}${x(p[0])},${y(p[1])}`).join(' ')
  const guessPts = drawYears.filter((yr) => guess[yr] != null).map((yr) => [yr, guess[yr]])
  const realTail = rows ? rows.filter((r) => r[0] >= SPLIT) : []
  const score = useMemo(() => {
    if (!revealed || !rows) return null
    const errs = drawYears.map((yr) => {
      const real = rows.find((r) => r[0] === yr)?.[1]
      return real != null && guess[yr] != null ? Math.abs(guess[yr] - real) : null
    }).filter((e) => e != null)
    return errs.length ? (errs.reduce((a, b) => a + b, 0) / errs.length).toFixed(1) : null
  }, [revealed, rows, guess])

  if (!rows) return <div className="skeleton sk-chart" style={{ height: 320, marginTop: 30 }} />

  return (
    <div className="dibuja">
      <div className="exp-crumb">JUEGO</div>
      <h1>Dibuja la línea</h1>
      <p className="gf-lead">Esta es la pobreza del Perú hasta 2015. Dibuja sobre el
        gráfico lo que crees que pasó de 2016 a 2025 y luego revela la realidad.</p>

      <div className="dib-wrap">
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="dib-svg"
          onPointerDown={onPointer} onPointerMove={onPointer}
          onPointerUp={() => { drawing.current = false }}
          role="application" aria-label="Dibuja tu estimación de pobreza 2016-2025">
          {[0, 20, 40, 60].map((v) => (
            <g key={v}>
              <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} stroke="#ece1cd" />
              <text x={PAD.l - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="#8a7c68">{v}%</text>
            </g>
          ))}
          {years.filter((yr) => yr % 5 === 0).map((yr) => (
            <text key={yr} x={x(yr)} y={H - 8} textAnchor="middle" fontSize="11" fill="#8a7c68">{yr}</text>
          ))}
          <rect x={x(SPLIT)} y={PAD.t} width={W - PAD.r - x(SPLIT)} height={H - PAD.t - PAD.b}
            fill="#faf1de" opacity={revealed ? 0 : 0.7} />
          <path d={path(known)} fill="none" stroke="#c85a34" strokeWidth="3.5" strokeLinecap="round" />
          {guessPts.length > 0 && (
            <path d={path([[SPLIT, known[known.length - 1][1]], ...guessPts])} fill="none"
              stroke="#3f5aa6" strokeWidth="3" strokeDasharray="7 6" strokeLinecap="round" />
          )}
          {guessPts.map((p) => (
            <circle key={p[0]} cx={x(p[0])} cy={y(p[1])} r="5" fill="#3f5aa6" />
          ))}
          {revealed && (
            <motion.path d={path(realTail)} fill="none" stroke="#c85a34" strokeWidth="3.5"
              strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
              transition={{ duration: 1.6, ease: 'easeOut' }} />
          )}
          {!complete && !revealed && (
            <text x={x(2020)} y={y(50)} textAnchor="middle" fontSize="14" fontWeight="700" fill="#8a7c68">
              ✏️ dibuja aquí
            </text>
          )}
        </svg>
      </div>

      <div className="dib-row">
        {!revealed
          ? <button className="hero-cta" style={{ margin: 0 }} disabled={!complete}
              onClick={() => setRevealed(true)}>
              {complete ? 'Revelar la realidad →' : `Marca los ${drawYears.length} años (llevas ${guessPts.length})`}
            </button>
          : <>
              <div className="dib-score">
                Te desviaste <b>{score} puntos</b> en promedio.
                {+score <= 2 ? ' Impresionante: casi calcas la historia.'
                  : +score <= 5 ? ' Nada mal — pero ¿viste venir el salto del COVID en 2020?'
                  : ' La historia real sorprende: el COVID borró una década en un año.'}
              </div>
              <button className="hero-cta" style={{ margin: 0 }}
                onClick={() => { setGuess({}); setRevealed(false) }}>Otra vez</button>
              <button className="adv-link" onClick={() => nav('/historia')}>Lee la historia completa →</button>
            </>}
      </div>
    </div>
  )
}
