"""
Services package — business logic layer.

WHY separate business logic from routes?
- Routes should only handle HTTP concerns (parsing requests,
  returning responses, status codes)
- Services contain the actual logic (calculations, DB queries,
  validation rules, external API calls)

BENEFITS:
1. Testability: You can test business logic without running the API
2. Reusability: Multiple routes can call the same service function
3. Clarity: Each layer has a single responsibility
"""
