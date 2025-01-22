import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.POSTGRES_URI,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});
