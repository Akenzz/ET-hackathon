# 🌍 ET Backend — Environmental Intelligence Platform

[![Java Version](https://img.shields.io/badge/Java-21-orange?style=flat-square&logo=openjdk)](https://openjdk.org/)
[![Spring Boot](https://img.shields.io/badge/Spring_Boot-4.1.0-brightgreen?style=flat-square&logo=springboot)](https://spring.io/projects/spring-boot)
[![Database](https://img.shields.io/badge/PostgreSQL-16-blue?style=flat-square&logo=postgresql)](https://www.postgresql.org/)
[![API Docs](https://img.shields.io/badge/Swagger-OpenAPI_3.0-blueviolet?style=flat-square&logo=swagger)](http://localhost:8000/swagger-ui/index.html)

ET Backend is a high-performance Spring Boot service designed for real-time environmental monitoring, geospatial analysis, and machine learning (ML) feature engineering. 

The application serves as a **Feature Store** and real-time ingestion pipeline. It continuously pulls live air quality index (AQI) readings, localized atmospheric data, and static spatial details (highways, industrial activities) from multiple external providers. This data is unified and served through optimized REST APIs designed specifically for AI-ready predictive models.

---

## 🏗 System Architecture & Data Flow

The platform handles continuous background ingestion, relational persistence, and complex composite data assembly.

```
                         [ External APIs ]
                                │
   ┌────────────────────────────┼────────────────────────────┐
   │ (WAQI Search)              │ (WAQI Feed)                │ (Open-Meteo)
   ▼                            ▼                            ▼
[ StartupRunner ]        [ ReadingScheduler ]        [ WeatherScheduler ]
   │                            │                            │
   │ (Initial Setup)            │ (Hourly Polling)           │ (Hourly Polling)
   ▼                            ▼                            ▼
┌────────────────────────────────────────────────────────────────────────┐
│                          PostgreSQL Database                           │
│                                                                        │
│   ┌──────────────┐       ┌──────────────┐       ┌───────────────┐      │
│   │   Stations   │◄──────┤   Readings   │       │   Geofeatures │      │
│   └──────┬───────┘       └──────────────┘       └───────┬───────┘      │
│          │                                              │              │
│          └───────────────────────┬──────────────────────┘              │
│                                  ▼                                     │
│                          ┌──────────────┐                              │
│                          │   Weather    │                              │
│                          └──────────────┘                              │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
                       [ ForecastServiceImpl ]
                                   │
                                   ▼
                       ┌───────────────────────┐
                       │   Forecast Controller │
                       └───────────┬───────────┘
                                   │
                                   ▼
                    [ AI Model / Frontend Clients ]
```

### Ingestion Lifecycle:
1. **Bootstrap Phase**: On application startup, the `StartupRunner` checks the local `stations` database. If empty, it uses the **WAQI Search API** to fetch stations matching the configured city (e.g., `"Delhi"`) and saves them locally.
2. **Dynamic Polling & Ingestion**:
   - **`ReadingScheduler`**: Executes hourly to fetch atmospheric pollutants and overall AQI for the targeted stations from **WAQI Feed API**.
   - **`WeatherScheduler`**: Executes hourly to fetch localized, real-time meteorological metrics from **Open-Meteo API**.
3. **Manual Spatial Aggregation**:
   - **`GeoImportService`**: Queries the **Overpass API** to fetch OpenStreetMap metadata (major highways, industrial clusters) around the monitoring coordinates. This can be triggered on demand via administrative endpoints.
4. **Feature Assembly**:
   - **`ForecastService`**: Orchestrates database reads for historical time-series data and spatial characteristics, pairs them with live future forecasts from Open-Meteo, and packages them into a highly optimized JSON representation for immediate training or inference.

---

## 🔄 Polling & Schedulers

Background operations are managed through Spring’s task execution framework. Polling intervals are externally configurable via `application.properties`.

### 1. Startup Initializer (`StartupRunner`)
* **Behavior**: Implements `ApplicationRunner`.
* **Execution**: Fires exactly once on container start.
* **Logic**: Evaluates `stationRepository.count()`. If zero, triggers `StationImportService.importStations()` to resolve geographic positions and populate the core catalog.

### 2. Air Quality Scheduler (`ReadingScheduler`)
* **Cron/Interval**: Driven by `${scheduler.readings.fixed-rate}` (Default: hourly, `3600000ms`).
* **Initial Delay**: `60` seconds (avoids resource contention at startup).
* **Job Detail**: Loops over configured station IDs defined under `polling.station-ids`. It queries the WAQI feed, parses AQI values along with PM2.5, PM10, NO₂, SO₂, CO, and O₃ metrics, and saves them. It skips entries that share existing timestamps to prevent duplicates.

### 3. Weather Ingestion Scheduler (`WeatherScheduler`)
* **Cron/Interval**: Driven by `${scheduler.weather.fixed-rate}` (Default: hourly, `3600000ms`).
* **Initial Delay**: `120` seconds.
* **Job Detail**: Extracts exact latitudes and longitudes from local Station registers, pulls live weather elements (temperature, humidity, precipitation, wind speed, wind direction) from Open-Meteo, and records updates.

### 4. Geospatial Scheduler (`GeoScheduler`)
* **Configuration**: Commented out (`//@Component`) by default due to high external API load of Overpass servers, with `scheduler.geo.enabled=false`.
* **Alternative**: Exposes an administrative manual POST endpoint (`/geo/import/geo`) to perform on-demand geospatial evaluations via the OpenStreetMap infrastructure.

---

## 🗄 Database Persistence Model (PostgreSQL)

Entity designs optimize for read performance, incorporating precise database mappings and column constraints.

```
       ┌─────────────────┐                 ┌───────────────────┐
       │    STATIONS     │                 │     READINGS      │
       ├─────────────────┤                 ├───────────────────┤
       │ PK  stationId   │◄───────────────┐│ PK  id            │
       │     name        │                └┼─FK  station_id    │
       │     city        │                 │     timestamp     │
       │     latitude    │                 │     aqi           │
       │     longitude   │                 │     pm25, pm10    │
       └────────┬────────┘                 │     no2, so2      │
                │                          │     co, o3        │
                │                          └───────────────────┘
                │
                │   ┌───────────────────┐  │   ┌───────────────────┐
                │   │      WEATHER      │  │   │   GEO_FEATURES    │
                │   ├───────────────────┤  │   ├───────────────────┤
                └──┼─PK  id             │  └──┼─PK  id             │
                   │ FK  station_id     │     │ FK  station_id     │
                   │     fetchedAt      │     │     majorRoadsCount│
                   │     temperature    │     │     industrialCount│
                   │     humidity       │     │     construction   │
                   │     windSpeed/Dir  │     │     nearIndustDist │
                   │     precipitation  │     │     lastFetched    │
                   └────────────────────┘     └────────────────────┘
```

### 1. `stations` Table
Stores geographical and administrative metadata of the monitoring stations.
```sql
CREATE TABLE stations (
    station_id VARCHAR(255) NOT NULL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    city VARCHAR(255) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL
);
```

### 2. `readings` Table
Maintains time-series historical pollutant concentrations.
* **Constraints**: Implements a composite unique index on `(station_id, timestamp)` to maintain strict data integrity.
```sql
CREATE TABLE readings (
    id BIGSERIAL PRIMARY KEY,
    station_id VARCHAR(255) REFERENCES stations(station_id),
    timestamp TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    aqi INTEGER,
    pm25 DOUBLE PRECISION,
    pm10 DOUBLE PRECISION,
    no2 DOUBLE PRECISION,
    so2 DOUBLE PRECISION,
    co DOUBLE PRECISION,
    o3 DOUBLE PRECISION,
    CONSTRAINT unique_station_timestamp UNIQUE (station_id, timestamp)
);
```

### 3. `weather` Table
Contains the most recently fetched localized weather data.
```sql
CREATE TABLE weather (
    id BIGSERIAL PRIMARY KEY,
    station_id VARCHAR(255) REFERENCES stations(station_id),
    fetched_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    temperature DOUBLE PRECISION,
    humidity DOUBLE PRECISION,
    wind_speed DOUBLE PRECISION,
    wind_direction DOUBLE PRECISION,
    precipitation DOUBLE PRECISION
);
```

### 4. `geo_features` Table
Contains spatial variables extracted from OpenStreetMap.
```sql
CREATE TABLE geo_features (
    id BIGSERIAL PRIMARY KEY,
    station_id VARCHAR(255) REFERENCES stations(station_id) UNIQUE,
    major_roads_count INTEGER,
    construction_sites_count INTEGER,
    industrial_zones_count INTEGER,
    nearest_industrial_distance_km DOUBLE PRECISION,
    last_fetched TIMESTAMP WITHOUT TIME ZONE
);
```

---

## 🌐 External API Integrations

The system utilizes custom reactive `WebClient` configurations to interact with external providers:

### 1. World Air Quality Index (WAQI)
* **API Key**: Required via `${WAQI_TOKEN}`.
* **Endpoints**:
  - **Station Discovery**: `GET /search/?keyword={city}&token={token}`
  - **Station Feed**: `GET /feed/@{stationId}/?token={token}`
* **Mapped DTO**: Matches custom hierarchies under `dto/external/waqi`.

### 2. Open-Meteo
* **Authorization**: None (Public API).
* **Endpoint**: `GET /v1/forecast?latitude={lat}&longitude={lon}&current=...&hourly=...`
* **Features**: Requests concurrent observations for both current real-time metrics and dynamic multi-hour prognostic profiles.

### 3. Overpass API (OpenStreetMap)
* **Authorization**: None (Public API).
* **Endpoint**: `POST /api/interpreter`
* **Request Payload**: Custom Overpass QL searching for primary, secondary, trunk, and motorway roads within a 2000m radial proximity:
  ```osm
  [out:json];
  (
    way["highway"~"primary|secondary|trunk|motorway"](around:2000,lat,lon);
  );
  out count;
  ```

---

## 📡 REST API Reference

### 1. Forecast & Feature-Engine Store

#### `GET /forecast/{stationId}`
Returns a unified feature vector containing station details, historical air quality readings, and future weather forecasts to feed ML models.

* **Parameters**:
  | Name | Type | Description | Required | Default |
  | :--- | :--- | :--- | :--- | :--- |
  | `stationId` | Path variable (String) | Unique identifier of the station | Yes | - |
  | `horizon` | Query parameter (Integer) | Number of future weather forecast hours | Yes | - |
  | `history` | Query parameter (Integer) | Number of past air quality readings to retrieve | Yes | - |

* **Response Example** (`GET /forecast/2553?horizon=2&history=1`):
  ```json
  {
    "stationId": "2553",
    "stationName": "Anand Vihar, Delhi, India",
    "horizon": 2,
    "history": 1,
    "aqiHistory": [
      {
        "timestamp": "2026-07-13T12:00:00",
        "aqi": 164,
        "pm25": 81.0,
        "pm10": 142.0,
        "no2": 21.4,
        "co": 1.2,
        "so2": 8.0,
        "o3": 34.0
      }
    ],
    "weatherForecast": [
      {
        "timestamp": "2026-07-13T13:00:00",
        "temperature": 32.4,
        "humidity": 74.0,
        "windSpeed": 12.5,
        "windDirection": 140.0,
        "pressure": 1008.0,
        "precipitation": 0.0
      },
      {
        "timestamp": "2026-07-13T14:00:00",
        "temperature": 31.8,
        "humidity": 76.0,
        "windSpeed": 11.2,
        "windDirection": 145.0,
        "pressure": 1007.8,
        "precipitation": 0.2
      }
    ],
    "geoFeatures": {
      "majorRoadsCount": 24,
      "industrialZonesCount": 0,
      "constructionSitesCount": 0,
      "nearestIndustrialDistanceKm": 0.0
    }
  }
  ```

---

### 2. Stations API

#### `GET /stations`
Retrieves all registered stations.
* **Response**: `List<StationResponseDto>`

---

### 3. Readings API

#### `GET /readings/latest`
Gets the most recent pollutant reading for a station.
* **Parameters**: `stationId` (Query parameter)
* **Response**: `LatestReadingResponseDto`

#### `GET /readings/history`
Retrieves historical records within a specified window.
* **Parameters**:
  - `stationId` (Query parameter)
  - `from` (Query parameter - ISO format e.g. `2026-07-13T00:00:00`)
  - `to` (Query parameter - ISO format)
* **Response**: `List<HistoryReadingDto>`

---

### 4. Weather & Geospatial APIs

#### `GET /weather/latest`
Queries real-time meteorological conditions for given coordinates.
* **Parameters**: `lat` (Double), `lon` (Double)
* **Response**: `WeatherResponseDto`

#### `GET /geo/features`
Fetches geographic markers for coordinates.
* **Parameters**: `lat` (Double), `lon` (Double)
* **Response**: `GeoFeatureResponseDto`

#### `POST /geo/import/geo`
Triggers immediate administrative synchronization of OpenStreetMap data for all active stations.
* **Response**: `"done"`

---

### 5. Health Monitoring

#### `GET /health`
Returns system status and database storage health.
* **Response Example**:
  ```json
  {
    "status": "UP",
    "timestamp": "2026-07-13T14:24:12.184321",
    "stations": 1,
    "readings": 284,
    "weather": 1
  }
  ```

---

## ⚙ Configuration Reference

Configure properties in `src/main/resources/application.properties` or via environment variables:

| Property Key | Type | Description | Default / Example |
| :--- | :--- | :--- | :--- |
| `spring.datasource.url` | String | JDBC URL of PostgreSQL database | `jdbc:postgresql://${DATABASE_URL}:5432/neondb` |
| `spring.datasource.username`| String | Database User | `${DB_USER}` |
| `spring.datasource.password`| String | Database Password | `${DB_PASS}` |
| `server.port` | Integer| HTTP server port | `8000` |
| `waqi.base-url` | String | World Air Quality Index API host | `https://api.waqi.info` |
| `waqi.token` | String | WAQI API credential | `${WAQI_TOKEN}` |
| `waqi.city` | String | Base city for station ingestion | `Delhi` |
| `openmeteo.base-url` | String | Open-Meteo endpoint | `https://api.open-meteo.com` |
| `overpass.base-url` | String | OSM Overpass base interpreter | `https://overpass-api.de/api/interpreter` |
| `scheduler.readings.fixed-rate`| Long | Air Quality polling rate (ms) | `3600000` (1 hour) |
| `scheduler.weather.fixed-rate` | Long | Meteorology polling rate (ms) | `3600000` (1 hour) |
| `scheduler.geo.fixed-rate` | Long | Spatial polling rate (ms) | `86400000` (24 hours) |
| `scheduler.geo.enabled` | Boolean| Enable spatial scheduler daemon | `false` |
| `polling.station-ids` | List | Active station IDs to monitor | `2553` |

---

## 🛠 Tech Stack Details

* **Java Version**: 21
* **Spring Boot**: 4.1.0
* **Persistence**: Spring Data JPA & Hibernate
* **Database Driver**: PostgreSQL (`org.postgresql:postgresql`)
* **Reactive Web Client**: WebFlux (`spring-boot-starter-webflux`)
* **API Documentation**: SpringDoc OpenAPI UI / Swagger (`2.8.13`)
* **Quality & Boilerplate**: Project Lombok, Validation Starter (`spring-boot-starter-validation`)

---

## 🚀 Running Locally

### 1. Database Setup
Ensure you have a PostgreSQL database created and running:
```sql
CREATE DATABASE et_backend;
```

### 2. Environment Variables
Export the required variables in your terminal:
```bash
export DATABASE_URL=localhost
export DB_USER=your_postgres_user
export DB_PASS=your_postgres_password
export WAQI_TOKEN=your_waqi_api_token
```

### 3. Build & Run
Execute the application using Maven:
```bash
./mvnw spring-boot:run
```

The application will start on port `8000`.

### 4. Interactive Docs
Verify and interact with the endpoints using the Swagger UI:
```
http://localhost:8000/swagger-ui/index.html
```
