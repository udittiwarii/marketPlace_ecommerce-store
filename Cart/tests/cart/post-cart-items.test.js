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

describe("POST /api/cart/items", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindOne.mockResolvedValue(null);
    mockGetProduct.mockResolvedValue({
      _id: "507f191e810c19729de860ea",
      amount: 25,
      stock: 10,
    });
  });

  it("returns 401 when the request has no access token", async () => {
    const response = await request(app).post("/api/cart/items").send({
      productId: "507f191e810c19729de860ea",
      quantity: 2,
    });

    expect(response.statusCode).toBe(401);
    expect(response.body).toEqual({ message: "Unauthorized" });
  });

  it("returns 400 when productId is missing", async () => {
    const response = await request(app)
      .post("/api/cart/items")
      .set("Authorization", authHeader())
      .send({
        quantity: 2,
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "productId",
          msg: expect.stringMatching(/required/i),
        }),
      ])
    );
  });

  it("returns 400 when quantity is zero or negative", async () => {
    const response = await request(app)
      .post("/api/cart/items")
      .set("Authorization", authHeader())
      .send({
        productId: "507f191e810c19729de860ea",
        quantity: 0,
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "quantity",
          msg: expect.stringMatching(/positive integer/i),
        }),
      ])
    );
  });

  it("returns 404 when the product does not exist", async () => {
    mockGetProduct.mockRejectedValueOnce(new Error("not found"));

    const response = await request(app)
      .post("/api/cart/items")
      .set("Authorization", authHeader())
      .send({
        productId: "507f191e810c19729de860ea",
        quantity: 1,
      });

    expect(response.statusCode).toBe(404);
    expect(response.body).toEqual({
      message: "Product not found",
    });
  });

  it("returns 409 when requested quantity is unavailable", async () => {
    mockGetProduct.mockResolvedValueOnce({
      _id: "507f191e810c19729de860ea",
      stock: 1,
    });

    const response = await request(app)
      .post("/api/cart/items")
      .set("Authorization", authHeader())
      .send({
        productId: "507f191e810c19729de860ea",
        quantity: 2,
      });

    expect(response.statusCode).toBe(409);
    expect(response.body).toEqual({
      message: "Requested quantity not available",
    });
  });

  it("adds an item to the cart when the request is valid", async () => {
    const response = await request(app)
      .post("/api/cart/items")
      .set("Authorization", authHeader())
      .send({
        productId: "507f191e810c19729de860ea",
        quantity: 2,
      });

    expect(response.statusCode).toBe(201);
    expect(response.body).toEqual({
      message: "Item added to cart",
      cart: expect.objectContaining({
        user: "507f1f77bcf86cd799439011",
        items: [
          {
            productId: "507f191e810c19729de860ea",
            quantity: 2,
            amount: 25,
          },
        ],
        totalItems: 2,
        totalAmount: 50,
      }),
    });
    expect(mockFindOne).toHaveBeenCalledWith({ user: "507f1f77bcf86cd799439011" });
    expect(mockSave).toHaveBeenCalled();
  });
});
