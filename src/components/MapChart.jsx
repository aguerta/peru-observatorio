import { useEffect, useRef, useState } from 'react'
import * as echarts from 'echarts'
import { buildMapOption } from '../chartLogic'

const MAPS = {
  dept: { name: 'peru_dept', url: '/geo/peru_departments.geojson' },
  prov: { name: 'peru_prov', url: '/geo/peru_provinces.geojson' },
}
const _registered = {} // level -> Promise, so each geojson registers only once

function ensureMap(level) {
  const m = MAPS[level] || MAPS.dept
  if (_registered[m.name]) return _registered[m.name]
  _registered[m.name] = fetch(m.url)
    .then((r) => r.json())
    .then((geo) => { echarts.registerMap(m.name, geo); return true })
  return _registered[m.name]
}

export default function MapChart({ data, title, min, max, dark, height = 560, level = 'dept', onSelect }) {
  const el = useRef(null)
  const chart = useRef(null)
  const selectRef = useRef(onSelect)
  const [ready, setReady] = useState(false)
  const mapName = (MAPS[level] || MAPS.dept).name

  useEffect(() => { selectRef.current = onSelect }, [onSelect])

  useEffect(() => {
    chart.current = echarts.init(el.current, null, { renderer: 'canvas' })
    const ro = new ResizeObserver(() => chart.current && chart.current.resize())
    ro.observe(el.current)
    chart.current.on('click', (p) => {
      if (p.componentType === 'series' && p.name && selectRef.current) selectRef.current(p.name)
    })
    return () => { ro.disconnect(); chart.current.dispose() }
  }, [])

  useEffect(() => {
    setReady(false)
    ensureMap(level).then(() => setReady(true))
  }, [level])

  useEffect(() => {
    if (ready && chart.current) {
      chart.current.setOption(
        buildMapOption({ data, mapName, title, min, max, dark, roam: level === 'prov' }), true)
    }
  }, [ready, data, title, min, max, dark, mapName, level])

  return (
    <div style={{ position: 'relative' }}>
      {!ready && <div className="loading">Cargando mapa…</div>}
      <div ref={el} style={{ width: '100%', height }} />
    </div>
  )
}
