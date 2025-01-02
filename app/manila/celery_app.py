from celery import Celery

def make_celery(app):
    celery = Celery(
        "manila",
        broker='pyamqp://guest@rabbitmq//',  # RabbitMQ default (guest/guest)
        backend='rpc://',
        include=['service.generator']
    )
    celery.conf.update(app.config)
    return celery
