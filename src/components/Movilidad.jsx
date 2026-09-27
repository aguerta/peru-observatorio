import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { api } from '../api'
import StoryChart from './StoryChart'

// Movilidad intergeneracional: el modulo-foso. Tres paneles deliberadamente
// descriptivos (regla de la casa: asociaciones declaradas, cero causalidad).
const NIVELES = ['primaria', 'secundaria', 'superior']
const COLORES = { primaria: '#c85a34', secundaria: '#d99a2b', superior: '#157a6e' }
const LBL = { primaria: 'Primaria o menos', secundaria: 'Secundaria', superior: 'Superior' }

function Matriz() {
  const [rows, setRows] = useState(null)
  useEffect(() => {
    api.data('enaho', 'movilidad_matriz_educacion', { limit: 50 })
      .then((d) => setRows(d.rows)).catch(() => setRows([]))
  }, [])
  if (!rows) return <div className="skeleton sk-chart" style={{ height: 260 }} />
  const epocas = ['2004-2011', '2018-2025']
  return (
    <div className="mov-matrices">
      {epocas.map((ep) => (
        <div key={ep} className="mov-matriz">
          <div className="mov-ep">{ep}</div>
          {NIVELES.map((org) => {
            const fila = NIVELES.map((dst) =>
              rows.find((r) => r.epoca === ep && r.origen === org && r.destino === dst)?.pct ?? 0)
            return (
              <div key={org} className="mov-fila">
                <span className="mov-org">Jefe con {LBL[org].toLowerCase()}</span>
                <div className="mov-barras">
                  {NIVELES.map((dst, j) => (
                    <motion.div key={dst} className="mov-seg"
                      style={{ background: COLORES[dst] }}
                      initial={{ width: 0 }}
                      whileInView={{ width: `${fila[j]}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.7, delay: j * 0.08 }}>
                      {fila[j] >= 12 && <span>{Math.round(fila[j])}%</span>}
                    </motion.div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ))}
      <div className="mov-leyenda">
        {NIVELES.map((n) => (
          <span key={n}><i style={{ background: COLORES[n] }} /> hijo llega a {LBL[n].toLowerCase()}</span>
        ))}
      </div>
    </div>
  )
}

export default function Movilidad() {
  const nav = useNavigate()
  return (
    <div className="movilidad">
      <div className="exp-crumb">INVESTIGACIÓN · MOVILIDAD</div>
      <h1>¿Se hereda la educación en el Perú?</h1>
      <p className="gf-lead">Tres paneles descriptivos sobre la transmisión educativa entre
        generaciones, desde los microdatos ENAHO 2004-2025. Nadie más publica esto
        interactivo en el Perú.</p>

      <div className="section-label">Panel A · La matriz: de dónde partes, a dónde llegas</div>
      <p className="mov-texto">Hijos e hijas de 22 a 30 años que aún viven con el jefe del
        hogar: qué nivel educativo alcanzaron según el nivel del jefe. La lectura central
        es doble. La movilidad ascendente creció — el hijo de un hogar con primaria llega
        a educación superior 45% de las veces, cuando una generación antes era 31%. Y la
        ventaja de origen persiste — arriba, 88 de cada 100 se quedan arriba.</p>
      <Matriz />
      <p className="mov-limite">Límite estructural declarado: la ENAHO no registra a los
        padres de quienes ya dejaron el hogar, así que la matriz describe a los
        corresidentes — los jóvenes que se independizaron no aparecen. Es una asociación
        entre origen y destino educativo, no un efecto causal del hogar.</p>

      <div className="section-label">Panel B · El gradiente de acceso, año a año</div>
      <StoryChart kicker="ACCESO 17-21" title="La asistencia depende del hogar de origen"
        kind="line" schema="enaho" table="movilidad_educativa_tiempo" series="gap" x="year"
        cta="Explora el gradiente completo →"
        lede="Diferencia en puntos porcentuales de asistencia educativa entre jóvenes de 17-21 según la educación del jefe del hogar (superior vs primaria). La brecha se angostó con la masificación y no ha desaparecido." />

      <div className="section-label">Panel C · Cada generación estudió más</div>
      <StoryChart kicker="COHORTES" title="Un siglo de escolarización, cohorte a cohorte"
        kind="line" reverse schema="enaho" table="educacion_cohorte_2025" series="educ_anios" x="cohorte"
        cta="Explora por cohorte →"
        lede="Años de educación promedio por cohorte de nacimiento, medidos en 2025. La escalera sube sostenida desde las cohortes de 1940 — el telón de fondo que hace posible la movilidad del Panel A." />

      <p className="mov-limite">Fuente: ENAHO módulos 02 y 03, ponderado por factor07,
        niveles p301a verificados. Producido por
        pipeline/build_movilidad_matriz.py — código público, números reproducibles.</p>
    </div>
  )
}
