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

test('POST /api/auth/login returns token cookie for valid credentials', async () => {
  const password = 'password123'
  const hash = await bcrypt.hash(password, 10)

  const user = await User.create({
    username: 'loginuser',
    email: 'login@example.com',
    password: hash,
    fullName: { firstName: 'Login', lastName: 'User' },
    role: 'user'
  })

  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'login@example.com', password })

  expect([200, 201]).toContain(res.status)

  const setCookie = res.headers['set-cookie']
  expect(setCookie).toBeDefined()
  const hasAccess = setCookie.some((c) => c.startsWith('accessToken='))
  const hasRefresh = setCookie.some((c) => c.startsWith('refreshToken='))

  expect(hasAccess).toBe(true)
  expect(hasRefresh).toBe(true)
})

test('POST /api/auth/login rejects invalid password', async () => {
  const password = 'password123'
  const hash = await bcrypt.hash(password, 10)

  await User.create({
    username: 'loginuser2',
    email: 'login2@example.com',
    password: hash,
    fullName: { firstName: 'Login', lastName: 'User2' },
    role: 'user'
  })

  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'login2@example.com', password: 'wrongpassword' })

  expect([400, 401, 403]).toContain(res.status)
})
