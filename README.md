# 🎵 Brunix 2.0

Bot de música avançado para Discord com suporte a múltiplas plataformas.

## 🚀 Recursos

- 🎶 Reprodução de música do **YouTube**, **Spotify**, **SoundCloud** e mais
- 📻 Sistema de **Radio 24/7** com múltiplos gêneros
- 🎵 **Autoplay inteligente** com recomendações do Last.fm
- 📝 Sistema de **Playlists** personalizadas
- 🎤 Busca de **letras** de músicas
- 💾 Banco de dados **Supabase** para persistência
- 🎨 Interface visual com **canvas cards** premium

## 📋 Pré-requisitos

- **Node.js** v18 ou superior
- **Lavalink** server configurado
- Conta **Discord Developer** (para bot token)
- Conta **Supabase** (para banco de dados)
- **APIs** (opcional, mas recomendado):
  - Spotify API
  - Last.fm API
  - DeepL API (para tradução)

## ⚙️ Instalação

### 1. Clone o repositório
```bash
git clone https://github.com/seu-usuario/brunix-2.0.git
cd brunix-2.0
```

### 2. Instale as dependências
```bash
npm install
```

### 3. Configure o arquivo `config.json`
```bash
# Copie o template
cp config.json.example config.json

# Edite o arquivo config.json com suas credenciais
```

**Estrutura do `config.json`:**
```json
{
  "DISCORD_TOKEN": "seu_token_do_bot",
  "DISCORD_CLIENT_ID": "id_do_seu_bot",
  "SUPABASE_KEY": "sua_chave_anon_do_supabase",
  "SUPABASE_URL": "https://seu-projeto.supabase.co",
  "DEV_ID": "seu_discord_id",
  "MUSIC_API_PASSWORD": "senha_opcional",
  "DEEPL_API_KEY": "chave_api_deepl",
  "LAVALINK_HOST": "host_do_lavalink",
  "LAVALINK_PORT": 2333,
  "LAVALINK_PASSWORD": "senha_do_lavalink",
  "LAVALINK_SECURE": false,
  "SPOTIFY_CLIENT_ID": "client_id_spotify",
  "SPOTIFY_CLIENT_SECRET": "client_secret_spotify",
  "LASTFM_API_KEY": "chave_api_lastfm",
  "LASTFM_API_SECRET": "secret_api_lastfm"
}
```

### 4. Configure o Lavalink
Certifique-se de ter um servidor Lavalink rodando. Configure o arquivo `application.yaml` conforme necessário.

### 5. Deploy dos comandos slash
```bash
npm run deploy
```

### 6. Inicie o bot
```bash
npm start
```

## 🔐 Segurança

⚠️ **NUNCA** faça commit dos seguintes arquivos:
- `config.json` - Contém tokens e credenciais
- `.env` - Variáveis de ambiente sensíveis
- `application.yaml` - Configuração do Lavalink com senhas

Esses arquivos já estão protegidos pelo `.gitignore`.

## 📚 Comandos

### Música
- `/play <música>` - Toca uma música
- `/skip` - Pula a música atual
- `/pause` - Pausa a reprodução
- `/resume` - Resume a reprodução
- `/queue` - Mostra a fila
- `/radio [gênero]` - Inicia radio 24/7
- `/lyrics [música]` - Busca letras

### Usuário
- `/playlist` - Gerencia suas playlists
- `/favorite` - Adiciona aos favoritos
- `/profile` - Mostra seu perfil

### Utilidade
- `/help` - Mostra ajuda
- `/ping` - Mostra latência
- `/botinfo` - Informações do bot

## 🛠️ Tecnologias

- **Discord.js** - Framework para Discord bots
- **Lavalink** - Servidor de áudio
- **Supabase** - Banco de dados PostgreSQL
- **Canvas** - Geração de imagens dinâmicas
- **Last.fm API** - Recomendações musicais
- **Spotify API** - Metadados e busca

## 📝 Licença

Este projeto é privado e de uso pessoal.

## 👨‍💻 Desenvolvedor

Desenvolvido com 💜 por Gus
