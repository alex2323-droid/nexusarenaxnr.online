# Manual del Administrador y Organizador 🛡️ Nexus Arena

Este documento explica las herramientas avanzadas integradas en el panel administrativo (`/admin`) para la gestión óptima de torneos de eSports, la curaduría visual de banners y la resolución ágil de solicitudes de jugadores.

---

## 🔑 1. Acceso al Panel de Administración
* El panel administrativo es accesible de forma segura únicamente para aquellos usuarios cuyo perfil en Firestore contenga el campo `isAdmin` asignado como `true`.
* Si cuentas con dicho privilegio, visualizarás la pestaña **Admin** en el menú superior o barra lateral de la plataforma. De lo contrario, las rutas administrativas te bloquearán automáticamente mediante el componente `ProtectedRoute`.

---

## 🏆 2. Administración y Control de Torneos
La gestión de torneos se compone de tres fases operativas esenciales:

### Fase A: Creación de Eventos
1. Haz clic en el botón **+ Crear Torneo** dentro del Panel de Admin.
2. Rellena los campos obligatorios:
   * **Nombre**: Nombre de la copa (ej: *Copa Blood Strike Invierno 2026*).
   * **Juego Asociado**: Selección interactiva de los títulos compatibles de la liga.
   * **Fecha y Hora**: Momento exacto de inicio local (aplica hora de Venezuela).
   * **Cupo Máximo**: Cantidad límite de competidores admitida.
   * **Monto de Inscripción**: Cuota en VES (ej: `150 VES` o escribe `Gratis` / `Free` para eventos abiertos).
   * **Premios**: Descripción detallada del pozo a repartir (ej: `$100 en Pago Móvil`).
3. Presiona **Guardar**.

### Fase B: Auditoría de Pagos y Verificación
1. En la pestaña de inscripción o bandeja administrativa, podrás revisar la lista de jugadores inscritos con estatus `Pendiente`.
2. Revisa la referencia bancaria aportada por el jugador y compárala con tus registros de Pago Móvil.
3. Con un simple clic, cambia su estado a **Verificado**. Esto habilitará el casillero del jugador en la lista oficial de competidores y le enviará alertas acústicas en pantalla mediante nuestras notificaciones dinámicas.

### Fase C: brackets de Eliminación (Brackets) y Fase Activa
1. Una vez completado el cupo o alcanzada la fecha de inicio, presiona el botón **Comenzar Torneo**.
2. Al iniciar, el sistema ejecutará un **generador de brackets algorítmico automatizado**. Esto empareja de forma transparente a los jugadores confirmados en el sistema organizador.
3. Desde la vista de bracket interactiva:
   * Podrás asignar los puntajes oficiales de cada match a medida que concluyan las partidas.
   * Al registrar al ganador del enfrentamiento, el sistema **promueve de forma inmediata** al jugador ganador a la siguiente ronda, ajustando dinámicamente el árbol de brackets del torneo en tiempo real.

---

## 🖼️ 3. Curaduría de Banners (Galería y Compresor de Imágenes)
Para mantener la fachada visual de la plataforma moderna e interactiva, los administradores pueden personalizar la sección de juegos populares:
* Ve a la sección **Administrar Juegos** de la página de inicio.
* Puedes editar los títulos existentes o añadir nuevos juegos incorporando imágenes impactantes.
* **Compresor Integrado**: Si decides subir un archivo local desde tu teléfono o computador, la plataforma procesará la imagen mediante un lienzo HTML5 interno convirtiéndola a un formato `JPEG` liviano y optimizando su tamaño a un máximo de `800x450` píxeles con calidad reducida al 70%. Esto cuida el ancho de banda de navegación móvil de los usuarios y mantiene tiempos de carga relámpago a nivel nacional.

---

## 🩺 4. Monitoreo de Latencia y Auto-Diagnóstico de Base de Datos
* Con el fin de evitar desconexiones accidentales, los administradores tienen acceso exclusivo para habilitar y ejecutar pruebas en la sección **Ver diagnósticos y ping de latencia**.
* Esta herramienta realiza tres funciones clave:
  1. Mide la latencia en milisegundos (ping físico) entre el dispositivo conectado y los servidores locales del backend.
  2. Comprueba de forma interactiva la integridad y el estatus de conexión activa de Firestore.
  3. Ejecuta una limpieza general de la memoria física y caché temporal recolectada, previniendo cuellos de botella estacionales o cierres accidentales del cliente en medio de transmisiones en vivo pesadas.
