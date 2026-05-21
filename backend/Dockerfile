# ── FASE 1: Build ──────────────────────────────────────
FROM eclipse-temurin:25-jdk-alpine AS build

WORKDIR /app

# Copia el wrapper y el pom primero (cachea dependencias)
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN ./mvnw dependency:go-offline -q

# Copia el código fuente y compila
COPY src/ src/
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw        # ← añadir esta línea
RUN ./mvnw dependency:go-offline -q
RUN ./mvnw package -DskipTests -q

# ── FASE 2: Runtime ────────────────────────────────────
FROM eclipse-temurin:25-jre-alpine AS runtime

WORKDIR /app

# Crea usuario no-root por seguridad
RUN addgroup -S nexus && adduser -S nexus -G nexus

# Copia solo el jar compilado
COPY --from=build /app/target/*.jar app.jar

# Crea carpeta de logs
RUN mkdir -p /app/logs && chown -R nexus:nexus /app

USER nexus

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]