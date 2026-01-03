// ╔═══════════════════════════════════════════════════════════════════╗
// ║                          Logger Utility                             ║
// ╚═══════════════════════════════════════════════════════════════════╝

const COLORS = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',

    // Foreground
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    gray: '\x1b[90m'
};

const getTimestamp = () => {
    const now = new Date();
    return now.toLocaleTimeString('pt-BR', { hour12: false });
};

const formatMessage = (level, color, message, ...args) => {
    const timestamp = `${COLORS.gray}[${getTimestamp()}]${COLORS.reset}`;
    const levelTag = `${color}[${level}]${COLORS.reset}`;

    console.log(timestamp, levelTag, message, ...args);
};

export default class Logger {
    static info(message, ...args) {
        formatMessage('INFO', COLORS.blue, message, ...args);
    }

    static success(message, ...args) {
        formatMessage('SUCCESS', COLORS.green, message, ...args);
    }

    static warn(message, ...args) {
        formatMessage('WARN', COLORS.yellow, message, ...args);
    }

    static error(message, ...args) {
        formatMessage('ERROR', COLORS.red, message, ...args);
    }

    static debug(message, ...args) {
        if (process.env.DEBUG === 'true') {
            formatMessage('DEBUG', COLORS.magenta, message, ...args);
        }
    }

    static music(message, ...args) {
        formatMessage('MUSIC', COLORS.cyan, message, ...args);
    }

    static db(message, ...args) {
        formatMessage('DATABASE', COLORS.magenta, message, ...args);
    }
}
