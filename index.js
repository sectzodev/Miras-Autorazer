// ============================================= //
//                MİRAS BOT - ANA DOSYA           //
// ============================================= //
//   Geliştirici: Lediax                          //
//   Versiyon: 2.0.0                              //
//   Tarih: 2024                                  //
// ============================================= //

// ----------------------------- //
// 1. KISIM: MODÜLLER VE TANIMLAMALAR
// ----------------------------- //
const { 
    Client, 
    GatewayIntentBits, 
    Partials, 
    EmbedBuilder, 
    AuditLogEvent, 
    ActivityType, 
    ChannelType, 
    PermissionsBitField,
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    UserSelectMenuBuilder 
} = require('discord.js');

const { joinVoiceChannel } = require('@discordjs/voice');
const express = require('express');
const axios = require('axios');
const fs = require('fs');
//require('dotenv').config(); // .env dosyası için

// ----------------------------- //
// 2. KISIM: WEB SUNUCUSU (UPTIME)
// ----------------------------- //
const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => {
    res.send(`
        <html>
            <head><title>Miras Bot</title></head>
            <body style="background:#1a1a1a; color:#fff; font-family:Arial; text-align:center; padding:50px;">
                <h1>🚀 Miras Bot Aktif!</h1>
                <p>Bot başarıyla çalışıyor...</p>
                <small>${new Date().toLocaleString('tr-TR')}</small>
            </body>
        </html>
    `);
});

app.listen(PORT, () => {
    console.log(`✅ [WEB] Sunucu ${PORT} portunda hazır.`);
});

// ----------------------------- //
// 3. KISIM: BOT YAPILANDIRMASI
// ----------------------------- //
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildMessageReactions
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

// ============================================= //
//                SABİT DEĞERLER                 //
// ============================================= //

// ----------------------------- //
// 4. KISIM: SUNUCU ID'LERİ
// ----------------------------- //
const CONFIG = {
    // KANALLAR
    SES_KANALI_ID: "1482109855396397067",
    LOG_KANALI_ID: "1482109841957720156",
    HOSGELDIN_KANALI_ID: "1482109813679980724",
    RANK_LOG_KANALI_ID: "1482109811427512472",
    OZEL_ODA_OLUSTUR_ID: "1482378885612961857",
    BOT_SES_KANALI: "1482521752667160626",
    
    // ROLLER
    YETKILI_ROL_ID: "1467952691169722422",
    LONCA_ROL_ID: "1482109680263237702",
    GUVENLI_ROLLER: ["1482109649044901940", "1482109646058815488", "1482109647275036875"],
    
    // DİĞER
    LONCA_TAGI: "1991",
    PREFIX: ".",
    BANNER_URL: 'https://cdn.discordapp.com/attachments/1482526015845830826/1482745255315898581/ezgif-549c4f5ac95252e7.gif?ex=69b811a0&is=69b6c020&hm=764e8b2cd76a32bfa33811a33182a84d1ff5e51816591ff1e0828dcf998e0ff6&'
};

// ----------------------------- //
// 5. KISIM: TASARIM SABİTLERİ
// ----------------------------- //
const TASARIM = {
    RENK: '#2b2d31',        // Koyu tema ana rengi
    ALT_BILGI: 'Miras Bot | Miras System',
    EMOJILER: {
    BASARI: '✅',
    HATA: '❌',
    UYARI: '⚠️',
    BILGI: 'ℹ️',
    KILIT: '🔒',
    KILIT_ACIK: '🔓',
    GIZLE: '🙈',
    GOSTER: '👁️',
    AT: '🚪',
    YASAKLA: '🔨',
    AFK: '💤',
    SEVIYE: '📊'
    }
};

// ----------------------------- //
// 6. KISIM: VERİ YAPILARI
// ----------------------------- //
const afkData = new Map();           // AFK kullanıcıları
const ozelOdalar = new Set();        // Özel odalar
let xpData = {};                     // Seviye verileri

// XP verilerini yükle
try {
    if (fs.existsSync('./levels.json')) {
        xpData = JSON.parse(fs.readFileSync('./levels.json', 'utf8'));
        console.log('✅ [VERI] Seviye verileri yüklendi.');
    }
} catch (e) { 
    console.error('❌ [VERI] Level dosyası okunamadı:', e); 
}

// XP verilerini kaydet
function saveXpData() {
    try { 
        fs.writeFileSync('./levels.json', JSON.stringify(xpData, null, 2));
    } catch (e) { 
        console.error('❌ [VERI] Level kaydedilemedi:', e); 
    }
}

// ============================================= //
//              YARDIMCI FONKSİYONLAR            //
// ============================================= //

// ----------------------------- //
// 7. KISIM: LOG GÖNDERME FONKSİYONU
// ----------------------------- //
async function sendLog(baslik, icerik, ekstra = {}) {
    try {
        const logKanal = client.channels.cache.get(CONFIG.LOG_KANALI_ID);
        if (!logKanal) return;

        const embed = new EmbedBuilder()
            .setAuthor({ 
                name: `Miras | ${baslik}`, 
                iconURL: client.user.displayAvatarURL() 
            })
            .setDescription([
                `\`\`\`📋 İŞLEM DETAYLARI\`\`\``,
                icerik,
                '',
                `🕐 **Zaman:** <t:${Math.floor(Date.now()/1000)}:F>`
            ].join('\n'))
            .setColor(TASARIM.RENK)
            .setImage(CONFIG.BANNER_URL)
            .setFooter({ 
                text: TASARIM.ALT_BILGI, 
                iconURL: client.user.displayAvatarURL() 
            })
            .setTimestamp();

        if (ekstra.thumbnail) embed.setThumbnail(ekstra.thumbnail);
        if (ekstra.kullanici) embed.addFields({ name: '👤 Kullanıcı', value: `<@${ekstra.kullanici}>`, inline: true });
        if (ekstra.yetkili) embed.addFields({ name: '🛠️ Yetkili', value: `<@${ekstra.yetkili}>`, inline: true });

        await logKanal.send({ embeds: [embed] });
    } catch (e) { 
        console.error('❌ [LOG] Log gönderilemedi:', e); 
    }
}

