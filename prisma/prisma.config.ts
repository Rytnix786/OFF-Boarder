const databaseUrl =
  process.env.DIRECT_DATABASE_URL ||
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/postgres";

export default {
  datasources: {
    db: {
      url: databaseUrl,
    },
  },
};
