
let dbPromise;

export function openIndexedDB()
{
    if(dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {

        const openRequest = indexedDB.open("FileDownloadDB", 1); 

        openRequest.onupgradeneeded = e => {
            
            const db = e.target.result;

            if(!db.objectStoreNames.contains("fileChunks"))
            {
                db.createObjectStore("fileChunks", { keyPath: "fileName" });
            }

            resolve(db);
        }

        openRequest.onsuccess = e => resolve(e.target.result);

        openRequest.onerror = e => reject(e.target.error); 

    });

    return dbPromise;
}

export function getExistingFileLength(db, fileName)
{
    return new Promise((resolve, reject) => {

        if(!db)
        {
            return reject(new Error("Please open the database first."));
        }

        const transaction = db.transaction(["fileChunks"], "readonly");
        const objectStore = transaction.objectStore("fileChunks");

        const getRequest = objectStore.get(fileName);

        getRequest.onsuccess = e => {
           
            const data = getRequest.result;

            if(data)
            {
                const existingFileLength = data.chunks.reduce((acc, chunk) => acc + chunk.length, 0);
                resolve(existingFileLength);
            }
            else
            {
                resolve(0);
            }

        }

        getRequest.onerror = e => reject(e.target.error);

    });
}

export function saveChunkToIndexedDB(db, fileName, chunk)
{
    return new Promise((resolve, reject) => {

        if(!db)
        {
            return reject(new Error("Please open the database first."));
        }

        const transaction = db.transaction(["fileChunks"], "readwrite");
        const objectStore = transaction.objectStore("fileChunks");

        const getRequest = objectStore.get(fileName);

        getRequest.onsuccess = e => {
            const data = getRequest.result || {fileName, chunks: []};
            data.chunks.push(chunk);

            const putRequest = objectStore.put(data);

            putRequest.onsuccess = e => resolve(); 
            putRequest.onerror = e => reject(e.target.error); 

        }

        getRequest.onerror = e => reject(e.target.error);

    });
}

export function combineChunksFromIndexedDB(db, fileName)
{
    return new Promise((resolve, reject) => {

        if(!db)
        {
            return reject(new Error("Please open the database first."));
        }
    
        const transaction = db.transaction(["fileChunks"], "readwrite");
        const objectStore = transaction.objectStore("fileChunks");
    
        const getRequest = objectStore.get(fileName);
    
        getRequest.onsuccess = e => {
            const data = getRequest.result; 
            
            if(data)
            {
                const blob = new Blob(data.chunks); 
                resolve(blob);
            }
            else 
            {
                reject(new Error("No data exists."));
            }
        }
    
        getRequest.onerror = e => reject(e.target.error);

    });
}

export function deleteChunksFromIndexedDB(db, fileName)
{
    return new Promise((resolve, reject) => {

        if(!db)
        {
            return reject(new Error("Please open the database first."));
        }
    
        const transaction = db.transaction(["fileChunks"], "readwrite");
        const objectStore = transaction.objectStore("fileChunks");
    
        const deleteRequest = objectStore.delete(fileName);
    
        deleteRequest.onsuccess = () => resolve();
    
        deleteRequest.onerror = e => reject(e.target.error);

    });
}