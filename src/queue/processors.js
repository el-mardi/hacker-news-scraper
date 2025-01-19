const cheerio = require('cheerio');
const axios = require('axios');
const pool = require('../db/database');
const chalk = require('chalk');
require('dotenv').config();

const PAGES_TO_SCRAPE = process.env.NUMBER_OF_PAGES_TO_SCRAPE;  // Number of pages to scrape

// Color themes
const theme = {
    queue: {
        front: chalk.blue,
        new: chalk.green
    },
    status: {
        success: chalk.green,
        error: chalk.red,
        info: chalk.cyan,
        warning: chalk.yellow
    }
};

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_DELAY = 6000; // 6 seconds

async function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function scrapeWithRetry(url, queueName, retryCount = 0) {
    const queueColor = queueName.includes('Front') ? theme.queue.front : theme.queue.new;
    try {
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Cache-Control': 'max-age=0'
            },
            timeout: 10000 // 10 second timeout
        });
        return data;
    } catch (error) {
        if ((error.response?.status === 503 || error.code === 'ECONNRESET') && retryCount < MAX_RETRIES) {
            const delay = INITIAL_DELAY * Math.pow(2, retryCount);
            console.log(
                queueColor(`[${queueName}] `) + 
                theme.status.warning(`Rate limited. Retrying in ${delay/1000} seconds... (Attempt ${retryCount + 1}/${MAX_RETRIES})`)
            );
            await wait(delay);
            return scrapeWithRetry(url, queueName, retryCount + 1);
        }
        throw error;
    }
}

async function scrapeStoriesFromPage(url, page, queueName) {
    const pageUrl = page === 1 ? url : `${url}?p=${page}`;
    const queueColor = queueName.includes('Front') ? theme.queue.front : theme.queue.new;
    
    console.log(queueColor(`[${queueName}] `) + theme.status.info(`Scraping page ${page} from ${pageUrl}`));
    
    const data = await scrapeWithRetry(pageUrl, queueName);
    const $ = cheerio.load(data);
    const stories = [];

    $('.athing').each((i, element) => {
        const $element = $(element);
        const $subtext = $element.next('tr').find('.subtext');
        
        const pointsText = $subtext.find('.score').text();
        const points = pointsText ? parseInt(pointsText) : 0;
        
        const authorElement = $subtext.find('a.hnuser');
        const author = authorElement.length ? authorElement.text().trim() : 'Unknown';
        
        const story = {
            title: $element.find('.titleline > a').text().trim(),
            url: $element.find('.titleline > a').attr('href'),
            author,
            points,
            created_at: new Date()
        };

        if (author !== 'Unknown') {
            console.log(
                queueColor(`[${queueName}] `) + 
                theme.status.success('Found: ') + 
                `"${story.title.slice(0, 50)}..." by ` + 
                chalk.yellow(story.author) + 
                ` (${chalk.cyan(story.points)} points)`
            );
        } else {
            console.log(
                queueColor(`[${queueName}] `) + 
                theme.status.warning('Skipped: ') + 
                `"${story.title.slice(0, 50)}..." (no author)`
            );
        }

        stories.push(story);
    });

    return stories;
}

async function scrapeStories(url, queueName) {
    const queueColor = queueName.includes('Front') ? theme.queue.front : theme.queue.new;
    try {
        console.log(queueColor(`[${queueName}] `) + theme.status.info('Starting multi-page scraping'));
        await wait(2000); // Initial delay

        let allStories = [];
        for (let page = 1; page <= PAGES_TO_SCRAPE; page++) {
            const stories = await scrapeStoriesFromPage(url, page, queueName);
            allStories = allStories.concat(stories);
            
            // Wait between pages to avoid rate limiting
            if (page < PAGES_TO_SCRAPE) {
                console.log(queueColor(`[${queueName}] `) + theme.status.info(`Waiting before scraping next page...`));
                await wait(INITIAL_DELAY);
            }
        }

        console.log(queueColor(`[${queueName}] `) + 
            theme.status.success(`Completed scraping ${PAGES_TO_SCRAPE} pages, found total of ${allStories.length} stories`));
        
        return allStories;
    } catch (error) {
        console.error(queueColor(`[${queueName}] `) + theme.status.error('Scraping error:'), error.message);
        throw error;
    }
}

