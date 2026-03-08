ALTER TABLE `spaced_repetition_rules` MODIFY COLUMN `filter_type` enum('category','tag','recent_days','date_range') NOT NULL;
