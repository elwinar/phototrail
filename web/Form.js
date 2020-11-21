import React, { useState } from "react";
import styles from "./Form.scss";
import api from "./api";

export default function Form({ onSubmit }) {
  const [comment, setComment] = useState("");
  const [images, setImages] = useState([]);

  async function handleImages(files) {
    let results = [];
    for (let i = 0; i < files.length; i++) {
      results.push({
        file: files[i],
        dataURL: await new Promise((resolve) => {
          let reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(files[i]);
        }),
      });
    }
    setImages(results);
  }

  function reset() {
    setComment("");
    setImages([]);
  }

  return (
    <section className={styles.Container}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({ comment, images });
        }}
        className={styles.Form}
      >
        <h1>New post</h1>
        <fieldset className={styles.Upload}>
          {images.map((image) => (
            <img key={image.file.name} className={styles.Image} src={image.dataURL} />
          ))}
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => handleImages(e.target.files)}
          />
          <button type="reset" onClick={reset}>
            Reset
          </button>
        </fieldset>
        <textarea
          className={styles.Comment}
          placeholder="Your comment here..."
          onChange={(e) => setComment(e.target.value)}
          value={comment}
        />
        <button className={styles.Submit} type="submit">
          Post
        </button>
      </form>
    </section>
  );
}
