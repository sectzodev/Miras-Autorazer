const { Client, GatewayIntentBits, EmbedBuilder, ActivityType } = require('discord.js');
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
        GatewayIntentBits.GuildVoiceStates
    ]
});

const PREFIX = ".";
const SES_KANALI_ID = "1482109855396397067";
const YETKILI_ROL_ID = "1467952691169722422"; // Belirlediğin yetkili rolü

// --- BOT HAZIR OLDUĞUNDA ---
client.once('ready', () => {
    console.log(`>>> ${client.user.tag} Aktif!`);
    client.user.setPresence({
        activities: [], // "Geliştiriliyorum" yazısı silindi
        status: 'dnd' // Rahatsız Etmeyin modu
    });
});

// --- MESAJ ETKİLEŞİMLERİ ---
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // --- SA / AS / HG SİSTEMİ ---
    const msg = message.content.toLowerCase();
    if (msg === 'sa') return message.reply('Aleyküm Selam, hoş geldin!');
    if (msg === 'hg') return message.reply('Hoş bulduk!');

    // --- KÜFÜR KORUMASI (Herkes İçin) ---
    const kufurler = ['kufur1', 'kufur2', 'kufur3']; // Burayı genişletebilirsin
    if (kufurler.some(k => msg.includes(k))) {
        await message.delete();
        return message.channel.send(`${message.author}, küfür yasak!`).then(m => setTimeout(() => m.delete(), 3000));
    }

    // --- YETKİ KONTROLÜ (Sadece belirlenen rol kullanabilir) ---
    if (!message.content.startsWith(PREFIX)) return;
    if (!message.member.roles.cache.has(YETKILI_ROL_ID)) return;

    const command = message.content.slice(PREFIX.length).trim().split(/ +/g).shift().toLowerCase();

    // .aktif Komutu
    if (command === 'aktif') {
        return message.reply('✅ **Sistemler Aktif!**');
    }

    // .miras Komutu
    if (command === 'miras') {
        const embed = new EmbedBuilder()
            .setTitle('Miras-Autorazer')
            .setDescription('Sistemler sorunsuz çalışıyor.')
            .setColor('DarkRed');
        return message.channel.send({ embeds: [embed] });
    }

    // .join Komutu
    if (command === 'join') {
        const channel = message.guild.channels.cache.get(SES_KANALI_ID);
        if (!channel) return;

        try {
            joinVoiceChannel({
                channelId: channel.id,
                guildId: channel.guild.id,
                adapterCreator: channel.guild.voiceAdapterCreator,
            });
            message.reply(`🎤 **${channel.name}** kanalına giriş yapıldı!`);
        } catch (error) {
            console.error(error);
        }
    }
});

// --- SELF-PING ---
setInterval(() => {
    axios.get('https://PROJE_ADIN.onrender.com').catch(() => {});
}, 300000);

client.login(process.env.TOKEN);
