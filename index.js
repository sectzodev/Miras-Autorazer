const { Client, GatewayIntentBits, Partials, EmbedBuilder, AuditLogEvent, ActivityType, Colors, ChannelType, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, UserSelectMenuBuilder } = require('discord.js');
const { joinVoiceChannel } = require('@discordjs/voice');
const express = require('express');
const axios = require('axios');
const ms = require('ms');
const fs = require('fs');

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
const RANK_LOG_KANALI_ID = "1482109811427512472";
const OZEL_ODA_OLUSTUR_ID = "1482378885612961857";

const LONCA_TAGI = "1991"; 
const LONCA_ROL_ID = "1482109680263237702";

// GUARD GÜVENLİ (BEYAZ LİSTE) ROLLERİ
const GUVENLI_ROLLER = ["1482109649044901940", "1482109646058815488", "1482109647275036875"];

const afklar = new Map();
const ozelOdalar = new Set();
const ELEGANT_COLOR = '#2b2d31'; // Discord karanlık teması ile bütünleşen zarif renk

// --- RANK (SEVİYE) VERİTABANI ---
let xpData = {};
try {
    if (fs.existsSync('./levels.json')) xpData = JSON.parse(fs.readFileSync('./levels.json', 'utf8'));
} catch (e) { console.error("Level dosyası okunamadı."); }

function saveXp() {
    try { fs.writeFileSync('./levels.json', JSON.stringify(xpData, null, 2)); } 
    catch (e) { console.error("Level kaydedilemedi."); }
}

// --- GELİŞMİŞ VE ZARİF LOG FONKSİYONU ---
async function logGonder(baslik, aciklama, emoji = "📌", thumbnail = null) {
    try {
        const kanal = client.channels.cache.get(LOG_KANALI_ID);
        if (!kanal) return;
        const embed = new EmbedBuilder()
            .setAuthor({ name: `${emoji} ${baslik}`, iconURL: client.user.displayAvatarURL() })
            .setDescription(`\n${aciklama}\n`)
            .setColor(ELEGANT_COLOR)
            .setFooter({ text: 'Guard & Denetim Sistemi', iconURL: client.user.displayAvatarURL() })
            .setTimestamp();
        if (thumbnail) embed.setThumbnail(thumbnail);
        kanal.send({ embeds: [embed] }).catch(() => {});
    } catch (e) { console.error("Log gönderilirken hata oluştu."); }
}

// --- DENETİM KAYDI YAKALAYICI ---
async function getExecutor(guild, type) {
    if (!guild) return null;
    try {
        const fetchedLogs = await guild.fetchAuditLogs({ limit: 1, type: type });
        const log = fetchedLogs.entries.first();
        if (!log) return null;
        if (Date.now() - log.createdTimestamp < 5000) return log.executor;
        return null;
    } catch (e) { return null; }
}

// --- GUARD SİSTEMİ YARDIMCI FONKSİYONLARI ---
function isSafe(member) {
    if (!member) return true;
    if (member.id === member.guild.ownerId) return true; 
    if (member.id === client.user.id) return true; 
    return member.roles.cache.some(role => GUVENLI_ROLLER.includes(role.id));
}

async function cezalandir(guild, executorId, sebep) {
    try {
        const uye = await guild.members.fetch(executorId).catch(() => null);
        if (!uye) return;
        if (uye.id === guild.ownerId || uye.id === client.user.id) return;

        const alinacakRoller = uye.roles.cache.filter(r => r.id !== guild.id && !r.managed).map(r => r.id);
        if (alinacakRoller.length > 0) {
            await uye.roles.remove(alinacakRoller).catch(() => {});
        }
        logGonder("Guard Sistemi Devrede", `**Hedef:** <@${executorId}>\n**Eylem:** Tüm rolleri alındı.\n**Sebep:** ${sebep}`, "🛡️");
    } catch (e) { console.error("Guard ceza hatası:", e); }
}

