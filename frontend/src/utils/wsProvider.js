import io from 'socket.io-client';
import * as Y from 'yjs';

const runtimeHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
const runtimeProtocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss' : 'ws';
const defaultPort = 3002;
const envWS = import.meta.env.VITE_WS_URL;
const WS_URL = envWS || `${runtimeProtocol}://${runtimeHost}:${defaultPort}`;

export class WSProvider {
  constructor(docId, ydoc) {
    this.docId = docId;
    this.ydoc = ydoc;
    this.socket = null;
    this.awareness = null;
    this.localAwareness = {};
    this.listeners = [];
    this.suppressRemoteUpdates = false;
  }

  connect() {
    return new Promise((resolve, reject) => {
      try {
        this.socket = io(WS_URL, {
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          reconnectionAttempts: 5
        });

        this.ydoc.on('update', (update) => {
          if (!this.suppressRemoteUpdates && this.socket?.connected) {
            this.socket.emit('update', { update: Array.from(update) });
          }
        });

        this.socket.on('connect', () => {
          console.log('WebSocket connected');
          this.socket.emit('join-document', { docId: this.docId });
          resolve();
        });

        this.socket.on('init-sync', (data) => {
          const state = new Uint8Array(data.state);
          Y.applyUpdate(this.ydoc, state);
          console.log('Initial sync received');
        });

        this.socket.on('update', (data) => {
          const update = new Uint8Array(data.update);
          this.suppressRemoteUpdates = true;
          Y.applyUpdate(this.ydoc, update);
          this.suppressRemoteUpdates = false;
        });

        this.socket.on('awareness-update', (data) => {
          this.awareness = data.clients;
          this.notifyListeners('awareness', data.clients);
        });

        this.socket.on('disconnect', () => {
          console.log('WebSocket disconnected');
        });

        this.socket.on('error', (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  sendUpdate(update) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('update', { update: Array.from(update) });
    }
  }

  updateAwareness(awareness) {
    this.localAwareness = awareness;
    if (this.socket && this.socket.connected) {
      this.socket.emit('awareness', { awareness });
    }
  }

  onAwareness(callback) {
    this.listeners.push(callback);
  }

  notifyListeners(type, data) {
    this.listeners.forEach((listener) => {
      try {
        listener({ type, data });
      } catch (error) {
        console.error('Awareness listener error:', error);
      }
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getAwareness() {
    return this.awareness || [];
  }
}
