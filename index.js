var express = require('express');
var fs = require('fs');
var request = require('request');
var bodyParser = require('body-parser');
var moment = require('moment');
const util = require('util');
var pool = require('./database');
var app = express();
app.set('view engine', 'ejs');
app.set('views', './views');
app.use(express.static('public'));
// environment variables
process.env.NODE_ENV = 'development';

// uncomment below line to test this code against staging environment
// process.env.NODE_ENV = 'staging';

// config variables
const config = require('./config/config.js');
const requestPromise = util.promisify(request);

app.get('/', async (req, res) => {
  let activeMenu = 'home';
  res.render('pages/home', { activeMenu});
});

app.get('/paging-home', async (req, res) => {
  let draw = req.query.draw;
  let row = req.query.start;
  let rowperpage = req.query.length; // Rows display per page
  let checkColumnIndex = req.query.order;
  if (typeof checkColumnIndex == "undefined") {
    var columnName = 'score.id'; // Column name
    var columnSortOrder = 'desc'; // asc or desc
  } else {
    let columnIndex = req.query.order[0]['column']; // Column index
    var columnName = req.query.columns[columnIndex]['data']; // Column name
    var columnSortOrder = req.query.order[0]['dir']; // asc or desc
  }

  // console.log('columnName' +columnName);

  let searchValue = req.query.search['value']; // Search value

  let searchByTitle = req.query.searchByTitle.trim();
  let score = req.query.score.trim();
  let scoreQuery = req.query.scoreQuery.trim();

  let searchQuery = " ";
  if (searchByTitle.length > 0) {
    searchQuery += ` and (title like '%${searchByTitle}%' ) `;
  }

  if (score.length > 0 && scoreQuery.length > 0) {
    searchQuery += ` and (score ${scoreQuery} ${score}) `;
  }

  if (searchValue.length > 0 && searchByTitle.length == 0) {
    searchQuery = ` and (title like '%${searchByTitle}%')`;
  }

  // Total number of records without filtering
  let totalData = await pool.query("select count(*) as allcount from sys_score_game");
  let totalRecords = totalData[0].allcount;

  // Total number of records with filtering
  totalData = await pool.query(`select count(*) as allcount from sys_score_game WHERE 1 ${searchQuery}`);
  let totalRecordwithFilter = totalData[0].allcount;

  // Fetch records
  let dataQuery = `SELECT * FROM sys_score_game as score  WHERE 1 ${searchQuery} order by ${columnName} ${columnSortOrder} limit ${row},${rowperpage}`;
  //console.log('dataQuery '+dataQuery);
  dataQuery = await pool.query(dataQuery);
  var data = [];
  dataQuery.forEach(function (item) {
    let imageHtml = `<img width="100" height="100" src="/images/${item.image}">`;
    data.push({
      'stt': '',
      'image': imageHtml,
      'title': item.title,
      'description': item.description,
      'score': item.score,
      'loai_website_id': item.name,
      'release_date': moment(new Date(item.release_date)).format("DD-MM-YYYY"),
      'created_at': moment(new Date(item.created_at)).format("DD-MM-YYYY HH:mm:ss"),
    })
  });
  var response = {
    "draw": draw,
    "iTotalRecords": totalRecords,
    "iTotalDisplayRecords": totalRecordwithFilter,
    "aaData": data
  };
  //console.log(dataQuery);
  res.json(response);
});

var server = app.listen(global.gConfig.node_port);
console.log('Magic happens on port ' + global.gConfig.node_port);
exports = module.exports = app;