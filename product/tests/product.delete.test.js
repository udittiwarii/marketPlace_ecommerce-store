const request = require("supertest");
const jwt = require("jsonwebtoken");

jest.mock("../src/models/product.model", () => jest.fn());
jest.mock("../src/services/imagekit", () => ({
  uploadImage: jest.fn(),
}));

const Product = require("../src/models/product.model");
const app = require("../src/app");

describe("DELETE /api/products/:id (TDD)", () => {
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
    const response = await request(app).delete(`/api/products/${productId}`);

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: "Unauthorized" });
  });

  test("returns 401 when token is invalid", async () => {
    const response = await request(app)
      .delete(`/api/products/${productId}`)
      .set("Authorization", "Bearer invalid-token");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: "Invalid token" });
  });

  test("returns 403 when role is not seller", async () => {
    const response = await request(app)
      .delete(`/api/products/${productId}`)
      .set("Authorization", `Bearer ${authToken("user")}`);

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ message: "Insufficient permissions" });
  });

  test("returns 400 when id format is invalid", async () => {
    const response = await request(app)
      .delete("/api/products/not-a-valid-id")
      .set("Authorization", `Bearer ${authToken("seller")}`);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: "Invalid product id" });
  });

  test("returns 404 when product does not exist for seller", async () => {
    Product.findById = jest.fn().mockResolvedValue(null);
    Product.findOneAndDelete = jest.fn();

    const response = await request(app)
      .delete(`/api/products/${productId}`)
      .set("Authorization", `Bearer ${authToken("seller", sellerId)}`);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: "Product not found" });
    expect(Product.findById).toHaveBeenCalledWith(productId);
    expect(Product.findOneAndDelete).not.toHaveBeenCalled();
  });

  test("returns 403 when seller tries to delete another seller product", async () => {
    Product.findById = jest.fn().mockResolvedValue({
      _id: productId,
      seller: { toString: () => "507f1f77bcf86cd799439099" },
    });
    Product.findOneAndDelete = jest.fn();

    const response = await request(app)
      .delete(`/api/products/${productId}`)
      .set("Authorization", `Bearer ${authToken("seller", sellerId)}`);

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      message: "You can only delete your own products",
    });
    expect(Product.findOneAndDelete).not.toHaveBeenCalled();
  });

  test("returns 200 when product is deleted successfully", async () => {
    Product.findById = jest.fn().mockResolvedValue({
      _id: productId,
      seller: { toString: () => sellerId },
      title: "Laptop",
    });
    Product.findOneAndDelete = jest.fn().mockResolvedValue({
      _id: productId,
      seller: sellerId,
      title: "Laptop",
    });

    const response = await request(app)
      .delete(`/api/products/${productId}`)
      .set("Authorization", `Bearer ${authToken("seller", sellerId)}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      message: "Product deleted successfully",
    });
    expect(Product.findOneAndDelete).toHaveBeenCalledWith({
      _id: productId,
      seller: sellerId,
    });
  });

  test("returns 500 when delete throws", async () => {
    Product.findById = jest.fn().mockResolvedValue({
      _id: productId,
      seller: { toString: () => sellerId },
    });
    Product.findOneAndDelete = jest.fn().mockRejectedValue(new Error("db failed"));

    const response = await request(app)
      .delete(`/api/products/${productId}`)
      .set("Authorization", `Bearer ${authToken("seller", sellerId)}`);

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ message: "Internal server error" });
  });
});