// ----------------------------- //
// 8. KISIM: DENETİM KAYDI BULUCU
// ----------------------------- //
async function getAuditExecutor(guild, islemTipi) {
    if (!guild) return null;
    try {
        const auditLogs = await guild.fetchAuditLogs({ 
            limit: 1, 
            type: islemTipi 
        });
        const log = auditLogs.entries.first();
        
        if (!log) return null;
        // Son 5 saniye içinde yapılmış işlemleri al
        if (Date.now() - log.createdTimestamp < 5000) {
            return log.executor;
        }
        return null;
    } catch (e) { 
        return null; 
    }
}

// ----------------------------- //
// 9. KISIM: GUARD GÜVENLİK KONTROLÜ
// ----------------------------- //
function isMemberSafe(member) {
    if (!member) return false;
    if (member.id === member.guild.ownerId) return true;      // Sunucu sahibi
    if (member.id === client.user.id) return true;            // Bot'un kendisi
    if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return true; // Admin
    
    // Güvenli rollerden birine sahip mi?
    return member.roles.cache.some(role => 
        CONFIG.GUVENLI_ROLLER.includes(role.id)
    );
}

// ----------------------------- //
// 10. KISIM: GUARD CEZA FONKSİYONU
// ----------------------------- //
async function punishUser(guild, hedefId, sebep) {
    try {
        const hedefUye = await guild.members.fetch(hedefId).catch(() => null);
        if (!hedefUye) return;
        
        // Sunucu sahibi veya bot mu?
        if (hedefUye.id === guild.ownerId || hedefUye.id === client.user.id) return;
        
        // Tüm rollerini al (yönetilen roller hariç)
        const alinacakRoller = hedefUye.roles.cache
            .filter(r => r.id !== guild.id && !r.managed)
            .map(r => r.id);
            
        if (alinacakRoller.length > 0) {
            await hedefUye.roles.remove(alinacakRoller, '🔒 Guard: Yetkisiz işlem');
        }
        
        await sendLog(
            '🛡️ GUARD SİSTEMİ', 
            `**Hedef:** ${hedefUye}\n**Eylem:** \`Tüm rolleri alındı\`\n**Sebep:** \`${sebep}\``,
            { kullanici: hedefId }
        );
    } catch (e) { 
        console.error('❌ [GUARD] Ceza hatası:', e); 
    }
}

// ============================================= //
//                BOT OLAYLARI                   //
// ============================================= //

// ----------------------------- //
// 11. KISIM: BOT HAZIR OLDUĞUNDA
// ----------------------------- //
client.once('ready', () => {
    console.log('\n' + '='.repeat(50));
    console.log(`🚀 ${client.user.tag} BAŞARIYLA BAŞLATILDI!`);
    console.log('='.repeat(50));
    console.log(`📊 Sunucu Sayısı: ${client.guilds.cache.size}`);
    console.log(`👥 Kullanıcı Sayısı: ${client.users.cache.size}`);
    console.log(`⏰ Başlama Zamanı: ${new Date().toLocaleString('tr-TR')}`);
    console.log('='.repeat(50) + '\n');

    // Bot durumu
    client.user.setPresence({
        activities: [{ 
            name: 'sectzo ❤ miras', 
            type: ActivityType.Watching 
        }],
        status: 'dnd'  // rahatsız etmeyin
    });
});

// ----------------------------- //
// 12. KISIM: HOŞ GELDİN MESAJI
// ----------------------------- //
client.on('guildMemberAdd', async (member) => {
    try {
        const hosgeldinKanal = member.guild.channels.cache.get(CONFIG.HOSGELDIN_KANALI_ID);
        if (!hosgeldinKanal) return;

        const embed = new EmbedBuilder()
            .setAuthor({ 
                name: '🎉 ARAMIZA KATILDI', 
                iconURL: member.user.displayAvatarURL({ dynamic: true }) 
            })
            .setDescription([
                `\`\`\`👤 KULLANICI BİLGİLERİ\`\`\``,
                `**Kullanıcı:** ${member}`,
                `**ID:** \`${member.id}\``,
                `**Hesap:** <t:${Math.floor(member.user.createdTimestamp/1000)}:R>`,
                `**Sıramız:** \`${member.guild.memberCount}. kişi\``,
                '',
                `\`\`\`📌 BİLGİLENDİRME\`\`\``,
                `Kuralları okumayı ve ismine \`${CONFIG.LONCA_TAGI}\` tagını almayı unutma!`,
                `Keyifli vakit geçirmen dileğiyle 🎈`
            ].join('\n'))
            .setColor(TASARIM.RENK)
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 1024 }))
            .setImage(CONFIG.BANNER_URL)
            .setFooter({ 
                text: TASARIM.ALT_BILGI, 
                iconURL: client.user.displayAvatarURL() 
            })
            .setTimestamp();

        await hosgeldinKanal.send({ 
            content: `${member} Sunucumuza hoş geldin! 🎉`, 
            embeds: [embed] 
        });
    } catch (e) {
        console.error('❌ [HOŞGELDİN] Hata:', e);
    }
});

// ----------------------------- //
// 13. KISIM: MESAJ SİLİNİNCE
// ----------------------------- //
client.on('messageDelete', async (message) => {
    if (!message.guild || message.author?.bot) return;
    
    const executor = await getAuditExecutor(message.guild, AuditLogEvent.MessageDelete);
    const silenKisi = executor ? executor.id : (message.author ? message.author.id : 'Bilinmiyor');

    await sendLog(
        '🗑️ MESAJ SİLİNDİ',
        [
            `**Kanal:** ${message.channel}`,
            `**Mesaj Sahibi:** ${message.author || 'Bilinmiyor'}`,
            `**Silen:** <@${silenKisi}>`,
            '',
            `\`\`\`📝 SİLİNEN MESAJ\`\`\``,
            message.content || '*İçerik bulunamadı*'
        ].join('\n'),
        { 
            kullanici: message.author?.id,
            yetkili: executor?.id 
        }
    );
});

// ----------------------------- //
// 14. KISIM: MESAJ DÜZENLENİNCE
// ----------------------------- //
client.on('messageUpdate', async (oldMessage, newMessage) => {
    if (!oldMessage.guild || oldMessage.author?.bot) return;
    if (oldMessage.content === newMessage.content) return;

    await sendLog(
        '✏️ MESAJ DÜZENLENDİ',
        [
            `**Kanal:** ${oldMessage.channel}`,
            `**Kullanıcı:** ${oldMessage.author}`,
            '',
            `\`\`\`📤 ESKİ MESAJ\`\`\``,
            oldMessage.content || '*İçerik yok*',
            '',
            `\`\`\`📥 YENİ MESAJ\`\`\``,
            newMessage.content || '*İçerik yok*'
        ].join('\n'),
        { kullanici: oldMessage.author?.id }
    );
});

