from celery import Celery

celery = Celery(
        "manila",
        broker='pyamqp://guest@localhost//',  # RabbitMQ default (guest/guest)
        backend='rpc://',
        include=['service.generator']
)
