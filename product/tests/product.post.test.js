const request = require("supertest");
const jwt = require("jsonwebtoken");

jest.mock("../src/models/product.model", () => jest.fn());
jest.mock("../src/services/imagekit", () => ({
  uploadImage: jest.fn(),
}));

const Product = require("../src/models/product.model");
const imagekitService = require("../src/services/imagekit");
const app = require("../src/app");

describe("POST /api/products", () => {
  const jwtSecret = "test-secret";
  const validPayload = {
    title: "Laptop",
    description: "Thin and light",
    brand: "BrandX",
    category: "electronics",
    priceAmount: 999,
    priceCurrency: "USD",
    stock: 7,
  };

  beforeEach(() => {
    process.env.JWT_SECRET = jwtSecret;
    jest.clearAllMocks();
    imagekitService.uploadImage.mockResolvedValue({
      url: "https://img.example/1",
      thumbnailUrl: "https://img.example/thumb/1",
      fileId: "img_1",
    });
  });

  function authToken(role = "admin") {
    return jwt.sign({ id: "507f1f77bcf86cd799439011", role }, jwtSecret);
  }

  test("returns 401 when token is missing", async () => {
    const response = await request(app).post("/api/products").send(validPayload);

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: "Unauthorized" });
  });

  test("returns 401 when token is invalid", async () => {
    const response = await request(app)
      .post("/api/products")
      .set("Authorization", "Bearer invalid-token")
      .send(validPayload);

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: "Invalid token" });
  });

  test("returns 403 when role is not allowed", async () => {
    const response = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${authToken("user")}`)
      .send(validPayload);

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ message: "Insufficient permissions" });
  });

  test("returns 400 when validation fails", async () => {
    const response = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${authToken("admin")}`)
      .send({
        ...validPayload,
        title: "",
      });

    expect(response.status).toBe(400);
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          msg: "Title is required",
          path: "title",
        }),
      ])
    );
  });

  test("creates product successfully with default INR currency", async () => {
    const save = jest
      .fn()
      .mockResolvedValue({
        _id: "507f1f77bcf86cd799439012",
        title: "Laptop",
        description: validPayload.description,
        brand: validPayload.brand,
        category: validPayload.category,
        seller: "507f1f77bcf86cd799439011",
        price: { amount: 1200, currency: "INR" },
        stock: 7,
        images: [],
      });
    Product.mockImplementation((doc) => ({
      ...doc,
      save,
    }));

    const response = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${authToken("seller")}`)
      .send({
        ...validPayload,
        priceAmount: 1200,
        priceCurrency: undefined,
      });

    expect(response.status).toBe(201);
    expect(response.body.message).toBe("Product created successfully");
    expect(response.body.product).toEqual(
      expect.objectContaining({
        id: "507f1f77bcf86cd799439012",
        title: "Laptop",
        stock: 7,
        images: [],
      })
    );
    expect(Product).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Laptop",
        seller: "507f1f77bcf86cd799439011",
        price: {
          amount: 1200,
          currency: "INR",
        },
        stock: 7,
        images: [],
      })
    );
    expect(save).toHaveBeenCalledTimes(1);
    expect(imagekitService.uploadImage).not.toHaveBeenCalled();
  });

  test("uploads images and stores returned URLs", async () => {
    const save = jest.fn().mockImplementation(function saveMock() {
      return Promise.resolve({
        _id: "507f1f77bcf86cd799439013",
        title: this.title,
        description: this.description,
        brand: this.brand,
        category: this.category,
        seller: this.seller,
        price: this.price,
        stock: this.stock,
        images: this.images,
      });
    });

    Product.mockImplementation((doc) => ({
      ...doc,
      save,
    }));

    const response = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${authToken("admin")}`)
      .field("title", validPayload.title)
      .field("description", validPayload.description)
      .field("brand", validPayload.brand)
      .field("category", validPayload.category)
      .field("priceAmount", String(validPayload.priceAmount))
      .field("priceCurrency", validPayload.priceCurrency)
      .field("stock", String(validPayload.stock))
      .attach("url", Buffer.from("fake-image-content"), "image-1.jpg");

    expect(response.status).toBe(201);
    expect(imagekitService.uploadImage).toHaveBeenCalledTimes(1);
    expect(imagekitService.uploadImage).toHaveBeenCalledWith(
      expect.objectContaining({
        buffer: expect.any(Buffer),
      })
    );
    expect(Product).toHaveBeenCalledWith(
      expect.objectContaining({
        images: [
          expect.objectContaining({
            url: "https://img.example/1",
            thumbnailUrl: "https://img.example/thumb/1",
            fileId: "img_1",
          }),
        ],
        stock: 7,
      })
    );
  });

  test("creates product with stock when provided", async () => {
    const save = jest
      .fn()
      .mockResolvedValue({
        _id: "507f1f77bcf86cd799439014",
        title: validPayload.title,
        description: validPayload.description,
        brand: validPayload.brand,
        category: validPayload.category,
        seller: "507f1f77bcf86cd799439011",
        price: { amount: validPayload.priceAmount, currency: validPayload.priceCurrency },
        stock: validPayload.stock,
        images: [],
      });

    Product.mockImplementation((doc) => ({
      ...doc,
      save,
    }));

    const response = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${authToken("seller")}`)
      .send(validPayload);

    expect(response.status).toBe(201);
    expect(response.body.product).toEqual(
      expect.objectContaining({
        id: "507f1f77bcf86cd799439014",
        stock: 7,
      })
    );
  });

  test("defaults stock to 0 when omitted", async () => {
    const save = jest
      .fn()
      .mockResolvedValue({
        _id: "507f1f77bcf86cd799439015",
        title: validPayload.title,
        description: validPayload.description,
        brand: validPayload.brand,
        category: validPayload.category,
        seller: "507f1f77bcf86cd799439011",
        price: { amount: validPayload.priceAmount, currency: validPayload.priceCurrency },
        stock: 0,
        images: [],
      });

    Product.mockImplementation((doc) => ({
      ...doc,
      save,
    }));

    const { stock, ...payloadWithoutStock } = validPayload;
    const response = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${authToken("seller")}`)
      .send(payloadWithoutStock);

    expect(response.status).toBe(201);
    expect(Product).toHaveBeenCalledWith(
      expect.objectContaining({
        stock: 0,
      })
    );
    expect(response.body.product).toEqual(
      expect.objectContaining({
        stock: 0,
      })
    );
  });

  test("returns 400 when stock is negative", async () => {
    const response = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${authToken("seller")}`)
      .send({
        ...validPayload,
        stock: -1,
      });

    expect(response.status).toBe(400);
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          msg: "Stock must be an integer greater than or equal to 0",
          path: "stock",
        }),
      ])
    );
  });

  test("returns 500 when model save fails", async () => {
    const save = jest.fn().mockRejectedValue(new Error("save failed"));
    Product.mockImplementation((doc) => ({
      ...doc,
      save,
    }));

    const response = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${authToken("admin")}`)
      .send(validPayload);

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ message: "Internal server error" });
  });
});
