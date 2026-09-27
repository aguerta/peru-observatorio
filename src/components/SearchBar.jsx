import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { deptName } from '../chartLogic'
import { useLang } from '../i18n'

// department profile entries, searchable alongside indicators
const DPTOS = Array.from({ length: 25 }, (_, i) => i + 1)
  .filter((c) => c !== 7) // Callao folded into Lima
  .map((c) => ({
    kind: 'dpto', code: String(c).padStart(2, '0'),
    title: deptName(c), table: '', theme: 'departamento',
    section: 'Ficha departamental',
  }))

// accent-insensitive matching: "educación" must find "Educacion" and vice versa
const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

// everyday Spanish -> the technical vocabulary the chart titles use, so a
// non-economist typing "sueldo" or "chamba" still lands on the right chart
const SYN = {
  sueldo: ['salarial', 'salario', 'ingreso', 'remuneracion'],
  sueldos: ['salarial', 'salario', 'ingreso'],
  chamba: ['empleo', 'trabajo'], plata: ['ingreso'], dinero: ['ingreso'],
  trabajo: ['empleo', 'laboral'], trabajar: ['empleo'], paro: ['desempleo'],
  pobres: ['pobreza'], ricos: ['percentil', 'desigualdad', 'decil'],
  desigual: ['desigualdad', 'gini', 'brecha'], brechas: ['brecha'],
  colegio: ['educacion'], escuela: ['educacion'], estudiar: ['educacion'],
  universidad: ['superior'], analfabeto: ['analfabetismo'],
  embarazo: ['maternidad', 'fecundidad'], embarazada: ['maternidad', 'adolescente'],
  hijos: ['fecundidad', 'hijos'], bebes: ['fecundidad', 'infantil'],
  doctor: ['salud', 'atencion'], hospital: ['salud', 'atencion'],
  enfermo: ['salud', 'cronica'], sis: ['seguro', 'sis'],
  casa: ['vivienda'], luz: ['vivienda', 'servicios'], agua: ['vivienda', 'agua'],
  celular: ['telefono', 'servicios'], internet: ['servicios', 'vivienda'],
  cocina: ['combustible'],
  corrupcion: ['confianza', 'instituciones'], votar: ['voto', 'elecciones'],
  voto: ['voto', 'elecciones'], estado: ['confianza', 'transferencias'],
  precios: ['ipc'], inflacion: ['ipc'],
  campo: ['rural', 'agro', 'agricola'], chacra: ['agro', 'agricola'],
  mujeres: ['sexo', 'genero', 'mujer'], genero: ['sexo', 'brecha'],
  hombres: ['sexo', 'brecha'],
  jovenes: ['neet', 'juvenil', 'jovenes'], ninos: ['infantil', 'desnutricion', 'anemia'],
  comida: ['alimentos', 'engel'], gastar: ['gasto'], comprar: ['gasto', 'consumo'],
  informal: ['informalidad'], migrar: ['migracion'], mudarse: ['migracion'],
  empresa: ['empresas', 'sector'], negocio: ['empresas'],
  crecimiento: ['crecimiento', 'incidencia', 'convergencia'],
}

// Global indicator search: fetches the flat index once, filters client-side.
export default function SearchBar() {
  const nav = useNavigate()
  const { t } = useLang()
  const [index, setIndex] = useState([])
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [hi, setHi] = useState(0)
  const box = useRef(null)
  const inp = useRef(null)

  useEffect(() => {
    fetch('/api/index').then((r) => r.json()).then(setIndex).catch(() => {})
  }, [])
  useEffect(() => {
    const onClick = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false) }
    // "/" focuses search from anywhere (unless already typing in a field)
    const onSlash = (e) => {
      const tag = document.activeElement?.tagName
      if (e.key === '/' && tag !== 'INPUT' && tag !== 'SELECT' && tag !== 'TEXTAREA') {
        e.preventDefault(); inp.current?.focus()
      }
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onSlash)
    return () => { document.removeEventListener('mousedown', onClick); document.removeEventListener('keydown', onSlash) }
  }, [])

  const results = useMemo(() => {
    const s = norm(q.trim())
    if (!s) return []
    const terms = s.split(/\s+/)
    return [...DPTOS, ...index].map((x) => {
      const t = norm(x.title), tb = norm(x.table || '')
      const th = norm((x.topic || x.theme || '')), sec = norm(x.section || '')
      let score = 0, all = true
      for (const term of terms) {
        // everyday words map to the technical vocabulary of the titles
        const variants = [term, ...(SYN[term] || [])]
        let s2 = 0
        for (const v of variants) {
          // weight where the term matches: title >> table > theme > section
          s2 = Math.max(s2, (t.includes(v) ? 6 : 0) + (tb.includes(v) ? 3 : 0)
            + (th.includes(v) ? 1 : 0) + (sec.includes(v) ? 0.3 : 0))
        }
        if (s2 === 0) all = false
        score += s2
      }
      return { x, score, all }
    }).filter((r) => r.all).sort((a, b) => b.score - a.score).slice(0, 8).map((r) => r.x)
  }, [q, index])

  useEffect(() => { setHi(0) }, [q])

  const go = (r) => {
    if (!r) return
    nav(r.kind === 'dpto' ? `/dpto/${r.code}` : `/db/${r.schema}/${r.table}`)
    setQ(''); setOpen(false)
  }
  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(h + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)) }
    else if (e.key === 'Enter') go(results[hi])
    else if (e.key === 'Escape') setOpen(false)
  }

  return (
    <div className="search" ref={box}>
      <span className="search-ico">⌕</span>
      <input ref={inp} className="search-input" aria-label="Buscar indicador" value={q} placeholder={t('buscar')}
        onChange={(e) => { setQ(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)} onKeyDown={onKey} />
      <AnimatePresence>
        {open && results.length > 0 && (
          <motion.ul className="search-results"
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}>
            {results.map((r, i) => (
              <li key={r.kind === 'dpto' ? 'd' + r.code : r.schema + r.table}
                className={'search-item' + (i === hi ? ' on' : '')}
                onMouseEnter={() => setHi(i)} onMouseDown={(e) => { e.preventDefault(); go(r) }}>
                <span className="search-title">
                  {r.kind === 'dpto' && <span className="search-dpto">▣ </span>}
                  {r.title}{r.mappable && <span className="search-map"> · mapa</span>}
                </span>
                <span className="search-sec">{r.section}</span>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}
