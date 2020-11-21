import React, { useState } from "react";
import api from "./api";
import styles from "./Card.scss";

export function Card({ post, onLike }) {
  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState("");

  const isLikedByMe = Boolean(
    (post.likes || []).find((l) => l.user_id === document.session.user_id)
  );
  const likes = (post.likes && post.likes.length.toLocaleString()) || "0";
  const date = new Date(post.created_at).toLocaleDateString();

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
          <span className={isLikedByMe ? styles.Liked : ""}>&#9829;</span> {likes}
        </button>
        {post.comments && (
          <button
            className={styles.CommentsButton}
            onClick={() => setShowComments(!showComments)}
          >
            Comments
          </button>
        )}
      </figcaption>
      {showComments && <section>comments here</section>}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          api.createComment(post.id, comment)
        }}
      >
        <input
          type="text"
          name="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className={styles.Input}
          placeholder="Your comment..."
        />
      </form>
    </figure>
  );
}
