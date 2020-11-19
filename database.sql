create table users (
	id unsigned integer,
	name varchar(255) not null,

	primary key (id)
);

create table posts (
	id unsigned integer,
	user_id unsigned integer not null,
	text text,
	created_at datetime default current_timestamp,

	primary key (id),
	foreign key (user_id) references users(id) on delete cascade
);

create table images (
	post_id unsigned integer,
	path varchar(255),

	primary key (post_id, path),
	foreign key (post_id) references posts(id) on delete cascade
);

create table likes (
	post_id unsigned integer,
	user_id unsigned integer,

	primary key (post_id, user_id),
	foreign key (post_id) references posts(id) on delete cascade,
	foreign key (user_id) references users(id) on delete cascade
);

create table comments (
	id unsigned integer,
	post_id unsigned integer,
	user_id unsigned integer,
	text text,
	created_at datetime default current_timestamp,

	primary key (id),
	foreign key (post_id) references posts(id) on delete cascade,
	foreign key (user_id) references users(id) on delete cascade
);
