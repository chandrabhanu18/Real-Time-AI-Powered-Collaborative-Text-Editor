import { YjsManager, AwarenessManager } from '../backend/src/yjs/manager.js';

describe('YjsManager', () => {
  beforeEach(() => {
    // Clear documents between tests
    YjsManager.documents?.clear?.();
  });

  describe('getOrCreateDocument', () => {
    it('should create a new document if not exists', () => {
      const doc = YjsManager.getOrCreateDocument('test-doc-1');
      expect(doc).toBeDefined();
      expect(doc.doc).toBeDefined();
      expect(doc.text).toBeDefined();
    });

    it('should return existing document', () => {
      const doc1 = YjsManager.getOrCreateDocument('test-doc-2');
      const doc2 = YjsManager.getOrCreateDocument('test-doc-2');
      expect(doc1).toBe(doc2);
    });
  });

  describe('client count management', () => {
    it('should increment and decrement client count', () => {
      const docId = 'test-doc-3';
      YjsManager.incrementClientCount(docId);
      const doc = YjsManager.getDocument(docId);
      expect(doc.clientsCount).toBe(1);

      YjsManager.incrementClientCount(docId);
      expect(doc.clientsCount).toBe(2);

      YjsManager.decrementClientCount(docId);
      expect(doc.clientsCount).toBe(1);
    });

    it('should delete document when no clients', () => {
      const docId = 'test-doc-4';
      YjsManager.incrementClientCount(docId);
      YjsManager.decrementClientCount(docId);
      const doc = YjsManager.getDocument(docId);
      expect(doc).toBeUndefined();
    });
  });

  describe('document content', () => {
    it('should retrieve document content', () => {
      const docId = 'test-doc-5';
      const doc = YjsManager.getOrCreateDocument(docId);
      expect(YjsManager.getDocumentContent(docId)).toBeDefined();
    });
  });
});

describe('AwarenessManager', () => {
  beforeEach(() => {
    // Clear sessions between tests
    AwarenessManager.sessions?.clear?.();
  });

  describe('client management', () => {
    it('should add client to document', () => {
      const docId = 'test-doc-1';
      const clientId = 'client-1';
      const awareness = { name: 'User1', color: '#FF6B6B', cursor: 0 };

      const client = AwarenessManager.addClient(docId, clientId, awareness);
      expect(client).toBeDefined();
      expect(client.name).toBe('User1');
    });

    it('should update client awareness', () => {
      const docId = 'test-doc-2';
      const clientId = 'client-2';

      AwarenessManager.addClient(docId, clientId, { name: 'User2', cursor: 0 });
      const updated = AwarenessManager.updateClient(docId, clientId, { cursor: 10 });

      expect(updated.cursor).toBe(10);
    });

    it('should remove client from document', () => {
      const docId = 'test-doc-3';
      const clientId = 'client-3';

      AwarenessManager.addClient(docId, clientId, { name: 'User3' });
      AwarenessManager.removeClient(docId, clientId);

      const clients = AwarenessManager.getClients(docId);
      expect(clients).toHaveLength(0);
    });
  });

  describe('color generation', () => {
    it('should generate valid colors', () => {
      const color = AwarenessManager.generateColor();
      expect(color).toMatch(/^#[0-9A-F]{6}$/i);
    });
  });
});
