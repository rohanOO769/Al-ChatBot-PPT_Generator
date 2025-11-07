// pages/index.js

import Head from "next/head";
import ChatSlideBuilder from "../app/components/ChatSlideBuilder";
import styles from "../styles/Home.module.css";

export default function Home() {
  return (
    <div className={styles.container}>
      <Head>
        <title>AI Slide Builder</title>
        <meta name="viewport" content="width=device-width,initial-scale=1" />
      </Head>

      <main className={styles.main}>
        <section style={{ width: "100%", marginTop: 24 }}>
          <ChatSlideBuilder userName="Rohan" />
        </section>
      </main>
    </div>
  );
}
