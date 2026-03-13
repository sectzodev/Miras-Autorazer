const { Client, GatewayIntentBits, Partials, EmbedBuilder, AuditLogEvent } = require('discord.js');
const { joinVoiceChannel } = require('@discordjs/voice');
const express = require('express');
const axios = require('axios');

// --- WEB SUNUCUSU ---
const app = express();
app.get('/', (req, res) => res.send('Bot 7/24 Aktif!'));
app.listen(10000, () => console.log('Sunucu hazır.'));

// --- BOT AYARLARI ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildModeration // Ban/Kick logları için gerekli
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

const PREFIX = ".";
const SES_KANALI_ID = "1482109855396397067";
const YETKILI_ROL_ID = "1467952691169722422";
const LOG_KANALI_ID = "1482109841957720156";
const SUNUCU_ID = "1438245263948124303";
const LONCA_TAGI = "1991"; 
const LONCA_ROL_ID = "1482109680263237702";

const afklar = new Map();

// --- GENEL LOG FONKSİYONU ---
async function logGonder(baslik, aciklama, renk = "Blue") {
    const kanal = client.channels.cache.get(LOG_KANALI_ID);
    if (!kanal) return;
    const embed = new EmbedBuilder()
        .setTitle(baslik)
        .setDescription(aciklama)
        .setColor(renk)
        .setTimestamp();
    kanal.send({ embeds: [embed] }).catch(() => {});
}

// --- BOT HAZIR OLDUĞUNDA ---
client.once('ready', () => {
    console.log(`>>> ${client.user.tag} Aktif!`);
    client.user.setPresence({ activities: [], status: 'dnd' });
    logGonder("Bot Başlatıldı", "Bot başarıyla aktif oldu ve tüm sistemler yüklendi.", "Green");
});

// --- BAN (YASAKLAMA) LOG SİSTEMİ ---
client.on('guildBanAdd', async (ban) => {
    const fetchedLogs = await ban.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberBanAdd });
    const banLog = fetchedLogs.entries.first();
    
    let yapan = "Bilinmiyor";
    let sebep = ban.reason || "Sebep belirtilmemiş";

    if (banLog) {
        const { executor, target } = banLog;
        if (target.id === ban.user.id) yapan = executor.tag;
    }

    logGonder("🔴 Kullanıcı Banlandı", `**Banlanan:** ${ban.user.tag}\n**Banlayan:** ${yapan}\n**Sebep:** ${sebep}`, "Red");
});

// --- KICK (ATILMA) LOG SİSTEMİ ---
client.on('guildMemberRemove', async (member) => {
    // Üye kendi mi çıktı yoksa atıldı mı kontrolü
    const fetchedLogs = await member.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberKick });
    const kickLog = fetchedLogs.entries.first();

    if (kickLog && kickLog.target.id === member.id && kickLog.createdAt > (Date.now() - 5000)) {
        const { executor, reason } = kickLog;
        logGonder("🟠 Kullanıcı Atıldı (Kick)", `**Atılan:** ${member.user.tag}\n**Atan:** ${executor.tag}\n**Sebep:** ${reason || "Sebep belirtilmemiş"}`, "Orange");
    } else {
        // Eğer kick değilse sadece çıkış logu
        logGonder("Sunucudan Ayrıldı", `${member.user.tag} sunucudan çıkış yaptı.`, "Grey");
    }
});

// --- OTO LONCA ROL SİSTEMİ (1991) ---
client.on('guildMemberUpdate', async (oldMember, newMember) => {
    const hasTag = newMember.user.username.includes(LONCA_TAGI) || (newMember.nickname && newMember.nickname.includes(LONCA_TAGI));
    const hasRole = newMember.roles.cache.has(LONCA_ROL_ID);

    if (hasTag && !hasRole) {
        await newMember.roles.add(LONCA_ROL_ID).catch(() => {});
        logGonder("Lonca Rolü Verildi", `${newMember.user.tag} ismine **1991** ekledi.`, "Gold");
    } else if (!hasTag && hasRole) {
        await newMember.roles.remove(LONCA_ROL_ID).catch(() => {});
        logGonder("Lonca Rolü Alındı", `${newMember.user.tag} isminden **1991** çıkardı.`, "Red");
    }
});

// --- MESAJ ETKİLEŞİMLERİ ---
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;
    const msg = message.content.toLowerCase();

    // AFK Kontrol
    if (message.mentions.users.size > 0) {
        message.mentions.users.forEach(user => {
            if (afklar.has(user.id)) {
                const data = afklar.get(user.id);
                message.reply(`Etiketlediğin kullanıcı **${data.sebep}** sebebiyle AFK!`);
            }
        });
    }

    if (afklar.has(message.author.id)) {
        const oldData = afklar.get(message.author.id);
        afklar.delete(message.author.id);
        if (message.member.manageable) await message.member.setNickname(oldData.eskiAd).catch(() => {});
        message.reply("Tekrar hoş geldin, AFK modundan çıkarıldın.");
    }

    if (msg === 'sa') message.reply('Aleyküm Selam!');

    // Küfür Koruması
    const kufurler = ['kufur1', 'kufur2']; 
    if (kufurler.some(k => msg.includes(k))) {
        await message.delete().catch(() => {});
        logGonder("Küfür Engellendi", `${message.author.tag} küfürlü mesaj gönderdi.`, "DarkRed");
        return;
    }

    if (!message.content.startsWith(PREFIX)) return;
    const args = message.content.slice(PREFIX.length).trim().split(/ +/g);
    const command = args.shift().toLowerCase();

    // .afk Komutu
    if (command === 'afk') {
        const sebep = args.join(" ") || "Sebep belirtilmedi";
        const eskiAd = message.member.displayName;
        afklar.set(message.author.id, { sebep, eskiAd });
        if (message.member.manageable) await message.member.setNickname(`[AFK] ${eskiAd}`).catch(() => {});
        return message.reply(`Başarıyla AFK oldun: **${sebep}**`);
    }

    // Yetkili Komutları
    const yetkiliKomutlar = ['aktif', 'miras', 'join'];
    if (yetkiliKomutlar.includes(command) && !message.member.roles.cache.has(YETKILI_ROL_ID)) {
        return message.reply("❌ Bu komutu kullanmak için yetkiniz yetmiyor.");
    }

    if (command === 'aktif') return message.reply('✅ Sistemler Aktif!');
    if (command === 'join') {
        const channel = message.guild.channels.cache.get(SES_KANALI_ID);
        if (channel) {
            joinVoiceChannel({ channelId: channel.id, guildId: channel.guild.id, adapterCreator: channel.guild.voiceAdapterCreator });
            return message.reply(`🎤 Kanala girildi.`);
        }
    }
});

// Ses Logları
client.on('voiceStateUpdate', (oldState, newState) => {
    if (oldState.member.user.bot) return;
    if (!oldState.channelId && newState.channelId) {
        logGonder("Sese Katılım", `${newState.member.user.tag}, **${newState.channel.name}** kanalına girdi.`, "Green");
    } else if (oldState.channelId && !newState.channelId) {
        logGonder("Sesten Ayrılma", `${oldState.member.user.tag}, **${oldState.channel.name}** kanalından çıktı.`, "Red");
    }
});

setInterval(() => { axios.get('https://miras-autorazer.onrender.com').catch(() => {}); }, 300000);
client.login(process.env.TOKEN);
