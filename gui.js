var execBtn = document.getElementById("execute");
var outputElm = document.getElementById('output');
var errorElm = document.getElementById('error');
var searchElm = document.getElementById('search');
var commandsElm = document.getElementById('commands');
var sqlEditorElm = document.getElementById("sqleditor");
var editorElm = document.getElementById("commands");
var searchboxElm = document.getElementById("searchbox");
var chartElm = document.getElementById('chart')
var chartInstance

// Start the worker in which sql.js will run
var worker = new Worker("lib/sqljs/worker.sql-wasm.js");
worker.onerror = error;

// Open a database
worker.postMessage({ action: 'open' });


// Connect to the HTML element we 'print' to
function print(text) {
	outputElm.innerHTML = text.replace(/\n/g, '<br>');
}
function error(e) {
	if(e.message)
		console.log(e);
	errorElm.style.height = '2em';
	errorElm.textContent = e.message;
}

function noerror() {
	errorElm.style.height = '0';
}

function toggleEditor() {
	if((sqlEditorElm.style.display=='none') || (sqlEditorElm.style.visibility=='hidden')) {
		sqlEditorElm.style.display = 'block'
		searchboxElm.style.display = 'none'
	}
	else {
		sqlEditorElm.style.display = 'none'
		searchboxElm.style.display = 'block'
	}
}

// Run a command in the database
function execute(commands) {
	worker.onmessage = function (event) {
		var results = event.data.results;
		if (!results) {
			error({message: event.data.error});
			return;
		}
		
		outputElm.innerHTML = "";
		for (var i = 0; i < results.length; i++) {
			outputElm.appendChild(tableCreate(results[i].columns, results[i].values));
		}
	}
	worker.postMessage({ action: 'exec', sql: commands });
	if(chartInstance)
		chartInstance.destroy()
	outputElm.textContent = "Fetching results...";
}


// Create an HTML table
var tableCreate = function () {
	function valconcat(vals, tagName) {
		if (vals.length === 0) return '';
		var open = '<' + tagName + '>', close = '</' + tagName + '>';
		return open + vals.join(close + open) + close;
	}
	return function (columns, values) {
		var tbl = document.createElement('table');
		var heading = ""
		if(columns)
		heading = '<thead>' + valconcat(columns, 'th') + '</thead>';
		var rows = values.map(function (v) { 
			return valconcat(v, 'td');
		});
		html = heading + '<tbody>' + valconcat(rows, 'tr') + '</tbody>';
		tbl.innerHTML = html;
		return tbl;
	}
}();

// Execute the commands when the button is clicked
function execEditorContents() {
	noerror()
	execute(editorElm.value + ';');
}
execBtn.addEventListener("click", execEditorContents, true);


function getTopMovies(sortBy = 'rating') {
	worker.onmessage = function (event) {
		var results = event.data.results;
		if (!results) {
			error({message: event.data.error});
			return;
		}
		
		outputElm.innerHTML = "";
		const columns = results[0].columns.slice(1)
		const values = results[0].values
		const ids = values.map((l) => l.shift())
		values.map((l, ix) => l[0] = `<a href="javascript:getMovie('${ids[ix]}')">${l[0]}</a>`)
		outputElm.appendChild(tableCreate(columns, values));
	}
	const sql = `
    SELECT 
      title_id, 
      primary_title AS Title, 
      premiered AS Year, 
      runtime_minutes AS Runtime, 
      rating AS Rating 
    FROM movies 
    WHERE votes > 50000 
    ORDER BY ${sortBy} DESC 
    LIMIT 100`
	console.log(sql)
	worker.postMessage({ action: 'exec', sql: sql });
	if(chartInstance)
		chartInstance.destroy()
	outputElm.textContent = "Fetching results...";
}

function getPerson(person_id) {
	worker.onmessage = function (event) {
		var results = event.data.results;
		if (!results) {
			error({message: event.data.error});
			return;
		}
		
		outputElm.innerHTML = "";
		outputElm.innerHTML = renderPersonData(results[0].values[0], results[1].values)
	}
	const sql = `SELECT 
	name, 
	born, 
	died
	FROM persons 
	WHERE person_id = "${person_id}"; 
	
	SELECT 
	movies.title_id, 
	primary_title AS Title,
	category AS Role, 
	premiered AS Year 
	FROM movies, staff
	WHERE staff.person_id = "${person_id}"
	AND movies.title_id = staff.title_id 
	ORDER BY premiered DESC 
	`
	console.log(sql)
	worker.postMessage({ action: 'exec', sql: sql });
	if(chartInstance)
		chartInstance.destroy()
	outputElm.textContent = "Fetching results...";	
}

