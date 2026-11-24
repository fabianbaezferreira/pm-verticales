import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

export type Rol = 'admin' | 'asesor' | 'comercial' | 'direccion'

type Ctx = {
  session: Session | null
  rol: Rol | null
  nombre: string | null
  cargando: boolean
  /** Ve costes, tarifas y escandallos (la base de datos lo impone igualmente con RLS). */
  veCostes: boolean
  /** Edita recetas, clientes y cartas. */
  edita: boolean
  esAdmin: boolean
  salir: () => Promise<void>
}

const AuthCtx = createContext<Ctx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [rol, setRol] = useState<Rol | null>(null)
  const [nombre, setNombre] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  // Depende del id del usuario y no del objeto de sesión: Supabase renueva la sesión al volver a la ventana
  // (p. ej. tras abrir el selector de archivos) y eso no debe recargar la app ni borrar lo que hay en pantalla.
  const userId = session?.user.id ?? null
  useEffect(() => {
    let vivo = true
    async function cargar() {
      if (!userId) { setRol(null); setNombre(null); setCargando(false); return }
      setCargando(true)
      const { data } = await supabase.from('perfiles').select('rol, nombre').eq('user_id', userId).maybeSingle()
      if (!vivo) return
      setRol((data?.rol as Rol) ?? null)
      setNombre(data?.nombre ?? null)
      setCargando(false)
    }
    cargar()
    return () => { vivo = false }
  }, [userId])

  const value: Ctx = {
    session, rol, nombre, cargando,
    veCostes: rol === 'admin' || rol === 'asesor' || rol === 'direccion',
    edita: rol === 'admin' || rol === 'asesor',
    esAdmin: rol === 'admin',
    salir: async () => { await supabase.auth.signOut() },
  }
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}

export function useAuth() {
  const c = useContext(AuthCtx)
  if (!c) throw new Error('useAuth fuera de AuthProvider')
  return c
}
