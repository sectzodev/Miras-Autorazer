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

const afklar = new Map();
const ozelOdalar = new Set();

// --- RANK (SEVİYE) VERİTABANI ---
let xpData = {};
try {
    if (fs.existsSync('./levels.json')) xpData = JSON.parse(fs.readFileSync('./levels.json', 'utf8'));
} catch (e) { console.error("Level dosyası okunamadı."); }

function saveXp() {
    try { fs.writeFileSync('./levels.json', JSON.stringify(xpData, null, 2)); } 
    catch (e) { console.error("Level kaydedilemedi."); }
}

// --- GELİŞMİŞ LOG FONKSİYONU ---
async function logGonder(baslik, aciklama, renk = Colors.Blue, thumbnail = null) {
    try {
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

client.once('clientReady', () => {
    // İzleniyor (Watching) ve "Miras Denetleniyor." olarak güncellendi.
    client.user.setPresence({ activities: [{ name: 'Miras Denetleniyor.', type: ActivityType.Watching }], status: 'dnd' });
    console.log("----------------------------");
    console.log(`${client.user.tag} SORUNSUZ BAŞLATILDI!`);
    console.log("----------------------------");
});

// --- HOŞ GELDİN ---
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

// --- FULL LOG SİSTEMİ ---
client.on('messageDelete', async (message) => {
    if (!message.guild || message.author?.bot) return;
    const executor = await getExecutor(message.guild, AuditLogEvent.MessageDelete);
    const kimSildi = executor ? `<@${executor.id}>` : (message.author ? `<@${message.author.id}>` : "Bilinmiyor");
    logGonder("🗑️ Mesaj Silindi", `**Mesaj Sahibi:** ${message.author ? `<@${message.author.id}>` : "Bilinmiyor"}\n**Silen Kişi:** ${kimSildi}\n**Kanal:** <#${message.channel.id}>\n**İçerik:** \n> ${message.content || "*İçerik Bulunamadı*"}`, Colors.Red);
});

client.on('messageUpdate', (oldMsg, newMsg) => {
    if (!oldMsg.guild || oldMsg.author?.bot || oldMsg.content === newMsg.content) return;
    logGonder("✏️ Mesaj Düzenlendi", `**Kullanıcı:** <@${oldMsg.author?.id}>\n**Kanal:** <#${oldMsg.channel.id}>\n**Eski:** \n> ${oldMsg.content}\n**Yeni:** \n> ${newMsg.content}`, Colors.Orange);
});

client.on('guildMemberUpdate', async (oldMember, newMember) => {
    if (oldMember.nickname !== newMember.nickname) {
        const executor = await getExecutor(newMember.guild, AuditLogEvent.MemberUpdate);
        logGonder("👤 İsim Değiştirildi", `**Kullanıcı:** <@${newMember.id}>\n**Yapan:** ${executor ? `<@${executor.id}>` : "Kendisi"}\n**Eski:** \`${oldMember.nickname || "Yok"}\`\n**Yeni:** \`${newMember.nickname || "Yok"}\``, Colors.Cyan);
    }
    if (oldMember.roles.cache.size !== newMember.roles.cache.size) {
        const executor = await getExecutor(newMember.guild, AuditLogEvent.MemberRoleUpdate);
        const fark = newMember.roles.cache.size > oldMember.roles.cache.size;
        const role = fark ? newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id)).first() : oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id)).first();
        if (role) {
            logGonder(fark ? "✅ Rol Eklendi" : "❌ Rol Alındı", `**Kullanıcı:** <@${newMember.id}>\n**Yetkili:** ${executor ? `<@${executor.id}>` : "Sistem"}\n**Rol:** <@&${role.id}>`, fark ? Colors.Blue : Colors.Red);
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
    logGonder("📁 Kanal Oluşturuldu", `**Kanal:** <#${ch.id}>\n**Yapan:** ${executor ? `<@${executor.id}>` : "Bilinmiyor"}`, Colors.Green);
});

client.on('channelDelete', async (ch) => {
    if (ozelOdalar.has(ch.id)) return;
    const executor = await getExecutor(ch.guild, AuditLogEvent.ChannelDelete);
    logGonder("🗑️ Kanal Silindi", `**Adı:** \`${ch.name}\`\n**Silen:** ${executor ? `<@${executor.id}>` : "Bilinmiyor"}`, Colors.DarkRed);
});

client.on('guildBanAdd', async (ban) => {
    const executor = await getExecutor(ban.guild, AuditLogEvent.MemberBanAdd);
    logGonder("🔴 Kullanıcı Yasaklandı", `**Yasaklanan:** <@${ban.user.id}>\n**Yetkili:** ${executor ? `<@${executor.id}>` : "Bilinmiyor"}\n**Sebep:** \`${ban.reason || "Yok"}\``, Colors.Red, ban.user.displayAvatarURL());
});