// ----------------------------- //
// 15. KISIM: KULLANICI GÜNCELLEME
// ----------------------------- //
client.on('guildMemberUpdate', async (oldMember, newMember) => {
    try {
        // İsim değişikliği kontrolü
        if (oldMember.nickname !== newMember.nickname) {
            const executor = await getAuditExecutor(newMember.guild, AuditLogEvent.MemberUpdate);
            
            await sendLog(
                '🏷️ İSİM GÜNCELLEME',
                [
                    `**Kullanıcı:** ${newMember}`,
                    `**İşlemi Yapan:** ${executor ? executor : 'Kullanıcının kendisi'}`,
                    '',
                    `**Eski İsim:** \`${oldMember.nickname || oldMember.user.username}\``,
                    `**Yeni İsim:** \`${newMember.nickname || newMember.user.username}\``
                ].join('\n'),
                { 
                    kullanici: newMember.id,
                    yetkili: executor?.id 
                }
            );
        }

        // Rol değişikliği kontrolü
        if (oldMember.roles.cache.size !== newMember.roles.cache.size) {
            const executor = await getAuditExecutor(newMember.guild, AuditLogEvent.MemberRoleUpdate);
            
            // Eklenen veya silinen rolü bul
            const eskiRoller = oldMember.roles.cache.map(r => r.id);
            const yeniRoller = newMember.roles.cache.map(r => r.id);
            
            const eklenenRol = yeniRoller.find(id => !eskiRoller.includes(id));
            const silinenRol = eskiRoller.find(id => !yeniRoller.includes(id));
            
            if (eklenenRol) {
                await sendLog(
                    '➕ ROL EKLENDİ',
                    [
                        `**Kullanıcı:** ${newMember}`,
                        `**Yetkili:** ${executor || 'Sistem'}`,
                        `**Eklenen Rol:** <@&${eklenenRol}>`
                    ].join('\n'),
                    { 
                        kullanici: newMember.id,
                        yetkili: executor?.id 
                    }
                );
            }
            
            if (silinenRol) {
                await sendLog(
                    '➖ ROL ALINDI',
                    [
                        `**Kullanıcı:** ${newMember}`,
                        `**Yetkili:** ${executor || 'Sistem'}`,
                        `**Alınan Rol:** <@&${silinenRol}>`
                    ].join('\n'),
                    { 
                        kullanici: newMember.id,
                        yetkili: executor?.id 
                    }
                );
            }
        }

        // TAG KONTROLÜ (Lonca tagı)
        const isimdeTagVar = newMember.user.username.includes(CONFIG.LONCA_TAGI) || 
                            (newMember.nickname && newMember.nickname.includes(CONFIG.LONCA_TAGI));
        const roluVarMi = newMember.roles.cache.has(CONFIG.LONCA_ROL_ID);

        if (isimdeTagVar && !roluVarMi) {
            await newMember.roles.add(CONFIG.LONCA_ROL_ID, 'Taglı üye');
        } else if (!isimdeTagVar && roluVarMi) {
            await newMember.roles.remove(CONFIG.LONCA_ROL_ID, 'Tag silindi');
        }

    } catch (e) {
        console.error('❌ [GUILDMEMBERUPDATE] Hata:', e);
    }
});

// ----------------------------- //
// 16. KISIM: KANAL OLUŞTURMA
// ----------------------------- //
client.on('channelCreate', async (channel) => {
    if (ozelOdalar.has(channel.id)) return;
    
    const executor = await getAuditExecutor(channel.guild, AuditLogEvent.ChannelCreate);
    
    await sendLog(
        '📁 KANAL OLUŞTURULDU',
        [
            `**Kanal:** ${channel}`,
            `**İsim:** \`${channel.name}\``,
            `**Tip:** \`${channel.type}\``,
            `**Oluşturan:** ${executor || 'Bilinmiyor'}`
        ].join('\n'),
        { yetkili: executor?.id }
    );
});

// ----------------------------- //
// 17. KISIM: KANAL SİLİNİNCE (GUARD)
// ----------------------------- //
client.on('channelDelete', async (channel) => {
    if (ozelOdalar.has(channel.id)) return;
    
    const executor = await getAuditExecutor(channel.guild, AuditLogEvent.ChannelDelete);
    
    // GUARD KONTROLÜ
    if (executor) {
        const executorMember = await channel.guild.members.fetch(executor.id).catch(() => null);
        
        if (!isMemberSafe(executorMember)) {
            await punishUser(channel.guild, executor.id, 'İzinsiz kanal silme');
            
            // Silinen kanalı geri oluştur
            await channel.clone({ 
                name: channel.name,
                permissionOverwrites: channel.permissionOverwrites.cache,
                reason: '🛡️ Guard: İzinsiz silinen kanal kurtarıldı'
            }).catch(() => {});
        }
    }

    await sendLog(
        '🗑️ KANAL SİLİNDİ',
        [
            `**Kanal İsmi:** \`${channel.name}\``,
            `**Tip:** \`${channel.type}\``,
            `**Silen:** ${executor || 'Bilinmiyor'}`
        ].join('\n'),
        { yetkili: executor?.id }
    );
});

// ----------------------------- //
// 18. KISIM: ROL SİLİNİNCE (GUARD)
// ----------------------------- //
client.on('roleDelete', async (role) => {
    const executor = await getAuditExecutor(role.guild, AuditLogEvent.RoleDelete);
    
    // GUARD KONTROLÜ
    if (executor) {
        const executorMember = await role.guild.members.fetch(executor.id).catch(() => null);
        
        if (!isMemberSafe(executorMember)) {
            await punishUser(role.guild, executor.id, 'İzinsiz rol silme');
            
            // Silinen rolü geri oluştur
            await role.guild.roles.create({
                name: role.name,
                color: role.color,
                permissions: role.permissions,
                hoist: role.hoist,
                mentionable: role.mentionable,
                position: role.position,
                reason: '🛡️ Guard: İzinsiz silinen rol kurtarıldı'
            }).catch(() => {});
        }
    }

    await sendLog(
        '🔰 ROL SİLİNDİ',
        [
            `**Rol Adı:** \`${role.name}\``,
            `**Renk:** \`${role.hexColor}\``,
            `**Silen:** ${executor || 'Bilinmiyor'}`
        ].join('\n'),
        { yetkili: executor?.id }
    );
});

