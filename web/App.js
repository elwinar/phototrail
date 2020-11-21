import React, { useEffect, useState, Fragment } from "react";
import api from "./api";
import styles from "./App.scss";
import Header from "./Header";
import Feed from "./Feed";
import Footer from "./Footer";
import Form from "./Form";

// App is the main component, and is mainly concerned with high-level features
// like state management and top-level components.
export function App() {
  const [feed, setFeed] = useState({});
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);

    api
      .getFeed()
      .then((posts) => {
        setLoading(false);
        setFeed(
          posts.reduce((acc, i) => {
            acc[i.id] = i;
            return acc;
          }, {})
        );
      })
      .catch((error) => {
        setError(error.message);
        setLoading(false);
      });
  }, []);

  function likeHandler(postID) {
    if (
      feed[postID].likes &&
      feed[postID].likes.find((l) => l.user_id === document.session.user_id)
    ) {
      api.unlike(postID).then(() => {
        let likes = feed[postID].likes.filter((l) => l.user_id !== document.session.user_id);

        setFeed({
          ...feed,
          [postID]: {
            ...feed[postID],
            likes,
          },
        });
      });
    } else {
      api.like(postID).then(() => {
        let likes = [...(feed[postID].likes || [])];

        if (!likes.find((l) => l.user_id == document.session.user_id)) {
          likes.push({
            user_id: document.session.user_id,
            user_name: document.session.user_name,
          });
        }

        setFeed({
          ...feed,
          [postID]: {
            ...feed[postID],
            likes,
          },
        });
      });
    }
  }

  function postHandler({ comment, images }) {
    return api
      .createPost({
        text: comment,
        images: images.map((image) => image.file),
      })
      .then((post) => {
        setFeed({
          ...feed,
          [post.id]: post,
        });
      });
  }

  function commentHandler(postId, comment) {
    return api.createComment(postId, comment).then((commentId) => {
      let comments = feed[postId].comments || [];

      comments = [...comments, {
        id: commentId,
        user_id: document.session.user_id,
        user_name: document.session.user_name,
        text: comment,
        created_at: new Date().toISOString()
      }]

      setFeed({
        ...feed,
        [postId]: {
          ...feed[postId],
          comments
        }
      });

      return commentId;
    })
  }

  if (error) {
    return (
      <div>
        <p>Sorry, an error occured. Please retry.</p>
        <pre>{error}</pre>
      </div>
    );
  }

  return (
    <Fragment>
      <Header />
      <Form onSubmit={postHandler} />
      <Feed loading={loading} feed={feed} onLike={likeHandler} onComment={commentHandler} />
      <Footer />
    </Fragment>
  );
}
