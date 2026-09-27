import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { api } from '../api'
import MiniSpark from './MiniSpark'
import { toNum } from '../chartLogic'

// El Perú en preguntas: the front door for someone who knows nothing about
// statistics. Each card asks a plain question, shows THE live number, one
// sentence of meaning, and links to the full chart. Numbers come from the
// same validated tables as everywhere else.
const QS = [
  { q: '¿Cuántos peruanos son pobres?', schema: 'enaho', table: 'official_poverty_replication',
    col: 'poverty_pct', tcol: 'year', unit: '%', color: '#c85a34',
    a: 'Uno de cada cuatro vive en pobreza monetaria. En 2004 eran seis de cada diez.' },
  { q: '¿Cuánto gana una familia típica?', schema: 'enaho', table: 'income_percentiles_tiempo',
    col: 'mediana', tcol: 'year', unit: '', prefix: 'S/ ', color: '#157a6e',
    a: 'Por persona al mes, en el hogar del medio exacto del país (soles de 2025).' },
  { q: '¿Qué tan desigual es el país?', schema: 'enaho', table: 'income_percentiles_tiempo',
    col: 'ratio_p90_p10', tcol: 'year', unit: '×', color: '#8a4a6b',
    a: 'Un hogar de los de arriba (percentil 90) vive con 6 veces lo del percentil 10. En 2004 eran 10 veces.' },
  { q: '¿Cuánta gente trabaja en la informalidad?', schema: 'enaho', table: 'informalidad_reconstruida',
    col: 'informal_reconstruido', tcol: 'year', unit: '%', color: '#9c6b2f',
    a: 'Siete de cada diez trabajadores no tienen contrato ni aporte a pensión.' },
  { q: '¿Hay trabajo en Lima?', schema: 'epen', table: 'epen_lima_movil_2001_2026',
    col: 'tasa_desempleo', tcol: 'ym', unit: '%', color: '#3f5aa6',
    a: 'De desempleo en Lima (trimestre móvil). En la pandemia llegó a 16.5%.' },
  { q: '¿Cuántos hijos tiene una mujer?', schema: 'endes', table: 'endes_indicadores',
    col: 'tfr', tcol: 'anio', unit: '', color: '#157a6e',
    a: 'Hijos por mujer, ya por debajo del nivel de reemplazo (2.1). En 2004 eran 2.5.' },
  { q: '¿Los niños crecen sanos?', schema: 'endes', table: 'endes_indicadores',
    col: 'desnutricion', tcol: 'anio', unit: '%', color: '#c85a34',
    a: 'De desnutrición crónica infantil. Hace dos décadas era 29%: uno de los grandes logros del país.' },
  { q: '¿Quién tiene seguro de salud?', schema: 'enaho', table: 'seguro_salud_2004_2025',
    col: 'Algun seguro de salud', tcol: 'year', unit: '%', color: '#157a6e',
    a: 'De los peruanos tiene algún seguro de salud, sobre todo por la expansión del SIS.' },
  { q: '¿Todos tienen celular?', schema: 'enaho', table: 'vivienda_servicios_2004_2025',
    col: 'p1142', tcol: 'year', unit: '%', color: '#3f5aa6',
    a: 'De los hogares tiene teléfono celular. En 2004 era 16%: la transformación más rápida del hogar peruano.' },
  { q: '¿Cómo estamos frente a los vecinos?', schema: 'enaho', table: 'paises_pobreza685_wdi',
    col: 'Peru', tcol: 'year', unit: '%', color: '#9c6b2f',
    a: 'De pobreza con la vara comparable del Banco Mundial ($6.85/día). Chile tiene 4.5%, Argentina 15%.' },
]

function Card({ item, onGo }) {
  const [serie, setSerie] = useState(null)
  useEffect(() => {
    let alive = true
    api.data(item.schema, item.table, { cols: [item.tcol, item.col], order: item.tcol, limit: 4000 })
      .then((d) => {
        if (!alive) return
        setSerie(d.rows.map((r) => toNum(r[item.col])).filter(Number.isFinite))
      }).catch(() => {})
    return () => { alive = false }
  }, [item])
  const last = serie?.length ? serie[serie.length - 1] : null
  return (
    <motion.button className="preg-card" onClick={onGo}
      variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
      whileHover={{ y: -4 }}>
      <div className="preg-q">{item.q}</div>
      <div className="preg-v" style={{ color: item.color }}>
        {last == null ? '…' : `${item.prefix || ''}${last >= 100 ? Math.round(last).toLocaleString('es-PE') : last.toFixed(1).replace(/\.0$/, '')}${item.unit}`}
      </div>
      {serie && <MiniSpark values={serie} color={item.color} height={38} />}
      <p className="preg-a">{item.a}</p>
      <span className="preg-go">Ver el gráfico →</span>
    </motion.button>
  )
}

export default function Preguntas() {
  const nav = useNavigate()
  return (
    <div className="preguntas">
      <div className="exp-crumb">EMPIEZA AQUÍ</div>
      <h1>El Perú en diez preguntas</h1>
      <p className="gf-lead">Las respuestas directas, con el último dato oficial y su historia
        detrás. Toca cualquier tarjeta para explorar el gráfico completo.</p>
      <motion.div className="preg-grid" initial="hidden" animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}>
        {QS.map((item) => (
          <Card key={item.q} item={item} onGo={() => nav(`/db/${item.schema}/${item.table}`)} />
        ))}
      </motion.div>
    </div>
  )
}
