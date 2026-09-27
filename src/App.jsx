import { Suspense, lazy, useEffect, useState } from 'react'
import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { api } from './api'
import Sidebar from './components/Sidebar'
import SearchBar from './components/SearchBar'
import Home from './components/Home'
import Explorer from './components/Explorer'
const Comparador = lazy(() => import('./components/Comparador'))
const Correlacion = lazy(() => import('./components/Correlacion'))
const Datos = lazy(() => import('./components/Datos'))
const Departamento = lazy(() => import('./components/Departamento'))
const Ensayos = lazy(() => import('./components/Ensayos'))
const Historia = lazy(() => import('./components/Historia'))
const Desigualdad = lazy(() => import('./components/Desigualdad'))
const Metodologia = lazy(() => import('./components/Metodologia'))
const Ficha = lazy(() => import('./components/Ficha'))
const Graficos = lazy(() => import('./components/Graficos'))
const Tema = lazy(() => import('./components/Tema'))
const Distrito = lazy(() => import('./components/Distrito'))
const Preguntas = lazy(() => import('./components/Preguntas'))
const QuienVoto = lazy(() => import('./components/QuienVoto'))
const TuVida = lazy(() => import('./components/TuVida'))
const Adivina = lazy(() => import('./components/Adivina'))
const Dibuja = lazy(() => import('./components/Dibuja'))
const DosPerus = lazy(() => import('./components/DosPerus'))
const Movilidad = lazy(() => import('./components/Movilidad'))
const Agenda = lazy(() => import('./components/Agenda'))
const Censos = lazy(() => import('./components/Censos'))
import { LangProvider, useLang } from './i18n'

function LangToggle() {
  const { lang, setLang } = useLang()
  return (
    <button className="lang-toggle" aria-label="Cambiar idioma / switch language" onClick={() => setLang(lang === 'es' ? 'en' : 'es')}
      title={lang === 'es' ? 'Interface in English (charts stay in Spanish)' : 'Interfaz en español'}>
      {lang === 'es' ? 'EN' : 'ES'}
    </button>
  )
}

export default function App() {
  return <LangProvider><AppShell /></LangProvider>
}

