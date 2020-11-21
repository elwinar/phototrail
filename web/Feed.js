import React, { useContext, useEffect, useState } from "react";
import styles from "./Feed.scss";
import api from "./api";
import { Card } from "./Card";

export default function Feed({ loading, feed, onLike, onComment }) {
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
              <Card post={post} onLike={onLike} />
            </li>
          );
        })}
    </ul>
  );
}
