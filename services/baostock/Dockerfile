FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY server.py worker.py ./
RUN useradd --uid 10001 --create-home bridge
USER bridge
EXPOSE 8080
CMD ["python", "server.py"]
