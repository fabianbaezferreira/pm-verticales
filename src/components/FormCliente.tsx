import { useState, type FormEvent } from 'react'
import { CANALES, EQUIPOS, RESTRICCIONES } from '../lib/format'
import { Aviso, Campo, Fichas, NumInput } from './ui'

export type DatosFormCliente = {
  nombre: string; zona: string | null; concepto: string | null; ticket_medio: number | null; fecha_apertura: string | null
  contacto_nombre: string | null; contacto_telefono: string | null; contacto_email: string | null
  equipos: string[]; equipos_otros: string | null; personal: string | null; horario: string | null
  canales: string[]; restricciones: string[]; multiplicador: number | null; notas: string | null
}

export const CLIENTE_VACIO: DatosFormCliente = {
  nombre: '', zona: null, concepto: null, ticket_medio: null, fecha_apertura: null,
  contacto_nombre: null, contacto_telefono: null, contacto_email: null,
  equipos: [], equipos_otros: null, personal: null, horario: null,
  canales: ['sala'], restricciones: [], multiplicador: null, notas: null,
}

type Props = {
  inicial: DatosFormCliente
  onGuardar: (d: DatosFormCliente) => Promise<string | null>
  textoBoton: string
  editable: boolean
  veCostes: boolean
  onCancelar?: () => void
}

/** Formulario de cliente por apartados. Se usa para el alta y para editar la ficha. */
export default function FormCliente({ inicial, onGuardar, textoBoton, editable, veCostes, onCancelar }: Props) {
  const [d, setD] = useState<DatosFormCliente>(inicial)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const cambiado = JSON.stringify(d) !== JSON.stringify(inicial)
  const set = <K extends keyof DatosFormCliente>(k: K, v: DatosFormCliente[K]) => { setD({ ...d, [k]: v }); setOk(null) }
  const txt = (k: keyof DatosFormCliente) => ({
    value: (d[k] as string | null) ?? '', disabled: !editable,
    onChange: (e: { target: { value: string } }) => set(k, (e.target.value || null) as never),
  })

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (!d.nombre.trim()) return setError('El nombre es obligatorio.')
    if (d.contacto_email && !/^\S+@\S+\.\S+$/.test(d.contacto_email)) return setError('El correo de contacto no parece válido.')
    if (d.equipos.length === 0 && !confirm('No has marcado ningún equipo de cocina: la carta no podrá filtrar platos por compatibilidad. ¿Guardar igualmente?')) return
    setGuardando(true); setError(null)
    const err = await onGuardar({ ...d, nombre: d.nombre.trim() })
    setGuardando(false)
    if (err) setError(err); else setOk('Guardado.')
  }

  return (
    <form onSubmit={enviar}>
      <div className="tarjeta">
        <h2>1 · Datos del proyecto</h2>
        <div className="rejilla">
          <Campo etiqueta="Nombre del local o proyecto *"><input value={d.nombre} disabled={!editable} required autoFocus={!inicial.nombre} onChange={(e) => set('nombre', e.target.value)} /></Campo>
          <Campo etiqueta="Zona / barrio / ciudad" ayuda="Se usa para los comparables de precio"><input {...txt('zona')} /></Campo>
          <Campo etiqueta="Ticket medio objetivo (€ con IVA)"><NumInput ancho={140} valor={d.ticket_medio} deshabilitado={!editable} onGuardar={(v) => set('ticket_medio', v)} /></Campo>
          <Campo etiqueta="Fecha prevista de apertura"><input type="date" {...txt('fecha_apertura')} /></Campo>
          <Campo etiqueta="Concepto" ancho="completo" ayuda="Tipo de hamburguesería, público, estilo, referencias"><textarea {...txt('concepto')} /></Campo>
        </div>
      </div>

      <div className="tarjeta">
        <h2>2 · Contacto</h2>
        <div className="rejilla">
          <Campo etiqueta="Persona de contacto"><input {...txt('contacto_nombre')} /></Campo>
          <Campo etiqueta="Teléfono"><input type="tel" {...txt('contacto_telefono')} /></Campo>
          <Campo etiqueta="Correo"><input type="email" {...txt('contacto_email')} /></Campo>
        </div>
      </div>

      <div className="tarjeta">
        <h2>3 · Cocina</h2>
        <div className="rejilla">
          <Campo etiqueta="Equipos disponibles" ancho="completo" ayuda="Solo se proponen platos compatibles con estos equipos">
            <Fichas opciones={EQUIPOS} valor={d.equipos} deshabilitado={!editable} onChange={(v) => set('equipos', v)} />
          </Campo>
          <Campo etiqueta="Otros equipos"><input {...txt('equipos_otros')} placeholder="Abatidor, envasadora…" /></Campo>
          <Campo etiqueta="Personal de cocina"><input {...txt('personal')} placeholder="p. ej. 2 cocineros por turno" /></Campo>
          <Campo etiqueta="Horario"><input {...txt('horario')} placeholder="Comidas y cenas, cierra lunes" /></Campo>
        </div>
      </div>

      <div className="tarjeta">
        <h2>4 · Venta y restricciones</h2>
        <div className="rejilla">
          <Campo etiqueta="Canales" ancho="completo" ayuda="Con delivery, la carta avisa de los platos no aptos para transporte">
            <Fichas opciones={CANALES} valor={d.canales} deshabilitado={!editable} onChange={(v) => set('canales', v)} />
          </Campo>
          <Campo etiqueta="Restricciones obligatorias" ancho="completo">
            <Fichas opciones={RESTRICCIONES} valor={d.restricciones} deshabilitado={!editable} onChange={(v) => set('restricciones', v)} />
          </Campo>
        </div>
      </div>

      <div className="tarjeta">
        <h2>5 · Otros</h2>
        <div className="rejilla">
          {veCostes && (
            <Campo etiqueta="Multiplicador del cliente" ayuda="Opcional. Se aplica a sus cartas salvo que el plato o la carta tengan uno propio">
              <NumInput ancho={120} valor={d.multiplicador} deshabilitado={!editable} onGuardar={(v) => set('multiplicador', v)} />
            </Campo>
          )}
          <Campo etiqueta="Notas" ancho="completo"><textarea {...txt('notas')} /></Campo>
        </div>
      </div>

      {error && <Aviso tipo="error">{error}</Aviso>}
      {ok && !cambiado && <Aviso tipo="ok">{ok}</Aviso>}
      {editable && (
        <div className="acciones" style={{ position: 'sticky', bottom: 0, background: 'var(--fondo)', padding: '10px 0' }}>
          <button className="btn-primario" disabled={guardando || (!cambiado && !!inicial.nombre)}>{guardando ? 'Guardando…' : textoBoton}</button>
          {onCancelar && <button type="button" onClick={onCancelar}>Cancelar</button>}
          {cambiado && inicial.nombre && <span className="tenue peq">Hay cambios sin guardar</span>}
        </div>
      )}
    </form>
  )
}
