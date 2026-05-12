# Services

| Service | Folder | Port | Start command | Main route |
| --- | --- | ---: | --- | --- |
| Auth | `auth` | `3000` | `npm start` | `/api/auth` |
| Product | `product` | `3001` | `npm start` | `/api/products` |
| Cart | `Cart` | `3002` | `npm start` | `/api/cart` |
| Order | `order` | `3003` | `npm start` | `/api/order` |
| Payment | `payment` | `3004` | `npm start` | `/api/payments` |
| AI Buddy | `aiBuddy` | `3005` | `npm start` | Socket.IO server |
| Notification | `notification` | `3006` | `npm start` | `/health` |
| Seller Dashboard | `seller-dashboard` | `3008` | `npm start` | `/api/seller/dashboard` |

## Shared Infrastructure

- MongoDB stores service data.
- Redis is used by Auth, Cart, and Order.
- RabbitMQ is used by Auth, Product, Order, Payment, Notification, and Seller Dashboard.
- JWT cookies/tokens are used for user authentication.

## Token Notes

Auth signs user tokens with `ACCESS_SECRET`. Product, Cart, Order, Payment, and AI Buddy validate user tokens with `JWT_SECRET`, so use the same value across those variables when running the full application.

Internal service endpoints use `INTERNAL_SERVICE_TOKEN` or `SERVICE_TOKEN`. Keep those values synchronized across services that call each other.
