# Marketplace Microservices Application

This repository contains a Node.js marketplace application split into multiple Express services. The backend covers authentication, products, carts, orders, payments, notifications, and an AI shopping assistant. Each service is kept in its own folder with its own `package.json`.

## Services

| Service | Folder | Port | Purpose |
| --- | --- | ---: | --- |
| Auth | `auth` | `3000` | User registration, login, refresh tokens, logout, profile, and addresses |
| Product | `product` | `3001` | Product catalog, seller product management, ImageKit uploads, inventory reservation and stock updates |
| Cart | `Cart` | `3002` | User cart operations and cart totals |
| Order | `order` | `3003` | Create orders from cart or buy-now, reserve inventory, update addresses, cancel orders, mark paid |
| Payment | `payment` | `3004` | Razorpay order creation, payment verification, order payment updates, payment notifications |
| AI Buddy | `aiBuddy` | `3005` | Socket.IO AI assistant using LangChain/LangGraph and Google Gemini |
| Notification | `notification` | `3006` or `PORT` | RabbitMQ event listener and email notifications |
| Seller Dashboard | `seller-dashboard` | Not configured | Package scaffold for seller dashboard/backend work |

## Tech Stack

- Node.js and Express
- MongoDB with Mongoose
- Redis with `ioredis`
- RabbitMQ with `amqplib`
- JWT authentication with cookie support
- Razorpay payments
- ImageKit product image upload
- Nodemailer for email notifications
- Socket.IO, LangChain, LangGraph, and Google Gemini for the AI assistant
- Jest and Supertest for service tests

## Repository Structure

```text
marketPlace/
  aiBuddy/            AI shopping assistant service
  auth/               Authentication and user profile service
  Cart/               Cart service
  notification/       Email notification service
  order/              Order service
  payment/            Razorpay payment service
  product/            Product catalog and inventory service
  seller-dashboard/   Seller dashboard scaffold
```

## Prerequisites

Install these before running the app:

- Node.js 18 or newer
- npm
- MongoDB
- Redis
- RabbitMQ
- Razorpay account and API keys for payment features
- ImageKit account and API keys for product image uploads
- Google API key or credentials supported by `@langchain/google-genai` for AI Buddy
- Email OAuth credentials for notification emails

## Environment Variables

Create a `.env` file inside each service folder that needs configuration. The exact variables used by the code are listed below.

### Auth

```env
MONGODB_URI=mongodb://127.0.0.1:27017/marketplace-auth
ACCESS_SECRET=your_access_token_secret
REACT_APP_URL=http://localhost:5173
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=
RABIT_URL=amqp://localhost
```

### Product

```env
MONGODB_URI=mongodb://127.0.0.1:27017/marketplace-product
JWT_SECRET=your_jwt_secret
INTERNAL_SERVICE_TOKEN=shared_internal_service_token
REACT_APP_URL=http://localhost:5173
IMAGEKIT_PUBLIC_KEY=your_imagekit_public_key
IMAGEKIT_PRIVATE_KEY=your_imagekit_private_key
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_account
MAX_IMAGE_SIZE_MB=8
```

### Cart

```env
MONGODB_URI=mongodb://127.0.0.1:27017/marketplace-cart
JWT_SECRET=your_jwt_secret
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=
```

### Order

```env
MONGODB_URI=mongodb://127.0.0.1:27017/marketplace-order
JWT_SECRET=your_jwt_secret
INTERNAL_SERVICE_TOKEN=shared_internal_service_token
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=
JSON_LIMIT=100kb
```

### Payment

```env
MONGODB_URI=mongodb://127.0.0.1:27017/marketplace-payment
JWT_SECRET=your_jwt_secret
INTERNAL_SERVICE_TOKEN=shared_internal_service_token
SERVICE_TOKEN=shared_internal_service_token
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
REACT_APP_URL=http://localhost:5173
RABIT_URL=amqp://localhost
```

### Notification

```env
PORT=3006
RABIT_URL=amqp://localhost
EMAIL_USER=your_email@gmail.com
CLIENT_ID=your_google_oauth_client_id
CLIENT_SECRET=your_google_oauth_client_secret
REFRESH_TOKEN=your_google_oauth_refresh_token
```

### AI Buddy

