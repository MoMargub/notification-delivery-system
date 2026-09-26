FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci || npm install
# Tailwind CSS v4 uses lightningcss native binaries. The lockfile is generated on
# Windows so the Alpine/musl variant is missing. Install it explicitly here.
RUN npm install --cpu=x64 --os=linux --libc=musl lightningcss
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]
