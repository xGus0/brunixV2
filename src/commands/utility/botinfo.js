// ╔═══════════════════════════════════════════════════════════════════╗
// ║                    !botinfo Command                                  ║
// ║                   Informações do Bot Brunix                          ║
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
    aliases: ['bot', 'info', 'sobre'],
    description: 'Mostra informações sobre o Brunix',
    category: 'utility',

    async execute(client, message, args) {
        // Calcular uptime como timestamp Discord
        const startTimestamp = Math.floor((Date.now() - client.uptime) / 1000);

        // Estatísticas
        const stats = {
            guilds: client.guilds.cache.size,
            users: client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0),
            channels: client.channels.cache.size,
            commands: client.commands?.size || 0,
            slashCommands: client.slashCommands?.size || 0
        };

        // Criar embed principal
        const mainEmbed = createMainEmbed(client, startTimestamp, stats);

        // Criar menu de seleção
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('botinfo_menu')
            .setPlaceholder('📚 Selecione uma categoria')
            .addOptions([
                {
                    label: 'Visão Geral',
                    description: 'Informações gerais do bot',
                    value: 'overview',
                    emoji: '🏠'
                },
                {
                    label: 'Estatísticas',
                    description: 'Números e métricas do bot',
                    value: 'stats',
                    emoji: '📊'
                },
                {
                    label: 'Sistema',
                    description: 'Informações técnicas',
                    value: 'system',
                    emoji: '⚙️'
                },
                {
                    label: 'Créditos',
                    description: 'Equipe de desenvolvimento',
                    value: 'credits',
                    emoji: '👥'
                }
            ]);

        const menuRow = new ActionRowBuilder().addComponents(selectMenu);

        // Criar botões
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

        // Criar convite do servidor de suporte
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
                .setLabel('Adicionar Bot')
                .setStyle(ButtonStyle.Link)
                .setURL(inviteUrl)
                .setEmoji('🤖'),
            new ButtonBuilder()
                .setLabel('Servidor de Suporte')
                .setStyle(ButtonStyle.Link)
                .setURL(supportInvite)
                .setEmoji('💬')
        );

        const reply = await message.reply({
            embeds: [mainEmbed],
            components: [menuRow, buttonRow]
        });

        // Collector para o menu
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
// 🏠 EMBED: Visão Geral
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
            `> Bot de música avançado para Discord com suporte a múltiplas plataformas.\n\n` +
            `🎵 **Funcionalidades**\n` +
            `╰ Reprodução de alta qualidade via Lavalink\n` +
            `╰ Suporte a Spotify, YouTube e SoundCloud\n` +
            `╰ Sistema de playlists e favoritos\n` +
            `╰ Autoplay inteligente com recomendações`
        )
        .addFields(
            {
                name: '� Servidores',
                value: `\`${stats.guilds.toLocaleString()}\``,
                inline: true
            },
            {
                name: '👥 Usuários',
                value: `\`${stats.users.toLocaleString()}\``,
                inline: true
            },
            {
                name: '⏰ Online desde',
                value: `<t:${startTimestamp}:R>`,
                inline: true
            }
        )
        .setFooter({
            text: 'Desenvolvido pela AXEML',
            iconURL: client.user.displayAvatarURL()
        })
        .setTimestamp();
}

// ═══════════════════════════════════════════════════════════════════════
// 📊 EMBED: Estatísticas
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
            name: '� Estatísticas',
            iconURL: client.user.displayAvatarURL()
        })
        .addFields(
            {
                name: '🌐 Servidores',
                value: `\`${stats.guilds.toLocaleString()}\``,
                inline: true
            },
            {
                name: '👥 Usuários',
                value: `\`${stats.users.toLocaleString()}\``,
                inline: true
            },
            {
                name: '📝 Canais',
                value: `\`${stats.channels.toLocaleString()}\``,
                inline: true
            },
            {
                name: '🎵 Players Ativos',
                value: `\`${activePlayers}\``,
                inline: true
            },
            {
                name: '� Comandos',
                value: `\`${stats.commands + stats.slashCommands}\``,
                inline: true
            },
            {
                name: '🏓 Latência',
                value: `\`${client.ws.ping}ms\``,
                inline: true
            }
        )
        .setFooter({
            text: 'Desenvolvido pela AXEML',
            iconURL: client.user.displayAvatarURL()
        })
        .setTimestamp();
}

// ═══════════════════════════════════════════════════════════════════════
// ⚙️ EMBED: Sistema
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
            name: '⚙️ Informações do Sistema',
            iconURL: client.user.displayAvatarURL()
        })
        .addFields(
            {
                name: '� Versão',
                value: `\`v2.0.0\``,
                inline: true
            },
            {
                name: '� Node.js',
                value: `\`${process.version}\``,
                inline: true
            },
            {
                name: '� Discord.js',
                value: `\`v14.14.1\``,
                inline: true
            },
            {
                name: '� Memória',
                value: `\`${memUsed}MB / ${memTotal}MB\``,
                inline: true
            },
            {
                name: '🖥️ Plataforma',
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
            text: 'Desenvolvido pela AXEML',
            iconURL: client.user.displayAvatarURL()
        })
        .setTimestamp();
}

// ═══════════════════════════════════════════════════════════════════════
// 👥 EMBED: Créditos
// ═══════════════════════════════════════════════════════════════════════
function createCreditsEmbed(client) {
    return new EmbedBuilder()
        .setColor(COLORS.EMBED_DEFAULT)
        .setAuthor({
            name: '👥 Créditos',
            iconURL: client.user.displayAvatarURL()
        })
        .setDescription(
            `Este bot foi desenvolvido com dedicação pela equipe **AXEML**.\n\n` +
            `Agradecemos por usar o Brunix!`
        )
        .addFields(
            {
                name: '👑 Desenvolvedor',
                value: `<@${DEV_ID}> (Gus)`,
                inline: true
            },
            {
                name: '� Equipe',
                value: `AXEML`,
                inline: true
            },
            {
                name: '📅 Criado em',
                value: `<t:1704067200:D>`,
                inline: true
            }
        )
        .addFields(
            {
                name: '�️ Tecnologias',
                value:
                    `\`•\` Discord.js v14\n` +
                    `\`•\` Lavalink Client\n` +
                    `\`•\` Supabase Database\n` +
                    `\`•\` Node.js ${process.version}`,
                inline: false
            }
        )
        .setFooter({
            text: 'Obrigado por usar o Brunix!',
            iconURL: client.user.displayAvatarURL()
        })
        .setTimestamp();
}