// ----------------------------- //
// 19. KISIM: KULLANICI YASAKLANDIĞINDA (GUARD)
// ----------------------------- //
client.on('guildBanAdd', async (ban) => {
    const executor = await getAuditExecutor(ban.guild, AuditLogEvent.MemberBanAdd);
    
    // GUARD KONTROLÜ
    if (executor) {
        const executorMember = await ban.guild.members.fetch(executor.id).catch(() => null);
        
        if (!isMemberSafe(executorMember)) {
            await punishUser(ban.guild, executor.id, 'İzinsiz üye yasaklama');
            
            // Banı geri al
            await ban.guild.members.unban(ban.user.id, '🛡️ Guard: İzinsiz ban geri alındı')
                .catch(() => {});
        }
    }

    await sendLog(
        '🔨 KULLANICI YASAKLANDI',
        [
            `**Kullanıcı:** ${ban.user} (\`${ban.user.id}\`)`,
            `**Yetkili:** ${executor || 'Bilinmiyor'}`,
            `**Sebep:** \`${ban.reason || 'Belirtilmedi'}\``
        ].join('\n'),
        { 
            kullanici: ban.user.id,
            yetkili: executor?.id,
            thumbnail: ban.user.displayAvatarURL({ dynamic: true })
        }
    );
});

// ----------------------------- //
// 20. KISIM: KULLANICI SUNUCUDAN AYRILDIĞINDA
// ----------------------------- //
client.on('guildMemberRemove', async (member) => {
    const executor = await getAuditExecutor(member.guild, AuditLogEvent.MemberKick);
    
    // Eğer kick ise
    if (executor) {
        const executorMember = await member.guild.members.fetch(executor.id).catch(() => null);
        
        if (!isMemberSafe(executorMember)) {
            await punishUser(member.guild, executor.id, 'İzinsiz üye atma (kick)');
        }

        await sendLog(
            '🚪 KULLANICI ATILDI (KICK)',
            [
                `**Kullanıcı:** ${member.user} (\`${member.user.id}\`)`,
                `**Yetkili:** ${executor}`
            ].join('\n'),
            { 
                kullanici: member.user.id,
                yetkili: executor.id,
                thumbnail: member.user.displayAvatarURL({ dynamic: true })
            }
        );
    } else {
        // Gönüllü ayrılma
        await sendLog(
            '👋 KULLANICI AYRILDI',
            [
                `**Kullanıcı:** ${member.user} (\`${member.user.id}\`)`,
                `**Sunucuda Kaldığı Süre:** ?`,
                `**Üye Sayısı:** \`${member.guild.memberCount}\``
            ].join('\n'),
            { 
                kullanici: member.user.id,
                thumbnail: member.user.displayAvatarURL({ dynamic: true })
            }
        );
    }
});

// ============================================= //
//              SES VE ÖZEL ODA SİSTEMİ          //
// ============================================= //

// ----------------------------- //
// 21. KISIM: SES DURUMU DEĞİŞİKLİĞİ
// ----------------------------- //
client.on('voiceStateUpdate', async (oldState, newState) => {
    try {
        const kullanici = newState.member;
        if (kullanici.user.bot) return;

        // ------------------------- //
        // SES LOGLARI
        // ------------------------- //
        if (!oldState.channelId && newState.channelId) {
            // Sese katılma
            if (newState.channelId !== CONFIG.OZEL_ODA_OLUSTUR_ID) {
                await sendLog(
                    '🔊 SESE KATILIM',
                    [
                        `**Kullanıcı:** ${kullanici}`,
                        `**Katıldığı Kanal:** ${newState.channel}`,
                        `**Kanaldaki Kişi Sayısı:** \`${newState.channel.members.size}\``
                    ].join('\n'),
                    { kullanici: kullanici.id }
                );
            }
        } 
        else if (oldState.channelId && !newState.channelId) {
            // Sesten ayrılma (özel oda değilse)
            if (!ozelOdalar.has(oldState.channelId)) {
                await sendLog(
                    '🔇 SESTEN AYRILMA',
                    [
                        `**Kullanıcı:** ${kullanici}`,
                        `**Ayrıldığı Kanal:** ${oldState.channel}`,
                        `**Kanalda Kalan Kişi:** \`${oldState.channel.members.size - 1}\``
                    ].join('\n'),
                    { kullanici: kullanici.id }
                );
            }
        }

        // ------------------------- //
        // ÖZEL ODA OLUŞTURMA
        // ------------------------- //
        if (newState.channelId === CONFIG.OZEL_ODA_OLUSTUR_ID) {
            try {
                // Yeni özel oda oluştur
                const yeniOda = await newState.guild.channels.create({
                    name: `🔊 ${kullanici.user.username}`,
                    type: ChannelType.GuildVoice,
                    parent: newState.channel.parentId,
                    permissionOverwrites: [
                        {
                            id: kullanici.id,
                            allow: [
                                PermissionsBitField.Flags.ManageChannels,
                                PermissionsBitField.Flags.MoveMembers,
                                PermissionsBitField.Flags.MuteMembers,
                                PermissionsBitField.Flags.DeafenMembers
                            ]
                        },
                        {
                            id: newState.guild.roles.everyone.id,
                            allow: [
                                PermissionsBitField.Flags.ViewChannel,
                                PermissionsBitField.Flags.Connect
                            ]
                        }
                    ]
                });

                // Set'e ekle
                ozelOdalar.add(yeniOda.id);
                
                // Kullanıcıyı yeni odaya taşı
                await newState.setChannel(yeniOda);

                // ------------------------- //
                // ODA KONTROL PANELİ
                // ------------------------- //
                const kontrolEmbed = new EmbedBuilder()
                    .setAuthor({ 
                        name: '🎮 ÖZEL ODA SİSTEMİ', 
                        iconURL: kullanici.user.displayAvatarURL() 
                    })
                    .setDescription([
                        `\`\`\`🔊 ODA KONTROL PANELİ\`\`\``,
                        `Merhaba ${kullanici}, özel odan başarıyla oluşturuldu!`,
                        `Aşağıdaki butonlarla odanı yönetebilirsin.`,
                        '',
                        `\`\`\`⚙️ KULLANILABİLİR KOMUTLAR\`\`\``,
                        `🔒 **Kilit/Aç** - Odayı herkese kapat/aç`,
                        `👁️ **Gizle/Göster** - Odayı gizle/göster`,
                        `🚪 **At** - Birini odadan at`,
                        `🔨 **Yasakla** - Birini odaya girmekten yasakla`
                    ].join('\n'))
                    .setColor(TASARIM.RENK)
                    .setImage(CONFIG.BANNER_URL)
                    .setFooter({ 
                        text: TASARIM.ALT_BILGI, 
                        iconURL: client.user.displayAvatarURL() 
                    });

                const kontrolButonlari = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('oda_kilit')
                        .setEmoji('🔒')
                        .setLabel('Kilit/Aç')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('oda_gizle')
                        .setEmoji('👁️')
                        .setLabel('Gizle/Göster')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('oda_kick')
                        .setEmoji('🚪')
                        .setLabel('At')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId('oda_ban')
                        .setEmoji('🔨')
                        .setLabel('Yasakla')
                        .setStyle(ButtonStyle.Danger)
                );

                await yeniOda.send({ 
                    content: `${kullanici}`,
                    embeds: [kontrolEmbed], 
                    components: [kontrolButonlari] 
                });

                console.log(`✅ [ODA] ${kullanici.user.username} için özel oda oluşturuldu.`);

            } catch (odaHatasi) {
                console.error('❌ [ODA] Özel oda oluşturulamadı:', odaHatasi);
            }
        }

        // ------------------------- //
        // BOŞ ÖZEL ODALARI SİL
        // ------------------------- //
        if (oldState.channelId && ozelOdalar.has(oldState.channelId)) {
            const eskiKanal = oldState.channel;
            if (eskiKanal && eskiKanal.members.size === 0) {
                setTimeout(async () => {
                    // Hala boş mu kontrol et
                    if (eskiKanal && eskiKanal.members.size === 0) {
                        await eskiKanal.delete('Boş özel oda temizlendi')
                            .catch(() => {});
                        ozelOdalar.delete(eskiKanal.id);
                        console.log(`🗑️ [ODA] Boş özel oda silindi.`);
                    }
                }, 5000); // 5 saniye bekle
            }
        }

    } catch (e) {
        console.error('❌ [VOICE] Ses sistemi hatası:', e);
    }
});

