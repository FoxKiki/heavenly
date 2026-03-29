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
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `author_identifier` (`author_identifier`),
  KEY `created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
