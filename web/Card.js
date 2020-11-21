import React, { useState } from "react";
import styles from "./Card.scss";

export function Card({ post, onLike, onComment }) {
  const [showComments, setShowComments] = useState(false);

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
        <footer className={styles.Footer}>
          <button className={styles.Likes} onClick={() => onLike(post.id)}>
            <span className={isLikedByMe ? styles.Liked : ""}>&#9829;</span> {likes}
          </button>
          {post.comments && (
            <button
              type="button"
              className={styles.CommentsButton}
              onClick={() => setShowComments(!showComments)}
            >
              Comments {showComments ? <span>&#9652;</span> : <span>&#9662;</span>}
            </button>
          )}
        </footer>
      </figcaption>
      {showComments && <Comments comments={post.comments} />}
      <CommentForm onComment={onComment} postId={post.id} />
    </figure>
  );
}

function Comments({ comments }) {
  if (!comments || !comments.length) {
    return null;
  }

  return <section>
    <ul className={styles.Comments}>{
      comments.map(c => {
        const commentDate = new Date(c.created_at).toLocaleDateString();
        const isMine = document.session.user_id === c.user_id;

        return <li key={c.id}>
          <p className={styles.CommentInfo}>
            <span className={styles.CommentDate}>{commentDate}</span>
            <span className={styles.CommentUserName}>{c.user_name}</span>
          </p>
          <p className={`${styles.Comment} ${isMine ? styles.Mine : ''}`}>{c.text}</p>
        </li>
      })
    }
    </ul>
  </section>
}


function CommentForm({ onComment, postId }) {
  const [comment, setComment] = useState("");

  return <form
    onSubmit={(e) => {
      e.preventDefault();
      onComment(postId, comment).then(() => {
        setComment("");
      })
    }}
    className={styles.Form}
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
}