# Prisma + PostGIS geometry pattern

Prisma has **no native geometry type**. This project stores spatial data in
PostGIS and models geometry columns as Prisma `Unsupported(...)` fields.
Spatial reads and writes always go through parameterised `$queryRaw` /
`$executeRaw` — never through ordinary Prisma `create`/`update` of the
geometry column, and never via string-built SQL.

Canonical helpers: `src/lib/db/spatial.ts`.  
Canonical schema: `prisma/schema.prisma` (spatial models).  
Canonical migration: `prisma/migrations/0002_spatial_layers/migration.sql`.

## Modelling geometry in Prisma

```prisma
geom Unsupported("geometry(Point,4326)")
// or
geom Unsupported("geometry(MultiPolygon,4326)")
```

- The field exists so Prisma knows the column is present and does not drop it
  on future migrations.
- Prisma Client will **not** round-trip WKT/GeoJSON through this field in a
  useful way. Treat it as opaque in application code.
- Prefer `ST_SetSRID(ST_GeomFromText($wkt, 4326), 4326)` (or
  `ST_GeomFromText($wkt, 4326)`) when inserting.

## SRID

All stored geometries use **EPSG:4326 (WGS84)** — lon/lat in degrees. Do not
mix projected SRIDs in the reference layers.

## Parameterised spatial SQL only

Per `10-security-popia.mdc` and `61-database.mdc`, every spatial predicate uses
Prisma tagged templates (or an equivalent bound-parameter API). Example
pattern (helpers in `src/lib/db/spatial.ts` produce the same shape):

```ts
await tx.$executeRaw`
  INSERT INTO airports (id, "externalId", name, "isoCountry", source, geom)
  VALUES (
    ${id}, ${externalId}, ${name}, ${isoCountry}, ${source},
    ST_GeomFromText(${wkt}, 4326)
  )
`;

const nearby = await tx.$queryRaw<Array<{ id: string; metres: number }>>`
  SELECT id, ST_Distance(geom::geography, ST_GeomFromText(${wkt}, 4326)::geography) AS metres
  FROM health_facilities
  WHERE ST_DWithin(geom::geography, ST_GeomFromText(${wkt}, 4326)::geography, ${radiusMetres})
  ORDER BY metres
  LIMIT ${limit}
`;
```

Do **not** concatenate WKT, table names, or numeric literals into SQL strings.

## GiST indexes

Every geometry column gets a GiST index in the migration SQL, e.g.:

```sql
CREATE INDEX "airports_geom_gix" ON "airports" USING GIST ("geom");
```

Prisma cannot declare GiST indexes in `schema.prisma`; they live only in the
hand-authored migration (same approach as Foundations’ RLS policies).

## Shared / global tables — no RLS

`admin_boundaries`, `airports`, `health_facilities`, `places`, and
`spatial_dataset_refreshes` are **shared reference data** (one source of truth
for all tenants), same future posture as `Territory`. They have:

- no `clientId`
- **no** Row-Level Security policies

Tenant isolation still applies to client-scoped overlays (org pins, etc.) via
Prisma `where` + RLS on those tables.

## Source metadata

Each import records provenance on `spatial_dataset_refreshes`:

| Column            | Purpose                                                               |
| ----------------- | --------------------------------------------------------------------- |
| `source`          | Stable key: `geoboundaries`, `ourairports`, `healthsites`, `geonames` |
| `lastRefreshedAt` | When this load completed                                              |
| `checksum`        | Optional content fingerprint of the ingested payload                  |
| `rowCount`        | Rows accepted after validation                                        |

Feature rows also carry `source` and optional `sourceUpdatedAt` / `refreshId`.

## Attribution / licences

| Dataset              | Licence       | Notes                             |
| -------------------- | ------------- | --------------------------------- |
| geoBoundaries (ADM1) | CC BY 4.0     | Commercial-safe with attribution  |
| OurAirports          | Public domain | Airstrip-level completeness       |
| healthsites.io       | ODbL          | Attribution required; OSM-sourced |
| GeoNames             | CC BY         | Town labels / search              |

Fixtures in-repo are tiny public samples only — never real client or
insured-person data.

## Country codes

| Source         | Code form stored in `isoCountry`                         |
| -------------- | -------------------------------------------------------- |
| geoBoundaries  | ISO 3166-1 **alpha-3** (`shapeGroup` / ADM0, e.g. `ZAF`) |
| OurAirports    | ISO 3166-1 **alpha-2** (`iso_country`, e.g. `ZA`)        |
| healthsites.io | ISO 3166-1 **alpha-3** when present in properties        |
| GeoNames       | ISO 3166-1 **alpha-2** (`country code` column)           |

Callers that join across sources must normalise alpha-2 ↔ alpha-3 themselves;
do not silently rewrite codes inside the loaders.

## When a live DB exists

1. Provision Neon (or local Docker PostGIS from `docker-compose.yml`).
2. Reconcile hand-authored migrations with
   `npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script`
   before the first `prisma migrate deploy` (same note as `0001_init`).
3. Wire a thin CLI/Inngest job that calls the pure loaders, then the insert
   helpers in `src/lib/db/spatial.ts` via `$executeRaw`.
