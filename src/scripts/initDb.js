require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

async function initializeDatabase() {
    const config = {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD
    };

    try {
        // Read SQL file
        const sqlFile = await fs.readFile(path.join(__dirname, '../../init.sql'), 'utf8');
        
        // Create connection
        const connection = await mysql.createConnection(config);
        console.log('Connected to MySQL server');

        // Split SQL file into separate commands
        const commands = sqlFile.split(';').filter(cmd => cmd.trim());

        // Execute each command
        for (const command of commands) {
            if (command.trim()) {
                await connection.query(command);
                console.log('Executed:', command.slice(0, 50) + '...');
            }
        }

        console.log('Database initialization completed successfully');
        await connection.end();
        process.exit(0);

    } catch (error) {
        console.error('Error initializing database:', error);
        process.exit(1);
    }
}

initializeDatabase(); 