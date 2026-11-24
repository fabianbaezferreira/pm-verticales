import { useState } from 'react'
import { eur, num, pct } from '../lib/format'
import { NumInput } from './ui'

type Props = {
  coste: number | null
  iva: number
  /** Valores propios del plato (null = hereda de la categoría o general). */
  multiplicador: number | null
  foodCost: number | null
  /** Valores efectivos tras la herencia, para mostrarlos como referencia. */
  multiplicadorEfectivo: number
  origenMultiplicador: string
  foodCostEfectivo: number | null
  editable: boolean
  onGuardar: (c: { multiplicador?: number | null; food_cost_objetivo?: number | null }) => void
}

/**
 * Food cost, multiplicador y PVP están enlazados: k = 1 / FC y PVP = coste × k.
 * Cambiar cualquiera recalcula los otros dos al momento; se guarda solo lo que elija el asesor.
 */
export default function CalculadoraPvp(p: Props) {
  const [pvpDeseado, setPvpDeseado] = useState<number | null>(null)
  const c = p.coste
  const conIva = (v: number | null) => (v == null ? null : v * (1 + p.iva))

  // Escenario desde PVP de carta deseado (con IVA)
  const sinIvaDeseado = pvpDeseado == null ? null : pvpDeseado / (1 + p.iva)
  const kDeseado = c && sinIvaDeseado ? sinIvaDeseado / c : null
  const fcDeseado = c && sinIvaDeseado ? c / sinIvaDeseado : null

  const fila = (titulo: string, k: number | null, fc: number | null, nota?: string) => {
    const sin = c != null && k != null ? c * k : null
    return (
      <tr>
        <td>{titulo}{nota && <div className="tenue peq">{nota}</div>}</td>
        <td className="der">{num(k == null ? null : Math.round(k * 100) / 100)}</td>
        <td className="der">{pct(fc)}</td>
        <td className="der">{eur(sin)}</td>
        <td className="der"><b>{eur(conIva(sin))}</b></td>
        <td className="der">{eur(sin != null && c != null ? sin - c : null)}</td>
      </tr>
    )
  }

  return (
    <div>
      <div className="rejilla">
        <label className="campo">
          <span className="campo-et">Multiplicador del plato</span>
          <NumInput ancho={120} valor={p.multiplicador} placeholder={num(p.multiplicadorEfectivo)} deshabilitado={!p.editable}
            onGuardar={(n) => p.onGuardar({ multiplicador: n })} />
          <span className="campo-ayuda">{p.multiplicador == null ? `Vacío: hereda ${num(p.multiplicadorEfectivo)} (${p.origenMultiplicador})` : `Equivale a food cost ${pct(1 / p.multiplicador)}`}</span>
        </label>
        <label className="campo">
          <span className="campo-et">Food cost objetivo del plato (%)</span>
          <NumInput ancho={120} valor={p.foodCost == null ? null : Math.round(p.foodCost * 1000) / 10}
            placeholder={p.foodCostEfectivo == null ? '—' : String(Math.round(p.foodCostEfectivo * 1000) / 10).replace('.', ',')}
            deshabilitado={!p.editable} onGuardar={(n) => p.onGuardar({ food_cost_objetivo: n == null ? null : n / 100 })} />
          <span className="campo-ayuda">{p.foodCost == null ? (p.foodCostEfectivo == null ? 'Sin definir (ni plato ni categoría)' : `Vacío: hereda ${pct(p.foodCostEfectivo)} de la categoría`) : `Equivale a multiplicador ${num(Math.round((1 / p.foodCost) * 100) / 100)}`}</span>
        </label>
        <label className="campo">
          <span className="campo-et">Simular PVP de carta (con IVA)</span>
          <NumInput ancho={120} valor={pvpDeseado} placeholder="p. ej. 12,90" onGuardar={setPvpDeseado} />
          <span className="campo-ayuda">No guarda nada: muestra qué FC y multiplicador supone.</span>
        </label>
      </div>

      <table className="tabla" style={{ marginTop: 12 }}>
        <thead><tr><th>Escenario</th><th className="der">Multiplicador</th><th className="der">Food cost</th><th className="der">PVP sin IVA</th><th className="der">Carta con IVA</th><th className="der">Margen</th></tr></thead>
        <tbody>
          {fila('Por multiplicador', p.multiplicadorEfectivo, 1 / p.multiplicadorEfectivo, p.origenMultiplicador)}
          {p.foodCostEfectivo != null && fila('Por food cost objetivo', 1 / p.foodCostEfectivo, p.foodCostEfectivo)}
          {kDeseado != null && fila('PVP simulado', kDeseado, fcDeseado)}
        </tbody>
      </table>
      {kDeseado != null && p.editable && (
        <div className="acciones" style={{ marginTop: 8 }}>
          <button onClick={() => p.onGuardar({ multiplicador: Math.round(kDeseado * 10000) / 10000 })}>Guardar como multiplicador del plato ({num(Math.round(kDeseado * 100) / 100)})</button>
          <button onClick={() => p.onGuardar({ food_cost_objetivo: Math.round(fcDeseado! * 10000) / 10000 })}>Guardar como food cost objetivo ({pct(fcDeseado)})</button>
        </div>
      )}
      {c == null && <p className="tenue peq">Sin coste completo todavía: los precios aparecerán cuando todos los componentes tengan precio.</p>}
      <p className="tenue peq">Estos son los valores por defecto del plato. En cada carta puedes sobrescribirlos para ese cliente sin tocar el plato.</p>
    </div>
  )
}
