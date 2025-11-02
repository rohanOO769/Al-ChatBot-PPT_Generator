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
        <h1 className="text-3xl font-bold text-red-500 underline">
          Hello world!
        </h1>

        <section style={{ width: "100%", marginTop: 24 }}>
          <ChatSlideBuilder />
        </section>
      </main>
    </div>
  );
}
