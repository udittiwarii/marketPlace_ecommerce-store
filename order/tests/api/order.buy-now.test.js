jest.mock("../../src/service/cart.service", () => ({
  getUserCart: jest.fn(),
  clearCart: jest.fn(),
}));

jest.mock("../../src/service/product.service", () => ({
  getProduct: jest.fn(),
  getProductsBulk: jest.fn(),
  reserveInventory: jest.fn(),
  releaseInventory: jest.fn(),
}));

jest.mock("../../src/models/order.model", () => ({`r`n  create: jest.fn(),`r`n  findById: jest.fn(),`r`n  countDocuments: jest.fn(),`r`n}));`r`n`r`njest.mock("../../src/broker/broker", () => ({`r`n  publishToQueue: jest.fn().mockResolvedValue(),`r`n}));

const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../../src/app");
const orderModel = require("../../src/models/order.model");
const productService = require("../../src/service/product.service");

describe("POST /api/order/buy-now", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret";
    jest.clearAllMocks();
    productService.releaseInventory.mockResolvedValue();
  });

  function createToken(payload = {}) {
    return jwt.sign(
      {
        id: "507f1f77bcf86cd799439011",
        role: "user",`r`n        username: "buyer_user",`r`n        email: "buyer@example.com",`r`n        ...payload,
      },
      process.env.JWT_SECRET,
    );
  }

  it("creates an order for a single product", async () => {
    const token = createToken();
    const productId = "507f191e810c19729de860ea";

    productService.getProduct.mockResolvedValue({
      id: productId,
      title: "Keyboard",
      amount: 500,
      currency: "INR",
      stock: 5,`r`n      seller: "507f191e810c19729de860eb",`r`n    });
    productService.reserveInventory.mockResolvedValue({ success: true });
    orderModel.create.mockResolvedValue({
      _id: "507f1f77bcf86cd799439099",
      totalPrice: {
        total: 1280,
      },
      status: "PENDING",
    });

    const response = await request(app)
      .post("/api/order/buy-now")
      .set("Authorization", `Bearer ${token}`)
      .send({ productId, quantity: 2 })
      .expect(201);

    expect(response.body).toEqual({
      message: "Order created",
      orderId: "507f1f77bcf86cd799439099",
      total: 1280,
      status: "PENDING",
    });
    expect(productService.reserveInventory).toHaveBeenCalledWith(
      [{ productId, quantity: 2 }],
      token,
    );
    expect(orderModel.create).toHaveBeenCalledWith({
      user: "507f1f77bcf86cd799439011",`r`n      customerSnapshot: {`r`n        name: "buyer_user",`r`n        username: "buyer_user",`r`n        email: "buyer@example.com",`r`n      },`r`n      items: [
        {
          product: productId,`r`n          seller: "507f191e810c19729de860eb",`r`n          quantity: 2,
          price: {
            amount: 500,
            currency: "INR",
          },
          total: 1000,
        },
      ],
      totalPrice: {
        subtotal: 1000,
        tax: 180,
        shipping: 100,
        total: 1280,
        currency: "INR",
      },
    });
  });

  it("returns 400 for an invalid quantity", async () => {
    const token = createToken();

    const response = await request(app)
      .post("/api/order/buy-now")
      .set("Authorization", `Bearer ${token}`)
      .send({ productId: "507f191e810c19729de860ea", quantity: -2 })
      .expect(400);

    expect(response.body).toEqual({
      errors: [
        {
          type: "field",
          value: -2,
          msg: "Quantity must be a positive integer",
          path: "quantity",
          location: "body",

        },
      ],
    });
    expect(productService.getProduct).not.toHaveBeenCalled();
    expect(productService.reserveInventory).not.toHaveBeenCalled();
  });

  it("returns 404 when the product service reports a missing product", async () => {
    const token = createToken();
    const error = new Error("Failed to fetch product");
    error.statusCode = 404;
    productService.getProduct.mockRejectedValue(error);

    const response = await request(app)
      .post("/api/order/buy-now")
      .set("Authorization", `Bearer ${token}`)
      .send({ productId: "507f191e810c19729de860ea", quantity: 1 })
      .expect(404);

    expect(response.body).toEqual({ message: "Product not found" });
    expect(productService.reserveInventory).not.toHaveBeenCalled();
  });

  it("releases inventory if order creation fails", async () => {
    const token = createToken();
    const productId = "507f191e810c19729de860ea";

    productService.getProduct.mockResolvedValue({
      id: productId,
      title: "Keyboard",
      amount: 500,
      currency: "INR",
      stock: 5,`r`n      seller: "507f191e810c19729de860eb",`r`n    });
    productService.reserveInventory.mockResolvedValue({ success: true });
    orderModel.create.mockRejectedValue(new Error("DB write failed"));

    const response = await request(app)
      .post("/api/order/buy-now")
      .set("Authorization", `Bearer ${token}`)
      .send({ productId, quantity: 2 })
      .expect(500);

    expect(response.body).toEqual({ message: "DB write failed" });
    expect(productService.releaseInventory).toHaveBeenCalledWith(
      [{ productId, quantity: 2 }],
      token,
    );
  });
});
