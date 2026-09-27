import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'
import { buildNetworkOption } from '../chartLogic'

export default function NetworkChart({ rows, flow, height = 600 }) {
  const el = useRef(null)
  const chart = useRef(null)

  useEffect(() => {
    chart.current = echarts.init(el.current, null, { renderer: 'canvas' })
    const ro = new ResizeObserver(() => chart.current && chart.current.resize())
    ro.observe(el.current)
    return () => { ro.disconnect(); chart.current.dispose() }
  }, [])

  useEffect(() => {
    if (chart.current && rows && flow) {
      chart.current.setOption(buildNetworkOption(rows, flow), true)
    }
  }, [rows, flow])

  return <div ref={el} style={{ width: '100%', height }} />
}