client.once('clientReady', () => {
    client.user.setPresence({ activities: [{ name: 'sectzo❤miras', type: ActivityType.Watching }], status: 'dnd' });
    console.log("----------------------------");
    console.log(`${client.user.tag} ZARİF ARAYÜZLE BAŞLATILDI!`);
    console.log("----------------------------");
});

// --- HOŞ GELDİN ---
client.on('guildMemberAdd', async (member) => {
    const kanal = member.guild.channels.cache.get(HOSGELDIN_KANALI_ID);
    if (!kanal) return;
    const embed = new EmbedBuilder()
        .setAuthor({ name: member.user.username, iconURL: member.user.displayAvatarURL({ dynamic: true }) })
        .setDescription(`🎉 **Aramıza hoş geldin, ${member}!**\n\nSeninle birlikte **${member.guild.memberCount}** kişi olduk. Kuralları okumayı ve ismine \`1991\` tagını almayı unutma. Keyifli vakit geçirmen dileğiyle!\n`)
        .setColor(ELEGANT_COLOR)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setImage('https://i.imgur.com/your_elegant_divider.png') // İsteğe bağlı, ince bir çizgi görseli koyabilirsin.
        .setTimestamp();
    kanal.send({ content: `${member}`, embeds: [embed] });
});

// --- FULL LOG SİSTEMİ VE GUARD KONTROLLERİ ---
client.on('messageDelete', async (message) => {
    if (!message.guild || message.author?.bot) return;
    const executor = await getExecutor(message.guild, AuditLogEvent.MessageDelete);
    const kimSildi = executor ? `<@${executor.id}>` : (message.author ? `<@${message.author.id}>` : "Bilinmiyor");
    logGonder("Mesaj Silindi", `**Kanal:** <#${message.channel.id}>\n**Mesaj Sahibi:** ${message.author ? `<@${message.author.id}>` : "Bilinmiyor"}\n**Silen:** ${kimSildi}\n\n**İçerik:**\n\`\`\`${message.content || "İçerik Bulunamadı"}\`\`\``, "🗑️");
});

client.on('messageUpdate', (oldMsg, newMsg) => {
    if (!oldMsg.guild || oldMsg.author?.bot || oldMsg.content === newMsg.content) return;
    logGonder("Mesaj Düzenlendi", `**Kanal:** <#${oldMsg.channel.id}>\n**Kullanıcı:** <@${oldMsg.author?.id}>\n\n**Eski İçerik:**\n\`\`\`${oldMsg.content}\`\`\`\n**Yeni İçerik:**\n\`\`\`${newMsg.content}\`\`\``, "📝");
});

client.on('guildMemberUpdate', async (oldMember, newMember) => {
    if (oldMember.nickname !== newMember.nickname) {
        const executor = await getExecutor(newMember.guild, AuditLogEvent.MemberUpdate);
        logGonder("İsim Güncellendi", `**Kullanıcı:** <@${newMember.id}>\n**İşlemi Yapan:** ${executor ? `<@${executor.id}>` : "Kendisi"}\n\n**Eski:** \`${oldMember.nickname || "Yok"}\`\n**Yeni:** \`${newMember.nickname || "Yok"}\``, "👤");
    }
    if (oldMember.roles.cache.size !== newMember.roles.cache.size) {
        const executor = await getExecutor(newMember.guild, AuditLogEvent.MemberRoleUpdate);
        const fark = newMember.roles.cache.size > oldMember.roles.cache.size;
        const role = fark ? newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id)).first() : oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id)).first();
        if (role) {
            logGonder(fark ? "Rol Eklendi" : "Rol Alındı", `**Kullanıcı:** <@${newMember.id}>\n**Yetkili:** ${executor ? `<@${executor.id}>` : "Sistem"}\n**Rol:** <@&${role.id}>`, fark ? "✅" : "❌");
        }
    }
    const hasTag = newMember.user.username.includes(LONCA_TAGI) || (newMember.nickname && newMember.nickname.includes(LONCA_TAGI));
    const hasRole = newMember.roles.cache.has(LONCA_ROL_ID);
    if (hasTag && !hasRole) await newMember.roles.add(LONCA_ROL_ID).catch(() => {});
    else if (!hasTag && hasRole) await newMember.roles.remove(LONCA_ROL_ID).catch(() => {});
});

