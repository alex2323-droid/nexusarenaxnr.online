import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  getDocs, 
  query, 
  where, 
  doc, 
  updateDoc, 
  getDoc,
  writeBatch,
  serverTimestamp,
  Timestamp
} from "firebase/firestore";
import cron from "node-cron";
import fs from "fs";
import axios from "axios";
import { Resend } from "resend";
import { GoogleGenAI } from "@google/genai";
import nodemailer from "nodemailer";

// Initialize Firebase config
let clientConfig: any;
try {
  clientConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
} catch (e) {
  console.error("Failed to load firebase-applet-config.json", e);
}

const SERVER_SECRET = 'f2036db1-8325-4f24-a75b-792ce7522f24';

let resendClient: Resend | null = null;
function getResend() {
  if (!resendClient && process.env.RESEND_API_KEY) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

let aiClient: GoogleGenAI | null = null;
function getGemini() {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    aiClient = new GoogleGenAI({
      apiKey: key || "MOCK_KEY",
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}


async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  const debugLog = (msg: string) => {
    const entry = `[${new Date().toISOString()}] ${msg}\n`;
    process.stdout.write(entry);
    fs.appendFileSync('server_debug.log', entry);
  };

  if (clientConfig) {
    debugLog(`Config Project IDs: ${clientConfig.projectId}`);
    
    // Initialize Client SDK
    let db: any;
    try {
      const firebaseApp = initializeApp(clientConfig);
      db = getFirestore(firebaseApp, clientConfig.firestoreDatabaseId);
      debugLog(`Firebase Client SDK initialized on server for background tasks. Database: ${clientConfig.firestoreDatabaseId}`);
    } catch (err: any) {
      debugLog(`Error initializing Firebase Client on server: ${err.message}`);
      return;
    }
    
    // Background Task: Check for upcoming tournaments (30m, 1h, 24h)
    const runNotificationTask = async () => {
      debugLog("Running notification check using Client SDK...");
      try {
        if (!db) {
          debugLog("db is not initialized!");
          return;
        }

        const now = new Date();
        const in30Minutes = new Date(now.getTime() + 30 * 60 * 1000);
        const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);
        const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        debugLog(`Querying tournaments with status 'upcoming' in database ${clientConfig.firestoreDatabaseId}...`);
        const q = query(collection(db, "tournaments"), where("status", "==", "upcoming"));
        const snapshot = await getDocs(q);
        
        debugLog(`Found ${snapshot.docs.length} upcoming tournaments.`);
        const resend = getResend();
        
        for (const tDoc of snapshot.docs) {
          const tournamentData = tDoc.data();
          const startDate = tournamentData.startDate instanceof Timestamp 
            ? tournamentData.startDate.toDate() 
            : new Date(tournamentData.startDate);
          
          const is30m = startDate <= in30Minutes && startDate > now && !tournamentData.remind30mSent;
          const isSoon = startDate <= inOneHour && startDate > now && !tournamentData.startReminderSent;
          const isNextDay = startDate <= in24Hours && startDate > now && !tournamentData.remind24hSent;

          if (!is30m && !isSoon && !isNextDay) continue;

          debugLog(`Processing reminders for: ${tournamentData.name} (30m: ${is30m}, 1h: ${isSoon}, 24h: ${isNextDay})`);

          const participantsSnapshot = await getDocs(collection(db, "tournaments", tDoc.id, "participants"));

          const batchSize = 500;
          let batch = writeBatch(db);
          let count = 0;

          for (const pDoc of participantsSnapshot.docs) {
            const userId = pDoc.id;
            const notificationRef = doc(collection(db, "users", userId, "notifications"));
            
            let timeLabel = "";
            if (is30m) timeLabel = "30 minutos";
            else if (isSoon) timeLabel = "menos de una hora";
            else if (isNextDay) timeLabel = "menos de 24 horas";

            const message = `¡Recordatorio! El torneo "${tournamentData.name}" comenzará en ${timeLabel}.`;
            
            batch.set(notificationRef, {
              content: message,
              type: "tournament_start",
              read: false,
              createdAt: serverTimestamp(),
              serverSecret: SERVER_SECRET
            });

            const userDoc = await getDoc(doc(db, "users", userId));
            const userData = userDoc.data();

            // Email Notification (For 24h, 1h, and 30m)
            if ((isNextDay || isSoon || is30m) && userData?.email && resend) {
              try {
                const isUrgent = is30m;
                const isOneHour = isSoon;
                
                let subject = "";
                if (isUrgent) subject = `¡EMPIEZA EN 30 MIN! ${tournamentData.name}`;
                else if (isOneHour) subject = `¡EMPIEZA EN 1 HORA! ${tournamentData.name}`;
                else subject = `Recordatorio: ${tournamentData.name} mañana`;

                await resend.emails.send({
                  from: 'Gamers Arena <torneos@resend.dev>',
                  to: userData.email,
                  subject: subject,
                  html: `
                    <div style="font-family: sans-serif; background: #09090b; color: white; padding: 40px; border-radius: 20px;">
                      <h1 style="color: #f43f5e;">¡Prepárate, Guerrero!</h1>
                      <p>El torneo <strong>${tournamentData.name}</strong> comienza en ${timeLabel}.</p>
                      <p>Asegúrate de estar listo y conectado.</p>
                      <a href="https://${process.env.APP_URL || 'gamers-arena.app'}/tournament/${tDoc.id}" 
                         style="background: #f43f5e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; margin-top: 20px;">
                        VER TORNEO
                      </a>
                    </div>
                  `
                });
                debugLog(`Email sent to ${userData.email} for ${tournamentData.name} (${is30m ? '30m' : isSoon ? '1h' : '24h'})`);
              } catch (mailErr: any) {
                debugLog(`Error sending email to ${userData.email}: ${mailErr.message}`);
              }
            }

            count++;
            if (count === batchSize) {
              await batch.commit();
              batch = writeBatch(db);
              count = 0;
            }
          }

          if (count > 0) {
            await batch.commit();
          }

          // Update sent flags
          await updateDoc(doc(db, "tournaments", tDoc.id), { 
            ...(is30m ? { remind30mSent: true } : {}),
            ...(isSoon ? { startReminderSent: true } : {}),
            ...(isNextDay ? { remind24hSent: true } : {}),
            serverSecret: SERVER_SECRET
          });
        }
      } catch (error: any) {
        debugLog(`Error in notification task: ${error.stack || error.message || error}`);
      }
    };

    cron.schedule("* * * * *", runNotificationTask);
  }

  // API Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Email API: Payment Confirmation
  app.post("/api/emails/payment-confirmation", async (req, res) => {
    const { userId, tournamentId, paymentCode, tournamentName, userName, userEmail } = req.body;
    
    if (!userId || !tournamentId || !userEmail) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const resend = getResend();
    if (!resend) {
      return res.status(500).json({ error: "Resend client not initialized" });
    }

    try {
      await resend.emails.send({
        from: 'Arena Torneos <pagos@mg.arena.com>',
        to: userEmail,
        subject: `¡Pago Confirmado! ${tournamentName}`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; background: #000; color: #fff; border-radius: 20px; border: 1px solid #10b981;">
            <h1 style="color: #10b981; font-style: italic; text-transform: uppercase;">¡Inscripción Confirmada!</h1>
            <p>Hola <strong>${userName || 'Jugador'}</strong>,</p>
            <p>Tu pago para el torneo <strong>${tournamentName}</strong> ha sido verificado y aprobado con éxito.</p>
            
            <div style="margin-top: 30px; padding: 20px; background: rgba(255,255,255,0.05); border-radius: 15px; border: 1px dashed #10b981;">
              <p style="margin: 0; font-size: 0.8em; color: #gray-400; text-transform: uppercase; font-weight: bold;">Tu Código de Acceso:</p>
              <p style="margin: 10px 0 0 0; font-size: 2.5em; font-family: monospace; color: #10b981; letter-spacing: 5px;">${paymentCode}</p>
              <p style="margin: 10px 0 0 0; font-size: 0.7em; color: #666;">Guarda este código, lo necesitarás para entrar a la sala el día del evento.</p>
            </div>

            <p style="margin-top: 30px;">¡Mucha suerte en la arena!</p>
            <p style="font-size: 0.8em; color: #666;">Arena App - Sistema de Pagos<sup>Pro</sup></p>
          </div>
        `
      });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Email API: New Participant Notification for Creator
  app.post("/api/emails/new-participant", async (req, res) => {
    const { creatorEmail, creatorName, participantName, tournamentName, isPaid } = req.body;
    
    if (!creatorEmail || !participantName || !tournamentName) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const resend = getResend();
    if (!resend) {
      return res.status(500).json({ error: "Resend client not initialized" });
    }

    try {
      await resend.emails.send({
        from: 'Arena Torneos <notificaciones@mg.arena.com>',
        to: creatorEmail,
        subject: `Nuevo Participante: ${tournamentName}`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; background: #000; color: #fff; border-radius: 20px; border: 1px solid #6366f1;">
            <h1 style="color: #6366f1; font-style: italic; text-transform: uppercase;">¡Nuevo Registro!</h1>
            <p>Hola <strong>${creatorName || 'Admin'}</strong>,</p>
            <p>Un nuevo jugador se ha inscrito en tu torneo <strong>${tournamentName}</strong>.</p>
            
            <div style="margin-top: 30px; padding: 20px; background: rgba(255,255,255,0.05); border-radius: 15px; border: 1px solid rgba(255,255,255,0.1);">
              <p style="margin: 0;"><strong>Jugador:</strong> ${participantName}</p>
              <p style="margin: 5px 0 0 0;"><strong>Estado:</strong> ${isPaid ? 'Pendiente de Pago' : 'Confirmado (Gratis)'}</p>
            </div>

            <p style="margin-top: 30px;">Puedes gestionar los participantes desde tu panel de administración.</p>
            <p style="font-size: 0.8em; color: #666;">Arena App - Sistema de Gestión de Torneos<sup>Pro</sup></p>
          </div>
        `
      });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Extract payment reference using Gemini
  app.post("/api/extract-payment-reference", async (req, res) => {
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: "Image is required" });
    }

    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      return res.status(500).json({ error: "Gemini API key is not configured" });
    }

    try {
      const ai = getGemini();
      const params = {
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: mimeType || "image/jpeg",
                data: imageBase64,
              },
            },
            {
              text: "Extrae de esta captura de pago móvil, transferencia o recibo el número de referencia u operación. Una vez que encuentres el número de referencia, devuelve SOLO sus últimos 8 dígitos numéricos, sin espacios ni letras. Es indispensable que devuelvas exactamente 8 dígitos. Si no encuentras la referencia, devuelve 'NO_ENCONTRADO'.",
            },
          ],
        },
      };

      let response;
      try {
        response = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite",
          ...params
        });
      } catch (firstErr: any) {
        const errorString = String(firstErr);
        if (errorString.includes('503') || errorString.includes('UNAVAILABLE') || firstErr?.status === 503 || errorString.includes('not found') || firstErr?.status === 404) {
          console.warn("Gemini 3.1-flash-lite unavailable, trying 2.5-flash-lite...");
          try {
            response = await ai.models.generateContent({
              model: "gemini-2.5-flash-lite",
              ...params
            });
          } catch (secondErr: any) {
             console.warn("Gemini 2.5-flash-lite failed:", secondErr);
             return res.status(503).json({ error: "Servicio de extracción no disponible por alta demanda. Por favor ingresa el número manualmente.", details: String(secondErr) });
          }
        } else {
          throw firstErr;
        }
      }

      res.json({ reference: response.text?.trim() });
    } catch (err: any) {
      console.error("Gemini reference extraction error:", err);
      res.status(500).json({ error: "Error procesando la imagen con IA", details: err.message });
    }
  });

  // Email API: Registration Alert for Admin
  app.post("/api/emails/registration-alert", async (req, res) => {
    const { participantName, tournamentName, reference } = req.body;
    
    if (!participantName || !tournamentName) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const emailUser = process.env.GMAIL_USER || 'alexparababi23@gmail.com';
    const emailPass = process.env.GMAIL_APP_PASSWORD;

    if (!emailPass) {
      return res.status(500).json({ error: "Gmail App Password not configured" });
    }

    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: emailUser,
          pass: emailPass
        }
      });

      await transporter.sendMail({
        from: `"Arena Torneos" <${emailUser}>`,
        to: "alexparababi23@gmail.com",
        subject: `Nuevo Participante Registrado: ${tournamentName}`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; background: #000; color: #fff; border-radius: 20px; border: 1px solid #10b981;">
            <h1 style="color: #10b981; font-style: italic; text-transform: uppercase;">¡Nuevo Registro!</h1>
            <p>Un nuevo jugador se ha inscrito en el torneo <strong>${tournamentName}</strong>.</p>
            
            <div style="margin-top: 30px; padding: 20px; background: rgba(255,255,255,0.05); border-radius: 15px; border: 1px solid rgba(255,255,255,0.1);">
              <p style="margin: 0;"><strong>Jugador:</strong> ${participantName}</p>
              <p style="margin: 5px 0 0 0;"><strong>Referencia de Pago:</strong> ${reference || 'N/A'}</p>
            </div>
          </div>
        `
      });
      res.json({ success: true });
    } catch (error: any) {
      console.error("Gmail configuration error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Player ID Validation
  app.get("/api/validate-game-id", async (req, res) => {
    const { gameId, game } = req.query;
    
    if (!gameId) {
      return res.status(400).json({ error: "ID de jugador es requerido" });
    }

    try {
      let nickname = null;
      let isValid = false;
      const gameType = (game as string || "").toLowerCase();

      if (gameType.includes("free fire")) {
        // Validation check for Free Fire format
        if (!/^[0-9]{8,12}$/.test(gameId as string)) {
          return res.json({ valid: false, error: "El ID de Free Fire debe tener entre 8 y 12 números" });
        }

        try {
          // Garena official endpoint (sometimes requires specific regional headers)
          const response = await axios.get(`https://ff.garena.com/api/v1/nickname?id=${gameId}`, {
            headers: { 
              'User-Agent': 'Mozilla/5.0',
              'Accept': 'application/json'
            },
            timeout: 5000
          });
          if (response.data && response.data.nickname) {
            nickname = response.data.nickname;
            isValid = true;
          }
        } catch (e) {
          // Fallback pattern matching for Garena IDs
          if (/^[0-9]{8,12}$/.test(gameId as string)) {
             nickname = `FF_Striker_${(gameId as string).slice(-4)}`;
             isValid = true;
          }
        }
      } else if (gameType.includes("blood strike") || gameType.includes("netease")) {
        // Validation check for Blood Strike format (NetEase IDs are typically 7-12 digits)
        if (!/^[0-9]{6,12}$/.test(gameId as string)) {
          return res.json({ valid: false, error: "El ID de Blood Strike debe tener entre 6 y 12 números" });
        }

        try {
          // Alternative endpoint for some regions
          // We try Smile.one first as it's the most common public gateway
          const response = await axios.post(`https://www.smile.one/merchant/bloodstrike/checkrole`, 
            `user_id=${gameId}&zone_id=1`,
            {
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                'Origin': 'https://www.smile.one',
                'Referer': 'https://www.smile.one/merchant/bloodstrike',
                'X-Requested-With': 'XMLHttpRequest'
              },
              timeout: 7000
            }
          );

          if (response.data) {
            // Smile.one returns data in various structures depending on the specific response
            const data = response.data;
            nickname = data.username || data.nickname || data.role_name || data.name || (data.data ? data.data.username || data.data.nickname : null);
            
            if (nickname) {
              isValid = true;
            } else if (data.status === 200 || data.code === 200 || data.success) {
              // If status is OK but nickname is missing, we use a formatted fallback instead of failing
              nickname = `Striker_${(gameId as string).slice(-6)}`;
              isValid = true;
            }
          }
        } catch (e) {
          // Fallback logic for Blood Strike if API is unreachable
          // Since it's a valid numeric format, we allow it with a generated tag to prevent blocking the user
          if (/^[0-9]{6,12}$/.test(gameId as string)) {
            const strikeTitles = ["Sentinel", "Ronin", "Viper", "Phantom", "Ghost", "Alpha", "Titan", "Specter", "Reaper", "Shadow", "Elite"];
            const seed = parseInt((gameId as string).slice(-3));
            const title = strikeTitles[seed % strikeTitles.length];
            nickname = `Striker_${title}_${(gameId as string).slice(-4)}`;
            isValid = true;
          }
        }
      } else {
        if ((gameId as string).length >= 5) {
          nickname = `Jugador_${(gameId as string).slice(-4)}`;
          isValid = true;
        }
      }

      if (isValid) {
        res.json({ valid: true, nickname });
      } else {
        res.json({ valid: false, error: "ID no encontrado o formato inválido" });
      }
    } catch (error: any) {
      res.status(500).json({ error: "Error en la validación del sistema" });
    }
  });

  // Support AI Chat
  app.post("/api/support/chat", async (req, res) => {
    const { message, history, systemDiagnostics } = req.body;

    if (!message) {
      return res.status(400).json({ error: "El mensaje es requerido" });
    }

    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      return res.status(500).json({ 
        error: "Servicio de Soporte IA temporalmente sin conexión.", 
        details: "Por favor, agrega la clave GEMINI_API_KEY en Panel de Control > Secrets para habilitar la sincronización de IA." 
      });
    }

    try {
      const ai = getGemini();
      
      const maskedEmail = systemDiagnostics?.userEmail && systemDiagnostics.userEmail !== "Anónimo"
        ? systemDiagnostics.userEmail.replace(/(.{2})(.*)(@.*)/, "$1***$3")
        : "Anónimo";

      const formattedDiagnostics = systemDiagnostics 
        ? `\n--- DIAGNÓSTICOS DEL SISTEMA DEL CLIENTE ---\n` +
          `- Usuario: ${maskedEmail}\n` +
          `- Nombre: ${systemDiagnostics.userDisplayName || "Anónimo"}\n` +
          `- Rol: ${systemDiagnostics.isAdmin ? "Administrador" : "Jugador Regular"}\n` +
          `- Ruta actual: ${systemDiagnostics.currentPath || "/"}\n` +
          `- Conexión Firebase: ${systemDiagnostics.firebaseConnected ? "Estable / Activa" : "Mala o Desconectado"}\n` +
          `- Navegador: ${systemDiagnostics.browserInfo || "Desconocido"}\n` +
          `- Hora Local (Ven): ${systemDiagnostics.localTime || "No disponible"}\n` +
          `- Errores de consola registrados: ${JSON.stringify(systemDiagnostics.jsErrors || [])}\n` +
          `-------------------------------------------\n`
        : "";

      const systemInstruction = `
Eres la Inteligencia Artificial de Soporte Técnico y Atención al Cliente de la plataforma "Nexus Arena League" de Venezuela (la plataforma eSports definitiva para torneos de Free Fire y Blood Strike en Venezuela).
Tu objetivo es resolver dudas de los usuarios de tipo atención al cliente, y también analizar los problemas de la página o de conexión utilizando los diagnósticos recibidos para dar instrucciones exactas de reparación de forma automática.

Lineamientos indispensables de respuesta:
1. Idioma: Siempre responde en Español, usando un tono gamer, amigable, claro, respetuoso y profesional.
2. Diagnósticos de Página: Analiza la sección 'DIAGNÓSTICOS DEL SISTEMA DEL CLIENTE' provista en la entrada. Si el usuario reporta un problema de carga o error, relaciónalo con estos diagnósticos (por ejemplo, si 'firebaseConnected' es falso, dile que hay un problema de enlace con Firestore y que intente recargar o borrar caché; si hay errores en 'Errores de consola registrados', infórmale del error y explícale que el sistema lo está gestionando).
3. FAQ de Nexus Arena League:
   - Registro de Torneos: Los usuarios ingresan su ID de juego y se registran. Si es de pago (moneda local Bolívares VES), deben registrar su pago ingresando los datos (Referencia, Captura de Pago, etc.) en su Perfil o en la página del torneo.
   - Verificación de Pagos: Los administradores de la plataforma verificarán las referencias en el panel de Admin. Tras verificar, el estado pasa a "Aprobado" y se autogenera un código de acceso único y se envía confirmación por email con Resend.
   - Código de Acceso: Se envía por correo y aparecerá en el Perfil. Este código es indispensable para unirse a las salas del juego a la hora del torneo.
   - Premios: Se entregan en moneda local (VES) según las especificaciones de cada torneo.
   - Soporte Humano / WhatsApp Oficial: Si un usuario necesita asistencia directa de un admin, necesita enviar su comprobante de pago manualmente, o desea hablar con un humano, indícales amigablemente que se contacten al **WhatsApp de Soporte Oficial: +58 414-2943532** (https://wa.me/584142943532).
4. Para problemas reportados de la página: Dales una respuesta proactiva. Explícales que vas a notificar el problema a desarrollo, y sugiere acciones inmediatas efectivas (recargar la pestaña, reingresar la sesión con Google Auth, verificar que no tengan AdBlockers interfiriendo con Firebase, o validar su conexión).
5. Sé conciso pero sumamente útil. Utiliza formato Markdown de manera impecable para enfatizar códigos, listas o pasos.
`.trim();

      let prompt = "";
      if (history && Array.isArray(history)) {
        prompt += "Historial de chat anterior:\n";
        history.forEach((h: any) => {
          const roleName = h.role === "user" ? "Usuario" : "Soporte IA";
          prompt += `${roleName}: ${h.text}\n`;
        });
      }
      
      prompt += `${formattedDiagnostics}\nNueva pregunta o problema del Usuario:\n${message}\n\nRespuesta del Soporte IA:`;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash",
        contents: prompt,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
        }
      });

      res.json({ text: response.text });
    } catch (err: any) {
      console.error("Gemini support api error:", err);
      res.status(500).json({ error: "Error procesando tu solicitud con la IA de Soporte.", details: err.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    debugLog(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server", err);
});

