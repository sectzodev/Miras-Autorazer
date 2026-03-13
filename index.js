const { Client, GatewayIntentBits, Partials, EmbedBuilder, AuditLogEvent, PermissionsBitField } = require('discord.js');
const { joinVoiceChannel } = require('@discordjs/voice');
const express = require('express');
const axios = require('axios');
const ms = require('ms'); // Zaman birimleri için

const app = express();
app.get('/', (req, res) => res.send('Bot 7/24 Aktif!'));
app.listen(10000, () => console.log('Sunucu hazır.'));

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildModeration
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

const PREFIX = ".";
const SES_KANALI_ID = "1482109855396397067";
const YETKILI_ROL_ID = "1467952691169722422";
const LOG_KANALI_ID = "1482109841957720156";
const HOSGELDIN_KANALI_ID = "1482109813679980724";
const SUNUCU_ID = "1438245263948124303";
const LONCA_TAGI = "1991"; 
const LONCA_ROL_ID = "1482109680263237702";

const afklar = new Map();

// --- LOG FONKSİYONU ---
async function logGonder(baslik, aciklama, renk = "Blue") {
    const kanal = client.channels.cache.get(LOG_KANALI_ID);
    if (!kanal) return;
    const embed = new EmbedBuilder().setTitle(baslik).setDescription(aciklama).setColor(renk).setTimestamp();
    kanal.send({ embeds: [embed] }).catch(() => {});
}

// --- BOT HAZIR ---
client.once('ready', () => {
    client.user.setPresence({ activities: [], status: 'dnd' });
    logGonder("Bot Başlatıldı", "Sistemler ve modernizasyon tamamlandı.", "Green");
});

// --- HOŞ GELDİN MESAJI ---
client.on('guildMemberAdd', async (member) => {
    const kanal = member.guild.channels.cache.get(HOSGELDIN_KANALI_ID);
    if (!kanal) return;

    const embed = new EmbedBuilder()
        .setTitle(`Aramıza Hoş Geldin!`)
        .setDescription(`Hoş geldin ${member}! Seninle beraber **${member.guild.memberCount}** kişi olduk.\n\nKuralları okumayı ve tagımızı almayı unutma!`)
        .setThumbnail(member.user.displayAvatarURL())
        .setColor("DarkRed")
        .setTimestamp();
    
    kanal.send({ embeds: [embed] });
});

// --- BAN/KICK LOGLARI ---
client.on('guildBanAdd', async (ban) => {
    const fetchedLogs = await ban.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberBanAdd });
    const banLog = fetchedLogs.entries.first();
    let yapan = banLog ? banLog.executor.tag : "Bilinmiyor";
    logGonder("🔴 Kullanıcı Banlandı", `**Banlanan:** ${ban.user.tag}\n**Banlayan:** ${yapan}\n**Sebep:** ${ban.reason || "Belirtilmedi"}`, "Red");
});

client.on('guildMemberRemove', async (member) => {
    const fetchedLogs = await member.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberKick });
    const kickLog = fetchedLogs.entries.first();
    if (kickLog && kickLog.target.id === member.id && kickLog.createdAt > (Date.now() - 5000)) {
        logGonder("🟠 Kullanıcı Atıldı", `**Atılan:** ${member.user.tag}\n**Atan:** ${kickLog.executor.tag}`, "Orange");
    } else {
        logGonder("Sunucudan Ayrıldı", `${member.user.tag} çıkış yaptı.`, "Grey");
    }
});

// --- 1991 TAG KONTROL ---
client.on('guildMemberUpdate', async (oldMember, newMember) => {
    const hasTag = newMember.user.username.includes(LONCA_TAGI) || (newMember.nickname && newMember.nickname.includes(LONCA_TAGI));
    const hasRole = newMember.roles.cache.has(LONCA_ROL_ID);
    if (hasTag && !hasRole) await newMember.roles.add(LONCA_ROL_ID).catch(() => {});
    else if (!hasTag && hasRole) await newMember.roles.remove(LONCA_ROL_ID).catch(() => {});
});

