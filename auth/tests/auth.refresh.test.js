const request = require('supertest')
const { MongoMemoryServer } = require('mongodb-memory-server')
const crypto = require('crypto')
const app = require('../src/app')
const { connectDB, closeDB } = require('../src/db/db')
const redis = require('../src/db/redis')
const User = require('../src/models/user.model')

let mongod

beforeAll(async () => {
    mongod = await MongoMemoryServer.create()
    const uri = mongod.getUri()
    process.env.ACCESS_SECRET = 'testsecret'
    process.env.ACCESS_SECRET = 'accesssecret'
    await connectDB(uri)
})

afterAll(async () => {
    await closeDB()
    if (redis && typeof redis.quit === 'function') await redis.quit()
    if (mongod) await mongod.stop()
})

beforeEach(async () => {
    await User.deleteMany({})
    // clear in-memory redis store when running under test stub
    if (redis && redis.store && typeof redis.store.clear === 'function') redis.store.clear()
})

test("POST /api/auth/refresh returns 200 and sets new tokens when refresh token is valid", async () => {
    const user = await User.create({
        username: 'refreshuser',
        email: 'refresh@example.com',
        password: 'irrelevant',
        fullName: { firstName: 'Refresh', lastName: 'User' },
        role: 'user'
    })

    const refreshToken = crypto.randomBytes(64).toString('hex')
    const hashed = crypto.createHash('sha256').update(refreshToken).digest('hex')

    await redis.set(`refresh:${hashed}`, user._id.toString(), 'EX', 7 * 24 * 60 * 60)

    const res = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', `refreshToken=${refreshToken}`)



    expect(res.status).toBe(200)



    const setCookie = res.headers['set-cookie']
    expect(setCookie).toBeDefined()

    const hasAccess = setCookie.some((c) => c.startsWith('accessToken='))
    const hasRefresh = setCookie.some((c) => c.startsWith('refreshToken='))

    expect(hasAccess).toBe(true)
    expect(hasRefresh).toBe(true)
})
