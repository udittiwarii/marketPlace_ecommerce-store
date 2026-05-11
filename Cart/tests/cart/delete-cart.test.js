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

describe("DELETE /api/cart", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindOneAndUpdate.mockResolvedValue(null);
  });

  it("returns 401 when the request has no access token", async () => {
    const response = await request(app).delete("/api/cart");

    expect(response.statusCode).toBe(401);
    expect(response.body).toEqual({ message: "Unauthorized" });
  });

  it("returns 404 when the cart does not exist", async () => {
    const response = await request(app)
      .delete("/api/cart")
      .set("Authorization", authHeader());

    expect(response.statusCode).toBe(404);
    expect(response.body).toEqual({ message: "Cart not found" });
  });

  it("clears the cart and returns the updated empty cart", async () => {
    mockFindOneAndUpdate.mockResolvedValue({
      user: "507f1f77bcf86cd799439011",
      items: [],
      totalItems: 0,
      totalAmount: 0,
    });

    const response = await request(app)
      .delete("/api/cart")
      .set("Authorization", authHeader());

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      message: "Cart cleared",
      cart: {
        user: "507f1f77bcf86cd799439011",
        items: [],
        totalItems: 0,
        totalAmount: 0,
      },
    });
    expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
      { user: "507f1f77bcf86cd799439011" },
      { items: [], totalItems: 0, totalAmount: 0 },
      { returnDocument: "after" }
    );
  });
});
