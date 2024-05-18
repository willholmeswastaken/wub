import pino from 'pino'

// create pino logger
const logger = pino({
    level: process.env.PINO_LOG_LEVEL ?? 'info',
    base: {
        env: process.env.NODE_ENV,
        revision: process.env.VERCEL_GITHUB_COMMIT_SHA,
    },
});

export default logger