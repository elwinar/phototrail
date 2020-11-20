import React, { useContext, useEffect, useState } from "react";
import { sessionContext } from "./App";

export default function Feed() {
  const session = useContext(sessionContext);
  const [feed, setFeed] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);

    fetch(`${document.config.baseURL}/feed`, {
      method: "GET",
      headers: {
        Authorization: "Bearer " + session.token,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          setLoading(false);
          return;
        }
        setLoading(false);
        setFeed(data.posts || []);
      })
      .catch((error) => {
        setError(error.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div>Loading, please wait...</div>;
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
    <ul className="feed">
      {feed.map((post) => {
        return (
          <li key={post.id}>
            <PostCard post={post} />
          </li>
        );
      })}
    </ul>
  );
}

function PostCard({ post }) {
  return (
    <article className="card">
      <header>
        {post.user_name}
        <div>{new Date(post.created_at).toLocaleDateString()}</div>
      </header>
      <div>
        {post.images &&
          post.images.map((path) => {
            return <img key={path} src={`${document.config.baseURL}${path}`} alt={path} />;
          })}
      </div>
      <section>
        <p>{post.text}</p>
      </section>
      <footer>Likes: {post.likes && post.likes.length.toLocaleString()}</footer>
    </article>
  );
}
