process.env.JWT_SECRET = "test-secret";

const request = require("supertest");
const jwt = require("jsonwebtoken");

const mockSave = jest.fn();
const mockFindOne = jest.fn();
const mockGetProduct = jest.fn();

jest.mock("../../src/models/cart.model", () => {
  function CartModel(data) {
    this.user = data.user;
    this.items = data.items || [];
    this.totalItems = data.totalItems || 0;
    this.totalAmount = data.totalAmount || 0;
    this.save = mockSave.mockResolvedValue(this);
  }

  CartModel.findOne = mockFindOne;

  return CartModel;
});

jest.mock("../../src/service/product.service", () => ({
  getProduct: mockGetProduct,
}));

const app = require("../../src/app");

function authHeader(role = "user") {
  const token = jwt.sign({ _id: "507f1f77bcf86cd799439011", role }, process.env.JWT_SECRET);
  return `Bearer ${token}`;
}

describe("PATCH /api/cart/items/:productId", () => {
  const productId = "507f191e810c19729de860ea";

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetProduct.mockResolvedValue({
      _id: productId,
      amount: 30,
      stock: 10,
    });
  });

  it("returns 401 when the request has no access token", async () => {
    const response = await request(app)
      .patch(`/api/cart/items/${productId}`)
      .send({ quantity: 3 });

    expect(response.statusCode).toBe(401);
    expect(response.body).toEqual({ message: "Unauthorized" });
  });

  it("returns 400 when the route productId is invalid", async () => {
    const response = await request(app)
      .patch("/api/cart/items/not-an-object-id")
      .set("Authorization", authHeader())
      .send({ quantity: 3 });

    expect(response.statusCode).toBe(400);
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "productId",
          msg: expect.stringMatching(/invalid product id format/i),
        }),
      ])
    );
  });

  it("updates the quantity for an existing cart line", async () => {
    const cart = {
      user: "507f1f77bcf86cd799439011",
      items: [{ productId, quantity: 1, amount: 20 }],
      totalItems: 1,
      totalAmount: 20,
      save: mockSave.mockResolvedValue(true),
    };
    mockFindOne.mockResolvedValue(cart);

    const response = await request(app)
      .patch(`/api/cart/items/${productId}`)
      .set("Authorization", authHeader())
      .send({ quantity: 3 });

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      message: "Cart Updated",
      cart: expect.objectContaining({
        user: "507f1f77bcf86cd799439011",
        items: [{ productId, quantity: 3, amount: 30 }],
        totalItems: 3,
        totalAmount: 90,
      }),
    });
    expect(mockFindOne).toHaveBeenCalledWith({ user: "507f1f77bcf86cd799439011" });
    expect(mockGetProduct).toHaveBeenCalledWith(productId);
    expect(mockSave).toHaveBeenCalled();
  });

  it("removes the item when quantity is zero", async () => {
    const cart = {
      user: "507f1f77bcf86cd799439011",
      items: [{ productId, quantity: 2, amount: 20 }],
      totalItems: 2,
      totalAmount: 40,
      save: mockSave.mockResolvedValue(true),
    };
    mockFindOne.mockResolvedValue(cart);

    const response = await request(app)
      .patch(`/api/cart/items/${productId}`)
      .set("Authorization", authHeader())
      .send({ quantity: 0 });

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      message: "Cart Updated",
      cart: expect.objectContaining({
        items: [],
        totalItems: 0,
        totalAmount: 0,
      }),
    });
    expect(mockSave).toHaveBeenCalled();
  });

  it("returns 404 when the cart does not exist", async () => {
    mockFindOne.mockResolvedValue(null);

    const response = await request(app)
      .patch(`/api/cart/items/${productId}`)
      .set("Authorization", authHeader())
      .send({ quantity: 2 });

    expect(response.statusCode).toBe(404);
    expect(response.body).toEqual({
      message: "Cart not found",
    });
  });

  it("returns 404 when the cart line does not exist", async () => {
    mockFindOne.mockResolvedValue({
      user: "507f1f77bcf86cd799439011",
      items: [{ productId: "507f1f77bcf86cd799439012", quantity: 1, amount: 20 }],
      save: mockSave.mockResolvedValue(true),
    });

    const response = await request(app)
      .patch(`/api/cart/items/${productId}`)
      .set("Authorization", authHeader())
      .send({ quantity: 2 });

    expect(response.statusCode).toBe(404);
    expect(response.body).toEqual({
      message: "Product not found",
    });
  });

  it("returns 409 when the updated quantity exceeds availability", async () => {
    mockFindOne.mockResolvedValue({
      user: "507f1f77bcf86cd799439011",
      items: [{ productId, quantity: 1, amount: 20 }],
      save: mockSave.mockResolvedValue(true),
    });
    mockGetProduct.mockResolvedValueOnce({
      _id: productId,
      amount: 30,
      stock: 2,
    });

    const response = await request(app)
      .patch(`/api/cart/items/${productId}`)
      .set("Authorization", authHeader())
      .send({ quantity: 3 });

    expect(response.statusCode).toBe(409);
    expect(response.body).toEqual({
      message: "Requested quantity not available",
    });
  });
});
