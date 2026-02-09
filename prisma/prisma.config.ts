export default {
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 
           "postgresql://postgres:password@localhost:5432/offboarder",
    },
  },
};
