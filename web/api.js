// first param is the key from swr
function getFeed(params) {
  return call(`${document.config.baseURL}/feed?${params}`, {
    method: "GET",
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.error) {
        throw new Error(data.error);
      }

      if (!data.posts) {
        return {};
      }

      return data.posts.reduce((acc, curr) => {
        acc[curr.id] = curr;
        return acc;
      }, {});
    });
}

function createPost({ text, images = [] }) {
  return call(`${document.config.baseURL}/posts`, {
    method: "POST",
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
            images: [...new Set(res)],
          };
        }
      );
    });
}

function uploadImage(postID, image) {
  return call(`${document.config.baseURL}/posts/${postID}/images`, {
    method: "POST",
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
  return call(`${document.config.baseURL}/posts/${postID}`, {
    method: "DELETE",
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
  return call(`${document.config.baseURL}/posts/${postID}/like`, {
    method: "POST",
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
  return call(`${document.config.baseURL}/posts/${postID}/like`, {
    method: "DELETE",
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
  return call(`${document.config.baseURL}/posts/${postID}/comments`, {
    method: "POST",
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
  return call(`${document.config.baseURL}/posts/${postID}/comments/${commentID}`, {
    method: "DELETE",
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.error) {
        throw new Error(data.error);
      }
      return data.acknowledged;
    });
}

function call(url, options) {
  if (!options.headers) {
    options.headers = {};
  }
  options.headers.Authorization = `Bearer ${document.session.token}`;

  return fetch(url, options).then((res) => {
    // If we get anything but a 401, it's the caller's job to handle the rest.
    // 401 means the token is fucked up, and we handle this.
    if (res.status != 401) {
      return res;
    }

    // Use the refresh token to get a new access token.
    return fetch(`${document.config.baseURL}/refresh`, {
      method: "POST",
      body: JSON.stringify({
        refresh_token: document.session.refresh_token,
      }),
    })
      .then((res) => res.json())
      .then((res) => {
        // Update the session with the new access_token and refresh_token.
        document.session.token = res.access_token;
        document.session.refresh_token = res.refresh_token;
        document.session.expiration = Date.now() + res.expires_in * 1000;
        localStorage.setItem("session", JSON.stringify(document.session));

        // Update the request headers with the new access_token and start
        // again.
        options.headers.Authorization = "Bearer " + document.session.token;
        return fetch(url, options);
      });
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
