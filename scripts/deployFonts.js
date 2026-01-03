// ╔═══════════════════════════════════════════════════════════════════╗
// ║                    Font Deployment Script                           ║
// ║        Downloads and installs fonts with emoji support              ║
// ╚═══════════════════════════════════════════════════════════════════╝

import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FONTS_DIR = path.join(__dirname, '../assets/fonts');

// Font sources (Google Fonts and others)
const FONTS = [
    {
        name: 'Inter',
        url: 'https://github.com/rsms/inter/releases/download/v4.0/Inter-4.0.zip',
        variants: ['Regular', 'Medium', 'Bold', 'SemiBold']
    },
    {
        name: 'Noto Sans',
        url: 'https://github.com/notofonts/notofonts.github.io/raw/main/fonts/NotoSans/hinted/ttf/NotoSans-Regular.ttf',
        file: 'NotoSans-Regular.ttf'
    },
    {
        name: 'Noto Color Emoji',
        url: 'https://github.com/googlefonts/noto-emoji/raw/main/fonts/NotoColorEmoji.ttf',
        file: 'NotoColorEmoji.ttf',
        description: 'Emoji support'
    },
    {
        name: 'Roboto',
        url: 'https://github.com/google/roboto/releases/download/v2.138/roboto-unhinted.zip',
        variants: ['Regular', 'Medium', 'Bold']
    }
];

/**
 * Download a file from URL
 */
function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);

        https.get(url, (response) => {
            // Handle redirects
            if (response.statusCode === 302 || response.statusCode === 301) {
                return downloadFile(response.headers.location, dest).then(resolve).catch(reject);
            }

            response.pipe(file);

            file.on('finish', () => {
                file.close();
                resolve(dest);
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => { });
            reject(err);
        });
    });
}

/**
 * Create fonts directory if it doesn't exist
 */
function ensureFontsDir() {
    if (!fs.existsSync(FONTS_DIR)) {
        fs.mkdirSync(FONTS_DIR, { recursive: true });
        console.log(`✅ Created fonts directory: ${FONTS_DIR}`);
    }
}

/**
 * Deploy fonts
 */
async function deployFonts() {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║          🎨 Font Deployment Script                    ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    ensureFontsDir();

    for (const font of FONTS) {
        try {
            console.log(`\n📦 Downloading ${font.name}...`);

            if (font.file) {
                // Direct file download
                const destPath = path.join(FONTS_DIR, font.file);

                if (fs.existsSync(destPath)) {
                    console.log(`   ⏭️  ${font.file} already exists, skipping...`);
                    continue;
                }

                await downloadFile(font.url, destPath);
                console.log(`   ✅ Downloaded: ${font.file}`);

                if (font.description) {
                    console.log(`   📝 ${font.description}`);
                }
            } else {
                // ZIP download (would need unzip library)
                console.log(`   ⚠️  ${font.name} requires manual installation from:`);
                console.log(`   🔗 ${font.url}`);
            }

        } catch (error) {
            console.error(`   ❌ Error downloading ${font.name}:`, error.message);
        }
    }

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║                  ✅ Deployment Complete                 ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');
    console.log('📁 Fonts installed in:', FONTS_DIR);
    console.log('\n💡 Usage in Canvas:');
    console.log('   registerFont(path.join(__dirname, "../../assets/fonts/NotoColorEmoji.ttf"), {');
    console.log('     family: "Noto Color Emoji"');
    console.log('   });\n');
}

// Run deployment
deployFonts().catch(console.error);
