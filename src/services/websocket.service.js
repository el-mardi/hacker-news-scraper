const WebSocket = require('ws');
const url = require('url');
const pool = require('../db/database');

class WebSocketService {
    constructor(server) {
        this.wss = new WebSocket.Server({ 
            server,
            verifyClient: ({ req }, done) => {
                try {
                    const { query } = url.parse(req.url, true);
                    const clientId = query.clientId;

                    if (!clientId) {
                        done(false, 401, 'ClientId required');
                        return;
                    }

                    // Store clientId in request for later use
                    req.clientId = clientId;
                    done(true);

                } catch (error) {
                    console.error('Client verification error:', error);
                    done(false, 500, 'Internal Server Error');
                }
            }
        });
        
        this.clients = new Map();
        this.setupWebSocket();
        this.setupHeartbeat();
    }

    setupWebSocket() {
        this.wss.on('connection', this.handleConnection.bind(this));
    }

    setupHeartbeat() {
        setInterval(() => {
            this.wss.clients.forEach(ws => {
                if (ws.isAlive === false) {
                    return ws.terminate();
                }
                ws.isAlive = false;
                ws.ping();
            });
        }, 30000);
    }

    async handleConnection(ws, req) {
        try {
            const clientId = req.clientId;
            const subscribedAt = new Date();

            // Setup heartbeat
            ws.isAlive = true;
            ws.clientId = clientId;
            ws.on('pong', () => {
                ws.isAlive = true;
            });

            // Store client info in memory only
            this.clients.set(clientId, {
                ws,
                subscribedAt,
                lastCountTime: subscribedAt
            });

            // Send initial count
            await this.sendInitialCount(clientId);

            // Setup periodic updates every 5 minutes for this specific client
            const intervalId = setInterval(async () => {
                await this.sendStoryUpdate(clientId);
            }, 5 * 60 * 1000);

            ws.on('close', () => {
                clearInterval(intervalId);
                this.clients.delete(clientId);
                console.log(`Client ${clientId} disconnected`);
            });

        } catch (error) {
            console.error('WebSocket connection error:', error);
            ws.close(1011, 'Internal Server Error');
        }
    }

    async sendInitialCount(clientId) {
        const client = this.clients.get(clientId);
        if (!client || client.ws.readyState !== WebSocket.OPEN) return;

        try {
            // Get count of stories from subscription time
            const [stories] = await pool.query(
                'SELECT COUNT(*) as count FROM stories WHERE created_at >= ?',
                [client.subscribedAt]
            );

            client.ws.send(JSON.stringify({
                type: 'initial',
                count: stories[0].count,
                since: client.subscribedAt,
                timestamp: new Date()
            }));
        } catch (error) {
            console.error('Error sending initial count:', error);
        }
    }

    async sendStoryUpdate(clientId) {
        const client = this.clients.get(clientId);
        if (!client || client.ws.readyState !== WebSocket.OPEN) return;

        try {
            // Get count of stories in the last 5 minutes from last count time
            const [stories] = await pool.query(
                'SELECT COUNT(*) as count FROM stories WHERE created_at BETWEEN ? AND ?',
                [client.lastCountTime, new Date()]
            );

            // Update last count time
            client.lastCountTime = new Date();

            client.ws.send(JSON.stringify({
                type: 'update',
                count: stories[0].count,
                since: client.lastCountTime,
                interval: '5 minutes',
                timestamp: new Date()
            }));
        } catch (error) {
            console.error(`Error sending update to client ${clientId}:`, error);
        }
    }
}

module.exports = WebSocketService; 