client.on('channelCreate', async (ch) => {
    if (ozelOdalar.has(ch.id)) return;
    const executor = await getExecutor(ch.guild, AuditLogEvent.ChannelCreate);
    logGonder("Kanal Oluşturuldu", `**Kanal:** <#${ch.id}>\n**Kanal Adı:** \`${ch.name}\`\n**Oluşturan:** ${executor ? `<@${executor.id}>` : "Bilinmiyor"}`, "📁");
});

// GUARD: Kanal Silinmesi
client.on('channelDelete', async (ch) => {
    if (ozelOdalar.has(ch.id)) return;
    const executor = await getExecutor(ch.guild, AuditLogEvent.ChannelDelete);
    
    if (executor) {
        const executorMember = await ch.guild.members.fetch(executor.id).catch(() => null);
        if (!isSafe(executorMember)) {
            await cezalandir(ch.guild, executor.id, "İzinsiz Kanal Silme");
            await ch.clone({ name: ch.name, permissionOverwrites: ch.permissionOverwrites.cache.map(p => p) }).catch(() => {});
        }
    }
    logGonder("Kanal Silindi", `**Kanal Adı:** \`${ch.name}\`\n**Silen:** ${executor ? `<@${executor.id}>` : "Bilinmiyor"}`, "🚨");
});

// GUARD: Rol Silinmesi
client.on('roleDelete', async (role) => {
    const executor = await getExecutor(role.guild, AuditLogEvent.RoleDelete);
    
    if (executor) {
        const executorMember = await role.guild.members.fetch(executor.id).catch(() => null);
        if (!isSafe(executorMember)) {
            await cezalandir(role.guild, executor.id, "İzinsiz Rol Silme");
            await role.guild.roles.create({ name: role.name, color: role.color, permissions: role.permissions, hoist: role.hoist, mentionable: role.mentionable, reason: "Guard Sistemi: Silinen rol kurtarıldı." }).catch(()=>{});
        }
    }
    logGonder("Rol Silindi", `**Rol Adı:** \`${role.name}\`\n**Silen:** ${executor ? `<@${executor.id}>` : "Bilinmiyor"}`, "🚨");
});

// GUARD: Kullanıcı Yasaklanması
client.on('guildBanAdd', async (ban) => {
    const executor = await getExecutor(ban.guild, AuditLogEvent.MemberBanAdd);
    
    if (executor) {
        const executorMember = await ban.guild.members.fetch(executor.id).catch(() => null);
        if (!isSafe(executorMember)) {
            await cezalandir(ban.guild, executor.id, "İzinsiz Üye Yasaklama");
            await ban.guild.members.unban(ban.user.id, "Guard Sistemi: İzinsiz ban geri alındı.").catch(() => {});
        }
    }
    logGonder("Kullanıcı Yasaklandı", `**Kullanıcı:** <@${ban.user.id}>\n**Yetkili:** ${executor ? `<@${executor.id}>` : "Bilinmiyor"}\n**Sebep:** \`${ban.reason || "Belirtilmedi"}\``, "🔨", ban.user.displayAvatarURL());
});

