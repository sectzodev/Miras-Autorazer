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
        .setFooter({ text: 'Miras-Autorazer Gelişmiş Log Sistemi', iconURL: client.user.displayAvatarURL() })
        .setTimestamp();
    
    if (thumbnail) embed.setThumbnail(thumbnail);
    kanal.send({ embeds: [embed] }).catch(() => {});
}

// --- BOT HAZIR ---
client.once('ready', () => {
    client.user.setPresence({ activities: [], status: 'dnd' });
    console.log(`>>> ${client.user.tag} Aktif! Tüm sistemler devrede.`);
    logGonder("🟢 Bot Başlatıldı", "**Sistem Durumu:** Tüm modüller, loglar ve moderasyon komutları başarıyla yüklendi.\n**Bağlantı:** Sorunsuz.", Colors.Green);
});

// --- HOŞ GELDİN MESAJI ---
client.on('guildMemberAdd', async (member) => {
    const kanal = member.guild.channels.cache.get(HOSGELDIN_KANALI_ID);
    if (!kanal) return;
    const embed = new EmbedBuilder()
        .setAuthor({ name: member.user.tag, iconURL: member.user.displayAvatarURL({ dynamic: true }) })
        .setTitle(`Sunucumuza Hoş Geldin!`)
        .setDescription(`Aramıza katıldığın için çok mutluyuz ${member}!\n\nSeninle birlikte koca bir aile olduk ve **${member.guild.memberCount}** kişiye ulaştık.\n\nKurallarımızı okumayı ve ismine **1991** tagını alarak loncamıza katılmayı unutma!`)
        .setThumbnail(member.user.displayAvatarURL({ size: 1024, dynamic: true }))
        .setColor(Colors.DarkRed)
        .setImage("https://i.imgur.com/your_banner_image_here.gif") // İstersen buraya sunucu banner'ı koyabilirsin
        .setTimestamp();
    kanal.send({ content: `${member}`, embeds: [embed] });
});

// --- BAN/KICK LOGLARI ---
client.on('guildBanAdd', async (ban) => {
    const fetchedLogs = await ban.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberBanAdd });
    const banLog = fetchedLogs.entries.first();
    let yapan = banLog ? banLog.executor : null;
    let sebep = ban.reason || "Sebep belirtilmemiş";
    
    logGonder("🔴 Kullanıcı Yasaklandı", `**Yasaklanan:** ${ban.user.tag} (${ban.user.id})\n**Yasaklayan:** ${yapan ? yapan.tag : "Bilinmiyor"}\n**Sebep:** ${sebep}`, Colors.Red, ban.user.displayAvatarURL());
});

client.on('guildMemberRemove', async (member) => {
    const fetchedLogs = await member.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberKick });
    const kickLog = fetchedLogs.entries.first();
    
    if (kickLog && kickLog.target.id === member.id && kickLog.createdAt > (Date.now() - 5000)) {
        logGonder("🟠 Kullanıcı Atıldı", `**Atılan:** ${member.user.tag} (${member.user.id})\n**Atan:** ${kickLog.executor.tag}\n**Sebep:** ${kickLog.reason || "Belirtilmemiş"}`, Colors.Orange, member.user.displayAvatarURL());
    } else {
        logGonder("⚪ Sunucudan Ayrıldı", `**Ayrılan:** ${member.user.tag} (${member.user.id})\nSunucudaki güncel kişi sayısı: **${member.guild.memberCount}**`, Colors.Grey, member.user.displayAvatarURL());
    }
});

// --- 1991 TAG KONTROL ---
client.on('guildMemberUpdate', async (oldMember, newMember) => {
    const hasTag = newMember.user.username.includes(LONCA_TAGI) || (newMember.nickname && newMember.nickname.includes(LONCA_TAGI));
    const hasRole = newMember.roles.cache.has(LONCA_ROL_ID);
    
    if (hasTag && !hasRole) {
        await newMember.roles.add(LONCA_ROL_ID).catch(() => {});
        logGonder("🟡 Lonca Rolü Verildi", `**Kullanıcı:** ${newMember.user.tag}\n**Durum:** İsmine **1991** tagı eklediği için rol verildi.`, Colors.Gold);
    } else if (!hasTag && hasRole) {
        await newMember.roles.remove(LONCA_ROL_ID).catch(() => {});
        logGonder("🟤 Lonca Rolü Alındı", `**Kullanıcı:** ${newMember.user.tag}\n**Durum:** İsminden **1991** tagını çıkardığı için rol geri alındı.`, Colors.DarkButNotBlack);
    }
});

