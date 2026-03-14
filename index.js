const { Client, GatewayIntentBits, Partials, EmbedBuilder, AuditLogEvent, ActivityType, Colors } = require('discord.js');
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

// --- DENETİM KAYDI (AUDIT LOG) YAKALAYICI ---
async function getExecutor(guild, type) {
    try {
        const fetchedLogs = await guild.fetchAuditLogs({ limit: 1, type: type });
        const log = fetchedLogs.entries.first();
        if (!log) return null;
        if (Date.now() - log.createdTimestamp < 5000) return log.executor;
        return null;
    } catch (e) { return null; }
}

client.once('ready', () => {
    client.user.setPresence({ activities: [{ name: 'Geliştiriliyorum', type: ActivityType.Playing }], status: 'dnd' });
    logGonder("🟢 Sistem Aktif", "Tüm gelişmiş denetim kayıtları ve yetkili modülleri devrede.", Colors.Green);
    console.log("Bot Aktif!");
});

// --- HOŞ GELDİN MESAJI ---
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

// --- EN İNCE AYRINTISINA KADAR LOG SİSTEMİ ---

// 1. Silinen Mesaj
client.on('messageDelete', async message => {
    if (message.author?.bot || !message.guild) return;
    const executor = await getExecutor(message.guild, AuditLogEvent.MessageDelete);
    const kimSildi = executor && executor.id !== message.author.id ? `<@${executor.id}>` : `<@${message.author.id}> (Kendisi)`;
    logGonder("🗑️ Mesaj Silindi", `**Kullanıcı:** <@${message.author.id}>\n**Silen Kişi:** ${kimSildi}\n**Kanal:** <#${message.channel.id}>\n**İçerik:** \n> ${message.content || "*Mesaj içeriği metin değildi (Görsel/Embed)*"}`, Colors.Red);
});

// 2. Düzenlenen Mesaj
client.on('messageUpdate', (oldMsg, newMsg) => {
    if (oldMsg.author?.bot || oldMsg.content === newMsg.content) return;
    logGonder("✏️ Mesaj Düzenlendi", `**Kullanıcı:** <@${oldMsg.author.id}>\n**Kanal:** <#${oldMsg.channel.id}>\n**Eski Mesaj:** \n> ${oldMsg.content}\n**Yeni Mesaj:** \n> ${newMsg.content}`, Colors.Orange);
});

// 3. İsim ve Rol Değişiklikleri
client.on('guildMemberUpdate', async (oldMember, newMember) => {
    const executor = await getExecutor(newMember.guild, AuditLogEvent.MemberRoleUpdate) || await getExecutor(newMember.guild, AuditLogEvent.MemberUpdate);
    const yapan = executor ? `<@${executor.id}>` : "Bilinmiyor/Kendisi";

    if (oldMember.nickname !== newMember.nickname) {
        logGonder("👤 İsim Değiştirildi", `**Kullanıcı:** <@${newMember.user.id}>\n**İşlemi Yapan:** ${yapan}\n**Eski İsim:** \`${oldMember.nickname || oldMember.user.username}\`\n**Yeni İsim:** \`${newMember.nickname || newMember.user.username}\``, Colors.Cyan);
    }
    
    if (oldMember.roles.cache.size < newMember.roles.cache.size) {
        const role = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id)).first();
        if(role) logGonder("✅ Rol Eklendi", `**Kullanıcı:** <@${newMember.user.id}>\n**Rolü Veren:** ${yapan}\n**Verilen Rol:** <@&${role.id}>`, Colors.Blue);
    }
    
    if (oldMember.roles.cache.size > newMember.roles.cache.size) {
        const role = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id)).first();
        if(role) logGonder("❌ Rol Alındı", `**Kullanıcı:** <@${newMember.user.id}>\n**Rolü Alan:** ${yapan}\n**Alınan Rol:** <@&${role.id}>`, Colors.Red);
    }

    const hasTag = newMember.user.username.includes(LONCA_TAGI) || (newMember.nickname && newMember.nickname.includes(LONCA_TAGI));
    const hasRole = newMember.roles.cache.has(LONCA_ROL_ID);
    if (hasTag && !hasRole) await newMember.roles.add(LONCA_ROL_ID).catch(() => {});
    else if (!hasTag && hasRole) await newMember.roles.remove(LONCA_ROL_ID).catch(() => {});
});

