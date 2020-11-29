import React, { useState, memo } from "react";
import styles from "./Card.scss";
import Comments from "./Comments";
import CommentForm from "./CommentForm";

function Card({ post, onLike, onComment, onDeleteComment, onDeletePost }) {
  const [showComments, setShowComments] = useState(false);

  const isLikedByMe = Boolean(
    (post.likes || []).find((l) => l.user_id === document.session.user_id)
  );

  const isMine = post.user_id === document.session.user_id;
  const likes = (post.likes && post.likes.length.toLocaleString()) || "0";
  const date = new Date(post.created_at).toLocaleString();

  return (
    <figure className={styles.Card}>
      <header className={styles.Header}>
        <p className={styles.Username}>{post.user_name}</p>
        {isMine && (
          <button onClick={() => onDeletePost(post.id)} className={styles.DeletePostButton}>
            Delete post
          </button>
        )}
      </header>
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
      <footer className={styles.Footer}>
        <figcaption>
          <button className={styles.Likes} onClick={() => onLike(post.id)}>
            <span className={isLikedByMe ? styles.Liked : ""}>&#9829;</span> {likes}
          </button>

          <p className={styles.Text}>{post.text}</p>
          <p className={styles.Date}>{date}</p>
          {post.comments && (
            <button
              type="button"
              className={styles.CommentsButton}
              onClick={() => setShowComments(!showComments)}
            >
              Comments ({post.comments.length.toLocaleString()}){" "}
              {showComments ? <span>&#9652;</span> : <span>&#9662;</span>}
            </button>
          )}
        </figcaption>
        {showComments && (
          <Comments comments={post.comments} onDeleteComment={onDeleteComment} postId={post.id} />
        )}
        <CommentForm onComment={onComment} postId={post.id} setShowComments={setShowComments} />
      </footer>
    </figure>
  );
}

export default memo(Card);
