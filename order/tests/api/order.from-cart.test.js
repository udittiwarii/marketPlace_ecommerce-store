jest.mock("../../src/service/cart.service", () => ({
  getUserCart: jest.fn(),
  clearCart: jest.fn(),
}));

jest.mock("../../src/service/product.service", () => ({
  getProductsBulk: jest.fn(),
  reserveInventory: jest.fn(),
  releaseInventory: jest.fn(),
}));

jest.mock("../../src/models/order.model", () => ({`r`n  create: jest.fn(),`r`n  findById: jest.fn(),`r`n  countDocuments: jest.fn(),`r`n}));`r`n`r`njest.mock("../../src/broker/broker", () => ({`r`n  publishToQueue: jest.fn().mockResolvedValue(),`r`n}));

const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../../src/app");
const orderModel = require("../../src/models/order.model");
const cartService = require("../../src/service/cart.service");
const productService = require("../../src/service/product.service");

describe("POST /api/order/from-cart", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret";
    jest.clearAllMocks();
    cartService.clearCart.mockResolvedValue();
    productService.releaseInventory.mockResolvedValue();
    orderModel.countDocuments.mockResolvedValue(0);
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

  it("creates an order from the authenticated user's cart", async () => {
    const token = createToken();
    const productId = "507f191e810c19729de860ea";
    const savedOrder = {
      _id: "507f1f77bcf86cd799439099",
      user: "507f1f77bcf86cd799439011",
      items: [
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
      status: "PENDING",
    };

    cartService.getUserCart.mockResolvedValue({
      items: [{ productId, quantity: 2 }],
    });
    productService.getProductsBulk.mockResolvedValue([
      {
        id: productId,
        title: "Keyboard",
        amount: 500,
        currency: "INR",
        stock: 5,`r`n        seller: "507f191e810c19729de860eb",`r`n      },
    ]);
    productService.reserveInventory.mockResolvedValue({ success: true });
    orderModel.create.mockResolvedValue(savedOrder);
    orderModel.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue(savedOrder),
    });

    const response = await request(app)
      .post("/api/order/from-cart")
      .set("Authorization", `Bearer ${token}`)
      .expect(201);

    expect(response.body.message).toBe("Order created");
    expect(response.body.status).toBe("PENDING");
    expect(response.body.total).toBe(1280);

    expect(productService.reserveInventory).toHaveBeenCalledWith(
      [{ productId, quantity: 2 }],
      token,
    );
    expect(cartService.clearCart).toHaveBeenCalledWith(token);

    const persistedOrder = await orderModel.findById(response.body.orderId).lean();
    expect(persistedOrder).toBeTruthy();
    expect(String(persistedOrder.user)).toBe("507f1f77bcf86cd799439011");
    expect(persistedOrder.items).toHaveLength(1);
    expect(persistedOrder.items[0].total).toBe(1000);
    expect(persistedOrder.totalPrice).toMatchObject({
      subtotal: 1000,
      tax: 180,
      shipping: 100,
      total: 1280,
      currency: "INR",
    });
  });

  it("returns 400 when the cart is empty", async () => {
    const token = createToken();

    cartService.getUserCart.mockResolvedValue({ items: [] });

    const response = await request(app)
      .post("/api/order/from-cart")
      .set("Authorization", `Bearer ${token}`)
      .expect(400);

    expect(response.body).toEqual({ message: "Cart is empty" });
    expect(productService.getProductsBulk).not.toHaveBeenCalled();
    expect(productService.reserveInventory).not.toHaveBeenCalled();
  });

  it("returns 400 when the cart has mixed currencies", async () => {
    const token = createToken();

    cartService.getUserCart.mockResolvedValue({
      items: [
        { productId: "507f191e810c19729de860ea", quantity: 1 },
        { productId: "507f191e810c19729de860eb", quantity: 1 },
      ],
    });
    productService.getProductsBulk.mockResolvedValue([
      {
        id: "507f191e810c19729de860ea",
        title: "Phone",
        amount: 100,
        currency: "INR",
        stock: 4,
      },
      {
        id: "507f191e810c19729de860eb",
        title: "Laptop",
        amount: 200,
        currency: "USD",
        stock: 4,
      },
    ]);

    const response = await request(app)
      .post("/api/order/from-cart")
      .set("Authorization", `Bearer ${token}`)
      .expect(400);

    expect(response.body).toEqual({ message: "Cart contains mixed currencies" });
    expect(productService.reserveInventory).not.toHaveBeenCalled();
    expect(orderModel.create).not.toHaveBeenCalled();
  });

  it("returns 401 when no access token is provided", async () => {
    const response = await request(app)
      .post("/api/order/from-cart")
      .expect(401);

    expect(response.body).toEqual({ message: "Unauthorized" });
    expect(cartService.getUserCart).not.toHaveBeenCalled();
  });
});
