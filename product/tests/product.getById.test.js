const request = require("supertest");

jest.mock("../src/models/product.model", () => jest.fn());
jest.mock("../src/services/imagekit", () => ({
  uploadImage: jest.fn(),
}));

const Product = require("../src/models/product.model");
const app = require("../src/app");

describe("GET /api/products/:id", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns 200 with product for a valid existing id", async () => {
    const productId = "507f1f77bcf86cd799439031";
    const mockProduct = {
      _id: productId,
      title: "Laptop",
      description: "Thin and light",
      brand: "BrandX",
      price: { amount: 1299, currency: "USD" },
      category: "electronics",
      stock: 12,
      seller: "507f1f77bcf86cd799439011",
      images: [{ url: "https://img.example/1", thumbnailUrl: "https://img.example/t/1", fileId: "img_1" }],
    };
    Product.findById = jest.fn().mockResolvedValue(mockProduct);

    const response = await request(app).get(`/api/products/${productId}`);

    expect(response.status).toBe(200);
    expect(Product.findById).toHaveBeenCalledWith(productId);
    expect(response.body).toEqual({
      product: {
        id: productId,
        title: "Laptop",
        description: "Thin and light",
        brand: "BrandX",
        amount: 1299,
        currency: "USD",
        category: "electronics",
        stock: 12,
        seller: "507f1f77bcf86cd799439011",
        images: [{ url: "https://img.example/1", thumbnailUrl: "https://img.example/t/1", fileId: "img_1" }],
      },
    });
  });

  test("returns 404 when product is not found", async () => {
    const productId = "507f1f77bcf86cd799439032";
    Product.findById = jest.fn().mockResolvedValue(null);

    const response = await request(app).get(`/api/products/${productId}`);

    expect(response.status).toBe(404);
    expect(Product.findById).toHaveBeenCalledWith(productId);
    expect(response.body).toEqual({ message: "product not found" });
  });

  test("returns 400 when id format is invalid", async () => {
    const response = await request(app).get("/api/products/not-a-valid-id");

    expect(response.status).toBe(400);
    expect(Product.findById).not.toHaveBeenCalled();
    expect(response.body).toEqual({ message: "Invalid product id" });
  });

  test("returns 500 when fetch fails", async () => {
    const productId = "507f1f77bcf86cd799439033";
    Product.findById = jest.fn().mockRejectedValue(new Error("db failed"));

    const response = await request(app).get(`/api/products/${productId}`);

    expect(response.status).toBe(500);
    expect(Product.findById).toHaveBeenCalledWith(productId);
    expect(response.body).toEqual({ message: "Internal server error" });
  });
});
