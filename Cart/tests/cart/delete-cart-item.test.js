process.env.JWT_SECRET = "test-secret";

const request = require("supertest");
const jwt = require("jsonwebtoken");

const mockSave = jest.fn();
const mockFindOne = jest.fn();
const mockFindOneAndUpdate = jest.fn();

jest.mock("../../src/models/cart.model", () => {
  function CartModel(data) {
    this.user = data.user;
    this.items = data.items || [];
    this.totalItems = data.totalItems || 0;
    this.totalAmount = data.totalAmount || 0;
    this.save = mockSave.mockResolvedValue(this);
  }

  CartModel.findOne = mockFindOne;
  CartModel.findOneAndUpdate = mockFindOneAndUpdate;

  return CartModel;
});

jest.mock("../../src/service/product.service", () => ({
  getProduct: jest.fn(),
  getProductsBulk: jest.fn(),
}));

const app = require("../../src/app");

function authHeader(role = "user") {
  const token = jwt.sign({ _id: "507f1f77bcf86cd799439011", role }, process.env.JWT_SECRET);
  return `Bearer ${token}`;
}

describe("DELETE /api/cart/items/:productId", () => {
  const productId = "507f191e810c19729de860ea";

  beforeEach(() => {
    jest.clearAllMocks();
    mockFindOne.mockResolvedValue(null);
  });

  it("returns 401 when the request has no access token", async () => {
    const response = await request(app).delete(`/api/cart/items/${productId}`);

    expect(response.statusCode).toBe(401);
    expect(response.body).toEqual({ message: "Unauthorized" });
  });

  it("returns 400 when the route productId is invalid", async () => {
    const response = await request(app)
      .delete("/api/cart/items/not-an-object-id")
      .set("Authorization", authHeader());

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

  it("returns 404 when the cart does not exist", async () => {
    const response = await request(app)
      .delete(`/api/cart/items/${productId}`)
      .set("Authorization", authHeader());

    expect(response.statusCode).toBe(404);
    expect(response.body).toEqual({ message: "Cart not found" });
  });

  it("returns 404 when the cart item does not exist", async () => {
    mockFindOne.mockResolvedValue({
      user: "507f1f77bcf86cd799439011",
      items: [{ productId: "507f1f77bcf86cd799439012", quantity: 1, amount: 20 }],
      totalItems: 1,
      totalAmount: 20,
      save: mockSave.mockResolvedValue(true),
    });

    const response = await request(app)
      .delete(`/api/cart/items/${productId}`)
      .set("Authorization", authHeader());

    expect(response.statusCode).toBe(404);
    expect(response.body).toEqual({ message: "Product not found" });
  });

  it("removes a line item from the cart and recalculates totals", async () => {
    const cart = {
      user: "507f1f77bcf86cd799439011",
      items: [
        { productId, quantity: 2, amount: 25 },
        { productId: "507f1f77bcf86cd799439012", quantity: 1, amount: 10 },
      ],
      totalItems: 3,
      totalAmount: 60,
      save: mockSave.mockResolvedValue(true),
    };
    mockFindOne.mockResolvedValue(cart);

    const response = await request(app)
      .delete(`/api/cart/items/${productId}`)
      .set("Authorization", authHeader());

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      message: "Item removed from cart",
      cart: expect.objectContaining({
        user: "507f1f77bcf86cd799439011",
        items: [{ productId: "507f1f77bcf86cd799439012", quantity: 1, amount: 10 }],
        totalItems: 1,
        totalAmount: 10,
      }),
    });
    expect(mockFindOne).toHaveBeenCalledWith({ user: "507f1f77bcf86cd799439011" });
    expect(mockSave).toHaveBeenCalled();
  });
});
