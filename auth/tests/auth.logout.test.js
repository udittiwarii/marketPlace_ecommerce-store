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

test('GET /api/auth/logout clears token cookie', async () => {
  const password = 'password123'
  const hash = await bcrypt.hash(password, 10)

  await User.create({
    username: 'logoutuser',
    email: 'logout@example.com',
    password: hash,
    fullName: { firstName: 'Logout', lastName: 'User' },
    role: 'user'
  })

  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'logout@example.com', password })

  expect([200, 201]).toContain(loginRes.status)
  const setCookie = loginRes.headers['set-cookie']
  expect(setCookie).toBeDefined()

  const logoutRes = await request(app)
    .get('/api/auth/logout')
    .set('Cookie', setCookie)

  expect([200, 204, 201]).toContain(logoutRes.status)

  const logoutSetCookie = logoutRes.headers['set-cookie']
  // Expect server to clear accessToken and refreshToken cookies (Max-Age=0 or expired or empty value)
  expect(logoutSetCookie).toBeDefined()
  const clearedAccess = logoutSetCookie.some((c) => {
    return c.startsWith('accessToken=') && (c.includes('Max-Age=0') || c.toLowerCase().includes('expires=') || c.includes('accessToken=;'))
  })
  const clearedRefresh = logoutSetCookie.some((c) => {
    return c.startsWith('refreshToken=') && (c.includes('Max-Age=0') || c.toLowerCase().includes('expires=') || c.includes('refreshToken=;'))
  })

  expect(clearedAccess).toBe(true)
  expect(clearedRefresh).toBe(true)
})
