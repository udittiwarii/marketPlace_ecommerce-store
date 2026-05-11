const request = require("supertest");
const jwt = require("jsonwebtoken");

jest.mock("../src/models/product.model", () => jest.fn());
jest.mock("../src/services/imagekit", () => ({
  uploadImage: jest.fn(),
}));

const Product = require("../src/models/product.model");
const app = require("../src/app");

describe("GET /api/products/seller (seller products)", () => {
  const jwtSecret = "test-secret";
  const sellerId = "507f1f77bcf86cd799439011";

  beforeEach(() => {
    process.env.JWT_SECRET = jwtSecret;
    jest.clearAllMocks();
  });

  function authToken(role = "seller", id = sellerId) {
    return jwt.sign({ id, role }, jwtSecret);
  }

  test("returns 401 when token is missing", async () => {
    const response = await request(app).get("/api/products/seller");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: "Unauthorized" });
  });

  test("returns 401 when token is invalid", async () => {
    const response = await request(app)
      .get("/api/products/seller")
      .set("Authorization", "Bearer invalid-token");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: "Invalid token" });
  });

  test("returns 403 when role is not seller", async () => {
    const response = await request(app)
      .get("/api/products/seller")
      .set("Authorization", `Bearer ${authToken("user")}`);

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ message: "Insufficient permissions" });
  });

  test("returns 200 with seller products", async () => {
    const dbProducts = [
      {
        _id: "507f1f77bcf86cd799439021",
        title: "Seller Laptop",
        description: "Thin and light",
        brand: "BrandX",
        price: { amount: 1200, currency: "USD" },
        category: "electronics",
        stock: 5,
        seller: sellerId,
        images: [{ url: "https://img.example/1", thumbnailUrl: "https://img.example/t/1", fileId: "img_1" }],
      },
    ];

    const limit = jest.fn().mockResolvedValue(dbProducts);
    const skip = jest.fn().mockReturnValue({ limit });
    const sort = jest.fn().mockReturnValue({ skip });
    Product.find = jest.fn().mockReturnValue({ sort });
    Product.countDocuments = jest.fn().mockResolvedValue(1);

    const response = await request(app)
      .get("/api/products/seller")
      .set("Authorization", `Bearer ${authToken("seller", sellerId)}`);

    expect(response.status).toBe(200);
    expect(Product.find).toHaveBeenCalledWith({ seller: sellerId });
    expect(sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(skip).toHaveBeenCalledWith(0);
    expect(limit).toHaveBeenCalledWith(20);
    expect(response.body).toEqual({
      skip: 0,
      limit: 20,
      products: [
        {
          id: "507f1f77bcf86cd799439021",
          title: "Seller Laptop",
          description: "Thin and light",
          brand: "BrandX",
          amount: 1200,
          currency: "USD",
          category: "electronics",
          stock: 5,
          seller: sellerId,
          images: [{ url: "https://img.example/1", thumbnailUrl: "https://img.example/t/1", fileId: "img_1" }],
        },
      ],
      totalProducts: 1,
      totalPages: 1,
    });
  });

  test("returns 200 with empty list when seller has no products", async () => {
    const limit = jest.fn().mockResolvedValue([]);
    const skip = jest.fn().mockReturnValue({ limit });
    const sort = jest.fn().mockReturnValue({ skip });
    Product.find = jest.fn().mockReturnValue({ sort });
    Product.countDocuments = jest.fn().mockResolvedValue(0);

    const response = await request(app)
      .get("/api/products/seller")
      .set("Authorization", `Bearer ${authToken("seller", sellerId)}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      message: "No products found",
      data: [],
      skip: 0,
      limit: 20,
      totalProducts: 0,
      totalPages: 0,
    });
  });

  test("returns 500 when fetching seller products fails", async () => {
    const limit = jest.fn().mockRejectedValue(new Error("db failed"));
    const skip = jest.fn().mockReturnValue({ limit });
    const sort = jest.fn().mockReturnValue({ skip });
    Product.find = jest.fn().mockReturnValue({ sort });
    Product.countDocuments = jest.fn();

    const response = await request(app)
      .get("/api/products/seller")
      .set("Authorization", `Bearer ${authToken("seller", sellerId)}`);

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ message: "Internal server error" });
  });
});