// GUARD: Kullanıcı Kick (Atılması)
client.on('guildMemberRemove', async (member) => {
    const executor = await getExecutor(member.guild, AuditLogEvent.MemberKick);
    if (executor) {
        const executorMember = await member.guild.members.fetch(executor.id).catch(() => null);
        if (!isSafe(executorMember)) {
            await cezalandir(member.guild, executor.id, "İzinsiz Üye Atma (Kick)");
        }
        logGonder("Kullanıcı Atıldı (Kick)", `**Kullanıcı:** <@${member.user.id}>\n**Yetkili:** <@${executor.id}>`, "🚪", member.user.displayAvatarURL());
    }
});

client.on('guildBanRemove', async (ban) => {
    const executor = await getExecutor(ban.guild, AuditLogEvent.MemberBanRemove);
    logGonder("Yasak Kaldırıldı", `**Kullanıcı:** <@${ban.user.id}>\n**Yetkili:** ${executor ? `<@${executor.id}>` : "Bilinmiyor"}`, "🔓", ban.user.displayAvatarURL());
});

// --- SES VE ÖZEL ODA SİSTEMİ (ZARİF TASARIM) ---
client.on('voiceStateUpdate', async (oldState, newState) => {
    if (oldState.member.user.bot) return;

    if (!oldState.channelId && newState.channelId && newState.channelId !== OZEL_ODA_OLUSTUR_ID) logGonder("Sese Katılım", `**Kullanıcı:** <@${newState.member.user.id}>\n**Kanal:** <#${newState.channel.id}>`, "📥");
    else if (oldState.channelId && !newState.channelId && !ozelOdalar.has(oldState.channelId)) logGonder("Sesten Ayrılma", `**Kullanıcı:** <@${oldState.member.user.id}>\n**Kanal:** <#${oldState.channel.id}>`, "📤");

    if (newState.channelId === OZEL_ODA_OLUSTUR_ID) {
        try {
            const channel = await newState.guild.channels.create({
                name: `🔊 ${newState.member.user.username}`,
                type: ChannelType.GuildVoice,
                parent: newState.channel.parentId,
                permissionOverwrites: [
                    { id: newState.member.id, allow: [PermissionsBitField.Flags.ManageChannels, PermissionsBitField.Flags.MoveMembers, PermissionsBitField.Flags.MuteMembers, PermissionsBitField.Flags.DeafenMembers] },
                    { id: newState.guild.roles.everyone.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect] }
                ]
            });
            ozelOdalar.add(channel.id);
            await newState.setChannel(channel).catch(() => channel.delete());

            const odaEmbed = new EmbedBuilder()
                .setAuthor({ name: 'Oda Kontrol Paneli', iconURL: newState.member.user.displayAvatarURL() })
                .setDescription(`Odanız başarıyla oluşturuldu!\n\nAşağıdaki butonları kullanarak odanızı yönetebilirsiniz:\n\n🔒 \`Odayı Kilitle\`\n👁️ \`Odayı Gizle\`\n🚪 \`Üyeyi At (Kick)\`\n🔨 \`Üyeyi Yasakla (Ban)\``)
                .setColor(ELEGANT_COLOR);

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('oda_kilit').setEmoji('🔒').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('oda_gizle').setEmoji('👁️').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('oda_kick').setEmoji('🚪').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('oda_ban').setEmoji('🔨').setStyle(ButtonStyle.Danger)
            );

            await channel.send({ content: `<@${newState.member.id}>`, embeds: [odaEmbed], components: [row] });

        } catch (error) { console.error("Özel oda oluşturulamadı.", error); }
    }

    if (oldState.channelId && ozelOdalar.has(oldState.channelId)) {
        if (oldState.channel && oldState.channel.members.size === 0) {
            await oldState.channel.delete().catch(()=>null);
            ozelOdalar.delete(oldState.channelId);
        }
    }
});

