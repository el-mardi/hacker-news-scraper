CREATE DATABASE IF NOT EXISTS hacker_news;

USE hacker_news;

-- Stories table
CREATE TABLE IF NOT EXISTS stories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    url VARCHAR(1000),
    author VARCHAR(100),
    points INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_story (url(255), author)
);

-- Index for better query performance
CREATE INDEX idx_created_at ON stories(created_at); 