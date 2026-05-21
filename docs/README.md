# Centro de Documentación - Nexus Arena League ⚔️🛡️

¡Bienvenido al centro de documentación oficial de **Nexus Arena League**, la plataforma de eSports de referencia para la comunidad gamer de Venezuela 🇻🇪!

Aquí encontrarás guías de usuario, manuales de administración y documentación de arquitectura técnica para entender cómo funciona la plataforma, cómo registrarse de manera segura, y de qué forma se procesan tus datos e inscripciones.

---

## 📌 Mapa de Documentos

Para explorar las diferentes secciones del sistema, selecciona la guía que se ajuste a tus necesidades:

### 1. 🎮 [Guía del Usuario / Jugador](./guia_usuario.md)
Aprende paso a paso cómo:
- Registrar tu perfil gamer y vincular tu cuenta de juego.
- Inscribirte en torneos gratuitos y de pago en Bolívares (VES).
- Utilizar el **Soporte de Inteligencia Artificial (Gemini)** para resolver dudas instantáneas.
- Participar en salas de juego y seguir la transmisión de partidas en vivo.

### 2. 🛡️ [Guía del Administrador / Organizador](./guia_administrador.md)
Manual completo sobre cómo:
- Crear torneos y configurar los parámetros (juego, fecha, cupos, tarifas).
- Cargar y modificar banners artísticos en la galería interactiva.
- Validar comprobantes de pago de forma segura y habilitar accesos de sala.
- Iniciar torneos, **generar llaves de brackets de eliminación automática (brackets)** y coronar campeones.

### 3. ⚙️ [Arquitectura Técnica y Seguridad](./arquitectura_tecnica.md)
Documentación de desarrollo que destaca:
- La infraestructura Full-Stack (React 19, Express, Vite, y esbuild).
- La base de datos persistente con **Firebase Firestore** y reglas de seguridad aplicadas a nivel de servidor.
- La integración del modelo **Gemini 1.5/2.0** a través de la API segura del backend.
- Medidas de mitigación frente a cargas malintencionadas (Identity Spoofing, privilege escalation, etc.).

---

## 🚀 Inicio Rápido para Jugadores
1. **Regístrate**: Inicia sesión utilizando el botón **Ingresar** en la esquina superior derecha. El sistema creará tu perfil de forma automatizada mediante Firebase Authentication.
2. **Completa tu Perfil**: Dirígete a la sección **Perfil** para configurar tu nombre gamer, apodo interno y datos de contacto alternativos.
3. **Inscríbete**: Haz clic en cualquier torneo de la cartelera, introduce tu referencia bancaria si el torneo lo requiere, y presiona el botón **Inscribirme Ahora**.
4. **Validación Instantánea**: Opcionalmente, haz clic en **Enviar Comprobante por WhatsApp** para que nuestro soporte local verifique tu pago en tiempo récord. El organizador actualizará tu estado a **Verificado** y recibirás acceso inmediato a la sala de juego.

---

## 📊 Características Clave del Sistema
- **Liquid Crystal Aesthetics**: Interfaces de soporte técnico y recorridos virtuales ultra pulidos aplicando efectos translúcidos acrílicos avanzados (`backdrop-blur-xl bg-clip-padding`).
- **Eliminación Automática Directa**: Gestión interactiva de brackets donde los administradores pueden registrar victorias y derrotas, promoviendo o descalificando competidores sin intervención manual.
- **Transmisión de Partidas (Live)**: Player de YouTube incrustado directamente en la plataforma para vibrar en tiempo real con las mejores jugadas de la liga nacional.
- **Protección de Datos e Invariantes**: Reglas estrictas en Firestore que previenen que usuarios sin privilegios alteren tablas de puntajes oficiales, falsifiquen identidades de otros miembros o alteren registros de torneos activos.