// --- MESAJLAR VE KOMUTLAR ---
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    const msg = message.content.toLowerCase();

    // SA-AS (Tek Cevap Garantili)
    if (msg === 'sa') {
        return message.reply({ content: 'Aleyküm Selam, hoş geldin!', allowedMentions: { repliedUser: true } });
    }

    // AFK Sistemi
    if (message.mentions.users.size > 0) {
        message.mentions.users.forEach(user => {
            if (afklar.has(user.id)) message.reply(`Etiketlediğin kullanıcı **${afklar.get(user.id).sebep}** sebebiyle AFK!`);
        });
    }
    if (afklar.has(message.author.id)) {
        const oldData = afklar.get(message.author.id);
        afklar.delete(message.author.id);
        if (message.member.manageable) await message.member.setNickname(oldData.eskiAd).catch(() => {});
        message.reply("AFK modundan çıkış yaptın.").then(m => setTimeout(() => m.delete(), 3000));
    }

    // Küfür Filtresi
    const kufurler = ['kufur1', 'kufur2']; 
    if (kufurler.some(k => msg.includes(k))) {
        await message.delete().catch(() => {});
        return;
    }

    if (!message.content.startsWith(PREFIX)) return;
    const args = message.content.slice(PREFIX.length).trim().split(/ +/g);
    const command = args.shift().toLowerCase();

    // .afk (Herkes)
    if (command === 'afk') {
        const sebep = args.join(" ") || "Sebep belirtilmedi";
        const eskiAd = message.member.displayName;
        afklar.set(message.author.id, { sebep, eskiAd });
        if (message.member.manageable) await message.member.setNickname(`[AFK] ${eskiAd}`).catch(() => {});
        return message.reply(`AFK oldun: **${sebep}**`);
    }

    // Yetkili Kontrolü
    const yetkiliKomutlar = ['aktif', 'join', 'ban', 'kick', 'mute', 'slowmode'];
    if (yetkiliKomutlar.includes(command) && !message.member.roles.cache.has(YETKILI_ROL_ID)) {
        return message.reply("❌ Yetkiniz bu komut için yetersiz.");
    }

    // --- YENİ MODERASYON KOMUTLARI ---
    if (command === 'ban') {
        const user = message.mentions.members.first();
        if (!user) return message.reply("Kimi banlayacağım?");
        await user.ban({ reason: args.slice(1).join(" ") }).catch(() => message.reply("Hata oluştu."));
        message.reply(`✅ ${user.user.tag} uçuruldu.`);
    }

    if (command === 'kick') {
        const user = message.mentions.members.first();
        if (!user) return message.reply("Kimi atacaksın?");
        await user.kick().catch(() => message.reply("Yetkim yetmiyor."));
        message.reply(`✅ ${user.user.tag} atıldı.`);
    }

    if (command === 'mute') {
        const user = message.mentions.members.first();
        const sure = args[1];
        if (!user || !sure) return message.reply(".mute @etiket 10m");
        await user.timeout(ms(sure)).catch(() => message.reply("Hata."));
        message.reply(`✅ ${user.user.tag}, ${sure} boyuncu susturuldu.`);
    }

    if (command === 'slowmode') {
        const saniye = parseInt(args[0]);
        if (isNaN(saniye)) return message.reply("Bir saniye belirt.");
        message.channel.setRateLimitPerUser(saniye);
        message.reply(`✅ Yavaş mod **${saniye}** saniye olarak ayarlandı.`);
    }

    if (command === 'aktif') return message.reply('✅ Sistemler Aktif!');
    if (command === 'join') {
        const channel = message.guild.channels.cache.get(SES_KANALI_ID);
        if (channel) joinVoiceChannel({ channelId: channel.id, guildId: channel.guild.id, adapterCreator: channel.guild.voiceAdapterCreator });
        return message.reply(`🎤 Kanala girildi.`);
    }
});

// Ses Logları
client.on('voiceStateUpdate', (oldState, newState) => {
    if (oldState.member.user.bot) return;
    if (!oldState.channelId && newState.channelId) logGonder("Sese Giriş", `${newState.member.user.tag}, ${newState.channel.name} kanalına girdi.`, "Green");
    else if (oldState.channelId && !newState.channelId) logGonder("Sesten Çıkış", `${oldState.member.user.tag}, ${oldState.channel.name} kanalından çıktı.`, "Red");
});

setInterval(() => { axios.get('https://miras-autorazer.onrender.com').catch(() => {}); }, 300000);
client.login(process.env.TOKEN);
