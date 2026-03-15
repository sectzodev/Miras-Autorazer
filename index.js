const { Client, GatewayIntentBits, Partials, EmbedBuilder, AuditLogEvent, ActivityType, Colors, ChannelType, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, UserSelectMenuBuilder } = require('discord.js');
const { joinVoiceChannel } = require('@discordjs/voice');
const express = require('express');
const axios = require('axios');
const fs = require('fs');

// --- WEB SUNUCUSU ---
const app = express();
app.get('/', (req, res) => res.send('Miras Bot Aktif!'));
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

// GUARD GÜVENLİ ROLLER
const GUVENLI_ROLLER = ["1482109649044901940", "1482109646058815488", "1482109647275036875"];

const afklar = new Map();
const ozelOdalar = new Set();
const ELEGANT_COLOR = '#2b2d31'; // Karanlık Tema ile bütünleşik renk
const FOOTER_TEXT = 'Miras Bot | Miras System';

// NOT: Gönderdiğiniz videoyu GIF'e çevirip buraya linkini koymalısınız!
const BANNER_URL = 'https://cdn.discordapp.com/attachments/1482526015845830826/1482745255315898581/ezgif-549c4f5ac95252e7.gif?ex=69b811a0&is=69b6c020&hm=764e8b2cd76a32bfa33811a33182a84d1ff5e51816591ff1e0828dcf998e0ff6&'; 

// --- RANK (SEVİYE) VERİTABANI ---
let xpData = {};
try {
    if (fs.existsSync('./levels.json')) xpData = JSON.parse(fs.readFileSync('./levels.json', 'utf8'));
} catch (e) { console.error("Level dosyası okunamadı."); }

function saveXp() {
    try { fs.writeFileSync('./levels.json', JSON.stringify(xpData, null, 2)); } 
    catch (e) { console.error("Level kaydedilemedi."); }
}

// --- GENİŞ VE FERAH LOG FONKSİYONU ---
async function logGonder(baslik, icerik, emoji = "📌", thumbnail = null) {
    try {
        const kanal = client.channels.cache.get(LOG_KANALI_ID);
        if (!kanal) return;
        
        const embed = new EmbedBuilder()
            .setAuthor({ name: `Miras | ${baslik}`, iconURL: client.user.displayAvatarURL() })
            .setDescription(`\`\`\`📋 İşlem Detayları\`\`\`\n${icerik}\n`)
            .setColor(ELEGANT_COLOR)
            .setImage(BANNER_URL)
            .setFooter({ text: FOOTER_TEXT, iconURL: client.user.displayAvatarURL() })
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

// --- GUARD SİSTEMİ ---
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
        logGonder("Guard Sistemi Devrede", `🛡️ **Hedef:** <@${executorId}>\n🔨 **Eylem:** \`Tüm rolleri alındı.\`\n🚨 **Sebep:** \`${sebep}\``, "🛡️");
    } catch (e) { console.error("Guard ceza hatası:", e); }
}

client.once('clientReady', () => {
    client.user.setPresence({ activities: [{ name: 'sectzo❤miras', type: ActivityType.Watching }], status: 'dnd' });
    console.log(`${client.user.tag} GENİŞ VE DETAYLI ARAYÜZLE BAŞLATILDI!`);
});

// --- HOŞ GELDİN SİSTEMİ ---
client.on('guildMemberAdd', async (member) => {
    const kanal = member.guild.channels.cache.get(HOSGELDIN_KANALI_ID);
    if (!kanal) return;
    
    const embed = new EmbedBuilder()
        .setAuthor({ name: `Miras | Aramıza Katıldı`, iconURL: member.user.displayAvatarURL({ dynamic: true }) })
        .setDescription(`\`\`\`🎉 Kullanıcı Bilgileri\`\`\`\n👤 **Kullanıcı:** ${member}\n🆔 **ID:** \`${member.id}\`\n👥 **Sunucu Üye Sayısı:** \`${member.guild.memberCount}\`\n\n\`\`\`📌 Bilgilendirme\`\`\`\nKuralları okumayı ve ismine \`1991\` tagını almayı unutma. Keyifli vakit geçirmen dileğiyle!`)
        .setColor(ELEGANT_COLOR)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setImage(BANNER_URL)
        .setFooter({ text: FOOTER_TEXT, iconURL: client.user.displayAvatarURL() })
        .setTimestamp();
        
    kanal.send({ content: `${member}`, embeds: [embed] });
});

