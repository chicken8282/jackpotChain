FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system jackpot \
    && useradd --system --gid jackpot --create-home jackpot \
    && mkdir -p /data /wallets \
    && chown -R jackpot:jackpot /data /wallets \
    && chmod 775 /data /wallets

COPY requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

COPY . /app/jackpotchain
COPY entrypoint.sh /entrypoint.sh

RUN sed -i 's/\r$//' /entrypoint.sh \
    && chmod +x /entrypoint.sh \
    && chown -R jackpot:jackpot /app /entrypoint.sh

USER jackpot

EXPOSE 9776 9777 9778

HEALTHCHECK --interval=15s --timeout=5s --retries=5 --start-period=20s \
  CMD curl -sf -X POST http://localhost:9776 -H "Content-Type: application/json" -d "{\"jsonrpc\":\"2.0\",\"method\":\"getblockcount\",\"params\":[],\"id\":1}" || exit 1

ENTRYPOINT ["/entrypoint.sh"]
