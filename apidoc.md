# Phototrail API

## Authentication

With the API token retrieved from Auth0's flow.

```
Authentication: Bearer <token>
```

## Errors

```
500 Internal Server Error

{
	"error": "error message"
}
```

## GET /feed

```
GET /feed
```

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
				{"id": 1, "name": "Alice"},
				{"id": 2, "name": "Bob"}
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
Content-Type: multipart/form-data

{
	"text": "J'aime les ananas"
}

<images>
```

## DELETE /posts/1

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

