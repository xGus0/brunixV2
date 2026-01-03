// ╔═══════════════════════════════════════════════════════════════════╗
// ║                     Settings Command                                ║
// ║        Full Guild Configuration with i18n Language Selection        ║
// ╚═══════════════════════════════════════════════════════════════════╝

import { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ComponentType, PermissionFlagsBits } from 'discord.js';
import { COLORS } from '../../config/constants.js';
import i18n from '../../utils/i18n.js';
import Logger from '../../utils/logger.js';

export default {
    name: 'settings',
    aliases: ['config', 'conf', 'prefix'],
    description: 'Painel de configuração do bot no servidor',
    category: 'utility',

    async execute(client, message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return message.reply(`❌ Você precisa de permissão **Gerenciar Servidor**.`);
        }

        // Quick prefix change compatibility
        if (args[0] && message.content.toLowerCase().includes('prefix')) {
            return this.quickPrefixChange(client, message, args[0]);
        }

        const config = await this.getGuildConfig(client, message.guild.id);
        await this.showDashboard(client, message, config);
    },

    async getGuildConfig(client, guildId) {
        const { data } = await client.db.from('guild_configs').select('*').eq('guild_id', guildId).single();
        return data || {
            guild_id: guildId,
            prefix: '!',
            language: 'pt-BR',
            dj_role: null,
            allowed_channels: []
        };
    },

    async saveConfig(client, guildId, updates) {
        const { error } = await client.db.from('guild_configs').upsert({
            guild_id: guildId,
            updated_at: new Date().toISOString(),
            ...updates
        }, { onConflict: 'guild_id' });

        if (!error && updates.prefix) {
            client.prefixes.set(guildId, updates.prefix);
        }
        return !error;
    },

    async showDashboard(client, message, config, existingMessage = null) {
        const lang = config.language || 'pt-BR';
        const t = (key, replacements) => i18n.t(lang, key, replacements);

        const embed = new EmbedBuilder()
            .setColor(COLORS.EMBED_PREMIUM)
            .setAuthor({ name: `⚙️ ${t('settings.title')} • ${message.guild.name}`, iconURL: message.guild.iconURL() })
            .setDescription(t('settings.description'))
            .addFields(
                { name: `🔡 ${t('settings.prefix')}`, value: `\`${config.prefix}\``, inline: true },
                { name: `🏳️ ${t('settings.language')}`, value: `${i18n.getLanguageEmoji(lang)} ${i18n.getLanguageName(lang)}`, inline: true },
                { name: `👮 ${t('settings.dj_role')}`, value: config.dj_role ? `<@&${config.dj_role}>` : `\`${t('settings.none')}\``, inline: true },
                { name: `💬 ${t('settings.music_channels')}`, value: config.allowed_channels?.length ? config.allowed_channels.map(c => `<#${c}>`).join(', ') : `\`${t('settings.all')}\``, inline: false }
            )
            .setFooter({ text: 'Selecione uma opção para editar' });

        const menu = new StringSelectMenuBuilder()
            .setCustomId('settings_menu')
            .setPlaceholder('Editar configurações...')
            .addOptions([
                { label: t('settings.edit_prefix'), value: 'edit_prefix', emoji: '🔡' },
                { label: t('settings.edit_language'), value: 'edit_lang', emoji: '🏳️' },
                { label: t('settings.edit_dj'), value: 'edit_dj', emoji: '👮' },
                { label: t('settings.edit_channels'), value: 'edit_channels', emoji: '💬' },
                { label: t('settings.reset'), value: 'reset_all', emoji: '⚠️' }
            ]);

        const row = new ActionRowBuilder().addComponents(menu);

        let msg;
        if (existingMessage) {
            msg = await existingMessage.edit({ embeds: [embed], components: [row] });
        } else {
            msg = await message.reply({ embeds: [embed], components: [row] });
        }

        this.handleInteraction(client, msg, message, config);
    },

    handleInteraction(client, msg, originalMessage, config) {
        const collector = msg.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            filter: i => i.user.id === originalMessage.author.id,
            time: 120000
        });

        collector.on('collect', async (interaction) => {
            const value = interaction.values[0];
            const lang = config.language || 'pt-BR';
            const t = (key, replacements) => i18n.t(lang, key, replacements);

            if (value === 'edit_prefix') {
                await this.handlePrefixEdit(client, interaction, originalMessage, config, msg);
            }

            else if (value === 'edit_lang') {
                await this.handleLanguageEdit(client, interaction, originalMessage, config, msg);
            }

            else if (value === 'edit_dj') {
                await this.handleDJEdit(client, interaction, originalMessage, config, msg);
            }

            else if (value === 'edit_channels') {
                await interaction.reply({ content: '🚧 Em desenvolvimento...', ephemeral: true });
            }

            else if (value === 'reset_all') {
                const defaultConfig = { prefix: '!', language: 'pt-BR', dj_role: null, allowed_channels: [] };
                await this.saveConfig(client, config.guild_id, defaultConfig);
                config = { ...defaultConfig, guild_id: config.guild_id };
                await interaction.reply({ content: `✅ ${t('settings.reset_confirm')}`, ephemeral: true });
                await this.showDashboard(client, originalMessage, config, msg);
            }
        });
    },

    async handlePrefixEdit(client, interaction, originalMessage, config, panelMsg) {
        const lang = config.language || 'pt-BR';
        const t = (key, replacements) => i18n.t(lang, key, replacements);

        await interaction.reply({ content: `🔤 ${t('settings.prefix_prompt')}`, ephemeral: true });

        try {
            const collected = await originalMessage.channel.awaitMessages({
                filter: m => m.author.id === interaction.user.id,
                max: 1,
                time: 30000,
                errors: ['time']
            });

            const newPrefix = collected.first()?.content?.trim();
            collected.first().delete().catch(() => { });

            if (newPrefix && newPrefix.length <= 5 && !newPrefix.includes(' ')) {
                config.prefix = newPrefix;
                await this.saveConfig(client, config.guild_id, config);
                await interaction.deleteReply();
                await originalMessage.channel.send({ content: `✅ ${t('settings.prefix_changed', { prefix: newPrefix })}` }).then(m => setTimeout(() => m.delete().catch(() => { }), 5000));
                await this.showDashboard(client, originalMessage, config, panelMsg);
            } else {
                await interaction.editReply({ content: `❌ ${t('settings.prefix_invalid')}` });
            }
        } catch {
            await interaction.editReply({ content: '⏰ Tempo esgotado.' });
        }
    },

    async handleLanguageEdit(client, interaction, originalMessage, config, panelMsg) {
        const lang = config.language || 'pt-BR';
        const t = (key, replacements) => i18n.t(lang, key, replacements);

        // Create language selection menu
        const langOptions = i18n.getLanguageOptions();

        const langMenu = new StringSelectMenuBuilder()
            .setCustomId('lang_select')
            .setPlaceholder(t('settings.select_language'))
            .addOptions(langOptions);

        const langRow = new ActionRowBuilder().addComponents(langMenu);

        try {
            await interaction.reply({
                content: `🏳️ ${t('settings.select_language')}`,
                components: [langRow],
                ephemeral: true
            });

            // Listen for language selection
            const langInteraction = await interaction.channel.awaitMessageComponent({
                componentType: ComponentType.StringSelect,
                filter: i => i.customId === 'lang_select' && i.user.id === interaction.user.id,
                time: 30000
            });

            const newLang = langInteraction.values[0];
            config.language = newLang;
            await this.saveConfig(client, config.guild_id, config);

            const newT = (key, replacements) => i18n.t(newLang, key, replacements);

            await langInteraction.update({
                content: `✅ ${newT('settings.language_changed', { language: i18n.getLanguageName(newLang) })}`,
                components: []
            });

            await this.showDashboard(client, originalMessage, config, panelMsg);

        } catch (error) {
            // Try to edit reply, but don't crash if interaction expired
            try {
                if (interaction.replied || interaction.deferred) {
                    await interaction.editReply({ content: '⏰ Tempo esgotado.', components: [] }).catch(() => { });
                }
            } catch {
                // Interaction expired, ignore
                Logger.warn('Settings: Language edit interaction expired');
            }
        }
    },

    async handleDJEdit(client, interaction, originalMessage, config, panelMsg) {
        const lang = config.language || 'pt-BR';
        const t = (key, replacements) => i18n.t(lang, key, replacements);

        await interaction.reply({ content: `👮 ${t('settings.dj_prompt')}`, ephemeral: true });

        try {
            const collected = await originalMessage.channel.awaitMessages({
                filter: m => m.author.id === interaction.user.id,
                max: 1,
                time: 30000,
                errors: ['time']
            });

            const content = collected.first()?.content;
            collected.first().delete().catch(() => { });

            if (content) {
                let roleId = content.replace(/[<@&>]/g, '');
                if (content.toLowerCase() === 'disable') roleId = null;

                config.dj_role = roleId;
                await this.saveConfig(client, config.guild_id, config);
                await interaction.deleteReply();
                await this.showDashboard(client, originalMessage, config, panelMsg);
            }
        } catch {
            await interaction.editReply({ content: '⏰ Tempo esgotado.' });
        }
    },

    async quickPrefixChange(client, message, newPrefix) {
        if (newPrefix.length > 5 || newPrefix.includes(' ')) {
            return message.reply('❌ Prefixo inválido!');
        }
        const config = await this.getGuildConfig(client, message.guild.id);
        config.prefix = newPrefix;
        await this.saveConfig(client, message.guild.id, config);
        message.reply(`✅ Prefixo alterado para \`${newPrefix}\``);
    }
};
