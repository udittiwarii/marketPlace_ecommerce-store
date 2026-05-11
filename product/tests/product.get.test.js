const request = require("supertest");

jest.mock("../src/models/product.model", () => jest.fn());
jest.mock("../src/services/imagekit", () => ({
  uploadImage: jest.fn(),
}));

const Product = require("../src/models/product.model");
const app = require("../src/app");

describe("GET /api/products", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns 200 with products list", async () => {
    const dbProducts = [
      {
        _id: "507f1f77bcf86cd799439021",
        title: "Laptop",
        description: "Thin and light",
        brand: "BrandX",
        price: { amount: 1200, currency: "USD" },
        category: "electronics",
        stock: 8,
        seller: "507f1f77bcf86cd799439011",
        images: [{ url: "https://img.example/1", thumbnailUrl: "https://img.example/t/1", fileId: "img_1" }],
      },
    ];

    const limit = jest.fn().mockResolvedValue(dbProducts);
    const skip = jest.fn().mockReturnValue({ limit });
    const sort = jest.fn().mockReturnValue({ skip });
    Product.find = jest.fn().mockReturnValue({ sort });

    const response = await request(app).get("/api/products");

    expect(response.status).toBe(200);
    expect(Product.find).toHaveBeenCalledWith({});
    expect(sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(skip).toHaveBeenCalledWith(0);
    expect(limit).toHaveBeenCalledWith(20);
    expect(response.body).toEqual({
      products: [
        {
          id: "507f1f77bcf86cd799439021",
          title: "Laptop",
          description: "Thin and light",
          brand: "BrandX",
          amount: 1200,
          currency: "USD",
          category: "electronics",
          stock: 8,
          seller: "507f1f77bcf86cd799439011",
          images: [{ url: "https://img.example/1", thumbnailUrl: "https://img.example/t/1", fileId: "img_1" }],
        },
      ],
    });
  });

  test("returns stock as 0 for legacy products missing stock", async () => {
    const dbProducts = [
      {
        _id: "507f1f77bcf86cd799439022",
        title: "Legacy Laptop",
        description: "Older product",
        brand: "BrandY",
        price: { amount: 900, currency: "USD" },
        category: "electronics",
        seller: "507f1f77bcf86cd799439099",
        images: [],
      },
    ];

    const limit = jest.fn().mockResolvedValue(dbProducts);
    const skip = jest.fn().mockReturnValue({ limit });
    const sort = jest.fn().mockReturnValue({ skip });
    Product.find = jest.fn().mockReturnValue({ sort });

    const response = await request(app).get("/api/products");

    expect(response.status).toBe(200);
    expect(response.body.products[0]).toEqual(
      expect.objectContaining({
        stock: 0,
      })
    );
  });

  test("returns 200 with empty products when no data exists", async () => {
    const limit = jest.fn().mockResolvedValue([]);
    const skip = jest.fn().mockReturnValue({ limit });
    const sort = jest.fn().mockReturnValue({ skip });
    Product.find = jest.fn().mockReturnValue({ sort });

    const response = await request(app).get("/api/products");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      message: "No products found",
      data: [],
    });
  });

  test("returns 500 when fetching products fails", async () => {
    const limit = jest.fn().mockRejectedValue(new Error("db failed"));
    const skip = jest.fn().mockReturnValue({ limit });
    const sort = jest.fn().mockReturnValue({ skip });
    Product.find = jest.fn().mockReturnValue({ sort });

    const response = await request(app).get("/api/products");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ message: "Internal server error" });
  });
});
