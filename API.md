# API Reference

## Auth: `http://localhost:3000/api/auth`

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/register` | Register a user or seller |
| `POST` | `/login` | Login and receive auth cookies |
| `POST` | `/refresh` | Rotate refresh token and issue a new access token |
| `GET` | `/me` | Get current user profile |
| `GET` | `/logout` | Clear auth cookies and remove refresh token |
| `GET` | `/users/me/addresses` | Get saved addresses |
| `POST` | `/users/me/addresses` | Add a saved address |
| `DELETE` | `/users/me/addresses/:addressId` | Delete a saved address |

## Product: `http://localhost:3001/api/products`

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/` | Create seller product with optional uploaded images |
| `GET` | `/` | Search or list products |
| `GET` | `/seller` | Get products owned by the authenticated seller |
| `GET` | `/:id` | Get one product by ID |
| `PATCH` | `/:id` | Update seller-owned product |
| `DELETE` | `/:id` | Delete seller-owned product |
| `POST` | `/bulk` | Fetch multiple products by IDs |
| `POST` | `/reserve` | Reserve inventory for an order |
| `POST` | `/release` | Release reserved inventory |
| `POST` | `/deduct` | Deduct inventory after payment |
| `POST` | `/restock` | Add stock back to products |

## Cart: `http://localhost:3002/api/cart`

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/items` | Add item to cart |
| `PATCH` | `/items/:productId` | Update cart item quantity |
| `GET` | `/` | Get current user cart |
| `DELETE` | `/items/:productId` | Remove one item from cart |
| `DELETE` | `/` | Clear current user cart |

## Order: `http://localhost:3003/api/order`

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/from-cart` | Create an order from the current cart |
| `POST` | `/buy-now` | Create an order for one product immediately |
| `GET` | `/me` | Get current user orders |
| `GET` | `/:orderId` | Get one order by ID |
| `POST` | `/:id/cancel` | Cancel a pending order |
| `PATCH` | `/:id/address` | Update shipping address before processing |
| `POST` | `/:id/marked-paid` | Internal endpoint to mark an order paid |

## Payment: `http://localhost:3004/api/payments`

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/:orderId` | Create a Razorpay payment order |
| `POST` | `/verify/payment` | Verify Razorpay payment signature |

## Notification: `http://localhost:3006`

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/health` | Health check |

## AI Buddy: `http://localhost:3005`

AI Buddy runs an HTTP server with Socket.IO. It authenticates socket users with JWT and exposes assistant tools for product search and cart actions.

## Seller Dashboard: `http://localhost:3008/api/seller/dashboard`

Seller Dashboard exposes seller-facing dashboard routes and consumes product/order events from RabbitMQ.