/**
* basic_data: [title, original title, release year, runtime, rating, votes]
* cast_data: [name, role, character(s), born][]
* crew_data: [name, role, job, born][]
*/
function renderMovieData(basic_data, cast_data, crew_data) {
	const cast_ids = cast_data.map((l) => l.shift())
	cast_data.map((l, ix) => l[0] = `<a href="javascript:getPerson('${cast_ids[ix]}')">${l[0]}</a>`)
	
	cast_data.map((row) => row[2] = row[2].replace(/[\[\]\"]/gi, ''))
	const cast_html = tableCreate(["Name", "Type", "Role(s)"], cast_data).outerHTML
	
	const crew_ids = crew_data.map((l) => l.shift())
	crew_data.map((l, ix) => l[0] = `<a href="javascript:getPerson('${crew_ids[ix]}')">${l[0]}</a>`)
	const crew_html = tableCreate(["Name", "Job", "Notes"], crew_data).outerHTML
	const basic_html = `
    <h2>${basic_data[0]}</h2>
    <ul>
      <li><b>Original Title:</b> ${basic_data[1]}</li>
      <li><b>Release Year:</b> ${basic_data[2]}</li>
      <li><b>Runtime:</b> ${basic_data[3]} minutes</li>
      <li><b>Rating:</b> ${basic_data[4]} (${basic_data[5]} votes)</li>
    </ul>
	<h2>Cast</h2>
	${cast_html}
	<h2>Crew</h2>
	${crew_html}
	`
	return basic_html
}

/**
* basic_data: [title, original title, release year, runtime, rating, votes]
* cast_data: [name, role, character(s), born][]
* crew_data: [name, role, job, born][]
*/
function renderPersonData(basic_data, movie_data) {
	const movie_ids = movie_data.map((l) => l.shift())
	movie_data.map((l, ix) => l[0] = `<a href="javascript:getMovie('${movie_ids[ix]}')">${l[0]}</a>`)
	const movie_html = tableCreate(["Title", "Role", "Year"], movie_data).outerHTML
	
	const basic_html = `
	<h2>${basic_data[0]}</h2>
  	<ul>
	  <li><b>Born:</b> ${basic_data[1]}</li>
	  <li><b>Died:</b> ${basic_data[2]?basic_data[2]:'-'}</li>
	</ul>
	<h2>Titles</h2>
	${movie_html}
	`
	return basic_html
}

function getDiligentActors(limit = 100) {
	const query = `
	SELECT DISTINCT 
	  staff.person_id, 
	  persons.name AS Name, 
	  count(staff.person_id) AS Appearances 
	FROM
	  staff, 
	  persons 
	WHERE 
	  staff.person_id = persons.person_id
	  AND staff.category in ("actor", "actress")
	GROUP BY staff.person_id
	ORDER BY count(staff.person_id) DESC
	LIMIT ${limit}`
	createPersonTable(query)
}

function getDiligentProducers(limit = 100) {
	const query = `
	SELECT DISTINCT 
	  staff.person_id, 
	  persons.name AS Name, 
	  count(staff.person_id) AS Productions 
	FROM
	  staff, 
	  persons 
	WHERE 
	  staff.person_id = persons.person_id
	  AND staff.category in ("producer")
	GROUP BY staff.person_id
	ORDER BY count(staff.person_id) DESC
	LIMIT ${limit}`
	createPersonTable(query)
}

function getDiligentDirectors(limit = 100) {
	const query = `
	SELECT DISTINCT 
	  staff.person_id, 
	  persons.name AS Name, 
	  count(staff.person_id) AS Titles 
	FROM
	  staff, 
	  persons 
	WHERE 
	  staff.person_id = persons.person_id
	  AND staff.category in ("director")
	GROUP BY staff.person_id
	ORDER BY count(staff.person_id) DESC
	LIMIT ${limit}`
	createPersonTable(query)
}

function getDiligentComposers(limit = 100) {
	const query = `
	SELECT DISTINCT 
	  staff.person_id, 
	  persons.name AS Name, 
	  count(staff.person_id) AS Productions 
	FROM
	  staff, 
	  persons 
	WHERE 
	  staff.person_id = persons.person_id
	  AND staff.category in ("composer")
	GROUP BY staff.person_id
	ORDER BY count(staff.person_id) DESC
	limit ${limit}`
	createPersonTable(query)
}

function getRatingsDistribution() {
	const query = `
	SELECT DISTINCT 
	  rating AS Rating, 
	  count(rating) AS Frequency 
	FROM movies 
	GROUP BY rating`
	
	worker.onmessage = function (event) {
		var results = event.data.results;
		if (!results) {
			error({message: event.data.error});
			return;
		}
		const columns = results[0].columns
		let values = results[0].values
		const labels = values.map((l) => l.shift())
		values = values.map((l) => l[0])
		const data = {
			labels: labels,
			datasets: [{
				label: 'Movie rating distribution',
				backgroundColor: 'rgb(255, 99, 132)',
				borderColor: 'rgb(255, 99, 132)',
				data: values,
			}]
		};
		
		const config = {
			type: 'bar',
			data: data,
			options: {}
		};
		if(chartInstance)
			chartInstance.destroy()
		chartInstance = new Chart(
			chartElm,
			config
		);
		outputElm.innerHTML = '';
	}
	console.log(query)
	worker.postMessage({ action: 'exec', sql: query });
	if(chartInstance)
		chartInstance.destroy()
	outputElm.textContent = "Fetching results...";	
}

function getReleaseDistribution() {
	const query = `
	SELECT DISTINCT 
		premiered AS Year, 
		count(premiered) AS Count 
	FROM 
		movies 
	GROUP BY premiered 
	ORDER BY premiered
	`
	
	worker.onmessage = function (event) {
		var results = event.data.results;
		if (!results) {
			error({message: event.data.error});
			return;
		}
		const columns = results[0].columns
		let values = results[0].values
		const labels = values.map((l) => l.shift())
		values = values.map((l) => l[0])
		const data = {
			labels: labels,
			datasets: [{
				label: 'Premieres per year',
				backgroundColor: 'rgb(255, 99, 132)',
				borderColor: 'rgb(255, 99, 132)',
				data: values,
			}]
		};
		
		const config = {
			type: 'line',
			data: data,
			options: {}
		};
		if(chartInstance)
			chartInstance.destroy()
		chartInstance = new Chart(
			chartElm,
			config
		);
		outputElm.innerHTML = '';
	}
	console.log(query)
	worker.postMessage({ action: 'exec', sql: query });
	if(chartInstance)
		chartInstance.destroy()
	outputElm.textContent = "Fetching results...";	
}

function createPersonTable(query) {
	worker.onmessage = function (event) {
		var results = event.data.results;
		if (!results) {
			error({message: event.data.error});
			return;
		}
		const columns = results[0].columns.slice(1)
		const values = results[0].values
		const ids = values.map((l) => l.shift())
		values.map((l, ix) => l[0] = `<a href="javascript:getPerson('${ids[ix]}')">${l[0]}</a>`)
		const html = tableCreate(columns, values).outerHTML
		outputElm.innerHTML = html;
	}
	console.log(query)
	worker.postMessage({ action: 'exec', sql: query });
	if(chartInstance)
		chartInstance.destroy()
	outputElm.textContent = "Fetching results...";
}

function getMovie(title_id) {
	worker.onmessage = function (event) {
		var results = event.data.results;
		if (!results) {
			error({message: event.data.error});
			return;
		}
		outputElm.innerHTML = "";
		outputElm.innerHTML = renderMovieData(results[0].values[0], results[1].values, results[2].values)
	}
	const sql = `
	SELECT 
	  primary_title AS Title, 
	  original_title AS "Original Title", 
	  premiered AS Year, 
	  runtime_minutes AS Runtime, 
	  rating AS Rating, 
	  votes AS Votes 
	FROM movies 
	WHERE title_id = "${title_id}"; 
	
	SELECT 
	  staff.person_id,
	  name AS Name, 
	  category AS Role, 
	  characters AS Character 
	FROM staff, persons 
	WHERE title_id="${title_id}" 
	  AND category IN ("actor", "actress") 
	  AND staff.person_id = persons.person_id; 
	
	SELECT
	  staff.person_id, 
	  name AS Name, 
	  category AS Role, 
	  job AS Notes 
	FROM staff, persons 
	WHERE title_id="${title_id}" 
	  AND category NOT IN ("actor", "actress") 
	  AND staff.person_id = persons.person_id
	`
	console.log(sql)
	worker.postMessage({ action: 'exec', sql: sql });
	if(chartInstance)
		chartInstance.destroy()
	outputElm.textContent = "Fetching results...";
}

function searchMovie(fragment) {
	if (fragment.length < 3)
	return
	worker.onmessage = function (event) {
		var results = event.data.results;
		if (!results) {
			error({message: event.data.error});
			return;
		}
		
		outputElm.innerHTML = "";
		const columns = results[0].columns.slice(1)
		const values = results[0].values
		const ids = values.map((l) => l.shift())
		values.map((l, ix) => l[0] = `<a href="javascript:getMovie('${ids[ix]}')">${l[0]}</a>`)
		outputElm.appendChild(tableCreate(columns, values));
	}
	const sql = `
	SELECT 
	  title_id, 
	  primary_title AS Title, 
	  premiered AS Year, 
	  runtime_minutes AS Runtime, 
	  rating AS Rating 
	FROM movies 
	WHERE primary_title like "%${fragment}%"
	LIMIT 50`
	console.log(sql)
	worker.postMessage({ action: 'exec', sql: sql });
	if(chartInstance)
		chartInstance.destroy()
	outputElm.textContent = "Fetching results...";
}
searchElm.onkeyup = () => searchMovie(searchElm.value)

// Load pre-defined DB
async function loadMovieDB() {
	console.log("Loading movies")
	const res = await fetch("movies.db")
	const buf = await res.arrayBuffer()
	worker.onmessage = (event) => {
		editorElm.value = "SELECT `name`, `sql`\n  FROM `sqlite_master`\n  WHERE type='table';"
		getTopMovies()
	}
	worker.postMessage({
		id:1,
		action:"open",
		buffer:buf,
	});
}
document.onload = loadMovieDB()

