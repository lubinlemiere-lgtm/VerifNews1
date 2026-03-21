-- Check available vector extensions
SELECT name, default_version FROM pg_available_extensions WHERE name LIKE '%vector%';
