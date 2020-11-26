import React, { Fragment } from "react";
import styles from "./Feed.scss";
import { Card } from "./Card";
import { ErrorBoundary } from "./ErrorBoundary";

export default function Feed({
  loading,
  feed,
  onLike,
  onComment,
  onDeleteComment,
  onDeletePost,
  onLoadMore,
}) {
  if (loading) {
    return (
      <div>
        <p>Loading, please wait….</p>
      </div>
    );
  }

  return (
    <Fragment>
      <ul className={styles.Feed}>
        {Object.values(feed)
          .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
          .map((post) => {
            return (
              <li key={post.id}>
                <ErrorBoundary>
                  <Card
                    post={post}
                    onLike={onLike}
                    onComment={onComment}
                    onDeleteComment={onDeleteComment}
                    onDeletePost={onDeletePost}
                  />
                </ErrorBoundary>
              </li>
            );
          })}
      </ul>
      <button className={styles.LoadMore} onClick={onLoadMore}>
        Load more posts
      </button>
    </Fragment>
  );
}