// ----------------------------- //
// 22. KISIM: BUTON ETKİLEŞİMLERİ (ÖZEL ODA)
// ----------------------------- //
client.on('interactionCreate', async (interaction) => {
    try {
        // Sadece buton ve user select menülerini işle
        if (!interaction.isButton() && !interaction.isUserSelectMenu()) return;
        
        // Özel oda kontrolü
        if (!ozelOdalar.has(interaction.channelId)) return;

        // Yetki kontrolü (odanın sahibi mi?)
        const odaninSahibi = interaction.channel.name.includes(interaction.user.username);
        if (!odaninSahibi && !interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return interaction.reply({ 
                content: '❌ Bu odayı yönetme yetkiniz yok!', 
                ephemeral: true 
            });
        }

        const channel = interaction.channel;
        const everyone = interaction.guild.roles.everyone;

        // ------------------------- //
        // BUTON İŞLEMLERİ
        // ------------------------- //
        if (interaction.isButton()) {
            
            // 🔒 KİLİT BUTONU
            if (interaction.customId === 'oda_kilit') {
                const suAnKilitli = channel.permissionsFor(everyone).has(PermissionsBitField.Flags.Connect) === false;
                
                await channel.permissionOverwrites.edit(everyone, {
                    Connect: suAnKilitli ? null : false
                });

                return interaction.reply({ 
                    content: suAnKilitli 
                        ? '🔓 **Oda kilidi açıldı!** Herkes katılabilir.' 
                        : '🔒 **Oda kilitlendi!** Sadece sen ve yetkililer katılabilir.',
                    ephemeral: true 
                });
            }

            // 👁️ GİZLE/GÖSTER BUTONU
            if (interaction.customId === 'oda_gizle') {
                const suAnGizli = channel.permissionsFor(everyone).has(PermissionsBitField.Flags.ViewChannel) === false;
                
                await channel.permissionOverwrites.edit(everyone, {
                    ViewChannel: suAnGizli ? null : false
                });

                return interaction.reply({ 
                    content: suAnGizli 
                        ? '👁️ **Oda görünür hale getirildi!**' 
                        : '🙈 **Oda gizlendi!** Sadece sen görebilirsin.',
                    ephemeral: true 
                });
            }

            // 🚪 AT BUTONU
            if (interaction.customId === 'oda_kick') {
                const menu = new ActionRowBuilder().addComponents(
                    new UserSelectMenuBuilder()
                        .setCustomId('select_kick')
                        .setPlaceholder('Atılacak kullanıcıyı seç...')
                        .setMaxValues(1)
                );

                return interaction.reply({ 
                    content: '🚪 **Atılacak kullanıcıyı seçin:**',
                    components: [menu], 
                    ephemeral: true 
                });
            }

            // 🔨 YASAKLA BUTONU
            if (interaction.customId === 'oda_ban') {
                const menu = new ActionRowBuilder().addComponents(
                    new UserSelectMenuBuilder()
                        .setCustomId('select_ban')
                        .setPlaceholder('Yasaklanacak kullanıcıyı seç...')
                        .setMaxValues(1)
                );

                return interaction.reply({ 
                    content: '🔨 **Yasaklanacak kullanıcıyı seçin:**',
                    components: [menu], 
                    ephemeral: true 
                });
            }
        }

        // ------------------------- //
        // USER SELECT MENU İŞLEMLERİ
        // ------------------------- //
        if (interaction.isUserSelectMenu()) {
            const hedefId = interaction.values[0];
            const hedefUye = await interaction.guild.members.fetch(hedefId).catch(() => null);

            if (!hedefUye) {
                return interaction.reply({ 
                    content: '❌ Kullanıcı bulunamadı!', 
                    ephemeral: true 
                });
            }

            // Ses kanalında mı kontrol et
            if (!hedefUye.voice.channel || hedefUye.voice.channel.id !== interaction.channelId) {
                return interaction.reply({ 
                    content: '❌ Bu kullanıcı odanda değil!', 
                    ephemeral: true 
                });
            }

            // Kendini atamazsın
            if (hedefId === interaction.user.id) {
                return interaction.reply({ 
                    content: '❌ Kendine işlem yapamazsın!', 
                    ephemeral: true 
                });
            }

            // ATMA İŞLEMİ
            if (interaction.customId === 'select_kick') {
                await hedefUye.voice.disconnect('Özel oda sahibi tarafından atıldı.');
                
                return interaction.reply({ 
                    content: `🚪 **${hedefUye.user.tag}** odadan atıldı.`, 
                    ephemeral: true 
                });
            }

            // YASAKLAMA İŞLEMİ
            if (interaction.customId === 'select_ban') {
                await hedefUye.voice.disconnect('Özel oda sahibi tarafından yasaklandı.');
                await channel.permissionOverwrites.edit(hedefId, {
                    Connect: false
                });

                return interaction.reply({ 
                    content: `🔨 **${hedefUye.user.tag}** odadan yasaklandı.`, 
                    ephemeral: true 
                });
            }
        }

    } catch (e) {
        console.error('❌ [INTERACTION] Hata:', e);
        
        // Hata durumunda kullanıcıya bilgi ver
        if (interaction.isRepliable()) {
            await interaction.reply({ 
                content: '❌ Bir hata oluştu!', 
                ephemeral: true 
            }).catch(() => {});
        }
    }
});

