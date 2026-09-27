import { motion } from 'framer-motion'
import { SECTION_HERO } from '../content'
import Kpi from './Kpi'
import StatTile from './StatTile'
import FeaturedChart from './FeaturedChart'

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }
const rise = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 0.61, 0.36, 1] } },
}

export default function SectionHero({ schema }) {
  const cfg = SECTION_HERO[schema]
  if (!cfg) return null
  return (
    <div className="section-hero">
      {(cfg.kpis || cfg.stats) && (
        <motion.div className="kpi-grid" variants={stagger} initial="hidden" animate="show">
          {cfg.kpis?.map((k) => (
            <Kpi key={k.table + k.col} schema={schema} {...k} variants={rise} />
          ))}
          {cfg.stats?.map((k) => (
            <StatTile key={k.table + k.col} schema={schema} {...k} variants={rise} />
          ))}
        </motion.div>
      )}
      {cfg.note && <p className="section-note">{cfg.note}</p>}
      {cfg.featured && <FeaturedChart schema={schema} {...cfg.featured} />}
    </div>
  )
}
