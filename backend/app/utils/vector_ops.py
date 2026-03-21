"""Vector operations for cosine similarity without pgvector.

Uses a PostgreSQL SQL function for cosine similarity on DOUBLE PRECISION[] arrays.
This replaces pgvector's <=> operator.
"""

# SQL function to create in the database at startup
# Uses DOUBLE PRECISION because SQLAlchemy ARRAY(Float) maps to double precision[]
COSINE_SIMILARITY_FUNC = """
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
"""


def embedding_to_pg_array(embedding: list[float]) -> str:
    """Convert a Python list of floats to a PostgreSQL ARRAY literal string."""
    values = ",".join(f"{v:.6f}" for v in embedding)
    return f"ARRAY[{values}]::DOUBLE PRECISION[]"
