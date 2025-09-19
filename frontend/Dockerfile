FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --no-optional --prefer-offline --registry https://registry.npmjs.org/
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]