```env
JWT_SECRET=your_jwt_secret
GOOGLE_API_KEY=your_google_api_key
```

Use the same JWT secret wherever services validate the same user token. In this codebase, Auth signs with `ACCESS_SECRET`, while Product, Cart, Order, Payment, and AI Buddy validate with `JWT_SECRET`, so set them to the same value if you want one login token to work across services.

## Installation

Install dependencies separately for each service:

```bash
cd auth && npm install
cd ../product && npm install
cd ../Cart && npm install
cd ../order && npm install
cd ../payment && npm install
cd ../notification && npm install
cd ../aiBuddy && npm install
cd ../seller-dashboard && npm install
```

## Running the Application

Start MongoDB, Redis, and RabbitMQ first. Then run each service in a separate terminal:

```bash
cd auth && npm run dev
cd product && npm run dev
cd Cart && npm run dev
cd order && npm run dev
cd payment && npm run dev
cd notification && npm run dev
cd aiBuddy && npm run dev
```

For production-style startup, use `npm start` in services that define it.

## API Overview

### Auth Service: `http://localhost:3000/api/auth`

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

### Product Service: `http://localhost:3001/api/products`

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/` | Create seller product with optional uploaded images |
| `GET` | `/` | Search/list products with `q`, `minprice`, `maxprice`, `skip`, `limit` |
| `GET` | `/seller` | Get products owned by the authenticated seller |
| `GET` | `/:id` | Get one product by ID |
| `PATCH` | `/:id` | Update seller-owned product |
| `DELETE` | `/:id` | Delete seller-owned product |
| `POST` | `/bulk` | Fetch multiple products by IDs |
| `POST` | `/reserve` | Reserve inventory for a user order |
| `POST` | `/release` | Release reserved inventory |
| `POST` | `/deduct` | Deduct inventory after successful payment |
| `POST` | `/restock` | Add stock back to products |

### Cart Service: `http://localhost:3002/api/cart`

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/items` | Add item to cart |
| `PATCH` | `/items/:productId` | Update cart item quantity |
| `GET` | `/` | Get current user cart |
| `DELETE` | `/items/:productId` | Remove one item from cart |
| `DELETE` | `/` | Clear current user cart |

### Order Service: `http://localhost:3003/api/order`

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/from-cart` | Create an order from the current cart |
| `POST` | `/buy-now` | Create an order for one product immediately |
| `GET` | `/me` | Get current user orders |
| `GET` | `/:orderId` | Get one order by ID |
| `POST` | `/:id/cancel` | Cancel a pending order |
| `PATCH` | `/:id/address` | Update shipping address before processing |
| `POST` | `/:id/marked-paid` | Internal service endpoint to mark an order paid |

### Payment Service: `http://localhost:3004/api/payments`

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/:orderId` | Create a Razorpay payment order |
| `POST` | `/verify/payment` | Verify Razorpay payment signature and publish result |

### Notification Service

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `http://localhost:3006/health` | Health check |

### AI Buddy Service

AI Buddy runs an HTTP server with Socket.IO on `http://localhost:3005`. It authenticates socket users with JWT, uses Gemini through LangChain/LangGraph, and exposes tools for product search and cart actions.

## Main User Flow

1. A user registers or logs in through the Auth service.
2. Sellers create products through the Product service.
3. Users search products and add items to their cart.
4. Users create an order from the cart or with buy-now.
5. The Order service validates products, calculates totals, and reserves inventory.
6. The Payment service creates a Razorpay order.
7. Payment verification marks the payment completed, marks the order paid, deducts inventory, and publishes notification events.
8. The Notification service consumes RabbitMQ events and sends emails.

## Testing

Run tests service by service:

```bash
cd auth && npm test
cd product && npm test
cd Cart && npm test
cd order && npm test
```

Payment, notification, AI Buddy, and seller dashboard currently do not define working automated test scripts.

## Notes

- Each service has independent dependencies and should be installed from its own folder.
- Several services call each other using localhost URLs, so keep the default ports available while developing.
- The repository uses `.env` files for secrets; keep real credentials out of Git.
- The `.gitignore` excludes `.env`, `node_modules`, `dist`, and `logs`.
- `seller-dashboard` currently contains package metadata and dependencies but no application entry point.