// --- ÖZEL ODA BUTON ETKİLEŞİMLERİ ---
client.on('interactionCreate', async interaction => {
    if (!interaction.isButton() && !interaction.isUserSelectMenu()) return;
    if (!ozelOdalar.has(interaction.channelId)) return;

    if (!interaction.channel.permissionsFor(interaction.member).has(PermissionsBitField.Flags.ManageChannels)) {
        return interaction.reply({ content: "❌ Bu odayı yönetme yetkiniz yok.", ephemeral: true });
    }

    const channel = interaction.channel;
    const everyone = interaction.guild.roles.everyone;

    if (interaction.customId === 'oda_kilit') {
        const isLocked = channel.permissionsFor(everyone).has(PermissionsBitField.Flags.Connect) === false;
        await channel.permissionOverwrites.edit(everyone, { Connect: isLocked ? null : false });
        return interaction.reply({ content: isLocked ? "🔓 Kilit açıldı. Herkes katılabilir." : "🔒 Oda kilitlendi.", ephemeral: true });
    }

    if (interaction.customId === 'oda_gizle') {
        const isHidden = channel.permissionsFor(everyone).has(PermissionsBitField.Flags.ViewChannel) === false;
        await channel.permissionOverwrites.edit(everyone, { ViewChannel: isHidden ? null : false });
        return interaction.reply({ content: isHidden ? "👁️ Oda görünür hale geldi." : "🙈 Oda gizlendi.", ephemeral: true });
    }

    if (interaction.customId === 'oda_kick' || interaction.customId === 'oda_ban') {
        const actionText = interaction.customId === 'oda_kick' ? 'Atılacak' : 'Yasaklanacak';
        const row = new ActionRowBuilder().addComponents(
            new UserSelectMenuBuilder().setCustomId(interaction.customId === 'oda_kick' ? 'select_kick' : 'select_ban').setPlaceholder(`Hedef kullanıcıyı seçin`)
        );
        return interaction.reply({ content: `${actionText} kişiyi seçin:`, components: [row], ephemeral: true });
    }

    if (interaction.isUserSelectMenu()) {
        const targetId = interaction.values[0];
        const targetMember = await interaction.guild.members.fetch(targetId).catch(() => null);

        if (!targetMember || !targetMember.voice.channel || targetMember.voice.channelId !== interaction.channelId) {
            return interaction.reply({ content: "❌ Kullanıcı bu odada değil.", ephemeral: true });
        }
        if (targetId === interaction.user.id) return interaction.reply({ content: "❌ Kendinize işlem uygulayamazsınız.", ephemeral: true });

        if (interaction.customId === 'select_kick') {
            await targetMember.voice.disconnect("Oda sahibi tarafından atıldı.");
            return interaction.reply({ content: `🚪 <@${targetId}> sesten atıldı.`, ephemeral: true });
        }

        if (interaction.customId === 'select_ban') {
            await targetMember.voice.disconnect("Oda sahibi tarafından yasaklandı.");
            await channel.permissionOverwrites.edit(targetId, { Connect: false });
            return interaction.reply({ content: `🔨 <@${targetId}> odadan yasaklandı.`, ephemeral: true });
        }
    }
});

