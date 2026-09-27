import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { api } from '../api'
import { toNum } from '../chartLogic'

const FUENTES = [
  { sigla: 'ENAHO', doc: 'enaho', nombre: 'Encuesta Nacional de Hogares', anios: '2004–2025',
    desc: 'La encuesta de hogares del INEI, base de la medición oficial de pobreza. De aquí salen ingreso, pobreza, empleo, educación, confianza institucional, vivienda y consumo.' },
  { sigla: 'ENAHO Panel', doc: 'panel', nombre: 'Muestra longitudinal de la ENAHO', anios: '2007–2023',
    desc: 'Los mismos hogares reentrevistados hasta cinco años. Permite separar pobreza crónica de transitoria y medir movilidad de ingresos, algo invisible en el corte transversal.' },
  { sigla: 'ENDES', doc: 'endes', nombre: 'Encuesta Demográfica y de Salud Familiar', anios: '2004–2024',
    desc: 'La encuesta DHS del Perú. Fecundidad, salud materno infantil, desnutrición, anemia y anticoncepción, nacional y por departamento.' },
  { sigla: 'EPE / EPEN', doc: 'epen', nombre: 'Encuesta Permanente de Empleo (Lima y Nacional)', anios: '2001–2026',
    desc: 'El pulso mensual del mercado laboral. Serie de Lima Metropolitana en trimestre móvil desde 2001 y corte departamental desde 2022.' },
  { sigla: 'EEA', doc: 'eea', nombre: 'Encuesta Económica Anual', anios: '2023',
    desc: 'El lado de las empresas: ventas, valor agregado, productividad, concentración industrial y brechas de género por sector.' },
]

const LIMITES = [
  'La EPE (Lima, 2001–2021) y la EPEN (nacional, 2022 en adelante) son encuestas distintas. Las series de Lima se empalman y se marca el cambio de instrumento.',
  'El panel ENAHO cambia de diseño entre eras (2007–2011 y ventanas posteriores). Las tasas de cada ventana se calculan dentro de su propia muestra.',
  'La matriz de migración usa la pregunta de residencia hace cinco años (Módulo 04), disponible desde 2016. Callao se integra a Lima en mapas y flujos.',
  'Los ubigeos electorales de ONPE no coinciden con los del INEI. Aquí todo usa la codificación INEI del marco censal.',
  'Los indicadores departamentales de encuestas tienen error muestral. Los niveles de departamentos pequeños en un solo año deben leerse con cautela.',
]

