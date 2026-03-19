const { Client, GatewayIntentBits, ActivityType } = require('discord.js');
const express = require('express');
const bodyParser = require('body-parser'); // Form verilerini okumak için
require('dotenv').config();

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));

// --- KONTROL PANELİ ARAYÜZÜ ---
app.get('/', (req, res) => {
    res.send(`
        <html>
            <head>
                <title>Sectzo Control Panel</title>
                <style>
                    body { background: #0b0b0b; color: white; font-family: 'Segoe UI', sans-serif; text-align: center; padding: 50px; }
                    .card { background: #161616; padding: 30px; border-radius: 15px; border: 1px solid #ff4d4d; display: inline-block; width: 400px; box-shadow: 0 0 20px rgba(255, 77, 77, 0.2); }
                    input, select { width: 100%; padding: 10px; margin: 10px 0; border-radius: 5px; border: none; background: #222; color: white; }
                    button { width: 100%; padding: 12px; background: #ff4d4d; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; transition: 0.3s; }
                    button:hover { background: #ff1a1a; transform: scale(1.02); }
                    h1 { color: #ff4d4d; margin-bottom: 20px; }
                    .status-dot { height: 12px; width: 12px; background-color: #ff4d4d; border-radius: 50%; display: inline-block; margin-right: 5px; }
                </style>
            </head>
            <body>
                <div class="card">
                    <h1>SECTZO PANEL</h1>
                    <p><span class="status-dot"></span> Bot Durumu: <b>${client.user ? 'AKTİF' : 'BAĞLANIYOR...'}</b></p>
                    <hr style="border: 0.5px solid #333;">
                    
                    <form action="/update" method="POST">
                        <label>Bot İsmi:</label>
                        <input type="text" name="botname" placeholder="${client.user ? client.user.username : 'Sectzo Bot'}">
                        
                        <label>Durum Mesajı:</label>
                        <input type="text" name="statusmsg" placeholder="Örn: .yardım | Sectzo">
                        
                        <label>Bot Modu:</label>
                        <select name="botstatus">
                            <option value="dnd">Rahatsız Etmeyin (Kırmızı)</option>
                            <option value="online">Çevrimiçi (Yeşil)</option>
                            <option value="idle">Boşta (Sarı)</option>
                        </select>
                        
                        <button type="submit">AYARLARI GÜNCELLE</button>
                    </form>
                </div>
            </body>
        </html>
    `);
});

// --- AYARLARI UYGULAMA KOMUTU ---
app.post('/update', async (req, res) => {
    const { botname, statusmsg, botstatus } = req.body;

    try {
        if (botname) await client.user.setUsername(botname);
        if (statusmsg || botstatus) {
            client.user.setPresence({
                activities: [{ name: statusmsg || 'Sectzo System', type: ActivityType.Watching }],
                status: botstatus || 'dnd',
            });
        }
        res.send('<h1>Başarıyla Güncellendi! ✅</h1><script>setTimeout(() => { window.location.href = "/"; }, 2000);</script>');
    } catch (error) {
        res.send('<h1>Hata Oluştu! ❌</h1><p>' + error.message + '</p>');
    }
});

client.once('ready', () => {
    console.log(`[BAŞARILI] ${client.user.tag} Paneli ile aktif!`);
    client.user.setPresence({ status: 'dnd', activities: [{ name: 'Sectzo System', type: ActivityType.Watching }] });
});

app.listen(process.env.PORT || 3000);
client.login(process.env.TOKEN);
