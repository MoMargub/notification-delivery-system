FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci || npm install
COPY . .
RUN npx prisma generate
EXPOSE 5000
# The command is overridden in docker-compose.yml to run migrations and seed before starting
CMD ["npm", "run", "dev"]
