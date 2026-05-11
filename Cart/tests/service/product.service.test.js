process.env.NODE_ENV = "test";

jest.mock("axios", () => ({
  get: jest.fn(),
  post: jest.fn(),
}));

const axios = require("axios");
const redis = require("../../src/db/redis");
const productService = require("../../src/service/product.service");

describe("product.service", () => {
  beforeEach(async () => {
    axios.get.mockReset();
    axios.post.mockReset();
    if (redis.store?.clear) {
      redis.store.clear();
    }
  });

  
  test("normalizes single-product responses before caching", async () => {
    axios.get.mockResolvedValue({
      data: {
        product: {
          id: "507f1f77bcf86cd799439031",
          title: "Laptop",
          amount: 1299,
          currency: "USD",
          stock: 12,
        },
      },
    });

    const product = await productService.getProduct("507f1f77bcf86cd799439031");

    expect(product).toEqual({
      id: "507f1f77bcf86cd799439031",
      title: "Laptop",
      description: undefined,
      brand: undefined,
      amount: 1299,
      currency: "USD",
      category: undefined,
      stock: 12,
      seller: undefined,
      images: [],
    });
    expect(JSON.parse(await redis.get("product:507f1f77bcf86cd799439031"))).toEqual(product);
  });

  test("normalizes bulk responses and stores them under the same cache contract", async () => {
    redis.mget = jest.fn().mockResolvedValue([null]);
    axios.get.mockResolvedValue({
      data: {
        products: [
          {
            id: "507f1f77bcf86cd799439032",
            title: "Phone",
            amount: 499,
            currency: "USD",
            stock: 4,
          },
        ],
      },
    });

    const products = await productService.getProductsBulk(["507f1f77bcf86cd799439032"]);

    expect(axios.get).toHaveBeenCalledWith(
      "http://localhost:3001/api/products/bulk",
      { ids: ["507f1f77bcf86cd799439032"] }
    );

    expect(products).toEqual([
      {
        id: "507f1f77bcf86cd799439032",
        title: "Phone",
        description: undefined,
        brand: undefined,
        amount: 499,
        currency: "USD",
        category: undefined,
        stock: 4,
        seller: undefined,
        images: [],
      },
    ]);
    expect(JSON.parse(await redis.get("product:507f1f77bcf86cd799439032"))).toEqual(products[0]);
  });

  test("returns early for empty bulk lookups", async () => {
    redis.mget = jest.fn();

    const products = await productService.getProductsBulk([]);

    expect(products).toEqual([]);
    expect(redis.mget).not.toHaveBeenCalled();
    expect(axios.get).not.toHaveBeenCalled();
  });
});
