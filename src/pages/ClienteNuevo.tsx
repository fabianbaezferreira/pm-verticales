import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { cargarVertical } from '../lib/hooks'
import { Aviso, Cabecera } from '../components/ui'
import FormCliente, { CLIENTE_VACIO } from '../components/FormCliente'

export default function ClienteNuevo() {
  const nav = useNavigate()
  const { edita, veCostes } = useAuth()
  if (!edita) return <Aviso tipo="alerta">Tu rol no puede dar de alta clientes.</Aviso>
  return (
    <>
      <Cabecera titulo="Alta de nuevo cliente" sub={<Link to="/clientes">← Clientes</Link>} />
      <FormCliente inicial={CLIENTE_VACIO} editable veCostes={veCostes} textoBoton="Dar de alta" onCancelar={() => nav('/clientes')}
        onGuardar={async (d) => {
          const v = await cargarVertical()
          const { data, error } = await supabase.from('clientes').insert({ ...d, vertical_id: v.vertical.id }).select('id').single()
          if (error) return error.message
          nav(`/clientes/${data.id}`)
          return null
        }} />
    </>
  )
}
