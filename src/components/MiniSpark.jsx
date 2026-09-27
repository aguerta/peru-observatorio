import { useEffect, useRef } from 'react'
import * as echarts from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { GridComponent } from 'echarts/components'
import { SVGRenderer } from 'echarts/renderers'

echarts.use([LineChart, GridComponent, SVGRenderer])

// Tiny axis-less sparkline.
export default function MiniSpark({ values, color = '#c85a34', height = 42 }) {
  const el = useRef(null)
  const chart = useRef(null)
  useEffect(() => {
    chart.current = echarts.init(el.current, null, { renderer: 'svg' })
    const ro = new ResizeObserver(() => chart.current && chart.current.resize())
    ro.observe(el.current)
    return () => { ro.disconnect(); chart.current.dispose() }
  }, [])
  useEffect(() => {
    if (!chart.current || !values?.length) return
    chart.current.setOption({
      grid: { left: 1, right: 1, top: 4, bottom: 2 },
      xAxis: { type: 'category', show: false, boundaryGap: false },
      yAxis: { type: 'value', show: false, scale: true },
      series: [{
        type: 'line', data: values, showSymbol: false, smooth: 0.3,
        lineStyle: { width: 2, color },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{ offset: 0, color: color + '44' }, { offset: 1, color: color + '00' }],
          },
        },
      }],
    }, true)
  }, [values, color])
  return <div ref={el} style={{ width: '100%', height }} />
}
