import { useEffect, useRef, useState } from 'react'
import * as echarts from 'echarts'
import { buildFlowMapOption } from '../chartLogic'

let _geo = null
let _cent = null

function ensure() {
  if (!_geo) {
    _geo = fetch('/geo/peru_departments.geojson').then((r) => r.json())
      .then((g) => { echarts.registerMap('peru_dept', g); return true })
  }
  if (!_cent) _cent = fetch('/geo/dept_centroids.json').then((r) => r.json())
  return Promise.all([_geo, _cent]).then(([, c]) => c)
}

export default function FlowMapChart({ rows, flow, height = 600 }) {
  const el = useRef(null)
  const chart = useRef(null)
  const [cent, setCent] = useState(null)

  useEffect(() => {
    chart.current = echarts.init(el.current, null, { renderer: 'canvas' })
    const ro = new ResizeObserver(() => chart.current && chart.current.resize())
    ro.observe(el.current)
    ensure().then(setCent)
    return () => { ro.disconnect(); chart.current.dispose() }
  }, [])

  useEffect(() => {
    if (chart.current && cent && rows && flow) {
      chart.current.setOption(buildFlowMapOption(rows, flow, cent), true)
    }
  }, [cent, rows, flow])

  return (
    <div style={{ position: 'relative' }}>
      {!cent && <div className="loading">Cargando mapa…</div>}
      <div ref={el} style={{ width: '100%', height }} />
    </div>
  )
}
