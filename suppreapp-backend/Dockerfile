# Dùng node bản 20 nhẹ (alpine)
FROM node:20-alpine

# Tạo thư mục làm việc trong hộp
WORKDIR /app

# Chỉ copy file package.json trước để cài thư viện cho nhanh
COPY package*.json ./
RUN npm install

# Copy toàn bộ code còn lại
COPY . .

# App của bạn chạy cổng 5000
EXPOSE 5001

# Lệnh khởi động (sửa lại theo file của bạn, ví dụ server.js hoặc index.js)
CMD ["npm", "start"]