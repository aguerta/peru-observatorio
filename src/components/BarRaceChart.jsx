import { useEffect, useRef, useState } from 'react'
import * as echarts from 'echarts'
import { PALETTE, tokens, FONT } from '../echartsTheme'
import { fmtNum, toNum } from '../chartLogic'

const FRAME_MS = 1100

// Animated ranking ("bar chart race"): bars reorder as the year advances.
// ECharts realtimeSort keeps a FIXED entity order in yAxis.data and animates by
// index, so the category labels (department names) travel with their bars.
export default function BarRaceChart({ rows, entityCol, valueCol, timeCol, nameFn, topN = 14, height = 560 }) {
  const el = useRef(null)
  const chart = useRef(null)
  const timer = useRef(null)
  const [playing, setPlaying] = useState(true)
  const idx = useRef(0)

  const times = [...new Set(rows.map((r) => r[timeCol]))]
    .filter((v) => v != null).sort((a, b) => Number(a) - Number(b))
  const ents = [...new Set(rows.map((r) => String(r[entityCol])))]
  const names = ents.map((e) => (nameFn ? nameFn(e) : e))
  const colorOf = {}
  ents.forEach((e, i) => { colorOf[e] = PALETTE[i % PALETTE.length] })

  const frame = (t) => {
    const t2 = tokens()
    const byEnt = {}
    rows.filter((r) => String(r[timeCol]) === String(t))
      .forEach((r) => { byEnt[String(r[entityCol])] = toNum(r[valueCol]) })
    return {
      grid: { left: 8, right: 96, top: 12, bottom: 24, containLabel: true },
      xAxis: { max: 'dataMax', axisLabel: { color: t2.axis, formatter: (v) => fmtNum(v) }, splitLine: { lineStyle: { color: t2.grid } } },
      yAxis: {
        type: 'category', data: names, inverse: true, max: topN - 1,
        axisLabel: { color: t2.text, fontWeight: 600, fontSize: 13 },
        axisTick: { show: false }, axisLine: { show: false },
        animationDuration: 300, animationDurationUpdate: 300,
      },
      series: [{
        type: 'bar', realtimeSort: true, barMaxWidth: 26,
        data: ents.map((e) => ({
          value: Number.isFinite(byEnt[e]) ? byEnt[e] : 0,
          itemStyle: { color: colorOf[e], borderRadius: [0, 4, 4, 0] },
        })),
        label: { show: true, position: 'right', valueAnimation: true, color: t2.text,
          fontWeight: 700, formatter: (p) => fmtNum(p.value) },
      }],
      graphic: {
        type: 'text', right: 84, bottom: 30, z: 100,
        style: { text: String(t), fontSize: 68, fontWeight: 800, fill: PALETTE[0],
          opacity: 0.25, fontFamily: FONT },
      },
      animationDuration: 0, animationDurationUpdate: FRAME_MS,
      animationEasing: 'linear', animationEasingUpdate: 'linear',
    }
  }

  useEffect(() => {
    chart.current = echarts.init(el.current, null, { renderer: 'canvas' })
    const ro = new ResizeObserver(() => chart.current && chart.current.resize())
    ro.observe(el.current)
    if (times.length) chart.current.setOption(frame(times[0]))
    return () => { ro.disconnect(); clearInterval(timer.current); chart.current.dispose() }
  }, [])

  useEffect(() => {
    clearInterval(timer.current)
    if (!playing || !chart.current || times.length < 2) return
    timer.current = setInterval(() => {
      idx.current = (idx.current + 1) % times.length
      chart.current.setOption(frame(times[idx.current]))
    }, FRAME_MS)
    return () => clearInterval(timer.current)
  }, [playing, rows, valueCol])

  return (
    <div style={{ position: 'relative' }}>
      <button className={'play-btn race-play' + (playing ? ' on' : '')}
        onClick={() => setPlaying((v) => !v)} title="Reproducir / pausar">
        {playing ? '❚❚' : '▶'}
      </button>
      <div ref={el} style={{ width: '100%', height }} />
    </div>
  )
}
