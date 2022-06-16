CREATE TABLE movies AS
SELECT
	titles.title_id,
	titles.primary_title,
	titles.original_title,
	titles.premiered,
	titles.runtime_minutes,
	ratings.rating,
	ratings.votes
FROM
	titles,
	ratings
WHERE
	ratings.title_id = titles.title_id
	AND ratings.votes > 6000
	AND ratings.rating > 1
	AND titles.type = "movie";

CREATE TABLE staff AS
	SELECT * 
	FROM crew 
	WHERE crew.title_id IN (SELECT title_id FROM movies);

CREATE TABLE persons AS
	SELECT *
	FROM people 
	WHERE people.person_id IN(SELECT staff.person_id FROM staff);

DROP TABLE akas;
DROP TABLE crew;
DROP TABLE episodes;
DROP TABLE people;
DROP TABLE ratings;
DROP TABLE titles;
