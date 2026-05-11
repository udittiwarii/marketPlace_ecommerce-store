jest.mock("../../src/models/order.model", () => ({
  findById: jest.fn(),
}));
jest.mock("../../src/service/product.service", () => ({
  releaseInventory: jest.fn(),
}));


const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../../src/app");
const orderModel = require("../../src/models/order.model");

describe("POST /api/order/:id/cancel (TDD)", () => {
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

  const productService = require("../../src/service/product.service");

  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret";
    jest.clearAllMocks();
    productService.releaseInventory.mockResolvedValue({ success: true });
  });


  it("allows buyer to cancel when status is pending and payment is not captured", async () => {
    const token = createToken();
    const save = jest.fn().mockResolvedValue();

    orderModel.findById.mockResolvedValue({
      _id: "507f1f77bcf86cd799439111",
      user: "507f1f77bcf86cd799439011",
      status: "PENDING",
      items: [
        {
          product: "507f191e810c19729de860ea",
          quantity: 2
        }
      ],
      paymentSummary: { status: "AUTHORIZED", captured: false },
      statusHistory: [],
      save,
    });

    const response = await request(app)
      .post("/api/order/507f1f77bcf86cd799439111/cancel")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body).toMatchObject({
      message: "Order cancelled",
      status: "CANCELLED",
    });
    expect(save).toHaveBeenCalled();
  });

  it("rejects cancellation after payment capture", async () => {
    const token = createToken();

    orderModel.findById.mockResolvedValue({
      _id: "507f1f77bcf86cd799439111",
      user: "507f1f77bcf86cd799439011",
      status: "PENDING",
      paymentSummary: { status: "CAPTURED", captured: true },
    });

    await request(app)
      .post("/api/order/507f1f77bcf86cd799439111/cancel")
      .set("Authorization", `Bearer ${token}`)
      .expect(409);
  });

  it("rejects cancellation for non-cancellable order status", async () => {
    const token = createToken();

    orderModel.findById.mockResolvedValue({
      _id: "507f1f77bcf86cd799439111",
      user: "507f1f77bcf86cd799439011",
      status: "SHIPPED",
      paymentSummary: { status: "PENDING", captured: false },
    });

    await request(app)
      .post("/api/order/507f1f77bcf86cd799439111/cancel")
      .set("Authorization", `Bearer ${token}`)
      .expect(409);
  });
});
