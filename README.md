# NEXUS
NEXUS | Sistema integral de gestión de inventarios para tiendas de videojuegos y merchandising. Desarrollado con Spring Boot (Backend), React + Vite (Frontend) y PostgreSQL. Incluye integración con LLM para asistencia inteligente, análisis de código con SonarQube y despliegue automatizado mediante Docker y GitHub Actions.

## Tabla de contenidos

- [Stack tecnológico](#stack-tecnológico)
- [Requisitos previos](#requisitos-previos)
- [Instalación y arranque local](#instalación-y-arranque-local)
- [Variables de entorno](#variables-de-entorno)
- [Credenciales de prueba](#credenciales-de-prueba)
- [Estructura del repositorio](#estructura-del-repositorio)
- [Módulos principales](#módulos-principales)
- [CI/CD y despliegue](#cicd-y-despliegue)
- [Calidad de código](#calidad-de-código)
- [Producción](#producción)

---

## Stack tecnológico

| Capa | Tecnología | Versión |
|---|---|---|
| Backend | Java + Spring Boot | 25 / 4.0.x |
| Frontend | React + TypeScript + Vite | 18 / 5 / 5.x |
| Base de datos | PostgreSQL | 16 |
| Proxy inverso | Caddy | 2.x |
| Contenedores | Docker Compose | 25.x |
| IA | Gemini 2.0 Flash | v1beta |
| Análisis estático | SonarQube Community | 10.x |
| CI/CD | GitHub Actions | — |

---

## Requisitos previos

- Docker Desktop 25 o superior
- Git
- Java 25 JDK (solo si se ejecuta el backend fuera de Docker)
- Node 22 (solo si se ejecuta el frontend fuera de Docker)

---

## Instalación y arranque local

```bash
# 1. Clonar el repositorio
git clone https://github.com/sebastianburneoreyes25-blip/NEXUS.git
cd NEXUS

# 2. Crear el fichero de variables de entorno
cp .env.example .env
# Editar .env con los valores correspondientes

# 3. Levantar todos los servicios
docker compose up -d --build

# 4. Verificar que los contenedores están en ejecución
docker compose ps
```

El backend tarda aproximadamente 15-20 segundos en completar el arranque y aplicar las migraciones de Flyway. Para seguir el proceso:

```bash
docker compose logs nexus-backend --follow
```

Una vez arrancado, los servicios están disponibles en:

| Servicio | URL local |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8080/api |
| API Health | http://localhost:8080/api/actuator/health |
| SonarQube | http://localhost:9000 |
| PostgreSQL | localhost:5433 |

---

## Variables de entorno

Copiar `.env.example` como `.env` en la raíz del repositorio. Las variables marcadas como obligatorias deben tener valor antes de levantar el sistema.

| Variable | Descripción | Obligatoria |
|---|---|---|
| `DB_NAME` | Nombre de la base de datos | Si |
| `DB_URL` | URL JDBC de conexión a PostgreSQL | Si |
| `DB_USER` | Usuario de PostgreSQL | Si |
| `DB_PASSWORD` | Contraseña de PostgreSQL | Si |
| `JWT_SECRET` | Clave de firma HMAC-SHA256 (mínimo 64 caracteres) | Si |
| `JWT_EXPIRATION_SECONDS` | Duración del token en segundos (por defecto 28800) | No |
| `AI_GEMINI_API_KEY` | Clave de API de Google AI Studio | Si |
| `MAIL_HOST` | Host SMTP para envío de emails de verificación | No |
| `MAIL_USERNAME` | Usuario de la cuenta de correo | No |
| `MAIL_PASSWORD` | Contraseña o App Password de la cuenta de correo | No |
| `APP_BASE_URL` | URL base de la aplicación | Si |
| `SPRING_PROFILE` | Perfil de Spring Boot (`dev` o `prod`) | No |
| `SONAR_PORT_EXTERNAL` | Puerto externo de SonarQube (por defecto 9000) | No |

Para generar un `JWT_SECRET` seguro:

```bash
openssl rand -base64 64
```

---

## Credenciales de prueba

El script de seed `V3__seed_data.sql` crea los siguientes usuarios con contraseña `admin123`:

| Email | Rol | Acceso principal |
|---|---|---|
| admin@levelupnexus.es | ADMIN | Acceso total al sistema |
| gestor@levelupnexus.es | GESTOR_INVENTARIO | Inventario, proveedores, informes IA |
| cajero@levelupnexus.es | CAJERO | Ventas, tasador IA, bóveda retro |
| mkt@levelupnexus.es | MARKETING_ANALYST | Consultas NL2SQL, lectura de catálogo |
| contable@levelupnexus.es | CONTABLE | Facturación, albaranes por rango |

---

## Estructura del repositorio

```
NEXUS/
├── .github/
│   └── workflows/
│       ├── ci.yml          # Tests + JaCoCo + SonarQube en cada PR
│       └── deploy.yml      # Despliegue automático a VPS en merge a main
├── backend/                # Java 25 + Spring Boot 4
│   ├── src/main/java/com/nexus/
│   │   ├── ai/             # GeminiService, TasadorService, NL2SQLService...
│   │   ├── audit/          # AuditService
│   │   ├── auth/           # AuthController, AuthService
│   │   ├── controller/     # REST controllers
│   │   ├── model/          # Entidades JPA
│   │   ├── dto/            # Data Transfer Objects
│   │   ├── repository/     # Spring Data JPA repositories
│   │   ├── security/       # JwtUtil, JwtAuthFilter, SecurityConfig
│   │   └── service/        # Lógica de negocio
│   ├── src/main/resources/
│   │   └── db/migration/   # Migraciones Flyway V1-V6
│   └── src/test/           # Tests JUnit 5 + Mockito (52 casos)
├── frontend/               # React 18 + TypeScript + Vite
│   ├── src/
│   │   ├── components/     # Componentes reutilizables
│   │   ├── pages/          # Vistas completas
│   │   ├── services/       # Clientes HTTP (Axios)
│   │   ├── hooks/          # Custom hooks
│   │   ├── context/        # AuthContext, AiPanelContext
│   │   ├── types/          # Interfaces TypeScript
│   │   └── styles/         # Design system CSS (tokens)
│   └── .env.production     # URL de API para build de producción
├── infra/
│   └── caddy/
│       └── Caddyfile       # Configuración de proxy y TLS
├── sql/                    # Scripts SQL de referencia
├── docker-compose.yml      # Orquestación completa
├── sonar-project.properties
└── .env.example
```

---

## Módulos principales

**Control de stock ACID**
Las transacciones de stock se procesan mediante el Stored Procedure `sp_registrar_transaccion_stock`, que utiliza `SELECT FOR UPDATE` para garantizar consistencia bajo concurrencia. El backend invoca el SP mediante JDBC directo con `CallableStatement`.

**Módulo de IA (Gemini 2.0 Flash)**
- Tasador predictivo de artículos retro con precio mínimo, recomendado y máximo.
- Asistente de recompra que analiza descripciones en texto libre.
- Informe logístico automatizado con alertas de stock y plan de pedidos.
- Motor NL2SQL: traduce preguntas en español a SQL, valida que sea `SELECT`-only y ejecuta la consulta devolviendo una tabla dinámica.

**Mapa de almacén**
Visualización SVG interactiva del almacén con coloración por nivel de ocupación y actualización automática cada 30 segundos.

**Albaranes**
Generación de albaranes individuales por movimiento y albaranes consolidados por rango temporal, imprimibles directamente desde el navegador mediante `@media print`.

**Auditoría**
Triggers PostgreSQL registran automáticamente en `audit_log` cada inserción, modificación y borrado en tablas críticas, con los datos anteriores y posteriores en formato JSONB.

---

## CI/CD y despliegue

El pipeline está definido en dos workflows:

**ci.yml** — se activa en cada push y pull request:
1. Compila el backend con Java 25.
2. Ejecuta los 52 tests JUnit con `mvn verify`.
3. Genera el informe de cobertura con JaCoCo 0.8.13.
4. Envía el análisis a SonarQube (no bloquea el pipeline si el servidor no está disponible).

**deploy.yml** — se activa en cada merge a `main`:
1. Conecta al VPS por SSH.
2. Ejecuta `git pull origin main`.
3. Reconstruye y relanza los contenedores con `docker compose up -d --build`.

Los secretos necesarios en GitHub Actions:

| Secreto | Descripción |
|---|---|
| `VPS_HOST` | IP pública del servidor de producción |
| `VPS_USER` | Usuario SSH |
| `VPS_SSH_PRIVATE_KEY` | Clave privada RSA para acceso SSH |
| `SONAR_HOST_URL` | URL de la instancia SonarQube |
| `SONAR_TOKEN` | Token de proyecto de SonarQube |
| `AI_GEMINI_API_KEY` | Clave de API de Gemini |

---

## Calidad de código

La cobertura de tests se mide con JaCoCo 0.8.13 (compatible con Java 25). El análisis estático se realiza con SonarQube Community 10.x. Las clases excluidas del análisis son las entidades JPA, DTOs y la clase de arranque.

Resumen de tests unitarios:

| Clase | Tests |
|---|---|
| StockServiceTest | 12 |
| ClienteServiceTest | 12 |
| ProveedorServiceTest | 10 |
| NL2SQLServiceTest | 8 |
| AuthServiceTest | 5 |
| ProductoServiceTest | 5 |
| **Total** | **52** |

---

## Producción

El sistema está desplegado en:

| Servicio | URL |
|---|---|
| Aplicación | https://sibr.app |
| SonarQube | https://sonar.sibr.app |

El servidor es un VPS IONOS con 6 vCore, 8 GB RAM y 240 GB NVMe SSD. Caddy gestiona el certificado TLS mediante Let's Encrypt de forma automática.

---

## 👥 Autores

* **Sebastián Burneo Reyes** - *Arquitectura, Backend & DevOps (Despliegue)* - [GitHub](https://github.com/sburneodev) · [LinkedIn](TU_LINK_DE_LINKEDIN)
* **Desirée Cobo Batalla** - *Frontend Lead & Desarrollo Backend* - [GitHub](https://github.com/desireecampusfp) · [LinkedIn](LINK_DE_LINKEDIN_DE_DESIREE)
