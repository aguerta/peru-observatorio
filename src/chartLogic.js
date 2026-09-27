// Heuristics that turn an arbitrary analytical table into a sensible chart.
import { PALETTE, SEQ, tokens, tooltip, FONT } from './echartsTheme'

const TEMPORAL = ['year', 'anio', 'ano', 'ym', 'periodo', 'period', 'trim', 'fecha', 'window', 'label']

// null/'' -> NaN (so Number.isFinite filters them out; Number(null) is 0!)
export function toNum(v) {
  return (v == null || v === '') ? NaN : Number(v)
}

export function isNumeric(type) {
  if (!type) return false
  const t = type.toUpperCase()
  return /INT|DOUBLE|DECIMAL|FLOAT|REAL|NUMERIC|BIGINT|HUGEINT/.test(t)
}

// pick the default x column: first temporal-looking, else first non-numeric,
// else the first column.
const NAME_KEYS = ['industria', 'institution', 'institucion', 'nombre', 'name',
  'ciudad', 'producto', 'cultivo', 'sector', 'grupo', 'categoria', 'nivel',
  'nivel_educativo', 'departamento']
export function guessX(columns, types) {
  const lower = columns.map((c) => c.toLowerCase())
  for (const key of TEMPORAL) {
    const i = lower.findIndex((c) => c === key || c.startsWith(key))
    if (i >= 0) return columns[i]
  }
  // prefer a human name column (e.g. 'industria') over an id/code column
  const ni = lower.findIndex((c) => NAME_KEYS.includes(c))
  if (ni >= 0) return columns[ni]
  const cat = columns.find((c) => !isNumeric(types[c]))
  return cat || columns[0]
}

export function numericCols(columns, types, exclude = []) {
  // a time/period column is an axis: plotting 200108-style codes as a data
  // series is always wrong, so temporals never enter the series pool
  return columns.filter((c) => isNumeric(types[c]) && !exclude.includes(c) && !isTemporal(c))
}

// sample-size / id / weight columns that shouldn't be plotted by default
// (they stay selectable, just off unless the user turns them on)
const COUNT_LIKE = /^(n|nn|obs|count|total|wt|peso|pop|poblacion|population|id|codigo|cod|code|cluster|caseid)$|^n_[a-z0-9]+$|^(nhh|nobs)$/i
export function isCountLike(col) {
  return COUNT_LIKE.test(col.trim())
}

// helper / internal columns that shouldn't be offered as chart series
const HIDE = new Set(['cob_peso', 'wt', 'wt_raw', 'cluster', 'caseid', 'codigo',
  'n_obs', 'n_depto', 'n_hh', 'n_m', 'n_h', 'waves', 'p103_missing', 'fuente',
  'codciudad', 'oficial', 'pet', 'release', 'wave', 'window'])
export function isHiddenSeries(col) {
  return HIDE.has(col) || col === 'n' || col.endsWith('_missing') || col.endsWith('_raw')
}

// choose default series: numeric, not the x, not count-like, not hidden
export function defaultSeries(columns, types, exclude = []) {
  const nums = numericCols(columns, types, exclude)
  const signal = nums.filter((c) => !isCountLike(c) && !isHiddenSeries(c))
  const pick = signal.length ? signal : nums.filter((c) => !isHiddenSeries(c))
  return pick.slice(0, pick.length <= 6 ? pick.length : 4)
}

// ---- human-readable labels for cryptic column names --------------------
const DEPT_NAMES = ['', 'Amazonas', 'Ancash', 'Apurimac', 'Arequipa', 'Ayacucho',
  'Cajamarca', 'Callao', 'Cusco', 'Huancavelica', 'Huanuco', 'Ica', 'Junin',
  'La Libertad', 'Lambayeque', 'Lima', 'Loreto', 'Madre de Dios', 'Moquegua',
  'Pasco', 'Piura', 'Puno', 'San Martin', 'Tacna', 'Tumbes', 'Ucayali']
export function deptName(code) {
  const i = Number(code)
  return Number.isInteger(i) && i >= 1 && i <= 25 ? DEPT_NAMES[i] : String(code)
}