// 4. Kanal Değişiklikleri
client.on('channelCreate', async ch => {
    const executor = await getExecutor(ch.guild, AuditLogEvent.ChannelCreate);
    const yapan = executor ? `<@${executor.id}>` : "Bilinmiyor";
    logGonder("📁 Kanal Oluşturuldu", `**Kanal:** <#${ch.id}>\n**Oluşturan Yetkili:** ${yapan}\n**Kanal Adı:** \`${ch.name}\``, Colors.Green);
});

client.on('channelDelete', async ch => {
    const executor = await getExecutor(ch.guild, AuditLogEvent.ChannelDelete);
    const yapan = executor ? `<@${executor.id}>` : "Bilinmiyor";
    logGonder("🗑️ Kanal Silindi", `**Silinen Kanal:** \`${ch.name}\`\n**Silen Yetkili:** ${yapan}`, Colors.DarkRed);
});

client.on('channelUpdate', async (oldCh, newCh) => {
    const executor = await getExecutor(newCh.guild, AuditLogEvent.ChannelUpdate);
    const yapan = executor ? `<@${executor.id}>` : "Bilinmiyor";
    if (oldCh.name !== newCh.name) logGonder("📁 Kanal Düzenlendi", `**Kanal:** <#${newCh.id}>\n**Düzenleyen Yetkili:** ${yapan}\n**Eski Ad:** \`${oldCh.name}\`\n**Yeni Ad:** \`${newCh.name}\``, Colors.Yellow);
});

// 5. Ban ve Unban 
client.on('guildBanAdd', async ban => {
    const executor = await getExecutor(ban.guild, AuditLogEvent.MemberBanAdd);
    const yapan = executor ? `<@${executor.id}>` : "Bilinmiyor";
    logGonder("🔴 Kullanıcı Yasaklandı (BAN)", `**Yasaklanan:** <@${ban.user.id}>\n**Yasaklayan Yetkili:** ${yapan}\n**Sebep:** \`${ban.reason || "Belirtilmedi"}\``, Colors.Red, ban.user.displayAvatarURL());
});

client.on('guildBanRemove', async ban => {
    const executor = await getExecutor(ban.guild, AuditLogEvent.MemberBanRemove);
    const yapan = executor ? `<@${executor.id}>` : "Bilinmiyor";
    logGonder("🔓 Yasak Kaldırıldı (UNBAN)", `**Kullanıcı:** <@${ban.user.id}>\n**Yasağı Kaldıran Yetkili:** ${yapan}`, Colors.Green, ban.user.displayAvatarURL());
});

// 6. Kick (Sunucudan Ayrılma / Atılma)
client.on('guildMemberRemove', async (member) => {
    const executor = await getExecutor(member.guild, AuditLogEvent.MemberKick);
    if (executor) {
        logGonder("🟠 Kullanıcı Atıldı (KICK)", `**Atılan Kişi:** <@${member.user.id}>\n**Atan Yetkili:** <@${executor.id}>`, Colors.Orange, member.user.displayAvatarURL());
    } else {
        logGonder("⚪ Sunucudan Ayrıldı", `**Kullanıcı:** <@${member.user.id}>\n**Güncel Üye Sayısı:** ${member.guild.memberCount}`, Colors.Grey, member.user.displayAvatarURL());
    }
});

// 7. Ses Logları
client.on('voiceStateUpdate', (oldState, newState) => {
    if (oldState.member.user.bot) return;
    if (!oldState.channelId && newState.channelId) logGonder("📥 Sese Katılım", `**Kullanıcı:** <@${newState.member.user.id}>\n**Kanal:** <#${newState.channel.id}>`, Colors.Green);
    else if (oldState.channelId && !newState.channelId) logGonder("📤 Sesten Ayrılma", `**Kullanıcı:** <@${oldState.member.user.id}>\n**Kanal:** <#${oldState.channel.id}>`, Colors.Red);
});

