# Marketplace Microservices Application

Node.js marketplace backend split into independent Express services for auth, products, carts, orders, payments, notifications, seller dashboards, and an AI shopping assistant. Each service has its own `package.json`, `.env.example`, Docker ignore file, and container build file.

## Services

| Service | Folder | Default port | Purpose |
| --- | --- | ---: | --- |
| Auth | `auth` | `3000` | User registration, login, refresh tokens, logout, profile, and addresses |
| Product | `product` | `3001` | Product catalog, seller product management, ImageKit uploads, inventory reservation, and stock updates |
| Cart | `Cart` | `3002` | User cart operations and cart totals |
| Order | `order` | `3003` | Create orders from cart or buy-now, reserve inventory, update addresses, cancel orders, and mark paid |
| Payment | `payment` | `3004` | Razorpay order creation, payment verification, order payment updates, and payment notifications |
| AI Buddy | `aiBuddy` | `3005` | Socket.IO AI assistant using LangChain/LangGraph and Google Gemini |
| Notification | `notification` | `3006` | RabbitMQ event listener and email notifications |
| Seller Dashboard | `seller-dashboard` | `3008` | Seller dashboard service and RabbitMQ-backed seller event projections |

## Tech Stack

- Node.js and Express
- MongoDB with Mongoose
- Redis with `ioredis`
- RabbitMQ with `amqplib`
- JWT authentication with cookie support
- Razorpay payments
- ImageKit product image upload
- Nodemailer email notifications
- Socket.IO, LangChain, LangGraph, and Google Gemini for AI Buddy
- Jest and Supertest for service tests
- Docker-ready service builds

## Repository Structure

```text
marketPlace/
  aiBuddy/
  auth/
  Cart/
  docs/
  notification/
  order/
  payment/
  product/
  seller-dashboard/
```

## Documentation

- [Services](docs/SERVICES.md)
- [Environment variables](docs/ENVIRONMENT.md)
- [Docker](docs/DOCKER.md)
- [API reference](docs/API.md)

## Prerequisites

- Node.js 20 or newer
- npm
- MongoDB
- Redis
- RabbitMQ
- Docker, if you want container builds
- Razorpay account and API keys for payment features
- ImageKit account and API keys for product image uploads
- Google API key for AI Buddy
- Email OAuth credentials for notification emails

## Environment Setup

Each service has its own `.env.example`. Copy it to `.env` inside the same folder and fill in real values:

```bash
cp auth/.env.example auth/.env
cp product/.env.example product/.env
cp Cart/.env.example Cart/.env
cp order/.env.example order/.env
cp payment/.env.example payment/.env
cp notification/.env.example notification/.env
cp aiBuddy/.env.example aiBuddy/.env
cp seller-dashboard/.env.example seller-dashboard/.env
```

Use the same secret value for `ACCESS_SECRET` in Auth and `JWT_SECRET` in services that validate user tokens. Use the same `INTERNAL_SERVICE_TOKEN` or `SERVICE_TOKEN` value wherever internal service calls are protected.

## Local Installation

Install dependencies per service:

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

## Running Locally

Start MongoDB, Redis, and RabbitMQ first. Then run each service in its own terminal:

```bash
cd auth && npm run dev
cd product && npm run dev
cd Cart && npm run dev
cd order && npm run dev
cd payment && npm run dev
cd notification && npm run dev
cd aiBuddy && npm run dev
cd seller-dashboard && npm run dev
```

All services read `process.env.PORT` first and fall back to the default ports listed above.

## Docker Builds

Each service has a Docker build file and `.dockerignore`. Example builds:

```bash
docker build -f auth/dockerfile -t marketplace-auth ./auth
docker build -t marketplace-product ./product
docker build -t marketplace-cart ./Cart
docker build -t marketplace-order ./order
docker build -t marketplace-payment ./payment
docker build -t marketplace-notification ./notification
docker build -t marketplace-aibuddy ./aiBuddy
docker build -t marketplace-seller-dashboard ./seller-dashboard
```

Run a service container with its environment file:

```bash
docker run --env-file auth/.env -p 3000:3000 marketplace-auth
```

See [Docker docs](docs/DOCKER.md) for all service build and run commands.

## Main User Flow

1. A user registers or logs in through Auth.
2. Sellers create products through Product.
3. Users search products and add items to Cart.
4. Users create an Order from cart or buy-now.
5. Order validates products, calculates totals, and reserves inventory.
6. Payment creates and verifies Razorpay payment orders.
7. Payment success marks the order paid, deducts inventory, and publishes events.
8. Notification consumes RabbitMQ events and sends emails.
9. Seller Dashboard consumes seller/product/order events for seller-facing views.

## Testing

Run tests service by service:

```bash
cd auth && npm test
cd product && npm test
cd Cart && npm test
cd order && npm test
```

Payment, notification, AI Buddy, and seller-dashboard currently keep placeholder test scripts.

## Notes

- Keep real `.env` files and credentials out of Git.
- RabbitMQ broker modules reconnect after connection close and log connection errors.
- Some service-to-service URLs are currently hardcoded to localhost in code, so local multi-terminal development should use the default ports.
