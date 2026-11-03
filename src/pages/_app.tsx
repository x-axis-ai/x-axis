import "../styles/globals.css";
import type { AppProps } from "next/app";
import Layout from "../components/layout"
import Head from "next/head"; // Import Head for metadata
import "regenerator-runtime/runtime";
export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>Bight</title>
        <meta name="Bight" content="Your AI customer service representative" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <meta name="theme-color" content="#000000" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
      </Head>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </>
  );
}
