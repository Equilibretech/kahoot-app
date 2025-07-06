// Production-ready Socket.IO client configuration

// Determine the correct WebSocket URL based on the environment
function getSocketURL() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  
  // For production, use the same origin
  return window.location.origin;
}

// Initialize Socket.IO with production settings
const socket = io(getSocketURL(), {
  transports: ['websocket', 'polling'],
  upgrade: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
  autoConnect: true,
  query: {
    // Add any authentication tokens here if needed
  }
});

// Connection event handlers
socket.on('connect', () => {
  console.log('Connected to server');
  document.dispatchEvent(new CustomEvent('socket-connected'));
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected from server:', reason);
  document.dispatchEvent(new CustomEvent('socket-disconnected', { detail: reason }));
  
  // Handle specific disconnect reasons
  if (reason === 'io server disconnect') {
    // Server disconnected the client, might need to re-authenticate
    console.log('Server terminated the connection');
  }
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error.message);
  document.dispatchEvent(new CustomEvent('socket-error', { detail: error }));
});

socket.on('reconnect', (attemptNumber) => {
  console.log('Reconnected after', attemptNumber, 'attempts');
  document.dispatchEvent(new CustomEvent('socket-reconnected', { detail: attemptNumber }));
});

socket.on('reconnect_attempt', (attemptNumber) => {
  console.log('Attempting to reconnect...', attemptNumber);
});

// Export socket for use in other scripts
window.productionSocket = socket;