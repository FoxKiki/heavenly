-- Heavenly full reset for clean server tests
-- Warning: this removes all Heavenly accounts, profiles and news data.

SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE `heavenly_news`;
TRUNCATE TABLE `heavenly_post_comments`;
TRUNCATE TABLE `heavenly_posts`;
TRUNCATE TABLE `heavenly_profiles`;
TRUNCATE TABLE `heavenly_accounts`;

SET FOREIGN_KEY_CHECKS = 1;
