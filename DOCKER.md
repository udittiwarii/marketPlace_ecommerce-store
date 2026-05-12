# Docker

Every service has a Docker build file and `.dockerignore`. The images install production dependencies with `npm ci --omit=dev`, copy the service source, expose the service port, and run `npm start`.

## Build Images

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

## Run Images

```bash
docker run --env-file auth/.env -p 3000:3000 marketplace-auth
docker run --env-file product/.env -p 3001:3001 marketplace-product
docker run --env-file Cart/.env -p 3002:3002 marketplace-cart
docker run --env-file order/.env -p 3003:3003 marketplace-order
docker run --env-file payment/.env -p 3004:3004 marketplace-payment
docker run --env-file notification/.env -p 3006:3006 marketplace-notification
docker run --env-file aiBuddy/.env -p 3005:3005 marketplace-aibuddy
docker run --env-file seller-dashboard/.env -p 3008:3008 marketplace-seller-dashboard
```

## Infrastructure

The containers still need MongoDB, Redis, and RabbitMQ reachable from inside Docker. If those dependencies run on the host machine, update each service `.env` to use a Docker-reachable hostname instead of `localhost`.

Common Docker Desktop host value:

```env
MONGODB_URI=mongodb://host.docker.internal:27017/service-db
REDIS_HOST=host.docker.internal
RABIT_URL=amqp://host.docker.internal
```

For a Docker network or future `docker-compose.yml`, use container service names such as `mongodb`, `redis`, and `rabbitmq`.
