const { Client, GatewayIntentBits, Partials, EmbedBuilder, AuditLogEvent, PermissionsBitField, Colors } = require('discord.js');
const { joinVoiceChannel } = require('@discordjs/voice');
const express = require('express');
const axios = require('axios');
const ms = require('ms');

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
        GatewayIntentBits.GuildModeration
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

const PREFIX = ".";
const SES_KANALI_ID = "1482109855396397067";
const YETKILI_ROL_ID = "1467952691169722422";
const LOG_KANALI_ID = "1482109841957720156";
const HOSGELDIN_KANALI_ID = "1482109813679980724";
const LONCA_TAGI = "1991"; 
const LONCA_ROL_ID = "1482109680263237702";

const afklar = new Map();

// --- GELİŞMİŞ LOG FONKSİYONU ---
async function logGonder(baslik, aciklama, renk = Colors.Blue, thumbnail = null) {
    const kanal = client.channels.cache.get(LOG_KANALI_ID);
    if (!kanal) return;
    const embed = new EmbedBuilder()
        .setTitle(baslik)
        .setDescription(aciklama)
        .setColor(renk)
        .setFooter({ text: 'Miras-Autorazer Denetim Sistemi', iconURL: client.user.displayAvatarURL() })
        .setTimestamp();
    if (thumbnail) embed.setThumbnail(thumbnail);
    kanal.send({ embeds: [embed] }).catch(() => {});
}

client.once('ready', () => {
    client.user.setPresence({ activities: [], status: 'dnd' });
    logGonder("🟢 Sistem Aktif", "Tüm denetim kayıtları ve moderasyon komutları yüklendi.", Colors.Green);
    console.log("Bot Aktif!");
});

// --- HOŞ GELDİN MESAJI (AİLE İFADESİ KALDIRILDI) ---
client.on('guildMemberAdd', async (member) => {
    const kanal = member.guild.channels.cache.get(HOSGELDIN_KANALI_ID);
    if (!kanal) return;
    const embed = new EmbedBuilder()
        .setAuthor({ name: member.user.tag, iconURL: member.user.displayAvatarURL({ dynamic: true }) })
        .setTitle(`Sunucuya Giriş Yapıldı`)
        .setDescription(`Selam ${member}! Sunucumuza giriş yaptın. Toplam **${member.guild.memberCount}** üyeye ulaştık.\n\nKuralları okumayı ve ismine **1991** tagını almayı unutma.`)
        .setColor(Colors.DarkRed)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setTimestamp();
    kanal.send({ content: `${member}`, embeds: [embed] });
});

// --- ÇOOOOOK DETAYLI LOG SİSTEMİ ---

// 1. Silinen Mesaj
client.on('messageDelete', message => {
    if (message.author?.bot) return;
    logGonder("🗑️ Mesaj Silindi", `**Kullanıcı:** ${message.author.tag}\n**Kanal:** ${message.channel}\n**İçerik:** ${message.content || "Görsel/Embed İçeriği"}`, Colors.Red);
});

// 2. Düzenlenen Mesaj
client.on('messageUpdate', (oldMsg, newMsg) => {
    if (oldMsg.author?.bot || oldMsg.content === newMsg.content) return;
    logGonder("✏️ Mesaj Düzenlendi", `**Kullanıcı:** ${oldMsg.author.tag}\n**Kanal:** ${oldMsg.channel}\n**Eski:** ${oldMsg.content}\n**Yeni:** ${newMsg.content}`, Colors.Orange);
});

// 3. İsim, Rol ve Tag Değişiklikleri
client.on('guildMemberUpdate', async (oldMember, newMember) => {
    // İsim Değişikliği
    if (oldMember.nickname !== newMember.nickname) {
        logGonder("👤 İsim Değiştirildi", `**Kullanıcı:** ${newMember.user.tag}\n**Eski:** ${oldMember.nickname || "Yok"}\n**Yeni:** ${newMember.nickname || "Yok"}`, Colors.Cyan);
    }
    
    // Rol Ekleme/Silme Logları
    if (oldMember.roles.cache.size < newMember.roles.cache.size) {
        const role = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id)).first();
        if(role) logGonder("✅ Rol Eklendi", `**Kullanıcı:** ${newMember.user.tag}\n**Rol:** ${role.name}`, Colors.Blue);
    }
    if (oldMember.roles.cache.size > newMember.roles.cache.size) {
        const role = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id)).first();
        if(role) logGonder("❌ Rol Alındı", `**Kullanıcı:** ${newMember.user.tag}\n**Rol:** ${role.name}`, Colors.Red);
    }

    // 1991 Tag Kontrolü
    const hasTag = newMember.user.username.includes(LONCA_TAGI) || (newMember.nickname && newMember.nickname.includes(LONCA_TAGI));
    const hasRole = newMember.roles.cache.has(LONCA_ROL_ID);
    if (hasTag && !hasRole) await newMember.roles.add(LONCA_ROL_ID).catch(() => {});
    else if (!hasTag && hasRole) await newMember.roles.remove(LONCA_ROL_ID).catch(() => {});
});

