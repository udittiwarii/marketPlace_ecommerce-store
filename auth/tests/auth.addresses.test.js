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

async function createAndLoginUser(email = 'addr@example.com') {
    const password = 'password123'
    const hash = await bcrypt.hash(password, 10)

    await User.create({
        username: 'addruser',
        email,
        password: hash,
        fullName: { firstName: 'Addr', lastName: 'User' },
        role: 'user'
    })

    const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email, password })

    const setCookie = loginRes.headers['set-cookie']
    return setCookie
}

test('GET /api/auth/users/me/addresses returns saved addresses and default flag', async () => {
    const password = 'password123'
    const hash = await bcrypt.hash(password, 10)

    const user = await User.create({
        username: 'hasaddr',
        email: 'hasaddr@example.com',
        password: hash,
        fullName: { firstName: 'Has', lastName: 'Addr' },
        role: 'user',
        addresses: [
            { street: 'One St', city: 'City', state: 'S', zipCode: '11111', country: 'us', isDefault: true },
            { street: 'Two St', city: 'City2', state: 'S2', zipCode: '22222', country: 'us', isDefault: false }
        ]
    })

    const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'hasaddr@example.com', password })

    const setCookie = loginRes.headers['set-cookie']
    expect(setCookie).toBeDefined()

    const res = await request(app)
        .get('/api/auth/users/me/addresses')
        .set('Cookie', setCookie)

    expect([200, 201]).toContain(res.status)
    const addresses = res.body.addresses || res.body
    expect(Array.isArray(addresses)).toBe(true)
    expect(addresses.length).toBeGreaterThanOrEqual(2)
    const hasDefault = addresses.some((a) => a.isDefault === true)
    expect(hasDefault).toBe(true)
})

test('POST /api/auth/users/me/addresses adds an address (and persisted)', async () => {
    const setCookie = await createAndLoginUser('addpost@example.com')
    expect(setCookie).toBeDefined()

    const newAddress = {
        street: 'New St',
        city: 'New City',
        state: 'NS',
        country: 'US',
        phone: '+19929292922',
        zipCode: '10001',
        isDefault: false
    }

    const res = await request(app)
        .post('/api/auth/users/me/addresses')
        .set('Cookie', setCookie)
        .send(newAddress)

    expect([200, 201]).toContain(res.status)
    const addresses = res.body.addresses
    expect(addresses).toBeDefined()
    expect(addresses.length).toBeGreaterThan(0)

    const added = addresses[0]
    expect(added.street).toBe('New St')

    // verify persisted in DB
    const user = await User.findOne({ email: 'addpost@example.com' })
    expect(user.addresses.length).toBeGreaterThanOrEqual(1)
    const found = user.addresses.find(a => a.street === 'New St')
    expect(found).toBeDefined()
})

test('POST /api/auth/users/me/addresses rejects invalid zipCode', async () => {
    const setCookie = await createAndLoginUser('badpin@example.com')
    const bad = { street: 'S', city: 'C', state: 'S', zipCode: '000', country: 'us', zipCode: 'abc', phone: '+1234567890' }

    const res = await request(app)
        .post('/api/auth/users/me/addresses')
        .set('Cookie', setCookie)
        .send(bad)

    expect([400, 422]).toContain(res.status)
})

test('POST /api/auth/users/me/addresses rejects invalid phone', async () => {
    const setCookie = await createAndLoginUser('badphone@example.com')
    const bad = { street: 'S', city: 'C', state: 'S', zipCode: '000', country: 'US', zipCode: '12345', phone: 'notaphone' }

    const res = await request(app)
        .post('/api/auth/users/me/addresses')
        .set('Cookie', setCookie)
        .send(bad)

    expect([400, 422]).toContain(res.status)
})

test('DELETE /api/auth/users/me/addresses/:addressId removes the address', async () => {
    const password = 'password123'
    const hash = await bcrypt.hash(password, 10)

    const user = await User.create({
        username: 'deladdr',
        email: 'deladdr@example.com',
        password: hash,
        fullName: { firstName: 'Del', lastName: 'Addr' },
        role: 'user',
        addresses: [
            { street: 'Del One', city: 'C1', state: 'S1', zipCode: '11111', country: 'CT1', isDefault: true },
            { street: 'Del Two', city: 'C2', state: 'S2', zipCode: '22222', country: 'CT2', isDefault: false }
        ]
    })

    const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'deladdr@example.com', password })
    const setCookie = loginRes.headers['set-cookie']
    expect(setCookie).toBeDefined()

    const addressId = user.addresses[0]._id

    const res = await request(app)
        .delete(`/api/auth/users/me/addresses/${addressId}`)
        .set('Cookie', setCookie)

    expect([200, 204, 201]).toContain(res.status)

    const fresh = await User.findOne({ email: 'deladdr@example.com' })
    expect(fresh.addresses.find(a => String(a._id) === String(addressId))).toBeUndefined()
})