export default function Metodologia() {
  const [val, setVal] = useState(null)

  useEffect(() => {
    api.data('enaho', 'official_poverty_replication',
      { cols: ['year', 'poverty_pct', 'official_poverty', 'pov_diff'], order: 'year', limit: 40 })
      .then((d) => setVal(d.rows.filter((r) => r.official_poverty != null)))
      .catch(() => {})
  }, [])

  const maxDiff = val ? Math.max(...val.map((r) => Math.abs(toNum(r.pov_diff) || 0))) : null

  return (
    <div className="metod">
      <motion.header initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}>
        <div className="exp-crumb">METODOLOGÍA</div>
        <h1>Cómo se construye este observatorio</h1>
        <p className="metod-lead">
          Todos los indicadores se calculan desde los microdatos públicos del INEI,
          con la metodología oficial, y se contrastan contra las cifras publicadas
          antes de entrar aquí. Lo que no valida, no se publica.
        </p>
      </motion.header>

      <div className="section-label">Fuentes</div>
      <div className="metod-fuentes">
        {FUENTES.map((f) => (
          <div key={f.sigla} className="fuente">
            <div className="fuente-head">
              <span className="fuente-sigla">{f.sigla}</span>
              <span className="fuente-anios">{f.anios}</span>
            </div>
            <div className="fuente-nombre">{f.nombre}</div>
            <p>{f.desc}</p>
            {f.doc && (
              <NavLink className="fuente-ficha" to={`/metodologia/${f.doc}`}>
                Ficha técnica: cómo se construye cada variable →
              </NavLink>
            )}
          </div>
        ))}
      </div>

      <div className="section-label">Método</div>
      <div className="metod-body">
        <p>
          El ingreso sigue la construcción oficial del INEI (variable <code>ipcr_0</code>):
          la suma de componentes de ingreso del hogar se deflacta por el deflactor
          espacial de precios (17 dominios, Lima = 1) y el deflactor temporal por
          departamento y año, y se divide entre los miembros del hogar. El resultado
          son soles constantes a precios de Lima, comparables entre años y regiones.
        </p>
        <p>
          Toda estimación usa los factores de expansión del INEI (peso de hogar por
          miembros para indicadores de personas). La pobreza compara el gasto contra
          las líneas oficiales por dominio. El Gini y los percentiles se calculan
          ponderados sobre el ingreso real per cápita.
        </p>
      </div>

      <div className="section-label">Validación contra el INEI</div>
      <div className="metod-body">
        <p>
          La prueba central: la tasa de pobreza replicada desde microdatos contra la
          cifra oficial publicada, año por año.
          {maxDiff != null && (
            <span className="metod-badge">
              diferencia máxima en {val.length} años: {maxDiff.toFixed(2)} pp
            </span>
          )}
        </p>
        {val && (
          <div className="val-table-wrap">
            <table className="val-table">
              <thead>
                <tr><th>Año</th><th>Réplica propia</th><th>INEI oficial</th><th>Diferencia</th></tr>
              </thead>
              <tbody>
                {val.map((r) => (
                  <tr key={r.year}>
                    <td>{r.year}</td>
                    <td>{toNum(r.poverty_pct).toFixed(1)}%</td>
                    <td>{toNum(r.official_poverty).toFixed(1)}%</td>
                    <td className={Math.abs(toNum(r.pov_diff)) < 0.05 ? 'ok' : ''}>
                      {toNum(r.pov_diff).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="metod-note">
          El mismo criterio se aplica al resto: fecundidad y desnutrición contra los
          informes ENDES, desempleo de Lima contra los informes de empleo, Gini
          contra la serie oficial. Un indicador que no reproduce la cifra publicada
          se corrige o se excluye.{' '}
          <NavLink className="fuente-ficha" to="/metodologia/validacion">
            Ver la bitácora completa de validación →
          </NavLink>
        </p>
      </div>

      <div className="section-label">Comparabilidad y límites</div>
      <ul className="metod-limites">
        {LIMITES.map((l, i) => <li key={i}>{l}</li>)}
      </ul>

      <div className="section-label">Código y API</div>
      <div className="metod-body">
        <p>
          Todo es reproducible. El código de la aplicación, el catálogo de tablas y
          los agregados están en{' '}
          <a href="https://github.com/cesarchavezp29/peru-observatorio" target="_blank" rel="noreferrer">
            GitHub</a>. Cada tabla se puede descargar como CSV desde su página, y la{' '}
          <a href="/docs" target="_blank" rel="noreferrer">API REST está documentada</a>{' '}
          para consultar los datos por programa. Cada gráfico se puede incrustar en
          otra web con el botón «Insertar» (o añadiendo <code>?embed=1</code> a su URL)
          y descargar como imagen con «PNG».
        </p>
        <p>
          ¿Quieres los microdatos crudos? Publicamos{' '}
          <a href="https://github.com/cesarchavezp29/perudata" target="_blank" rel="noreferrer">
            perudata</a>, un paquete de Python que descarga y abre las cinco encuestas
          del INEI (ENAHO, ENAHO Panel, ENDES, EPE/EPEN, EEA) con una sola línea
          (<code>enaho.load(2024, "34")</code>) y reproduce la pobreza oficial 2004-2025
          a 0.0 puntos como prueba de integridad.
        </p>
      </div>
    </div>
  )
}
