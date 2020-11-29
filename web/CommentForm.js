import React, { useState, memo } from "react";
import styles from "./CommentForm.scss";

function CommentForm({ onComment, postId, setShowComments }) {
  const [comment, setComment] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setShowComments(true);
        onComment(postId, comment).then(() => {
          setComment("");
        });
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
  );
}

export default memo(CommentForm);
