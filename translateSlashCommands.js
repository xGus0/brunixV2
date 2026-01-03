// Script para traduzir TODOS os comandos slash para inglês
// Execute: node translateSlashCommands.js

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const translations = {
    // Música
    'Pausa a música atual': 'Pauses the current song',
    'Retoma a música pausada': 'Resumes the paused song',
    'Pula para a próxima música': 'Skips to the next song',
    'Para a música e desconecta do canal': 'Stops playback and disconnects',
    'Ajusta o volume da reprodução': 'Adjusts playback volume',
    'Nível do volume (0-100)': 'Volume level (0-100)',
    'Configura o modo de repetição': 'Sets repeat mode',
    'Modo de repetição': 'Repeat mode',
    'Embaralha a fila de músicas': 'Shuffles the music queue',
    'Mostra a fila de músicas': 'Shows the music queue',
    'Mostra a música que está tocando': 'Shows currently playing song',
    'Mostra a letra da música': 'Shows song lyrics',
    'Nome da música (opcional - usa a música atual)': 'Song name (optional - uses current song)',
    'Busca músicas e exibe resultados interativos': 'Search songs with interactive results',
    'Nome da música ou artista': 'Song or artist name',
    'Fonte de busca': 'Search source',
    'Inicia modo rádio 24/7 com gênero musical': 'Starts 24/7 radio mode with music genre',
    'Gênero musical': 'Music genre',

    // Usuário
    'Gerencia suas músicas favoritas': 'Manages your favorite songs',
    'Adiciona a música atual aos favoritos': 'Adds currentplaying song to favorites',
    'Remove uma música dos favoritos': 'Removes a song from favorites',
    'Número da música na lista de favoritos': 'Song number in favorites list',
    'Mostra sua lista de favoritos': 'Shows your favorites list',
    'Gerencia suas playlists personalizadas': 'Manages your custom playlists',
    'Cria uma nova playlist': 'Creates a new playlist',
    'Nome da playlist': 'Playlist name',
    'Deleta uma playlist': 'Deletes a playlist',
    'Mostra suas playlists': 'Shows your playlists',
    'Mostra as músicas de uma playlist': 'Shows songs in a playlist',
    'Mostra o perfil de usuário': 'Shows user profile',
    'Usuário para ver o perfil (padrão: você)': 'User to view profile (default: you)',

    // Utilidade
    'Mostra a latência do bot': 'Shows bot latency',
    'Mostra todos os comandos disponíveis': 'Shows all available commands',
    'Informações sobre o bot': 'Bot information'
};

const slashPath = './src/slash';
const categories = readdirSync(slashPath);

let totalTranslations = 0;

for (const category of categories) {
    const categoryPath = join(slashPath, category);
    const files = readdirSync(categoryPath).filter(f => f.endsWith('.js'));

    for (const file of files) {
        const filePath = join(categoryPath, file);
        let content = readFileSync(filePath, 'utf-8');
        let modified = false;

        Object.entries(translations).forEach(([pt, en]) => {
            const regex = new RegExp(pt.replace(/[()]/g, '\\$&'), 'g');
            if (content.match(regex)) {
                content = content.replace(regex, en);
                modified = true;
                totalTranslations++;
            }
        });

        if (modified) {
            writeFileSync(filePath, content, 'utf-8');
            console.log(`✓ ${category}/${file}`);
        }
    }
}

console.log(`\n✅ Translated ${totalTranslations} strings!`);