// 4. Kanal Oluşturma, Silme, Düzenleme
client.on('channelCreate', ch => logGonder("📁 Kanal Oluşturuldu", `**Ad:** ${ch.name}\n**Tür:** ${ch.type}`, Colors.Green));
client.on('channelDelete', ch => logGonder("📁 Kanal Silindi", `**Ad:** ${ch.name}`, Colors.DarkRed));
client.on('channelUpdate', (oldCh, newCh) => {
    if (oldCh.name !== newCh.name) logGonder("📁 Kanal Düzenlendi", `**Eski Ad:** ${oldCh.name}\n**Yeni Ad:** ${newCh.name}`, Colors.Yellow);
});

// 5. Ban, Unban ve Kick (Sunucudan Ayrılma)
client.on('guildBanAdd', ban => logGonder("🔴 Kullanıcı Yasaklandı", `**Kullanıcı:** ${ban.user.tag}\n**Sebep:** ${ban.reason || "Belirtilmedi"}`, Colors.Red, ban.user.displayAvatarURL()));
client.on('guildBanRemove', ban => logGonder("🔓 Yasak Kaldırıldı", `**Kullanıcı:** ${ban.user.tag}`, Colors.Green, ban.user.displayAvatarURL()));

client.on('guildMemberRemove', async (member) => {
    const fetchedLogs = await member.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberKick });
    const kickLog = fetchedLogs.entries.first();
    if (kickLog && kickLog.target.id === member.id && kickLog.createdAt > (Date.now() - 5000)) {
        logGonder("🟠 Kullanıcı Atıldı (Kick)", `**Atılan:** ${member.user.tag}\n**Atan:** ${kickLog.executor.tag}`, Colors.Orange, member.user.displayAvatarURL());
    } else {
        logGonder("⚪ Sunucudan Ayrıldı", `**Kullanıcı:** ${member.user.tag}`, Colors.Grey, member.user.displayAvatarURL());
    }
});

// 6. Ses Logları
client.on('voiceStateUpdate', (oldState, newState) => {
    if (oldState.member.user.bot) return;
    if (!oldState.channelId && newState.channelId) logGonder("📥 Sese Katılım", `**Kullanıcı:** ${newState.member.user.tag}\n**Kanal:** ${newState.channel.name}`, Colors.Green);
    else if (oldState.channelId && !newState.channelId) logGonder("📤 Sesten Ayrılma", `**Kullanıcı:** ${oldState.member.user.tag}\n**Kanal:** ${oldState.channel.name}`, Colors.Red);
});

