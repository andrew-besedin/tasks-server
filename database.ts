import { Sequelize } from "sequelize";

export const sequelize = new Sequelize(
  process.env.POSTGRES_DB || "tasks",
  process.env.POSTGRES_USER || "postgres",
  process.env.POSTGRES_PASSWORD || "postgres",
  {
    host: process.env.POSTGRES_HOST || "localhost",
    port: Number(process.env.POSTGRES_PORT) || 5432,
    dialect: "postgres",
    logging: false,
    pool: {
      max: Number(process.env.POSTGRES_POOL_MAX) || 10,
      min: Number(process.env.POSTGRES_POOL_MIN) || 0,
      acquire: 30000,
      idle: 10000,
    },
  },
);

async function connect(attempts = 15, delayMs = 2000) {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      await sequelize.authenticate();
      return;
    } catch (err) {
      if (attempt === attempts) {
        throw err;
      }
      console.log(`Database is not ready, retrying (${attempt}/${attempts})`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}

export async function initDatabase() {
  await connect();
  await sequelize.sync();
}
