import React, { Fragment } from "react";
import api from "./api";
import Header from "./Header";
import Feed from "./Feed";
import Footer from "./Footer";
import Form from "./Form";
import useSWR from "swr";

// App is the main component, and is mainly concerned with high-level features
// like state management and top-level components.
export function App() {
  const {
    feed,
    error,
    loading,
    createPost,
    deletePost,
    createComment,
    deleteComment,
    likePost,
  } = useFeed();

  if (error) {
    return (
      <div>
        <p>Sorry, an error occured. Please retry.</p>
        <pre>{feedError.message}</pre>
      </div>
    );
  }

  return (
    <Fragment>
      <Header />
      <Form onSubmit={createPost} />
      <Feed
        loading={loading}
        feed={feed}
        onLike={likePost}
        onComment={createComment}
        onDeleteComment={deleteComment}
        onDeletePost={deletePost}
      />
      <Footer />
    </Fragment>
  );
}

function useFeed() {
  const { data: feed, error, mutate } = useSWR("/feed", api.getFeed, { refreshInterval: 10000 });

  function likeHandler(postID) {
    if (
      feed[postID].likes &&
      feed[postID].likes.find((l) => l.user_id === document.session.user_id)
    ) {
      api.unlike(postID).then(() => {
        let likes = feed[postID].likes.filter((l) => l.user_id !== document.session.user_id);

        mutate({
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

        mutate({
          ...feed,
          [postID]: {
            ...feed[postID],
            likes,
          },
        });
      });
    }
  }

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
        mutate({
          ...feed,
          [post.id]: post,
        });
      });
  }

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

      mutate({
        ...feed,
        [postId]: {
          ...feed[postId],
          comments,
        },
      });

      return commentId;
    });
  }

  function deleteCommentHandler(postId, commentId) {
    return api.deleteComment(postId, commentId).then(() => {
      mutate({
        ...feed,
        [postId]: {
          ...feed[postId],
          comments: feed[postId].comments.filter((comment) => comment.id !== commentId),
        },
      });
    });
  }

  function deletePostHandler(postId) {
    return api.deletePost(postId).then(() => {
      const newFeed = { ...feed };
      delete newFeed[postId];

      mutate(newFeed);
    });
  }

  return {
    feed: feed,
    error: error,
    loading: !feed && !error,
    createPost: createPostHandler,
    deletePost: deletePostHandler,
    createComment: createCommentHandler,
    deleteComment: deleteCommentHandler,
    likePost: likeHandler,
  };
}
