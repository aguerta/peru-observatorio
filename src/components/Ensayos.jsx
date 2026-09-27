import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ESSAYS } from '../essays'
import CountUp from './CountUp'

function Essay({ e, i }) {
  const nav = useNavigate()
  return (
    <motion.article className="essay" style={{ '--accent': e.accent }}
      initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, ease: [0.22, 0.61, 0.36, 1] }}>
      <div className="essay-num">{String(i + 1).padStart(2, '0')}</div>
      <div className="essay-main">
        <div className="essay-kicker">{e.kicker}</div>
        <h2 className="essay-q">{e.question}</h2>
        <div className="essay-stat">
          {e.stat.from !== 0 && <span className="essay-from">{e.stat.from.toFixed(e.stat.decimals)} →</span>}
          <span className="essay-to">
            <CountUp to={e.stat.to} decimals={e.stat.decimals} suffix={e.stat.suffix || ''} />
          </span>
          <span className="essay-stat-label">{e.stat.label}</span>
        </div>
        <div className="essay-body">
          {e.body.map((p, k) => <p key={k}>{p}</p>)}
        </div>
        <button className="essay-link" onClick={() => nav(`/db/${e.link.schema}/${e.link.table}`)}>
          Explora el dato →
        </button>
      </div>
    </motion.article>
  )
}

export default function Ensayos() {
  return (
    <div className="ensayos">
      <header className="ensayos-head">
        <div className="exp-crumb">LECTURAS</div>
        <h1>Ensayos breves</h1>
        <p>Seis preguntas sobre el Perú, respondidas con las cifras de este
          observatorio. Cada número sale de una tabla validada contra la
          estadística oficial. El gráfico está a un clic.</p>
        <p className="ensayos-etica">Regla de la casa: estos datos son
          observacionales. Cuando una cifra es una asociación y no un efecto
          causal, el texto lo dice — preferimos una correlación honesta a una
          causa inventada.</p>
      </header>
      <div className="essay-list">
        {ESSAYS.map((e, i) => <Essay key={e.slug} e={e} i={i} />)}
      </div>
    </div>
  )
}
