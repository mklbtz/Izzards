drop table if exists Game;

create table Game (
    code text primary key not null,
	players text not null,
	state text not null
);
