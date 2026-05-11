const request = require("supertest");
const jwt = require("jsonwebtoken");

jest.mock("../src/models/product.model", () => jest.fn());
jest.mock("../src/services/imagekit", () => ({
  uploadImage: jest.fn(),
}));
jest.mock(
  "../src/services/cache.service",
  () => ({
    invalidateProductCache: jest.fn(),
  }),
  { virtual: true }
);
jest.mock(
  "../src/services/event-bus.service",
  () => ({
    emit: jest.fn(),
  }),
  { virtual: true }
);

const Product = require("../src/models/product.model");
const app = require("../src/app");

describe("PATCH /api/products/:id (seller)", () => {
  const jwtSecret = "test-secret";
  const sellerId = "507f1f77bcf86cd799439011";
  const productId = "507f1f77bcf86cd799439041";

  beforeEach(() => {
    process.env.JWT_SECRET = jwtSecret;
    jest.clearAllMocks();
  });

  function authToken(role = "seller", id = sellerId) {
    return jwt.sign({ id, role }, jwtSecret);
  }

  test("returns 401 when token is missing", async () => {
    const response = await request(app)
      .patch("/api/products/507f1f77bcf86cd799439041")
      .send({ title: "Updated title" });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: "Unauthorized" });
  });

  test("returns 401 when token is invalid", async () => {
    const response = await request(app)
      .patch(`/api/products/${productId}`)
      .set("Authorization", "Bearer invalid-token")
      .send({ title: "Updated title" });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: "Invalid token" });
  });

  test("returns 403 when role is not seller", async () => {
    const response = await request(app)
      .patch("/api/products/507f1f77bcf86cd799439041")
      .set("Authorization", `Bearer ${authToken("user")}`)
      .send({ title: "Updated title" });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ message: "Insufficient permissions" });
  });

  test("returns 400 when id format is invalid", async () => {
    const response = await request(app)
      .patch("/api/products/not-a-valid-id")
      .set("Authorization", `Bearer ${authToken("seller")}`)
      .send({ title: "Updated title" });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: "Invalid product id" });
  });

  test("returns 400 when update validation fails", async () => {
    const response = await request(app)
      .patch(`/api/products/${productId}`)
      .set("Authorization", `Bearer ${authToken("seller")}`)
      .send({ priceAmount: -1 });

    expect(response.status).toBe(400);
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          msg: "Price must be greater than 0",
          path: "priceAmount",
        }),
      ])
    );
  });

  test("returns 404 when product does not exist", async () => {
    Product.findOne = jest.fn().mockResolvedValue(null);

    const response = await request(app)
      .patch(`/api/products/${productId}`)
      .set("Authorization", `Bearer ${authToken("seller", sellerId)}`)
      .send({ title: "Updated title" });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: "Product not found" });
    expect(Product.findOne).toHaveBeenCalledWith({ _id: productId });
  });

  test("returns 403 when seller tries to update another seller product", async () => {
    Product.findOne = jest.fn().mockResolvedValue({
      _id: productId,
      seller: { toString: () => "507f1f77bcf86cd799439099" },
      price: { amount: 1000, currency: "INR" },
      save: jest.fn(),
    });

    const response = await request(app)
      .patch(`/api/products/${productId}`)
      .set("Authorization", `Bearer ${authToken("seller", sellerId)}`)
      .send({ title: "Updated title" });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      message: "You can only update your own products",
    });
  });

  test("returns 200 and updates allowed fields including priceAmount/priceCurrency", async () => {
    const save = jest.fn().mockResolvedValue();
    const productDoc = {
      _id: productId,
      seller: { toString: () => sellerId },
      title: "Old title",
      description: "Old description",
      brand: "Old brand",
      category: "old-category",
      price: { amount: 1000, currency: "INR" },
      stock: 4,
      images: [],
      save,
    };
    Product.findOne = jest.fn().mockResolvedValue(productDoc);

    const response = await request(app)
      .patch(`/api/products/${productId}`)
      .set("Authorization", `Bearer ${authToken("seller", sellerId)}`)
      .send({
        title: "New title",
        description: "New description",
        priceAmount: 1499,
        priceCurrency: "USD",
        stock: 11,
      });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Product updated successfully");
    expect(response.body.product).toEqual(
      expect.objectContaining({
        id: productId,
        title: "New title",
        description: "New description",
        amount: 1499,
        currency: "USD",
        stock: 11,
      })
    );
    expect(save).toHaveBeenCalledTimes(1);
  });

  test("returns 400 when stock update is negative", async () => {
    const response = await request(app)
      .patch(`/api/products/${productId}`)
      .set("Authorization", `Bearer ${authToken("seller")}`)
      .send({ stock: -2 });

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

  test("returns 500 when database update fails", async () => {
    Product.findOne = jest.fn().mockRejectedValue(new Error("db failed"));

    const response = await request(app)
      .patch(`/api/products/${productId}`)
      .set("Authorization", `Bearer ${authToken("seller", sellerId)}`)
      .send({ title: "Updated title" });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ message: "Internal server error" });
  });
});
