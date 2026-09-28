FROM maven:3.9-eclipse-temurin-21-alpine AS build
WORKDIR /app
# Copy the POM first so dependency resolution is cached as a separate layer.
COPY pom.xml .
RUN mvn -q -B dependency:go-offline
COPY src ./src
RUN mvn -q -B package -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/target/finpilot-backend-*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
