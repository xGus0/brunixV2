// ╔═══════════════════════════════════════════════════════════════════╗
// ║                      Bot Info Command                               ║
// ║        Interactive Dashboard with System & Statistical Data         ║
// ╚═══════════════════════════════════════════════════════════════════╝

import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, version as djsVersion } from 'discord.js';
import os from 'os';
import { COLORS } from '../../config/constants.js';
import { formatDuration } from '../../utils/formatters.js';

export default {
    name: 'botinfo',
    aliases: ['bi', 'info', 'stats'],
    description: 'Exibe informações detalhadas sobre o bot',
    category: 'utility',

    async execute(client, message, args) {
        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('botinfo_select')
                .setPlaceholder('Selecione uma categoria de informações...')
                .addOptions([
                    { label: 'Visão Geral', value: 'overview', emoji: '📊', description: 'Resumo geral do bot' },
                    { label: 'Estatísticas', value: 'stats', emoji: '📈', description: 'Números e métricas' },
                    { label: 'Sistema', value: 'system', emoji: '⚙️', description: 'Uso de recursos e hardware' },
                    { label: 'Equipe', value: 'team', emoji: '👥', description: 'Créditos e desenvolvedores' }
                ])
        );

        const supportRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setLabel('Me Adicione').setStyle(ButtonStyle.Link).setURL(`https://discord.com/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`),
            new ButtonBuilder().setLabel('Suporte').setStyle(ButtonStyle.Link).setURL('https://discord.gg/brunix'),
            new ButtonBuilder().setLabel('Dashboard').setStyle(ButtonStyle.Link).setURL('https://brunix.app')
        );

        const embed = this.getOverviewEmbed(client);

        const msg = await message.reply({ embeds: [embed], components: [row, supportRow] });

        const collector = msg.createMessageComponentCollector({
            filter: i => i.user.id === message.author.id && i.customId === 'botinfo_select',
            time: 60000
        });

        collector.on('collect', async (interaction) => {
            const value = interaction.values[0];
            let newEmbed;

            switch (value) {
                case 'overview': newEmbed = this.getOverviewEmbed(client); break;
                case 'stats': newEmbed = this.getStatsEmbed(client); break;
                case 'system': newEmbed = this.getSystemEmbed(client); break;
                case 'team': newEmbed = this.getTeamEmbed(client); break;
            }

            await interaction.update({ embeds: [newEmbed] });
        });
    },

    getOverviewEmbed(client) {
        return new EmbedBuilder()
            .setColor(COLORS.EMBED_PREMIUM)
            .setAuthor({ name: `${client.user.username} • Informações`, iconURL: client.user.displayAvatarURL() })
            .setThumbnail(client.user.displayAvatarURL({ size: 512 }))
            .setDescription(`
**Olá! Eu sou o ${client.user.username}.**
Um assistente de música avançado focado em qualidade e estética.

🤖 **Versão:** 2.0.0 (Premium)
📅 **Criado em:** 24/12/2025
🟢 **Online há:** ${formatDuration(client.uptime)}

Use o menu abaixo para explorar mais detalhes técnicos e estatísticas.
            `)
            .addFields(
                { name: '📚 Comandos', value: `\`${client.commands.size}\` comandos disponíveis`, inline: true },
                { name: '🎵 Node', value: `\`Lavalink v4\``, inline: true }
            )
            .setImage('https://media.discordapp.net/attachments/1118228399580680263/1169046645366403162/standard.gif?ex=676cd8d3&is=676b8753&hm=2e16c90d807604f37803d3c8a41703e3a47926b47c0b8f365922097003be02cf&=') // Placeholder banner
            .setFooter({ text: 'Brunix Systems © 2025' });
    },

    getStatsEmbed(client) {
        const totalUsers = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
        const activePlayers = client.manager.players.size;

        return new EmbedBuilder()
            .setColor(COLORS.EMBED_INFO)
            .setTitle('📈 Estatísticas em Tempo Real')
            .addFields(
                { name: '🌐 Servidores', value: `\`${client.guilds.cache.size.toLocaleString()}\``, inline: true },
                { name: '👥 Usuários Totais', value: `\`${totalUsers.toLocaleString()}\``, inline: true },
                { name: '🔊 Players Ativos', value: `\`${activePlayers}\``, inline: true },
                { name: '💿 Canais de Voz', value: `\`${client.channels.cache.filter(c => c.type === 2).size}\``, inline: true },
                { name: '🧠 Memória Usada', value: `\`${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB\``, inline: true },
                { name: '🏓 Ping', value: `\`${Math.round(client.ws.ping)}ms\``, inline: true }
            );
    },

    getSystemEmbed(client) {
        return new EmbedBuilder()
            .setColor(COLORS.EMBED_WARNING)
            .setTitle('⚙️ Informações do Sistema')
            .addFields(
                { name: '💻 Plataforma', value: `\`${os.platform()} (${os.arch()})\``, inline: true },
                { name: '🔋 Node.js', value: `\`${process.version}\``, inline: true },
                { name: '🛠️ Discord.js', value: `\`v${djsVersion}\``, inline: true },
                { name: '🔥 Kazagumo', value: `\`v3.3.0\``, inline: true }, // Versão aprox
                { name: '☁️ HostName', value: `\`${os.hostname()}\``, inline: true },
                { name: '🕒 CPU Cores', value: `\`${os.cpus().length} Cores\``, inline: true }
            );
    },

    getTeamEmbed(client) {
        return new EmbedBuilder()
            .setColor(COLORS.EMBED_SUCCESS)
            .setTitle('👥 Desenvolvedores & Créditos')
            .setDescription('O Brunix 2.0 foi desenvolvido com carinho para proporcionar a melhor experiência musical.')
            .addFields(
                { name: '👑 Criador & Lead Dev', value: '**Gustavo**', inline: false },
                { name: '🎨 Design & UX', value: 'Antigravity AI Team', inline: true },
                { name: '🛡️ Infraestrutura', value: 'Google Cloud / Supabase', inline: true }
            );
    }
};
