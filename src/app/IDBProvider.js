'use client'; 

import React, { useEffect, useState } from 'react';
import { openIndexedDB } from './util';

export const IDBContext = React.createContext();

export default function IDBProvider({children})
{   
    const [dbInstance, setDbInstance] = useState(null);
    const [errorMessage, setErrorMessage] = useState();
    
    useEffect(() => {
        async function initDB()
        {
            try 
            {
                const db = await openIndexedDB();
                setDbInstance(db);
            }
            catch(err)
            {
                setErrorMessage(err.message);
            }
        }

        initDB();

        return () => {
            if(dbInstance) dbInstance.close();
        }

    }, []);

    if(errorMessage) return <div className='error'>{errorMessage}</div>

    return (<IDBContext.Provider value={dbInstance}>
                {children}
            </IDBContext.Provider>);
}