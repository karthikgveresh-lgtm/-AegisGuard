/**
 * Server-Sent Events (SSE) Broadcaster
 * Maintains active client connections and broadcasts live transaction events.
 */
class StreamManager {
  constructor() {
    this.clients = new Set();
  }

  addClient(res) {
    this.clients.add(res);

    // Initial connection message
    res.write(`data: ${JSON.stringify({ type: 'CONNECTED', timestamp: new Date().toISOString() })}\n\n`);

    res.on('close', () => {
      this.clients.delete(res);
    });
  }

  broadcast(eventType, data) {
    const payload = JSON.stringify({
      type: eventType,
      data,
      timestamp: new Date().toISOString()
    });

    for (const client of this.clients) {
      try {
        client.write(`data: ${payload}\n\n`);
      } catch (err) {
        this.clients.delete(client);
      }
    }
  }

  getClientCount() {
    return this.clients.size;
  }
}

const streamManager = new StreamManager();

function handleStreamConnection(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
    'Access-Control-Allow-Origin': '*'
  });

  streamManager.addClient(res);

  // Send keepalive ping every 15s to keep connection open through proxies
  const keepAlive = setInterval(() => {
    res.write(': keepalive\n\n');
  }, 15000);

  req.on('close', () => {
    clearInterval(keepAlive);
  });
}

module.exports = {
  streamManager,
  handleStreamConnection
};
