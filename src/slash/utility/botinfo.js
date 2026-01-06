// ╔═══════════════════════════════════════════════════════════════════╗
// ║                    /botinfo Slash Command                           ║
// ║            Brunix Bot Information (i18n Support)                     ║
// ╚═══════════════════════════════════════════════════════════════════╝

import {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    OAuth2Scopes,
    PermissionFlagsBits
} from 'discord.js';
import { COLORS } from '../../config/constants.js';
import i18n from '../../utils/i18n.js';
import os from 'os';

const SUPPORT_SERVER_ID = '1403182450930090125';
const DEV_ID = '1306800102723026985';

export default {
    data: new SlashCommandBuilder()
        .setName('botinfo')
        .setDescription('[UTILITY] 🤖 Shows information about Brunix'),

    async execute(interaction) {
        const client = interaction.client;

        // Get guild language from config
        const lang = await getGuildLanguage(client, interaction.guild.id);
        const t = (key, replacements = {}) => i18n.t(lang, `commands.botinfo.responses.${key}`, replacements);

        // Calculate uptime as Discord timestamp
        const startTimestamp = Math.floor((Date.now() - client.uptime) / 1000);

        // Statistics
        const stats = {
            guilds: client.guilds.cache.size,
            users: client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0),
            channels: client.channels.cache.size,
            commands: client.commands?.size || 0,
            slashCommands: client.slashCommands?.size || 0
        };

        // Create main embed
        const mainEmbed = createMainEmbed(client, startTimestamp, stats, t);

        // Create select menu (English for slash command UI)
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('botinfo_menu')
            .setPlaceholder(`📚 ${t('select_category')}`)
            .addOptions([
                {
                    label: t('overview'),
                    description: t('general_info'),
                    value: 'overview',
                    emoji: '🏠'
                },
                {
                    label: t('statistics'),
                    description: t('numbers_metrics'),
                    value: 'stats',
                    emoji: '📊'
                },
                {
                    label: t('system'),
                    description: t('technical_info'),
                    value: 'system',
                    emoji: '⚙️'
                },
                {
                    label: t('credits'),
                    description: t('dev_team'),
                    value: 'credits',
                    emoji: '👥'
                }
            ]);

        const menuRow = new ActionRowBuilder().addComponents(selectMenu);

        // Create buttons
        const inviteUrl = client.generateInvite({
            scopes: [OAuth2Scopes.Bot, OAuth2Scopes.ApplicationsCommands],
            permissions: [
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.EmbedLinks,
                PermissionFlagsBits.Connect,
                PermissionFlagsBits.Speak,
                PermissionFlagsBits.UseExternalEmojis,
                PermissionFlagsBits.AddReactions,
                PermissionFlagsBits.ManageMessages,
                PermissionFlagsBits.ReadMessageHistory,
                PermissionFlagsBits.ViewChannel
            ]
        });

        // Create support server invite
        let supportInvite = 'https://discord.gg/SYn4KkXKkR';
        try {
            const supportGuild = client.guilds.cache.get(SUPPORT_SERVER_ID);
            if (supportGuild) {
                const channel = supportGuild.systemChannel || supportGuild.channels.cache.find(c => c.type === 0);
                if (channel) {
                    const invite = await channel.createInvite({ maxAge: 0, maxUses: 0, unique: false }).catch(() => null);
                    if (invite) supportInvite = invite.url;
                }
            }
        } catch { }

        const buttonRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel(t('add_bot'))
                .setStyle(ButtonStyle.Link)
                .setURL(inviteUrl)
                .setEmoji('🤖'),
            new ButtonBuilder()
                .setLabel(t('support_server'))
                .setStyle(ButtonStyle.Link)
                .setURL(supportInvite)
                .setEmoji('💬')
        );

        const reply = await interaction.reply({
            embeds: [mainEmbed],
            components: [menuRow, buttonRow],
            fetchReply: true
        });

        // Menu collector
        const collector = reply.createMessageComponentCollector({
            filter: i => i.customId === 'botinfo_menu',
            time: 120000
        });

        collector.on('collect', async (i) => {
            // Get updated language in case it changed
            const currentLang = await getGuildLanguage(client, interaction.guild.id);
            const tCurrent = (key, replacements = {}) => i18n.t(currentLang, `commands.botinfo.responses.${key}`, replacements);

            let embed;

            switch (i.values[0]) {
                case 'overview':
                    embed = createMainEmbed(client, startTimestamp, stats, tCurrent);
                    break;
                case 'stats':
                    embed = createStatsEmbed(client, stats, tCurrent);
                    break;
                case 'system':
                    embed = createSystemEmbed(client, tCurrent);
                    break;
                case 'credits':
                    embed = createCreditsEmbed(client, tCurrent);
                    break;
                default:
                    embed = createMainEmbed(client, startTimestamp, stats, tCurrent);
            }

            await i.update({ embeds: [embed] });
        });

        collector.on('end', () => {
            try {
                const disabledMenu = StringSelectMenuBuilder.from(selectMenu).setDisabled(true);
                const disabledRow = new ActionRowBuilder().addComponents(disabledMenu);
                reply.edit({ components: [disabledRow, buttonRow] }).catch(() => { });
            } catch { }
        });
    }
};

