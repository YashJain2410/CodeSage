from app.observability.structured_log import setup_logging
import structlog

setup_logging()
log = structlog.get_logger()

log.info("startup")