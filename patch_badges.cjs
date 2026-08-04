const fs = require('fs');
let code = fs.readFileSync('src/pages/ProfilePage.tsx', 'utf8');

const badgesCode = `  const ALL_BADGES = [
    { id: 'first_blood', name: 'Primera Sangre', description: 'Participa en 1 torneo', icon: Swords, color: 'text-red-500', condition: tourneys >= 1 },
    { id: 'first_win', name: 'Sabor a Victoria', description: 'Gana 1 torneo', icon: Medal, color: 'text-blue-400', condition: wins >= 1 },
    { id: 'top_10', name: 'Top 10 en Torneos', description: 'Gana 3 torneos para entrar al Top 10', icon: Trophy, color: 'text-yellow-500', condition: wins >= 3 },
    { id: 'veteran', name: 'Jugador Veterano', description: 'Participa en 10 torneos', icon: Shield, color: 'text-indigo-400', condition: tourneys >= 10 },
    { id: 'legend', name: 'Leyenda Viva', description: 'Gana 10 torneos', icon: Crown, color: 'text-yellow-400', condition: wins >= 10 },
    { id: 'early_adopter', name: 'Pionero', description: 'Fundador de la Arena', icon: Zap, color: 'text-cyan-400', condition: true },
    { id: 'pro_player', name: 'Pro Gamer', description: 'Alcanza el nivel 10', icon: Star, color: 'text-primary', condition: level >= 10 },
  ];`;

code = code.replace(/  const ALL_BADGES = \[\s+[\s\S]*?\];/g, badgesCode);

code = code.replace(/<motion\.div\s+initial=\{\{ opacity: 0, y: 20 \}\}\s+animate=\{\{ opacity: 1, y: 0 \}\}\s+transition=\{\{ delay: 0\.2 \}\}\s+className="flex items-center justify-between p-6 bg-yellow-500\/5 border border-yellow-500\/10 rounded-3xl"\s*>[\s\S]*?<\/motion\.div>/g, "");

fs.writeFileSync('src/pages/ProfilePage.tsx', code);
