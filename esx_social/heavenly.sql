-- Heavenly Social Network Database Setup
-- Run this SQL script to create the necessary tables for the Heavenly resource

-- Accounts table for login/registration
CREATE TABLE IF NOT EXISTS `heavenly_accounts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `identifier` varchar(60) NOT NULL,
  `username` varchar(50) NOT NULL UNIQUE,
  `password` varchar(255) NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  KEY `identifier` (`identifier`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Profiles table for user profiles
CREATE TABLE IF NOT EXISTS `heavenly_profiles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `identifier` varchar(60) NOT NULL UNIQUE,
  `status` text DEFAULT '',
  `theme_json` text DEFAULT '{}',
  `avatar` varchar(255) DEFAULT NULL,
  `cover` varchar(255) DEFAULT NULL,
  `friends_json` text DEFAULT '[]',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `identifier` (`identifier`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `heavenly_news` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `author_identifier` varchar(60) NOT NULL,
  `author_username` varchar(50) NOT NULL,
  `title` varchar(120) NOT NULL,
  `content` text NOT NULL,
  `category` varchar(60) NOT NULL DEFAULT 'Allgemein',
  `media_json` longtext DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `author_identifier` (`author_identifier`),
  KEY `created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `heavenly_posts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `author_identifier` varchar(60) NOT NULL,
  `author_username` varchar(50) NOT NULL,
  `feed_type` varchar(20) NOT NULL DEFAULT 'home',
  `profile_owner_username` varchar(50) DEFAULT NULL,
  `content` text NOT NULL,
  `images_json` longtext DEFAULT NULL,
  `mentions_json` text DEFAULT NULL,
  `likes_json` text DEFAULT NULL,
  `visibility` varchar(20) NOT NULL DEFAULT 'public',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `author_identifier` (`author_identifier`),
  KEY `feed_type` (`feed_type`),
  KEY `profile_owner_username` (`profile_owner_username`),
  KEY `created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `heavenly_post_comments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `post_id` int(11) NOT NULL,
  `author_identifier` varchar(60) NOT NULL,
  `author_username` varchar(50) NOT NULL,
  `content` text NOT NULL,
  `images_json` longtext DEFAULT NULL,
  `mentions_json` text DEFAULT NULL,
  `likes_json` text DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `post_id` (`post_id`),
  KEY `author_identifier` (`author_identifier`),
  KEY `created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