// --- MESAJ ETKİLEŞİMLERİ & KOMUTLAR ---
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;
    const msg = message.content.toLowerCase();

    // SA-AS
    if (msg === 'sa') return message.reply({ content: 'Aleyküm Selam!', allowedMentions: { repliedUser: true } });

    // KÜFÜR KORUMASI (İstisnasız herkesi kapsar)
    const kufurler = ['kufur1', 'kufur2']; 
    if (kufurler.some(k => msg.includes(k))) {
        await message.delete().catch(() => {});
        return message.channel.send(`⛔ ${message.author}, bu sunucuda küfür yasak!`).then(m => setTimeout(() => m.delete().catch(()=>null), 4000));
    }

    // AFK Etiket Kontrolü
    if (message.mentions.users.size > 0) {
        message.mentions.users.forEach(user => {
            if (afklar.has(user.id)) message.reply(`⏳ **${user.username}** şu an AFK. Sebep: ${afklar.get(user.id).sebep}`).then(m => setTimeout(() => m.delete().catch(()=>null), 8000));
        });
    }

    // AFK'dan Çıkış
    if (afklar.has(message.author.id)) {
        const data = afklar.get(message.author.id);
        afklar.delete(message.author.id);
        if (message.member.manageable) await message.member.setNickname(data.eskiAd).catch(() => {});
        message.reply("🎉 Hoş geldin, AFK modundan çıktın.").then(m => setTimeout(() => m.delete().catch(()=>null), 5000));
    }

    if (!message.content.startsWith(PREFIX)) return;
    const args = message.content.slice(PREFIX.length).trim().split(/ +/g);
    const command = args.shift().toLowerCase();

    // Ortak mesaj silme fonksiyonu
    const replyClear = (text, color = Colors.Blue) => {
        message.reply({ embeds: [new EmbedBuilder().setColor(color).setDescription(text)] }).then(m => setTimeout(() => m.delete().catch(()=>null), 10000));
    };

    // 1. AFK KOMUTU
    if (command === 'afk') {
        const sebep = args.join(" ") || "AFK";
        const eskiAd = message.member.displayName;
        afklar.set(message.author.id, { sebep, eskiAd });
        if (message.member.manageable) await message.member.setNickname(`[AFK] ${eskiAd}`).catch(() => {});
        return replyClear(`💤 Başarıyla AFK oldun: **${sebep}**`, Colors.Grey);
    }

    // YETKİLİ KONTROLÜ
    const yetkiliKomutlar = ['ban', 'kick', 'mute', 'lock', 'unlock', 'sil', 'slowmode', 'aktif', 'join'];
    if (yetkiliKomutlar.includes(command) && !message.member.roles.cache.has(YETKILI_ROL_ID)) {
        return message.reply("❌ Yetkiniz yetersiz.").then(m => setTimeout(() => m.delete().catch(()=>null), 5000));
    }

    // 2. BAN (Özel Mesaj + Oto Silinen Cevap)
    if (command === 'ban') {
        const user = message.mentions.members.first();
        const reason = args.slice(1).join(" ") || "Sebep belirtilmedi.";
        if (!user) return message.reply("Kimi banlayayım?").then(m => setTimeout(() => m.delete().catch(()=>null), 5000));
        if (!user.bannable) return message.reply("Bu kullanıcıyı yasaklayamam.").then(m => setTimeout(() => m.delete().catch(()=>null), 5000));

        try { await user.send(`**${message.guild.name}** sunucusundan yasaklandın. Yetkili: ${message.author.tag}, Sebep: ${reason}`); } catch (e) {}
        await user.ban({ reason: `${message.author.tag}: ${reason}` });
        return replyClear(`🔨 **${user.user.tag}** sunucudan yasaklandı.\nSebep: ${reason}`, Colors.DarkRed);
    }

    // 3. KICK
    if (command === 'kick') {
        const user = message.mentions.members.first();
        const reason = args.slice(1).join(" ") || "Sebep belirtilmedi.";
        if (!user) return message.reply("Atılacak kişiyi etiketle.");
        await user.kick(reason);
        return replyClear(`👢 **${user.user.tag}** atıldı.\nSebep: ${reason}`, Colors.Orange);
    }

    // 4. MUTE
    if (command === 'mute') {
        const user = message.mentions.members.first();
        const sure = args[1];
        if (!user || !sure) return message.reply("Kullanım: `.mute @etiket 10m`");
        await user.timeout(ms(sure), `${message.author.tag} tarafından susturuldu.`);
        return replyClear(`🔇 **${user.user.tag}**, \`${sure}\` susturuldu.`, Colors.Yellow);
    }

    // 5. LOCK & UNLOCK
    if (command === 'lock') {
        await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false });
        return replyClear("🔒 Kanal başarıyla kilitlendi.", Colors.Red);
    }
    if (command === 'unlock') {
        await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: null });
        return replyClear("🔓 Kanal kilidi açıldı.", Colors.Green);
    }

    // 6. SİL (Temizle - Reply kullanmaz)
    if (command === 'sil') {
        const miktar = parseInt(args[0]);
        if (isNaN(miktar) || miktar < 1 || miktar > 100) return message.channel.send("1-100 arası sayı girin.").then(m => setTimeout(() => m.delete().catch(()=>null), 5000));
        await message.delete().catch(() => {});
        await message.channel.bulkDelete(miktar, true).catch(() => {});
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(Colors.Aqua).setDescription(`🧹 **${miktar}** mesaj temizlendi.`)] }).then(m => setTimeout(() => m.delete().catch(()=>null), 5000));
    }

    // 7. SLOWMODE
    if (command === 'slowmode') {
        const saniye = ms(args[0] || "0") / 1000;
        await message.channel.setRateLimitPerUser(saniye);
        return replyClear(`⏱️ Yavaş mod **${saniye}** saniye yapıldı.`, Colors.Green);
    }

    // 8. AKTİF & JOIN
    if (command === 'aktif') {
        return replyClear(`✅ Sistemler ve modüller 7/24 aktif durumda! Gecikme: ${client.ws.ping}ms`, Colors.LuminousVividPink);
    }
    
    if (command === 'join') {
        const channel = message.guild.channels.cache.get(SES_KANALI_ID);
        if (channel) joinVoiceChannel({ channelId: channel.id, guildId: channel.guild.id, adapterCreator: channel.guild.voiceAdapterCreator });
        return replyClear(`🎤 ${channel.name} kanalına giriş yapıldı.`, Colors.Green);
    }
});

// Otomatik Ping
setInterval(() => { axios.get('https://miras-autorazer.onrender.com').catch(() => {}); }, 300000);

client.login(process.env.TOKEN);
