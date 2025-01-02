from create_flask_app import create_flask_app
from celery_app import make_celery

app = create_flask_app()
celery = make_celery(app)

if __name__ == "__main__":
    celery.worker_main(["worker", "--loglevel=INFO"])