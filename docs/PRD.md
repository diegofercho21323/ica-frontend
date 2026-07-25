# ICA Frontend: PRD consolidado del MVP

| Campo | Valor |
|---|---|
| Producto | ICA, captura ciega de inventario físico |
| Versión | 1.1, revisión consolidada |
| Estado | Base de producto para implementación del MVP de hackathon |
| Audiencia | Producto, diseño, frontend, backend, QA y operación |
| Fuentes verificadas | README; issues [#1](https://github.com/diegofercho21323/ica-frontend/issues/1) y [#2](https://github.com/diegofercho21323/ica-frontend/issues/2); SDD y código actual de `ica-backend` |

> Esta versión 1.1 reemplaza el borrador inicial 1.0 para el alcance del MVP. Conserva sus objetivos de operación sin papel, captura rápida, experiencia ciega, accesibilidad y uso en tableta, y corrige sus contradicciones con las decisiones de producto y el contrato backend verificado.

## 1. Resumen ejecutivo

ICA digitaliza el conteo físico ciego de inventario en bodegas. El operador selecciona una bodega, registra cada cantidad física absoluta en la unidad oficial del ERP, revisa pendientes, finaliza una versión inmutable y la envía de forma idempotente. Si el ERP y el líder de costos determinan que algunas líneas requieren reconteo, ICA crea una versión ciega nueva únicamente con esas líneas.

**Límite esencial:** ICA captura evidencia física; el ERP compara inventario teórico contra físico. El líder de costos interpreta las diferencias fuera de ICA y elige las líneas específicas que se deben recontar.

## 2. Problema y oportunidad

El proceso basado en formatos físicos y transcripción manual aumenta tiempos, errores, duplicidad y pérdida de trazabilidad. Además, mostrar existencias teóricas o conteos anteriores puede sesgar al operador.

El MVP debe demostrar que una persona puede completar y entregar un conteo físico confiable desde una tableta, sin papel y sin información que condicione su observación. La meta aspiracional es capturar cada artículo en menos de cinco segundos después de identificarlo; no es un compromiso contractual mientras no exista medición de campo.

## 3. Objetivo del producto

Entregar una experiencia de captura ciega, rápida y auditable que:

- reduzca la transcripción manual y el uso de papel;
- preserve cantidades absolutas, unidad ERP, método, actor y momento de captura;
- diferencie explícitamente cero, pendiente y no encontrado;
- permita corregir y revisar antes del cierre;
- bloquee cada versión finalizada;
- tolere reintentos de envío sin duplicar efectos;
- soporte reconteos parciales, ciegos y versionados.

## 4. Fronteras y propiedad funcional

| Responsabilidad | Propietario | ICA muestra o calcula |
|---|---|---|
| Capturar cantidad física absoluta | ICA | Sí |
| Validar unidad ERP exacta, precisión y estado | ICA | Sí |
| Bloquear, versionar y finalizar intentos | ICA | Sí |
| Enviar conteos absolutos y conservar recibos | ICA | Sí, con ERP simulado en el MVP |
| Comparar teórico contra físico | ERP | No |
| Interpretar diferencias y decidir reconteos | Líder de costos, con información del ERP | ICA solo recibe la selección dirigida |
| Calcular varianza, compatibilidad, ranking, causa o demanda | Fuera de ICA | No |

**No se permite en ICA:** stock teórico, diferencia, delta, desviación, porcentaje de compatibilidad, ranking, explicación de causa, recomendación automática, análisis de demanda o abastecimiento.

## 5. Stakeholders y personas

| Persona | Necesidad principal | Permisos deseados en frontend |
|---|---|---|
| Operador de bodega | Contar rápido sin sesgo ni papel | Iniciar captura autorizada, registrar/editar/revisar, finalizar, enviar y atender reconteos asignados |
| Líder de costos | Solicitar verificación de líneas concretas | Crear reconteo dirigido y consultar estado operativo de envío y versiones |
| Equipo ERP/finanzas | Recibir cantidades físicas confiables | Comparar e interpretar fuera de ICA |
| Producto/operaciones | Validar velocidad y adopción | Consultar progreso operativo no sensible |
| Tecnología/QA | Entregar un flujo verificable y reemplazable | Contratos tipados, mocks deterministas, observabilidad y pruebas |

**Brecha de autorización:** el backend actual permite que cualquier usuario autenticado invoque el envío de un intento finalizado, mientras que el reconteo exige que el correo esté en `ICA_COST_LEADER_EMAILS`. La política frontend deseada limita la acción normal de envío al operador y la creación de reconteos al líder de costos, pero esto no sustituye autorización de servidor. La alineación de roles de envío es una dependencia antes de producción.

**Brecha de navegación:** el backend no expone todavía endpoints verificados para listar asignaciones, historial de versiones o recibos, y `POST /sessions` no devuelve `session_id`, aunque crear un reconteo lo requiere. Estas vistas deben usar mocks en la demo o retener contexto solo dentro de la misma sesión local; necesitan ampliación contractual para un flujo multiusuario real.

## 6. Decisiones que reemplazan el borrador 1.0

| Tema del borrador | Decisión consolidada 1.1 |
|---|---|
| Secuencia rígida | Guardar avanza automáticamente, pero el operador puede buscar, editar y revisar cualquier línea antes de finalizar. |
| Visualización de diferencias | ICA no muestra inventario teórico ni diferencias; el análisis pertenece al ERP. |
| OCR como capacidad central | OCR es una demostración opcional/futura y nunca evita confirmación ni validación de unidad. |
| Asignaciones y progreso del dashboard | Pueden simularse hasta que exista planificación/scheduling backend verificable. |
| Estado visual `Omitido` | Se representa como `NOT_COUNTED` o como `NOT_FOUND` explícito; nunca se transforma silenciosamente en cero. |
| Reconteo del líder de costos | Es dirigido a una selección no vacía de líneas, no a todo el inventario. |

## 7. Principios de experiencia

1. **Completamente ciega:** no exponer stock ERP, conteos previos ni análisis.
2. **Cero papel:** el flujo principal ocurre de extremo a extremo en ICA.
3. **Una línea actual:** asistente/escáner centrado en un artículo, con contexto mínimo y avance automático después de guardar.
4. **Control antes del cierre:** búsqueda, edición, navegación y revisión permanecen disponibles hasta finalizar.
5. **Keyboard-first:** captura, guardado, navegación, búsqueda y diálogos operables sin puntero.
6. **Tableta primero:** controles grandes, alto contraste y diseño adaptable a móvil y escritorio.
7. **Reconocimiento sobre memoria:** nombre, unidad ERP completa, estado y acción principal siempre visibles.
8. **Velocidad con seguridad:** el KPI de menos de cinco segundos no justifica saltarse confirmaciones o validaciones.

## 8. Modos de conteo

| Modo | Inicio | Descubrimiento | Completitud |
|---|---|---|---|
| `GUIDED` | Todas las líneas de la bodega están disponibles | ICA presenta un artículo a la vez | Pendientes visibles en revisión y finalización |
| `MANUAL` | La vista del operador inicia vacía | Escaneo, búsqueda por código o adición progresiva | Consulta bajo demanda revela identidades pendientes sin valores ERP/auditoría |

En ambos modos, guardar una línea avanza a la siguiente disponible. El avance no elimina el historial editable del intento actual ni impide buscar una línea previa.

## 9. Reglas de cantidad y ERP-UOM

- Mostrar siempre la unidad ERP completa y prominente junto al campo de cantidad.
- Enviar `unit` obligatoria y exactamente igual a la unidad autoritativa recibida.
- No convertir ni inferir unidades por nombre, empaque o relaciones como g/kg, ml/L, galón/paquete o masa/volumen.
- Aceptar cero y cantidades decimales no negativas con máximo seis decimales.
- Rechazar valores negativos, no finitos o con más de seis decimales.
- No bloquear valores altos si no existe `soft_limit_quantity` configurado.
- Si existe límite blando y se supera, mostrar confirmación consultiva y reenviar la misma cantidad con `confirm_unusual_quantity: true`.
- La confirmación nunca modifica, redondea ni limita automáticamente la cantidad.
- Para `NOT_FOUND`, la cantidad debe ser `null`; se conserva unidad, método y actor.

## 10. Estados del dominio

### Estados de línea

| Backend | Significado visual | Cantidad | Cuenta como pendiente |
|---|---|---:|---|
| `NOT_COUNTED` | Pendiente/sin contar | `null` | Sí |
| `COUNTED` | Contado con valor positivo | Decimal | No |
| `COUNTED_ZERO` | Contado y confirmado en cero | `0` | No |
| `NOT_FOUND` | Artículo buscado y no encontrado físicamente | `null` | No |

### Estados de intento y envío

| Estado | Comportamiento frontend |
|---|---|
| En captura | Editable; admite guardado, búsqueda y revisión |
| Finalización con pendientes | Solicita confirmación explícita después de recibir `422` |
| Finalizado/bloqueado | Inmutable; controles de edición deshabilitados; cambios posteriores pueden recibir `409` |
| `PENDING` | Estado backend interno durante el envío; en frontend se representa como solicitud en curso, no como respuesta terminal ni polling verificable |
| `SUCCEEDED` | Recibo exitoso y referencia ERP simulada disponible |
| `FAILED` | Intento sigue bloqueado; se permite reintento con la misma clave |

## 11. Métodos de captura

| Método | Requisito |
|---|---|
| Teclado | Campo numérico enfocado, unidad visible y guardado rápido |
| Incremento | Controles grandes; el valor final conserva las mismas validaciones |
| Voz, demo | Solo reconocimiento numérico; asociado a la unidad ERP mostrada y sujeto a confirmación antes de guardar |
| Código de barras | Busca dentro del intento; si no existe, permite adición manual con nombre y unidad explícitos |
| OCR, demo/futuro | Sugiere un valor; requiere confirmación humana y no evita unidad, precisión ni reglas de estado |

Atajos mínimos propuestos, configurables y documentados en la ayuda: `Enter` guardar/continuar, `Ctrl+K` buscar, flechas anterior/siguiente y `Esc` cerrar diálogo. No deben interferir con tecnologías de asistencia ni con edición de campos.

## 12. Flujos principales

### 12.1 Acceso y selección

1. La persona se autentica mediante la capacidad del template vigente.
2. ICA valida la sesión y determina capacidades visibles.
3. El dashboard muestra bodegas/scopes y, si aplica, asignaciones o progreso simulado claramente etiquetado.
4. La persona selecciona bodega y modo `GUIDED` o `MANUAL`.

### 12.2 Captura guiada o manual

1. ICA muestra una sola línea actual con nombre y unidad ERP completa.
2. El operador captura por teclado, incremento, voz demo o escaneo.
3. ICA valida cantidad, unidad, estado y eventual confirmación consultiva.
4. Guarda con una `Idempotency-Key` estable y avanza automáticamente.
5. El operador puede buscar, volver, corregir o marcar `NOT_FOUND` antes de finalizar.

### 12.3 Revisión y finalización

1. El operador abre la revisión de contados y pendientes.
2. La consulta de completitud muestra solo identidades y unidades pendientes.
3. Si quedan pendientes, finalizar sin confirmación recibe `422` y abre un diálogo explícito.
4. Al confirmar, ICA finaliza y presenta la versión bloqueada.

### 12.4 Envío y recuperación

1. El operador envía el intento bloqueado sin body y con clave idempotente estable.
2. ICA muestra estado en curso y luego el recibo `SUCCEEDED` o `FAILED`.
3. Ante fallo o timeout, conserva la misma clave para el reintento del mismo payload.
4. Un replay exitoso usa el recibo retornado sin duplicar efectos visuales.
5. Un `409` por payload distinto bloquea el reintento automático y exige recuperación deliberada.

### 12.5 Reconteo dirigido y versión 2+

1. El ERP compara teórico contra físico; el líder de costos interpreta el resultado fuera de ICA.
2. El líder abre la última versión finalizada, selecciona una o más líneas y asigna un operador.
3. ICA crea una versión 2+ únicamente con esas líneas y sin cantidades previas.
4. El operador asignado repite captura, revisión y finalización con las mismas reglas.
5. La nueva versión se reenvía por el mismo contrato idempotente; las versiones anteriores permanecen inmutables.

## 13. Módulos, pantallas y componentes

| Módulo/pantalla | Componentes principales | Alcance MVP |
|---|---|---|
| Acceso | Formulario de autenticación, estado de sesión | Integración condicionada al template backend |
| Dashboard | Selector de bodega, modo, progreso, asignaciones | Progreso/asignaciones pueden ser mock |
| Captura | Tarjeta de artículo actual, cantidad, unidad, escáner, voz, incremento, acciones de estado | Core |
| Búsqueda y navegación | Buscador, resultados, anterior/siguiente, edición | Core |
| Revisión | Lista adaptable, filtros por estado, pendientes, edición | Core |
| Finalización | Resumen ciego, diálogo de pendientes, estado bloqueado | Core |
| Envío | Estado, recibo, referencia simulada, reintento, conflicto | Core; consulta posterior mock hasta disponer de endpoint GET |
| Reconteo líder | Selector de líneas, asignación, versión/estado | Core mock-backed por brechas de navegación/consulta |
| Historial | Versiones, lock y estado de envío sin cantidades previas en captura | Mock; no existe endpoint de listado verificado |
| Ayuda | Atajos, escaneo, estados y accesibilidad | Deseable |
| OCR/voz | Diálogos de sugerencia y confirmación | Demo opcional |

Primitivas compartidas previstas: `Button`, `NumericInput`, `SearchInput`, `Modal`, `Drawer`, `Status`, `Progress`, `Table`, `ItemCard`, `UnitBadge`, `ScannerTrigger` y `LiveRegion` en `shared/ui/primitives/`, sin lógica de negocio.

## 14. Requisitos no funcionales

### Responsive y accesibilidad

- Diseño mobile-first; tableta vertical y horizontal son objetivos primarios.
- Objetivos táctiles grandes, foco visible, contraste conforme a WCAG 2.2 AA y estados no dependientes solo del color.
- HTML semántico, labels asociados, botones icónicos con nombre accesible y diálogos con foco controlado.
- Errores y cambios de envío anunciados mediante regiones vivas; contenedores en carga con `aria-busy`.
- Tablas convertibles a tarjetas o con desplazamiento horizontal seguro en pantallas pequeñas.
- Flujo principal completamente operable con teclado.

### Internacionalización

- Todo texto de interfaz pasa por `t()`; no se permiten strings de usuario hardcodeadas en JSX.
- Cantidades se editan sin perder exactitud contractual y se presentan con formato local.
- Unidades técnicas y estados enviados al API no se traducen; sus etiquetas visuales sí.
- Español es el idioma inicial; la estructura debe admitir nuevos locales.

### Offline y PWA

- Instalable como PWA, con shell y recursos estáticos cacheables.
- El backend soporta replay idempotente demorado, no resolución completa de conflictos offline.
- Para la demo, el frontend puede encolar localmente capturas pendientes con intento, body y clave idempotente; debe indicar que no están sincronizadas.
- La cola no habilita edición de intentos que el servidor reporte bloqueados ni resuelve por sí sola conflictos `409`.
- Datos sensibles y tokens requieren política de almacenamiento, expiración y borrado antes de producción.
- La sincronización offline multiusuario y la reconciliación de versiones quedan diferidas.

## 15. Arquitectura frontend

### Stack aprobado para el MVP

| Área | Tecnología | Uso |
|---|---|---|
| Aplicación | React 19, TypeScript, Vite | UI y build |
| UI | Ant Design 5 | Componentes accesibles y responsive, adaptados por tokens |
| Datos de servidor | TanStack Query | Queries, mutaciones, retry e invalidación |
| Rutas | React Router 7 | Acceso, captura, revisión, envío y reconteo |
| Formularios | React Hook Form | Captura, validación y diálogos |
| HTTP | Axios | Adaptador HTTP futuro e interceptores controlados |
| PWA | Plugin PWA compatible con Vite | Shell instalable y cola demo limitada |
| Voz | Web Speech API | Demo numérica opcional |
| OCR | Adaptador por definir | Demo opcional, aislada del core |
| Estado cliente compartido | Zustand, opcional | Solo si un estado de workflow realmente cruza pantallas y no pertenece al servidor |

### Capas FSD estrictas

```text
src/
├── app/                    # providers, router, i18n, configuración
├── pages/                  # composición delgada por ruta
├── features/               # capture, review, submission, recount, session
└── shared/
    ├── ui/primitives/      # UI reutilizable sin negocio
    └── lib/                # API ports/adapters, query client, utilidades y tipos comunes
```

Reglas:

- Dependencia descendente: `app/` y `pages/` componen `features/`; `features/` depende de `shared/`.
- No hay imports entre features; la coordinación ocurre en páginas o contratos compartidos mínimos.
- TanStack Query es la única fuente para estado de servidor.
- Estado local usa React/React Hook Form; Zustand requiere una necesidad compartida demostrable.
- Ningún `style` inline salvo valores realmente dinámicos; estilos y tokens se centralizan.
- Toda cadena visible se obtiene mediante `t()`.
- Los componentes de feature consumen un puerto tipado, no Axios directamente.

### API no publicada: estrategia de integración

Definir un `InventoryApiPort` tipado y dos adaptadores:

1. `MockInventoryApiAdapter`, determinista y alineado con el contrato actual.
2. `HttpInventoryApiAdapter`, deshabilitado hasta recibir URL, CORS, autenticación y entorno publicados.

La selección ocurre en `app/` por configuración. Cambiar `baseURL` o adaptador no debe reescribir páginas ni features. Los mocks deben cubrir éxito, advisory, errores, retry, replay, lock, autorización y versión 2+.

## 16. Sistema visual

- Basar tema, jerarquía y tokens de Ant Design en la identidad de Colsubsidio.
- Definir tokens semánticos para acción primaria, fondo, superficie, texto, foco, éxito, advertencia y error.
- Priorizar alto contraste, tipografía legible, densidad baja y controles grandes de operación.
- No inventar valores hexadecimales, logotipos, tipografías ni assets.
- **Pendiente:** validar paleta exacta, manual de marca, licencias y activos oficiales con Colsubsidio antes de cerrar el tema.

## 17. Preparación verificada del backend

| Capacidad | Estado verificado | Tratamiento frontend |
|---|---|---|
| Fixture de referencia | 8 scopes, 1.405 filas persistidas | Mock equivalente; no copiar SD al modelo operador |
| Conteo `GUIDED`/`MANUAL` | Persistente; unidad exacta, estados, completitud y finalización | Implementar contra puerto tipado |
| Precisión/evidencia | Máximo seis decimales; actor/tiempo; `NOT_FOUND` durable | Validación espejo sin sustituir servidor |
| Envío ERP | Recibos simulados, retry e idempotencia persistentes | Mostrar siempre como integración simulada |
| Reconteo | Selección dirigida por sesión, ciega, versión 2+ | Mock-backed hasta publicar API |
| Navegación operativa | Sin listado verificado de asignaciones, versiones o recibos; inicio no retorna `session_id` | Mock y dependencia explícita |
| API | Local, privada, no publicada y no desplegada | Sin integración HTTP real todavía |
| Oracle | No existe integración real | Fuera del MVP; no afirmar conexión ERP productiva |

### Preparación de ingeniería

La verificación final backend demuestra **6/6 requisitos, 18/18 escenarios y 62/62 pruebas habilitadas con PostgreSQL**. Migraciones `0001` a `0005`, fixture, conteo, precisión, evidencia, envío, reconteo y replay pasaron funcionalmente.

El reporte SDD conserva veredicto **FAIL por proceso histórico**: solo 2/16 tareas originales tienen evidencia Strict TDD RED/safety-net completa. Es una carencia de evidencia histórica y no un defecto funcional visible para el usuario. El backend no debe describirse como aprobado, archive-ready, publicado o productivo.

## 18. Roadmap de cuatro días

| Día | Prioridad | Entregable verificable |
|---|---|---|
| 1 | Fundaciones y contrato | Vite/React/TS, FSD, router/providers/i18n, tokens base, puerto API, tipos y mock de scopes/sesiones |
| 2 | Captura core | Selección, `GUIDED`/`MANUAL`, una línea actual, teclado, barcode/search/add, unidad exacta, estados y autosiguiente editable |
| 3 | Cierre y envío | Revisión, completitud, finalización/lock, idempotencia, recibos, fallo/retry y responsive/a11y core |
| 4 | Reconteo y demostración | Flujo líder dirigido, asignación mock, v2+ ciega, resubmission, pruebas críticas y PWA demo limitada |

Voz y OCR se trabajan únicamente si el flujo core y sus pruebas están verdes. Su pulido no desplaza captura, revisión, finalización, envío o reconteo.

## 19. Criterios de aceptación

### Operador y captura

- [ ] Puede seleccionar un scope mock y comenzar `GUIDED` o `MANUAL`.
- [ ] Nunca ve stock teórico, diferencias, compatibilidad ni conteos anteriores.
- [ ] Ve la unidad ERP completa y solo guarda con esa unidad exacta.
- [ ] Puede registrar decimal no negativo, cero explícito o `NOT_FOUND` sin cantidad.
- [ ] Más de seis decimales se rechazan; un valor alto sin límite configurado no se bloquea.
- [ ] Un advisory configurado exige confirmación y conserva la cantidad exacta.
- [ ] Guardar avanza, pero buscar, editar y revisar sigue disponible antes de finalizar.
- [ ] `NOT_COUNTED`, `COUNTED`, `COUNTED_ZERO` y `NOT_FOUND` son distinguibles sin depender solo del color.

### Cierre, envío y reconteo

- [ ] Finalizar con pendientes requiere confirmación explícita y luego bloquea la versión.
- [ ] Cada batch y envío usa una clave idempotente estable para sus reintentos.
- [ ] Éxito, fallo, replay y conflicto `409` tienen estados accesibles y accionables.
- [ ] Un líder autorizado crea un reconteo con selección no vacía y operador asignado.
- [ ] La versión 2+ contiene solo las líneas seleccionadas, inicia sin cantidades y reutiliza el flujo core.
- [ ] Versiones anteriores permanecen inmutables y la versión finalizada puede reenviarse.

### Calidad

- [ ] El core funciona por teclado en tableta, móvil y escritorio.
- [ ] Labels, foco, diálogos, live regions y contraste cumplen la base WCAG 2.2 AA.
- [ ] Todo texto visible usa `t()` y los estados técnicos conservan sus identifiers.
- [ ] Fixtures mock validan las formas del contrato documentado.
- [ ] Sustituir mock por HTTP no requiere modificar componentes de feature.
- [ ] La demo offline distingue claramente pendiente local, sincronizado y conflicto.

## 20. KPIs

| Indicador | Meta MVP | Medición |
|---|---:|---|
| Tiempo de captura por artículo identificado | < 5 s, aspiracional | Mediana y p90 desde foco hasta guardado |
| Conteos sin papel | 100% del flujo demo | Observación de prueba |
| Errores de unidad aceptados | 0 | Pruebas de contrato y telemetría |
| Duplicados por retry | 0 | Recibos/idempotencia |
| Líneas con estado ambiguo | 0 | Auditoría de UI y payload |
| Finalizaciones recuperables ante fallo | 100% en escenarios mock | Pruebas de workflow |
| Flujo core operable por teclado | 100% | Checklist a11y |

## 21. Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Drift entre mock y API | Alto | Tipos/fixtures contractuales y revisión contra OpenAPI actual |
| Backend sin publicar | Alto | Puerto tipado, adapter mock y configuración de swap |
| Sesgo por fuga de datos | Alto | Modelos blind-safe y pruebas que fallen ante campos prohibidos |
| Unidad o precisión incorrecta | Alto | Unidad read-only visible, validación cliente y servidor |
| Retry duplica efectos | Alto | Persistir y reutilizar `Idempotency-Key` por operación |
| Offline crea conflicto | Medio | Etiquetar cola demo, no auto-resolver `409`, bloquear tras lock remoto |
| Rol frontend confundido con seguridad | Alto | Verificación backend y cierre de brecha de autorización |
| Voz/OCR distraen del core | Medio | Gate de roadmap: solo después del core verde |
| Marca inventada o ilegible | Medio | Tokens semánticos y validación oficial pendiente |

## 22. No objetivos del MVP

- Integración real con Oracle o despliegue productivo.
- Cálculo o presentación de teórico, diferencia, varianza, compatibilidad o ranking.
- Investigación de causas, predicción, demanda, compra o recomendación automática.
- Conversión automática de unidades o inferencias por nombre.
- Planificador backend completo de turnos, bodegas o asignaciones.
- Resolución offline multiusuario y reconciliación automática de conflictos.
- OCR productivo o reconocimiento de voz general.
- Cobertura completa de 48/49 bodegas o formatos fuera de los ocho scopes aprobados.

## 23. Decisiones abiertas y dependencias

- [ ] Publicar una URL de integración backend, configuración CORS y contrato de ambiente.
- [ ] Definir autenticación productiva; hoy solo está verificado el template de token/formulario y `/me`.
- [ ] Alinear autorización backend de envío con la política de rol acordada.
- [ ] Proveer scheduling/asignaciones/progreso real o aprobar su alcance mock.
- [ ] Definir catálogo/autorización de operadores para `assignee`; el backend acepta hoy un string.
- [ ] Exponer `session_id` o una resolución equivalente para enlazar inicio, historial y reconteo.
- [ ] Definir endpoints de lectura para asignaciones, versiones y estado/recibos de envío.
- [ ] Validar paleta, tipografía, logo y assets oficiales de Colsubsidio.
- [ ] Definir política de almacenamiento local seguro, expiración y borrado para PWA.
- [ ] Confirmar si payload hash completo se muestra, se abrevia o queda solo para soporte técnico.
- [ ] Diseñar y autorizar el futuro adaptador Oracle fuera de este MVP.

## 24. Apéndice A: contrato API verificado

### Prefijo y autenticación

- Prefijo ICA: `/api/{SERVICE_NAME}/ica-inventory`; valor local por defecto: `/api/template/ica-inventory`.
- OpenAPI local: `/api/{SERVICE_NAME}/openapi.json`.
- Todas las rutas ICA requieren usuario autenticado y pueden responder `401`.
- Template verificado, no contrato final de identidad: `POST /api/{SERVICE_NAME}/auth/token` recibe formulario `email` y `password` y retorna `{ access_token, token_type }`; `GET /api/{SERVICE_NAME}/auth/me` retorna el usuario autenticado. No se asume SSO, recuperación de contraseña ni alta de usuarios.

### DTOs compartidos

```ts
type CountState = 'NOT_COUNTED' | 'COUNTED' | 'COUNTED_ZERO' | 'NOT_FOUND';

type OperatorLine = {
  id: string;
  item_name: string;
  unit: string;
  state: CountState;
  quantity: string | null; // Decimal JSON; tratar como string exacto en el cliente
  capture_method: string | null;
  manual_added: boolean;
};
```

### Rutas de conteo

| Método y ruta relativa al prefijo ICA | Request | Respuesta exitosa | Errores específicos verificados |
|---|---|---|---|
| `GET /scopes` | Sin body | `200 Scope[]`: `{snapshot_id, warehouse_id, scope_key, display_name}` | `503` snapshot no importado |
| `POST /sessions` | `{snapshot_id, warehouse_id, mode: 'GUIDED'|'MANUAL'}` | `201 {attempt_id, mode}` | `400` modo; `404` scope |
| `GET /attempts/{attempt_id}/lines` | Sin body | `200 OperatorLine[]` | `404` intento |
| `GET /attempts/{attempt_id}/completeness` | Sin body | `200 OperatorLine[]` pendientes | `404` intento |
| `GET /attempts/{attempt_id}/barcode/{code}` | Sin body | `200 OperatorLine` | `404` intento/código |
| `POST /attempts/{attempt_id}/barcode/{code}` | `{item_name?: string, unit?: string}` | `200` si existe o `201 OperatorLine` si se agrega | `400` datos incompletos; `404`; `409` lock |
| `POST /attempts/{attempt_id}/lines:batch` | Header `Idempotency-Key`; `{changes: ChangeInput[]}` | `200 {lines: OperatorLine[]}` | `400`, `404`, `409`, `422` |
| `POST /attempts/{attempt_id}/finalize` | `{confirm_uncounted: boolean}` | `200 {finalized: true}` | `404`; `409` lock; `422` requiere confirmación |

`ChangeInput` exacto:

```ts
type ChangeInput = {
  line_id: string;
  quantity?: string | null;
  unit: string;
  capture_method: string;
  confirm_unusual_quantity?: boolean; // default false
  state?: CountState | null; // solo NOT_FOUND puede enviarse explícitamente
};
```

Semántica de `POST .../lines:batch`:

- `400`: falta `Idempotency-Key`, cantidad no parseable/negativa, estado inválido o datos inválidos.
- `404`: intento/línea desconocidos.
- `409`: intento bloqueado o misma clave con body distinto.
- `422`: unidad faltante/distinta, más de seis decimales o confirmación `UNUSUAL_QUANTITY` requerida; FastAPI también usa `422` para schema inválido.

### Rutas de envío y reconteo

| Método y ruta relativa al prefijo ICA | Request | Respuesta exitosa | Errores específicos verificados |
|---|---|---|---|
| `POST /attempts/{attempt_id}/submissions` | Header `Idempotency-Key`; sin body | `200 Receipt` | `400` key/UUID; `404`; `409` payload distinto; `422` no finalizado |
| `POST /sessions/{session_id}/recounts` | `{line_ids: string[], assignee: string}` | `201 {attempt_id, version, lines: {id,item_name,unit}[]}` | `400` UUID/selección vacía; `403` rol; `404` fuente; `422` scope/estado/schema |

`Receipt` y payload canónico:

```ts
type Receipt = {
  status: 'SUCCEEDED' | 'FAILED'; // resultados terminales observados del endpoint síncrono
  payload: {
    attempt_id: string;
    attempt_version: number;
    lines: Array<{
      count_line_id: string;
      reference_line_id: string | null;
      quantity: string;
      unit: string;
    }>;
  };
  payload_hash: string;
  erp_reference: string | null;
  retry_count: number;
};
```

Notas contractuales:

- El endpoint de envío es sin body; el backend construye el payload desde la versión finalizada.
- `PENDING` existe en persistencia durante la llamada, pero no hay endpoint de polling verificado; el POST síncrono retorna el resultado terminal del simulador.
- Las líneas `NOT_FOUND` no tienen cantidad y no entran al payload ERP.
- Un recibo exitoso se reproduce sin otro efecto ERP; un recibo fallido puede reintentarse con la misma clave.
- El adaptador ERP actual es `SimulatedErpSubmissionAdapter`.
- La creación de reconteo usa IDs de líneas de la última fuente finalizada de la sesión, exige selección no vacía/estable y retorna una proyección ciega.
- La autorización de reconteo compara exactamente el correo autenticado con `ICA_COST_LEADER_EMAILS`.
- No existe una ruta verificada para obtener `session_id` desde `attempt_id`, listar intentos/versiones/asignaciones ni consultar un recibo por GET. El adaptador mock puede completar la demo, pero el HTTP productivo depende de cerrar estas brechas.

## 25. Apéndice B: trazabilidad

| Fuente | Uso en este PRD |
|---|---|
| [Issue #1](https://github.com/diegofercho21323/ica-frontend/issues/1) | Captura ciega, modos, unidad exacta, estados, a11y, responsive y adapter mock |
| [Issue #2](https://github.com/diegofercho21323/ica-frontend/issues/2) | Envío, recibos, retry, autorización y reconteo dirigido v2+ |
| Backend SDD proposal/spec/design | Frontera ICA/ERP, requisitos, escenarios y decisiones técnicas |
| Backend verify/apply | 6/6 requisitos, 18/18 escenarios, 62 pruebas PostgreSQL y matiz Strict TDD |
| Routers/servicios backend actuales | Rutas, DTOs, errores, locks, unidad, idempotencia y roles verificados |
