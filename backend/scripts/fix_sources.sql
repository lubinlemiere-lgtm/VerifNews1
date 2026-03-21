UPDATE sources SET url = 'https://news.google.com/rss/search?q=site:reuters.com+world&hl=en' WHERE name = 'Reuters World';
UPDATE sources SET url = 'https://news.google.com/rss/search?q=site:apnews.com+world&hl=en', name = 'AP News World' WHERE name = 'AP News';
SELECT name, url FROM sources WHERE name LIKE '%Reuters%' OR name LIKE '%AP News%';