// --- MESAJ ETKİLEŞİMLERİ & KOMUTLAR ---
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;
    const msg = message.content.toLowerCase();

    // SA-AS
    if (msg === 'sa') return message.reply({ content: 'Aleyküm Selam!', allowedMentions: { repliedUser: true } });

    // KÜFÜR KORUMASI (Herkese Geçerli)
    const kufurler = ['kufur1', 'kufur2']; 
    if (kufurler.some(k => msg.includes(k))) {
        await message.delete().catch(() => {});
        return message.channel.send(`⛔ <@${message.author.id}>, bu sunucuda küfür yasak!`).then(m => setTimeout(() => m.delete().catch(()=>null), 4000));
    }

    // AFK Etiket Kontrolü
    if (message.mentions.users.size > 0) {
        message.mentions.users.forEach(user => {
            if (afklar.has(user.id)) message.reply(`⏳ <@${user.id}> şu an AFK. Sebep: **${afklar.get(user.id).sebep}**`).then(m => setTimeout(() => m.delete().catch(()=>null), 8000));
        });
    }

    if (afklar.has(message.author.id)) {
        const data = afklar.get(message.author.id);
        afklar.delete(message.author.id);
        if (message.member.manageable) await message.member.setNickname(data.eskiAd).catch(() => {});
        message.reply("🎉 Hoş geldin, AFK modundan çıktın.").then(m => setTimeout(() => m.delete().catch(()=>null), 5000));
    }

    if (!message.content.startsWith(PREFIX)) return;
    const args = message.content.slice(PREFIX.length).trim().split(/ +/g);
    const command = args.shift().toLowerCase();

    const replyClear = (text, color = Colors.Blue) => {
        message.reply({ embeds: [new EmbedBuilder().setColor(color).setDescription(text)] }).then(m => setTimeout(() => m.delete().catch(()=>null), 10000));
    };

    if (command === 'afk') {
        const sebep = args.join(" ") || "Belirtilmedi";
        const eskiAd = message.member.displayName;
        afklar.set(message.author.id, { sebep, eskiAd });
        if (message.member.manageable) await message.member.setNickname(`[AFK] ${eskiAd}`).catch(() => {});
        return replyClear(`💤 Başarıyla AFK oldun.\n**Sebep:** ${sebep}`, Colors.Grey);
    }

    const yetkiliKomutlar = ['ban', 'kick', 'mute', 'lock', 'unlock', 'sil', 'slowmode', 'aktif', 'join'];
    if (yetkiliKomutlar.includes(command) && !message.member.roles.cache.has(YETKILI_ROL_ID)) {
        return message.reply("❌ Yetkiniz yetersiz.").then(m => setTimeout(() => m.delete().catch(()=>null), 5000));
    }

    if (command === 'ban') {
        const user = message.mentions.members.first();
        const reason = args.slice(1).join(" ") || "Sebep belirtilmedi.";
        if (!user) return message.reply("Kimi banlayayım?").then(m => setTimeout(() => m.delete().catch(()=>null), 5000));
        if (!user.bannable) return message.reply("Bu kullanıcıyı yasaklayamam.").then(m => setTimeout(() => m.delete().catch(()=>null), 5000));

        try { await user.send(`**${message.guild.name}** sunucusundan yasaklandın.\nYetkili: <@${message.author.id}>\nSebep: ${reason}`); } catch (e) {}
        await user.ban({ reason: `${message.author.tag}: ${reason}` });
        return replyClear(`🔨 <@${user.id}> sunucudan yasaklandı.\n**Sebep:** ${reason}`, Colors.DarkRed);
    }

    if (command === 'kick') {
        const user = message.mentions.members.first();
        const reason = args.slice(1).join(" ") || "Sebep belirtilmedi.";
        if (!user) return message.reply("Atılacak kişiyi etiketle.");
        await user.kick(reason);
        return replyClear(`👢 <@${user.id}> atıldı.\n**Sebep:** ${reason}`, Colors.Orange);
    }

    if (command === 'mute') {
        const user = message.mentions.members.first();
        const sure = args[1];
        if (!user || !sure) return message.reply("Kullanım: `.mute @etiket 10m`");
        await user.timeout(ms(sure), `${message.author.tag} tarafından susturuldu.`);
        return replyClear(`🔇 <@${user.id}>, \`${sure}\` susturuldu.`, Colors.Yellow);
    }

    if (command === 'lock') {
        await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false });
        return replyClear("🔒 Kanal başarıyla kilitlendi.", Colors.Red);
    }

    if (command === 'unlock') {
        await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: null });
        return replyClear("🔓 Kanal kilidi açıldı.", Colors.Green);
    }

    if (command === 'sil') {
        const miktar = parseInt(args[0]);
        if (isNaN(miktar) || miktar < 1 || miktar > 100) return message.channel.send("1-100 arası sayı girin.").then(m => setTimeout(() => m.delete().catch(()=>null), 5000));
        await message.delete().catch(() => {});
        await message.channel.bulkDelete(miktar, true).catch(() => {});
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(Colors.Aqua).setDescription(`🧹 **${miktar}** mesaj temizlendi. İşlemi Yapan: <@${message.author.id}>`)] }).then(m => setTimeout(() => m.delete().catch(()=>null), 5000));
    }

    if (command === 'slowmode') {
        const saniye = ms(args[0] || "0") / 1000;
        await message.channel.setRateLimitPerUser(saniye);
        return replyClear(`⏱️ Yavaş mod **${saniye}** saniye yapıldı.`, Colors.Green);
    }

    // ÇOK DETAYLI AKTİF KOMUTU
    if (command === 'aktif') {
        const totalBellek = (process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2);
        const kullanilanBellek = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
        let sure = client.uptime;
        let saniye = Math.floor(sure / 1000);
        let dakika = Math.floor(saniye / 60);
        let saat = Math.floor(dakika / 60);
        let gun = Math.floor(saat / 24);
        saat %= 24; dakika %= 60; saniye %= 60;

        const aktifEmbed = new EmbedBuilder()
            .setTitle("📊 Sistem Durum Raporu (AKTİF)")
            .setColor(Colors.LuminousVividPink)
            .setThumbnail(client.user.displayAvatarURL())
            .addFields(
                { name: '🤖 Bot Durumu', value: `\`Geliştiriliyorum\` Modunda`, inline: true },
                { name: '🏓 Gecikme (Ping)', value: `\`${client.ws.ping}ms\``, inline: true },
                { name: '⏱️ Çalışma Süresi', value: `\`${gun} Gün, ${saat} Saat, ${dakika} Dk\``, inline: false },
                { name: '💾 RAM Kullanımı', value: `\`${kullanilanBellek} MB / ${totalBellek} MB\``, inline: true },
                { name: '👥 Sunucu Bilgisi', value: `\`${message.guild.memberCount}\` Üye`, inline: true },
                { name: '⚙️ Node.js Sürümü', value: `\`${process.version}\``, inline: true }
            )
            .setFooter({ text: `Sorgulayan: ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
            .setTimestamp();

        return message.reply({ embeds: [aktifEmbed] }).then(m => setTimeout(() => m.delete().catch(()=>null), 15000));
    }
    
    if (command === 'join') {
        const channel = message.guild.channels.cache.get(SES_KANALI_ID);
        if (channel) joinVoiceChannel({ channelId: channel.id, guildId: channel.guild.id, adapterCreator: channel.guild.voiceAdapterCreator });
        return replyClear(`🎤 <#${channel.id}> kanalına giriş yapıldı.`, Colors.Green);
    }
});

setInterval(() => { axios.get('https://miras-autorazer.onrender.com').catch(() => {}); }, 300000);

client.login(process.env.TOKEN);
