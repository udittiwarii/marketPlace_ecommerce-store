# Environment Variables

Copy each `.env.example` to `.env` in the same service folder and replace placeholder values.

## Auth

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/auth
ACCESS_SECRET=change_me
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
RABIT_URL=amqp://localhost
```

## Product

```env
PORT=3001
MONGODB_URI=mongodb://localhost:27017/product
JWT_SECRET=change_me
INTERNAL_SERVICE_TOKEN=change_me
RABIT_URL=amqp://localhost
REACT_APP_URL=http://localhost:5173
IMAGEKIT_PUBLIC_KEY=your_imagekit_public_key
IMAGEKIT_PRIVATE_KEY=your_imagekit_private_key
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_imagekit_id
MAX_IMAGE_SIZE_MB=8
```

## Cart

```env
PORT=3002
MONGODB_URI=mongodb://localhost:27017/cart
JWT_SECRET=change_me
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

## Order

```env
PORT=3003
MONGODB_URI=mongodb://localhost:27017/order
JWT_SECRET=change_me
INTERNAL_SERVICE_TOKEN=change_me
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
RABIT_URL=amqp://localhost
JSON_LIMIT=100kb
```

## Payment

```env
PORT=3004
MONGODB_URI=mongodb://localhost:27017/payment
JWT_SECRET=change_me
INTERNAL_SERVICE_TOKEN=change_me
SERVICE_TOKEN=change_me
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RABIT_URL=amqp://localhost
```

## AI Buddy

```env
PORT=3005
JWT_SECRET=change_me
GOOGLE_API_KEY=your_google_api_key
```

## Notification

```env
PORT=3006
RABIT_URL=amqp://localhost
EMAIL_USER=your_email@example.com
CLIENT_ID=your_google_client_id.apps.googleusercontent.com
CLIENT_SECRET=your_google_client_secret
REFRESH_TOKEN=your_google_refresh_token
```

## Seller Dashboard

```env
PORT=3008
MONGODB_URI=mongodb://localhost:27017/seller-dashboard
ACCESS_SECRET=change_me
INTERNAL_SERVICE_TOKEN=change_me
RABIT_URL=amqp://localhost
```
