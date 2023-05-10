FROM python:3.9.1

WORKDIR /app

COPY requirements.txt requirements.txt

RUN pip install -r requirements.txt

COPY . .

EXPOSE 5000

ENV FLASK_ENV=development

CMD [ "python3", "-m" , "flask", "run", "--host=0.0.0.0", "--debugger"]