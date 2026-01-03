// ╔═══════════════════════════════════════════════════════════════════╗
// ║                        Help Command                                 ║
// ║           Premium Aesthetics with i18n Support                      ║
// ╚═══════════════════════════════════════════════════════════════════╝

import { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';
import { COLORS } from '../../config/constants.js';
import i18n from '../../utils/i18n.js';
import Embed from '../../utils/embed.js';

export default {
    name: 'help',
    aliases: ['ajuda', 'h'],
    description: 'Mostra todos os comandos disponíveis',
    category: 'utility',

    async execute(client, message, args) {
        const prefix = await client.getPrefix(message.guild.id);

        // Get guild language
        const guildConfig = await this.getGuildConfig(client, message.guild.id);
        const lang = guildConfig.language || 'pt-BR';
        const t = (key, replacements) => i18n.t(lang, key, replacements);

        if (args[0]) {
            return this.showCommandInfo(client, message, args[0], prefix, lang, t);
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

        client.commands.forEach(cmd => {
            if (categories[cmd.category]) {
                categories[cmd.category].cmds.push(cmd.name);
            }
        });

        // Create Home Embed
        const homeEmbed = new EmbedBuilder()
            .setColor(COLORS.EMBED_DEFAULT)
            .setAuthor({
                name: `${client.user.username} • ${t('commands.help.responses.title')}`,
                iconURL: client.user.displayAvatarURL()
            })
            .setDescription(
                lang === 'pt-BR'
                    ? `**Bem-vindo ao ${client.user.username}!**

Um bot de música de alta qualidade com interface premium.
Use o menu abaixo para navegar pelas categorias de comandos.

**Prefixo Atual:** \`${prefix}\`
**Total de Comandos:** \`${client.commands.size}\`

> 💡 Use \`${prefix}help <comando>\` para ver detalhes de um comando específico.`
                    : `**Welcome to ${client.user.username}!**

A high-quality music bot with premium interface.
Use the menu below to navigate through command categories.

**Current Prefix:** \`${prefix}\`
**Total Commands:** \`${client.commands.size}\`

> 💡 Use \`${prefix}help <command>\` to see details of a specific command.`
            )
            .setThumbnail(client.user.displayAvatarURL({ size: 256 }))
            .addFields({
                name: lang === 'pt-BR' ? 'Links Úteis' : 'Useful Links',
                value: '[Dashboard](https://brunix.gg) • [Suporte](https://discord.gg/brunix)',
                inline: true
            })
            .setFooter({
                text: lang === 'pt-BR' ? 'Use os botões/menu para navegar' : 'Use buttons/menu to navigate'
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
                ...Object.entries(categories).map(([key, data]) => ({
                    label: data.label,
                    value: key,
                    emoji: data.emoji,
                    description: data.description
                }))
            ]);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        const reply = await message.reply({
            embeds: [homeEmbed],
            components: [row]
        });

        const collector = reply.createMessageComponentCollector({
            filter: i => i.user.id === message.author.id,
            time: 60000
        });

        collector.on('collect', async (interaction) => {
            const value = interaction.values[0];

            if (value === 'home') {
                await interaction.update({ embeds: [homeEmbed] });
                return;
            }

            const category = categories[value];
            if (category) {
                const embed = new EmbedBuilder()
                    .setColor(COLORS.EMBED_DEFAULT)
                    .setAuthor({
                        name: `${category.emoji} ${category.label}`,
                        iconURL: client.user.displayAvatarURL()
                    })
                    .setDescription(
                        lang === 'pt-BR'
                            ? `Lista de comandos da categoria **${category.label}**.\nUse \`${prefix}help <comando>\` para mais detalhes.`
                            : `Command list for category **${category.label}**.\nUse \`${prefix}help <command>\` for more details.`
                    )
                    .setFooter({
                        text: lang === 'pt-BR'
                            ? `${category.cmds.length} comandos`
                            : `${category.cmds.length} commands`
                    });

                // Format commands list with i18n descriptions
                const commandsList = category.cmds.map(cmdName => {
                    const cmd = client.commands.get(cmdName);
                    // Try to get localized description, fallback to command's description
                    const localizedDesc = i18n.t(lang, `commands.${cmdName}.description`, null, true) || cmd.description;
                    return `\`${prefix}${cmd.name}\` • ${localizedDesc}`;
                }).join('\n');

                embed.addFields({
                    name: lang === 'pt-BR' ? 'Comandos' : 'Commands',
                    value: commandsList || (lang === 'pt-BR' ? 'Nenhum comando.' : 'No commands.')
                });

                await interaction.update({ embeds: [embed] });
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

    showCommandInfo(client, message, commandName, prefix, lang, t) {
        const cmd = client.commands.get(commandName) || client.commands.find(c => c.aliases && c.aliases.includes(commandName));

        if (!cmd) {
            return message.reply({
                embeds: [Embed.error(
                    lang === 'pt-BR' ? 'Comando não encontrado.' : 'Command not found.'
                )]
            });
        }

        // Try to get localized description
        const localizedDesc = i18n.t(lang, `commands.${cmd.name}.description`, null, true) || cmd.description;

        const embed = new EmbedBuilder()
            .setColor(COLORS.EMBED_DEFAULT)
            .setTitle(`📖 ${lang === 'pt-BR' ? 'Comando' : 'Command'}: ${cmd.name}`)
            .setDescription(localizedDesc)
            .addFields(
                {
                    name: lang === 'pt-BR' ? 'Categoria' : 'Category',
                    value: t(`commands.help.responses.category_${cmd.category}`) || cmd.category,
                    inline: true
                },
                {
                    name: t('commands.help.responses.aliases') || (lang === 'pt-BR' ? 'Atalhos' : 'Aliases'),
                    value: cmd.aliases?.length ? cmd.aliases.map(a => `\`${a}\``).join(', ') : (lang === 'pt-BR' ? 'Nenhum' : 'None'),
                    inline: true
                },
                {
                    name: t('commands.help.responses.usage') || (lang === 'pt-BR' ? 'Uso' : 'Usage'),
                    value: `\`${prefix}${cmd.name} ${cmd.usage || ''}\``,
                    inline: false
                }
            );

        return message.reply({ embeds: [embed] });
    }
};