// ============================================= //
//                   KOMUTLAR                    //
// ============================================= //

// ----------------------------- //
// 23. KISIM: MESAJ İÇERİĞİ FİLTRELERİ
// ----------------------------- //
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    // ------------------------- //
    // KÜFÜR FİLTRESİ
    // ------------------------- //
    const kufurListesi = ['amk', 'aq', 'sik', 'yarrak', 'piç', 'orospu']; // Örnek liste
    const mesajKucuk = message.content.toLowerCase();

    if (kufurListesi.some(kufur => mesajKucuk.includes(kufur))) {
        try {
            await message.delete();
            
            const uyari = await message.channel.send({
                content: `${message.author}, ${TASARIM.EMOJILER.UYARI} **Bu sunucuda küfür etmek yasaktır!**`
            });
            
            setTimeout(() => uyari.delete().catch(() => {}), 3000);
        } catch (e) {}
    }

    // ------------------------- //
    // AFK KONTROLÜ (Etiketlenenler)
    // ------------------------- //
    if (message.mentions.users.size > 0) {
        message.mentions.users.forEach(async (user) => {
            if (afkData.has(user.id)) {
                const afkBilgi = afkData.get(user.id);
                
                const afkEmbed = new EmbedBuilder()
                    .setColor(TASARIM.RENK)
                    .setAuthor({ 
                        name: '💤 AFK SİSTEMİ', 
                        iconURL: user.displayAvatarURL() 
                    })
                    .setDescription([
                        `**${user.tag}** şu anda AFK.`,
                        `**Sebep:** \`${afkBilgi.sebep}\``,
                        `**AFK Süresi:** <t:${Math.floor(afkBilgi.zaman/1000)}:R>`
                    ].join('\n'));

                message.reply({ embeds: [afkEmbed] })
                    .then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
            }
        });
    }

    // ------------------------- //
    // AFK'DAN DÖNÜŞ KONTROLÜ
    // ------------------------- //
    if (afkData.has(message.author.id)) {
        const afkBilgi = afkData.get(message.author.id);
        afkData.delete(message.author.id);

        // İsmi geri değiştir
        if (message.member.manageable) {
            await message.member.setNickname(afkBilgi.eskiIsim, 'AFK\'dan dönüş')
                .catch(() => {});
        }

        const donusEmbed = new EmbedBuilder()
            .setColor(TASARIM.RENK)
            .setDescription(`${TASARIM.EMOJILER.AFK} ${message.author}, AFK modundan döndün. **${afkBilgi.sebep}**`)
            .setFooter({ text: `AFK süresi: ${Math.floor((Date.now() - afkBilgi.zaman)/60000)} dakika` });

        const donusMsg = await message.reply({ embeds: [donusEmbed] });
        setTimeout(() => donusMsg.delete().catch(() => {}), 5000);
    }

    // ------------------------- //
    // SEVİYE SİSTEMİ
    // ------------------------- //
    if (!message.content.startsWith(CONFIG.PREFIX)) {
        const kullaniciId = message.author.id;
        
        // Kullanıcı verisi yoksa oluştur
        if (!xpData[kullaniciId]) {
            xpData[kullaniciId] = { xp: 0, level: 1 };
        }

        // Rastgele XP ekle (15-25 arası)
        const eklenecekXp = Math.floor(Math.random() * 11) + 15;
        xpData[kullaniciId].xp += eklenecekXp;

        // Seviye atlama kontrolü
        const nextLevelXp = xpData[kullaniciId].level * 100;
        
        if (xpData[kullaniciId].xp >= nextLevelXp) {
            xpData[kullaniciId].xp -= nextLevelXp;
            xpData[kullaniciId].level += 1;
            saveXpData();

            // Seviye atlama mesajı
            const levelKanal = message.guild.channels.cache.get(CONFIG.RANK_LOG_KANALI_ID);
            if (levelKanal) {
                const levelEmbed = new EmbedBuilder()
                    .setColor(TASARIM.RENK)
                    .setAuthor({ 
                        name: '🎉 SEVİYE ATLADIN!', 
                        iconURL: message.author.displayAvatarURL({ dynamic: true }) 
                    })
                    .setDescription([
                        `Tebrikler ${message.author}!`,
                        `**Yeni seviyen:** \`${xpData[kullaniciId].level}\``
                    ].join('\n'))
                    .setImage(CONFIG.BANNER_URL)
                    .setFooter({ text: TASARIM.ALT_BILGI });

                levelKanal.send({ 
                    content: `${message.author}`, 
                    embeds: [levelEmbed] 
                });
            }
        } else {
            saveXpData();
        }
    }

    // ------------------------- //
    // KOMUTLARI İŞLEME
    // ------------------------- //
    if (!message.content.startsWith(CONFIG.PREFIX)) return;

    const args = message.content.slice(CONFIG.PREFIX.length).trim().split(/ +/);
    const komut = args.shift().toLowerCase();

    // ------------------------- //
    // YARDIM KOMUTU
    // ------------------------- //
    if (komut === 'yardim' || komut === 'help') {
        const yardimEmbed = new EmbedBuilder()
            .setAuthor({ 
                name: '📚 MİRAS BOT YARDIM MENÜSÜ', 
                iconURL: client.user.displayAvatarURL() 
            })
            .setDescription([
                `\`\`\`🔰 GENEL KOMUTLAR\`\`\``,
                `${CONFIG.PREFIX}yardim - Bu menüyü gösterir`,
                `${CONFIG.PREFIX}aktif - Bot istatistiklerini gösterir`,
                `${CONFIG.PREFIX}rank - Seviyenizi gösterir`,
                `${CONFIG.PREFIX}afk <sebep> - AFK moduna geçer`,
                '',
                `\`\`\`🛡️ YETKİLİ KOMUTLARI\`\`\``,
                `${CONFIG.PREFIX}sil <1-100> - Mesaj siler`,
                `${CONFIG.PREFIX}ban <@kişi> - Kullanıcıyı yasaklar`,
                `${CONFIG.PREFIX}unban <id> - Yasağı kaldırır`,
                `${CONFIG.PREFIX}join - Botu ses kanalına ekler`
            ].join('\n'))
            .setColor(TASARIM.RENK)
            .setImage(CONFIG.BANNER_URL)
            .setFooter({ 
                text: TASARIM.ALT_BILGI, 
                iconURL: client.user.displayAvatarURL() 
            });

        return message.reply({ embeds: [yardimEmbed] });
    }

    // ------------------------- //
    // AFK KOMUTU
    // ------------------------- //
    if (komut === 'afk') {
        const sebep = args.join(' ') || 'Sebep belirtilmedi';
        const eskiIsim = message.member.displayName;

        // AFK'ya ekle
        afkData.set(message.author.id, {
            sebep: sebep,
            zaman: Date.now(),
            eskiIsim: eskiIsim
        });

        // İsmini değiştir
        if (message.member.manageable) {
            let yeniIsim = `[AFK] ${eskiIsim}`;
            if (yeniIsim.length > 32) {
                yeniIsim = yeniIsim.substring(0, 32);
            }
            await message.member.setNickname(yeniIsim, 'AFK modu aktif')
                .catch(() => {});
        }

        const afkEmbed = new EmbedBuilder()
            .setColor(TASARIM.RENK)
            .setAuthor({ 
                name: '💤 AFK MODU AKTİF', 
                iconURL: message.author.displayAvatarURL() 
            })
            .setDescription([
                `Başarıyla AFK moduna geçtin.`,
                `**Sebep:** \`${sebep}\``,
                `**Süre:** Şimdi başladı`,
                '',
                `*Bir mesaj atana kadar AFK sayılacaksın.*`
            ].join('\n'))
            .setFooter({ text: TASARIM.ALT_BILGI });

        return message.reply({ embeds: [afkEmbed] });
    }

    // ------------------------- //
    // SİL KOMUTU
    // ------------------------- //
    if (komut === 'sil' || komut === 'temizle') {
        // Yetki kontrolü
        if (!message.member.roles.cache.has(CONFIG.YETKILI_ROL_ID)) {
            return message.reply('❌ Bu komutu kullanmak için yetkin yok!')
                .then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
        }

        const miktar = parseInt(args[0]);
        if (isNaN(miktar) || miktar < 1 || miktar > 100) {
            return message.reply('❌ Lütfen 1-100 arası bir sayı girin!')
                .then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
        }

        try {
            await message.delete();
            const silinen = await message.channel.bulkDelete(miktar, true);
            
            const cevap = await message.channel.send(
                `✅ **${silinen.size}** mesaj silindi.`
            );
            setTimeout(() => cevap.delete().catch(() => {}), 3000);
        } catch (e) {
            message.reply('❌ Mesajlar silinirken hata oluştu!')
                .then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
        }
    }

    // ------------------------- //
    // BAN KOMUTU
    // ------------------------- //
    if (komut === 'ban') {
        // Yetki kontrolü
        if (!message.member.roles.cache.has(CONFIG.YETKILI_ROL_ID)) {
            return message.reply('❌ Bu komutu kullanmak için yetkin yok!')
                .then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
        }

        const hedef = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
        const sebep = args.slice(1).join(' ') || 'Sebep belirtilmedi';

        if (!hedef) {
            return message.reply('❌ Lütfen bir kullanıcı etiketleyin veya ID girin!');
        }

        if (!hedef.bannable) {
            return message.reply('❌ Bu kullanıcıyı yasaklayamam!');
        }

        try {
            // DM göndermeyi dene
            await hedef.send(`⛔ **${message.guild.name}** sunucusundan yasaklandın!\n**Sebep:** ${sebep}`)
                .catch(() => {});

            await hedef.ban({ 
                reason: `${message.author.tag}: ${sebep}`,
                deleteMessageSeconds: 7*24*60*60 // 7 günlük mesajları sil
            });

            const banEmbed = new EmbedBuilder()
                .setColor(TASARIM.RENK)
                .setAuthor({ name: '🔨 KULLANICI YASAKLANDI', iconURL: client.user.displayAvatarURL() })
                .setDescription([
                    `**Hedef:** ${hedef} (\`${hedef.id}\`)`,
                    `**Yetkili:** ${message.author}`,
                    `**Sebep:** \`${sebep}\``
                ].join('\n'))
                .setFooter({ text: TASARIM.ALT_BILGI });

            message.reply({ embeds: [banEmbed] });
        } catch (e) {
            message.reply('❌ Banlama işlemi başarısız!');
        }
    }

    // ------------------------- //
    // UNBAN KOMUTU
    // ------------------------- //
    if (komut === 'unban') {
        // Yetki kontrolü
        if (!message.member.roles.cache.has(CONFIG.YETKILI_ROL_ID)) {
            return message.reply('❌ Bu komutu kullanmak için yetkin yok!')
                .then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
        }

        const hedefId = args[0];
        if (!hedefId) {
            return message.reply('❌ Lütfen bir kullanıcı ID\'si girin!');
        }

        try {
            await message.guild.members.unban(hedefId, `${message.author.tag} tarafından kaldırıldı`);
            
            const unbanEmbed = new EmbedBuilder()
                .setColor(TASARIM.RENK)
                .setDescription(`✅ **${hedefId}** ID'li kullanıcının yasağı kaldırıldı.`)
                .setFooter({ text: TASARIM.ALT_BILGI });

            message.reply({ embeds: [unbanEmbed] });
        } catch (e) {
            message.reply('❌ Banlı kullanıcı bulunamadı veya ID hatalı!');
        }
    }

    // ------------------------- //
    // RANK (SEVİYE) KOMUTU
    // ------------------------- //
    if (komut === 'rank' || komut === 'seviye' || komut === 'level') {
        const hedefKullanici = message.mentions.users.first() || message.author;
        const data = xpData[hedefKullanici.id] || { xp: 0, level: 1 };
        const sonrakiLevel = data.level * 100;
        const yuzde = Math.floor((data.xp / sonrakiLevel) * 100);

        // İlerleme çubuğu oluştur
        const barUzunluk = 20;
        const doluBar = Math.floor((yuzde / 100) * barUzunluk);
        const bosBar = barUzunluk - doluBar;
        const progressBar = '█'.repeat(doluBar) + '░'.repeat(bosBar);

        const rankEmbed = new EmbedBuilder()
            .setColor(TASARIM.RENK)
            .setAuthor({ 
                name: `📊 SEVİYE KARTI - ${hedefKullanici.username}`, 
                iconURL: hedefKullanici.displayAvatarURL({ dynamic: true }) 
            })
            .setDescription([
                `**Seviye:** \`${data.level}\``,
                `**XP:** \`${data.xp}/${sonrakiLevel}\``,
                `**İlerleme:** \`${yuzde}%\``,
                `\`\`\`${progressBar}\`\`\``,
                '',
                `*Sohbet ederek XP kazanabilirsin!*`
            ].join('\n'))
            .setThumbnail(hedefKullanici.displayAvatarURL({ dynamic: true, size: 256 }))
            .setImage(CONFIG.BANNER_URL)
            .setFooter({ text: TASARIM.ALT_BILGI });

        message.reply({ embeds: [rankEmbed] });
    }

    // ------------------------- //
    // AKTİF (UPTIME) KOMUTU
    // ------------------------- //
    if (komut === 'aktif' || komut === 'uptime' || komut === 'istatistik') {
        const uptime = client.uptime;
        const gun = Math.floor(uptime / 86400000);
        const saat = Math.floor((uptime % 86400000) / 3600000);
        const dakika = Math.floor((uptime % 3600000) / 60000);
        const saniye = Math.floor((uptime % 60000) / 1000);
        
        const ramKullanim = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
        const toplamRam = (process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2);
        
        const ping = client.ws.ping;

        const aktifEmbed = new EmbedBuilder()
            .setAuthor({ 
                name: '📊 MİRAS BOT İSTATİSTİKLERİ', 
                iconURL: client.user.displayAvatarURL() 
            })
            .setDescription([
                `\`\`\`⏱️ AKTİFLİK SÜRESİ\`\`\``,
                `**Gün:** \`${gun}\` **Saat:** \`${saat}\` **Dakika:** \`${dakika}\` **Saniye:** \`${saniye}\``,
                '',
                `\`\`\`📈 PERFORMANS\`\`\``,
                `**Ping:** \`${ping}ms\``,
                `**RAM Kullanım:** \`${ramKullanim} MB / ${toplamRam} MB\``,
                `**Node.js:** \`${process.version}\``,
                '',
                `\`\`\`👥 SUNUCU İSTATİSTİKLERİ\`\`\``,
                `**Sunucu Sayısı:** \`${client.guilds.cache.size}\``,
                `**Kullanıcı Sayısı:** \`${client.users.cache.size}\``,
                `**Kanal Sayısı:** \`${client.channels.cache.size}\``
            ].join('\n'))
            .setColor(TASARIM.RENK)
            .setImage(CONFIG.BANNER_URL)
            .setFooter({ 
                text: TASARIM.ALT_BILGI, 
                iconURL: client.user.displayAvatarURL() 
            })
            .setTimestamp();

        message.reply({ embeds: [aktifEmbed] });
    }

    // ------------------------- //
    // JOIN (SESE GİR) KOMUTU
    // ------------------------- //
    if (komut === 'join' || komut === 'katil') {
        // Yetki kontrolü
        if (!message.member.roles.cache.has(CONFIG.YETKILI_ROL_ID)) {
            return message.reply('❌ Bu komutu kullanmak için yetkin yok!')
                .then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
        }

        const sesKanal = client.channels.cache.get(CONFIG.BOT_SES_KANALI);
        
        if (!sesKanal || sesKanal.type !== ChannelType.GuildVoice) {
            return message.reply('❌ Ses kanalı bulunamadı!');
        }

        try {
            joinVoiceChannel({
                channelId: sesKanal.id,
                guildId: sesKanal.guild.id,
                adapterCreator: sesKanal.guild.voiceAdapterCreator
            });

            message.reply(`✅ Başarıyla **${sesKanal.name}** kanalına bağlandım!`);
        } catch (e) {
            message.reply('❌ Kanala bağlanırken hata oluştu!');
        }
    }
});