const LABELS = {
  adol_madre_pct: 'Madres adolescentes (%)', adol_madre: 'Madres adolescentes (%)',
  va_x_trab: 'VA por trabajador', va: 'Valor agregado', trab: 'Trabajadores',
  ceb: 'Hijos por mujer', hijos_ceb: 'Hijos por mujer', hijos_nacidos: 'Hijos por mujer',
  tasa_desempleo: 'Tasa de desempleo', tasa_actividad: 'Tasa de actividad',
  tasa_informalidad: 'Informalidad (%)', ing_nominal: 'Ingreso nominal',
  ingtotp: 'Ingreso laboral', real_pc_income_national: 'Ingreso real per cápita',
  poverty_pct: 'Pobreza (%)', official_poverty: 'Pobreza oficial INEI (%)',
  extreme_pct: 'Pobreza extrema (%)', official_extreme: 'Extrema oficial INEI (%)',
  educ_anios: 'Años de educación', educ: 'Años de educación',
  superior_pct: 'Educación superior (%)', desnutricion: 'Desnutrición crónica (%)',
  anticon_mod: 'Anticoncepción moderna (%)', edad_1er_hijo: 'Edad al primer hijo',
  edad_primer_hijo: 'Edad al primer hijo', anemia: 'Anemia infantil (%)',
  parto_inst: 'Parto institucional (%)', tfr: 'Tasa de fecundidad',
  urban: 'Urbano', rural: 'Rural', urbano: 'Urbano',
  poblacion: 'Población', population: 'Población', quintil: 'Quintil de riqueza',
  value: 'Valor', valor: 'Valor', pobreza: 'Pobreza (%)', pobreza_extrema: 'Pobreza extrema (%)',
  analfabetismo_15: 'Analfabetismo (%)', ingreso_real_pc: 'Ingreso real per cápita',
  lengua_indigena: 'Lengua indígena (%)', pct_sis: 'Afiliación SIS (%)',
  pct_60mas: 'Población 60+ (%)', educ_anios_25: 'Años de educación (25+)',
  // vivienda (verified in source builder, validated vs INEI)
  p110: 'Agua de red pública (dentro)', p1121: 'Alumbrado eléctrico',
  p1142: 'Teléfono celular',
  // panel poverty dynamics (single-row composition tables)
  chronic_pct: 'Crónica', transient_pct: 'Transitoria', never_pct: 'Nunca pobre',
  ever_poor_pct: 'Alguna vez pobre', annual_static_pct: 'Pobreza anual (estática)',
  poor_0w_pct: 'Pobre 0 de 5 años', poor_1w_pct: 'Pobre 1 de 5 años',
  poor_2w_pct: 'Pobre 2 de 5 años', poor_3w_pct: 'Pobre 3 de 5 años',
  poor_4w_pct: 'Pobre 4 de 5 años', poor_5w_pct: 'Pobre 5 de 5 años',
  anios_desde_hijo: 'Años desde el 1er hijo', empleo_pct: 'Empleo (%)',
  desempleo: 'Desempleo (%)', informalidad: 'Informalidad (%)', ingreso: 'Ingreso laboral',
  ciudad: 'Ciudad', cohorte: 'Cohorte de nacimiento', decil: 'Decil de ingreso',
  // Engel elasticities by ENAHO gran-grupo (i01=Alimentos, i05/i07 confirmed in builder)
  i01: 'Alimentos', i02: 'Vestido y calzado', i03: 'Alquiler, vivienda y combustible',
  i04: 'Muebles y enseres', i05: 'Salud', i06: 'Transporte y comunicaciones',
  i07: 'Esparcimiento, educación y cultura', i08: 'Otros bienes y servicios',
  // EEA concentration
  cr4: 'CR4 (4 mayores, %)', cr8: 'CR8 (8 mayores, %)', hhi: 'Índice HHI',
  ventas_mmM: 'Ventas (mil M S/)', industria: 'Industria', sec: 'Sector',
  // epen econ summary (Oaxaca + Mincer + wage curve)
  brecha_total_log: 'Brecha de género (log)', explicada_log: 'Parte explicada (composición)',
  no_explicada_log: 'Parte no explicada (discriminación)',
  mincer_nacional_pct: 'Retorno a la educación (%/año)',
  wage_curve_elasticidad: 'Elasticidad curva de salarios',
  pct_trust: 'Confianza (%)', institution: 'Institución', pct_empleo: 'Empleo (%)',
  pct_informal: 'Informalidad (%)', ing_medio: 'Ingreso medio', pct_sold: 'Vendido al mercado (%)',
  share: 'Participación (%)', share_fem: 'Participación femenina (%)', ratio: 'Ratio salarial (M/H)',
  income_2021: 'Ingreso 2021 (S/.)', income_2025: 'Ingreso 2025 (S/.)',
  chg_pct: 'Cambio (%)', chg_soles: 'Cambio (S/.)', pop_2021: 'Población 2021',
  pop_2025: 'Población 2025', left21: 'Voto izquierda 2021 (%)', left26: 'Voto izquierda 2026 (%)',
  gini: 'Gini del ingreso', gini_urbano: 'Gini urbano', gini_rural: 'Gini rural',
  p90_p10: 'Ratio P90/P10',
  // Theil decomposition (epen_theil_decomp: how much wage inequality is
  // between groups of each partition vs within them)
  grupo: 'Partición', theil_total: 'Theil total',
  entre: 'Entre grupos', dentro: 'Dentro de cada grupo',
  pct_entre: 'Explicado entre grupos (%)',
  // income distribution tables
  mediana: 'Mediana', promedio: 'Promedio', percentil: 'Percentil',
  ratio_p90_p10: 'Ratio P90/P10',
  crec_2004_2025: 'Crecimiento anual 2004-2025 (%)',
  crec_2004_2013: 'Crecimiento anual 2004-2013 (%)',
  crec_2013_2019: 'Crecimiento anual 2013-2019 (%)',
  crec_2019_2025: 'Crecimiento anual 2019-2025 (%)',
}
const SUFFIX = [
  ['_pct', ' (%)'], ['_h', ' (hombres)'], ['_m', ' (mujeres)'],
  ['_joven', ' (jóvenes)'], ['_adulto', ' (adultos)'], ['_mayor', ' (mayores)'],
  ['_pc', ' per cápita'],
]
export function labelFor(col) {
  if (LABELS[col]) return LABELS[col]
  let c = String(col), suff = ''
  for (const [s, l] of SUFFIX) {
    if (c.endsWith(s) && c.length > s.length) { suff = l; c = c.slice(0, -s.length); break }
  }
  if (LABELS[c]) return LABELS[c] + suff
  c = c.replace(/_/g, ' ').trim()
  return (c.charAt(0).toUpperCase() + c.slice(1)) + suff
}

