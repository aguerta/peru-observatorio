import { useEffect, useState } from 'react'
import { NavLink, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { api } from '../api'

// Ficha técnica: renders the construction/methodology README that ships with
// each source database (served by /api/readme/{name}).

export const FICHAS = {
  enaho: { sigla: 'ENAHO', titulo: 'Ingreso, Pobreza y Sociedad' },
  panel: { sigla: 'ENAHO Panel', titulo: 'Dinámica de Pobreza' },
  endes: { sigla: 'ENDES', titulo: 'Salud y Fertilidad' },
  epen: { sigla: 'EPE / EPEN', titulo: 'Empleo y Mercado Laboral' },
  eea: { sigla: 'EEA', titulo: 'Empresas' },
  validacion: { sigla: 'Validación', titulo: 'Bitácora de validación externa' },
}

// --- minimal markdown → React, enough for the fichas ---------------------

function inline(text, key) {
  const out = []
  const re = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(\[[^\]]+\]\([^)]+\))/g
  let last = 0, m, i = 0
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const s = m[0]
    if (m[1]) out.push(<code key={`${key}-${i}`}>{s.slice(1, -1)}</code>)
    else if (m[2]) out.push(<strong key={`${key}-${i}`}>{inline(s.slice(2, -2), `${key}-${i}`)}</strong>)
    else if (m[3]) out.push(<em key={`${key}-${i}`}>{inline(s.slice(1, -1), `${key}-${i}`)}</em>)
    else {
      const t = s.match(/\[([^\]]+)\]\(([^)]+)\)/)
      out.push(<a key={`${key}-${i}`} href={t[2]} target="_blank" rel="noreferrer">{t[1]}</a>)
    }
    last = m.index + s.length
    i++
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

function renderMd(md) {
  const lines = md.split(/\r?\n/)
  const blocks = []
  let i = 0, k = 0
  const push = (el) => blocks.push(el)

  while (i < lines.length) {
    const ln = lines[i]

    if (/^```/.test(ln)) {                      // fenced code
      const buf = []
      i++
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++])
      i++
      push(<pre key={k++}><code>{buf.join('\n')}</code></pre>)
      continue
    }
    if (/^(-{3,}|_{3,}|\*{3,})\s*$/.test(ln)) { i++; push(<hr key={k++} />); continue }
    if (/^#{1,4}\s/.test(ln)) {                 // headings
      const lvl = ln.match(/^#+/)[0].length
      const txt = ln.replace(/^#+\s*/, '')
      const H = `h${Math.min(lvl + 1, 5)}`      // md h1 -> page h2, etc.
      push(<H key={k++}>{inline(txt, `h${k}`)}</H>)
      i++
      continue
    }
    if (/^\s*>/.test(ln)) {                     // blockquote
      const buf = []
      while (i < lines.length && /^\s*>/.test(lines[i]))
        buf.push(lines[i++].replace(/^\s*>\s?/, ''))
      push(<blockquote key={k++}>{inline(buf.join(' '), `q${k}`)}</blockquote>)
      continue
    }
    if (/^\s*\|/.test(ln) && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1] || '')) { // table
      const cells = (row) => row.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim())
      const head = cells(ln)
      i += 2
      const body = []
      while (i < lines.length && /^\s*\|/.test(lines[i])) body.push(cells(lines[i++]))
      push(
        <div key={k++} className="ficha-table-wrap">
          <table>
            <thead><tr>{head.map((c, j) => <th key={j}>{inline(c, `th${k}-${j}`)}</th>)}</tr></thead>
            <tbody>
              {body.map((row, r) => (
                <tr key={r}>{row.map((c, j) => <td key={j}>{inline(c, `td${k}-${r}-${j}`)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      )
      continue
    }
    if (/^\s*([-*+]|\d+\.)\s+/.test(ln)) {      // list (flat)
      const items = []
      const ordered = /^\s*\d+\./.test(ln)
      while (i < lines.length && /^\s*([-*+]|\d+\.)\s+/.test(lines[i])) {
        let item = lines[i++].replace(/^\s*([-*+]|\d+\.)\s+/, '')
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !/^\s*([-*+]|\d+\.)\s+/.test(lines[i]))
          item += ' ' + lines[i++].trim()
        items.push(item)
      }
      const L = ordered ? 'ol' : 'ul'
      push(<L key={k++}>{items.map((t, j) => <li key={j}>{inline(t, `li${k}-${j}`)}</li>)}</L>)
      continue
    }
    if (!ln.trim()) { i++; continue }           // blank
    const buf = [ln]                            // paragraph
    i++
    while (i < lines.length && lines[i].trim() &&
      !/^(#{1,4}\s|```|\s*>|\s*\||\s*([-*+]|\d+\.)\s+|-{3,}\s*$)/.test(lines[i]))
      buf.push(lines[i++])
    push(<p key={k++}>{inline(buf.join(' '), `p${k}`)}</p>)
  }
  return blocks
}

export default function Ficha() {
  const { name } = useParams()
  const [md, setMd] = useState(null)
  const [err, setErr] = useState(false)
  const meta = FICHAS[name]

  useEffect(() => {
    setMd(null); setErr(false)
    api.readme(name).then(setMd).catch(() => setErr(true))
  }, [name])

  return (
    <div className="ficha">
      <motion.header initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}>
        <div className="exp-crumb">
          <NavLink to="/metodologia" className="crumb-link">METODOLOGÍA</NavLink>
          {' · FICHA TÉCNICA'}
        </div>
        <h1>{meta ? `${meta.sigla} — ${meta.titulo}` : name}</h1>
        <p className="ficha-lead">
          Nota técnica tal como acompaña a la base de datos: cómo se descarga,
          construye y valida cada indicador de esta fuente.
        </p>
      </motion.header>
      {err && <p className="ficha-err">No hay ficha técnica para «{name}».</p>}
      {md && <article className="ficha-body">{renderMd(md)}</article>}
    </div>
  )
}