// --- MESAJ KOMUTLARI VE ZARİF EMBEDLER ---
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;
    const msg = message.content.toLowerCase();

    // Küfür Filtresi
    const kufurler = ['kufur1', 'kufur2']; 
    if (kufurler.some(k => msg.includes(k))) {
        await message.delete().catch(() => {});
        return message.channel.send(`⛔ <@${message.author.id}>, bu sunucuda küfür kullanamazsın.`).then(m => setTimeout(() => m.delete().catch(()=>null), 4000));
    }

    // AFK Kontrol
    if (message.mentions.users.size > 0) {
        message.mentions.users.forEach(user => {
            if (afklar.has(user.id)) {
                const afkEmbed = new EmbedBuilder().setColor(ELEGANT_COLOR).setDescription(`💤 <@${user.id}> şu an AFK.\n\n**Sebep:** \`${afklar.get(user.id).sebep}\``);
                message.reply({ embeds: [afkEmbed] }).then(m => setTimeout(() => m.delete().catch(()=>null), 6000));
            }
        });
    }
    if (afklar.has(message.author.id)) {
        const data = afklar.get(message.author.id);
        afklar.delete(message.author.id);
        if (message.member.manageable) await message.member.setNickname(data.eskiAd).catch(() => {});
        const afkReturnEmbed = new EmbedBuilder().setColor(ELEGANT_COLOR).setDescription(`👋 Hoş geldin <@${message.author.id}>, AFK modundan çıktın.`);
        message.reply({ embeds: [afkReturnEmbed] }).then(m => setTimeout(() => m.delete().catch(()=>null), 5000));
    }

    // Rank (XP) Sistemi
    if (!message.content.startsWith(PREFIX)) {
        const userId = message.author.id;
        if (!xpData[userId]) xpData[userId] = { xp: 0, level: 1 };
        
        xpData[userId].xp += Math.floor(Math.random() * 11) + 15;
        const nextLevelXp = xpData[userId].level * 100;

        if (xpData[userId].xp >= nextLevelXp) {
            xpData[userId].xp -= nextLevelXp;
            xpData[userId].level += 1;
            saveXp();

            const rankKanal = message.guild.channels.cache.get(RANK_LOG_KANALI_ID);
            if (rankKanal) {
                const rankEmbed = new EmbedBuilder()
                    .setColor(ELEGANT_COLOR)
                    .setAuthor({ name: 'Seviye Atlandı!', iconURL: 'https://cdn-icons-png.flaticon.com/512/3135/3135692.png' })
                    .setDescription(`Tebrikler <@${userId}>! Başarıyla seviye atladın.\n\n**Yeni Seviye:** \`${xpData[userId].level}\``)
                    .setThumbnail(message.author.displayAvatarURL({ dynamic: true }));
                rankKanal.send({ content: `<@${userId}>`, embeds: [rankEmbed] });
            }
        } else { saveXp(); }
        return; 
    }

    const args = message.content.slice(PREFIX.length).trim().split(/ +/g);
    const command = args.shift().toLowerCase();

    const zarifCevap = (text, type = "info") => {
        const icon = type === "success" ? "✅" : (type === "error" ? "❌" : "✨");
        const embed = new EmbedBuilder().setColor(ELEGANT_COLOR).setDescription(`${icon} ${text}`);
        message.reply({ embeds: [embed] }).then(m => setTimeout(() => m.delete().catch(()=>null), 10000));
    };

    if (command === 'join' || command === 'katıl') {
        if (!message.member.roles.cache.has(YETKILI_ROL_ID)) return zarifCevap("Bu komutu kullanmak için yetkiniz yok.", "error");
        
        const voiceChannelId = "1482521752667160626";
        const channel = client.channels.cache.get(voiceChannelId);
        
        if (!channel) return zarifCevap("Belirtilen ses kanalı bulunamadı.", "error");
        
        try {
            joinVoiceChannel({ channelId: channel.id, guildId: channel.guild.id, adapterCreator: channel.guild.voiceAdapterCreator });
            return zarifCevap(`Bot başarıyla <#${channel.id}> kanalına bağlandı.`, "success");
        } catch (error) { return zarifCevap("Kanala bağlanırken bir hata oluştu.", "error"); }
    }

    if (command === 'afk') {
        const sebep = args.join(" ") || "Belirtilmedi";
        const eskiAd = message.member.displayName;
        afklar.set(message.author.id, { sebep, eskiAd });
        
        if (message.member.manageable) {
            let yeniAd = `[AFK] ${eskiAd}`;
            if (yeniAd.length > 32) yeniAd = yeniAd.substring(0, 32); 
            await message.member.setNickname(yeniAd).catch(() => {});
        }
        return zarifCevap(`Başarıyla AFK moduna geçtin.\n**Sebep:** \`${sebep}\``, "success");
    }

    if (command === 'sil') {
        if (!message.member.roles.cache.has(YETKILI_ROL_ID)) return;
        const miktar = parseInt(args[0]);
        if (isNaN(miktar) || miktar < 1 || miktar > 100) return zarifCevap("Lütfen 1-100 arası bir sayı girin.", "error");
        
        await message.delete().catch(() => {}); 
        await message.channel.bulkDelete(miktar, true).catch(() => {});
        return zarifCevap(`**${miktar}** adet mesaj başarıyla temizlendi.`, "success");
    }

    if (command === 'ban') {
        if (!message.member.roles.cache.has(YETKILI_ROL_ID)) return zarifCevap("Bunun için yetkiniz yok.", "error");
        const user = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
        const reason = args.slice(1).join(" ") || "Sebep belirtilmedi.";
        
        if (!user) return zarifCevap("Lütfen bir kullanıcı etiketleyin veya ID girin.", "error");
        if (!user.bannable) return zarifCevap("Bu kullanıcıyı yasaklayamam.", "error");

        try { await user.send(`**${message.guild.name}** sunucusundan yasaklandın.\nSebep: ${reason}`); } catch (e) {}
        await user.ban({ reason: `${message.author.tag}: ${reason}` });
        return zarifCevap(`<@${user.id}> sunucudan yasaklandı.\n**Sebep:** \`${reason}\``, "success");
    }

    if (command === 'unban') {
        if (!message.member.roles.cache.has(YETKILI_ROL_ID)) return zarifCevap("Bunun için yetkiniz yok.", "error");
        const userId = args[0];
        if (!userId) return zarifCevap("Lütfen ID girin.", "error");
        
        try {
            await message.guild.members.unban(userId);
            return zarifCevap(`\`${userId}\` ID'li kullanıcının yasağı kaldırıldı.`, "success");
        } catch (e) { return zarifCevap("Banlı bir kullanıcı bulunamadı.", "error"); }
    }

    if (command === 'rank' || command === 'seviye') {
        const targetUser = message.mentions.users.first() || message.author;
        const data = xpData[targetUser.id] || { xp: 0, level: 1 };
        const nextLevel = data.level * 100;
        
        const rankEmbed = new EmbedBuilder()
            .setColor(ELEGANT_COLOR)
            .setAuthor({ name: targetUser.username, iconURL: targetUser.displayAvatarURL({ dynamic: true }) })
            .setDescription(`\n**🏆 Seviye:** \`${data.level}\`\n**✨ Deneyim (XP):** \`${data.xp} / ${nextLevel}\`\n`);
        return message.reply({ embeds: [rankEmbed] });
    }

    if (command === 'aktif') {
        const uptime = client.uptime;
        const gun = Math.floor(uptime / 86400000);
        const saat = Math.floor((uptime % 86400000) / 3600000);
        const dakika = Math.floor((uptime % 3600000) / 60000);
        const ram = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
        
        const aktifEmbed = new EmbedBuilder()
            .setAuthor({ name: 'Sistem İstatistikleri', iconURL: client.user.displayAvatarURL() })
            .setColor(ELEGANT_COLOR)
            .setDescription(`Aşağıda botun güncel performans ve durum verilerini görebilirsiniz.\n`)
            .addFields(
                { name: '⏱️ Aktiflik', value: `\`${gun}g ${saat}s ${dakika}d\``, inline: true },
                { name: '🏓 Gecikme', value: `\`${client.ws.ping}ms\``, inline: true },
                { name: '💾 Bellek (RAM)', value: `\`${ram} MB\``, inline: true },
                { name: '👥 Toplam Üye', value: `\`${client.users.cache.size}\``, inline: true }
            )
            .setFooter({ text: 'Guard & Moderasyon Altyapısı' });
        return message.reply({ embeds: [aktifEmbed] });
    }
});

setInterval(() => { axios.get('https://miras-autorazer.onrender.com').catch(() => {}); }, 300000);
client.login(process.env.TOKEN);
