require('dotenv').config();
const express = require('express');
const pool = require('./db/database');
const apiRoutes = require('./routes/api');
const { frontPageQueue, newestPageQueue } = require('./queue/queues');
const { processFrontPage, processNewStories } = require('./queue/processors');
const WebSocketService = require('./services/websocket.service');

const app = express();
app.use(express.json());

// Use API routes
app.use('/api', apiRoutes);

// Set up queue processors
frontPageQueue.process(processFrontPage);
newestPageQueue.process(processNewStories);

// Schedule recurring jobs
frontPageQueue.add({}, {
    repeat: {
        every: parseInt(process.env.FRONT_PAGE_INTERVAL)
    }
});

newestPageQueue.add({}, {
    repeat: {
        every: parseInt(process.env.NEW_STORIES_INTERVAL)
    }
});

const server = app.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`);
});

// Initialize WebSocket service
new WebSocketService(server); 