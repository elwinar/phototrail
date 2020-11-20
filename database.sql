create table users (
	id integer,
	sub varchar(255) not null,
	name varchar(255) not null,

	primary key (id),
	unique (sub)
);

create table posts (
	id integer,
	user_id integer not null,
	text text,
	created_at datetime default current_timestamp,

	primary key (id),
	foreign key (user_id) references users(id) on delete cascade
);

create table images (
	post_id integer,
	path varchar(255),

	primary key (post_id, path),
	foreign key (post_id) references posts(id) on delete cascade
);

create table likes (
	post_id integer,
	user_id integer,

	primary key (post_id, user_id),
	foreign key (post_id) references posts(id) on delete cascade,
	foreign key (user_id) references users(id) on delete cascade
);

create table comments (
	id integer,
	post_id integer,
	user_id integer,
	text text,
	created_at datetime default current_timestamp,

	primary key (id),
	foreign key (post_id) references posts(id) on delete cascade,
	foreign key (user_id) references users(id) on delete cascade
);
