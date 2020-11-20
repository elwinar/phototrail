# Phototrail API

## Authentication

With the API token retrieved from Auth0's flow. This token must be provided in
each request to the API endpoint.

```
Authorization: Bearer <token>
```

## Errors

Error are represented by the `error` key of the response.

```
500 Internal Server Error

{
	"error": "error message"
}
```

## GET /feed

```
GET /feed?from=2006-01-02T15:04:05Z&limit=20
```

The `from` parameter will default to the current time if absent, and `limit`
will default to 20.

```
200 OK

{
	"posts": [
		{
			"id": 1,
			"user_id": 1,
			"user_name": "Alice",
			"text": "J'aime les ananas",
			"created_at": "2006-01-02T15:04:05Z",
			"images": ["10329D92012120AF.jpg", "12921812AFDC12912.png"],
			"likes": [
				{"user_id": 1, "user_name": "Alice"},
				{"user_id": 2, "user_name": "Bob"}
			],
			"comments": [
				{
					"id": 1,
					"user_id": 2,
					"user_name": "Bob",
					"text": "Moi aussi!",
					"created_at": "2006-01-02T15:04:05Z"
				}
			]
		}
	]
}
```

## POST /posts

```
POST /posts

{
	"text": "J'aime les ananas"
}
```

## DELETE /posts/1

## POST /posts/1/images

```
POST /posts/1/images
Content-Type: image/jpeg

<binary data>
```

## POST /posts/1/like

## DELETE /posts/1/like

### POST /posts/1/comments

```
POST /comments

{
	"text": "Moi aussi!"
}
```

### DELETE /posts/1/comments/1

