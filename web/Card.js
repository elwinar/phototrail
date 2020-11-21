import React, { useState } from "react";
import styles from "./Card.scss";

export function Card({ post, onLike, onComment, onDeleteComment, onDeletePost }) {
  const [showComments, setShowComments] = useState(false);

  const isLikedByMe = Boolean(
    (post.likes || []).find((l) => l.user_id === document.session.user_id)
  );

  const isMine = post.user_id === document.session.user_id;
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
          <span>
            <span className={styles.Username}>{post.user_name}</span>
            {
              isMine &&
              <button onClick={() => onDeletePost(post.id)} className={styles.DeletePostButton}>Delete post</button>
            }
          </span>
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
              Comments ({post.comments.length.toLocaleString()}) {showComments ? <span>&#9652;</span> : <span>&#9662;</span>}
            </button>
          )}
        </footer>
      </figcaption>
      {showComments && <Comments comments={post.comments} onDeleteComment={onDeleteComment} postId={post.id} />}
      <CommentForm onComment={onComment} postId={post.id} setShowComments={setShowComments} />
    </figure>
  );
}

function Comments({ comments, onDeleteComment, postId }) {
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
            <span>
              <span className={styles.CommentDate}>{commentDate}</span>
              <span className={styles.CommentUserName}>{c.user_name}</span>
            </span>
            {isMine && <button type="button" onClick={() => onDeleteComment(postId, c.id)} className={styles.DeleteComment}>Delete</button>}
          </p>
          <p className={`${styles.Comment} ${isMine ? styles.Mine : ''}`}>{c.text}</p>
        </li>
      })
    }
    </ul>
  </section>
}


function CommentForm({ onComment, postId, setShowComments }) {
  const [comment, setComment] = useState("");

  return <form
    onSubmit={(e) => {
      e.preventDefault();
      setShowComments(true);
      onComment(postId, comment).then(() => {
        setComment("");
      })
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
}