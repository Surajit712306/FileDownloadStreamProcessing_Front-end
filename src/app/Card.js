'use client';
import { useContext, useState, useEffect } from 'react';
import { IDBContext } from './IDBProvider';
import * as styles from './Card.module.css';
import { BACKEND_BASE_URL } from './settings';
import { getExistingFileLength, saveChunkToIndexedDB, combineChunksFromIndexedDB, deleteChunksFromIndexedDB } from './util';


export default function Card({fileData})
{   
    const db = useContext(IDBContext);
    const [isDownloading, setIsDownloading] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);
    const [downloadProgress, setDownloadProgress] = useState(null); 
    const [remainingTime, setRemainingTime] = useState(null);
    const [isWaiting, setIsWaiting] = useState(false);
    const [isFileBuilt, setIsFileBuilt] = useState(false);
    const [isDownloadCompleted, setIsDownloadCompleted] = useState(false);

    useEffect(() => {

        const showMessage = () => {
            setIsWaiting(false);
            setIsDownloadCompleted(true);
        }

        let id;
        if(isFileBuilt)
        {
            id = setTimeout(showMessage, 10000); // 10s
        }

        return () => {
            if(id) clearTimeout(id);
        }

    }, [isFileBuilt]);

    useEffect(() => {

        const clearMessage = () => {
            setIsDownloadCompleted(false);
        }

        let id;
        if(isDownloadCompleted)
        {
            id = setTimeout(clearMessage, 30000); // 30s
        }

        return () => {
            if(id) clearTimeout(id);
        }

    }, [isDownloadCompleted]);

    const downloadFile = async () => {
        
        setIsDownloading(true); 
        const controller = new AbortController();

        const {fileUrl } = fileData; 
        const fileName = fileUrl.split("/").pop();
        const url = `${BACKEND_BASE_URL}/api/FileDownload/download?fileUrl=${fileUrl}`;

        try 
        {
            const start = await getExistingFileLength(db, fileName);
            const res = await fetch(url, {
                headers: {
                    'Range': `bytes=${start}-`,
                },
                signal: controller.signal
            });

            if(!res.ok || res.status !== 206)
            {
                throw new Error("Failed to download file.");
            }

            const contentRange = res.headers.get("Content-Range");
            if(!contentRange)
            {
                throw new Error("Failed to download due to not having Content-Range header.");
            }

            let totalBytes = parseInt(contentRange.split("/")[1]);
            const buffer = [];
            const bufferLimit = 1000;
            let downloadedBytes = start;
            const reader = res.body.getReader(); 
            let startTime = Date.now();

            async function saveBufferedChunksToDB()
            {
                if(buffer.length > 0)
                {
                    const accumulativeLength = buffer.reduce((acc, chunk) => acc + chunk.length, 0); 
                    const accumulativeChunk = new Uint8Array(accumulativeLength); 

                    let offset = 0;
                    buffer.forEach(chunk => {
                        accumulativeChunk.set(chunk, offset);
                        offset += chunk.length;
                    });

                    await saveChunkToIndexedDB(db, fileName, accumulativeChunk);
                    buffer.length = 0;
                }
            }

            const processStream = async () => {
                    while(true)
                    {
                        const { done, value} = await reader.read(); 
 
                        if(done) 
                        {
                            await saveBufferedChunksToDB();
                            break;
                        }

                        buffer.push(value); 
                        downloadedBytes += value.length; 

                        if(buffer.length >= bufferLimit)
                        {
                            await saveBufferedChunksToDB();
                        }

                        const percentComplete = (downloadedBytes / totalBytes) * 100;
                        setDownloadProgress(percentComplete);

                        const currentTime = Date.now();
                        const elapsedTime = (currentTime - startTime) / 1000; 
                        const downloadSpeed = downloadedBytes / elapsedTime; 
                        const bytesRemaining = totalBytes - downloadedBytes; 
                        const estimatedTimeRemaining = bytesRemaining / downloadSpeed; 
                        
                        setRemainingTime(estimatedTimeRemaining);
                    }
            }

            await processStream();

            setDownloadProgress(null);
            setRemainingTime(null);
            setIsWaiting(true);
            const blob = await combineChunksFromIndexedDB(db, fileName);

            const downloadUrl = URL.createObjectURL(blob);
            const anchor = document.createElement('a'); 
            anchor.href = downloadUrl; 
            anchor.download = fileName; 
            document.body.appendChild(anchor);
            anchor.click();

            anchor.remove();
            URL.revokeObjectURL(downloadUrl);
            setIsFileBuilt(true);

            deleteChunksFromIndexedDB(db, fileName);

        }
        catch(err)
        {
            setErrorMessage(err.message);
        }
        finally 
        {
            controller.abort();
        }
        setIsDownloading(false);

    }

    return (<div className={styles.card}>
              <div>{fileData.size}</div>
               <button className={styles.btn} onClick={downloadFile} disabled={isDownloading || isWaiting || isDownloadCompleted}>Download</button>
               <div className={styles.message}>
                    {!isWaiting && !isDownloadCompleted && <>
                        {downloadProgress !== null && <p>Progress : {downloadProgress.toFixed(2)}%</p>}
                        {remainingTime !== null && <p>Remaining : {remainingTime.toFixed(2)}s</p>}
                    </>}
                   {isWaiting && <p style={{ fontWeight: 500 }}>Please wait...</p>}
                   {isDownloadCompleted && <p style={{ fontWeight: 500 }}>Download completed!</p>}
                   {errorMessage && <p style={{ color: 'red' }}>{errorMessage}</p>}
               </div>
            </div>);
}

