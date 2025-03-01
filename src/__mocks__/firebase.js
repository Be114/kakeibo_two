// Firebase モック
import { jest } from '@jest/globals';

const mockCollection = jest.fn();
const mockDoc = jest.fn();
const mockSetDoc = jest.fn();
const mockUpdateDoc = jest.fn();
const mockDeleteDoc = jest.fn();
const mockQuery = jest.fn();
const mockWhere = jest.fn();
const mockGetDocs = jest.fn();
const mockGetDoc = jest.fn();
const mockAddDoc = jest.fn();

// モックデータ
let mockFirestoreData = {
  expenses: {},
  dailyExpenses: {}
};

// Firestoreモック
mockCollection.mockImplementation((db, path) => {
  return { path };
});

mockDoc.mockImplementation((...args) => {
  if (args.length === 1) {
    // コレクションからのドキュメント作成の場合
    const collection = args[0];
    return {
      id: `mock-doc-id-${Date.now()}`,
      collection,
      path: `${collection.path}/mock-doc-id-${Date.now()}`
    };
  } else if (args.length === 2) {
    // db, pathの場合
    const db = args[0];
    const path = args[1];
    return {
      id: path.split('/').pop(),
      path
    };
  } else {
    // collection, idの場合
    const collection = args[0];
    const id = args[1];
    return {
      id,
      path: `${collection.path}/${id}`
    };
  }
});

mockAddDoc.mockImplementation((collectionRef, data) => {
  const docId = `mock-doc-id-${Date.now()}`;
  const collection = collectionRef.path;
  
  if (!mockFirestoreData[collection]) {
    mockFirestoreData[collection] = {};
  }
  
  mockFirestoreData[collection][docId] = { id: docId, ...data };
  
  return Promise.resolve({
    id: docId,
    path: `${collection}/${docId}`
  });
});

mockSetDoc.mockImplementation((docRef, data) => {
  const pathParts = docRef.path.split('/');
  const collection = pathParts[0];
  const docId = pathParts[1];

  if (!mockFirestoreData[collection]) {
    mockFirestoreData[collection] = {};
  }

  mockFirestoreData[collection][docId] = { id: docId, ...data };
  return Promise.resolve();
});

mockUpdateDoc.mockImplementation((docRef, data) => {
  const pathParts = docRef.path.split('/');
  const collection = pathParts[0];
  const docId = pathParts[1];

  if (mockFirestoreData[collection] && mockFirestoreData[collection][docId]) {
    mockFirestoreData[collection][docId] = {
      ...mockFirestoreData[collection][docId],
      ...data
    };
  }
  
  return Promise.resolve();
});

mockDeleteDoc.mockImplementation((docRef) => {
  const pathParts = docRef.path.split('/');
  const collection = pathParts[0];
  const docId = pathParts[1];

  if (mockFirestoreData[collection] && mockFirestoreData[collection][docId]) {
    delete mockFirestoreData[collection][docId];
  }
  
  return Promise.resolve();
});

mockQuery.mockImplementation((collectionRef, ...conditions) => {
  return {
    collectionRef,
    conditions
  };
});

mockWhere.mockImplementation((field, operator, value) => {
  return { field, operator, value };
});

mockGetDocs.mockImplementation((queryRef) => {
  if (queryRef.conditions) {
    const collection = queryRef.collectionRef.path;
    const conditions = queryRef.conditions;
    
    let results = Object.entries(mockFirestoreData[collection] || {}).map(([id, data]) => ({
      id,
      data: () => ({ ...data }),
      ref: { id, path: `${collection}/${id}` }
    }));

    conditions.forEach(condition => {
      if (condition.field && condition.operator && condition.value !== undefined) {
        if (condition.operator === '==') {
          results = results.filter(doc => 
            doc.data()[condition.field] === condition.value
          );
        }
      }
    });

    return Promise.resolve({
      empty: results.length === 0,
      size: results.length,
      docs: results,
      forEach: (callback) => results.forEach(callback)
    });
  } else {
    // コレクション全体を返す場合
    const collection = queryRef.path || queryRef;
    const collectionPath = typeof collection === 'string' ? collection : collection.path;
    
    const results = Object.entries(mockFirestoreData[collectionPath] || {}).map(([id, data]) => ({
      id,
      data: () => ({ ...data }),
      ref: { id, path: `${collectionPath}/${id}` }
    }));

    return Promise.resolve({
      empty: results.length === 0,
      size: results.length,
      docs: results,
      forEach: (callback) => results.forEach(callback)
    });
  }
});

mockGetDoc.mockImplementation((docRef) => {
  const pathParts = docRef.path.split('/');
  const collection = pathParts[0];
  const docId = pathParts[1];

  const exists = mockFirestoreData[collection] && mockFirestoreData[collection][docId];
  const data = exists ? { ...mockFirestoreData[collection][docId] } : null;

  return Promise.resolve({
    exists: () => !!exists,
    data: () => data,
    id: docId
  });
});

// Firebase モックをリセット
const resetMocks = () => {
  mockFirestoreData = {
    expenses: {},
    dailyExpenses: {}
  };
  
  mockCollection.mockClear();
  mockDoc.mockClear();
  mockSetDoc.mockClear();
  mockUpdateDoc.mockClear();
  mockDeleteDoc.mockClear();
  mockQuery.mockClear();
  mockWhere.mockClear();
  mockGetDocs.mockClear();
  mockGetDoc.mockClear();
  mockAddDoc.mockClear();
};

export const db = {};

export {
  mockCollection as collection,
  mockDoc as doc,
  mockSetDoc as setDoc,
  mockUpdateDoc as updateDoc,
  mockDeleteDoc as deleteDoc,
  mockQuery as query,
  mockWhere as where,
  mockGetDocs as getDocs,
  mockGetDoc as getDoc,
  mockAddDoc as addDoc,
  resetMocks
};

// モックデータにアクセスするためのヘルパー関数をエクスポート
export const getMockData = () => mockFirestoreData;
export const setMockData = (data) => {
  mockFirestoreData = data;
};
