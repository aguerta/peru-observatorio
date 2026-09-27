import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'

// Minimal ECharts React wrapper: init once, setOption on change, resize on layout.
export default function EChart({ option, height = 460 }) {
  const el = useRef(null)
  const chart = useRef(null)

  useEffect(() => {
    chart.current = echarts.init(el.current, null, { renderer: 'canvas' })
    const ro = new ResizeObserver(() => chart.current && chart.current.resize())
    ro.observe(el.current)
    return () => { ro.disconnect(); chart.current.dispose() }
  }, [])

  useEffect(() => {
    if (chart.current && option) {
      chart.current.setOption(option, true)
    }
  }, [option])

  return <div ref={el} style={{ width: '100%', height }} />
}