// Refine the default series using the actual data: if the candidate columns
// span wildly different magnitudes (e.g. a count, a total in billions, and a
// ratio) plotting them together is unreadable, so fall back to a single series
// — preferring the one whose name matches the table title.
// crude unit class from the column name: series of different units must never
// share a default chart even when their magnitudes happen to coincide
// (CR4 at ~40% next to ventas at ~40 mil M was the canonical failure)
export function unitOf(col) {
  const c = (col + ' ' + labelFor(col)).toLowerCase()
  if (/hhi|indice|index|theil|gini\b/.test(c)) return 'index'
  if (/(^|[_\s(])(pct|share|tasa|cr\d|cobertura)|_pct|%|brecha_participacion/.test(c)) return 'pct'
  if (/ingreso|salario|remuner|sueldo|ventas|gasto|activo|inversion|income|wage|va\b|_w\b|mil m|mmm/.test(c)) return 'money'
  return 'other'
}

export function smartDefaultSeries(rows, candidates, title = '') {
  if (candidates.length <= 1 || !rows.length) return candidates
  // a column that is CONSTANT across rows can never be a good default series
  // (e.g. theil_total repeated on every partition row) — drop it up front as
  // long as at least two varying candidates remain
  if (rows.length > 1) {
    const varies = (c) => {
      const v = rows.map((r) => toNum(r[c])).filter(Number.isFinite)
      return v.length > 1 && Math.max(...v) - Math.min(...v) > 1e-9
    }
    const alive = candidates.filter(varies)
    if (alive.length >= 2 && alive.length < candidates.length) candidates = alive
  }
  const median = (c) => {
    const v = rows.map((r) => Math.abs(Number(r[c])))
      .filter((x) => Number.isFinite(x) && x > 0).sort((a, b) => a - b)
    return v.length ? v[Math.floor(v.length / 2)] : 0
  }
  const medOf = {}
  candidates.forEach((c) => { medOf[c] = median(c) })
  const meds = candidates.map((c) => medOf[c]).filter((x) => x > 0)
  const keepAll = candidates.slice(0, candidates.length <= 6 ? candidates.length : 4)

  // mixed units -> keep only the unit class of the best title-matched series
  const units = new Set(candidates.map(unitOf))
  if (units.size > 1) {
    const tw = (title.toLowerCase().match(/[a-záéíóúñ0-9]{3,}/gi) || [])
    const tScore = (c) => {
      const hay = (labelFor(c) + ' ' + c).toLowerCase()
      return tw.reduce((s, w) => s + (hay.includes(w) ? w.length : 0), 0)
    }
    const best = [...candidates].sort((a, b) => tScore(b) - tScore(a))[0]
    const grp = candidates.filter((c) => unitOf(c) === unitOf(best)
      && (!medOf[c] || !medOf[best] || (medOf[c] / medOf[best] <= 30 && medOf[best] / medOf[c] <= 30)))
    if (grp.length) return grp.slice(0, 6)
  }

  if (meds.length < 2) return keepAll
  if (Math.max(...meds) / Math.min(...meds) <= 30) {
    // mostly one scale, but if a tight core of series dominates and a few sit
    // far off scale (e.g. a p90/p10 ratio next to Gini values), drop the
    // outliers so the comparable series aren't flattened.
    const sm = [...meds].sort((a, b) => a - b)
    const mm = sm[Math.floor(sm.length / 2)]
    const core = candidates.filter((c) => medOf[c] > 0 && medOf[c] >= mm / 4 && medOf[c] <= mm * 4)
    const hasOutlier = candidates.some((c) => medOf[c] > 0 && (medOf[c] > mm * 8 || medOf[c] < mm / 8))
    if (hasOutlier && core.length >= 2 && core.length >= candidates.length / 2
        && core.length < candidates.length) return core.slice(0, 6)
    return keepAll
  }

  // a series that is constant across rows is a useless default (e.g. a total
  // that is the same for every group) — pick from the varying ones instead.
  const range = (c) => {
    const v = rows.map((r) => toNum(r[c])).filter(Number.isFinite)
    return v.length ? Math.max(...v) - Math.min(...v) : 0
  }
  const varying = candidates.filter((c) => range(c) > 1e-9)
  const pool = varying.length ? varying : candidates
  const words = (title.toLowerCase().match(/[a-záéíóúñ]{4,}/gi) || [])
  const scored = pool.map((c) => {
    const hay = (labelFor(c) + ' ' + c).toLowerCase()
    let score = words.reduce((s, w) => s + (hay.includes(w) ? w.length : 0), 0)
    if (title.toLowerCase().includes(c.toLowerCase())) score += 5 // e.g. "(CR4)"
    if (/_x_|pct|per_|productiv/.test(c)) score += 0.5 // nudge toward derived metrics
    if (/(^|_)(chg|change|delta|diff|var)(_|$)/i.test(c)) score -= 4 // levels over changes
    return [c, score]
  }).sort((a, b) => b[1] - a[1])
  return [scored[0][1] > 0 ? scored[0][0] : pool[0]]
}

// compact number formatting for axes / tooltips
export function fmtNum(v) {
  if (v == null || Number.isNaN(v)) return ''
  const a = Math.abs(v)
  if (a >= 1e6) return (v / 1e6).toFixed(a >= 1e7 ? 0 : 1) + ' M'
  if (a >= 1e4) return Math.round(v).toLocaleString('es-PE')
  if (Number.isInteger(v)) return String(v)
  return (+v.toFixed(2)).toLocaleString('es-PE', { maximumFractionDigits: 2 })
}

export function isTemporal(col) {
  if (!col) return false
  const c = col.toLowerCase()
  return TEMPORAL.some((k) => c === k || c.startsWith(k))
}

// default chart type from the shape of the data
export function guessChartType(x, columns, types) {
  return isTemporal(x) ? 'line' : 'bar'
}

// Build an ECharts option from rows + chosen encoding.
export function buildOption({ rows, x, series, type, ytitle, xIsDept, rankBars }) {
  const t = tokens()
  const axisColor = t.axis
  const gridColor = t.grid
  const horizontal = type === 'barh'
  const stacked = type === 'stacked'
  const base = type === 'barh' ? 'bar' : stacked ? 'line' : type

  // ranked category bars: sort by the primary series and cap the long tail
  let workRows = rows, capped = 0
  if (rankBars && series.length && base === 'bar') {
    workRows = [...rows].sort((a, b) => (toNum(b[series[0]]) || -1e15) - (toNum(a[series[0]]) || -1e15))
    if (workRows.length > 30) { capped = workRows.length; workRows = workRows.slice(0, 30) }
  }
  const cats = workRows.map((r) =>
    xIsDept ? deptName(r[x]) : (typeof r[x] === 'string' ? labelFor(r[x]) : r[x]))

  // animated end-of-line value label on uncluttered temporal lines
  const endLabels = base === 'line' && !stacked && !horizontal && series.length <= 4

  // >4 series: hue alone fails colorblind readers -- cycle marker shapes too
  const SYMBOLS = ['circle', 'rect', 'triangle', 'diamond', 'pin', 'arrow']
  const manySeries = series.length > 4
  const seriesArr = series.map((s, i) => ({
    id: s, // stable id -> smooth morph when the chart type switches
    name: labelFor(s),
    type: base,
    data: workRows.map((r) => r[s]),
    universalTransition: true,
    stack: stacked ? 'composicion' : undefined,
    smooth: base === 'line' ? (stacked ? 0.15 : 0.25) : false,
    showSymbol: stacked ? false : (manySeries || rows.length <= 40),
    symbol: manySeries ? SYMBOLS[i % SYMBOLS.length] : 'circle',
    symbolSize: 6,
    lineStyle: base === 'line' ? { width: stacked ? 1 : 2.4 } : undefined,
    areaStyle: stacked ? { opacity: 0.78 }
      : (base === 'line' && series.length === 1 ? { opacity: 0.08 } : undefined),
    barMaxWidth: 46,
    itemStyle: { color: PALETTE[i % PALETTE.length], borderRadius: base === 'bar' ? 3 : 0 },
    // value labels on small single-series bar charts (heterogeneous summaries)
    label: (base === 'bar' && series.length === 1 && workRows.length <= 12)
      ? { show: true, position: horizontal ? 'right' : 'top', color: t.text,
          fontSize: 11, fontWeight: 600, formatter: (p) => fmtNum(p.value) }
      : undefined,
    endLabel: endLabels
      ? { show: true, valueAnimation: true, distance: 7, color: PALETTE[i % PALETTE.length],
          fontWeight: 800, fontSize: 12, formatter: (p) => fmtNum(p.value) }
      : undefined,
    labelLayout: endLabels ? { hideOverlap: true, moveOverlap: 'shiftY' } : undefined,
    emphasis: { focus: 'series' },
  }))

  // subtle historical event markers on temporal line charts, so a reader who
  // doesn't remember the dates gets the context (only on long series)
  if (base === 'line' && !horizontal && cats.length >= 8) {
    const EVENTS = [['2008', 'Crisis global'], ['2020', 'COVID'], ['2022', 'Crisis política']]
    const marks = []
    for (const [yr, lbl] of EVENTS) {
      let hit = cats.find((c) => String(c) === yr)
      if (hit == null) {
        const pre = cats.filter((c) => String(c).startsWith(yr))
        hit = pre.find((c) => String(c) === yr + '03') || pre[Math.floor(pre.length / 2)]
      }
      if (hit != null) marks.push({ xAxis: hit, label: { formatter: lbl } })
    }
    if (marks.length && seriesArr[0]) {
      seriesArr[0].markLine = {
        symbol: 'none', silent: true,
        lineStyle: { color: axisColor, type: 'dashed', width: 1, opacity: 0.4 },
        label: { color: axisColor, fontSize: 10, position: 'insideEndTop', opacity: 0.85 },
        data: marks,
      }
    }
  }

  const catAxis = {
    type: 'category', data: cats, boundaryGap: base === 'bar',
    axisLine: { lineStyle: { color: gridColor } },
    axisLabel: { color: axisColor, hideOverlap: true,
      rotate: !horizontal && cats.length > 12 && typeof cats[0] === 'string' ? 35 : 0 },
    axisTick: { show: false },
  }

  // Tight adaptive value range: pin the axis to the data band (+ small padding,
  // snapped to a round step) instead of the 0 baseline, so a series that lives
  // in a narrow band (informality 72-84%, a Gini 0.40-0.49) fills the frame and
  // its movement is visible. ECharts' own `scale:true` rounds too loosely, so we
  // compute it. Bars and stacked areas KEEP the 0 baseline — a bar cut off above
  // 0 misrepresents magnitude, and a stack is a part-of-a-whole.
  let vMin, vMax
  if ((base === 'line' && !stacked) || base === 'scatter') {
    const vals = []
    for (const r of workRows) for (const s of series) {
      const n = toNum(r[s]); if (Number.isFinite(n)) vals.push(n)
    }
    if (vals.length) {
      const mn = Math.min(...vals), mx = Math.max(...vals), range = mx - mn
      if (range > 0) {
        const step = Math.pow(10, Math.floor(Math.log10(range))) / 5
        const pad = range * 0.12
        vMin = Math.round((Math.floor((mn - pad) / step) * step) * 1e6) / 1e6
        vMax = Math.round((Math.ceil((mx + pad) / step) * step) * 1e6) / 1e6
        // don't pad into negatives on inherently non-negative data (%, ratios):
        // clamp the floor to 0 so an axis never shows -6 for a share
        if (mn >= 0 && vMin < 0) vMin = 0
      }
    }
  }
  const valAxis = {
    type: 'value', name: ytitle ? labelFor(ytitle) : '',
    nameTextStyle: { color: axisColor, align: horizontal ? 'center' : 'left' },
    ...(vMin != null ? { min: vMin, max: vMax } : {}),
    axisLabel: { color: axisColor, formatter: (v) => fmtNum(v) },
    splitLine: { lineStyle: { color: gridColor } },
    axisLine: { show: false }, axisTick: { show: false },
  }

  return {
    color: PALETTE,
    textStyle: { fontFamily: FONT },
    title: capped ? { text: `Top 30 de ${capped}`, right: 8, top: 4,
      textStyle: { fontSize: 11, fontWeight: 600, color: axisColor } } : undefined,
    grid: {
      left: horizontal && typeof cats[0] === 'string'
        ? Math.min(240, 8 * Math.max(...cats.map((c) => String(c).length))) : 64,
      right: endLabels ? 88 : 28, top: series.length > 1 ? 52 : 30, bottom: 64,
    },
    tooltip: { ...tooltip('axis'), valueFormatter: (v) => fmtNum(v) },
    legend: series.length > 1
      ? { top: 12, textStyle: { color: axisColor }, type: 'scroll' } : undefined,
    dataZoom: (base === 'line' && cats.length > 30)
      ? [{ type: 'inside' }, { type: 'slider', height: 16, bottom: 30 }] : undefined,
    xAxis: horizontal ? valAxis : catAxis,
    yAxis: horizontal ? catAxis : valAxis,
    series: seriesArr,
    animationDuration: 600,
    animationDurationUpdate: 650,
    animationEasingUpdate: 'cubicInOut',
  }
}

// Clean quintile/matrix axis labels: q1_destino -> Q1, q3_origen -> Q3.
export function matLabel(c) {
  const m = String(c).match(/^q(\d)/i)
  if (m) return 'Q' + m[1]
  return labelFor(String(c).replace(/_?(origen|destino|from|to)$/i, ''))
}

// Build a heatmap for a square transition/mobility matrix.
export function buildHeatmapOption({ rows, rowKey, cols, xName = 'Destino', yName = 'Origen' }) {
  const t = tokens()
  const yLabels = rows.map((r) => matLabel(r[rowKey]))
  const xLabels = cols.map(matLabel)
  const data = []
  let max = 0
  rows.forEach((r, ri) => cols.forEach((c, ci) => {
    const v = toNum(r[c])
    if (Number.isFinite(v)) { data.push([ci, ri, +v.toFixed(1)]); if (v > max) max = v }
  }))
  return {
    textStyle: { fontFamily: FONT },
    tooltip: {
      position: 'top', backgroundColor: t.tooltipBg, borderColor: t.tooltipBorder,
      textStyle: { color: t.text },
      formatter: (p) => `${yName} ${yLabels[p.value[1]]} → ${xName} ${xLabels[p.value[0]]}<br/><b>${p.value[2]}</b>`,
    },
    grid: { left: 96, right: 24, top: 44, bottom: 56 },
    xAxis: {
      type: 'category', data: xLabels, position: 'top', name: xName, nameGap: 24,
      nameTextStyle: { color: t.axis, fontWeight: 700 },
      axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: t.axis },
    },
    yAxis: {
      type: 'category', data: yLabels, inverse: true, name: yName, nameGap: 12,
      nameTextStyle: { color: t.axis, fontWeight: 700, align: 'right' },
      axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: t.axis },
    },
    visualMap: {
      min: 0, max: Math.ceil(max / 10) * 10, calculable: true, orient: 'horizontal',
      left: 'center', bottom: 8, itemHeight: 90, inRange: { color: SEQ.light },
      textStyle: { color: t.axis },
    },
    series: [{
      type: 'heatmap', data,
      label: { show: true, color: '#34291c', fontSize: 11, fontWeight: 600, formatter: (p) => p.value[2] },
      itemStyle: { borderColor: '#fffdf7', borderWidth: 2, borderRadius: 3 },
      emphasis: { itemStyle: { shadowBlur: 8, shadowColor: 'rgba(0,0,0,.2)' } },
    }],
    animationDuration: 500,
  }
}