// --- LOGLAR VE GUARD KONTROLLERİ ---
client.on('messageDelete', async (message) => {
    if (!message.guild || message.author?.bot) return;
    const executor = await getExecutor(message.guild, AuditLogEvent.MessageDelete);
    const kimSildi = executor ? `<@${executor.id}>` : (message.author ? `<@${message.author.id}>` : "Bilinmiyor");
    
    logGonder("Mesaj Silindi", `📍 **Kanal:** <#${message.channel.id}>\n👤 **Mesaj Sahibi:** ${message.author ? `<@${message.author.id}>` : "Bilinmiyor"}\n🗑️ **Silen:** ${kimSildi}\n\n\`\`\`📝 Mesaj İçeriği\`\`\`\n${message.content || "İçerik Bulunamadı"}`);
});

client.on('messageUpdate', (oldMsg, newMsg) => {
    if (!oldMsg.guild || oldMsg.author?.bot || oldMsg.content === newMsg.content) return;
    logGonder("Mesaj Düzenlendi", `📍 **Kanal:** <#${oldMsg.channel.id}>\n👤 **Kullanıcı:** <@${oldMsg.author?.id}>\n\n\`\`\`🔄 Eski İçerik\`\`\`\n${oldMsg.content}\n\n\`\`\`✨ Yeni İçerik\`\`\`\n${newMsg.content}`);
});

client.on('guildMemberUpdate', async (oldMember, newMember) => {
    if (oldMember.nickname !== newMember.nickname) {
        const executor = await getExecutor(newMember.guild, AuditLogEvent.MemberUpdate);
        logGonder("İsim Güncellendi", `👤 **Kullanıcı:** <@${newMember.id}>\n🛠️ **İşlemi Yapan:** ${executor ? `<@${executor.id}>` : "Kendisi"}\n\n🏷️ **Eski İsim:** \`${oldMember.nickname || oldMember.user.username}\`\n🏷️ **Yeni İsim:** \`${newMember.nickname || newMember.user.username}\``);
    }
    if (oldMember.roles.cache.size !== newMember.roles.cache.size) {
        const executor = await getExecutor(newMember.guild, AuditLogEvent.MemberRoleUpdate);
        const fark = newMember.roles.cache.size > oldMember.roles.cache.size;
        const role = fark ? newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id)).first() : oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id)).first();
        if (role) {
            logGonder(fark ? "Rol Eklendi" : "Rol Alındı", `👤 **Kullanıcı:** <@${newMember.id}>\n🛠️ **Yetkili:** ${executor ? `<@${executor.id}>` : "Sistem"}\n🔰 **Etkilenen Rol:** <@&${role.id}>`);
        }
    }
    // Tag Kontrol
    const hasTag = newMember.user.username.includes(LONCA_TAGI) || (newMember.nickname && newMember.nickname.includes(LONCA_TAGI));
    const hasRole = newMember.roles.cache.has(LONCA_ROL_ID);
    if (hasTag && !hasRole) await newMember.roles.add(LONCA_ROL_ID).catch(() => {});
    else if (!hasTag && hasRole) await newMember.roles.remove(LONCA_ROL_ID).catch(() => {});
});

client.on('channelCreate', async (ch) => {
    if (ozelOdalar.has(ch.id)) return;
    const executor = await getExecutor(ch.guild, AuditLogEvent.ChannelCreate);
    logGonder("Kanal Oluşturuldu", `📁 **Kanal:** <#${ch.id}>\n🏷️ **Kanal Adı:** \`${ch.name}\`\n🛠️ **Oluşturan:** ${executor ? `<@${executor.id}>` : "Bilinmiyor"}`);
});

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
    logGonder("Kanal Silindi", `🏷️ **Kanal Adı:** \`${ch.name}\`\n🗑️ **Silen:** ${executor ? `<@${executor.id}>` : "Bilinmiyor"}`);
});

client.on('roleDelete', async (role) => {
    const executor = await getExecutor(role.guild, AuditLogEvent.RoleDelete);
    
    if (executor) {
        const executorMember = await role.guild.members.fetch(executor.id).catch(() => null);
        if (!isSafe(executorMember)) {
            await cezalandir(role.guild, executor.id, "İzinsiz Rol Silme");
            await role.guild.roles.create({ name: role.name, color: role.color, permissions: role.permissions, hoist: role.hoist, mentionable: role.mentionable, reason: "Guard Sistemi: Silinen rol kurtarıldı." }).catch(()=>{});
        }
    }
    logGonder("Rol Silindi", `🔰 **Rol Adı:** \`${role.name}\`\n🗑️ **Silen:** ${executor ? `<@${executor.id}>` : "Bilinmiyor"}`);
});

