import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { api } from '../api'
import { TOPIC_META } from '../content'
import { useLang } from '../i18n'

// Topic landing page: every chart about one QUESTION (pobreza, empleo...),
// across all five surveys, panel families already collapsed to one entry.
export default function Tema() {
  const { key } = useParams()
  const nav = useNavigate()
  const { t, topic: tt } = useLang()
  const [topics, setTopics] = useState(null)

  useEffect(() => {
    api.topics().then(setTopics).catch(() => setTopics([]))
  }, [])

  if (!topics) return <div className="skeleton sk-chart" style={{ height: 300, marginTop: 30 }} />
  const topic = topics.find((t) => t.topic_key === key)
  if (!topic) return <div className="tema"><h1>Tema no encontrado</h1></div>
  const meta = TOPIC_META[key] || {}

  return (
    <div className="tema">
      <div className="exp-crumb">TEMA</div>
      <h1>{meta.icon} {tt(key, 'label', topic.topic_label)}</h1>
      <p className="gf-lead">{tt(key, 'desc', meta.desc)}</p>
      <motion.div className="related-grid" style={{ marginTop: 18 }}
        initial="hidden" animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.03 } } }}>
        {topic.tables.map((tb) => (
          <motion.button key={tb.schema + tb.table} className="related-card"
            variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}
            whileHover={{ y: -3 }}
            onClick={() => nav(`/db/${tb.schema}/${tb.table}`)}>
            <span className="related-title">{tb.title}</span>
            <span className="related-meta">
              {tb.source.split(' - ')[0]}
              {tb.windows ? ` · ${tb.windows.length} ${t('ventanas')}` : ''}
            </span>
          </motion.button>
        ))}
      </motion.div>
    </div>
  )
}
