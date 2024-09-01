'use client';

import IDBProvider from "./IDBProvider";

export default function Providers({children})
{
    return (<IDBProvider>
                {children}
            </IDBProvider>);
}