client.on('guildBanAdd', async (ban) => {
    const executor = await getExecutor(ban.guild, AuditLogEvent.MemberBanAdd);
    
    if (executor) {
        const executorMember = await ban.guild.members.fetch(executor.id).catch(() => null);
        if (!isSafe(executorMember)) {
            await cezalandir(ban.guild, executor.id, "İzinsiz Üye Yasaklama");
            await ban.guild.members.unban(ban.user.id, "Guard Sistemi: İzinsiz ban geri alındı.").catch(() => {});
        }
    }
    logGonder("Kullanıcı Yasaklandı", `👤 **Kullanıcı:** <@${ban.user.id}> (\`${ban.user.id}\`)\n🛠️ **Yetkili:** ${executor ? `<@${executor.id}>` : "Bilinmiyor"}\n🚨 **Sebep:** \`${ban.reason || "Belirtilmedi"}\``, "🔨", ban.user.displayAvatarURL());
});

client.on('guildMemberRemove', async (member) => {
    const executor = await getExecutor(member.guild, AuditLogEvent.MemberKick);
    if (executor) {
        const executorMember = await member.guild.members.fetch(executor.id).catch(() => null);
        if (!isSafe(executorMember)) {
            await cezalandir(member.guild, executor.id, "İzinsiz Üye Atma (Kick)");
        }
        logGonder("Kullanıcı Atıldı (Kick)", `👤 **Kullanıcı:** <@${member.user.id}>\n🛠️ **Yetkili:** <@${executor.id}>`, "🚪", member.user.displayAvatarURL());
    }
});

// --- SES VE ÖZEL ODA SİSTEMİ ---
client.on('voiceStateUpdate', async (oldState, newState) => {
    if (oldState.member.user.bot) return;

    if (!oldState.channelId && newState.channelId && newState.channelId !== OZEL_ODA_OLUSTUR_ID) {
        logGonder("Sese Katılım", `👤 **Kullanıcı:** <@${newState.member.user.id}>\n📥 **Katıldığı Kanal:** <#${newState.channel.id}>`);
    }
    else if (oldState.channelId && !newState.channelId && !ozelOdalar.has(oldState.channelId)) {
        logGonder("Sesten Ayrılma", `👤 **Kullanıcı:** <@${oldState.member.user.id}>\n📤 **Ayrıldığı Kanal:** <#${oldState.channel.id}>`);
    }

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
                .setAuthor({ name: 'Miras | Özel Oda Sistemi', iconURL: newState.member.user.displayAvatarURL() })
                .setDescription(`\`\`\`🔊 Oda Kontrol Paneli\`\`\`\nOdanız başarıyla oluşturuldu! Aşağıdaki menüden yönetebilirsiniz.\n\n\`\`\`⚙️ Komutlar\`\`\`\n🔒 \`Odayı Kilitle/Aç\`\n👁️ \`Odayı Gizle/Göster\`\n🚪 \`Üyeyi At (Kick)\`\n🔨 \`Üyeyi Yasakla (Ban)\``)
                .setColor(ELEGANT_COLOR)
                .setImage(BANNER_URL)
                .setFooter({ text: FOOTER_TEXT, iconURL: client.user.displayAvatarURL() });

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
        return interaction.reply({ content: isLocked ? "🔓 **Kilit açıldı.** Herkes katılabilir." : "🔒 **Oda kilitlendi.**", ephemeral: true });
    }

    if (interaction.customId === 'oda_gizle') {
        const isHidden = channel.permissionsFor(everyone).has(PermissionsBitField.Flags.ViewChannel) === false;
        await channel.permissionOverwrites.edit(everyone, { ViewChannel: isHidden ? null : false });
        return interaction.reply({ content: isHidden ? "👁️ **Oda görünür** hale geldi." : "🙈 **Oda gizlendi.**", ephemeral: true });
    }

    if (interaction.customId === 'oda_kick' || interaction.customId === 'oda_ban') {
        const row = new ActionRowBuilder().addComponents(
            new UserSelectMenuBuilder().setCustomId(interaction.customId === 'oda_kick' ? 'select_kick' : 'select_ban').setPlaceholder(`İşlem yapılacak kullanıcıyı seçin`)
        );
        return interaction.reply({ content: `Lütfen bir kullanıcı seçin:`, components: [row], ephemeral: true });
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
            return interaction.reply({ content: `🚪 <@${targetId}> sesten **atıldı.**`, ephemeral: true });
        }

        if (interaction.customId === 'select_ban') {
            await targetMember.voice.disconnect("Oda sahibi tarafından yasaklandı.");
            await channel.permissionOverwrites.edit(targetId, { Connect: false });
            return interaction.reply({ content: `🔨 <@${targetId}> odadan **yasaklandı.**`, ephemeral: true });
        }
    }
});

