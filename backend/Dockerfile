# =============================================================================
#  LifeTrack backend — Spring Boot 3.3.4 / Java 17
#  Multi-stage build: Maven (deps cached) -> slim JRE runtime, non-root.
# =============================================================================

# ---------- Stage 1: build the fat jar ---------------------------------------
FROM maven:3.9.9-eclipse-temurin-17 AS build
WORKDIR /build

# Copy the POM first so the dependency layer is cached across source changes.
COPY pom.xml .
# Warm the local repository. Non-fatal: any gap is filled by the package step,
# because some plugins resolve badly under go-offline.
RUN mvn -B -q dependency:go-offline -DskipTests || true

COPY src ./src
RUN mvn -B -DskipTests clean package \
    && cp "$(ls -1 target/*.jar | grep -v '\.original$' | head -n1)" /build/app.jar

# ---------- Stage 2: runtime -------------------------------------------------
FROM eclipse-temurin:17-jre-alpine AS runtime

# wget is used by the container healthcheck.
RUN apk add --no-cache wget curl tzdata \
    && addgroup -S -g 10001 lifetrack \
    && adduser  -S -u 10001 -G lifetrack lifetrack

WORKDIR /app
COPY --from=build --chown=10001:10001 /build/app.jar /app/app.jar

USER 10001:10001

ENV SERVER_PORT=8080 \
    JAVA_OPTS="-XX:MaxRAMPercentage=70 -XX:+UseContainerSupport -Djava.security.egd=file:/dev/./urandom"

EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=5s --start-period=90s --retries=10 \
    CMD wget -qO- "http://127.0.0.1:${SERVER_PORT}/actuator/health" | grep -q '"status":"UP"' || exit 1

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]