/**
 * Get guild language from database
 */
async function getGuildLanguage(client, guildId) {
    try {
        const { data } = await client.db.from('guild_configs').select('language').eq('guild_id', guildId).single();
        return data?.language || 'pt-BR';
    } catch {
        return 'pt-BR';
    }
}

// ═══════════════════════════════════════════════════════════════════════
// 🏠 EMBED: Overview
// ═══════════════════════════════════════════════════════════════════════
function createMainEmbed(client, startTimestamp, stats, t) {
    return new EmbedBuilder()
        .setColor(COLORS.EMBED_DEFAULT)
        .setAuthor({
            name: 'Brunix Music',
            iconURL: client.user.displayAvatarURL()
        })
        .setThumbnail(client.user.displayAvatarURL({ size: 256 }))
        .setDescription(
            `> ${t('description_text')}\n\n` +
            `🎵 **${t('features')}**\n` +
            `╰ ${t('feature_1')}\n` +
            `╰ ${t('feature_2')}\n` +
            `╰ ${t('feature_3')}\n` +
            `╰ ${t('feature_4')}`
        )
        .addFields(
            {
                name: `📊 ${t('servers')}`,
                value: `\`${stats.guilds.toLocaleString()}\``,
                inline: true
            },
            {
                name: `👥 ${t('users')}`,
                value: `\`${stats.users.toLocaleString()}\``,
                inline: true
            },
            {
                name: `⏰ ${t('online_since')}`,
                value: `<t:${startTimestamp}:R>`,
                inline: true
            }
        )
        .setFooter({
            text: t('developed_by'),
            iconURL: client.user.displayAvatarURL()
        })
        .setTimestamp();
}

// ═══════════════════════════════════════════════════════════════════════
// 📊 EMBED: Statistics
// ═══════════════════════════════════════════════════════════════════════
function createStatsEmbed(client, stats, t) {
    // Active players
    let activePlayers = 0;
    try {
        if (client.lavalink?.players) {
            activePlayers = client.lavalink.players.size || 0;
        }
    } catch { }

    return new EmbedBuilder()
        .setColor(COLORS.EMBED_DEFAULT)
        .setAuthor({
            name: `📊 ${t('statistics')}`,
            iconURL: client.user.displayAvatarURL()
        })
        .addFields(
            {
                name: `🌐 ${t('servers')}`,
                value: `\`${stats.guilds.toLocaleString()}\``,
                inline: true
            },
            {
                name: `👥 ${t('users')}`,
                value: `\`${stats.users.toLocaleString()}\``,
                inline: true
            },
            {
                name: `📝 ${t('channels')}`,
                value: `\`${stats.channels.toLocaleString()}\``,
                inline: true
            },
            {
                name: `🎵 ${t('active_players')}`,
                value: `\`${activePlayers}\``,
                inline: true
            },
            {
                name: `📋 ${t('commands')}`,
                value: `\`${stats.commands + stats.slashCommands}\``,
                inline: true
            },
            {
                name: `🏓 ${t('latency')}`,
                value: `\`${client.ws.ping}ms\``,
                inline: true
            }
        )
        .setFooter({
            text: t('developed_by'),
            iconURL: client.user.displayAvatarURL()
        })
        .setTimestamp();
}