// ============================================= //
//              UPTIME VE HATA YÖNETİMİ          //
// ============================================= //

// ----------------------------- //
// 24. KISIM: UPTIME ROBOT İÇİN PING
// ----------------------------- //
setInterval(async () => {
    try {
        const renderUrl = process.env.RENDER_URL || 'https://miras-autorazer.onrender.com';
        await axios.get(renderUrl);
        console.log(`🔄 [UPTIME] Ping atıldı: ${new Date().toLocaleTimeString()}`);
    } catch (e) {
        console.error('❌ [UPTIME] Ping hatası:', e.message);
    }
}, 300000); // 5 dakika

// ----------------------------- //
// 25. KISIM: HATA YAKALAMA
// ----------------------------- //
process.on('unhandledRejection', (error) => {
    console.error('❌ [HATA] Yakalanmayan Promise Hatası:', error);
});

process.on('uncaughtException', (error) => {
    console.error('❌ [HATA] Yakalanmayan İstisna:', error);
});

// ----------------------------- //
// 26. KISIM: BOTU BAŞLAT
// ----------------------------- //
if (!process.env.TOKEN) {
    console.error('❌ [HATA] TOKEN bulunamadı! .env dosyasını kontrol et.');
    process.exit(1);
}

client.login(process.env.TOKEN)
    .then(() => console.log('✅ [BOT] Giriş başarılı!'))
    .catch(err => {
        console.error('❌ [BOT] Giriş başarısız:', err);
        process.exit(1);
    });

// ============================================= //
//                DOSYA SONU                     //
// ============================================= //
