const db = require('./src/db');

async function check() {
    try {
        console.log('Checking database schema...');

        // Check constraint/columns on pages table
        const result = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'pages';
    `);

        console.log('Columns in "pages" table:');
        result.rows.forEach(r => console.log(` - ${r.column_name} (${r.data_type})`));

        const userIdCol = result.rows.find(r => r.column_name === 'user_id');
        if (userIdCol) {
            console.log('SUCCESS: "user_id" column exists.');
        } else {
            console.error('FAILURE: "user_id" column MISSING.');
        }

        // Check count of pages with vs without user_id
        const countRes = await db.query(`
        SELECT 
            COUNT(*) FILTER (WHERE user_id IS NULL) as null_user,
            COUNT(*) FILTER (WHERE user_id IS NOT NULL) as with_user,
            COUNT(*) as total
        FROM pages;
    `);
        console.log('Page Counts:', countRes.rows[0]);

    } catch (err) {
        console.error('Error running check:', err);
    } finally {
        process.exit();
    }
}

check();
