import React, { useState, memo } from "react";
import styles from "./Comments.scss";

function Comments({ comments, onDeleteComment, postId }) {
  if (!comments || !comments.length) {
    return null;
  }

  return (
    <section>
      <ul className={styles.Comments}>
        {comments.map((c) => {
          const commentDate = new Date(c.created_at).toLocaleDateString();
          const isMine = document.session.user_id === c.user_id;

          return (
            <li key={c.id}>
              <p className={styles.CommentInfo}>
                <span>
                  <span className={styles.CommentDate}>{commentDate}</span>
                  <span className={styles.CommentUserName}>{c.user_name}</span>
                </span>
                {isMine && (
                  <button
                    type="button"
                    onClick={() => onDeleteComment(postId, c.id)}
                    className={styles.DeleteComment}
                  >
                    Delete
                  </button>
                )}
              </p>
              <p className={`${styles.Comment} ${isMine ? styles.Mine : ""}`}>{c.text}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default memo(Comments);
