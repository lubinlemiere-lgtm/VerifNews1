-- Drop old REAL[] version if exists
DROP FUNCTION IF EXISTS cosine_similarity(REAL[], REAL[]);

-- Create DOUBLE PRECISION version (matches SQLAlchemy ARRAY(Float))
CREATE OR REPLACE FUNCTION cosine_similarity(a DOUBLE PRECISION[], b DOUBLE PRECISION[])
RETURNS DOUBLE PRECISION AS $$
DECLARE
    dot_product DOUBLE PRECISION := 0;
    norm_a DOUBLE PRECISION := 0;
    norm_b DOUBLE PRECISION := 0;
    i INT;
BEGIN
    IF array_length(a, 1) IS NULL OR array_length(b, 1) IS NULL THEN
        RETURN 0;
    END IF;
    IF array_length(a, 1) != array_length(b, 1) THEN
        RETURN 0;
    END IF;
    FOR i IN 1..array_length(a, 1) LOOP
        dot_product := dot_product + (a[i] * b[i]);
        norm_a := norm_a + (a[i] * a[i]);
        norm_b := norm_b + (b[i] * b[i]);
    END LOOP;
    IF norm_a = 0 OR norm_b = 0 THEN
        RETURN 0;
    END IF;
    RETURN dot_product / (sqrt(norm_a) * sqrt(norm_b));
END;
$$ LANGUAGE plpgsql IMMUTABLE STRICT;
