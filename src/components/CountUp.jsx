import { useEffect, useRef } from 'react'
import { animate, useInView } from 'framer-motion'

// Counts up to `to` once it scrolls into view.
export default function CountUp({ to, suffix = '', prefix = '', decimals = 0, duration = 1.5 }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })

  useEffect(() => {
    if (!inView || !ref.current) return
    const node = ref.current
    const controls = animate(0, to, {
      duration, ease: [0.22, 0.61, 0.36, 1],
      onUpdate: (v) => { node.textContent = prefix + v.toFixed(decimals) + suffix },
    })
    return () => controls.stop()
  }, [inView, to])

  return <span ref={ref}>{prefix}0{suffix}</span>
}
