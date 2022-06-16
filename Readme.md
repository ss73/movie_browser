# Movie Database Browser

The Movie Database Browser is a demonstration application to show how SQLite compiled into wasm can be a way of getting high performance and data visualization flexibility in a web application.

You can access the application directly [here](https://ss73.github.io/movie_browser/). Once the page is loaded, all database access is performed purely in the frontend and no further network requests are made.

## Running the application locally
To run the application locally, you will need to serve the application directory by a web server. There are multiple approaches to doing this and one option is to use the popular [```http-server```](https://www.npmjs.com/package/http-server) tool. 

Assuming http-server is installed, open a terminal window, cd to the application directory and run:
```
http-server
```
Next, open a web browser and point it to http://localhost:8080

If you wish stop the server, press ```Ctrl-C```

## Setup a new IMDB database

In order to build a new database, a python tool
[```imdb-sqlite```](https://github.com/jojje/imdb-sqlite) is utilized. It will import IMDB TSV files into a SQLite database.

It will fetch the files from IMDB unless you've already fetched them earlier.

The program relies on the following IMDB tab separated files:

- ```title.basics.tsv.gz```: Video titles such as movies, documentaries, tv series, episodes etc.
- ```name.basics.tsv.gz```: People in the entertainment business.
- ```title.akas.tsv.gz```: Alternative names for titles, for different languages.
- ```title.principals.tsv.gz```: Mapping of who participated in which title (movie / show).
- ```title.episode.tsv.gz```: Season and episode numbers, for episodes of shows.
- ```title.ratings.tsv.gz```: Current rating and vote count for the titles.

### Installation

**Please Note**: The IMDB files and resulting database is quite large. You should have at least 30 GBytes free disk space

You need to have Python installed first. Then, to install imdb-sqlite, run:
```
pip install imdb-sqlite
```
After installation, run it from the directory you installed the Movie Database Browser:
```
imdb-sqlite
```
The download and database setup can take significat time as it is a big database. When done you should have a new database file ``ìmdb.db`` in the working directory as well as the downloaded files in a new ```downloads``` subfolder (this folder can be deleted if you want to free up disk space)

### Purging records

In order to get a managable database file for running in-memory in a browser, you should purge some of the records. The purged database will contain only "mainstream" movies which have more than 6000 votes as well as ratings, actors and crew. This should bring the database size down to about 10 MBytes. In order to purge, run the following commands (MacOS or Linux):
```
cp imdb.db movies.db
cat purgedb.sql | sqlite3 movies.db
sqlite3 movies.db "VACUUM;"
```
You may delete the large ```imdb.db``` file if you want to free up disk space