import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { api } from '../api'
import { labelFor } from '../chartLogic'

// Chart-type browser: pick HOW you want to see, get WHAT you can see it with.
// Curated: flagship picks first, then everything grouped by theme (collapsed).

const G = (d) => (
  <svg viewBox="0 0 40 26" width="40" height="26" fill="none" stroke="currentColor"
    strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
)
const KINDS = [
  { k: 'lineas', name: 'Líneas', code: 'line', desc: 'Evolución en el tiempo',
    glyph: G(<path d="M2 22 L12 12 L20 16 L38 3" />) },
  { k: 'apilado', name: 'Apilado', code: 'stacked', desc: 'Composición que cambia',
    glyph: G(<><path d="M2 24 L14 16 L26 19 L38 10 V24 H2 Z" fill="currentColor" opacity=".35" stroke="none" /><path d="M2 16 L14 8 L26 12 L38 2" /></>) },
  { k: 'barras', name: 'Barras', code: 'bar', desc: 'Comparar categorías',
    glyph: G(<><path d="M4 24 V14" /><path d="M13 24 V6" /><path d="M22 24 V10" /><path d="M31 24 V17" /><path d="M38 24 V3" /></>) },
  { k: 'mapa', name: 'Mapas', code: 'map', desc: 'Geografía departamental',
    glyph: G(<path d="M6 4 L15 2 L21 7 L30 5 L34 12 L30 20 L20 24 L12 19 L7 12 Z" />) },
  { k: 'carrera', name: 'Carrera', code: 'race', desc: 'Ranking animado por año',
    glyph: G(<><path d="M4 6 H30" /><path d="M4 13 H38" /><path d="M4 20 H22" /><path d="M34 17 l4 3 -4 3" /></>) },
  { k: 'red', name: 'Redes', code: 'red', desc: 'Flujos origen → destino',
    glyph: G(<><circle cx="7" cy="19" r="3.4" /><circle cx="20" cy="5" r="3.4" /><circle cx="33" cy="19" r="3.4" /><path d="M10 17 L17 8 M23 8 L30 16 M11 19 H29" /></>) },
  { k: 'flujos', name: 'Mapa de flujos', code: 'flowmap', desc: 'Migración sobre el mapa',
    glyph: G(<><path d="M6 4 L15 2 L21 7 L30 5 L34 12 L30 20 L20 24 L12 19 L7 12 Z" opacity=".45" /><path d="M10 18 C18 8, 24 8, 32 14" /><path d="M29 11 l4 3 -5 2" /></>) },
  { k: 'matriz', name: 'Matrices', code: 'heat', desc: 'Transiciones origen × destino',
    glyph: G(<><rect x="4" y="2" width="9" height="9" fill="currentColor" opacity=".55" stroke="none" /><rect x="16" y="2" width="9" height="9" opacity=".7" /><rect x="4" y="14" width="9" height="9" opacity=".7" /><rect x="16" y="14" width="9" height="9" fill="currentColor" opacity=".3" stroke="none" /><rect x="28" y="2" width="9" height="9" opacity=".7" /><rect x="28" y="14" width="9" height="9" fill="currentColor" opacity=".2" stroke="none" /></>) },
  { k: 'dispersion', name: 'Dispersión', code: null, desc: 'Correlación entre variables',
    glyph: G(<><circle cx="8" cy="19" r="2.2" /><circle cx="14" cy="14" r="2.2" /><circle cx="20" cy="16" r="2.2" /><circle cx="26" cy="8" r="2.2" /><circle cx="33" cy="6" r="2.2" /><path d="M4 23 L37 3" strokeDasharray="3 4" opacity=".6" /></>) },
]

// flagship picks per chart type — the insightful door in, not a 100-row dump
const STARS = {
  lineas: ['official_poverty_replication', 'income_percentiles_tiempo', 'gini_nacional_tiempo', 'endes_indicadores'],
  apilado: ['estructura_empleo_2004_2025', 'budget_composition_2004_2025', 'seguro_salud_2004_2025'],
  barras: ['gic_periodos', 'trust_by_institution_2025', 'eea_concentracion_industria', 'engel_elasticidades_2025'],
  mapa: ['gini_departamento_tiempo', 'indicadores_departamento_2025', 'income_real_province_2021_2025'],
  carrera: ['gini_departamento_tiempo', 'panel_departamento_2004_2025'],
  red: ['migracion_od_departamento', 'empleo_sector_flujo_paneles'],
  flujos: ['migracion_od_departamento'],
  matriz: ['panel_movilidad_quintil_2007_2011', 'panel_movilidad_quintil_2019_2023'],
}

