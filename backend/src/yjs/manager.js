import * as Y from 'yjs';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';

const documents = new Map();
const documentSessions = new Map();

export class YjsManager {
  static getOrCreateDocument(docId) {
    if (!documents.has(docId)) {
      const ydoc = new Y.Doc();
      const ytext = ydoc.getText('shared-text');
      documents.set(docId, { doc: ydoc, text: ytext, clientsCount: 0 });
      logger.info(`Created new Yjs document: ${docId}`);
    }
    return documents.get(docId);
  }

  static getDocument(docId) {
    return documents.get(docId);
  }

  static incrementClientCount(docId) {
    const doc = this.getOrCreateDocument(docId);
    doc.clientsCount += 1;
    logger.info(`Document ${docId} client count: ${doc.clientsCount}`);
  }

  static decrementClientCount(docId) {
    const doc = documents.get(docId);
    if (doc) {
      doc.clientsCount -= 1;
      logger.info(`Document ${docId} client count: ${doc.clientsCount}`);
      if (doc.clientsCount <= 0) {
        documents.delete(docId);
        logger.info(`Deleted empty document: ${docId}`);
      }
    }
  }

  static applyUpdate(docId, update) {
    const docData = documents.get(docId);
    if (docData) {
      Y.applyUpdate(docData.doc, new Uint8Array(update));
    }
  }

  static encodeStateAsUpdate(docId) {
    const docData = documents.get(docId);
    if (docData) {
      return Y.encodeStateAsUpdate(docData.doc);
    }
    return new Uint8Array();
  }

  static getDocumentContent(docId) {
    const docData = documents.get(docId);
    if (docData) {
      return docData.text.toString();
    }
    return '';
  }
}

export class AwarenessManager {
  static getOrCreateSession(docId) {
    if (!documentSessions.has(docId)) {
      documentSessions.set(docId, {
        clients: new Map(),
        stateVector: new Map()
      });
    }
    return documentSessions.get(docId);
  }

  static addClient(docId, clientId, awareness) {
    const session = this.getOrCreateSession(docId);
    const assignedName = `User${session.clients.size + 1}`;
    session.clients.set(clientId, {
      id: clientId,
      name: assignedName,
      color: awareness.color || this.generateColor(),
      cursor: awareness.cursor || 0,
      selection: awareness.selection || null,
      timestamp: Date.now()
    });
    logger.info(`Client ${clientId} added to document ${docId} as ${assignedName}`);
    return session.clients.get(clientId);
  }

  static updateClient(docId, clientId, awareness) {
    const session = documentSessions.get(docId);
    if (session && session.clients.has(clientId)) {
      const client = session.clients.get(clientId);
      Object.assign(client, awareness, { timestamp: Date.now() });
      return client;
    }
    return null;
  }

  static removeClient(docId, clientId) {
    const session = documentSessions.get(docId);
    if (session) {
      session.clients.delete(clientId);
      if (session.clients.size === 0) {
        documentSessions.delete(docId);
        logger.info(`Deleted empty session: ${docId}`);
      }
    }
  }

  static getClients(docId) {
    const session = documentSessions.get(docId);
    if (session) {
      return Array.from(session.clients.values());
    }
    return [];
  }

  static generateColor() {
    const colors = [
      '#FF6B6B',
      '#4ECDC4',
      '#45B7D1',
      '#FFA07A',
      '#98D8C8',
      '#F7DC6F',
      '#BB8FCE',
      '#85C1E2'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }
}
