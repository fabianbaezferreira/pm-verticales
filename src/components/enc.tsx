import { Etiqueta } from './ui'
import { ESTADOS, estadoInfo, validacionInfo } from '../lib/enciclopedia'

export function EtqEstado({ estado }: { estado: string }) {
  const e = estadoInfo(estado)
  return <Etiqueta tono={e.tono}>{e.l}</Etiqueta>
}

export function EtqValidacion({ validacion }: { validacion: string }) {
  const e = validacionInfo(validacion)
  return <Etiqueta tono={e.tono}>{e.l}</Etiqueta>
}

export function SelectEstado({ valor, onChange, deshabilitado }: { valor: string; onChange: (v: string) => void; deshabilitado?: boolean }) {
  return (
    <select value={valor} disabled={deshabilitado} onChange={(e) => onChange(e.target.value)}>
      {ESTADOS.map((e) => <option key={e.v} value={e.v}>{e.l}</option>)}
    </select>
  )
}
