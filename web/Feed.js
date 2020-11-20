import React, { useContext, useEffect, useState } from "react";
import styles from "./Feed.scss";
import api from "./api";
import { Card } from "./Card";

export default function Feed() {
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
        let likes = feed[postID].likes.filter(
          (l) => l.user_id !== document.session.user_id
        );

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

  if (loading) {
    return (
      <div>
        <p>Loading, please wait….</p>
      </div>
    );
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
    <ul className={styles.Feed}>
      {Object.values(feed).map((post) => {
        return (
          <li key={post.id}>
            <Card post={post} onLike={likeHandler} />
          </li>
        );
      })}
    </ul>
  );
}
