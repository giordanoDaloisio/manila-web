from create_flask_app import create_flask_app
from celery_app import make_celery

app = create_flask_app()
celery = make_celery(app)

#celery.worker_main(["worker", "--loglevel=INFO"])

if __name__ == "__main__":
    celery.worker_main(["worker", "--loglevel=DEBUG"])