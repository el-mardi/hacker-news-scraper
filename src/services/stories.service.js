const pool = require('../db/database');

class StoriesService {
    /**
     * Get latest stories from the last 5 minutes
     */
    async getLatestStories() {
        const [stories] = await pool.query(
            `SELECT * FROM stories 
             WHERE created_at >= NOW() - INTERVAL 5 MINUTE 
             ORDER BY created_at DESC`
        );
        
        return {
            count: stories.length,
            stories,
            timestamp: new Date()
        };
    }

    /**
     * Get stories with filters and pagination
     */
    async getStories({ type = 'latest', author, title, limit = 50, offset = 0 }) {
        let query = 'SELECT * FROM stories';
        const queryParams = [];
        const conditions = [];

        // Add filters
        if (author) {
            conditions.push('author = ?');
            queryParams.push(author);
        }

        if (title) {
            conditions.push('title LIKE ?');
            queryParams.push(`%${title}%`);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        // Add ordering
        if (type === 'top') {
            query += ' ORDER BY points DESC';
        } else {
            query += ' ORDER BY created_at DESC';
        }

        // Add pagination
        query += ' LIMIT ? OFFSET ?';
        queryParams.push(parseInt(limit), parseInt(offset));

        // Execute query
        const [stories] = await pool.query(query, queryParams);
        
        // Get total count for pagination
        const [countResult] = await pool.query(
            `SELECT COUNT(*) as total FROM stories ${conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''}`,
            conditions.length > 0 ? queryParams.slice(0, -2) : []
        );

        return {
            count: stories.length,
            total: countResult[0].total,
            page: Math.floor(offset / limit) + 1,
            totalPages: Math.ceil(countResult[0].total / limit),
            stories,
            filters: {
                type,
                author,
                title,
                limit,
                offset
            }
        };
    }

    /**
     * Get story count for the last 5 minutes
     */
    async getRecentStoryCount() {
        const [result] = await pool.query(
            'SELECT COUNT(*) as count FROM stories WHERE created_at >= NOW() - INTERVAL 5 MINUTE'
        );
        
        return {
            count: result[0].count,
            timestamp: new Date()
        };
    }
}

module.exports = new StoriesService(); 