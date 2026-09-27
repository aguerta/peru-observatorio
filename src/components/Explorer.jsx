import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { api } from '../api'
import { descFor } from '../descriptions'
import EChart from './EChart'
import MapChart from './MapChart'
import NetworkChart from './NetworkChart'
import FlowMapChart from './FlowMapChart'
import BarRaceChart from './BarRaceChart'
import { deptCode } from './Departamento'
import SectionHero from './SectionHero'
import MiniSpark from './MiniSpark'
import { guessX, numericCols, defaultSeries, smartDefaultSeries, guessChartType, buildOption, buildHeatmapOption, matrixInfo, fromToInfo, flowInfo, isDeptNodes, isNumeric, isTemporal, labelFor, isHiddenSeries, isCountLike, fmtNum, toNum, deptName } from '../chartLogic'

const CHART_TYPES = [
  { k: 'line', l: 'Líneas' },
  { k: 'bar', l: 'Barras' },
  { k: 'barh', l: 'Barras H.' },
]
const MAP_TYPE = { k: 'map', l: 'Mapa' }

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.035 } } }
const rise = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 0.61, 0.36, 1] } },
}

function DatabaseOverview({ schema }) {
  const nav = useNavigate()
  const [detail, setDetail] = useState(null)
  const [prev, setPrev] = useState({})
  useEffect(() => {
    setDetail(null); setPrev({})
    api.database(schema).then(setDetail).catch(() => {})
    api.previews(schema).then(setPrev).catch(() => {})
  }, [schema])
  if (!detail) return (
    <div className="db-overview">
      <div className="skeleton sk-line" style={{ width: 300, height: 34, marginBottom: 16 }} />
      <div className="table-cards">
        {Array.from({ length: 8 }).map((_, i) =>
          <div key={i} className="skeleton" style={{ height: 74, borderRadius: 12 }} />)}
      </div>
    </div>
  )
  const db = detail.database
  return (
    <div className="db-overview">
      <motion.div className="db-head" style={{ '--accent': db.color }}
        initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 0.61, 0.36, 1] }}>
        <h1>{db.title}</h1>
        <div className="db-source" style={{ color: db.color }}>{db.source}</div>
        <p>{db.desc}</p>
      </motion.div>
      <SectionHero schema={schema} />
      <div className="section-label" style={{ marginTop: 36 }}>Todos los indicadores</div>
      {detail.themes.map((t) => (
        <section key={t.theme_key} className="theme-block">
          <h2>{t.theme_label}</h2>
          <motion.div className="table-cards"
            variants={stagger} initial="hidden" animate="show">
            {t.tables.map((tb) => (
              <motion.button key={tb.table} className="table-card" variants={rise}
                whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }}
                style={{ '--accent': db.color }}
                onClick={() => nav(`/db/${schema}/${tb.table}`)}>
                <div className="table-card-title">{tb.title}</div>
                {prev[tb.table]
                  ? <div className="tc-spark"><MiniSpark values={prev[tb.table]} color={db.color} height={34} /></div>
                  : <div className="tc-spark-empty" />}
                <div className="table-card-meta">
                  {tb.n_rows} filas · {tb.n_cols} columnas
                  {tb.mappable && <span className="tc-map"> · mapa</span>}
                </div>
              </motion.button>
            ))}
          </motion.div>
        </section>
      ))}
    </div>
  )
}

