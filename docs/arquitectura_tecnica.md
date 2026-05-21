# Arquitectura Técnica y Seguridad ⚙️ Nexus Arena

Este documento provee un recorrido por la ingeniería detrás de **Nexus Arena League**, incluyendo el flujo de compilación unificado, la base de datos persistente en la nube y las protecciones frente a fallos y exploits comunes de seguridad.

---

## 🏗️ 1. Infraestructura Full-Stack (Express + Vite)

El sistema aprovecha una arquitectura híbrida integrada en la que Express actúa como el enrutador prioritario y servidor de producción, y Vite se integra mediante middleware durante el ciclo de desarrollo.

### Scripts de Compilación (`package.json`)
```json
{
  "dev": "tsx server.ts",
  "build": "vite build && esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs",
  "start": "node dist/server.cjs"
}
```

* **Desarrollo (`dev`)**: Utiliza `tsx` para bootear el backend en caliente directamente en Node, interceptando peticiones del cliente en tiempo real.
* **Compilación de Producción (`build`)**: 
  1. Compila los recursos cliente de React optimizados en la bandeja `dist/`.
  2. Compila el archivo TypeScript del servidor (`server.ts`) haciendo bundle en un único archivo CommonJS optimizado (`dist/server.cjs`) mediante `esbuild`.
  3. Evita las restricciones estrictas de importación relativas de ES Modules de Node a nivel de contenedores Cloud Run y minimiza la latencia de arranque en frío.
* **Arranque en Producción (`start`)**: Corre con Node nativo apuntando al empaquetado optimizado `dist/server.cjs`, consumiendo un mínimo porcentaje de memoria y CPU.

---

## 🗄️ 2. Persistencia y Tiempo Real (Firebase)

La plataforma utiliza una combinación potente de servicios administrados por Google Cloud:

```
[  Jugador / Cliente React  ] <---- Escucha Snapshot ----> [  Cloud Firestore  ]
            |                                                      ^
            +------- Envia Referencia / Pago Móvil ----------------+
                                                                   |
[  Administrador de Torneos  ] <--- Marca como Verificado ---------+
```

* **Firebase Authentication**: Se encarga del registro íntegro de jugadores asignando un identificador de usuario `userId` universal de forma encriptada.
* **Cloud Firestore**: Motor de base de datos orientado a colecciones no relacionales con actualizaciones de baja latencia en vivo:
  * **Petición por Snapshot (`onSnapshot`)**: Se emplea en la gestión de chats dinámicos, la cola de notificaciones, y la actualización en caliente de las llaves del bracket de torneos activos.
  * **Políticas de Control de Errores**: Todo error generado por Firestore se canaliza mediante un capturador centralizado (`handleFirestoreError`) que limpia la pantalla de alertas innecesarias y traduce las excepciones de forma amigable ("permisos insuficientes", "conexión perdida", etc.).

---

## 🤖 3. Enlace de Soporte de Inteligencia Artificial (Gemini Proxy)

El componente **AISupportConsole** se conecta al backend del servidor mediante una transacción proxy segura. Esto previene la filtración o exposición de la llave de API secreta (`GEMINI_API_KEY`) al cliente del navegador.

```
+--------------------------+           +----------------------+          +---------------------+
| Cliente React-App (UI)   | --POST--> | Servidor Express     | --SDK--> | Google Gemini API   |
| (AISupportConsole)       | <--JSON-- | (Utiliza API_KEY)    | <--JSON- | (Modelo Generativo) |
+--------------------------+           +----------------------+          +---------------------+
```

* **Seguridad de la Llave**: El cliente final jamás descarga o lee la llave secreta. Todo pasa por el túnel de autenticación del backend.
* **Aislamiento**: Si la clave del modelo no se encuentra configurada en el entorno de desarrollo local, el sistema backend implementa un conector simulado ("Mock Engine") para que el servidor siga operando fluidamente y sirva respuestas lógicas inmediatas a la interfaz de soporte sin causar excepciones.

---

## 🛡️ 4. Reglas de Seguridad de Datos e Invariantes

Cumpliendo con la especificación técnica listada en `security_spec.md`, el sistema resguarda la base de datos contra el conocido espectro de ataques e inyecciones:

### Mitigación contra "La Docena Sucia"
1. **Identidad Suplantada**: El cliente valida en Firestore que la actualización de un perfil coincida estrictamente con el ID (`userId`) del usuario Web validado en la sesión activa.
2. **Escalada de Privilegios**: Ningún usuario normal puede reescribir su propio campo `isAdmin` a través del cliente. Los privilegios solo se otorgan modificando manualmente los metadatos desde la consola de administración de Google Cloud Console.
3. **Puntuaciones Falsas o Corrupción**: Las llaves de resultados y asignación de brackets se protegen impidiendo que cuentas sin rol administrativo modifiquen la colección de `matches`.
4. **Puntajes Negativos**: Los formularios y controladores de Firebase rechazan números negativos para proteger la veracidad de la tabla de clasificación.
5. **Aprobación de Comprobantes**: Se requiere validación de sesión de administración firma-digital para pasar solicitudes a estatus `Verificado`.
