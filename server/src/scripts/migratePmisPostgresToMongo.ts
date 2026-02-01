import { Client as PgClient } from 'pg';
import { MongoClient } from 'mongodb';

const env = process.env;

const pgConfig = {
  host: env.PGHOST || 'localhost',
  port: parseInt(env.PGPORT || '5432', 10),
  user: env.PGUSER || 'postgres',
  password: env.PGPASSWORD || 'root123',
  database: env.PGDATABASE || 'PMIS',
};

const mongoUrl = env.MONGO_URL || 'mongodb://localhost:27017';
const mongoDbName = env.MONGO_DB || 'pmis';

const args = new Set(process.argv.slice(2));
const shouldDrop = args.has('--drop');

const batchSize = parseInt(env.MONGO_BATCH_SIZE || '1000', 10);

function log(message: string) {
  // eslint-disable-next-line no-console
  console.log(message);
}

async function listTables(pgClient: PgClient) {
  const result = await pgClient.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name;",
  );
  return result.rows.map((r: { table_name: string }) => r.table_name);
}

async function copyTable(pgClient: PgClient, mongoDb: any, tableName: string) {
  const collection = mongoDb.collection(tableName);

  if (shouldDrop) {
    try {
      await collection.drop();
      log(`Dropped collection: ${tableName}`);
    } catch (err: any) {
      if (err?.codeName !== 'NamespaceNotFound') throw err;
    }
  }

  const { rows } = await pgClient.query(`SELECT * FROM "${tableName}";`);
  if (!rows.length) {
    log(`No rows in ${tableName}`);
    return;
  }

  let inserted = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const result = await collection.insertMany(batch, { ordered: false });
    inserted += result.insertedCount;
    log(`Inserted ${inserted}/${rows.length} into ${tableName}`);
  }
}

async function main() {
  log(`Postgres: ${pgConfig.host}:${pgConfig.port}/${pgConfig.database}`);
  log(`Mongo: ${mongoUrl} (db: ${mongoDbName})`);

  const pgClient = new PgClient(pgConfig);
  const mongoClient = new MongoClient(mongoUrl);

  await pgClient.connect();
  await mongoClient.connect();

  try {
    const mongoDb = mongoClient.db(mongoDbName);
    const tables = await listTables(pgClient);
    log(`Found ${tables.length} tables.`);

    for (const table of tables) {
      log(`Migrating ${table}...`);
      await copyTable(pgClient, mongoDb, table);
    }
  } finally {
    await pgClient.end();
    await mongoClient.close();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
