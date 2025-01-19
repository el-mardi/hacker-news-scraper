CREATE DATABASE IF NOT EXISTS hacker_news;

-- Explicitly set charset and collation for MySQL 5.6 compatibility
ALTER DATABASE hacker_news CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Index for better query performance
CREATE INDEX idx_created_at ON stories(created_at); 