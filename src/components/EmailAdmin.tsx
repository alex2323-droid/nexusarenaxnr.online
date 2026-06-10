import React, { useState } from 'react';
import { Mail, Send, Loader2 } from 'lucide-react';
import { getAccessToken } from '../lib/firebase';
import { motion } from 'motion/react';
import toast from 'react-hot-toast';

export default function EmailAdmin() {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!to || !subject || !body) {
      toast.error('Por favor completa todos los campos');
      return;
    }

    const confirmed = window.confirm(`¿Estás seguro de enviar un correo a ${to}?`);
    if (!confirmed) return;

    try {
      setIsSending(true);
      const token = await getAccessToken();
      
      if (!token) {
        toast.error('No se ha obtenido el token de Gmail. Por favor ingresa nuevamente para actualizar los permisos.');
        return;
      }

      const emailStr = [
        `To: ${to}`,
        `Subject: ${subject}`,
        'Content-Type: text/html; charset=utf-8',
        '',
        body.replace(/\n/g, '<br/>')
      ].join('\n');

      const encodedEmail = btoa(emailStr).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          raw: encodedEmail
        })
      });

      if (!response.ok) {
        throw new Error('Error al enviar el correo');
      }

      toast.success('Correo enviado exitosamente!');
      setTo('');
      setSubject('');
      setBody('');
    } catch (error: any) {
      console.error(error);
      toast.error('Fallo al enviar correo: ' + error.message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="bg-zinc-900 rounded-2xl p-6 border border-white/10">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-primary/10 rounded-xl text-primary">
          <Mail size={24} />
        </div>
        <div>
          <h2 className="text-xl font-display font-bold uppercase italic tracking-wide text-white">
            Comunicaciones
          </h2>
          <p className="text-sm text-zinc-400">
            Envía notificaciones a jugadores a través de Gmail
          </p>
        </div>
      </div>

      <form onSubmit={handleSendEmail} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">Destinatario (Email)</label>
          <input
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            required
            className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-primary transition-colors"
            placeholder="ejemplo@correo.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">Asunto</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
            className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-primary transition-colors"
            placeholder="Arena: Notificación de Torneo"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">Mensaje</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            rows={5}
            className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-primary transition-colors resize-none"
            placeholder="Escribe el mensaje al jugador..."
          />
        </div>

        <motion.button
          type="submit"
          disabled={isSending}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSending ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (
            <>
              <Send size={20} className="relative z-10" />
              <span>Enviar Correo Segurizado</span>
            </>
          )}
        </motion.button>
      </form>
    </div>
  );
}
