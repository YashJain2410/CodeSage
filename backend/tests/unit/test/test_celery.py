from backend.app.workers.index_task import index_repository

result = index_repository.delay("test_repo", "123")
print(result.get())