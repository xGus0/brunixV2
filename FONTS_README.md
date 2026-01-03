# 🎨 Sistema de Deployment de Fontes

Sistema automatizado para baixar e instalar fontes com suporte a emojis e caracteres especiais.

## 📋 Fontes Incluídas

### Fontes Principais:
- **Inter** - Fonte moderna e legível (Regular, Medium, Bold, SemiBold)
- **Noto Sans** - Fonte universal do Google
- **Roboto** - Fonte material design

### Fonte de Emojis:
- **Noto Color Emoji** - Suporte completo a emojis coloridos

## 🚀 Como Usar

### 1. Instalar Fontes

Execute o script de deployment:

```bash
npm run deploy:fonts
```

As fontes serão baixadas automaticamente para `assets/fonts/`.

### 2. Usar no Canvas

Importe as fontes nos seus templates de canvas:

```javascript
import { createCanvas, loadImage, registerFont } from '@napi-rs/canvas';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Registrar fontes
registerFont(path.join(__dirname, '../../assets/fonts/NotoSans-Regular.ttf'), {
    family: 'Noto Sans'
});

registerFont(path.join(__dirname, '../../assets/fonts/NotoColorEmoji.ttf'), {
    family: 'Noto Color Emoji'
});

// Usar no canvas
const canvas = createCanvas(800, 400);
const ctx = canvas.getContext('2d');

// Usar fonte com fallback para emojis
ctx.font = '24px "Noto Sans", "Noto Color Emoji"';
ctx.fillText('Olá! 👋 🎵 ✨', 50, 50);
```

## 📁 Estrutura de Arquivos

```
assets/
  └── fonts/
      ├── NotoSans-Regular.ttf
      ├── NotoColorEmoji.ttf
      ├── Inter-*.ttf (manual)
      └── Roboto-*.ttf (manual)
```

## 🔧 Instalação Manual

Algumas fontes (Inter, Roboto) requerem download manual por serem arquivos ZIP:

### Inter:
1. Baixe: https://github.com/rsms/inter/releases/download/v4.0/Inter-4.0.zip
2. Extraia os arquivos `.ttf` para `assets/fonts/`

### Roboto:
1. Baixe: https://github.com/google/roboto/releases/download/v2.138/roboto-unhinted.zip
2. Extraia os arquivos `.ttf` para `assets/fonts/`

## 💡 Dicas

### Fallback de Fontes
Sempre use fallback para garantir que emojis sejam exibidos:

```javascript
ctx.font = '24px "Inter", "Noto Color Emoji"';
```

### Verificar Fontes Instaladas
```javascript
import { listFonts } from '@napi-rs/canvas';
console.log(listFonts());
```

### Tamanhos Recomendados
- Títulos: 32-48px
- Subtítulos: 24-32px
- Texto normal: 16-20px
- Emojis: Mesmo tamanho do texto adjacente

## 🐛 Troubleshooting

### Emojis não aparecem?
- Certifique-se de que `NotoColorEmoji.ttf` está instalada
- Use a fonte no fallback: `"Noto Color Emoji"`

### Fonte não carrega?
- Verifique se o caminho está correto
- Use `path.join()` com `__dirname`
- Confirme que o arquivo `.ttf` existe

## 📚 Recursos

- [Google Fonts](https://fonts.google.com/)
- [Noto Fonts](https://fonts.google.com/noto)
- [Inter Font](https://rsms.me/inter/)
- [@napi-rs/canvas Docs](https://github.com/Brooooooklyn/canvas)
