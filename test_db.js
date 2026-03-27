const postgres = require('postgres');

const sql = postgres('postgresql://finan_user:uz8vQdzhdNgGy7pWn6uMHvUab@localhost:5432/finan_db');

async function test() {
  try {
    await sql`SELECT 1`;
    console.log('Connected to finan_db!');
    process.exit(0);
  } catch(e) {
    console.log('Error:', e.message);
    // Try connecting to postgres default db to see if it's a db existence issue
    try {
      const sql2 = postgres('postgresql://finan_user:uz8vQdzhdNgGy7pWn6uMHvUab@localhost:5432/postgres');
      await sql2`SELECT 1`;
      console.log('Connected to postgres (default) - finan_db may not exist');
      process.exit(0);
    } catch(e2) {
      console.log('Also failed to connect to postgres:', e2.message);
      process.exit(1);
    }
  }
}

test();
