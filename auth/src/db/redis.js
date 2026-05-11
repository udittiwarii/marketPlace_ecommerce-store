const { Redis } = require("ioredis");

if (process.env.NODE_ENV === 'test') {
    // Simple in-memory Redis-like stub for tests to avoid connecting to production Redis
    class InMemoryRedis {
        constructor() {
            this.store = new Map()
            this.timers = new Map()
        }

        async set(key, value, ...rest) {
            // support signature: set(key, value, 'EX', seconds)
            this._clearTimer(key)
            this.store.set(key, value)
            if (rest && rest.length >= 2 && String(rest[0]).toUpperCase() === 'EX') {
                const seconds = Number(rest[1]) || 0
                if (seconds > 0) {
                    const t = setTimeout(() => {
                        this.store.delete(key)
                        this.timers.delete(key)
                    }, seconds * 1000)
                    // allow process to exit if only these timers remain
                    if (typeof t.unref === 'function') t.unref()
                    this.timers.set(key, t)
                }
            }
            return 'OK'
        }

        async get(key) {
            return this.store.get(key) || null
        }

        async del(key) {
            this._clearTimer(key)
            return this.store.delete(key) ? 1 : 0
        }

        _clearTimer(key) {
            const t = this.timers.get(key)
            if (t) {
                clearTimeout(t)
                this.timers.delete(key)
            }
        }

        // noop for event handlers
        on() { }
        async quit() {
            for (const t of this.timers.values()) {
                try { clearTimeout(t) } catch (e) { }
            }
            this.timers.clear()
            this.store.clear()
        }
    }

    module.exports = new InMemoryRedis()
} else {
    const redis = new Redis({
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        password: process.env.REDIS_PASSWORD
    })
    module.exports = redis;
}
