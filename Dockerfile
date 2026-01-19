# Build Frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend

# Copy frontend dependency files
COPY frontend/package*.json ./
RUN npm ci

# Copy source files
COPY frontend/ ./

# Create the destination directory for the build output
RUN mkdir -p /app/backend/src/main/resources/static

# Build the frontend
RUN npm run build

# Build Backend
FROM maven:3.9.9-eclipse-temurin-21-alpine AS backend-build
WORKDIR /app/backend

# Copy the pom.xml and download dependencies
COPY backend/pom.xml .
RUN mvn dependency:go-offline -B

# Copy backend source code
COPY backend/src ./src

# Copy the built frontend assets from Stage 1 into the Spring Boot static folder
COPY --from=frontend-build /app/backend/src/main/resources/static ./src/main/resources/static

# Build the JAR
RUN mvn clean package -DskipTests

# Build Runtime Image
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Copy the JAR from the build stage
COPY --from=backend-build /app/backend/target/*.jar app.jar

EXPOSE 10000

# Run the application
ENTRYPOINT ["java", "-jar", "app.jar"]