const { Pool } = require('pg');
require('dotenv').config();

async function testConnection() {
    const connectionString = process.env.DATABASE_URL;
    
    if (!connectionString) {
        console.error('❌ DATABASE_URL not found in environment variables!');
        console.log('\nPlease set DATABASE_URL in one of these ways:');
        console.log('1. Create a .env file in the server directory with:');
        console.log('   DATABASE_URL=postgresql://user:password@host:port/database');
        console.log('\n2. Or export it in terminal:');
        console.log('   export DATABASE_URL="postgresql://user:password@host:port/database"');
        process.exit(1);
    }
    
    console.log('Testing database connection...\n');
    console.log('Connection string:', connectionString.replace(/:[^:@]+@/, ':****@')); // Hide password
    
    const pool = new Pool({
        connectionString: connectionString,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    try {
        const result = await pool.query('SELECT NOW() as current_time, version() as pg_version');
        console.log('✅ Connection successful!');
        console.log('   Current time:', result.rows[0].current_time);
        console.log('   PostgreSQL version:', result.rows[0].pg_version.split(' ')[0] + ' ' + result.rows[0].pg_version.split(' ')[1]);
        
        // Test if price_captures table exists
        const tableCheck = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'price_captures'
            );
        `);
        
        if (tableCheck.rows[0].exists) {
            console.log('   ✅ price_captures table exists');
            
            // Get row count
            const countResult = await pool.query('SELECT COUNT(*) as count FROM price_captures');
            console.log('   📊 Total records in price_captures:', countResult.rows[0].count);
        } else {
            console.log('   ⚠️  price_captures table does not exist');
        }
        
        await pool.end();
        process.exit(0);
    } catch (error) {
        console.error('❌ Connection failed!');
        console.error('Error:', error.message);
        console.error('\nCommon issues:');
        console.error('1. Check if database server is running');
        console.error('2. Verify host, port, username, password are correct');
        console.error('3. Check if database name exists');
        console.error('4. Verify network/firewall settings');
        await pool.end();
        process.exit(1);
    }
}

testConnection();

