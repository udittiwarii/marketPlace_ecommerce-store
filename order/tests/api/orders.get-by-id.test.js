jest.mock("../../src/models/order.model", () => ({
  findById: jest.fn(),
}));

const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../../src/app");
const orderModel = require("../../src/models/order.model");

describe("GET /api/order/:id (TDD)", () => {
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

  it("returns order by id with timeline and payment summary", async () => {
    const token = createToken();
    const orderId = "507f1f77bcf86cd799439111";

    orderModel.findById.mockResolvedValue({
      _id: orderId,
      user: "507f1f77bcf86cd799439011",
      status: "PENDING",
      statusHistory: [{ status: "PENDING", updatedAt: "2026-04-07T10:00:00.000Z" }],
      totalPrice: {
        subtotal: 1000,
        tax: 180,
        shipping: 100,
        total: 1280,
        currency: "INR",
      },
      paymentSummary: {
        status: "PENDING",
        provider: "RAZORPAY",
        amount: 1280,
        currency: "INR",
      },
    });

    const response = await request(app)
      .get(`/api/order/${orderId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body).toMatchObject({
      orderId,
      status: "PENDING",
      timeline: expect.any(Array),
      totalPrice: {
        subtotal: 1000,
        tax: 180,
        shipping: 100,
        total: 1280,
        currency: "INR",
      },
      paymentSummary: {
        status: "PENDING",
        provider: "RAZORPAY",
        amount: 1280,
        currency: "INR",
      },
    });
  });

  it("returns 404 when the order does not exist", async () => {
    const token = createToken();

    orderModel.findById.mockResolvedValue(null);

    await request(app)
      .get("/api/order/507f1f77bcf86cd799439999")
      .set("Authorization", `Bearer ${token}`)
      .expect(404);
  });

  it("returns 403 when a user tries to access someone else's order", async () => {
    const token = createToken();

    orderModel.findById.mockResolvedValue({
      _id: "507f1f77bcf86cd799439111",
      user: "507f1f77bcf86cd799439022",
    });

    await request(app)
      .get("/api/order/507f1f77bcf86cd799439111")
      .set("Authorization", `Bearer ${token}`)
      .expect(403);
  });
});