// Detect a TRUE transition matrix: one label column + N numeric columns + N
// rows, AND the same categories on both axes (rows ≈ columns after cleaning).
// This rejects category tables that merely happen to be square.
export function matrixInfo(columns, types, rows) {
  const nums = columns.filter((c) => isNumeric(types[c]))
  const label = columns.find((c) => !isNumeric(types[c]))
  if (!label || nums.length < 3 || rows.length !== nums.length) return null
  const colSet = new Set(nums.map(matLabel))
  const rowLabels = rows.map((r) => matLabel(r[label]))
  const overlap = rowLabels.filter((l) => colSet.has(l)).length
  if (overlap >= nums.length - 1) return { rowKey: label, cols: nums }
  return null
}

// Detect a from/to transition table.
export function fromToInfo(columns) {
  const lc = columns.map((c) => c.toLowerCase())
  const fi = lc.indexOf('from'), ti = lc.indexOf('to')
  if (fi >= 0 && ti >= 0) return { from: columns[fi], to: columns[ti] }
  return null
}

// Detect an origin->destination flow (edge-list) table for a network chart.
const FLOW_SRC = ['origen', 'source', 'desde', 'origin']
const FLOW_TGT = ['destino', 'target', 'hacia', 'dest']
export function flowInfo(columns, types, nRows = 99) {
  const low = columns.map((c) => c.toLowerCase())
  const s = columns.find((c, i) => FLOW_SRC.includes(low[i]))
  const t = columns.find((c, i) => FLOW_TGT.includes(low[i]))
  if (!s || !t || nRows < 6) return null
  const val = columns.find((c) => c !== s && c !== t && isNumeric(types[c]) && !isTemporal(c))
  return val ? { source: s, target: t, value: val } : null
}

