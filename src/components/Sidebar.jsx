import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { api } from '../api'
import { TOPIC_META } from '../content'
import { useLang } from '../i18n'

// One collapsible TOPIC (cross-survey): how readers think — pobreza, empleo,
// salud — regardless of which INEI survey produced each table. Panel window
// families arrive already collapsed to their newest window.
function TopicGroup({ topic, onNavigate }) {
  const { t, topic: tt } = useLang()
  const location = useLocation()
  const holdsActive = topic.tables.some((tb) =>
    location.pathname === `/db/${tb.schema}/${tb.table}`
    || (tb.windows || []).some((w) => location.pathname === `/db/${tb.schema}/${w.table}`))
  const [open, setOpen] = useState(false)
  useEffect(() => { if (holdsActive) setOpen(true) }, [holdsActive])
  const meta = TOPIC_META[topic.topic_key] || {}

  return (
    <div className="nav-group">
      <button className="nav-db" onClick={() => setOpen((o) => !o)}>
        <span className="nav-topic-ico">{meta.icon || '◆'}</span>
        <span className="nav-db-title">{tt(topic.topic_key, 'label', topic.topic_label)}</span>
        <span className="nav-count">{topic.tables.length}</span>
        <span className={`nav-caret ${open ? 'up' : ''}`}>▾</span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div className="nav-themes"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 0.61, 0.36, 1] }}>
            {topic.tables.map((tb) => (
              <NavLink key={tb.schema + tb.table} onClick={onNavigate}
                to={`/db/${tb.schema}/${tb.table}`}
                className={({ isActive }) => 'nav-table' + (isActive ? ' active' : '')}
                title={tb.title}>
                {tb.title}
                {tb.windows && <span className="nav-windows-n">{tb.windows.length} {t('ventanas')}</span>}
              </NavLink>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Tool({ to, ico, label, onNavigate }) {
  return (
    <NavLink to={to} onClick={onNavigate}
      className={({ isActive }) => 'nav-tool' + (isActive ? ' active' : '')}>
      <span className="nav-tool-ico">{ico}</span> {label}
    </NavLink>
  )
}

export default function Sidebar({ databases, open, onNavigate }) {
  const { t } = useLang()
  const [topics, setTopics] = useState([])
  useEffect(() => {
    api.topics().then(setTopics).catch(() => setTopics([]))
  }, [])

  return (
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <div className="sidebar-inner">
        <NavLink to="/" onClick={onNavigate} className="nav-home" end>{t('home')}</NavLink>

        <div className="nav-section-label">{t('sec_descubre')}</div>
        <Tool to="/preguntas" ico="★" label={t('preguntas')} onNavigate={onNavigate} />
        <Tool to="/tuvida" ico="☉" label={t('tuvida')} onNavigate={onNavigate} />
        <Tool to="/adivina" ico="?" label={t('adivina')} onNavigate={onNavigate} />
        <Tool to="/dibuja" ico="✏" label={t('dibuja')} onNavigate={onNavigate} />

        <div className="nav-section-label">{t('sec_historias')}</div>
        <Tool to="/historia" ico="▸" label={t('hist_pobreza')} onNavigate={onNavigate} />
        <Tool to="/desigualdad" ico="▸" label={t('hist_desigualdad')} onNavigate={onNavigate} />
        <Tool to="/quienvoto" ico="▸" label={t('hist_voto')} onNavigate={onNavigate} />
        <Tool to="/movilidad" ico="▸" label={t('movilidad')} onNavigate={onNavigate} />
        <Tool to="/agenda" ico="▸" label={t('agenda')} onNavigate={onNavigate} />
        <Tool to="/censos" ico="▸" label={t('censos_seccion')} onNavigate={onNavigate} />

        <div className="nav-section-label">{t('sec_herramientas')}</div>
        <Tool to="/graficos" ico="∿" label={t('graficos')} onNavigate={onNavigate} />
        <Tool to="/dpto/15" ico="▣" label={t('ficha')} onNavigate={onNavigate} />
        <Tool to="/distrito" ico="⌂" label={t('midistrito')} onNavigate={onNavigate} />
        <Tool to="/dosperus" ico="⚖" label={t('dosperus')} onNavigate={onNavigate} />
        <Tool to="/comparar" ico="⇄" label={t('comparar')} onNavigate={onNavigate} />
        <Tool to="/correlacion" ico="✦" label={t('correlaciones')} onNavigate={onNavigate} />

        <div className="nav-sep" />
        <div className="nav-section-label">{t('temas')}</div>
        {topics.map((tp) => (
          <TopicGroup key={tp.topic_key} topic={tp} onNavigate={onNavigate} />
        ))}

        <div className="nav-sep" />
        <div className="nav-section-label">{t('fuentes')}</div>
        {databases.map((db) => (
          <NavLink key={db.schema} to={`/db/${db.schema}`} onClick={onNavigate}
            className={({ isActive }) => 'nav-source' + (isActive ? ' active' : '')}>
            <span className="nav-dot" style={{ background: db.color }} />
            <span className="nav-source-title">{db.source.split(' - ')[0]}</span>
            <span className="nav-count">{db.n_tables}</span>
          </NavLink>
        ))}

        <div className="nav-sep" />
        <Tool to="/ensayos" ico="✎" label={t('ensayos')} onNavigate={onNavigate} />
        <Tool to="/metodologia" ico="✓" label={t('metodologia')} onNavigate={onNavigate} />
        <Tool to="/datos" ico="↓" label={t('datos')} onNavigate={onNavigate} />
      </div>
    </aside>
  )
}
