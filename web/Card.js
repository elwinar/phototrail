import React from "react";
import styles from "./Card.scss";

export function Card({ post, onLike }) {
  const isLikedByMe = Boolean(
    (post.likes || []).find((l) => l.user_id === document.session.user_id)
  );
  const likes = (post.likes && post.likes.length.toLocaleString()) || "0";
  const date = new Date(post.created_at).toLocaleDateString();
  console.log(isLikedByMe);
  return (
    <figure className={styles.Card}>
      {post.images &&
        post.images.map((path) => {
          return (
            <img
              className={styles.Image}
              key={path}
              src={`${document.config.baseURL}${path}`}
              alt={path}
            />
          );
        })}
      <figcaption>
        <p className={styles.Header}>
          <span className={styles.Username}>{post.user_name}</span>
          <span className={styles.Date}>{date}</span>
        </p>
        <p className={styles.Text}>{post.text}</p>
        <button className={styles.Likes} onClick={() => onLike(post.id)}>
          <span className={isLikedByMe ? styles.Liked : ""}>&#9829;</span>{" "}
          {likes}
        </button>
      </figcaption>
    </figure>
  );
}
