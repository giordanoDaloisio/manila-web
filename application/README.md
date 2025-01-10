# MANILA Source Code

This folder contains the source code of MANILA.

## Structure

The source code is structured as follows:

- `app/`: contains the source code of the MANILA application.
- `frontend/`: contains the source of the frontend of the application.
- `docker-compose.yml`: contains the configuration of the Docker Compose file to run the application.

## Running the Application

The application can be executed using Docker (suggested) or by manually running the backend and frontend.

### Using Docker

To run the application using Docker, execute the following command:

```bash
docker-compose up
```

The application will be available at `http://localhost:3000`.

### Manually

To run the application manually, follow the steps below:

1. Install the dependencies of the backend:

```bash
cd app
pip install -r requirements.txt
```

2. Install and launch the Redis database (refer to the [official documentation](https://redis.io/download) for more information).

3. Launch the backend:

```bash
cd app
python manila/app.py
```

4. Launch the Celery worker:

```bash
cd app/manila
celery -A run_celery.celery worker --loglevel=info
```

5. Install the dependencies of the frontend:

```bash
cd frontend
npm install
```

6. Launch the frontend:

```bash
cd frontend
npm start
```

The application will be available at `http://localhost:3000`.