client.on('guildBanRemove', async (ban) => {
    const executor = await getExecutor(ban.guild, AuditLogEvent.MemberBanRemove);
    logGonder("🔓 Yasak Kaldırıldı", `**Kullanıcı:** <@${ban.user.id}>\n**Yetkili:** ${executor ? `<@${executor.id}>` : "Bilinmiyor"}`, Colors.Green, ban.user.displayAvatarURL());
});

// --- SES VE ÖZEL ODA SİSTEMİ (BUTONLU) ---
client.on('voiceStateUpdate', async (oldState, newState) => {
    if (oldState.member.user.bot) return;

    if (!oldState.channelId && newState.channelId && newState.channelId !== OZEL_ODA_OLUSTUR_ID) logGonder("📥 Sese Katılım", `**Kullanıcı:** <@${newState.member.user.id}>\n**Kanal:** <#${newState.channel.id}>`, Colors.Green);
    else if (oldState.channelId && !newState.channelId && !ozelOdalar.has(oldState.channelId)) logGonder("📤 Sesten Ayrılma", `**Kullanıcı:** <@${oldState.member.user.id}>\n**Kanal:** <#${oldState.channel.id}>`, Colors.Red);

    if (newState.channelId === OZEL_ODA_OLUSTUR_ID) {
        try {
            const channel = await newState.guild.channels.create({
                name: `🔊 ${newState.member.user.username} Odası`,
                type: ChannelType.GuildVoice,
                parent: newState.channel.parentId,
                permissionOverwrites: [
                    {
                        id: newState.member.id,
                        allow: [PermissionsBitField.Flags.ManageChannels, PermissionsBitField.Flags.MoveMembers, PermissionsBitField.Flags.MuteMembers, PermissionsBitField.Flags.DeafenMembers]
                    },
                    {
                        id: newState.guild.roles.everyone.id,
                        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect]
                    }
                ]
            });
            ozelOdalar.add(channel.id);
            await newState.setChannel(channel).catch(() => channel.delete());

            // --- GÖRSELDEKİ BUTON PANELİNİ KANALA GÖNDERME ---
            const odaEmbed = new EmbedBuilder()
                .setTitle("Miras-Autorazer - Özel Oda Sistemi")
                .setDescription("Odanızı yönetmek için aşağıdaki butonları kullanabilirsiniz.")
                .setColor(Colors.DarkVividPink);

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('oda_kilit').setLabel('Kanalı Kilitle / Aç').setEmoji('🔒').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('oda_gizle').setLabel('Kanalı Gizle / Aç').setEmoji('👁️').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('oda_kick').setLabel('Kullanıcı Kickle').setEmoji('🚪').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('oda_ban').setLabel('Kullanıcı Banla').setEmoji('🔨').setStyle(ButtonStyle.Danger)
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

// --- ÖZEL ODA BUTON ETKİLEŞİMLERİ (YENİ EKLENDİ) ---
client.on('interactionCreate', async interaction => {
    if (!interaction.isButton() && !interaction.isUserSelectMenu()) return;
    if (!ozelOdalar.has(interaction.channelId)) return;

    if (!interaction.channel.permissionsFor(interaction.member).has(PermissionsBitField.Flags.ManageChannels)) {
        return interaction.reply({ content: "❌ Bu odayı yönetme yetkiniz yok! Yalnızca oda sahibi kullanabilir.", ephemeral: true });
    }

    const channel = interaction.channel;
    const everyone = interaction.guild.roles.everyone;

    // Kilitle/Aç
    if (interaction.customId === 'oda_kilit') {
        const isLocked = channel.permissionsFor(everyone).has(PermissionsBitField.Flags.Connect) === false;
        await channel.permissionOverwrites.edit(everyone, { Connect: isLocked ? null : false });
        return interaction.reply({ content: isLocked ? "🔓 Oda kilidi açıldı, herkes katılabilir." : "🔒 Oda kilitlendi, kimse katılamaz.", ephemeral: true });
    }

    // Gizle/Aç
    if (interaction.customId === 'oda_gizle') {
        const isHidden = channel.permissionsFor(everyone).has(PermissionsBitField.Flags.ViewChannel) === false;
        await channel.permissionOverwrites.edit(everyone, { ViewChannel: isHidden ? null : false });
        return interaction.reply({ content: isHidden ? "👁️ Oda görünür hale getirildi." : "🙈 Oda gizlendi.", ephemeral: true });
    }

    // Kick ve Ban Menüsü Gönderme
    if (interaction.customId === 'oda_kick' || interaction.customId === 'oda_ban') {
        const actionText = interaction.customId === 'oda_kick' ? 'Sesten atılacak' : 'Odadan yasaklanacak';
        const row = new ActionRowBuilder().addComponents(
            new UserSelectMenuBuilder()
                .setCustomId(interaction.customId === 'oda_kick' ? 'select_kick' : 'select_ban')
                .setPlaceholder(`${actionText} kullanıcıyı seçin`)
        );
        return interaction.reply({ content: `Lütfen ${actionText.toLowerCase()} kullanıcıyı seçin:`, components: [row], ephemeral: true });
    }

    // Menüden Kullanıcı Seçildiğinde (Kick/Ban İşlemi)
    if (interaction.isUserSelectMenu()) {
        const targetId = interaction.values[0];
        const targetMember = await interaction.guild.members.fetch(targetId).catch(() => null);

        if (!targetMember || !targetMember.voice.channel || targetMember.voice.channelId !== interaction.channelId) {
            return interaction.reply({ content: "❌ Kullanıcı bu odada değil!", ephemeral: true });
        }
        if (targetId === interaction.user.id) {
            return interaction.reply({ content: "❌ Kendinize işlem uygulayamazsınız!", ephemeral: true });
        }

        if (interaction.customId === 'select_kick') {
            await targetMember.voice.disconnect("Oda sahibi tarafından atıldı.");
            return interaction.reply({ content: `🚪 <@${targetId}> sesten atıldı.`, ephemeral: true });
        }

        if (interaction.customId === 'select_ban') {
            await targetMember.voice.disconnect("Oda sahibi tarafından yasaklandı.");
            await channel.permissionOverwrites.edit(targetId, { Connect: false });
            return interaction.reply({ content: `🔨 <@${targetId}> odaya girişi yasaklandı.`, ephemeral: true });
        }
    }
});

// --- MESAJ KOMUTLARI VE RANK SİSTEMİ ---
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;
    const msg = message.content.toLowerCase();

    // Küfür Filtresi
    const kufurler = ['kufur1', 'kufur2']; 
    if (kufurler.some(k => msg.includes(k))) {
        await message.delete().catch(() => {});
        return message.channel.send(`⛔ <@${message.author.id}>, küfür yasak!`).then(m => setTimeout(() => m.delete().catch(()=>null), 4000));
    }

    // AFK Kontrol
    if (message.mentions.users.size > 0) {
        message.mentions.users.forEach(user => {
            if (afklar.has(user.id)) message.reply(`⏳ <@${user.id}> şu an AFK. Sebep: **${afklar.get(user.id).sebep}**`).then(m => setTimeout(() => m.delete().catch(()=>null), 8000));
        });
    }
    if (afklar.has(message.author.id)) {
        const data = afklar.get(message.author.id);
        afklar.delete(message.author.id);
        if (message.member.manageable) await message.member.setNickname(data.eskiAd).catch(() => {});
        message.reply("Hoş geldin, AFK'dan çıktın.").then(m => setTimeout(() => m.delete().catch(()=>null), 5000));
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
                    .setColor(Colors.Gold)
                    .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
                    .setDescription(`🎉 Tebrikler <@${userId}>! Seviye atladın ve **Level ${xpData[userId].level}** oldun!`);
                rankKanal.send({ content: `<@${userId}>`, embeds: [rankEmbed] });
            }
        } else {
            saveXp();
        }
        return; 
    }

    const args = message.content.slice(PREFIX.length).trim().split(/ +/g);
    const command = args.shift().toLowerCase();

    const replyClear = (text, color = Colors.Blue) => {
        message.reply({ embeds: [new EmbedBuilder().setColor(color).setDescription(text)] }).then(m => setTimeout(() => m.delete().catch(()=>null), 10000));
    };

    if (command === 'afk') {
        const sebep = args.join(" ") || "Belirtilmedi";
        const eskiAd = message.member.displayName;
        afklar.set(message.author.id, { sebep, eskiAd });
        
        // İsmin başına [AFK] ekleme işlemi (Discord 32 karakter sınırına uygun)
        if (message.member.manageable) {
            let yeniAd = `[AFK] ${eskiAd}`;
            if (yeniAd.length > 32) yeniAd = yeniAd.substring(0, 32); 
            await message.member.setNickname(yeniAd).catch(() => {});
        }
        return replyClear(`💤 Başarıyla AFK oldun.\n**Sebep:** ${sebep}`, Colors.Grey);
    }

    if (command === 'sil') {
        if (!message.member.roles.cache.has(YETKILI_ROL_ID)) return;
        const miktar = parseInt(args[0]);
        if (isNaN(miktar) || miktar < 1 || miktar > 100) return;
        
        await message.delete().catch(() => {}); 
        await message.channel.bulkDelete(miktar, true).catch(() => {});
        return message.channel.send({ 
            embeds: [new EmbedBuilder().setColor(Colors.Aqua).setDescription(`🧹 **${miktar}** mesaj temizlendi. (Yapan: <@${message.author.id}>)`)] 
        }).then(m => setTimeout(() => m.delete().catch(()=>null), 5000));
    }

    if (command === 'ban') {
        if (!message.member.roles.cache.has(YETKILI_ROL_ID)) return message.reply("❌ Yetkiniz yetersiz.").then(m => setTimeout(() => m.delete().catch(()=>null), 5000));
        const user = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
        const reason = args.slice(1).join(" ") || "Sebep belirtilmedi.";
        
        if (!user) return message.reply("Kimi banlayayım? Lütfen etiketle veya ID gir.").then(m => setTimeout(() => m.delete().catch(()=>null), 5000));
        if (!user.bannable) return message.reply("Bu kullanıcıyı yasaklayamam.").then(m => setTimeout(() => m.delete().catch(()=>null), 5000));

        try { await user.send(`**${message.guild.name}** sunucusundan yasaklandın.\nYetkili: <@${message.author.id}>\nSebep: ${reason}`); } catch (e) {}
        await user.ban({ reason: `${message.author.tag}: ${reason}` });
        return replyClear(`🔨 <@${user.id}> başarıyla yasaklandı.\n**Sebep:** ${reason}`, Colors.DarkRed);
    }

    if (command === 'unban') {
        if (!message.member.roles.cache.has(YETKILI_ROL_ID)) return message.reply("❌ Yetkiniz yetersiz.").then(m => setTimeout(() => m.delete().catch(()=>null), 5000));
        const userId = args[0];
        if (!userId) return message.reply("Lütfen yasağı kaldırılacak kişinin ID'sini girin.").then(m => setTimeout(() => m.delete().catch(()=>null), 5000));
        
        try {
            await message.guild.members.unban(userId);
            return replyClear(`🔓 \`${userId}\` ID'li kullanıcının yasağı kaldırıldı.`, Colors.Green);
        } catch (e) {
            return message.reply("Bu ID'ye sahip banlı bir kullanıcı bulunamadı veya ID hatalı.").then(m => setTimeout(() => m.delete().catch(()=>null), 5000));
        }
    }

    if (command === 'rank' || command === 'seviye') {
        const targetUser = message.mentions.users.first() || message.author;
        const data = xpData[targetUser.id] || { xp: 0, level: 1 };
        const nextLevel = data.level * 100;
        
        const rankEmbed = new EmbedBuilder()
            .setColor(Colors.Purple)
            .setAuthor({ name: targetUser.tag, iconURL: targetUser.displayAvatarURL({ dynamic: true }) })
            .addFields(
                { name: '🏆 Seviye', value: `\`${data.level}\``, inline: true },
                { name: '✨ XP', value: `\`${data.xp} / ${nextLevel}\``, inline: true }
            );
        return message.reply({ embeds: [rankEmbed] });
    }

    if (command === 'aktif') {
        // Gelişmiş .aktif Komutu 
        const uptime = client.uptime;
        const gun = Math.floor(uptime / 86400000);
        const saat = Math.floor((uptime % 86400000) / 3600000);
        const dakika = Math.floor((uptime % 3600000) / 60000);
        const ram = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
        
        const aktifEmbed = new EmbedBuilder()
            .setTitle("📊 Gelişmiş Sistem Raporu")
            .setColor(Colors.LuminousVividPink)
            .setThumbnail(client.user.displayAvatarURL())
            .addFields(
                { name: '🤖 Durum', value: `\`Miras Denetleniyor.\``, inline: true },
                { name: '🏓 Ping', value: `\`${client.ws.ping}ms\``, inline: true },
                { name: '⏱️ Çalışma Süresi', value: `\`${gun}g ${saat}s ${dakika}d\``, inline: true },
                { name: '💾 RAM Kullanımı', value: `\`${ram} MB\``, inline: true },
                { name: '🌍 Sunucu Sayısı', value: `\`${client.guilds.cache.size}\``, inline: true },
                { name: '👥 Toplam Kullanıcı', value: `\`${client.users.cache.size}\``, inline: true }
            )
            .setFooter({ text: 'Bu mesaj silinmeyecektir. • Miras-Autorazer' })
            .setTimestamp();
        return message.reply({ embeds: [aktifEmbed] });
    }
});

setInterval(() => { axios.get('https://miras-autorazer.onrender.com').catch(() => {}); }, 300000);
client.login(process.env.TOKEN);
