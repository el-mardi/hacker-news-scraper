# Hacker News Scraper

A real-time Hacker News scraping service that collects stories from both the front page and newest stories, with WebSocket support for live updates.

## Features
- 🔄 Scrapes Hacker News front page and newest stories
- ⚡ Real-time WebSocket updates for new stories 
- 🚀 REST API for story retrieval
- 🔍 Duplicate story detection
- 🛡️ Rate limit handling
- 📚 Multi-page scraping support
- 💾 MySQL storage

## Prerequisites
- Node.js 
- MySQL (v5.6 or higher) - Required for proper TIMESTAMP and UTF8 support
- npm or yarn

## Installation
1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd hacker-news-scraper
   ```

2. Install dependencies:
   ```bash
   # Using npm
   npm install
   
   # OR using yarn
   yarn install
   ```

3. Create a `.env` file with these variables:
   ```env
   PORT=3000
   DB_HOST=localhost
   DB_USER=your_username
   DB_PASSWORD=your_password
   DB_NAME=hacker_news
   HN_URL=https://news.ycombinator.com
   FRONT_PAGE_INTERVAL=300000
   NEW_STORIES_INTERVAL=60000
   NUMBER_OF_PAGES_TO_SCRAPE=2
   ```

4. Initialize database:
   ```bash
   # Using npm
   npm run init-db
   
   # OR using yarn
   yarn init-db
   ```

## Usage
1. Start server (development):
   ```bash
   # Using npm
   npm run dev
   
   # OR using yarn
   yarn dev
   ```

2. Start server (production):
   ```bash
   # Using npm
   npm start
   
   # OR using yarn
   yarn start
   ```

## API Endpoints

1. Health Check
   ```http
   GET http://localhost:3000/api/health
   ```
   Response:
   ```json
   {
       "status": "ok"
   }
   ```

2. Get Stories with pagination and filtering (default is type=latest)
   ```http
   GET http://localhost:3000/api/stories?type=top&author=johndoe&title=javascript&limit=10&offset=20
   ```
   Response:
   ```json
   {
       "status": "success",
       "count": 10,
       "total": 45,
       "page": 3,
       "totalPages": 5,
       "stories": [
           {
               "id": 1,
               "title": "Example Story",
               "url": "https://example.com/story",
               "author": "johndoe",
               "points": 100,
               "created_at": "2024-01-19T14:25:00.000Z"
           },
           // ... more stories
       ],
       "filters": {
           "type": "top",
           "author": "johndoe",
           "title": "javascript",
           "limit": 10,
           "offset": 20
       },
       "timestamp": "2024-01-19T14:30:00.000Z"
   }
   ```

3. Get Latest Stories (Last 5 Minutes)
   ```http
   GET http://localhost:3000/api/stories/latest
   ```
   Response:
   ```json
   {
       "status": "success",
       "count": 5,
       "stories": [
           {
               "id": 1,
               "title": "Latest Story",
               "url": "https://example.com/latest",
               "author": "johndoe",
               "points": 50,
               "created_at": "2024-01-19T14:29:00.000Z"
           },
           // ... more stories
       ],
       "timestamp": "2024-01-19T14:30:00.000Z"
   }
   ```

4. Get Story Count (Last 5 Minutes)
   ```http
   GET http://localhost:3000/api/stories/count
   ```
   Response:
   ```json
   {
       "status": "success",
       "count": 15,
       "timestamp": "2024-01-19T14:30:00.000Z"
   }
   ```

### Error Responses
All endpoints return the following format for errors:
```json
{
    "status": "error",
    "message": "Error description",
    "error": "Detailed error message (only in development)"
}
```

## WebSocket Usage:
   ```bash
   const ws = new WebSocket('ws://localhost:3000?clientId=your_unique_id');
   ws.onmessage = (event) => {
       const data = JSON.parse(event.data);
       console.log('Received:', data);
   };
   ```

Message Types:
1. Initial Connection:
   ```bash
   {
       "type": "initial",
       "count": 0,
       "since": "2024-01-19T14:25:00.000Z",
       "timestamp": "2024-01-19T14:30:00.000Z"
   }
   ```

2. Story Updates (Every 5 Minutes):
   ```bash
   {
       "type": "update",
       "count": number of stories,
       "since": "2024-01-19T14:25:00.000Z",
       "interval": "5 minutes",
       "timestamp": "2024-01-19T14:30:00.000Z"
   }

