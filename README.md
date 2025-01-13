# MANILA

This is the main repository of the MANILA, a low code application to benchmark different combinations of machine learning models and fairness-enhancing methods and select the one that achieves the best trade-off between effectiveness and fairness.

## Repository Structure

The repository is structured as follows:

- `application/`: contains the source code of the MANILA application. Refer to the [README.md](./application/README.md) file in this folder for more information.

- `replication-package/`: contains the replication package of the performed evaluation. Refer to the [README.md](./replication-package/README.md) file in this folder for more information.

## Running the Application

The application can be executed using Docker (suggested) or by manually running the backend and frontend.

### Using Docker

To run the application using Docker, execute the following command:

```bash
cd application
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

## License

This project is licensed under the GPL-3.0 license - see the [LICENSE](LICENSE) file for details.
