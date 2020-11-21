function getFeed() {
  return fetch(`${document.config.baseURL}/feed`, {
    method: "GET",
    headers: {
      Authorization: "Bearer " + document.session.token,
    },
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.error) {
        throw new Error(data.error);
      }
      return data.posts || {};
    });
}

function createPost({ text, images = [] }) {
  return fetch(`${document.config.baseURL}/posts`, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + document.session.token,
    },
    body: JSON.stringify({ text }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.error) {
        throw new Error(data.error);
      }

      return Promise.all(Array.from(images).map((image) => uploadImage(data.post_id, image))).then(
        (res) => {
          return {
            id: data.post_id,
            user_id: document.session.user_id,
            user_name: document.session.user_name,
            text: text,
            created_at: new Date().toISOString(),
            likes: null,
            comments: null,
            images: res,
          };
        }
      );
    });
}

function uploadImage(postID, image) {
  return fetch(`${document.config.baseURL}/posts/${postID}/images`, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + document.session.token,
    },
    body: image,
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.error) {
        throw new Error(data.error);
      }

      return data.path;
    });
}

function deletePost(postID) {
  return fetch(`${document.config.baseURL}/posts/${postID}`, {
    method: "DELETE",
    headers: {
      Authorization: "Bearer " + document.session.token,
    },
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.error) {
        throw new Error(data.error);
      }
      return data.acknowledged;
    });
}

function like(postID) {
  return fetch(`${document.config.baseURL}/posts/${postID}/like`, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + document.session.token,
    },
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.error) {
        throw new Error(data.error);
      }
      return data.acknowledged;
    });
}

function unlike(postID) {
  return fetch(`${document.config.baseURL}/posts/${postID}/like`, {
    method: "DELETE",
    headers: {
      Authorization: "Bearer " + document.session.token,
    },
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.error) {
        throw new Error(data.error);
      }
      return data.acknowledged;
    });
}

function createComment(postID, text) {
  return fetch(`${document.config.baseURL}/posts/${postID}/comments`, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + document.session.token,
    },
    body: JSON.stringify({ text }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.error) {
        throw new Error(data.error);
      }

      return data.comment_id;
    });
}

function deleteComment(postID, commentID) {
  return fetch(`${document.config.baseURL}/posts/${postID}/comments/${commentID}`, {
    method: "DELETE",
    headers: {
      Authorization: "Bearer " + document.session.token,
    },
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.error) {
        throw new Error(data.error);
      }
      return data.acknowledged;
    });
}

export default {
  getFeed,
  createPost,
  deletePost,
  like,
  unlike,
  createComment,
  deleteComment,
};
