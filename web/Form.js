import React, { useState, useRef } from "react";
import styles from "./Form.scss";

export default function Form({ onSubmit }) {
  const [comment, setComment] = useState("");
  const [images, setImages] = useState([]);
  const formRef = useRef()

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
    formRef.current && formRef.current.reset();
  }

  return (
    <section className={styles.Container}>
      <form
        ref={formRef}
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({ comment, images }).then(() =>{
            reset();
            
          });
        }}
        className={styles.Form}
      >
        <h1>New post</h1>

        <textarea
          className={styles.Comment}
          placeholder="Your comment here..."
          onChange={(e) => setComment(e.target.value)}
          value={comment}
        />
        <fieldset className={styles.Upload}>
          {images.map((image) => (
            <img key={image.file.name} className={styles.Image} src={image.dataURL} />
          ))}
          <div className={styles.UploadInputs}>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleImages(e.target.files)}
            />
            <button type="reset" onClick={reset}>
              Reset
          </button>
          </div>
        </fieldset>
        <button className={styles.Submit} type="submit">
          Post
        </button>
      </form>
    </section>
  );
}
