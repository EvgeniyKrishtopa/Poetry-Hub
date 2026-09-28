import type { Poem } from "../../model/poem.types";

import styles from "./PoemCard.module.css";

interface PoemCardProps {
  poem: Poem;
}

export function PoemCard({ poem }: PoemCardProps) {
  return (
    <article className={`${styles.card} flex flex-col gap-3 p-6`}>
      <header>
        <h2 className="text-xl font-semibold">{poem.title}</h2>
        <p className="text-sm text-muted">{poem.author}</p>
      </header>
      <blockquote className={styles.excerpt}>
        {poem.lines.map((line, index) => (
          <p key={index}>{line}</p>
        ))}
      </blockquote>
    </article>
  );
}
