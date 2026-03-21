"""Quick API smoke test."""

import httpx
import sys

BASE = "http://localhost:8000"


def main():
    client = httpx.Client(base_url=BASE, timeout=15, follow_redirects=True)

    # 1. Health check
    print("=== Health ===")
    r = client.get("/health")
    print(f"  Status: {r.status_code} | {r.json()}")

    # 2. Pipeline health
    print("\n=== Pipeline Health ===")
    r = client.get("/health/pipeline")
    data = r.json()
    print(f"  Scheduler running: {data['scheduler_running']}")
    for job in data["jobs"]:
        print(f"  Job: {job['id']} -> next: {job['next_run']}")

    # 3. Categories
    print("\n=== Categories ===")
    r = client.get("/api/v1/categories")
    print(f"  Status: {r.status_code}")
    if r.status_code == 200:
        cats = r.json()
        for c in cats:
            print(f"  {c['slug']}: {c['name']} ({c['icon']})")
    else:
        print(f"  Body: {r.text[:300]}")

    # 4. Register
    print("\n=== Register ===")
    r = client.post("/api/v1/auth/register", json={
        "email": "test@verifnews.com",
        "password": "TestPass123!",
        "display_name": "Test User",
    })
    print(f"  Status: {r.status_code}")
    access_token = None
    if r.status_code == 200:
        tokens = r.json()
        access_token = tokens["access_token"]
        print(f"  Access token: {access_token[:40]}...")
    else:
        print(f"  Response: {r.text[:200]}")
        # Try login instead
        print("\n=== Login (user may already exist) ===")
        r = client.post("/api/v1/auth/login", json={
            "email": "test@verifnews.com",
            "password": "TestPass123!",
        })
        print(f"  Status: {r.status_code}")
        if r.status_code == 200:
            tokens = r.json()
            access_token = tokens["access_token"]
            print(f"  Access token: {access_token[:40]}...")
        else:
            print(f"  Error: {r.text[:200]}")

    # 5. Get current user
    if access_token:
        print("\n=== Get Me ===")
        r = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {access_token}"})
        print(f"  Status: {r.status_code}")
        if r.status_code == 200:
            user = r.json()
            print(f"  User: {user.get('email')} ({user.get('display_name')})")

    # 6. Feed latest
    print("\n=== Feed Latest ===")
    r = client.get("/api/v1/feed/latest")
    print(f"  Status: {r.status_code}")
    if r.status_code == 200:
        data = r.json()
        items = data.get("items", data) if isinstance(data, dict) else data
        print(f"  Articles: {len(items)}")

    # 7. Category sources
    print("\n=== Category Sources (astronomy) ===")
    r = client.get("/api/v1/categories/astronomy/sources")
    print(f"  Status: {r.status_code}")
    if r.status_code == 200:
        sources = r.json()
        for s in sources:
            print(f"  {s['name']} (tier {s.get('reliability_tier', '?')})")

    # 8. Swagger docs
    print("\n=== API Docs ===")
    r = client.get("/docs")
    print(f"  Swagger UI: {r.status_code}")

    # 9. OpenAPI schema
    print("\n=== OpenAPI Schema ===")
    r = client.get("/openapi.json")
    if r.status_code == 200:
        schema = r.json()
        paths = list(schema.get("paths", {}).keys())
        print(f"  Endpoints: {len(paths)}")
        for p in paths:
            methods = list(schema["paths"][p].keys())
            print(f"    {', '.join(m.upper() for m in methods)} {p}")

    print("\n[OK] All API smoke tests completed!")


if __name__ == "__main__":
    main()