// --- MESAJ ETKİLEŞİMLERİ ---
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;
    const msg = message.content.toLowerCase();

    // SA-AS 
    if (msg === 'sa') return message.reply({ content: 'Aleyküm Selam, hoş geldin!', allowedMentions: { repliedUser: true } });
    if (msg === 'hg') return message.reply({ content: 'Hoş bulduk!', allowedMentions: { repliedUser: true } });

    // KÜFÜR KORUMASI (İstisnasız Herkes İçin)
    const kufurler = ['kufur1', 'kufur2']; 
    if (kufurler.some(k => msg.includes(k))) {
        await message.delete().catch(() => {});
        message.channel.send(`⛔ ${message.author}, bu sunucuda küfürlü kelimeler kullanmak yasaktır!`).then(m => setTimeout(() => m.delete(), 4000));
        logGonder("🤬 Küfür Engellendi", `**Kullanıcı:** ${message.author.tag}\n**Kanal:** ${message.channel}\n**İçerik:** ||${message.content}||`, Colors.DarkRed);
        return; // İşlemi durdur
    }

    // AFK Kontrol (Etiket)
    if (message.mentions.users.size > 0) {
        message.mentions.users.forEach(user => {
            if (afklar.has(user.id)) {
                const data = afklar.get(user.id);
                const embed = new EmbedBuilder().setColor(Colors.Orange).setDescription(`⏳ **${user.username}** adlı kullanıcı şu an AFK.\n**Sebep:** ${data.sebep}\n**AFK Olma Zamanı:** <t:${Math.floor(data.zaman / 1000)}:R>`);
                message.reply({ embeds: [embed] });
            }
        });
    }

    // AFK'dan Çıkış
    if (afklar.has(message.author.id)) {
        const oldData = afklar.get(message.author.id);
        afklar.delete(message.author.id);
        if (message.member.manageable) await message.member.setNickname(oldData.eskiAd).catch(() => {});
        message.reply("🎉 Tekrar hoş geldin! Başarıyla AFK modundan çıkarıldın.").then(m => setTimeout(() => m.delete(), 5000));
        logGonder("🔙 AFK Bitişi", `**Kullanıcı:** ${message.author.tag} artık AFK değil.`, Colors.Green);
    }

    // --- KOMUTLAR ---
    if (!message.content.startsWith(PREFIX)) return;
    const args = message.content.slice(PREFIX.length).trim().split(/ +/g);
    const command = args.shift().toLowerCase();

    // 1. AFK KOMUTU (Herkes)
    if (command === 'afk') {
        const sebep = args.join(" ") || "Şu an buralarda değilim.";
        const eskiAd = message.member.displayName;
        afklar.set(message.author.id, { sebep, eskiAd, zaman: Date.now() });
        if (message.member.manageable) await message.member.setNickname(`[AFK] ${eskiAd}`).catch(() => {});
        
        const embed = new EmbedBuilder()
            .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
            .setTitle("💤 AFK Moduna Geçildi")
            .setDescription(`Başarıyla AFK moduna geçiş yaptın.\n\n**Sebep:** \`${sebep}\`\nBir mesaj gönderene kadar seni etiketleyenlere bu sebep gösterilecek.`)
            .setColor(Colors.DarkVividPink);
        logGonder("💤 AFK Girişi", `**Kullanıcı:** ${message.author.tag}\n**Sebep:** ${sebep}`, Colors.Grey);
        return message.reply({ embeds: [embed] });
    }

    // YETKİ KONTROLÜ (Geri kalan tüm komutlar için)
    const yetkiliKomutlar = ['aktif', 'miras', 'join', 'ban', 'kick', 'mute', 'slowmode', 'sil'];
    if (yetkiliKomutlar.includes(command) && !message.member.roles.cache.has(YETKILI_ROL_ID)) {
        return message.reply({ embeds: [new EmbedBuilder().setColor(Colors.Red).setDescription("❌ Bu komutu kullanmak için gerekli **Yetkili** rolüne sahip değilsin.")] });
    }

    // 2. DETAYLI BAN
    if (command === 'ban') {
        const user = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
        const reason = args.slice(1).join(" ") || "Yetkili tarafından sebep belirtilmedi.";
        
        if (!user) return message.reply({ embeds: [new EmbedBuilder().setColor(Colors.Red).setDescription("Lütfen yasaklanacak bir kullanıcıyı etiketleyin veya ID'sini girin.")] });
        if (user.id === message.author.id) return message.reply("Kendini banlayamazsın!");
        if (!user.bannable) return message.reply({ embeds: [new EmbedBuilder().setColor(Colors.Red).setDescription("Bu kullanıcının yetkisi benim yetkimden yüksek veya eşit, onu banlayamam.")] });

        await user.ban({ reason: `${message.author.tag} Tarafından: ${reason}` }).catch(() => message.reply("Bir hata oluştu."));
        
        const embed = new EmbedBuilder().setColor(Colors.DarkRed).setAuthor({ name: "Yasaklama İşlemi Başarılı" }).setDescription(`🔨 **${user.user.tag}** sunucudan yasaklandı!\n\n**Sebep:** \`${reason}\`\n**Yetkili:** ${message.author}`);
        return message.reply({ embeds: [embed] });
    }

    // 3. DETAYLI KICK
    if (command === 'kick') {
        const user = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
        const reason = args.slice(1).join(" ") || "Sebep belirtilmedi.";
        
        if (!user) return message.reply({ embeds: [new EmbedBuilder().setColor(Colors.Red).setDescription("Lütfen atılacak bir kullanıcıyı etiketleyin.")] });
        if (!user.kickable) return message.reply({ embeds: [new EmbedBuilder().setColor(Colors.Red).setDescription("Bu kullanıcıyı atacak yetkim yok.")] });

        await user.kick(`${message.author.tag} Tarafından: ${reason}`).catch(() => message.reply("Bir hata oluştu."));
        
        const embed = new EmbedBuilder().setColor(Colors.Orange).setAuthor({ name: "Atılma İşlemi Başarılı" }).setDescription(`👢 **${user.user.tag}** sunucudan atıldı!\n\n**Sebep:** \`${reason}\`\n**Yetkili:** ${message.author}`);
        return message.reply({ embeds: [embed] });
    }

    // 4. DETAYLI MUTE (TIMEOUT)
    if (command === 'mute') {
        const user = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
        const sure = args[1];
        const reason = args.slice(2).join(" ") || "Sebep belirtilmedi.";

        if (!user || !sure) return message.reply({ embeds: [new EmbedBuilder().setColor(Colors.Red).setDescription("Doğru kullanım: `.mute @etiket 10m [sebep]`\n(m: dakika, h: saat, d: gün)")] });
        if (user.isCommunicationDisabled()) return message.reply({ embeds: [new EmbedBuilder().setColor(Colors.Red).setDescription("Bu kullanıcı zaten susturulmuş!")] });
        if (user.roles.highest.position >= message.member.roles.highest.position) return message.reply("Senden üstte veya aynı yetkideki birini susturamazsın.");

        const msSure = ms(sure);
        if (!msSure || msSure > ms('28d')) return message.reply("Geçerli bir süre girin (Maksimum 28 gün). Örn: `10m`, `1h`");

        await user.timeout(msSure, `${message.author.tag} Tarafından: ${reason}`).catch(() => message.reply("Bir hata oluştu."));
        
        const embed = new EmbedBuilder().setColor(Colors.Yellow).setAuthor({ name: "Susturma İşlemi Başarılı" }).setDescription(`🔇 **${user.user.tag}** başarıyla susturuldu.\n\n**Süre:** \`${sure}\`\n**Sebep:** \`${reason}\`\n**Yetkili:** ${message.author}`);
        logGonder("🔇 Kullanıcı Susturuldu", `**Kullanıcı:** ${user.user.tag}\n**Yetkili:** ${message.author.tag}\n**Süre:** ${sure}\n**Sebep:** ${reason}`, Colors.Yellow, user.user.displayAvatarURL());
        return message.reply({ embeds: [embed] });
    }

    // 5. DETAYLI SLOWMODE
    if (command === 'slowmode') {
        const saniye = ms(args[0] || "0") / 1000;
        if (isNaN(saniye) || saniye < 0 || saniye > 21600) return message.reply({ embeds: [new EmbedBuilder().setColor(Colors.Red).setDescription("Lütfen 0 ile 21600 (6 saat) arası geçerli bir saniye/dakika girin. Örn: `.slowmode 5s` veya `.slowmode 10m`")] });

        await message.channel.setRateLimitPerUser(saniye);
        const embed = new EmbedBuilder().setColor(Colors.Green).setDescription(`⏱️ Bu kanalın yavaş modu **${saniye === 0 ? "kapatıldı" : saniye + " saniye olarak ayarlandı"}**.\nYetkili: ${message.author}`);
        return message.reply({ embeds: [embed] });
    }

    // 6. DETAYLI SIL (Sessiz Çalışır)
    if (command === 'sil') {
        const miktar = parseInt(args[0]);
        if (isNaN(miktar) || miktar < 1 || miktar > 100) return message.channel.send({ content: "Lütfen silmek için 1 ile 100 arasında bir sayı belirtin." }).then(m => setTimeout(() => m.delete(), 5000));
        
        await message.delete().catch(() => {}); // Komutu yazanın mesajını sil
        await message.channel.bulkDelete(miktar, true).catch(() => {});
        
        // Yanıtlama yapmadan (no reply) direkt kanala bilgi gönderir ve 5 saniye sonra siler
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(Colors.Aqua).setDescription(`🧹 Başarıyla **${miktar}** adet mesaj silindi.`)] }).then(m => setTimeout(() => m.delete(), 5000));
    }

    // 7. DETAYLI AKTİF
    if (command === 'aktif') {
        const embed = new EmbedBuilder()
            .setAuthor({ name: client.user.username + " Sistem Durumu", iconURL: client.user.displayAvatarURL() })
            .addFields(
                { name: '📡 Gecikme (Ping)', value: `\`${client.ws.ping}ms\``, inline: true },
                { name: '⏱️ Çalışma Süresi', value: `<t:${Math.floor((Date.now() - client.uptime) / 1000)}:R>`, inline: true },
                { name: '👥 Kullanıcılar', value: `\`${message.guild.memberCount}\``, inline: true }
            )
            .setColor(Colors.LuminousVividPink)
            .setFooter({ text: `Sorgulayan: ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
            .setTimestamp();
        return message.reply({ embeds: [embed] });
    }

    // 8. DETAYLI JOIN
    if (command === 'join') {
        const channel = message.guild.channels.cache.get(SES_KANALI_ID);
        if (!channel) return message.reply({ embeds: [new EmbedBuilder().setColor(Colors.Red).setDescription("Ses kanalı bulunamadı. Lütfen ID'yi kontrol edin.")] });
        
        try {
            joinVoiceChannel({ channelId: channel.id, guildId: channel.guild.id, adapterCreator: channel.guild.voiceAdapterCreator });
            const embed = new EmbedBuilder().setColor(Colors.Green).setDescription(`🎤 Başarıyla **${channel.name}** kanalına bağlandım ve nöbetteyim!`);
            return message.reply({ embeds: [embed] });
        } catch (error) {
            return message.reply("Ses kanalına bağlanırken bir hata oluştu.");
        }
    }
});

// --- SES LOGLARI ---
client.on('voiceStateUpdate', (oldState, newState) => {
    if (oldState.member.user.bot) return;
    if (!oldState.channelId && newState.channelId) {
        logGonder("📥 Sese Katılım", `**Kullanıcı:** ${newState.member.user.tag}\n**Kanal:** ${newState.channel.name}`, Colors.Green);
    } else if (oldState.channelId && !newState.channelId) {
        logGonder("📤 Sesten Ayrılma", `**Kullanıcı:** ${oldState.member.user.tag}\n**Kanal:** ${oldState.channel.name}`, Colors.Red);
    } else if (oldState.channelId !== newState.channelId) {
        logGonder("🔀 Kanal Değişimi", `**Kullanıcı:** ${newState.member.user.tag}\n**Eski:** ${oldState.channel.name}\n**Yeni:** ${newState.channel.name}`, Colors.Blue);
    }
});

// --- SELF-PING ---
setInterval(() => { axios.get('https://miras-autorazer.onrender.com').catch(() => {}); }, 300000);
client.login(process.env.TOKEN);
