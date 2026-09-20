# FinPilot backend

Spring Boot 3.3 / Java 21 API for the FinPilot frontend.

## Local setup

1. Create a PostgreSQL database named `finpilot`.
2. Set a unique JWT signing secret of at least 32 characters:

```powershell
$env:APP_JWT_SECRET = "replace-with-a-long-random-secret"
```

3. Optionally configure database access and direct browser origins with Spring
   environment variables, for example `SPRING_DATASOURCE_URL` and
   `APP_CORS_ALLOWED_ORIGINS`.
4. Run with Maven:

```powershell
mvn spring-boot:run
```

The frontend development server proxies `/api/*` to `http://localhost:8080`.
Flyway applies the schema migrations on startup. Do not put secrets in
`application.properties`; the file intentionally contains no JWT default.

## Verification

```powershell
mvn test
```

The included tests cover transaction balance updates, budget calculations,
statement import, category prediction, health scoring, insights, and RAG
context behavior.