function Group({ theme, items, code, nav, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="gf-group">
      <button className={'nav-theme-toggle' + (open ? ' open' : '')} onClick={() => setOpen((o) => !o)}>
        <span className={`nav-caret sm ${open ? 'up' : ''}`}>▾</span>
        <span className="nav-theme-name">{theme}</span>
        <span className="nav-theme-n">{items.length}</span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
            {items.map((x) => (
              <button key={x.schema + x.table} className="gf-row"
                onClick={() => nav(`/db/${x.schema}/${x.table}${code ? `?c=${code}` : ''}`)}>
                <span className="gf-row-title">{x.title}</span>
                {x.years && <span className="gf-years">{x.years}</span>}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// X/Y picker for the correlation kind: choose two departmental indicators and
// jump straight to the scatter, axes preselected via URL
function CorrPicker({ nav }) {
  const [inds, setInds] = useState([])
  const [xv, setXv] = useState('Educacion (anios)')
  const [yv, setYv] = useState('Pobreza')

  useEffect(() => {
    api.data('enaho', 'indicadores_departamento_2025', { limit: 1 })
      .then((d) => setInds(Object.keys(d.rows[0] || {}).filter((c) => c !== 'dep')))
      .catch(() => {})
  }, [])

  return (
    <div className="gf-corr">
      <p>Elige dos indicadores departamentales y mira la nube de puntos con su
        recta y su correlación.</p>
      <div className="gf-corr-axes">
        <label>
          <span>Eje X</span>
          <select value={xv} onChange={(e) => setXv(e.target.value)}>
            {inds.map((c) => <option key={c} value={c}>{labelFor(c)}</option>)}
          </select>
        </label>
        <span className="gf-corr-vs">×</span>
        <label>
          <span>Eje Y</span>
          <select value={yv} onChange={(e) => setYv(e.target.value)}>
            {inds.map((c) => <option key={c} value={c}>{labelFor(c)}</option>)}
          </select>
        </label>
        <button className="story-link" disabled={!inds.length || xv === yv}
          onClick={() => nav(`/correlacion?x=${encodeURIComponent(xv)}&y=${encodeURIComponent(yv)}`)}>
          Ver correlación →
        </button>
      </div>
      {xv === yv && <p className="gf-corr-warn">Elige dos indicadores distintos.</p>}
    </div>
  )
}

export default function Graficos() {
  const nav = useNavigate()
  const [index, setIndex] = useState([])
  const [kind, setKind] = useState('lineas')
  const [q, setQ] = useState('')

  useEffect(() => {
    api.index().then(setIndex).catch(() => {})
  }, [])

  const K = KINDS.find((x) => x.k === kind)
  const countOf = (k) => k === 'dispersion' ? 12
    : index.filter((x) => (x.kinds || []).includes(k)).length

  const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  const { stars, groups, found } = useMemo(() => {
    let hits = index.filter((x) => (x.kinds || []).includes(kind))
    // collapse panel window families to their newest window (63 rows -> 7)
    const byKey = new Map()
    for (const x of hits) {
      const k = x.family || `${x.schema}/${x.table}`
      const prev = byKey.get(k)
      if (!prev || (x.window || '') > (prev.window || '')) byKey.set(k, x)
    }
    hits = [...byKey.values()].map((x) =>
      x.family ? { ...x, title: x.title.split(' (')[0] } : x)
    if (q.trim()) {
      const terms = norm(q).split(/\s+/).filter(Boolean)
      const found = hits.filter((x) =>
        terms.every((t) => norm(`${x.title} ${x.topic || x.theme} ${x.section}`).includes(t)))
      return { stars: [], groups: [], found }
    }
    const starSlugs = STARS[kind] || []
    const stars = starSlugs.map((s) => hits.find((x) => x.table === s)).filter(Boolean)
    const rest = hits.filter((x) => !starSlugs.includes(x.table))
    const by = {}
    rest.forEach((x) => { const g = x.topic || x.theme; (by[g] = by[g] || []).push(x) })
    return { stars, groups: Object.entries(by).sort((a, b) => b[1].length - a[1].length), found: null }
  }, [index, kind, q])

  return (
    <div className="graficos">
      <div className="exp-crumb">BUSCADOR</div>
      <h1>¿Cómo quieres ver los datos?</h1>
      <p className="gf-lead">Elige el tipo de gráfico y te mostramos qué se puede
        graficar así, empezando por lo imperdible.</p>

      <div className="gf-kinds">
        {KINDS.map((x) => (
          <button key={x.k} className={'gf-kind' + (kind === x.k ? ' on' : '')}
            onClick={() => setKind(x.k)}>
            <span className="gf-glyph">{x.glyph}</span>
            <span className="gf-kind-name">{x.name}</span>
            <span className="gf-kind-desc">{x.desc}</span>
            <span className="gf-kind-n">{countOf(x.k)}</span>
          </button>
        ))}
      </div>

      {kind === 'dispersion' ? (
        <div className="gf-corr">
          <p>La dispersión vive en el <b>explorador de correlaciones</b>: eliges dos
            variables departamentales (pobreza, ingreso, educación, analfabetismo,
            lengua indígena, agua, SIS, empleo agrícola, confianza…) y ves la nube
            de puntos con su recta y su r.</p>
          <button className="story-link" onClick={() => nav('/correlacion')}>
            Abrir correlaciones →
          </button>
        </div>
      ) : (
        <>
          {stars.length > 0 && (
            <>
              <div className="section-label">Imperdibles en {K.name.toLowerCase()}</div>
              <div className="gf-stars">
                {stars.map((x) => (
                  <motion.button key={x.table} className="gf-star" whileHover={{ y: -3 }}
                    onClick={() => nav(`/db/${x.schema}/${x.table}${K.code ? `?c=${K.code}` : ''}`)}>
                    <span className="gf-star-glyph">{K.glyph}</span>
                    <span className="gf-star-title">{x.title}</span>
                    <span className="gf-star-meta">{x.section}{x.years ? ` · ${x.years}` : ''}</span>
                  </motion.button>
                ))}
              </div>
            </>
          )}
          {groups.length > 0 && <div className="section-label">Todo lo demás, por tema</div>}
          {groups.map(([theme, items], i) => (
            <Group key={kind + theme} theme={theme} items={items} code={K.code}
              nav={nav} defaultOpen={false} />
          ))}
        </>
      )}
    </div>
  )
}
