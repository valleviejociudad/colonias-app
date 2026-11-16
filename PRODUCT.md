# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

(Web responsive + PWA instalable en Android/iOS. Mobile web sigue siendo `web`.)

## Users

- **Padres, madres y tutores** de niños/as que se inscriben en las Colonias de Verano de la Municipalidad de Valle Viejo (Catamarca). Completan el formulario de inscripción y ficha médica **mayormente desde el celular**, entrando por un link (típicamente compartido por WhatsApp). Muchos tienen **poca familiaridad con la tecnología**.
- **Coordinadores de colonia** que usan el panel **desde el celular, en la colonia**, para buscar la ficha de un niño/a y llamar o escribir por WhatsApp al tutor ante una urgencia.
- **Personal administrativo municipal** que usa el panel **desde la PC, en la oficina**, para revisar/editar fichas, emitir alertas climáticas, ver estadísticas y gestionar el banco de imágenes.

Ambos usos del panel (celular en campo y PC en oficina) pesan por igual.

## Product Purpose

Digitalizar la inscripción y la ficha médica (control de salud integral) de las Colonias de Verano, para que los datos de salud de cada niño/a estén disponibles de inmediato ante una urgencia, y para comunicar suspensiones por clima a las familias.

Éxito: un padre completa la inscripción sin ayuda desde su celular; un coordinador encuentra una ficha y contacta al tutor en segundos.

## Positioning

Reemplaza la planilla oficial de ficha médica que hasta ahora se llenaba **a mano, en papel**. La diferencia: los datos de salud de cada niño/a quedan buscables al instante desde el celular del coordinador, con el contacto del tutor a un toque, y la familia completa todo desde su casa sin trasladarse ni entregar papeles.

## Operating Context

- Formulario público en `/inscripcion`, sin cuenta ni descarga; debe parecerse lo más posible a un **Formulario de Google** (familiar para los padres).
- Link público privado `/ficha/:token` para que el padre vuelva a ver su ficha.
- Panel en `/admin` con secciones: Fichas Médicas, Estadísticas, Clima & Alertas, Banco de Imágenes. Login en `/login`.
- La ficha médica se imprime / exporta a PDF (planilla oficial).
- Uso al aire libre en verano (sol, pantallas con brillo bajo) en el caso de los coordinadores.

## Capabilities and Constraints

- Stack existente: React 18 + Vite, react-router, framer-motion, lucide-react, @material/web; backend Express + sql.js.
- Detección en tiempo real de DNI ya inscripto; cálculo automático de edad e IMC.
- Difusión de alertas: banner público, email, links de WhatsApp (`wa.me`).
- Terminología local: "colonia", "localidad", "ficha médica", "tutor", "Nº de ficha", "obra social", "Sin TACC".

## Brand Commitments

- **Logos obligatorios**: `logocolonias.png`, `logodeporte.png`, `logovalleviejociudad.png`, `logodeportefichamedica.png`.
- **Colores institucionales obligatorios**: azul / celeste de Valle Viejo (actual primario `#006494`, celeste `#0082a8`).
- Voz: institucional pero cercana, español rioplatense (voseo: "completá", "tocá").

## Evidence on Hand

- Logos en `client/public/`.
- Planilla oficial en `docs/Ficha Medica.pdf`.
- No hay testimonios, cifras ni fotos reales de las colonias en el repo; no inventarlos. Confirmado (2026-11-15): por ahora no hay fotos reales disponibles para la app.

## Product Principles

1. **Lo puede usar cualquiera**: textos grandes, frases cortas, una acción clara por paso, nada que requiera saber de tecnología.
2. **Familiar antes que novedoso**: el formulario se comporta como un Formulario de Google; el panel usa patrones que la gente ya conoce.
3. **La urgencia primero**: en el panel, encontrar a un niño/a y contactar al tutor es la tarea más importante.
4. **Institucional y confiable**: los colores y logos municipales dan confianza a las familias.

## Accessibility & Inclusion

- Público con baja alfabetización digital: tamaños de texto generosos (base ≥16px), contraste alto (WCAG AA mínimo), objetivos táctiles ≥44px, etiquetas siempre visibles (no solo placeholders), mensajes de error claros en lenguaje simple.
- Respetar `prefers-reduced-motion`.
