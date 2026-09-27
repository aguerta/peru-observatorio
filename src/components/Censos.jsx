import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import MapChart from './MapChart'

// Seccion Censos: evolucion de las condiciones de vida por provincia a traves de
// los cuatro censos, via el Indice Compuesto de Privacion (CDI). El mapa cambia
// de censo con el selector; el ramp oscuro = mayor privacion, asi el pais se
// aclara censo a censo.
const CENSOS = [
  { col: 'cdi_1981', year: '1981', mean: 63 },
  { col: 'cdi_1993', year: '1993', mean: 62 },
  { col: 'cdi_2007', year: '2007', mean: 49 },
  { col: 'cdi_2017', year: '2017', mean: 34 },
]

export default function Censos() {
  const nav = useNavigate()
  const [sel, setSel] = useState(3)
  const [cache, setCache] = useState({})
  const c = CENSOS[sel]

  useEffect(() => {
    if (cache[c.col]) return
    api.map('censos', 'censo_condiciones_vida_provincia', c.col)
      .then((d) => setCache((r) => ({ ...r, [c.col]: d.data }))).catch(() => {})
  }, [c.col, cache])

  const data = cache[c.col]
  return (
    <div className="movilidad">
      <div className="exp-crumb">CENSOS · CONDICIONES DE VIDA</div>
      <h1>El Perú mejoró, censo a censo</h1>
      <p className="gf-lead">Un índice de privación por vivienda a nivel de provincia,
        que combina cinco carencias: agua, desagüe, electricidad, piso y paredes.
        Cuanto más oscuro, mayor privación. Entre 1981 y 2017 el país pasó de una
        privación media de 63 a 34, y la mejora llegó a casi todo el territorio.</p>

      <div style={{ display: 'flex', gap: 8, margin: '18px 0 6px' }}>
        {CENSOS.map((x, i) => (
          <button key={x.year} onClick={() => setSel(i)}
            style={{
              padding: '9px 20px', borderRadius: 999, cursor: 'pointer',
              fontWeight: 700, fontSize: 16, fontFamily: 'inherit',
              border: i === sel ? '2px solid #c0562f' : '1px solid #d8ccb6',
              background: i === sel ? '#c0562f' : 'transparent',
              color: i === sel ? '#fff' : '#7a7266',
            }}>{x.year}</button>
        ))}
      </div>
      <div style={{ fontSize: 17, color: '#5f574c', margin: '4px 0 10px' }}>
        Censo {c.year} · privación media <b style={{ color: '#c0562f' }}>{c.mean}</b> de 100
      </div>

      {data
        ? <MapChart data={data} title={`Privación ${c.year}`} level="prov"
            min={10} max={90} height={640} />
        : <div className="skeleton sk-chart" style={{ height: 640 }} />}

      <p className="mov-limite">Índice compuesto de privación: promedio de cinco
        carencias por vivienda, construido con los Censos Nacionales de Población y
        Vivienda 1981, 1993, 2007 y 2017 a nivel de provincia (196 provincias). El
        censo de 1981 tiene menor cobertura provincial comparable. Fuente: INEI.
        Ver el <button className="featured-link" onClick={() => nav('/db/censos/censo_condiciones_vida_provincia')}>
        indicador completo →</button></p>
    </div>
  )
}
