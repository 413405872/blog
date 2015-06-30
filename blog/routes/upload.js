// var express = require('express'),
    // router = express.Router(),
    // User = require('../models/user.js'),
	// Post = require('../models/post.js'),
    // crypto = require('crypto');

// router.get('/', function (req, res) {
  // res.render('upload', {
    // title: '文件上传',
	// result: req.session.result
  // });
// });
// router.post('/', function (req, res) {
	// res.locals.success='文件上传成功';
	// req.session.result='OK';
	// res.redirect('/');
// });

// module.exports = router;



var express = require('express')
    router = express.Router(),    
    formidable = require('formidable'),
	User = require('../models/user.js'),
	Post = require('../models/post.js'),
    fs = require('fs'),
    TITLE = 'formidable上传示例',
    AVATAR_UPLOAD_FOLDER = '/images/';

/* GET home page. */
router.get('/', function(req, res) {
  res.render('upload', { title: TITLE,
	result: req.session.result
	});
});

router.post('/', function(req, res) {

  var form = new formidable.IncomingForm();   //创建上传表单
      form.encoding = 'utf-8';        //设置编辑
      form.uploadDir = 'public' + AVATAR_UPLOAD_FOLDER;     //设置上传目录
      form.keepExtensions = true;     //保留后缀
      form.maxFieldsSize = 2 * 1024 * 1024;   //文件大小
    form.parse(req, function(err, fields, files) {

        if (err) {
          res.locals.error = err;
          //res.redirect('/login');
		  res.render('upload', { title: TITLE });
          return;        
        }  
        var extName = '';  //后缀名
		console.log(files.fileupload.name);//这个是文件名字
		console.log(files.fileupload.type);//这个是文件后缀
		//console.log(files.fileupload.url);//这个是文件路径！！！！发现这个是错误的
		console.log(files.fileupload.size);//这个是文件大小
        switch (files.fileupload.type) {//fulAvatar
            case 'image/pjpeg':
                extName = 'jpg';
                break;
            case 'image/jpeg':
                extName = 'jpg';
                break;         
            case 'image/png':
                extName = 'png';
                break;
            case 'image/x-png':
                extName = 'png';
                break;         
        }

        if(extName.length == 0){
              res.locals.error = '只支持png和jpg格式图片';
              //res.redirect('/login');
			  res.render('upload', { title: TITLE });
              return;                   
        }

        var avatarName = Math.random() + '.' + extName;
        var newPath = form.uploadDir + avatarName;

        console.log(newPath);
        fs.renameSync(files.fileupload.path, newPath);  //重命名
    });

    res.locals.success = '上传成功';
    res.redirect('/');
	//res.render('index', { title: TITLE });      
});


module.exports = router;