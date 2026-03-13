const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { joinVoiceChannel } = require('@discordjs/voice');
const express = require('express');
const axios = require('axios');

// --- WEB SUNUCUSU ---
const app = express();
app.get('/', (req, res) => res.send('Bot 7/24 Aktif!'));
app.listen(10000, () => console.log('Sunucu 10000 portunda hazır.'));

// --- BOT AYARLARI ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildPresences
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

const PREFIX = ".";
const SES_KANALI_ID = "1482109855396397067";
const YETKILI_ROL_ID = "1467952691169722422"; // Komutları kullanacak rol
const SUNUCU_ID = "1438245263948124303"; // Belirlediğin Sunucu ID
const LONCA_TAGI = "LONCA_TAGINI_BURAYA_YAZ"; // Örn: "AGA"
const LONCA_ROL_ID = "1482109680263237702"; // Lonca rolü

// AFK Verilerini tutmak için
const afklar = new Map();

// --- BOT HAZIR OLDUĞUNDA ---
client.once('ready', () => {
    console.log(`>>> ${client.user.tag} Aktif!`);
    client.user.setPresence({
        activities: [], // Yazı silindi
        status: 'dnd' // Rahatsız Etmeyin
    });
});

// --- OTO LONCA ROL SİSTEMİ ---
client.on('userUpdate', async (oldUser, newUser) => {
    const guild = client.guilds.cache.get(SUNUCU_ID);
    if (!guild) return;
    const member = guild.members.cache.get(newUser.id);
    if (!member) return;

    const hasTag = newUser.username.includes(LONCA_TAGI);
    const hasRole = member.roles.cache.has(LONCA_ROL_ID);

    if (hasTag && !hasRole) {
        await member.roles.add(LONCA_ROL_ID).catch(() => {});
        console.log(`${newUser.tag} loncaya katıldı, rol verildi.`);
    } else if (!hasTag && hasRole) {
        await member.roles.remove(LONCA_ROL_ID).catch(() => {});
        console.log(`${newUser.tag} loncadan ayrıldı, rol alındı.`);
    }
});

// --- MESAJ ETKİLEŞİMLERİ ---
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    // --- AFK KONTROL (Birisi AFK olan birini etiketlerse) ---
    if (message.mentions.users.size > 0) {
        message.mentions.users.forEach(user => {
            if (afklar.has(user.id)) {
                const data = afklar.get(user.id);
                message.reply(`Etiketlediğin kullanıcı **${data.sebep}** sebebiyle AFK!`).then(m => setTimeout(() => m.delete(), 5000));
            }
        });
    }

    // --- AFK'DAN ÇIKMA ---
    if (afklar.has(message.author.id)) {
        afklar.delete(message.author.id);
        message.reply("Hoş geldin! AFK modundan çıkarıldın.").then(m => setTimeout(() => m.delete(), 3000));
    }

    // SA - AS Sistemi
    const msg = message.content.toLowerCase();
    if (msg === 'sa') return message.reply('Aleyküm Selam, hoş geldin!');
    if (msg === 'hg') return message.reply('Hoş bulduk!');

    // Küfür Koruması
    const kufurler = ['kufur1', 'kufur2']; 
    if (kufurler.some(k => msg.includes(k))) {
        await message.delete();
        return message.channel.send(`${message.author}, küfür yasak!`).then(m => setTimeout(() => m.delete(), 3000));
    }

    // --- KOMUTLAR ---
    if (!message.content.startsWith(PREFIX)) return;
    
    const args = message.content.slice(PREFIX.length).trim().split(/ +/g);
    const command = args.shift().toLowerCase();

    // Yetki Kontrolü ve Cevabı
    const komutlar = ['aktif', 'miras', 'join', 'afk'];
    if (komutlar.includes(command)) {
        if (!message.member.roles.cache.has(YETKILI_ROL_ID)) {
            return message.reply("❌ **Hata:** Bu komutu kullanmak için yetkiniz bulunmuyor!");
        }
    }

    if (command === 'afk') {
        const sebep = args.join(" ") || "Sebep belirtilmedi";
        afklar.set(message.author.id, { sebep: sebep });
        return message.reply(`Başarıyla AFK moduna geçtin. Sebep: **${sebep}**`);
    }

    if (command === 'aktif') return message.reply('✅ **Sistemler Aktif!**');

    if (command === 'miras') {
        const embed = new EmbedBuilder().setTitle('Miras-Autorazer').setDescription('Sistemler sorunsuz.').setColor('DarkRed');
        return message.channel.send({ embeds: [embed] });
    }

    if (command === 'join') {
        const channel = message.guild.channels.cache.get(SES_KANALI_ID);
        if (!channel) return;
        try {
            joinVoiceChannel({
                channelId: channel.id,
                guildId: channel.guild.id,
                adapterCreator: channel.guild.voiceAdapterCreator,
            });
            message.reply(`🎤 **${channel.name}** kanalına girildi!`);
        } catch (e) { console.error(e); }
    }
});

// --- SELF-PING ---
setInterval(() => {
    axios.get('https://miras-autorazer.onrender.com').catch(() => {});
}, 300000);

client.login(process.env.TOKEN);
