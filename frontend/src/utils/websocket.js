/**
 * NexServe Real-Time WebSocket Client
 * Supports booking tracking (/ws/bookings/{id}) and user notifications (/ws/user/{id})
 */

function getWebSocketBaseUrl() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}`;
}

export function createBookingSocket(bookingId, onMessage, onStatusChange) {
  if (!bookingId) return null;

  const wsUrl = `${getWebSocketBaseUrl()}/ws/bookings/${bookingId}`;
  
  let ws = null;
  let isClosedManually = false;
  let reconnectTimer = null;
  let pingInterval = null;

  const connect = () => {
    try {
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        if (onStatusChange) onStatusChange("connected");
        // Start ping heartbeat
        if (pingInterval) clearInterval(pingInterval);
        pingInterval = setInterval(() => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send("ping");
          }
        }, 25000);
      };

      ws.onmessage = (event) => {
        if (event.data === "pong") return;
        try {
          const data = JSON.parse(event.data);
          if (onMessage) onMessage(data);
        } catch (e) {
          console.error("Error parsing WS booking message:", e);
        }
      };

      ws.onerror = (err) => {
        console.warn("WebSocket booking error:", err);
        if (onStatusChange) onStatusChange("error");
      };

      ws.onclose = () => {
        if (pingInterval) clearInterval(pingInterval);
        if (onStatusChange) onStatusChange("disconnected");
        if (!isClosedManually) {
          reconnectTimer = setTimeout(connect, 3000);
        }
      };
    } catch (err) {
      console.error("Failed to connect booking WS:", err);
      if (onStatusChange) onStatusChange("error");
    }
  };

  connect();

  return {
    send: (payload) => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(typeof payload === "string" ? payload : JSON.stringify(payload));
      }
    },
    close: () => {
      isClosedManually = true;
      if (pingInterval) clearInterval(pingInterval);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) ws.close();
    },
  };
}

export function createUserNotificationSocket(userId, onMessage, onStatusChange) {
  if (!userId) return null;

  const wsUrl = `${getWebSocketBaseUrl()}/ws/user/${userId}`;

  let ws = null;
  let isClosedManually = false;
  let reconnectTimer = null;
  let pingInterval = null;

  const connect = () => {
    try {
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        if (onStatusChange) onStatusChange("connected");
        if (pingInterval) clearInterval(pingInterval);
        pingInterval = setInterval(() => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send("ping");
          }
        }, 25000);
      };

      ws.onmessage = (event) => {
        if (event.data === "pong") return;
        try {
          const data = JSON.parse(event.data);
          if (onMessage) onMessage(data);
        } catch (e) {
          console.error("Error parsing user WS message:", e);
        }
      };

      ws.onerror = (err) => {
        console.warn("User notification WS error:", err);
        if (onStatusChange) onStatusChange("error");
      };

      ws.onclose = () => {
        if (pingInterval) clearInterval(pingInterval);
        if (onStatusChange) onStatusChange("disconnected");
        if (!isClosedManually) {
          reconnectTimer = setTimeout(connect, 3000);
        }
      };
    } catch (err) {
      console.error("Failed to connect user notification WS:", err);
      if (onStatusChange) onStatusChange("error");
    }
  };

  connect();

  return {
    send: (payload) => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(typeof payload === "string" ? payload : JSON.stringify(payload));
      }
    },
    close: () => {
      isClosedManually = true;
      if (pingInterval) clearInterval(pingInterval);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) ws.close();
    },
  };
}

