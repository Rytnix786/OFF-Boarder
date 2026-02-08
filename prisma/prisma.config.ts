export default {
  datasources: {
    db: {
      url: process.env.DIRECT_DATABASE_URL || 
           process.env.DATABASE_URL ||
           "postgresql://postgres.mcmqzwgaojgmrcmdsygh:spLavB1IJzRrybp9R0AsQT0xpSKYsxMCaV8bmlUVvHSVAhRwOKc2A1yjNpo3oyyM@aws-0-us-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true",
    },
  },
};
