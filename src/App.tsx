import { useState, type ReactNode } from 'react'
import { BrowserRouter, NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import { supabase } from './lib/supabase'
import { Aviso } from './components/ui'
import Inicio from './pages/Inicio'
import Catalogo from './pages/Catalogo'
import Tarifas from './pages/Tarifas'
import Extras from './pages/Extras'
import Elaboraciones from './pages/Elaboraciones'
import ElaboracionDetalle from './pages/ElaboracionDetalle'
import Platos from './pages/Platos'
import PlatoDetalle from './pages/PlatoDetalle'
import Clientes from './pages/Clientes'
import ClienteDetalle from './pages/ClienteDetalle'
import CartaDetalle from './pages/CartaDetalle'
import Propuesta from './pages/Propuesta'
import Comparables from './pages/Comparables'
import Enciclopedia from './pages/Enciclopedia'
import EnciclopediaFicha from './pages/EnciclopediaFicha'
import Ajustes from './pages/Ajustes'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Puerta />
      </BrowserRouter>
    </AuthProvider>
  )
}

function Puerta() {
  const { session, rol, cargando, salir } = useAuth()
  if (!session) return <Login />
  if (cargando) return <div className="centrado tenue">Cargando…</div>
  if (!rol) {
    return (
      <div className="centrado">
        <div className="tarjeta" style={{ maxWidth: 460 }}>
          <h2>Cuenta sin perfil</h2>
          <p>Tu usuario ({session.user.email}) existe, pero todavía no tiene un rol asignado en PM Verticales. Pide a un administrador que te dé de alta.</p>
          <button onClick={salir}>Salir</button>
        </div>
      </div>
    )
  }
  return (
    <Routes>
      <Route path="/cartas/:id/propuesta" element={<Propuesta />} />
      <Route path="*" element={<Marco />} />
    </Routes>
  )
}

function Marco() {
  const { veCostes, esAdmin, nombre, rol, salir } = useAuth()
  const enlaces: [string, string, boolean][] = [
    ['/', 'Inicio', true],
    ['/clientes', 'Clientes y cartas', true],
    ['/platos', 'Platos', true],
    ['/elaboraciones', 'Elaboraciones', true],
    ['/catalogo', 'Catálogo PM', true],
    ['/tarifas', 'Tarifas', veCostes],
    ['/extras', 'Ingredientes extra', true],
    ['/comparables', 'Comparables de zona', true],
    ['/enciclopedia', 'Enciclopedia', true],
    ['/ajustes', 'Configuración', true],
  ]
  return (
    <div className="marco">
      <aside className="lateral">
        <div className="marca">
          <span className="marca-pm">PM</span> Verticales
          <div className="tenue peq">Hamburguesería</div>
        </div>
        <nav>
          {enlaces.filter((e) => e[2]).map(([to, txt]) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => (isActive ? 'activo' : '')}>{txt}</NavLink>
          ))}
        </nav>
        <div className="usuario">
          <div>{nombre}</div>
          <div className="tenue peq">{rol}{esAdmin ? ' · configura verticales' : ''}</div>
          <CambiarClave />
          <button className="btn-mini" onClick={salir}>Salir</button>
        </div>
      </aside>
      <main className="contenido">
        <Routes>
          <Route path="/" element={<Inicio />} />
          <Route path="/catalogo" element={<Catalogo />} />
          <Route path="/tarifas" element={<SoloCostes><Tarifas /></SoloCostes>} />
          <Route path="/extras" element={<Extras />} />
          <Route path="/elaboraciones" element={<Elaboraciones />} />
          <Route path="/elaboraciones/:id" element={<ElaboracionDetalle />} />
          <Route path="/platos" element={<Platos />} />
          <Route path="/platos/:id" element={<PlatoDetalle />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/clientes/:id" element={<ClienteDetalle />} />
          <Route path="/cartas/:id" element={<CartaDetalle />} />
          <Route path="/comparables" element={<Comparables />} />
          <Route path="/enciclopedia" element={<Enciclopedia />} />
          <Route path="/enciclopedia/fichas/:id" element={<EnciclopediaFicha />} />
          <Route path="/ajustes" element={<Ajustes />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  )
}

function SoloCostes({ children }: { children: ReactNode }) {
  const { veCostes } = useAuth()
  return veCostes ? <>{children}</> : <Aviso tipo="alerta">Tu rol no tiene acceso a tarifas ni costes.</Aviso>
}

function Login() {
  const [email, setEmail] = useState('')
  const [clave, setClave] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [enlace, setEnlace] = useState<string | null>(null)
  return (
    <div className="centrado">
      <form className="tarjeta login" onSubmit={async (e) => {
        e.preventDefault(); if (!clave) return setError('Escribe tu contraseña o pide un enlace por correo.')
        setEnviando(true); setError(null)
        const { error } = await supabase.auth.signInWithPassword({ email, password: clave })
        if (error) setError(error.message === 'Invalid login credentials' ? 'Correo o contraseña incorrectos.' : error.message)
        setEnviando(false)
      }}>
        <div className="marca grande"><span className="marca-pm">PM</span> Verticales</div>
        <p className="tenue">Herramienta de asesoramiento de cartas · Picking Market</p>
        <label className="campo"><span className="campo-et">Correo</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" /></label>
        <label className="campo"><span className="campo-et">Contraseña</span><input type="password" value={clave} onChange={(e) => setClave(e.target.value)} required autoComplete="current-password" /></label>
        {error && <Aviso tipo="error">{error}</Aviso>}
        {enlace && <Aviso tipo="ok">{enlace}</Aviso>}
        <button className="btn-primario" disabled={enviando}>{enviando ? 'Entrando…' : 'Entrar'}</button>
        <button type="button" disabled={enviando || !email} onClick={async () => {
          setEnviando(true); setError(null); setEnlace(null)
          const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: window.location.origin } })
          if (error) setError(error.message)
          else setEnlace('Te he enviado un enlace de acceso. Ábrelo en este mismo navegador.')
          setEnviando(false)
        }}>Recibir enlace de acceso por correo</button>
        <p className="tenue peq">Primera vez: escribe tu correo y pide el enlace. Dentro podrás crear tu contraseña.</p>
      </form>
    </div>
  )
}

function CambiarClave() {
  const [abierto, setAbierto] = useState(false)
  const [c, setC] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  if (!abierto) return <button className="btn-mini" onClick={() => { setAbierto(true); setMsg(null) }}>Crear o cambiar contraseña</button>
  return (
    <form style={{ display: 'flex', flexDirection: 'column', gap: 6 }} onSubmit={async (e) => {
      e.preventDefault()
      if (c.length < 8) return setMsg('Mínimo 8 caracteres.')
      const { error } = await supabase.auth.updateUser({ password: c })
      setMsg(error ? `Error: ${error.message}` : 'Contraseña guardada.')
      if (!error) { setC(''); setAbierto(false) }
    }}>
      <input type="password" value={c} onChange={(e) => setC(e.target.value)} placeholder="Nueva contraseña" autoComplete="new-password" />
      <button className="btn-mini">Guardar</button>
      {msg && <span className="peq">{msg}</span>}
    </form>
  )
}
