import React, { useContext, useState } from "react";

export default function Form({ onClose, isOpen }) {
  const [comment, setComment] = useState("");
  const [files, setFiles] = useState([]);

  if (!isOpen) {
    return null;
  }

  function handleSubmit(e) {
    e.preventDefault();

    if (!files.length && !comment.length) {
      onClose();
      return;
    }

    return createPost(session, { text: comment })
      .then((post) => {
        const imageUploads = Array.from(files).map((file) =>
          uploadImage(session, file, post.post_id)
        );

        return Promise.all(imageUploads);
      })
      .then(() => {
        setComment("");
        setFiles([]);
        e.target.reset();
        onClose();
      });
  }

  return (
    <form onSubmit={handleSubmit} className="form">
      <h1>New post</h1>
      <div>
        <label htmlFor="comment">Comment:</label>
        <br />
        <textarea
          name="comment"
          id="comment"
          placeholder="Your comment here..."
          onChange={(e) => setComment(e.target.value)}
          value={comment}
        />
      </div>
      <input
        type="file"
        name="image"
        id="image"
        multiple
        onChange={(e) => {
          setFiles(e.target.files);
        }}
      />
      <button
        type="reset"
        onClick={() => {
          setComment("");
          setFiles([]);
          onClose();
        }}
      >
        Cancel
      </button>
      <button type="submit">Post</button>
    </form>
  );
}