// Build a circular (chord-style) network from an edge list. Nodes sized by
// total flow, edges by value, coloured by source; top `cap` edges kept.
export function buildNetworkOption(rows, flow, { cap = 70 } = {}) {
  const t = tokens()
  const total = {}
  rows.forEach((r) => {
    const v = toNum(r[flow.value]) || 0
    total[r[flow.source]] = (total[r[flow.source]] || 0) + v
    total[r[flow.target]] = (total[r[flow.target]] || 0) + v
  })
  const names = Object.keys(total).sort((a, b) => total[b] - total[a])
  const maxTot = Math.max(...Object.values(total), 1)
  const color = {}
  names.forEach((n, i) => { color[n] = PALETTE[i % PALETTE.length] })
  const edges = rows.map((r) => ({ s: r[flow.source], t: r[flow.target], v: toNum(r[flow.value]) || 0 }))
    .filter((e) => e.v > 0 && e.s !== e.t).sort((a, b) => b.v - a.v).slice(0, cap)
  const maxV = Math.max(...edges.map((e) => e.v), 1)
  return {
    textStyle: { fontFamily: FONT },
    tooltip: {
      ...tooltip('item'),
      formatter: (p) => p.dataType === 'edge'
        ? `${p.data.source} → ${p.data.target}<br/><b>${Math.round(p.data.value).toLocaleString('es-PE')}</b> personas/año`
        : `<b>${p.name}</b>`,
    },
    series: [{
      type: 'graph', layout: 'circular', circular: { rotateLabel: true }, roam: true,
      data: names.map((n) => ({
        name: n, symbolSize: 8 + 32 * Math.sqrt(total[n] / maxTot),
        itemStyle: { color: color[n] },
      })),
      links: edges.map((e) => ({
        source: e.s, target: e.t, value: e.v,
        lineStyle: { width: 1 + 8 * (e.v / maxV), color: color[e.s], opacity: 0.5, curveness: 0.3 },
      })),
      edgeSymbol: ['none', 'arrow'], edgeSymbolSize: 5,
      label: { show: true, position: 'right', color: t.mapLabel, fontSize: 11, fontWeight: 600 },
      emphasis: { focus: 'adjacency', lineStyle: { width: 6, opacity: 0.9 }, label: { fontWeight: 800 } },
      lineStyle: { curveness: 0.3 },
    }],
    animationDuration: 700,
  }
}

