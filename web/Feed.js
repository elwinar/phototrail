import React from "react";
import styles from "./Feed.scss";
import { Card } from "./Card";
import { ErrorBoundary } from "./ErrorBoundary";

export default function Feed({ loading, feed, onLike, onComment, onDeleteComment, onDeletePost }) {
  if (loading) {
    return (
      <div>
        <p>Loading, please wait….</p>
      </div>
    );
  }

  return (
    <ul className={styles.Feed}>
      {Object.values(feed)
        .sort((a, b) => a.created_at < b.created_at)
        .map((post) => {
          return (
            <li key={post.id}>
              <ErrorBoundary>
                <Card post={post} onLike={onLike} onComment={onComment} onDeleteComment={onDeleteComment} onDeletePost={onDeletePost} />
              </ErrorBoundary>
            </li>
          );
        })}
    </ul>
  );
}
