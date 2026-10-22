from time import perf_counter

from fastapi import FastAPI, Request

from app.observability.metrics import REQUEST_COUNT, REQUEST_LATENCY


def setup_request_metrics(app: FastAPI):

    @app.middleware("http")
    async def record_request(request: Request, call_next):

        if request.url.path == "/metrics":
            return await call_next(request)

        start = perf_counter()
        status = 500

        try:
            response = await call_next(request)
            status = response.status_code
            return response

        finally:
            route = request.scope.get("route")
            endpoint = route.path if route else "unmatched"

            REQUEST_COUNT.labels(
                method=request.method,
                endpoint=endpoint,
                status=str(status),
            ).inc()

            REQUEST_LATENCY.observe(perf_counter() - start)
