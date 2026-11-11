const databaseName = 'dot-it-characters';
const storeName = 'characters';
const slot = 'active';

async function accessCharacter(mode, operation) {
  const database = await new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(storeName);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('다른 Dot_it 탭을 닫은 뒤 다시 시도해 주세요.'));
  });
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(storeName, mode);
      const request = operation(transaction.objectStore(storeName));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onabort = () => reject(transaction.error ?? request.error);
    });
  } finally {
    database.close();
  }
}

export function saveCharacter(character) {
  return accessCharacter('readwrite', store => store.put(character, slot));
}

export function loadCharacter() {
  return accessCharacter('readonly', store => store.get(slot));
}
