import { client } from "@repo/db/client";
import { AppLayout } from "../components/Layout/AppLayout";
import { Main } from "../components/Main";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function Home() {
  const activePosts = await client.db.post.findMany({ where: { active: true } });
  return (
    <AppLayout posts={activePosts}>
      <Main posts={activePosts} className={styles.main} />
    </AppLayout>
  );
}