function AppShell() {
  const { t } = useLang()
  const [databases, setDatabases] = useState([])
  const [navOpen, setNavOpen] = useState(false)
  const location = useLocation()
  // ?embed=1 -> bare chart for iframes: no topbar, sidebar or footer
  const embed = new URLSearchParams(location.search).get('embed') === '1'

  useEffect(() => {
    api.databases().then(setDatabases).catch(() => setDatabases([]))
  }, [])

  useEffect(() => {
    setNavOpen(false); window.scrollTo({ top: 0 })
    const path = location.pathname
    const titles = [
      ['/comparar', 'Comparar departamentos'], ['/correlacion', 'Correlaciones'],
      ['/ensayos', 'Ensayos'], ['/historia', 'Historia de la pobreza'],
      ['/desigualdad', 'Historia de la desigualdad'],
      ['/metodologia', 'Metodología'], ['/dpto/', 'Ficha departamental'],
      ['/graficos', 'Gráficos'], ['/tema/', 'Temas'], ['/distrito', 'Mi distrito'], ['/preguntas', 'El Perú en preguntas'], ['/quienvoto', 'El mapa de la grieta'], ['/movilidad', 'Movilidad educativa'], ['/agenda', 'La agenda pendiente'], ['/tuvida', 'El Perú de tu vida'], ['/adivina', 'Adivina el Perú'], ['/dibuja', 'Dibuja la línea'], ['/dosperus', 'Dos Perús'],
    ]
    const hit = titles.find(([p]) => path.startsWith(p))
    document.title = (hit ? hit[1] + ' · ' : '') + 'Observatorio de Datos del Perú'
    // per-route meta description so shared/indexed pages describe themselves
    const DESCS = {
      '/quienvoto': 'El mapa de la grieta: la segunda vuelta 2026 distrito por distrito. La división no es la pobreza — es territorial y etnolingüística, en ambos polos.',
      '/historia': 'Dos décadas de pobreza en el Perú, contadas gráfico a gráfico: de 58.7% a 25.7%.',
      '/desigualdad': 'El crecimiento que llegó primero a los pobres: ingreso real por percentil, 2004-2025.',
      '/preguntas': 'El Perú en diez preguntas: pobreza, ingreso, informalidad y más, con el último dato oficial.',
      '/tuvida': 'Pon tu año de nacimiento y mira cómo cambió el Perú mientras crecías.',
      '/adivina': 'Adivina las cifras del Perú y compara tu intuición con los datos oficiales.',
      '/dibuja': 'Dibuja lo que crees que pasó con la pobreza y mira la realidad encima de tu trazo.',
      '/agenda': 'Qué debe mejorar el Perú: las seis series que no se movieron mientras el país crecía, con sus datos en vivo.',
      '/censos': 'Condiciones de vida por provincia en cuatro censos: el índice de privación cayó de 63 a 34 entre 1981 y 2017.',
    }
    const d = DESCS[Object.keys(DESCS).find((k) => path.startsWith(k))]
    const tag = document.querySelector('meta[name="description"]')
    if (tag) tag.setAttribute('content', d
      || 'Datos oficiales del Peru: ingreso, pobreza, salud, empleo, empresas y censos. Microdatos INEI validados, 2001-2026.')
  }, [location.pathname])

  if (embed) {
    return (
      <div className="app embed-shell">
        <Routes location={location}>
          <Route path="/db/:schema/:table" element={<Explorer />} />
          <Route path="*" element={<Home databases={databases} />} />
        </Routes>
        <a className="embed-brand" href={window.location.origin + location.pathname}
          target="_blank" rel="noreferrer">
          ◆ Observatorio de Datos del Perú
        </a>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="topbar">
        <button className="hamburger" onClick={() => setNavOpen((o) => !o)} aria-label="menu">☰</button>
        <NavLink to="/" className="brand">
          <span className="brand-mark">◆</span>
          <span className="brand-text">
            <strong>Observatorio de Datos del Perú</strong>
            <small>{t('tagline')}</small>
          </span>
        </NavLink>
        <div className="topbar-spacer" />
        <SearchBar />
        <LangToggle />
        <a className="topbar-link" href="https://github.com/cesarchavezp29" target="_blank" rel="noreferrer">GitHub</a>
      </header>

      <div className="layout">
        <Sidebar databases={databases} open={navOpen} onNavigate={() => setNavOpen(false)} />
        <main className="content">
          <AnimatePresence mode="wait">
            <motion.div key={location.pathname}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.32, ease: [0.22, 0.61, 0.36, 1] }}>
              <Suspense fallback={<div className="skeleton sk-chart" style={{ height: 300, marginTop: 30 }} />}>
              <Routes location={location}>
                <Route path="/" element={<Home databases={databases} />} />
                <Route path="/comparar" element={<Comparador />} />
                <Route path="/correlacion" element={<Correlacion />} />
                <Route path="/ensayos" element={<Ensayos />} />
                <Route path="/dpto/:code" element={<Departamento />} />
                <Route path="/metodologia" element={<Metodologia />} />
                <Route path="/metodologia/:name" element={<Ficha />} />
                <Route path="/graficos" element={<Graficos />} />
                <Route path="/tema/:key" element={<Tema />} />
                <Route path="/distrito" element={<Distrito />} />
                <Route path="/preguntas" element={<Preguntas />} />
                <Route path="/quienvoto" element={<QuienVoto />} />
                <Route path="/movilidad" element={<Movilidad />} />
                <Route path="/agenda" element={<Agenda />} />
                <Route path="/censos" element={<Censos />} />
                <Route path="/tuvida" element={<TuVida />} />
                <Route path="/adivina" element={<Adivina />} />
                <Route path="/dibuja" element={<Dibuja />} />
                <Route path="/dosperus" element={<DosPerus />} />
                <Route path="/datos" element={<Datos />} />
                <Route path="/historia" element={<Historia />} />
                <Route path="/desigualdad" element={<Desigualdad />} />
                <Route path="/db/:schema" element={<Explorer />} />
                <Route path="/db/:schema/:table" element={<Explorer />} />
              </Routes>
              </Suspense>
            </motion.div>
          </AnimatePresence>
          <footer className="site-footer">
            Fuente: microdatos INEI (ENAHO, ENAHO Panel, ENDES, EPE/EPEN, EEA, Censos 1981-2017).
            Indicadores propios validados contra estadísticas oficiales — ver{' '}
            <NavLink to="/metodologia" className="footer-link">metodología</NavLink>.
            Datos por <a className="footer-link" href="/docs" target="_blank" rel="noreferrer">API</a>.
            Elaboración propia sobre microdatos públicos del INEI.
            Construido por <a className="footer-link" href="https://github.com/cesarchavezp29" target="_blank" rel="noreferrer">Carlos Chávez</a>.
          </footer>
        </main>
      </div>
    </div>
  )
}
