process.env.JWT_SECRET = "test-secret";

const request = require("supertest");
const jwt = require("jsonwebtoken");

const mockSave = jest.fn();
const mockFindOne = jest.fn();
const mockGetProductsBulk = jest.fn();

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
  getProduct: jest.fn(),
  getProductsBulk: mockGetProductsBulk,
}));

const app = require("../../src/app");

function authHeader(role = "user") {
  const token = jwt.sign({ _id: "507f1f77bcf86cd799439011", role }, process.env.JWT_SECRET);
  return `Bearer ${token}`;
}

describe("GET /api/cart", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindOne.mockResolvedValue(null);
    mockGetProductsBulk.mockResolvedValue([]);
  });

  it("returns 401 when the request has no access token", async () => {
    const response = await request(app).get("/api/cart");

    expect(response.statusCode).toBe(401);
    expect(response.body).toEqual({ message: "Unauthorized" });
  });

  it("returns an empty cart when the user has no cart", async () => {
    const response = await request(app)
      .get("/api/cart")
      .set("Authorization", authHeader());

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      message: "cart get successfully",
      cart: {
        items: [],
        totalAmount: 0,
        totalItems: 0,
      },
    });
    expect(mockFindOne).toHaveBeenCalledWith({ user: "507f1f77bcf86cd799439011" });
    expect(mockGetProductsBulk).not.toHaveBeenCalled();
  });

  it("returns the cart with refreshed item amounts and recalculated totals", async () => {
    const cart = {
      user: "507f1f77bcf86cd799439011",
      items: [{ productId: "507f191e810c19729de860ea", quantity: 2, amount: 20 }],
      totalItems: 99,
      totalAmount: 999,
      save: mockSave.mockResolvedValue(true),
    };
    mockFindOne.mockResolvedValue(cart);
    mockGetProductsBulk.mockResolvedValue([
      { _id: "507f191e810c19729de860ea", amount: 25 },
    ]);

    const response = await request(app)
      .get("/api/cart")
      .set("Authorization", authHeader());

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      message: "cart get successfully",
      cart: expect.objectContaining({
        user: "507f1f77bcf86cd799439011",
        items: [{ productId: "507f191e810c19729de860ea", quantity: 2, amount: 25 }],
        totalItems: 2,
        totalAmount: 50,
      }),
    });
    expect(mockGetProductsBulk).toHaveBeenCalledWith(["507f191e810c19729de860ea"]);
    expect(mockSave).toHaveBeenCalled();
  });

  it("returns an existing empty cart without calling bulk product lookup", async () => {
    const cart = {
      user: "507f1f77bcf86cd799439011",
      items: [],
      totalItems: 0,
      totalAmount: 0,
      save: mockSave.mockResolvedValue(true),
    };
    mockFindOne.mockResolvedValue(cart);

    const response = await request(app)
      .get("/api/cart")
      .set("Authorization", authHeader());

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      message: "cart get successfully",
      cart: expect.objectContaining({
        user: "507f1f77bcf86cd799439011",
        items: [],
        totalItems: 0,
        totalAmount: 0,
      }),
    });
    expect(mockGetProductsBulk).not.toHaveBeenCalled();
    expect(mockSave).not.toHaveBeenCalled();
  });

  it("returns 500 when the bulk product lookup fails", async () => {
    mockFindOne.mockResolvedValue({
      user: "507f1f77bcf86cd799439011",
      items: [{ productId: "507f191e810c19729de860ea", quantity: 2, amount: 20 }],
      totalItems: 2,
      totalAmount: 40,
      save: mockSave.mockResolvedValue(true),
    });
    mockGetProductsBulk.mockRejectedValueOnce(new Error("service unavailable"));

    const response = await request(app)
      .get("/api/cart")
      .set("Authorization", authHeader());

    expect(response.statusCode).toBe(500);
    expect(response.body).toEqual({ message: "Internal server error" });
  });
});
