const express = require('express');
const router = express.Router();
const storiesService = require('../services/stories.service');

// Health check endpoint
router.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Get story count for last 5 minutes
router.get('/stories/count', async (req, res) => {
    try {
        const result = await storiesService.getRecentStoryCount();
        res.json({ 
            status: 'success',
            ...result
        });
    } catch (error) {
        console.error('Error getting story count:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to get story count'
        });
    }
});

// Get latest stories (last 5 minutes)
router.get('/stories/latest', async (req, res) => {
    try {
        const result = await storiesService.getLatestStories();
        res.json({ 
            status: 'success',
            ...result
        });
    } catch (error) {
        console.error('Error getting latest stories:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to get latest stories'
        });
    }
});

// Get stories with filters
router.get('/stories', async (req, res) => {
    try {
        const result = await storiesService.getStories(req.query);
        res.json({
            status: 'success',
            ...result,
            timestamp: new Date()
        });
    } catch (error) {
        console.error('Error getting filtered stories:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to get stories',
            error: error.message
        });
    }
});

module.exports = router; 