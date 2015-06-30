//下面这一段是“模块”
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

//下面这个也叫模块，只不过是自定义的“路由模块”
var routes = require('./routes/index');
var upload = require('./routes/upload');
var settings = require('./settings');
var flash = require('connect-flash');
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);
var multer = require('multer');

var app = express();//生成一个express实例

//view engine setup
//设置views文件夹为存放视图文件的目录, 即存放"模板文件"的地方,
//__dirname 为全局变量,存储当前正在执行的脚本所在的目录。
app.set('views', path.join(__dirname, 'views'));
//设置视图模板引擎为 ejs
app.set('view engine', 'ejs');
app.use(flash());

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
//加载日志中间件
app.use(logger('dev'));
//加载解析json的中间件
app.use(bodyParser.json());
//加载解析urlencoded请求体的中间件。
app.use(bodyParser.urlencoded({ extended: false }));
//加载解析cookie的中间件。
app.use(cookieParser());
//设置public文件夹为存放静态文件的目录。
app.use(express.static(path.join(__dirname, 'public')));


app.use(cookieParser('Huang'));//参数后加
//这个中间件
app.use(session({secret:'Huang'}));//后加

//下面这两个就是路由控制器了，其实这个东西你可以写一个路由，再写一个控制器
app.use('/', routes);
app.use('/upload',upload);
// catch 404 and forward to error handler
//捕获404错误，并转发到错误处理器。
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
//开发环境下的错误处理器，将错误信息渲染error模版并显示到浏览器中。
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

/*
使用 express-session 和 connect-mongo 模块实现了将会化信息存储到mongoldb中。
secret 用来防止篡改 cookie，key 的值为 cookie 的名字，通过设置 cookie 的 
maxAge 值设定 cookie 的生存期，这里我们设置 cookie 的生存期为 30 天，设置它
的 store 参数为 MongoStore 实例，把会话信息存储到数据库中，以避免丢失。在后
面我们可以通过 req.session 获取当前用户的会话对象，获取用户的相关信息。
*/

app.use(session({
  secret: settings.cookieSecret,
  key: settings.db,//cookie name
  cookie: {maxAge: 1000 * 60 * 60 * 24 * 30},//30 days
  store: new MongoStore({
    db: settings.db,
    host: settings.host,
    port: settings.port
  })
}));

//这是监听端口
app.listen(8080, function(){
     console.log("Server has start! Port: 8080");
});


//导出app实例供其他模块调用
module.exports = app;
