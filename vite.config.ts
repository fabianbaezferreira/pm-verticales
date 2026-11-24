import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Puerto 3000: coincide con la URL del sitio por defecto de Supabase Auth,
// para que los enlaces de acceso por correo vuelvan a la app en local.
export default defineConfig({
  plugins: [react()],
  server: { port: 3000, strictPort: true, open: true },
})
