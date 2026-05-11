const request = require('supertest')
const { MongoMemoryServer } = require('mongodb-memory-server')
const app = require('../src/app')
const { connectDB, closeDB } = require('../src/db/db')
const redis = require('../src/db/redis')
const User = require('../src/models/user.model')

let mongod

beforeAll(async () => {
  mongod = await MongoMemoryServer.create()
  const uri = mongod.getUri()
  const jwtSecret = 'testsecret'
  process.env.ACCESS_SECRET = jwtSecret
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

test('POST /api/auth/register creates a user', async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      fullName: { firstName: 'Test', lastName: 'User' },
      role: 'user'
    })
    .expect(201)

  expect(res.body).toHaveProperty('user')

  const userInDb = await User.findOne({ email: 'test@example.com' })
  expect(userInDb).not.toBeNull()
  expect(userInDb.username).toBe('testuser')
  expect(userInDb.password).not.toBe('password123')
})
