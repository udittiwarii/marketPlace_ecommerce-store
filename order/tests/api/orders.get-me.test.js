jest.mock("../../src/models/order.model", () => ({
  find: jest.fn(),
  countDocuments: jest.fn(),
}));

const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../../src/app");
const orderModel = require("../../src/models/order.model");

describe("GET /api/order/me ", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret";
    jest.clearAllMocks();
  });

  function createToken(payload = {}) {
    return jwt.sign(
      {
        id: "507f1f77bcf86cd799439011",
        role: "user",
        ...payload,
      },
      process.env.JWT_SECRET,
    );
  }

  it("returns paginated list of authenticated user's orders", async () => {
    const token = createToken();

    const sort = jest.fn().mockReturnThis();
    const skip = jest.fn().mockReturnThis();
    const limit = jest.fn().mockResolvedValue([
      {
        _id: "507f1f77bcf86cd799439111",
        status: "PENDING",
        totalPrice: { total: 1280, currency: "INR" },
        createdAt: "2026-04-07T10:00:00.000Z",
      },
    ]);

    orderModel.find.mockReturnValue({ sort, skip, limit });
    orderModel.countDocuments.mockResolvedValue(1);

    const response = await request(app)
      .get("/api/order/me?page=1&limit=10")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body).toMatchObject({
      page: 1,
      limit: 10,
      total: 1,
      orders: expect.any(Array),
    });
    expect(response.body.orders).toHaveLength(1);
  });

  it("returns empty data when user has no orders", async () => {
    const token = createToken();

    const sort = jest.fn().mockReturnThis();
    const skip = jest.fn().mockReturnThis();
    const limit = jest.fn().mockResolvedValue([]);

    orderModel.find.mockReturnValue({ sort, skip, limit });
    orderModel.countDocuments.mockResolvedValue(0);

    const response = await request(app)
      .get("/api/order/me?page=1&limit=10")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body).toMatchObject({
      page: 1,
      limit: 10,
      total: 0,
      orders: [],
    });
  });
});
