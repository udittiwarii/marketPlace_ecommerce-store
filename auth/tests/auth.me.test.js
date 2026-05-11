const request = require('supertest')
const { MongoMemoryServer } = require('mongodb-memory-server')
const bcrypt = require('bcrypt')
const app = require('../src/app')
const { connectDB, closeDB } = require('../src/db/db')
const redis = require('../src/db/redis')
const User = require('../src/models/user.model')

let mongod

beforeAll(async () => {
    mongod = await MongoMemoryServer.create()
    const uri = mongod.getUri()
    process.env.ACCESS_SECRET = 'testsecret'
    await connectDB(uri)
})

afterAll(async () => {
    await closeDB()
    if (redis && typeof redis.quit === 'function') await redis.quit()
    if (mongod) await mongod.stop()
})

beforeEach(async () => {
    await User.deleteMany({})
})

test('GET /api/auth/me returns user data when authenticated', async () => {
    const password = 'password123'
    const hash = await bcrypt.hash(password, 10)

    await User.create({
        username: 'meuser',
        email: 'me@example.com',
        password: hash,
        fullName: { firstName: 'Me', lastName: 'User' },
        role: 'user'
    })

    const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'me@example.com', password })

    expect([200, 201]).toContain(loginRes.status)

    const setCookie = loginRes.headers['set-cookie']
    expect(setCookie).toBeDefined()

    const meRes = await request(app)
        .get('/api/auth/me')
        .set('Cookie', setCookie)

    expect([200, 201]).toContain(meRes.status)
    // expect returned user info to include email
    const user = meRes.body.user || meRes.body
    expect(user).toBeDefined()
    expect(user.email || user.user?.email).toBeDefined()
    expect(user.email || user.user?.email).toBe('me@example.com')
})

test('GET /api/auth/me rejects when no token provided', async () => {
    const res = await request(app).get('/api/auth/me')
    expect([400, 401, 403]).toContain(res.status)
})
