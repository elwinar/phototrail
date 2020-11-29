import React, { Fragment, useState, useEffect, useCallback } from "react";
import api from "./api";
import Feed from "./Feed";
import Form from "./Form";
import useSWR, { useSWRInfinite } from "swr";

// App is the main component, and is mainly concerned with high-level features
// like state management and top-level components.
function App() {
  const {
    feed,
    error,
    loading,
    createPost,
    deletePost,
    createComment,
    deleteComment,
    likePost,
    loadMorePosts,
  } = useFeed();

  if (error) {
    return (
      <div>
        <p>Sorry, an error occured. Please retry.</p>
        <pre>{error.message}</pre>
      </div>
    );
  }

  return (
    <Fragment>
      <Form onSubmit={createPost} />
      <Feed
        loading={loading}
        feed={feed}
        onLike={likePost}
        onComment={createComment}
        onDeleteComment={deleteComment}
        onDeletePost={deletePost}
        onLoadMore={loadMorePosts}
      />
    </Fragment>
  );
}

function useFeed() {
  const { data: pages, error, mutate, size, setSize } = useSWRInfinite(getKey, api.getFeed, {
    //refreshInterval: 10000,
    initialSize: 1,
  });

  const [feed, setFeed] = useState(flattenFeedPages(pages));
  useEffect(() => {
    setFeed(flattenFeedPages(pages));
  }, [pages]);

  const likeHandler = useCallback(
    function likeHandler(postID) {
      const post = pages.find((page) => page[postID] !== undefined)[postID];

      if (post.likes && post.likes.find((l) => l.user_id === document.session.user_id)) {
        api.unlike(postID).then(() => {
          let likes = post.likes.filter((l) => l.user_id !== document.session.user_id);

          setFeed({
            ...feed,
            [postID]: {
              ...feed[postID],
              likes,
            },
          });

          mutate();
        });
      } else {
        api.like(postID).then(() => {
          let likes = [...(post.likes || [])];

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

          mutate();
        });
      }
    },
    [feed]
  );

  const createPostHandler = useCallback(
    function createPostHandler({ comment, images }) {
      if ((!comment || !comment.length) && (!images || !images.length)) {
        return Promise.resolve();
      }

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

          mutate();
        });
    },
    [feed]
  );

  const createCommentHandler = useCallback(
    function createCommentHandler(postId, comment) {
      return api.createComment(postId, comment).then((commentId) => {
        let comments = feed[postId].comments || [];

        comments = [
          ...comments,
          {
            id: commentId,
            user_id: document.session.user_id,
            user_name: document.session.user_name,
            text: comment,
            created_at: new Date().toISOString(),
          },
        ];

        setFeed({
          ...feed,
          [postId]: {
            ...feed[postId],
            comments,
          },
        });

        mutate();

        return commentId;
      });
    },
    [feed]
  );

  const deleteCommentHandler = useCallback(
    function deleteCommentHandler(postId, commentId) {
      return api.deleteComment(postId, commentId).then(() => {
        setFeed({
          ...feed,
          [postId]: {
            ...feed[postId],
            comments: feed[postId].comments.filter((comment) => comment.id !== commentId),
          },
        });

        mutate();
      });
    },
    [feed]
  );

  const deletePostHandler = useCallback(
    function deletePostHandler(postId) {
      return api.deletePost(postId).then(() => {
        const newFeed = { ...feed };
        delete newFeed[postId];

        setFeed(newFeed);

        mutate();
      });
    },
    [feed]
  );

  const loadMoreHandler = useCallback(
    function loadMoreHandler() {
      setSize(size + 1);
    },
    [size]
  );

  return {
    feed: feed,
    error: error,
    loading: !feed && !error,
    createPost: createPostHandler,
    deletePost: deletePostHandler,
    createComment: createCommentHandler,
    deleteComment: deleteCommentHandler,
    likePost: likeHandler,
    loadMorePosts: loadMoreHandler,
  };
}

function flattenFeedPages(pages) {
  if (!pages) {
    return null;
  }

  const res = pages.reduce((acc, curr) => {
    return { ...acc, ...curr };
  }, {});

  if (res.length == 0) {
    return null;
  }

  return res;
}

const getKey = (index, previous) => {
  let key = `limit=${document.config.pageSize}`;

  // If we're on the first page, don't bother with the cursor.
  if (index === 0) {
    return key;
  }

  // If there is no previous page, or if the previous page was uncomplete,
  // return null to cancel the fetch.
  if (!previous || Object.keys(previous).length !== document.config.pageSize) {
    return null;
  }

  // Use the date of the oldest post as cursor.
  const oldest = Object.values(previous).sort((a, b) => (a.created_at > b.created_at ? 1 : -1))[0];
  key += `&from=${oldest.created_at}`;

  return key;
};

export default App;
