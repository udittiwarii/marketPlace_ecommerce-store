jest.mock("../../src/models/order.model", () => ({
  findById: jest.fn(),
}));

const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../../src/app");
const orderModel = require("../../src/models/order.model");

describe("PATCH /api/order/:id/address (TDD)", () => {
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

  it("updates delivery address before payment capture", async () => {
    const token = createToken();
    const save = jest.fn().mockResolvedValue();

    orderModel.findById.mockResolvedValue({
      _id: "507f1f77bcf86cd799439111",
      user: "507f1f77bcf86cd799439011",
      status: "PENDING",
      paymentSummary: { status: "AUTHORIZED", captured: false },
      shippingAddress: {
        street: "Old Street",
        city: "Jaipur",
        state: "RJ",
        zipCode: "302001",
        country: "IN",
        phone: "9999999999",
      },
      save,
    });

    const newAddress = {
      address: {
        street: "New Street",
        city: "Bengaluru",
        state: "KA",
        zipCode: "470113",
        country: "IN",
        phone: "1234567890",
      }
    };


    const response = await request(app)
      .patch("/api/order/507f1f77bcf86cd799439111/address")
      .set("Authorization", `Bearer ${token}`)
      .send({ shippingAddress: newAddress })
      .expect(200);

    expect(response.body).toMatchObject({
      message: "Delivery address updated",
      shippingAddress: newAddress,
    });
    expect(save).toHaveBeenCalled();
  });

  it("rejects address update after payment capture", async () => {
    const token = createToken();

    orderModel.findById.mockResolvedValue({
      _id: "507f1f77bcf86cd799439111",
      user: "507f1f77bcf86cd799439011",
      paymentSummary: { status: "CAPTURED", captured: true },
    });

    await request(app)
      .patch("/api/order/507f1f77bcf86cd799439111/address")
      .set("Authorization", `Bearer ${token}`)
      .send({
        shippingAddress: {
          street: "New Street",
          city: "Bengaluru",
          state: "KA",
          zipCode: "560001",
          country: "IN",
          phone: "8888888888",
        },
      })
      .expect(409);
  });

  it("returns 400 when shipping address payload is missing", async () => {
    const token = createToken();

    await request(app)
      .patch("/api/order/507f1f77bcf86cd799439111/address")
      .set("Authorization", `Bearer ${token}`)
      .send({})
      .expect(400);
  });

  it("accepts indian phone numbers with +91 country code", async () => {
    const token = createToken();
    const save = jest.fn().mockResolvedValue();

    orderModel.findById.mockResolvedValue({
      _id: "507f1f77bcf86cd799439111",
      user: "507f1f77bcf86cd799439011",
      status: "PENDING",
      paymentSummary: { status: "AUTHORIZED", captured: false },
      shippingAddress: {
        street: "Old Street",
        city: "Jaipur",
        state: "RJ",
        zipCode: "302001",
        country: "IN",
        phone: "9999999999",
      },
      save,
    });

    await request(app)
      .patch("/api/order/507f1f77bcf86cd799439111/address")
      .set("Authorization", `Bearer ${token}`)
      .send({
        shippingAddress: {
          street: "New Street",
          city: "Bengaluru",
          state: "KA",
          zipCode: "560001",
          country: "IN",
          phone: "+919876543210",
        },
      })
      .expect(200);
  });

  it("accepts indian phone numbers without country code", async () => {
    const token = createToken();
    const save = jest.fn().mockResolvedValue();

    orderModel.findById.mockResolvedValue({
      _id: "507f1f77bcf86cd799439111",
      user: "507f1f77bcf86cd799439011",
      status: "PENDING",
      paymentSummary: { status: "AUTHORIZED", captured: false },
      shippingAddress: {
        street: "Old Street",
        city: "Jaipur",
        state: "RJ",
        zipCode: "302001",
        country: "IN",
        phone: "9999999999",
      },
      save,
    });

    await request(app)
      .patch("/api/order/507f1f77bcf86cd799439111/address")
      .set("Authorization", `Bearer ${token}`)
      .send({
        shippingAddress: {
          street: "New Street",
          city: "Bengaluru",
          state: "KA",
          zipCode: "560001",
          country: "IN",
          phone: "9876543210",
        },
      })
      .expect(200);
  });
});
