import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { api } from '../api'
import CountUp from './CountUp'
import { toNum } from '../chartLogic'

// La cifra del día: cada día el Home destaca un dato distinto, elegido de
// forma determinística por la fecha (mismo día = misma cifra para todos).
const POOL = [
  { schema: 'enaho', table: 'official_poverty_replication', col: 'poverty_pct', tcol: 'year', unit: '%',
    phrase: 'de los peruanos vive en pobreza monetaria' },
  { schema: 'enaho', table: 'income_percentiles_tiempo', col: 'mediana', tcol: 'year', unit: '', prefix: 'S/ ',
    phrase: 'vive al mes, por persona, el hogar peruano del medio' },
  { schema: 'enaho', table: 'informalidad_reconstruida', col: 'informal_reconstruido', tcol: 'year', unit: '%',
    phrase: 'de los trabajadores no tiene contrato ni aporte a pensión' },
  { schema: 'endes', table: 'endes_indicadores', col: 'tfr', tcol: 'anio', unit: '',
    phrase: 'hijos por mujer: el Perú ya está debajo del reemplazo (2.1)' },
  { schema: 'endes', table: 'endes_indicadores', col: 'desnutricion', tcol: 'anio', unit: '%',
    phrase: 'de los niños tiene desnutrición crónica (era 29% en 2004)' },
  { schema: 'enaho', table: 'vivienda_servicios_2004_2025', col: 'p1142', tcol: 'year', unit: '%',
    phrase: 'de los hogares tiene celular (era 16% en 2004)' },
  { schema: 'enaho', table: 'seguro_salud_2004_2025', col: 'Algun seguro de salud', tcol: 'year', unit: '%',
    phrase: 'de los peruanos tiene algún seguro de salud' },
  { schema: 'enaho', table: 'income_percentiles_tiempo', col: 'ratio_p90_p10', tcol: 'year', unit: '×',
    phrase: 'más ingreso tiene el hogar del percentil 90 que el del percentil 10' },
  { schema: 'epen', table: 'epen_lima_movil_2001_2026', col: 'tasa_desempleo', tcol: 'ym', unit: '%',
    phrase: 'de desempleo en Lima en el último trimestre móvil' },
]

export default function CifraDelDia() {
  const nav = useNavigate()
  const [val, setVal] = useState(null)
  const day = Math.floor(Date.now() / 86400000)
  const item = POOL[day % POOL.length]

  useEffect(() => {
    let alive = true
    api.data(item.schema, item.table, { cols: [item.tcol, item.col], order: item.tcol, desc: true, limit: 1 })
      .then((d) => { if (alive) setVal(toNum(d.rows[0]?.[item.col])) })
      .catch(() => {})
    return () => { alive = false }
  }, [])

  if (val == null || !Number.isFinite(val)) return null
  return (
    <motion.button className="cifra-dia" onClick={() => nav(`/db/${item.schema}/${item.table}`)}
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
      <span className="cifra-tag">LA CIFRA DE HOY</span>
      <span className="cifra-num">
        {item.prefix || ''}<CountUp to={val} decimals={val < 20 ? 1 : 0} />{item.unit}
      </span>
      <span className="cifra-phrase">{item.phrase}</span>
      <span className="cifra-go">→</span>
    </motion.button>
  )
}
