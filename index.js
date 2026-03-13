const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { joinVoiceChannel } = require('@discordjs/voice');
const express = require('express');
const axios = require('axios');

// --- WEB SUNUCUSU (7/24 Aktif Tutmak İçin) ---
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
const SES_KANALI_ID = "1482109855396397067"; // İstediğin kanal ID'si

// --- BOT HAZIR OLDUĞUNDA ---
client.once('ready', () => {
    console.log(`>>> ${client.user.tag} Aktif!`);
    client.user.setPresence({
        activities: [{ name: 'geliştiriliyorum' }],
        status: 'online'
    });
});

// --- KOMUTLAR ---
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;

    const command = message.content.slice(PREFIX.length).trim().split(/ +/g).shift().toLowerCase();

    // .aktif Komutu
    if (command === 'aktif') {
        return message.reply('✅ **Sistemler Aktif!** Bot şu an sorunsuz çalışıyor.');
    }

    // .miras Komutu
    if (command === 'miras') {
        const embed = new EmbedBuilder()
            .setTitle('Aga-Autorazer Miras Sistemi')
            .setDescription('Bu botun mirası geliştirilmeye devam ediyor...')
            .setColor('Gold')
            .setTimestamp();
        return message.channel.send({ embeds: [embed] });
    }

    // .join Komutu
    if (command === 'join') {
        const channel = message.guild.channels.cache.get(SES_KANALI_ID);
        if (!channel) return message.reply('Belirtilen ses kanalı bulunamadı!');

        try {
            joinVoiceChannel({
                channelId: channel.id,
                guildId: channel.guild.id,
                adapterCreator: channel.guild.voiceAdapterCreator,
            });
            message.reply(`🎤 **${channel.name}** kanalına giriş yapıldı!`);
        } catch (error) {
            console.error(error);
            message.reply('Kanala girerken bir hata oluştu.');
        }
    }
});

// --- SELF-PING (Render Kapandığında Uykudan Uyandırmak İçin) ---
setInterval(() => {
    // Buradaki URL kısmına Render'daki proje linkini yapıştıracaksın
    axios.get('https://PROJE_ADIN.onrender.com').catch(() => {});
}, 300000); // 5 dakikada bir kontrol eder

client.login(process.env.TOKEN);