// ═══════════════════════════════════════════════════════════════════════
// ⚙️ EMBED: System
// ═══════════════════════════════════════════════════════════════════════
function createSystemEmbed(client, t) {
    const memUsage = process.memoryUsage();
    const memUsed = (memUsage.heapUsed / 1024 / 1024).toFixed(2);
    const memTotal = (memUsage.heapTotal / 1024 / 1024).toFixed(2);

    // Audio System info
    let audioSystemStatus = '🔴 Offline';
    let audioSystemNodes = 0;
    try {
        if (client.lavalink?.nodeManager?.nodes) {
            const nodes = Array.from(client.lavalink.nodeManager.nodes.values());
            audioSystemNodes = nodes.length;
            const connectedNodes = nodes.filter(n => n.connected).length;
            audioSystemStatus = connectedNodes > 0 ? '🟢 Online' : '🔴 Offline';
        }
    } catch { }

    return new EmbedBuilder()
        .setColor(COLORS.EMBED_DEFAULT)
        .setAuthor({
            name: `⚙️ ${t('system_info')}`,
            iconURL: client.user.displayAvatarURL()
        })
        .addFields(
            {
                name: `📦 ${t('version')}`,
                value: `\`v2.0.0\``,
                inline: true
            },
            {
                name: '🟢 Node.js',
                value: `\`${process.version}\``,
                inline: true
            },
            {
                name: '📚 Discord.js',
                value: `\`v14.14.1\``,
                inline: true
            },
            {
                name: `💾 ${t('memory')}`,
                value: `\`${memUsed}MB / ${memTotal}MB\``,
                inline: true
            },
            {
                name: `🖥️ ${t('platform')}`,
                value: `\`${os.platform()}\``,
                inline: true
            },
            {
                name: '🎵 Sistema de Áudio',
                value: `${audioSystemStatus} (${audioSystemNodes} node${audioSystemNodes !== 1 ? 's' : ''})`,
                inline: true
            }
        )
        .setFooter({
            text: t('developed_by'),
            iconURL: client.user.displayAvatarURL()
        })
        .setTimestamp();
}

// ═══════════════════════════════════════════════════════════════════════
// 👥 EMBED: Credits
// ═══════════════════════════════════════════════════════════════════════
function createCreditsEmbed(client, t) {
    return new EmbedBuilder()
        .setColor(COLORS.EMBED_DEFAULT)
        .setAuthor({
            name: `👥 ${t('credits')}`,
            iconURL: client.user.displayAvatarURL()
        })
        .setDescription(
            `${t('credits_description')}\n\n` +
            `${t('thanks')}`
        )
        .addFields(
            {
                name: `👑 ${t('developer')}`,
                value: `<@${DEV_ID}> (Gus)`,
                inline: true
            },
            {
                name: `🏢 ${t('team')}`,
                value: `AXEML`,
                inline: true
            },
            {
                name: `📅 ${t('created')}`,
                value: `<t:1704067200:D>`,
                inline: true
            }
        )
        .addFields(
            {
                name: `🛠️ ${t('technologies')}`,
                value:
                    `\`•\` Discord.js v14\n` +
                    `\`•\` Lavalink Client\n` +
                    `\`•\` Supabase Database\n` +
                    `\`•\` Node.js ${process.version}`,
                inline: false
            }
        )
        .setFooter({
            text: t('thanks'),
            iconURL: client.user.displayAvatarURL()
        })
        .setTimestamp();
}
