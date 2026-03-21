SELECT 'CATEGORIES:' as info;
SELECT id, slug, name FROM categories ORDER BY id;
SELECT '' as info;
SELECT 'SOURCES:' as info;
SELECT s.id, s.name, s.source_type, s.reliability_tier, c.slug as category
FROM sources s JOIN categories c ON s.category_id = c.id
ORDER BY c.slug, s.reliability_tier;
