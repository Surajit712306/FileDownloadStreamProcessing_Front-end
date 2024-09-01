import fs from 'fs';
import * as styles from './page.module.css';
import Card from './Card';


const getFileMetadata = async () => {

 const filePath = process.env.NODE_ENV === 'production' ? './src/data.json' : './src/data1.json'; 
 const jsonData = await fs.promises.readFile(filePath, "utf-8");
 return JSON.parse(jsonData);
}


export default async function Home() {

  const data = await getFileMetadata();

  return (
    <main className={styles.cards}>
      {data.map((fileData, i) => (<Card key={i} fileData={fileData} />))}
    </main>
  );
}
