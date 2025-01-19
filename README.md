Hacker News Scraper

A real-time Hacker News scraping service that collects stories from both the front page and newest stories, with WebSocket support for live updates.

Features:
- Scrapes Hacker News front page and newest stories
- Real-time WebSocket updates for new stories
- REST API for story retrieval
- Duplicate story detection
- Rate limit handling
- Multi-page scraping support
- MySQL storage

Prerequisites:
- Node.js (v14 or higher)
- MySQL (v8.0 or higher)
- npm or yarn

Installation:
1. Clone the repository:
   git clone <repository-url>
   cd hacker-news-scraper

2. Install dependencies:
   npm install

3. Create a .env file with these variables:
   PORT=3000
   DB_HOST=localhost
   DB_USER=your_username
   DB_PASSWORD=your_password
   DB_NAME=hacker_news
   HN_URL=https://news.ycombinator.com
   FRONT_PAGE_INTERVAL=300000
   NEW_STORIES_INTERVAL=60000
   NUMBER_OF_PAGES_TO_SCRAPE=2

4. Initialize database:
   npm run init-db

Usage:
1. Start server (development):
   npm run dev

2. Start server (production):
   npm start

API Endpoints:
1. Health Check
   GET http://localhost:3000/api/health

2. Get Stories with pagination and filtering (default is type=latest)
   GET http://localhost:3000/api/stories?type=top&author=johndoe&title=javascript&limit=10&offset=20

3. Get Latest Stories (Last 5 Minutes)
   GET http://localhost:3000/api/stories/latest

WebSocket Usage:
const ws = new WebSocket('ws://localhost:3000?clientId=your_unique_id');
ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log('Received:', data);
};

Message Types:
1. Initial Connection:
{
    "type": "initial",
    "count": 0,
    "since": "2024-01-19T14:25:00.000Z",
    "timestamp": "2024-01-19T14:30:00.000Z"
}

2. Story Updates (Every 5 Minutes):
{
    "type": "update",
    "count": number of stories,
    "since": "2024-01-19T14:25:00.000Z",
    "interval": "5 minutes",
    "timestamp": "2024-01-19T14:30:00.000Z"
}