function TableExplorer({ schema, table }) {
  const navigate = useNavigate()
  const [meta, setMeta] = useState(null)
  const [data, setData] = useState(null)
  const [err, setErr] = useState(null)
  const [xCol, setXCol] = useState(null)
  const [yCols, setYCols] = useState([])
  const [ctype, setCtype] = useState('line')
  const [showTable, setShowTable] = useState(false)
  const [mapRes, setMapRes] = useState(null)
  const [period, setPeriod] = useState(null)
  const [periods, setPeriods] = useState([])
  const [range, setRange] = useState(null)   // [desde, hasta] on the x axis
  const [category, setCategory] = useState(null)
  const [categories, setCategories] = useState([])
  const [matrix, setMatrix] = useState(null)
  const [flow, setFlow] = useState(null)
  const [playing, setPlaying] = useState(false)
  const [copied, setCopied] = useState(false)
  const [bench, setBench] = useState(null)     // "¿es mucho?": vecinos con vara comparable
  const [windows, setWindows] = useState([])   // sibling re-interview windows (panel families)
  const [related, setRelated] = useState([])   // same-topic charts, cross-survey
  // shareable view state: ?c=<type>&x=<col>&s=<a|b>&cat=<v>&p=<year> — applied
  // once after auto-detection, then kept in sync so the URL is always shareable
  const urlApplied = useRef(false)

  // "¿es mucho?": para los indicadores nacionales clave, el ultimo dato de los
  // vecinos con la vara homogenea del Banco Mundial (regla editorial: ningun
  // numero nacional sin referencia al lado)
  useEffect(() => {
    const BENCH = {
      official_poverty_replication: { table: 'paises_pobreza685_wdi', vara: 'pobreza $6.85/día (Banco Mundial)' },
      income_percentiles_tiempo: { table: 'paises_gini_tiempo_wdi', vara: 'Gini (Banco Mundial)' },
      gini_nacional_tiempo: { table: 'paises_gini_tiempo_wdi', vara: 'Gini (Banco Mundial)' },
      gini_departamento_tiempo: { table: 'paises_gini_tiempo_wdi', vara: 'Gini (Banco Mundial)' },
    }
    setBench(null)
    const b = BENCH[table]
    if (!b) return
    let alive = true
    api.data('enaho', b.table, { order: 'year', limit: 30 }).then((d) => {
      if (!alive) return
      const paises = ['Peru', 'Chile', 'Colombia', 'Brasil', 'Mexico']
      const latest = {}
      d.rows.forEach((r) => paises.forEach((p) => {
        if (r[p] != null) latest[p] = { v: r[p], y: r.year }
      }))
      if (latest.Peru) setBench({ vara: b.vara, table: b.table, latest, paises })
    }).catch(() => {})
    return () => { alive = false }
  }, [table])

  // discovery: window chips for panel families + related charts by topic
  useEffect(() => {
    let alive = true
    setWindows([]); setRelated([])
    api.index().then((idx) => {
      if (!alive) return
      const me = idx.find((r) => r.schema === schema && r.table === table)
      if (!me) return
      if (me.family) {
        setWindows(idx.filter((r) => r.family === me.family)
          .sort((a, b) => (a.window || '').localeCompare(b.window || '')))
      }
      if (me.topic_key) {
        const byKey = new Map()   // one entry per family (newest window wins)
        for (const r of idx.filter((r) => r.topic_key === me.topic_key)) {
          if (r.schema === schema && r.table === table) continue
          if (me.family && r.family === me.family) continue
          const k = r.family || `${r.schema}/${r.table}`
          const prev = byKey.get(k)
          if (!prev || (r.window || '') > (prev.window || '')) byKey.set(k, r)
        }
        setRelated([...byKey.values()].slice(0, 6))
      }
    }).catch(() => {})
    return () => { alive = false }
  }, [schema, table])

  // load meta + data on table change
  useEffect(() => {
    urlApplied.current = false
    setMeta(null); setData(null); setErr(null)
    setMapRes(null); setPeriod(null); setPeriods([]); setRange(null)
    setCategory(null); setCategories([]); setMatrix(null); setFlow(null); setPlaying(false)
    let alive = true
    let capMeta, capX, capYs, capCand, capFlow
    api.tableMeta(schema, table).then((m) => {
      if (!alive) return
      const types = m.column_types
      let x = guessX(m.columns, types)
      // ALL plottable candidate series (not just the first 6) so the
      // magnitude-aware default can pick the headline metric wherever it sits
      let cand = numericCols(m.columns, types, [x, m.dept_col])
        .filter((c) => !isCountLike(c) && !isHiddenSeries(c))
      let ys = defaultSeries(m.columns, types, [x, m.dept_col])
      // from/to transition table: x = the ending period, series = the rates
      const ft = fromToInfo(m.columns)
      if (ft) {
        x = ft.to
        cand = m.columns.filter((c) => c !== ft.from && c !== ft.to
          && isNumeric(types[c]) && !isHiddenSeries(c) && !isCountLike(c))
        ys = cand
      }
      capMeta = m; capX = x; capYs = ys; capCand = cand
      setMeta(m); setXCol(x); setYCols(ys)
      // origin->destination flow table -> network (chord) chart
      const fl = flowInfo(m.columns, types, m.n_rows)
      if (fl) setFlow(fl)
      capFlow = fl
      // dept-keyed tables open as a map (avoids a 1..25 code axis)
      setCtype(fl ? 'red' : m.mappable ? 'map' : (ft ? 'line' : guessChartType(x, m.columns, types)))
      // periods for map / flow-map year filtering
      if ((m.mappable || fl) && m.temporal_col) {
        api.distinct(schema, table, m.temporal_col).then((r) => {
          if (!alive) return
          const vals = r.values
          setPeriods(vals)
          // keep a period restored from the URL; default to the latest otherwise
          setPeriod((cur) => cur != null && vals.some((v) => String(v) === String(cur))
            ? vals.find((v) => String(v) === String(cur)) : vals[vals.length - 1])
        }).catch(() => {})
      }
      // long-format indicator selector
      if (m.category_col) {
        api.distinct(schema, table, m.category_col).then((r) => {
          if (!alive) return
          setCategories(r.values)
          setCategory((cur) => cur != null && r.values.some((v) => String(v) === String(cur))
            ? r.values.find((v) => String(v) === String(cur)) : r.values[0])
        }).catch(() => {})
      }
      return api.data(schema, table, {
        order: isTemporal(x) ? x : undefined, limit: 8000,
      })
    }).then((d) => {
      if (!alive || !d) return
      setData(d)
      // geographic flow (departments) -> default to the animated flow map
      if (capFlow && isDeptNodes(d.rows, capFlow)) { setCtype('flowmap'); return }
      // square origin×destination matrix -> heatmap
      const mi = matrixInfo(capMeta.columns, capMeta.column_types, d.rows)
      if (mi && !capMeta.mappable) { setMatrix(mi); setCtype('heat'); return }
      // a single-row table is a composition, not a series -> horizontal bars
      if (d.rows.length === 1 && !capMeta.mappable) { setCtype('barh'); return }
      // many string categories (industries, cities) -> ranked horizontal bars
      if (!capMeta.mappable && !isTemporal(capX)
          && typeof d.rows[0]?.[capX] === 'string' && d.rows.length > 15) setCtype('barh')
      // refine default series now that we can see magnitudes. Consider ALL
      // candidates so the headline metric wins wherever it sits, and apply it
      // to long-format tables too (their value columns can differ in scale).
      if (capMeta && capCand && capCand.length > 1) {
        const src = capMeta.category_col
          ? d.rows.filter((r) => String(r[capMeta.category_col]) === String(d.rows[0][capMeta.category_col]))
          : d.rows
        const refined = smartDefaultSeries(src, capCand, capMeta.title)
        if (refined.length && !(refined.length === capYs.length
            && refined.every((c, i) => c === capYs[i]))) setYCols(refined)
      }
    }).catch((e) => alive && setErr(String(e)))
    return () => { alive = false }
  }, [schema, table])

  const [searchParams, setSearchParams] = useSearchParams()

  // restore a shared view once auto-detection has run (invalid values are
  // ignored; an off-shape chart type gets coerced by the availTypes effect)
  useEffect(() => {
    if (!data || !meta || urlApplied.current) return
    const g = (k) => searchParams.get(k)
    const x = g('x'), s = g('s'), c = g('c'), cat = g('cat'), p = g('p')
    if (x && meta.columns.includes(x)) setXCol(x)
    if (s) {
      const cols = s.split('|').filter((k) => meta.columns.includes(k))
      if (cols.length) setYCols(cols)
    }
    if (c) setCtype(c)
    if (cat != null) setCategory(cat)
    if (p != null) setPeriod(Number.isNaN(+p) ? p : +p)
    if (g('play') === '1') setPlaying(true)
    const r = g('r')
    if (r && r.includes('|')) setRange(r.split('|'))
    urlApplied.current = true
  }, [data, meta]) // eslint-disable-line

  // keep the URL in sync with the current view -> the address is always shareable
  useEffect(() => {
    if (!urlApplied.current || !meta) return
    const p = { c: ctype }
    if (xCol) p.x = xCol
    if (yCols.length) p.s = yCols.join('|')
    if (category != null) p.cat = String(category)
    if (period != null) p.p = String(period)
    if (range) p.r = range.join('|')
    if (searchParams.get('embed') === '1') p.embed = '1' // keep iframe mode on
    setSearchParams(p, { replace: true })
  }, [ctype, xCol, yCols, category, period, range, meta]) // eslint-disable-line

  const isEmbed = searchParams.get('embed') === '1'

  const copyText = (kind, text) => {
    navigator.clipboard?.writeText(text)
      .then(() => { setCopied(kind); setTimeout(() => setCopied(''), 1800) })
      .catch(() => {})
  }
  const copyLink = () => copyText('share', window.location.href)
  const copyEmbed = () => {
    const url = window.location.href + (window.location.href.includes('?') ? '&' : '?') + 'embed=1'
    copyText('embed', `<iframe src="${url}" width="100%" height="540" style="border:none"></iframe>`)
  }
  const copyCite = () => {
    const d = new Date()
    const fecha = d.toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })
    copyText('cite', `Chávez, C. (${d.getFullYear()}). ${meta?.title}. Observatorio de Datos del Perú. ` +
      `${window.location.href} (consultado el ${fecha}). Fuente primaria: microdatos INEI.`)
  }

  // filters shared by chart (client-side) and map (server-side)
  const buildFilters = () => {
    const f = []
    if (meta?.temporal_col && period != null && ctype === 'map')
      f.push({ col: meta.temporal_col, op: 'eq', val: period })
    if (meta?.category_col && category != null)
      f.push({ col: meta.category_col, op: 'eq', val: category })
    return f
  }

  // ▶ play: animate the choropleth through its periods
  useEffect(() => {
    if (!playing || !['map', 'flowmap', 'red'].includes(ctype) || periods.length < 2) return
    const id = setInterval(() => {
      setPeriod((p) => {
        const i = periods.indexOf(p)
        return periods[(i + 1) % periods.length]
      })
    }, 950)
    return () => clearInterval(id)
  }, [playing, ctype, periods])

  // fetch choropleth data when in map mode
  const mapValueCol = yCols[0]
  useEffect(() => {
    if (ctype !== 'map' || !meta?.mappable || !mapValueCol) return
    let alive = true
    const f = buildFilters()
    api.map(schema, table, mapValueCol, f.length ? f : null)
      .then((r) => { if (alive) setMapRes(r) })
      .catch(() => alive && setMapRes(null))
    return () => { alive = false }
  }, [ctype, meta, mapValueCol, period, category, schema, table])

  const types = meta?.column_types || {}
  const rows = data?.rows || []

  // coerce string-numeric cells so charts render
  const cleanRows = useMemo(() => {
    if (!rows.length) return rows
    return rows.map((r) => {
      const o = { ...r }
      for (const c of yCols) {
        const v = o[c]
        if (typeof v === 'string' && v.trim() !== '' && !isNaN(v)) o[c] = Number(v)
      }
      return o
    })
  }, [rows, yCols])

  // distinct sorted values of the temporal x axis: powers the Desde/Hasta
  // range selector (annual 2004, monthly 200110, moving-quarter 200108 alike)
  const xVals = useMemo(() => {
    if (!isTemporal(xCol) || flow || matrix) return []
    const seen = new Set()
    for (const r of cleanRows) {
      const v = r[xCol]
      if (v != null && v !== '') seen.add(String(v))
    }
    const vals = [...seen]
    const allNum = vals.every((v) => !isNaN(v))
    return vals.sort(allNum ? (a, b) => +a - +b : undefined)
  }, [cleanRows, xCol, flow, matrix])

  // for long-format tables, keep only the selected indicator's rows; for flow
  // tables with a year axis, keep only the selected year
  const viewRows = useMemo(() => {
    let r = cleanRows
    if (meta?.category_col && category != null)
      r = r.filter((row) => String(row[meta.category_col]) === String(category))
    if (flow && meta?.temporal_col && period != null)
      r = r.filter((row) => String(row[meta.temporal_col]) === String(period))
    if (range && xVals.length) {
      const i0 = xVals.indexOf(range[0]), i1 = xVals.indexOf(range[1])
      if (i0 >= 0 && i1 >= i0)
        r = r.filter((row) => {
          const i = xVals.indexOf(String(row[xCol]))
          return i >= i0 && i <= i1
        })
    }
    return r
  }, [cleanRows, meta, category, flow, period, range, xVals, xCol])

  // a one-row table is a composition: transpose its columns into labelled bars
  const singleRow = ctype !== 'map' && ctype !== 'heat' && viewRows.length === 1
  const option = useMemo(() => {
    if (!viewRows.length || ctype === 'red' || ctype === 'flowmap' || ctype === 'race') return null
    if (ctype === 'heat' && matrix) {
      return buildHeatmapOption({ rows: viewRows, rowKey: matrix.rowKey, cols: matrix.cols })
    }
    if (singleRow) {
      const r = viewRows[0]
      const nums = (meta?.columns || []).filter((c) => isNumeric(types[c]))
      const pct = nums.filter((c) => c.endsWith('_pct'))
      const use = (pct.length ? pct : nums).filter((c) => !isHiddenSeries(c) && !isCountLike(c))
      const trows = use.map((c) => ({ metric: labelFor(c), value: toNum(r[c]) }))
        .filter((d) => Number.isFinite(d.value))
      if (!trows.length) return null
      const horiz = ctype !== 'bar'
      const opt = buildOption({ rows: trows, x: 'metric', series: ['value'],
        type: horiz ? 'barh' : 'bar', ytitle: '' })
      opt.series[0].label = { show: true, position: horiz ? 'right' : 'top',
        color: '#34291c', fontSize: 11, fontWeight: 700, formatter: (p) => fmtNum(p.value) }
      opt.grid.left = horiz ? 168 : opt.grid.left
      opt.grid.right = horiz ? 46 : opt.grid.right
      return opt
    }
    if (!xCol || !yCols.length) return null
    return buildOption({
      rows: viewRows, x: xCol, series: yCols,
      type: ctype === 'scatter' ? 'scatter' : ctype,
      ytitle: yCols.length === 1 ? yCols[0] : '',
      xIsDept: xCol === meta?.dept_col,
      // rank + cap category bars with a long tail (e.g. 112 industries)
      rankBars: !isTemporal(xCol) && xCol !== meta?.dept_col
        && (ctype === 'bar' || ctype === 'barh') && viewRows.length > 15,
    })
  }, [viewRows, xCol, yCols, ctype, meta, singleRow, types, matrix])

  // summary stats for a temporal single-series view
  const summary = useMemo(() => {
    if (ctype === 'map' || ctype === 'flowmap' || ctype === 'red' || flow
      || !isTemporal(xCol) || !yCols.length || viewRows.length < 2) return null
    const col = yCols[0]
    // toNum: nulls stay NaN and drop out (Number(null) is 0 and skewed min/cambio)
    const pts = viewRows.map((r) => toNum(r[col])).filter((v) => Number.isFinite(v))
    if (pts.length < 2) return null
    return {
      col, latest: pts[pts.length - 1], first: pts[0],
      min: Math.min(...pts), max: Math.max(...pts),
    }
  }, [viewRows, xCol, yCols, ctype, flow])

  // chart types available for THIS table's shape (not a fixed set for all)
  const flowGeo = useMemo(() => isDeptNodes(cleanRows, flow), [cleanRows, flow])
  const availTypes = useMemo(() => {
    if (flow) return flowGeo
      ? [{ k: 'flowmap', l: 'Mapa de flujos' }, { k: 'red', l: 'Red' }]
      : [{ k: 'red', l: 'Red' }]
    if (matrix) return [{ k: 'heat', l: 'Matriz' }]
    if (rows.length === 1 && !meta?.mappable) return [{ k: 'bar', l: 'Barras' }, { k: 'barh', l: 'Barras H.' }]
    // dept-keyed tables: map only when temporal (a bar/line would zig-zag across
    // departments within each year); map + dept bars when one row per dept
    if (meta?.mappable) {
      return meta.temporal_col
        ? [{ k: 'map', l: 'Mapa' }, { k: 'race', l: 'Carrera' }]
        : [{ k: 'map', l: 'Mapa' }, { k: 'bar', l: 'Barras' }, { k: 'barh', l: 'Barras H.' }]
    }
    const arr = []
    // 'Líneas' + 'Apilado' only make sense on a temporal / ordered numeric axis
    if (isTemporal(xCol) || isNumeric(types[xCol])) {
      arr.push({ k: 'line', l: 'Líneas' }, { k: 'stacked', l: 'Apilado' })
    }
    arr.push({ k: 'bar', l: 'Barras' }, { k: 'barh', l: 'Barras H.' })
    return arr
  }, [flow, flowGeo, matrix, rows.length, xCol, types, meta])

  // if the current type isn't valid for this shape (e.g. line on a category
  // axis after switching X), fall back to the first sensible one
  useEffect(() => {
    if (availTypes.length && !availTypes.some((t) => t.k === ctype)) setCtype(availTypes[0].k)
  }, [availTypes]) // eslint-disable-line

  // "Lectura": the interpretation panel shown beside every chart — a main
  // sentence plus key readings, so the figure never stands alone
  const lectura = useMemo(() => {
    if (!meta) return null
    const yr = (x) => String(x).slice(0, 4)

    if (ctype === 'map' && mapRes?.data?.length) {
      const d = [...mapRes.data].sort((a, b) => b.value - a.value)
      const unit = meta.geo_level === 'prov' ? 'provincia' : 'departamento'
      const hi = d[0], lo = d[d.length - 1]
      const bullets = [
        `Los más altos: ${d.slice(0, 3).map((o) => `${o.name} (${fmtNum(o.value)})`).join(', ')}.`,
        `Los más bajos: ${d.slice(-3).reverse().map((o) => `${o.name} (${fmtNum(o.value)})`).join(', ')}.`,
      ]
      if (lo.value > 0) bullets.push(`La brecha entre extremos es de ${fmtNum(hi.value / lo.value)} veces.`)
      if (period != null) bullets.push(`Datos de ${period}. Cambia el año o presiona ▶ para animarlo.`)
      return {
        main: `Cada ${unit} se colorea según ${labelFor(mapValueCol).toLowerCase()}: más oscuro es más alto. ${hi.name} encabeza con ${fmtNum(hi.value)} y ${lo.name} cierra con ${fmtNum(lo.value)}.`,
        bullets,
      }
    }
    if (ctype === 'heat' && matrix) {
      const diag = viewRows.map((r, i) => toNum(r[matrix.cols[i]])).filter(Number.isFinite)
      const persist = diag.length ? diag.reduce((a, b) => a + b, 0) / diag.length : null
      return {
        main: 'Cada celda es el porcentaje que pasa de la fila (situación de origen) a la columna (destino). La diagonal es quedarse donde se estaba.',
        bullets: [
          persist != null ? `En promedio, ${fmtNum(persist)}% permanece en su posición de origen (la diagonal).` : null,
          'Lejos de la diagonal hay movilidad: subidas por encima, caídas por debajo.',
        ].filter(Boolean),
      }
    }
    if (ctype === 'race') {
      return {
        main: `Las barras se reordenan solas conforme avanza el año: es el ranking de ${labelFor(mapValueCol).toLowerCase()} en movimiento.`,
        bullets: ['Cada departamento conserva su color para poder seguirlo.',
          'Usa ❚❚ para pausar en un año y comparar posiciones.'],
      }
    }
    if ((ctype === 'red' || ctype === 'flowmap') && flow) {
      const es = viewRows.map((r) => ({ s: r[flow.source], t: r[flow.target], v: toNum(r[flow.value]) }))
        .filter((e) => Number.isFinite(e.v) && e.s !== e.t).sort((a, b) => b.v - a.v)
      const tot = {}
      es.forEach((e) => { tot[e.s] = (tot[e.s] || 0) + e.v; tot[e.t] = (tot[e.t] || 0) + e.v })
      const hub = Object.entries(tot).sort((a, b) => b[1] - a[1])[0]
      return {
        main: ctype === 'flowmap'
          ? 'Cada línea viaja del origen al destino sobre el mapa: más gruesa, más personas. Los círculos crecen con el movimiento total de cada departamento.'
          : 'Cada arco conecta un origen con un destino: más grueso, mayor flujo. Pasa el cursor por un nodo para aislar sus conexiones.',
        bullets: [
          es[0] ? `El mayor flujo es ${es[0].s} → ${es[0].t} con ${fmtNum(es[0].v)}.` : null,
          es[1] ? `Le siguen ${es[1].s} → ${es[1].t} (${fmtNum(es[1].v)}) y ${es[2] ? `${es[2].s} → ${es[2].t} (${fmtNum(es[2].v)})` : ''}.` : null,
          hub ? `${hub[0]} es el centro de la red: concentra el mayor movimiento total.` : null,
          period != null ? `Datos de ${period}. Presiona ▶ para recorrer los años.` : null,
        ].filter(Boolean),
      }
    }
    if (singleRow && viewRows[0]) {
      const r0 = viewRows[0]
      const comps = (meta.columns || [])
        .filter((c) => isNumeric(types[c]) && !isHiddenSeries(c))
        .map((c) => ({ c, v: toNum(r0[c]) })).filter((o) => Number.isFinite(o.v))
        .sort((a, b) => b.v - a.v)
      if (comps.length >= 2) {
        return {
          main: `Una sola medición descompuesta en sus partes: ${labelFor(comps[0].c).toLowerCase()} es la mayor (${fmtNum(comps[0].v)}) y ${labelFor(comps[comps.length - 1].c).toLowerCase()} la menor (${fmtNum(comps[comps.length - 1].v)}).`,
          bullets: comps.slice(0, 3).map((o) => `${labelFor(o.c)}: ${fmtNum(o.v)}.`),
        }
      }
      return null
    }
    const col = yCols[0]
    if (!col || viewRows.length < 2) return null
    const vals = viewRows.map((r) => ({ x: r[xCol], v: toNum(r[col]) })).filter((o) => Number.isFinite(o.v))
    if (vals.length < 2) return null
    const nm = (x) => xCol === meta.dept_col ? deptName(x) : (typeof x === 'string' ? labelFor(x) : x)
    if (isTemporal(xCol)) {
      const f = vals[0], l = vals[vals.length - 1]
      const dir = l.v >= f.v ? 'subió' : 'bajó'
      const peak = vals.reduce((a, b) => (b.v > a.v ? b : a))
      const low = vals.reduce((a, b) => (b.v < a.v ? b : a))
      const pct = f.v !== 0 ? Math.abs(100 * (l.v - f.v) / Math.abs(f.v)) : null
      const covid = vals.find((o) => yr(o.x) === '2020')
      const pre = vals.find((o) => yr(o.x) === '2019')
      return {
        main: `${labelFor(col)} ${dir} de ${fmtNum(f.v)} en ${yr(f.x)} a ${fmtNum(l.v)} en ${yr(l.x)}${pct != null && pct >= 1 ? ` (${dir === 'subió' ? '+' : '−'}${fmtNum(pct)}%)` : ''}.`,
        bullets: [
          `El punto más alto fue ${fmtNum(peak.v)} en ${yr(peak.x)} y el más bajo ${fmtNum(low.v)} en ${yr(low.x)}.`,
          covid && pre && Math.abs(covid.v - pre.v) / (Math.abs(pre.v) || 1) > 0.08
            ? `En 2020 la pandemia lo movió de ${fmtNum(pre.v)} a ${fmtNum(covid.v)}.` : null,
          yCols.length > 1 ? 'Compara las series con los botones de arriba: cada color es una serie.' : null,
        ].filter(Boolean),
      }
    }
    const s = [...vals].sort((a, b) => b.v - a.v)
    const mid = s[Math.floor(s.length / 2)]
    return {
      main: `Compara ${labelFor(col).toLowerCase()} entre ${s.length} ${labelFor(xCol).toLowerCase() === 'grupo' ? 'grupos' : 'categorías'}: ${nm(s[0].x)} encabeza con ${fmtNum(s[0].v)} y ${nm(s[s.length - 1].x)} cierra con ${fmtNum(s[s.length - 1].v)}.`,
      bullets: [
        s.length > 4 ? `El valor típico (mediana) es ${fmtNum(mid.v)}.` : null,
        s[0].v > 0 && s[s.length - 1].v > 0
          ? `La brecha entre el primero y el último es de ${fmtNum(s[0].v / s[s.length - 1].v)} veces.` : null,
      ].filter(Boolean),
    }
  }, [meta, viewRows, xCol, yCols, ctype, mapRes, mapValueCol, matrix, flow, period])

  const SOURCE = { enaho: 'ENAHO — INEI', panel: 'ENAHO Panel — INEI', endes: 'ENDES — INEI',
    epen: 'EPE/EPEN — INEI', eea: 'EEA — INEI' }

  if (err) return <div className="error">No se pudo cargar: {err}</div>
  if (!meta) return <TableSkeleton />

  const chartEl = ctype === 'race'
    ? <BarRaceChart rows={viewRows} entityCol={meta.dept_col}
        valueCol={mapValueCol} timeCol={meta.temporal_col} nameFn={deptName} />
    : ctype === 'flowmap' && flow
    ? <FlowMapChart rows={viewRows} flow={flow} />
    : ctype === 'red' && flow
    ? <NetworkChart rows={viewRows} flow={flow} />
    : ctype === 'map'
    ? (mapRes && mapRes.data.length
        ? <MapChart data={mapRes.data} level={meta.geo_level || 'dept'}
            title={meta.category_col && category != null ? labelFor(category) : labelFor(mapValueCol)}
            min={mapRes.min} max={mapRes.max}
            onSelect={meta.geo_level !== 'prov' ? (nm) => {
              const c = deptCode(nm)
              if (c) navigate(`/dpto/${c}`)
            } : undefined} />
        : <div className="loading">Sin datos para esta selección.</div>)
    : (option ? <EChart option={option} height={540} />
        : <div className="loading">Selecciona al menos una serie numérica.</div>)

  // bare chart for iframes: title, figure, nothing else (App adds attribution)
  if (isEmbed) {
    return (
      <div className="embed-view">
        <div className="embed-title">{meta.title}</div>
        {chartEl}
      </div>
    )
  }

  const allCols = meta.columns
  const numCols = allCols.filter((c) => isNumeric(types[c]))

  const isMap = ctype === 'map'
  const isHeat = ctype === 'heat'
  const chartTypes = availTypes
  const valueCols = numCols.filter((c) =>
    c !== meta.dept_col && c !== meta.temporal_col && !isHiddenSeries(c))
  const seriesCols = numCols.filter((c) => c !== xCol && !isHiddenSeries(c))

  const clickChip = (c) => {
    if (isMap) setYCols([c])
    else setYCols((cur) => cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c])
  }

  // export the rendered chart canvas as a PNG with title + source footer
  const downloadPng = () => {
    const cv = document.querySelector('.chart-wrap canvas')
    if (!cv) return
    const pad = 26, header = 64, footer = 52
    const out = document.createElement('canvas')
    out.width = cv.width + pad * 2
    out.height = cv.height + header + footer
    const ctx = out.getContext('2d')
    ctx.fillStyle = '#fffdf7'
    ctx.fillRect(0, 0, out.width, out.height)
    ctx.fillStyle = '#34291c'
    ctx.font = `700 ${Math.round(cv.width / 46)}px "Hanken Grotesk", sans-serif`
    ctx.fillText(meta.title, pad, header - 20)
    ctx.drawImage(cv, pad, header)
    ctx.fillStyle = '#8a7c68'
    ctx.font = `600 ${Math.round(cv.width / 72)}px "Hanken Grotesk", sans-serif`
    ctx.fillText('Observatorio de Datos del Perú · peruobservatorio.onrender.com · microdatos INEI',
      pad, out.height - 18)
    const a = document.createElement('a')
    a.download = `${table}.png`
    a.href = out.toDataURL('image/png')
    a.click()
  }

  return (
    <div className="explorer">
      <div className="exp-head">
        <div className="exp-crumb">{schema.toUpperCase()}</div>
        <h1>{meta.title}</h1>
        {descFor(table) && <p className="exp-desc">{descFor(table)}</p>}
        <div className="exp-sub">
          <span>{meta.n_rows} filas · {meta.n_cols} columnas</span>
          {meta.mappable && <span className="exp-badge">mapa disponible</span>}
          <span className="exp-file">{meta.source_file}</span>
          <a className="exp-dl" href={api.downloadUrl(schema, table)}>Descargar CSV</a>
          <button className={'exp-share' + (copied === 'share' ? ' ok' : '')} onClick={copyLink}
            title="Copia un enlace que reproduce exactamente esta vista">
            {copied === 'share' ? '✓ Copiado' : '⧉ Compartir'}
          </button>
          <button className={'exp-share' + (copied === 'embed' ? ' ok' : '')} onClick={copyEmbed}
            title="Copia el código iframe para incrustar este gráfico en otra web">
            {copied === 'embed' ? '✓ Copiado' : '</> Insertar'}
          </button>
          <button className={'exp-share' + (copied === 'cite' ? ' ok' : '')} onClick={copyCite}
            title="Copia la cita en formato académico">
            {copied === 'cite' ? '✓ Copiada' : '❝ Citar'}
          </button>
          <button className="exp-share" onClick={downloadPng}
            title="Descarga el gráfico como imagen PNG">
            ⤓ PNG
          </button>
        </div>
        {windows.length > 1 && (
          <div className="exp-windows">
            <span className="exp-windows-label">Ventana panel</span>
            {windows.map((w) => (
              <button key={w.table}
                className={'win-chip' + (w.table === table ? ' on' : '')}
                onClick={() => navigate(`/db/${w.schema}/${w.table}`)}>
                {w.window}
              </button>
            ))}
          </div>
        )}
      </div>

      <motion.div className="exp-body"
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 0.61, 0.36, 1] }}>
        <div className="controls">
          <div className="ctrl">
            <label>Tipo de gráfico</label>
            <div className="seg">
              {chartTypes.map((t) => (
                <button key={t.k} className={ctype === t.k ? 'on' : ''}
                  onClick={() => setCtype(t.k)}>{t.l}</button>
              ))}
            </div>
          </div>
          {meta.category_col && categories.length > 1 && (
            <div className="ctrl">
              <label>Indicador</label>
              <select value={category ?? ''} onChange={(e) => setCategory(
                categories.find((c) => String(c) === e.target.value))}>
                {categories.map((c) => <option key={c} value={c}>{labelFor(c)}</option>)}
              </select>
            </div>
          )}
          {!isMap && !singleRow && !isHeat && ctype !== 'red' && ctype !== 'flowmap' && ctype !== 'race' && (
            <div className="ctrl">
              <label>Eje X</label>
              <select value={xCol} onChange={(e) => {
                const nx = e.target.value
                setXCol(nx); setYCols((ys) => ys.filter((y) => y !== nx)); setRange(null)
              }}>
                {allCols.map((c) => <option key={c} value={c}>{labelFor(c)}</option>)}
              </select>
            </div>
          )}
          {!isMap && !isHeat && !singleRow && ctype !== 'red' && ctype !== 'flowmap'
            && ctype !== 'race' && xVals.length > 3 && (
            <div className="ctrl">
              <label>Periodo</label>
              <div className="range-row">
                <select value={range ? range[0] : xVals[0]} onChange={(e) => {
                  const v = e.target.value
                  setRange((r) => {
                    const hi = r ? r[1] : xVals[xVals.length - 1]
                    return [v, xVals.indexOf(hi) < xVals.indexOf(v) ? v : hi]
                  })
                }}>
                  {xVals.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
                <span className="range-sep">→</span>
                <select value={range ? range[1] : xVals[xVals.length - 1]} onChange={(e) => {
                  const v = e.target.value
                  setRange((r) => {
                    const lo = r ? r[0] : xVals[0]
                    return [xVals.indexOf(v) < xVals.indexOf(lo) ? v : lo, v]
                  })
                }}>
                  {xVals.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
                {range && (
                  <button className="range-clear" title="Ver todo el periodo"
                    onClick={() => setRange(null)}>×</button>
                )}
              </div>
            </div>
          )}
          {(isMap || ctype === 'flowmap' || ctype === 'red') && periods.length > 1 && (
            <div className="ctrl">
              <label>{labelFor(meta.temporal_col)}</label>
              <div className="period-row">
                <button className={'play-btn' + (playing ? ' on' : '')}
                  onClick={() => setPlaying((v) => !v)} title="Animar en el tiempo">
                  {playing ? '❚❚' : '▶'}
                </button>
                <select value={period ?? ''} onChange={(e) => {
                  setPlaying(false)
                  setPeriod(periods.find((p) => String(p) === e.target.value))
                }}>
                  {periods.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
          )}
          {singleRow || isHeat || ctype === 'red' || ctype === 'flowmap' || ctype === 'race'
            ? <div className="ctrl grow"><label>Vista</label>
                <div className="single-note">{isHeat
                  ? 'Matriz de transición: cada celda es el % que va de la fila (origen) a la columna (destino).'
                  : ctype === 'race'
                  ? 'Ranking animado: las barras se reordenan solas conforme avanza el año. Usa ❚❚ para pausar.'
                  : ctype === 'flowmap'
                  ? 'Mapa de flujos: las líneas animadas van del departamento de origen al de destino. Arrastra para desplazar y usa la rueda para acercar.'
                  : ctype === 'red'
                  ? 'Red origen → destino: pasa el cursor sobre un nodo para resaltar sus flujos. Arrastra para rotar y usa la rueda para acercar.'
                  : 'Composición de una sola observación — cada barra es una columna de la tabla.'}</div></div>
            : <div className="ctrl grow">
                <label>{isMap ? 'Indicador (color)' : 'Series (eje Y)'}</label>
                <div className="chips">
                  {(isMap ? valueCols : seriesCols).map((c) => (
                    <button key={c} className={'chip' + (yCols.includes(c) ? ' on' : '')}
                      onClick={() => clickChip(c)} title={c}>{labelFor(c)}</button>
                  ))}
                </div>
              </div>}
        </div>

        {summary && (
          <div className="exp-stats">
            <div className="stat-cell"><span className="stat-lbl">Último</span><span className="stat-num">{fmtNum(summary.latest)}</span></div>
            <div className="stat-cell"><span className="stat-lbl">Cambio</span>
              <span className={'stat-num ' + (summary.latest >= summary.first ? 'up' : 'down')}>
                {summary.latest >= summary.first ? '▲' : '▼'} {fmtNum(Math.abs(summary.latest - summary.first))}
              </span></div>
            <div className="stat-cell"><span className="stat-lbl">Máximo</span><span className="stat-num">{fmtNum(summary.max)}</span></div>
            <div className="stat-cell"><span className="stat-lbl">Mínimo</span><span className="stat-num">{fmtNum(summary.min)}</span></div>
            <div className="stat-cell stat-series"><span className="stat-lbl">Serie</span><span className="stat-num-sm">{labelFor(summary.col)}</span></div>
          </div>
        )}

        {bench && (
          <div className="bench-strip">
            <span className="bench-q">¿Es mucho?</span>
            {bench.paises.filter((p) => bench.latest[p]).map((p) => (
              <span key={p} className={'bench-chip' + (p === 'Peru' ? ' pe' : '')}>
                {p === 'Peru' ? 'Perú' : p} <b>{Number(bench.latest[p].v).toLocaleString('es-PE')}</b>
              </span>
            ))}
            <button className="adv-link" onClick={() => navigate(`/db/enaho/${bench.table}`)}>
              {bench.vara} · ver la serie completa →
            </button>
          </div>
        )}
        <div className={'chart-row' + (lectura ? '' : ' solo')}>
        <div className="chart-wrap">{chartEl}</div>
        {lectura && (
          <aside className="lectura">
            <div className="lectura-head">Lectura</div>
            <p className="lectura-main">{lectura.main}</p>
            {lectura.bullets?.length > 0 && (
              <ul className="lectura-list">
                {lectura.bullets.map((b, i) => <li key={i}>{b}</li>)}
              </ul>
            )}
            <div className="lectura-src">Fuente: {SOURCE[schema] || 'INEI'}</div>
          </aside>
        )}
        </div>

        <div className="chart-cite">
          Fuente: {SOURCE[schema] || 'INEI'} · elaboración propia · peruobservatorio.onrender.com
          {meta.last_built && <span> · datos al {meta.last_built}</span>}
          {meta.pipeline_script && (
            <span> · producido por <a className="cite-script" target="_blank" rel="noreferrer"
              href={'https://github.com/cesarchavezp29/peru-observatorio/blob/master/' +
                (meta.pipeline_script.startsWith('pipeline') ? meta.pipeline_script.split(' ')[0] : 'pipeline/manifest.csv')}>
              {meta.pipeline_script.split(' ')[0].replace('pipeline/', '').replace('pipeline-archive', 'archivo')}</a></span>
          )}
          {meta.geo_level && schema !== 'censos' && (
            <span className="chart-caution"> · estimación muestral: departamentos pequeños con cautela</span>
          )}
        </div>
        <button className="table-toggle" onClick={() => setShowTable((s) => !s)}>
          {showTable ? 'Ocultar' : 'Ver'} datos ({rows.length} filas)
        </button>
        {showTable && (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead><tr>{allCols.map((c) => <th key={c}>{c}</th>)}</tr></thead>
              <tbody>
                {rows.slice(0, 300).map((r, i) => (
                  <tr key={i}>{allCols.map((c) => <td key={c}>{fmt(r[c])}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {related.length > 0 && (
          <div className="related">
            <div className="section-label">Relacionados · Related</div>
            <div className="related-grid">
              {related.map((r) => (
                <button key={r.schema + r.table} className="related-card"
                  onClick={() => navigate(`/db/${r.schema}/${r.table}`)}>
                  <span className="related-title">{r.family ? r.title.split(' (')[0] : r.title}</span>
                  <span className="related-meta">{r.section}{r.years ? ` · ${r.years}` : ''}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="explorer">
      <div className="exp-head">
        <div className="skeleton sk-line" style={{ width: 90 }} />
        <div className="skeleton sk-line" style={{ width: 340, height: 26, margin: '10px 0' }} />
        <div className="skeleton sk-line" style={{ width: 220 }} />
      </div>
      <div className="exp-body">
        <div className="skeleton sk-line" style={{ width: '55%', height: 34 }} />
        <div className="skeleton sk-chart" style={{ marginTop: 18 }} />
      </div>
    </div>
  )
}

function fmt(v) {
  if (v === null || v === undefined) return ''
  if (typeof v === 'number') return Number.isInteger(v) ? v : v.toFixed(2)
  return String(v)
}

export default function Explorer() {
  const { schema, table } = useParams()
  if (!table) return <DatabaseOverview schema={schema} />
  return <TableExplorer key={`${schema}/${table}`} schema={schema} table={table} />
}
