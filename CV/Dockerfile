FROM python:3.12.3-bullseye

WORKDIR /usr/app/src

COPY . .

RUN apt-get update && apt-get install ffmpeg libsm6 libxext6  -y
RUN pip install -r requirements.txt

CMD ["flask", "--app", "PA", "run", "--debug", "--host=0.0.0.0", "--port=8000"]
