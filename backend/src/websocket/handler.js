import logger from '../utils/logger.js';
import { YjsManager, AwarenessManager } from '../yjs/manager.js';

const connections = new Map();

export function handleWebSocketConnection(socket) {
  const clientId = socket.id;
  let currentDocId = null;

  logger.info(`WebSocket client connected: ${clientId}`);

  socket.on('join-document', (data) => {
    const { docId, name, color } = data;
    currentDocId = docId;

    if (!connections.has(docId)) {
      connections.set(docId, new Set());
    }

    connections.get(docId).add(socket);
    YjsManager.incrementClientCount(docId);

    const clientData = AwarenessManager.addClient(docId, clientId, {
      name,
      color,
      cursor: 0
    });

    const initialState = YjsManager.encodeStateAsUpdate(docId);
    socket.emit('init-sync', {
      state: Array.from(new Uint8Array(initialState))
    });

    socket.emit('user-assigned', {
      userName: clientData.name,
      color: clientData.color
    });

    const clients = AwarenessManager.getClients(docId);
    connections.get(docId).forEach((clientSocket) => {
      clientSocket.emit('awareness-update', {
        clients
      });
    });

    logger.info(`Client ${clientId} joined document ${docId} as ${clientData.name}`);
  });

  socket.on('update', (data) => {
    if (!currentDocId) return;

    const { update } = data;
    YjsManager.applyUpdate(currentDocId, update);

    const connectedClients = connections.get(currentDocId);
    if (connectedClients) {
      connectedClients.forEach((client) => {
        if (client.id !== clientId) {
          client.emit('update', { update });
        }
      });
    }

    logger.debug(`Broadcasted update to document ${currentDocId} from ${clientId}`);
  });

  socket.on('awareness', (data) => {
    if (!currentDocId) return;

    const { awareness } = data;
    const clientData = AwarenessManager.addClient(currentDocId, clientId, awareness);

    const connectedClients = connections.get(currentDocId);
    if (connectedClients) {
      connectedClients.forEach((client) => {
        client.emit('awareness-update', {
          clients: AwarenessManager.getClients(currentDocId)
        });
      });
    }

    logger.debug(`Updated awareness for client ${clientId} in document ${currentDocId}`);
  });

  socket.on('disconnect', () => {
    if (currentDocId) {
      YjsManager.decrementClientCount(currentDocId);
      AwarenessManager.removeClient(currentDocId, clientId);

      const connectedClients = connections.get(currentDocId);
      if (connectedClients) {
        connectedClients.delete(socket);

        if (connectedClients.size === 0) {
          connections.delete(currentDocId);
          logger.info(`Removed all connections to document ${currentDocId}`);
        } else {
          connectedClients.forEach((client) => {
            client.emit('awareness-update', {
              clients: AwarenessManager.getClients(currentDocId)
            });
          });
        }
      }
    }

    logger.info(`WebSocket client disconnected: ${clientId}`);
  });

  socket.on('error', (error) => {
    logger.error(`WebSocket error for client ${clientId}: ${error.message}`);
  });
}
