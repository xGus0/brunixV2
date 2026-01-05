// ╔═══════════════════════════════════════════════════════════════════╗
// ║                    /help Slash Command                              ║
// ║           Premium Aesthetics with i18n Support                      ║
// ╚═══════════════════════════════════════════════════════════════════╝

import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';
import { COLORS } from '../../config/constants.js';
import i18n from '../../utils/i18n.js';

export default {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('[UTILITY] 📚 Shows all available commands')
        .addStringOption(option =>
            option.setName('command')
                .setDescription('Get detailed info about a specific command')
                .setRequired(false)
        ),

    async execute(interaction) {
        const commandName = interaction.options.getString('command');

        // Get guild language
        const guildConfig = await this.getGuildConfig(interaction.client, interaction.guild.id);
        const lang = guildConfig.language || 'pt-BR';
        const t = (key, replacements) => i18n.t(lang, key, replacements);

        if (commandName) {
            return this.showCommandInfo(interaction, commandName, lang, t);
        }

        // Categorize commands
        const categories = {
            music: {
                emoji: '🎵',
                label: t('commands.help.responses.category_music'),
                description: lang === 'pt-BR' ? 'Controles do player e fila' : 'Player controls and queue',
                cmds: []
            },
            user: {
                emoji: '👤',
                label: t('commands.help.responses.category_user'),
                description: lang === 'pt-BR' ? 'Perfil, playlists e favoritos' : 'Profile, playlists and favorites',
                cmds: []
            },
            utility: {
                emoji: '⚙️',
                label: t('commands.help.responses.category_utility'),
                description: lang === 'pt-BR' ? 'Informações e configurações' : 'Information and settings',
                cmds: []
            }
        };

        interaction.client.slashCommands.forEach(cmd => {
            const desc = cmd.data.description;
            if (desc.includes('[MUSIC]')) categories.music.cmds.push(cmd);
            else if (desc.includes('[USER]')) categories.user.cmds.push(cmd);
            else if (desc.includes('[UTILITY]')) categories.utility.cmds.push(cmd);
        });

        // Create Home Embed
        const homeEmbed = new EmbedBuilder()
            .setColor(COLORS.EMBED_DEFAULT)
            .setAuthor({
                name: `${interaction.client.user.username} • ${t('commands.help.responses.title')}`,
                iconURL: interaction.client.user.displayAvatarURL()
            })
            .setDescription(
                lang === 'pt-BR'
                    ? `**Bem-vindo ao ${interaction.client.user.username}!**

Um bot de música de alta qualidade com interface premium.
Use o menu abaixo para navegar pelas categorias de comandos.

**Total de Comandos:** \`${interaction.client.slashCommands.size}\`

> 💡 Use \`/help command:<nome>\` para ver detalhes de um comando específico.`
                    : `**Welcome to ${interaction.client.user.username}!**

A high-quality music bot with premium interface.
Use the menu below to navigate through command categories.

**Total Commands:** \`${interaction.client.slashCommands.size}\`

> 💡 Use \`/help command:<name>\` to see details of a specific command.`
            )
            .setThumbnail(interaction.client.user.displayAvatarURL({ size: 256 }))
            .addFields({
                name: lang === 'pt-BR' ? 'Links Úteis' : 'Useful Links',
                value: '[Dashboard](https://brunix.gg) • [Suporte](https://discord.gg/brunix)',
                inline: true
            })
            .setFooter({
                text: lang === 'pt-BR' ? 'Use o menu para navegar' : 'Use menu to navigate'
            });

        // Components
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('help_menu')
            .setPlaceholder(lang === 'pt-BR' ? 'Selecione uma categoria...' : 'Select a category...')
            .addOptions([
                {
                    label: lang === 'pt-BR' ? 'Início' : 'Home',
                    value: 'home',
                    emoji: '🏠',
                    description: lang === 'pt-BR' ? 'Voltar ao início' : 'Back to home'
                },
                ...Object.entries(categories)
                    .filter(([_, data]) => data.cmds.length > 0)
                    .map(([key, data]) => ({
                        label: data.label,
                        value: key,
                        emoji: data.emoji,
                        description: data.description
                    }))
            ]);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        const reply = await interaction.reply({
            embeds: [homeEmbed],
            components: [row],
            fetchReply: true
        });

        const collector = reply.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id,
            time: 60000
        });

        collector.on('collect', async (btnInteraction) => {
            const value = btnInteraction.values[0];

            if (value === 'home') {
                await btnInteraction.update({ embeds: [homeEmbed] });
                return;
            }

            const category = categories[value];
            if (category) {
                const embed = new EmbedBuilder()
                    .setColor(COLORS.EMBED_DEFAULT)
                    .setAuthor({
                        name: `${category.emoji} ${category.label}`,
                        iconURL: interaction.client.user.displayAvatarURL()
                    })
                    .setDescription(
                        lang === 'pt-BR'
                            ? `Lista de comandos da categoria **${category.label}**.\nUse \`/help command:<nome>\` para mais detalhes.`
                            : `Command list for category **${category.label}**.\nUse \`/help command:<name>\` for more details.`
                    )
                    .setFooter({
                        text: lang === 'pt-BR'
                            ? `${category.cmds.length} comandos`
                            : `${category.cmds.length} commands`
                    });

                // Format commands list
                const commandsList = category.cmds.map(cmd => {
                    const cleanDesc = cmd.data.description.replace(/\[.*?\]\s*/, '');
                    return `\`/${cmd.data.name}\` • ${cleanDesc}`;
                }).join('\n');

                embed.addFields({
                    name: lang === 'pt-BR' ? 'Comandos' : 'Commands',
                    value: commandsList || (lang === 'pt-BR' ? 'Nenhum comando.' : 'No commands.')
                });

                await btnInteraction.update({ embeds: [embed] });
            }
        });

        collector.on('end', () => {
            reply.edit({ components: [] }).catch(() => { });
        });
    },

    async getGuildConfig(client, guildId) {
        try {
            const { data } = await client.db.from('guild_configs').select('language').eq('guild_id', guildId).single();
            return data || { language: 'pt-BR' };
        } catch {
            return { language: 'pt-BR' };
        }
    },

    showCommandInfo(interaction, commandName, lang, t) {
        const cmd = interaction.client.slashCommands.get(commandName);

        if (!cmd) {
            return interaction.reply({
                content: lang === 'pt-BR' ? '❌ Comando não encontrado.' : '❌ Command not found.',
                ephemeral: true
            });
        }

        const cleanDesc = cmd.data.description.replace(/\[.*?\]\s*/, '');

        // Extract category from description tag
        let category = 'utility';
        if (cmd.data.description.includes('[MUSIC]')) category = 'music';
        else if (cmd.data.description.includes('[USER]')) category = 'user';

        const embed = new EmbedBuilder()
            .setColor(COLORS.EMBED_DEFAULT)
            .setTitle(`📖 ${lang === 'pt-BR' ? 'Comando' : 'Command'}: /${cmd.data.name}`)
            .setDescription(cleanDesc)
            .addFields(
                {
                    name: lang === 'pt-BR' ? 'Categoria' : 'Category',
                    value: t(`commands.help.responses.category_${category}`) || category,
                    inline: true
                }
            );

        // Add options if available
        if (cmd.data.options?.length > 0) {
            const optionsList = cmd.data.options.map(opt => {
                const required = opt.required ? '`[obrigatório]`' : '`[opcional]`';
                return `• **${opt.name}** ${required}: ${opt.description}`;
            }).join('\n');

            embed.addFields({
                name: lang === 'pt-BR' ? 'Opções' : 'Options',
                value: optionsList,
                inline: false
            });
        }

        return interaction.reply({ embeds: [embed], ephemeral: true });
    }
};
