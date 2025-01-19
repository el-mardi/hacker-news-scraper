class InMemoryQueue {
    constructor(name, interval) {
        this.name = name;
        this.interval = interval;
        this.processor = null;
        this.timer = null;
        this.listeners = {
            'completed': [],
            'error': []
        };
    }

    process(processor) {
        this.processor = processor;
    }

    on(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event].push(callback);
        }
    }

    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => callback(data));
        }
    }

    add(data, options) {
        if (options.repeat && options.repeat.every) {
            this.timer = setInterval(async () => {
                try {
                    const result = await this.processor({ data });
                    this.emit('completed', { id: Date.now(), result });
                } catch (error) {
                    this.emit('error', error);
                }
            }, options.repeat.every);
        }
    }

    stop() {
        if (this.timer) {
            clearInterval(this.timer);
        }
    }
}

// Create queue instances
const frontPageQueue = new InMemoryQueue('frontPageQueue');
const newestPageQueue = new InMemoryQueue('newestPageQueue');

// Error handling
frontPageQueue.on('error', (error) => {
    console.error('Front page queue error:', error);
});

newestPageQueue.on('error', (error) => {
    console.error('New stories queue error:', error);
});

// Success handling
frontPageQueue.on('completed', (job) => {
    console.log(`Front page job completed at ${new Date()}`);
});

newestPageQueue.on('completed', (job) => {
    console.log(`Newest page job completed at ${new Date()}`);
});

module.exports = {
    frontPageQueue,
    newestPageQueue
}; 