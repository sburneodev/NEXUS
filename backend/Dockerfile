# ── FASE 1: Build ──────────────────────────────────────
FROM eclipse-temurin:25-jdk-alpine AS build

WORKDIR /app

RUN apk add --no-cache maven

# Cachea dependencias
COPY pom.xml ./
RUN mvn dependency:go-offline -q

# Compila
COPY src/ src/
RUN mvn package -DskipTests -q

# ── FASE 2: Runtime ────────────────────────────────────
FROM eclipse-temurin:25-jre-alpine AS runtime

WORKDIR /app

# Usuario no-root por seguridad
RUN addgroup -S nexus && adduser -S nexus -G nexus

# Copia el jar compilado
COPY --from=build /app/target/*.jar app.jar

# Carpeta de logs
RUN mkdir -p /app/logs && chown -R nexus:nexus /app

USER nexus

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]