// --- KOMUTLAR ---
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
                const afkEmbed = new EmbedBuilder()
                    .setColor(ELEGANT_COLOR)
                    .setAuthor({ name: 'AFK Sistemi', iconURL: user.displayAvatarURL() })
                    .setDescription(`\`\`\`💤 Kullanıcı AFK\`\`\`\n👤 **Kullanıcı:** <@${user.id}>\n💬 **Sebep:** \`${afklar.get(user.id).sebep}\``);
                message.reply({ embeds: [afkEmbed] }).then(m => setTimeout(() => m.delete().catch(()=>null), 6000));
            }
        });
    }
    if (afklar.has(message.author.id)) {
        const data = afklar.get(message.author.id);
        afklar.delete(message.author.id);
        if (message.member.manageable) await message.member.setNickname(data.eskiAd).catch(() => {});
        const afkReturnEmbed = new EmbedBuilder().setColor(ELEGANT_COLOR).setDescription(`👋 Hoş geldin <@${message.author.id}>, **AFK** modundan çıktın.`);
        message.reply({ embeds: [afkReturnEmbed] }).then(m => setTimeout(() => m.delete().catch(()=>null), 5000));
    }

    // Leveling
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
                    .setAuthor({ name: 'Seviye Atlandı!', iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setDescription(`\`\`\`🏆 Yeni Seviye\`\`\`\nTebrikler <@${userId}>! Başarıyla seviye atladın.\n\n📈 **Yeni Seviyen:** \`${xpData[userId].level}\``)
                    .setImage(BANNER_URL)
                    .setFooter({ text: FOOTER_TEXT, iconURL: client.user.displayAvatarURL() });
                rankKanal.send({ content: `<@${userId}>`, embeds: [rankEmbed] });
            }
        } else { saveXp(); }
        return; 
    }

    const args = message.content.slice(PREFIX.length).trim().split(/ +/g);
    const command = args.shift().toLowerCase();

    const embedCevap = (baslik, text) => {
        const embed = new EmbedBuilder()
            .setColor(ELEGANT_COLOR)
            .setAuthor({ name: `Miras | ${baslik}`, iconURL: client.user.displayAvatarURL() })
            .setDescription(`\`\`\`Sistem Mesajı\`\`\`\n${text}`)
            .setImage(BANNER_URL)
            .setFooter({ text: FOOTER_TEXT, iconURL: client.user.displayAvatarURL() });
        message.reply({ embeds: [embed] }).then(m => setTimeout(() => m.delete().catch(()=>null), 15000));
    };

    if (command === 'join' || command === 'katıl') {
        if (!message.member.roles.cache.has(YETKILI_ROL_ID)) return embedCevap("Hata", "Bu komutu kullanmak için yetkiniz yok.");
        const voiceChannelId = "1482521752667160626";
        const channel = client.channels.cache.get(voiceChannelId);
        
        if (!channel) return embedCevap("Hata", "Belirtilen ses kanalı bulunamadı.");
        try {
            joinVoiceChannel({ channelId: channel.id, guildId: channel.guild.id, adapterCreator: channel.guild.voiceAdapterCreator });
            return embedCevap("Başarılı", `Bot başarıyla <#${channel.id}> kanalına bağlandı.`);
        } catch (error) { return embedCevap("Hata", "Kanala bağlanırken bir hata oluştu."); }
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
        return embedCevap("AFK Modu", `Başarıyla AFK moduna geçtin.\n\n💬 **Sebep:** \`${sebep}\``);
    }

    if (command === 'sil') {
        if (!message.member.roles.cache.has(YETKILI_ROL_ID)) return;
        const miktar = parseInt(args[0]);
        if (isNaN(miktar) || miktar < 1 || miktar > 100) return embedCevap("Hata", "Lütfen 1-100 arası bir sayı girin.");
        
        await message.delete().catch(() => {}); 
        await message.channel.bulkDelete(miktar, true).catch(() => {});
        return embedCevap("Başarılı", `🧹 **${miktar}** adet mesaj başarıyla temizlendi.`);
    }

    if (command === 'ban') {
        if (!message.member.roles.cache.has(YETKILI_ROL_ID)) return embedCevap("Hata", "Bunun için yetkiniz yok.");
        const user = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
        const reason = args.slice(1).join(" ") || "Sebep belirtilmedi.";
        
        if (!user) return embedCevap("Hata", "Lütfen bir kullanıcı etiketleyin veya ID girin.");
        if (!user.bannable) return embedCevap("Hata", "Bu kullanıcıyı yasaklayamam.");

        try { await user.send(`**${message.guild.name}** sunucusundan yasaklandın.\nSebep: ${reason}`); } catch (e) {}
        await user.ban({ reason: `${message.author.tag}: ${reason}` });
        return embedCevap("Yasaklandı", `🔨 <@${user.id}> sunucudan yasaklandı.\n\n💬 **Sebep:** \`${reason}\``);
    }

    if (command === 'unban') {
        if (!message.member.roles.cache.has(YETKILI_ROL_ID)) return embedCevap("Hata", "Bunun için yetkiniz yok.");
        const userId = args[0];
        if (!userId) return embedCevap("Hata", "Lütfen ID girin.");
        
        try {
            await message.guild.members.unban(userId);
            return embedCevap("Başarılı", `🔓 \`${userId}\` ID'li kullanıcının yasağı kaldırıldı.`);
        } catch (e) { return embedCevap("Hata", "Banlı bir kullanıcı bulunamadı."); }
    }

    if (command === 'rank' || command === 'seviye') {
        const targetUser = message.mentions.users.first() || message.author;
        const data = xpData[targetUser.id] || { xp: 0, level: 1 };
        const nextLevel = data.level * 100;
        
        const rankEmbed = new EmbedBuilder()
            .setColor(ELEGANT_COLOR)
            .setAuthor({ name: `Miras | Kullanıcı Seviyesi`, iconURL: targetUser.displayAvatarURL({ dynamic: true }) })
            .setDescription(`\`\`\`👤 Seviye Kartı: ${targetUser.username}\`\`\`\n🏆 **Mevcut Seviye:** \`${data.level}\`\n✨ **Mevcut Deneyim (XP):** \`${data.xp} / ${nextLevel}\`\n\n_Bir sonraki seviyeye ulaşmak için sohbet etmeye devam et!_`)
            .setImage(BANNER_URL)
            .setFooter({ text: FOOTER_TEXT, iconURL: client.user.displayAvatarURL() });
        return message.reply({ embeds: [rankEmbed] });
    }

    if (command === 'aktif') {
        const uptime = client.uptime;
        const gun = Math.floor(uptime / 86400000);
        const saat = Math.floor((uptime % 86400000) / 3600000);
        const dakika = Math.floor((uptime % 3600000) / 60000);
        const ram = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
        
        const aktifEmbed = new EmbedBuilder()
            .setAuthor({ name: 'Miras | Sistem İstatistikleri', iconURL: client.user.displayAvatarURL() })
            .setColor(ELEGANT_COLOR)
            .setDescription(`\`\`\`⚙️ Canlı Veriler\`\`\`\n⏱️ **Aktiflik Süresi:** \`${gun}g ${saat}s ${dakika}d\`\n🏓 **Bot Gecikmesi:** \`${client.ws.ping}ms\`\n💾 **RAM Kullanımı:** \`${ram} MB\`\n👥 **Hizmet Verilen Üye:** \`${client.users.cache.size}\`\n\n*Aşağıdaki banner ve üst kısım tasarımı ile tam uyumlu gösterim sağlanmaktadır.*`)
            .setImage(BANNER_URL)
            .setFooter({ text: FOOTER_TEXT, iconURL: client.user.displayAvatarURL() })
            .setTimestamp();
        return message.reply({ embeds: [aktifEmbed] });
    }
});

setInterval(() => { axios.get('https://miras-autorazer.onrender.com').catch(() => {}); }, 300000);
client.login(process.env.TOKEN);
