#!/bin/sh
set -e
imdb-sqlite
mv imdb.db movies.db
echo "Purging database"
cat purgedb.sql | sqlite3 movies.db
echo "Compacting DB file"
sqlite3 movies.db "VACUUM;"