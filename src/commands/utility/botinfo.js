// ╔═══════════════════════════════════════════════════════════════════╗
// ║                    !botinfo Command                                  ║
// ║                      Brunix Bot Information                          ║
// ╚═══════════════════════════════════════════════════════════════════╝

import {
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    OAuth2Scopes,
    PermissionFlagsBits
} from 'discord.js';
import { COLORS } from '../../config/constants.js';
import os from 'os';

const SUPPORT_SERVER_ID = '1403182450930090125';
const DEV_ID = '1306800102723026985';

export default {
    name: 'botinfo',
    aliases: ['bot', 'info', 'about'],
    description: 'Shows information about Brunix',
    category: 'utility',

    async execute(client, message, args) {
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
        const mainEmbed = createMainEmbed(client, startTimestamp, stats);

        // Create select menu
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('botinfo_menu')
            .setPlaceholder('📚 Select a category')
            .addOptions([
                {
                    label: 'Overview',
                    description: 'General bot information',
                    value: 'overview',
                    emoji: '🏠'
                },
                {
                    label: 'Statistics',
                    description: 'Numbers and metrics',
                    value: 'stats',
                    emoji: '📊'
                },
                {
                    label: 'System',
                    description: 'Technical information',
                    value: 'system',
                    emoji: '⚙️'
                },
                {
                    label: 'Credits',
                    description: 'Development team',
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
                .setLabel('Add Bot')
                .setStyle(ButtonStyle.Link)
                .setURL(inviteUrl)
                .setEmoji('🤖'),
            new ButtonBuilder()
                .setLabel('Support Server')
                .setStyle(ButtonStyle.Link)
                .setURL(supportInvite)
                .setEmoji('💬')
        );

        const reply = await message.reply({
            embeds: [mainEmbed],
            components: [menuRow, buttonRow]
        });

        // Menu collector
        const collector = reply.createMessageComponentCollector({
            filter: i => i.customId === 'botinfo_menu',
            time: 120000
        });

        collector.on('collect', async (i) => {
            let embed;

            switch (i.values[0]) {
                case 'overview':
                    embed = createMainEmbed(client, startTimestamp, stats);
                    break;
                case 'stats':
                    embed = createStatsEmbed(client, stats);
                    break;
                case 'system':
                    embed = createSystemEmbed(client);
                    break;
                case 'credits':
                    embed = createCreditsEmbed(client);
                    break;
                default:
                    embed = createMainEmbed(client, startTimestamp, stats);
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

// ═══════════════════════════════════════════════════════════════════════
// 🏠 EMBED: Overview
// ═══════════════════════════════════════════════════════════════════════
function createMainEmbed(client, startTimestamp, stats) {
    return new EmbedBuilder()
        .setColor(COLORS.EMBED_DEFAULT)
        .setAuthor({
            name: 'Brunix Music',
            iconURL: client.user.displayAvatarURL()
        })
        .setThumbnail(client.user.displayAvatarURL({ size: 256 }))
        .setDescription(
            `> Advanced music bot for Discord with multi-platform support.\n\n` +
            `🎵 **Features**\n` +
            `╰ High quality playback via Lavalink\n` +
            `╰ Spotify, YouTube and SoundCloud support\n` +
            `╰ Playlist and favorites system\n` +
            `╰ Smart autoplay with recommendations`
        )
        .addFields(
            {
                name: '📊 Servers',
                value: `\`${stats.guilds.toLocaleString()}\``,
                inline: true
            },
            {
                name: '👥 Users',
                value: `\`${stats.users.toLocaleString()}\``,
                inline: true
            },
            {
                name: '⏰ Online since',
                value: `<t:${startTimestamp}:R>`,
                inline: true
            }
        )
        .setFooter({
            text: 'Developed by AXEML',
            iconURL: client.user.displayAvatarURL()
        })
        .setTimestamp();
}

// ═══════════════════════════════════════════════════════════════════════
// 📊 EMBED: Statistics
// ═══════════════════════════════════════════════════════════════════════
function createStatsEmbed(client, stats) {
    let activePlayers = 0;
    try {
        if (client.lavalink?.players) {
            activePlayers = client.lavalink.players.size || 0;
        }
    } catch { }

    return new EmbedBuilder()
        .setColor(COLORS.EMBED_DEFAULT)
        .setAuthor({
            name: '📊 Statistics',
            iconURL: client.user.displayAvatarURL()
        })
        .addFields(
            {
                name: '🌐 Servers',
                value: `\`${stats.guilds.toLocaleString()}\``,
                inline: true
            },
            {
                name: '👥 Users',
                value: `\`${stats.users.toLocaleString()}\``,
                inline: true
            },
            {
                name: '📝 Channels',
                value: `\`${stats.channels.toLocaleString()}\``,
                inline: true
            },
            {
                name: '🎵 Active Players',
                value: `\`${activePlayers}\``,
                inline: true
            },
            {
                name: '📋 Commands',
                value: `\`${stats.commands + stats.slashCommands}\``,
                inline: true
            },
            {
                name: '🏓 Latency',
                value: `\`${client.ws.ping}ms\``,
                inline: true
            }
        )
        .setFooter({
            text: 'Developed by AXEML',
            iconURL: client.user.displayAvatarURL()
        })
        .setTimestamp();
}

// ═══════════════════════════════════════════════════════════════════════
// ⚙️ EMBED: System
// ═══════════════════════════════════════════════════════════════════════
function createSystemEmbed(client) {
    const memUsage = process.memoryUsage();
    const memUsed = (memUsage.heapUsed / 1024 / 1024).toFixed(2);
    const memTotal = (memUsage.heapTotal / 1024 / 1024).toFixed(2);

    let lavalinkStatus = '🔴 Offline';
    let lavalinkNodes = 0;
    try {
        if (client.lavalink?.nodeManager?.nodes) {
            const nodes = Array.from(client.lavalink.nodeManager.nodes.values());
            lavalinkNodes = nodes.length;
            const connectedNodes = nodes.filter(n => n.connected).length;
            lavalinkStatus = connectedNodes > 0 ? '🟢 Online' : '🔴 Offline';
        }
    } catch { }

    return new EmbedBuilder()
        .setColor(COLORS.EMBED_DEFAULT)
        .setAuthor({
            name: '⚙️ System Information',
            iconURL: client.user.displayAvatarURL()
        })
        .addFields(
            {
                name: '📦 Version',
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
                name: '💾 Memory',
                value: `\`${memUsed}MB / ${memTotal}MB\``,
                inline: true
            },
            {
                name: '🖥️ Platform',
                value: `\`${os.platform()}\``,
                inline: true
            },
            {
                name: '🎵 Lavalink',
                value: `${lavalinkStatus} (${lavalinkNodes} node${lavalinkNodes !== 1 ? 's' : ''})`,
                inline: true
            }
        )
        .setFooter({
            text: 'Developed by AXEML',
            iconURL: client.user.displayAvatarURL()
        })
        .setTimestamp();
}

// ═══════════════════════════════════════════════════════════════════════
// 👥 EMBED: Credits
// ═══════════════════════════════════════════════════════════════════════
function createCreditsEmbed(client) {
    return new EmbedBuilder()
        .setColor(COLORS.EMBED_DEFAULT)
        .setAuthor({
            name: '👥 Credits',
            iconURL: client.user.displayAvatarURL()
        })
        .setDescription(
            `This bot was developed with dedication by the **AXEML** team.\n\n` +
            `Thank you for using Brunix!`
        )
        .addFields(
            {
                name: '👑 Developer',
                value: `<@${DEV_ID}> (Gus)`,
                inline: true
            },
            {
                name: '🏢 Team',
                value: `AXEML`,
                inline: true
            },
            {
                name: '📅 Created',
                value: `<t:1704067200:D>`,
                inline: true
            }
        )
        .addFields(
            {
                name: '🛠️ Technologies',
                value:
                    `\`•\` Discord.js v14\n` +
                    `\`•\` Lavalink Client\n` +
                    `\`•\` Supabase Database\n` +
                    `\`•\` Node.js ${process.version}`,
                inline: false
            }
        )
        .setFooter({
            text: 'Thanks for using Brunix!',
            iconURL: client.user.displayAvatarURL()
        })
        .setTimestamp();
}
