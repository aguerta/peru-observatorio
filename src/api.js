// Thin API client for the Observatorio backend.
const BASE = import.meta.env.DEV ? '' : ''

async function j(url) {
  const r = await fetch(BASE + url)
  if (!r.ok) throw new Error(`${r.status} ${url}`)
  return r.json()
}

export const api = {
  databases: () => j('/api/databases'),
  database: (schema) => j(`/api/databases/${schema}`),
  previews: (schema) => j(`/api/previews/${schema}`),
  tableMeta: (schema, table) => j(`/api/tables/${schema}/${table}`),
  data: (schema, table, opts = {}) => {
    const p = new URLSearchParams()
    if (opts.cols) p.set('cols', opts.cols.join(','))
    if (opts.order) p.set('order', opts.order)
    if (opts.desc) p.set('desc', 'true')
    if (opts.limit) p.set('limit', opts.limit)
    if (opts.filters) p.set('filters', JSON.stringify(opts.filters))
    const qs = p.toString()
    return j(`/api/data/${schema}/${table}${qs ? '?' + qs : ''}`)
  },
  map: (schema, table, valueCol, filters) => {
    const p = new URLSearchParams({ value_col: valueCol })
    if (filters) p.set('filters', JSON.stringify(filters))
    return j(`/api/map/${schema}/${table}?${p.toString()}`)
  },
  distinct: (schema, table, col) => j(`/api/distinct/${schema}/${table}/${col}`),
  downloadUrl: (schema, table) => `${BASE}/api/download/${schema}/${table}.csv`,
  index: () => j('/api/index'),
  topics: () => j('/api/topics'),
  readme: async (name) => {
    const r = await fetch(`${BASE}/api/readme/${name}`)
    if (!r.ok) throw new Error(`${r.status} readme/${name}`)
    return r.text()
  },
}