// True when a flow table's nodes are (mostly) Peruvian departments -> can be
// drawn as a flow map with lines between department centroids.
const DEPT_SET = new Set(DEPT_NAMES.slice(1))
export function isDeptNodes(rows, flow) {
  if (!flow || !rows.length) return false
  const names = new Set(rows.flatMap((r) => [r[flow.source], r[flow.target]]))
  let hit = 0
  names.forEach((n) => { if (DEPT_SET.has(n)) hit++ })
  return names.size > 0 && hit / names.size >= 0.6
}

// Build a flow MAP: the department choropleth outline with animated origin->
// destination lines (width by flow) and pulsing nodes (size by total flow).
export function buildFlowMapOption(rows, flow, centroids, { cap = 55, mapName = 'peru_dept' } = {}) {
  const t = tokens()
  const total = {}
  rows.forEach((r) => {
    const v = toNum(r[flow.value]) || 0
    total[r[flow.source]] = (total[r[flow.source]] || 0) + v
    total[r[flow.target]] = (total[r[flow.target]] || 0) + v
  })
  const names = Object.keys(total).filter((n) => centroids[n]).sort((a, b) => total[b] - total[a])
  const maxTot = Math.max(...names.map((n) => total[n]), 1)
  const color = {}
  names.forEach((n, i) => { color[n] = PALETTE[i % PALETTE.length] })
  const edges = rows.map((r) => ({ s: r[flow.source], t: r[flow.target], v: toNum(r[flow.value]) || 0 }))
    .filter((e) => e.v > 0 && e.s !== e.t && centroids[e.s] && centroids[e.t])
    .sort((a, b) => b.v - a.v).slice(0, cap)
  const maxV = Math.max(...edges.map((e) => e.v), 1)
  return {
    textStyle: { fontFamily: FONT },
    tooltip: {
      trigger: 'item', backgroundColor: t.tooltipBg, borderColor: t.tooltipBorder,
      textStyle: { color: '#34291c' },
      formatter: (p) => p.seriesType === 'lines'
        ? `${p.data.s} → ${p.data.t}<br/><b>${Math.round(p.data.value).toLocaleString('es-PE')}</b> personas/año`
        : `<b>${p.name}</b>`,
    },
    geo: {
      map: mapName, roam: true, layoutCenter: ['50%', '52%'], layoutSize: '112%',
      itemStyle: { areaColor: t.mapEmpty, borderColor: t.mapBorder, borderWidth: 0.6 },
      emphasis: { disabled: true }, silent: true,
    },
    series: [
      {
        type: 'lines', coordinateSystem: 'geo', zlevel: 2, polyline: false,
        effect: { show: true, period: 5, trailLength: 0.35, symbol: 'arrow', symbolSize: 5 },
        data: edges.map((e) => ({
          coords: [centroids[e.s], centroids[e.t]], s: e.s, t: e.t, value: e.v,
          lineStyle: { color: color[e.s], width: 0.6 + 5 * (e.v / maxV), opacity: 0.55, curveness: 0.25 },
        })),
      },
      {
        type: 'effectScatter', coordinateSystem: 'geo', zlevel: 3,
        rippleEffect: { scale: 2.2, brushType: 'stroke' },
        data: names.map((n) => ({
          name: n, value: [...centroids[n], total[n]],
          symbolSize: 5 + 22 * Math.sqrt(total[n] / maxTot), itemStyle: { color: color[n] },
        })),
        label: {
          show: true, formatter: '{b}', position: 'right', distance: 4,
          fontSize: 10, fontWeight: 600, color: t.mapLabel,
          textBorderColor: '#f6ecd7', textBorderWidth: 2, // halo keeps names readable over lines
        },
        // drop colliding names instead of mashing them together; data is sorted
        // by total flow, so the biggest hubs keep their labels
        labelLayout: { hideOverlap: true },
      },
    ],
    animationDuration: 600,
  }
}

