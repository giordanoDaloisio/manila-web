# Fairness

Fairness is a guided workspace for evaluating classification and regression models, fairness mitigations, validation settings, and result charts. It keeps Fairness' existing wizard and dashboard while using Manila's profiling, model-compatibility, experiment, and reporting engine.

## Run the full stack with Docker

Docker Compose starts the React frontend, FastAPI backend, Celery experiment worker, RabbitMQ task broker, and Redis result backend.

```sh
cp .env.example .env
# Replace RABBITMQ_PASSWORD in .env with a local password.
docker compose up --build
```

Open the application at [http://localhost:3000](http://localhost:3000). The API is available at [http://localhost:8000/api/](http://localhost:8000/api/), and RabbitMQ's management console is at [http://localhost:15672](http://localhost:15672). The console uses the RabbitMQ username and password from `.env`.

Experiment submissions are queued. The worker publishes progress while it trains, and the backend persists configuration, status, result tables, fitted models, metrics CSV files, and reproduction scripts under `backend/results/`. Uploaded and generated datasets live under `backend/data/`. Both directories are mounted from the host and remain after `docker compose down`.

Useful commands:

```sh
docker compose logs -f api celery-worker
docker compose exec frontend npm run build
docker compose down
```

The API container runs Python 3.11 and installs the dependencies in `backend/requirements.txt`. The frontend container uses Node 22 and installs the lockfile with `npm ci`. To run the API without Compose, start RabbitMQ and Redis, install the backend requirements, then run `uvicorn server:app --reload` and `celery -A app.celery_app:celery_app worker --loglevel=info` from `backend/`. Set `CELERY_BROKER_URL`, `CELERY_RESULT_BACKEND`, and `REACT_APP_BACKEND_URL` for that setup.
