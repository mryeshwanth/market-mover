const fs = require('fs');
const path = require('path');
const { pool } = require('./database');

const initDatabase = async () => {
    try {
        console.log('Initializing database...');
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        await pool.query(schemaSql);
        console.log('Database initialization completed successfully.');
    } catch (error) {
        console.error('Error initializing database:', error);
        throw error;
    }
};

module.exports = { initDatabase };
