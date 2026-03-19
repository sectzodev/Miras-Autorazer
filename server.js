// ============================================= //
//           MİRAS BOT KONTROL PANELİ            //
// ============================================= //

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// ----------------------------- //
// EXPRESS AYARLARI
// ----------------------------- //
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));
app.use(express.json());

const PORT = process.env.PORT || 3000;

// ----------------------------- //
// DISCORD BOT
// ----------------------------- //
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildModeration
    ]
});

// ----------------------------- //
// CONFIG DOSYASI
// ----------------------------- //
let CONFIG = {
    prefix: '.',
    loncaTag: '1991',
    bannerUrl: '',
    logKanali: '',
    hosgeldinKanali: '',
    ozelOdaKanali: '',
    yetkiliRolu: '',
    loncaRolu: '',
    guvenliRoller: [],
    kufurFiltre: true,
    reklamFiltre: true,
    ozelKomutlar: {}
};

// Config yükle
try {
    if (fs.existsSync('./config.json')) {
        CONFIG = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
        console.log('✅ Config yüklendi');
    }
} catch (e) {
    console.log('⚠️ Config bulunamadı, varsayılan kullanılıyor');
}

// Config kaydet
function saveConfig() {
    fs.writeFileSync('./config.json', JSON.stringify(CONFIG, null, 2));
}

// ----------------------------- //
// BOT HAZIR
// ----------------------------- //
client.once('ready', () => {
    console.log(`✅ ${client.user.tag} olarak giriş yapıldı!`);
    
    // Bot durumunu ayarla
    client.user.setPresence({
        activities: [{ name: 'Miras ❤ Panel', type: 0 }],
        status: 'dnd'
    });
    
    // İstatistikleri gönder
    sendStats();
    
    // Her 5 saniyede bir stats güncelle
    setInterval(sendStats, 5000);
});

// İstatistik gönder
function sendStats() {
    if (!client.isReady()) return;
    
    const guild = client.guilds.cache.first();
    if (!guild) return;
    
    const uptime = process.uptime();
    const gun = Math.floor(uptime / 86400);
    const saat = Math.floor((uptime % 86400) / 3600);
    const dakika = Math.floor((uptime % 3600) / 60);
    
    io.emit('stats', {
        uptime: `${gun}g ${saat}s ${dakika}d`,
        ping: client.ws.ping,
        ram: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2),
        guilds: client.guilds.cache.size,
        members: client.users.cache.size,
        channels: client.channels.cache.size,
        voice: client.voice.adapters.size
    });
    
    io.emit('botStatus', {
        status: client.user.presence.status,
        statusText: getStatusText(client.user.presence.status)
    });
}

function getStatusText(status) {
    const texts = {
        online: 'Çevrimiçi',
        idle: 'Boşta',
        dnd: 'Rahatsız Etmeyin',
        offline: 'Çevrimdışı'
    };
    return texts[status] || status;
}

// ----------------------------- //
// SOCKET.IO
// ----------------------------- //
io.on('connection', (socket) => {
    console.log('🔌 Panel bağlantısı kuruldu');
    
    // Config gönder
    socket.emit('loadConfig', CONFIG);
    
    // Log ekle
    socket.emit('log', '📊 Panelle bağlantı kuruldu');
    
    // Bot durumu güncelle
    socket.on('updatePresence', (data) => {
        try {
            client.user.setPresence({
                activities: [{ name: data.activityText, type: data.activityType }],
                status: data.status
            });
            
            io.emit('log', `🎮 Bot durumu güncellendi: ${data.activityText}`);
            saveConfig();
        } catch (e) {
            socket.emit('log', `❌ Hata: ${e.message}`);
        }
    });
    
    // Config güncelle
    socket.on('updateConfig', (data) => {
        CONFIG = { ...CONFIG, ...data };
        saveConfig();
        io.emit('log', '⚙️ Genel ayarlar güncellendi');
    });
    
    // Kanal ID'lerini güncelle
    socket.on('updateChannels', (data) => {
        CONFIG.logKanali = data.logKanali;
        CONFIG.hosgeldinKanali = data.hosgeldinKanali;
        CONFIG.ozelOdaKanali = data.ozelOdaKanali;
        saveConfig();
        io.emit('log', '📢 Kanal ID\'leri güncellendi');
    });
    
    // Rol ID'lerini güncelle
    socket.on('updateRoles', (data) => {
        CONFIG.yetkiliRolu = data.yetkiliRolu;
        CONFIG.loncaRolu = data.loncaRolu;
        CONFIG.guvenliRoller = data.guvenliRoller;
        saveConfig();
        io.emit('log', '🔰 Rol ID\'leri güncellendi');
    });
    
    socket.on('disconnect', () => {
        console.log('🔌 Panel bağlantısı koptu');
    });
});

// ----------------------------- //
// SUNUCUYU BAŞLAT
// ----------------------------- //
server.listen(PORT, () => {
    console.log(`🌐 Panel: http://localhost:${PORT}`);
});

// ----------------------------- //
// BOTU BAŞLAT
// ----------------------------- //
if (!process.env.TOKEN) {
    console.error('❌ TOKEN bulunamadı! .env dosyasını kontrol et.');
    process.exit(1);
}

client.login(process.env.TOKEN);

// ----------------------------- //
// HATA YAKALAMA
// ----------------------------- //
process.on('unhandledRejection', (error) => {
    console.error('❌ Hata:', error);
});
