const request = require("supertest");

jest.mock("../src/models/product.model", () => jest.fn());
jest.mock("../src/services/imagekit", () => ({
  uploadImage: jest.fn(),
}));

const Product = require("../src/models/product.model");
const app = require("../src/app");

describe("GET /api/products/bulk", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns normalized products for valid ids", async () => {
    const productId = "507f1f77bcf86cd799439031";
    Product.find = jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue([
        {
          _id: productId,
          title: "Laptop",
          description: "Thin and light",
          brand: "BrandX",
          price: { amount: 1299, currency: "USD" },
          category: "electronics",
          stock: 12,
          seller: "507f1f77bcf86cd799439011",
          images: [],
        },
      ]),
    });

    const response = await request(app)
      .get("/api/products/bulk")
      .send({ ids: [productId] });

    expect(response.status).toBe(200);
    expect(Product.find).toHaveBeenCalledWith({
      _id: { $in: [productId] },
    });
    expect(response.body).toEqual({
      products: [
        {
          id: productId,
          title: "Laptop",
          description: "Thin and light",
          brand: "BrandX",
          amount: 1299,
          currency: "USD",
          category: "electronics",
          stock: 12,
          seller: "507f1f77bcf86cd799439011",
          images: [],
        },
      ],
    });
  });

  test("returns 400 when ids are missing", async () => {
    const response = await request(app)
      .get("/api/products/bulk")
      .send({});

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: "Product IDs required" });
    expect(Product.find).not.toHaveBeenCalled();
  });

  test("returns 400 when any id is invalid", async () => {
    const response = await request(app)
      .get("/api/products/bulk")
      .send({ ids: ["not-an-object-id"] });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: "Invalid product ID format" });
    expect(Product.find).not.toHaveBeenCalled();
  });
});