// Build a choropleth option. `data` = [{name, value}], mapName registered on echarts.
export function buildMapOption({ data, mapName, title, min, max }) {
  const t = tokens()
  const ramp = SEQ.light
  // degenerate range (a single value, or one dept with data) collapses the
  // ramp and ECharts paints every polygon the same tone — pad it so regions
  // without data keep the neutral fill and the one value reads as "high"
  let lo = min ?? 0, hi = max ?? 1
  if (lo === hi) { const pad = Math.max(Math.abs(lo) * 0.05, 1); lo -= pad; hi += pad }
  return {
    textStyle: { fontFamily: FONT },
    tooltip: {
      ...tooltip('item'),
      formatter: (p) => {
        const v = p.value
        return `<b>${p.name}</b><br/>${title}: ` +
          (v == null || Number.isNaN(v) ? 'sin dato'
            : (Math.abs(v) >= 100 ? Math.round(v).toLocaleString() : v.toFixed(2)))
      },
    },
    visualMap: {
      type: 'continuous', min: lo, max: hi,
      left: 16, bottom: 24, calculable: true,
      itemWidth: 12, itemHeight: 150,
      precision: hi < 10 ? 2 : 0, // show decimals for sub-10 scales (Gini, ratios)
      text: ['alto', 'bajo'],
      textStyle: { color: t.axis, fontSize: 11 },
      inRange: { color: ramp },
    },
    series: [{
      type: 'map', map: mapName, roam: true,
      // center and fill the panel — Peru is tall and narrow, so without this the
      // shape floats off to one side
      layoutCenter: ['50%', '50%'], layoutSize: '96%',
      data,
      nameProperty: 'name',
      label: { show: false },
      // no-data areas get a neutral light tint (not a warm ramp tone that would
      // read as a low value)
      itemStyle: { borderColor: t.mapBorder, borderWidth: 0.6, areaColor: '#e7e0d0' },
      emphasis: {
        label: { show: true, color: t.mapLabel, fontSize: 11.5, fontWeight: 700 },
        itemStyle: { areaColor: '#157a6e' },
      },
      select: { disabled: true },
    }],
    animationDuration: 500,
  }
}