async function saveStories(stories, queueName) {
    const queueColor = queueName.includes('Front') ? theme.queue.front : theme.queue.new;
    console.log(queueColor(`[${queueName}] `) + theme.status.info('Starting database save operation...'));
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        
        // First, remove duplicates from the stories array itself
        const uniqueStories = Array.from(new Map(
            stories
                .filter(story => story.url && story.author)
                .map(story => [`${story.url}:${story.author}`, story])
        ).values());

        console.log(
            queueColor(`[${queueName}] `) + 
            theme.status.info(`Found ${stories.length} stories, ${stories.length - uniqueStories.length} duplicates removed`)
        );

        // Then check against database
        try {
            const [existingStories] = await connection.query(
                'SELECT url, author FROM stories WHERE (url, author) IN (?)',
                [uniqueStories.map(story => [story.url, story.author])]
            );

            // Create a Set of existing story keys
            const existingSet = new Set(
                existingStories.map(story => `${story.url}:${story.author}`)
            );

            // Filter out database duplicates
            const newStories = uniqueStories.filter(
                story => !existingSet.has(`${story.url}:${story.author}`)
            );

            if (newStories.length > 0) {
                try {
                    await connection.query(
                        `INSERT INTO stories 
                        (title, url, author, points, created_at) 
                        VALUES ?`,
                        [newStories.map(story => [
                            story.title,
                            story.url,
                            story.author,
                            story.points,
                            story.created_at
                        ])]
                    );

                    console.log(
                        queueColor(`[${queueName}] `) + 
                        theme.status.success(`Database result: ${newStories.length} new stories saved, `) +
                        theme.status.warning(`${uniqueStories.length - newStories.length} existing stories skipped`)
                    );
                } catch (insertError) {
                    console.error(queueColor(`[${queueName}] `) + theme.status.error('Insert error:'), insertError.message);
                }
            } else {
                console.log(
                    queueColor(`[${queueName}] `) + 
                    theme.status.warning('All stories already exist in database, nothing to save')
                );
            }
            
            await connection.commit();
            console.log(queueColor(`[${queueName}] `) + theme.status.success('Transaction committed successfully'));
        } catch (queryError) {
            await connection.rollback();
            console.error(queueColor(`[${queueName}] `) + theme.status.error('Query error:'), queryError.message);
        }
    } catch (error) {
        console.error(queueColor(`[${queueName}] `) + theme.status.error('Database error:'), error.message);
    } finally {
        connection.release();
        console.log(queueColor(`[${queueName}] `) + theme.status.info('Database connection released'));
    }
}

module.exports = {
    processFrontPage: async (job) => {
        console.log('\n' + chalk.blue.bold('=== FRONT PAGE QUEUE STARTED ==='));
        console.log(theme.queue.front('[Front Page] ') + theme.status.info(`Starting job at ${new Date().toISOString()}`));
        try {
            const stories = await scrapeStories(`${process.env.HN_URL}/front`, 'Front Page');
            await saveStories(stories, 'Front Page');
            console.log(theme.queue.front('[Front Page] ') + theme.status.success(`Job completed successfully at ${new Date().toISOString()}`));
            console.log(chalk.blue.bold('=== FRONT PAGE QUEUE FINISHED ===\n'));
            return stories;
        } catch (error) {
            console.error(theme.queue.front('[Front Page] ') + theme.status.error('Job error:'), error.message);
            console.log(chalk.yellow.bold('=== FRONT PAGE QUEUE CONTINUING ===\n'));
            // Return empty array instead of throwing
            return [];
        }
    },
    
    processNewStories: async (job) => {
        console.log('\n' + chalk.green.bold('=== NEW STORIES QUEUE STARTED ==='));
        console.log(theme.queue.new('[New Stories] ') + theme.status.info(`Starting job at ${new Date().toISOString()}`));
        try {
            const stories = await scrapeStories(`${process.env.HN_URL}/newest`, 'New Stories');
            await saveStories(stories, 'New Stories');
            console.log(theme.queue.new('[New Stories] ') + theme.status.success(`Job completed successfully at ${new Date().toISOString()}`));
            console.log(chalk.green.bold('=== NEW STORIES QUEUE FINISHED ===\n'));
            return stories;
        } catch (error) {
            console.error(theme.queue.new('[New Stories] ') + theme.status.error('Job error:'), error.message);
            console.log(chalk.yellow.bold('=== NEW STORIES QUEUE CONTINUING ===\n'));
            // Return empty array instead of throwing
            return [];
        }
    }
}; 