var crypto = require('crypto'),
    User = require('../models/user.js'),
	Post = require('../models/post.js'),
	Comment = require('../models/comment.js');
var express = require('express');
var router = express.Router();


var formidable = require('formidable'),
    fs = require('fs'),
    AVATAR_UPLOAD_FOLDER = '/images/';

/* GET home page. */
router.get('/', function(req, res) {
	//判断是否是第一页，并把请求的页数转换成 number 类型
	var page = req.query.p ? parseInt(req.query.p) : 1;//这里通过 req.query.p 获取的页数为字符串形式，我们需要通过 parseInt() 把它转换成数字以作后用。
	//查询并返回第 page 页的 10 篇文章
	Post.getTen(null, page, function(err, posts,total) {
		if (err) {
			res.locals.error=err;
			posts = [];
		}
		res.locals.success = 'WW空间'; 
		res.render('index', {
			title: '主页',
			result: req.session.result,
			posts: posts,
			page: page,
			isFirstPage: (page - 1) == 0,
			isLastPage: ((page - 1) * 10 + posts.length) == total
		});
	});
});

//这个是注册的路由规则
router.get('/reg', checkNotLogin);
router.get('/reg', function (req, res) {
    res.render('reg', 
	{	title: '注册',
		result: req.session.result
		});
});
router.post('/reg', checkNotLogin);
router.post('/reg', function (req, res) {
	//这个就是你页面post过来的值啊，你注册是不是会输入用户，密码啥的，然后点击注册后就post这些值。
	var name = req.body.txtUserName,
		password = req.body.txtUserPwd,
		password_re = req.body['txtUserRePwd'],
		email =req.body.txtUserEmail;
	//生成密码的 md5 值.........首先我要对你密码加密，因为我存入数据库是加密后的密码
	var md5 = crypto.createHash('md5'),
		password = md5.update(req.body.txtUserPwd).digest('hex');
	var newUser = new User({
		name: name,
		password: password,
		email: req.body.txtUserEmail//这里用email也行,上面的定义只不过是个中间变量
	});
	//检查用户名是否已经存在 。。。。。这边就是我要先检验一下这个“用户名”在数据库中有没有，有了那就不存在，你得重新来过
	User.get(newUser.name, function (err, result) {
		if (result) {
			err = '用户名已存在';
		}//当用户名存在的时候，我给err一个值，它是不会再去执行save的。
		if (err) {
			res.locals.error = err;
			res.redirect('/reg');//这边要注意一定是这个，不是render
			return;
		}
		//如果不存在则新增用户，这个时候我是要进行数据库存储的。这里用了一个“闭包机制”。
		newUser.save(function (err, result) {
			if (err) {
				res.locals.error = err;
				res.redirect('/reg'); 
				return;
			}
			res.locals.success = '注册成功';
			res.locals.name = newUser.name;
			req.session.name = res.locals.name;//用户信息存入 session
			//我艹还真有效，这个你得看下result出来的结果发现不仅仅那一点东西，还有很多
			res.locals.result = result.ops[0];
			req.session.result = res.locals.result;
			res.redirect('/');
		});
	});
});


//下面是登录
router.get('/login', checkNotLogin);  
router.get('/login', function (req, res) {
	res.render('login', {
		title: '登录',
		result: req.session.result
	});
});
router.post('/login', checkNotLogin);  
router.post('/login', function (req, res) {
	//生成密码的 md5 值
	var md5 = crypto.createHash('md5'),
		isRem = req.body.chbRem,
		password = md5.update(req.body.txtUserPwd).digest('hex');
	//检查用户是否存在
	User.get(req.body.txtUserName, function (err, result) {
		if (!result) {
			res.locals.error = '用户不存在';
			return res.redirect('/login');
		}
		//检查密码是否一致
		if (result.password != password) {
			res.locals.error = '用户名或密码有误';
			res.redirect('/login');//如果你这个是错的你就还停留在在login页面
			return;
		}
		//用户名密码都匹配后，将用户信息存入 session
		if(isRem) { 
			res.cookie('islogin', name, { maxAge: 60000 });               
		}
		//然后这个是写入session
		res.locals.success = '登录成功';
		res.locals.name = req.body.txtUserName;
		req.session.name = res.locals.name;
		res.locals.result = result;
		req.session.result = res.locals.result;
		res.redirect('/');
	});
});


//下面是上传文章的
router.get('/post', checkLogin);  
router.get('/post', function (req, res) {
    res.render('post', {
		title: '发表',
		result: req.session.result });
});
router.post('/post', checkLogin);  
router.post('/post', function (req, res) {
	var currentusername = req.session.name,//这边name过来的已经是一个完整的包括name,title,post了//本来result是name的
		currentuserhead = req.session.head,
		tags = [req.body.tag1, req.body.tag2, req.body.tag3];
	var md5 = crypto.createHash('md5'),//这三句是搞头像的
		email_MD5 = md5.update(req.session.result.email.toLowerCase()).digest('hex'),
		head = "http://www.gravatar.com/avatar/" + email_MD5 + "?s=48";
	var	post = new Post(//这里和post.js中定义相关。
		{
			name: currentusername,
			head: head,
			title: req.body.title, 
			post:  req.body.post,
			tags: tags,
			pic: req.body.pic
		});
  
	  //要在post.ejs中加上enctype='multipart/form-data'
	  //下面这个想搞图片的
	// var form = new formidable.IncomingForm();   //创建上传表单
    // form.encoding = 'utf-8';        //设置编辑
    // form.uploadDir = 'public' + AVATAR_UPLOAD_FOLDER;     //设置上传目录
    // form.keepExtensions = true;     //保留后缀
    // form.maxFieldsSize = 2 * 1024 * 1024;   //文件大小
    // form.parse(req, function(err, fields, files) {
        // if (err) {
          // res.locals.error = err;
		  // res.render('/', { title: TITLE });
          // return;        
        // }
        // var extName = '';  //后缀名
        // switch (files.pic.type) {//fulAvatar
            // case 'image/pjpeg':
                // extName = 'jpg';
                // break;
            // case 'image/jpeg':
                // extName = 'jpg';
                // break;         
            // case 'image/png':
                // extName = 'png';
                // break;
            // case 'image/x-png':
                // extName = 'png';
                // break;         
        // }

        // if(extName.length == 0){
              // res.locals.error = '只支持png和jpg格式图片';
			  // res.render('/', { title: TITLE });
              // return;                   
        // }

        // var avatarName = Math.random() + '.' + extName;
        // var newPath = form.uploadDir + avatarName;
		
		
		
		// post.pic=newPath;
		
        // console.log(newPath);
        // fs.renameSync(files.pic.path, newPath);  //重命名
		// console.log(files.pic.path);
    // });
	  

	post.save(function (err,result) {//这个参数一定要对应的
		if (err) {
			res.locals.error = err;
            res.render('/', { title: '发布失败' });
            return;
		}
		res.locals.success='发布成功';
		res.locals.result = result.ops[0];//这个你需要从他的输出看他是什么结构
		//req.session.result = res.locals.result;
		// console.log("怎么post8");
		// console.log(req.session.result);
		// console.log("怎么post9");
		// console.log(result);
		// console.log(req.session.result);
		
		//这下面几句是一定要的
		res.locals.name = post.name;
		res.locals.title = post.title;
		res.locals.post = post.post;
		res.locals.head = post.head;
		req.session.name=res.locals.name;
		req.session.title=res.locals.title;
		req.session.post=res.locals.post;
		req.session.head=res.locals.head;
		req.session.pic = post.pic;
		//检测
		// console.log(req.session.pic);
		// console.log(req.session.title);
		// console.log(req.session.post);
		// res.locals.post = post;//有效，不过这个是传的一个整体，就是传的post.name,post.title,post.post
		// req.session.post = res.locals.post;//有效
		// console.log(req.session.post);//有效，这个就是相当于一个post的整体
		res.redirect('/');
	});
});

//下面是用来“存档”的路由规则，就是你get存档这个URL时，这个会将文章给列出来，getArchive就是这个功能
router.get('/archive', function (req, res) {
	Post.getArchive(function (err, posts) {
		if (err) {
			req.flash('error', err); 
			return res.redirect('/');
		}
		res.render('archive', {
			title: '存档',
			posts: posts,
			result: req.session.result
		});
	});
});  



//标签路由，就是你又很多标签，C++，Java啊等等getTags
router.get('/tags', function (req, res) {
	Post.getTags(function (err, posts) {
		if (err) {
			req.flash('error', err); 
			return res.redirect('/');
		}
		res.render('tags', {
			title: '标签',
			posts: posts,
			result: req.session.result
		});
	});
});


//特定标签路由，这个就是具体到某一个特定的标签了
router.get('/tags/:tag', function (req, res) {
	Post.getTag(req.params.tag, function (err, posts) {
		if (err) {
			req.flash('error',err); 
			return res.redirect('/');
		}
		res.render('tag', {
			title: 'TAG:' + req.params.tag,
			posts: posts,
			result: req.session.result
		});
	});
});


//这个是友情链接了
router.get('/links', function (req, res) {
	res.render('links', {
		title: '友情链接',
		result: req.session.result
	});
});



//模糊搜索，这个搜索search
router.get('/search', function (req, res) {
	Post.search(req.query.keyword, function (err, posts) {
		if (err) {
			req.flash('error', err); 
			return res.redirect('/');
		}
		res.render('search', {
			title: "SEARCH:" + req.query.keyword,
			posts: posts,
			result: req.session.result//其实这里用不用它都无所谓吧
		});
	});
});




//下面是用户页面请求。
//新添加的。。。。第4章。用来处理访问用户页的请求，然后从数据库取得该用户的数据并渲染 user.ejs 模版，生成页面并显示给用户
router.get('/u/:name', function (req, res) {
	var page = req.query.p ? parseInt(req.query.p) : 1;
	//检查用户是否存在
	User.get(req.params.name, function (err, user) {
		if (!user) {
			res.locals.error = '用户不存在';
            res.render('login',{title:'登录'});
            return;
		}
    //查询并返回该用户的所有文章
		Post.getTen(user.name, page, function (err, posts, total) {
			if (err) {
				res.locals.error = err;
				res.render('/', { title: '读取失败' });
				return;
			}
			res.render('user', {
				title: user.name,
				posts: posts,
				result : req.session.result,
				page: page,
				isFirstPage: (page - 1) == 0,//用来判断是否为第一页
				isLastPage: ((page - 1) * 10 + posts.length) == total//判断是否为最后一页
			});
		});
	}); 
});





//下面是文章页面请求。这个只要请求一篇文章，get是没有问题的
router.get('/u/:name/:day/:title', function (req, res) {
	Post.getOne(req.params.name, req.params.day, req.params.title, function (err, post) {
		if (err) {
			req.flash('error', err); 
			return res.redirect('/');
		}
		// console.log("怎么回事5");
		// console.log(req.params.name);
		// console.log(req.params.day);
		// console.log(req.params.title);
		// console.log(req.session.result);
		// console.log(post);
		// console.log("怎么回事6");
		res.render('article', {
			title: req.params.title,
			post: post,
			result: req.session.result
		});
	});
});


//下面是注册留言的响应,这个只要保存留言就好了
router.post('/u/:name/:day/:title', function (req, res) {
	var currentUser=req.session.result;//这个是为comment服务，他要求记录你现在留言人的名字，邮箱等
	// console.log("怎么回事8");
	// console.log(currentUser);
	// console.log("怎么回事9");
	if (!currentUser) {//这个就是用来解决你未登录情况下你就开始评论的
		//console.log("怎么回事4");
		res.locals.error = '先登录';
        return res.redirect('/login');
		}
	var date = new Date(),
		time = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " + 
             date.getHours() + ":" + (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes());
	var md5 = crypto.createHash('md5'),//这三句是搞头像的
		email_MD5 = md5.update(req.body.email.toLowerCase()).digest('hex'),
		head = "http://www.gravatar.com/avatar/" + email_MD5 + "?s=48";
	var comment = {
		name: currentUser.name,
		head: head,
		email: currentUser.email,
		website: req.body.website,
		time: time,
		content: req.body.content
	};
	//console.log("怎么回事4");
	// console.log(req.params.name);
	// console.log(req.params.day);
	// console.log(req.params.title);
	// console.log(comment);
	// console.log("怎么回事5");
	//一定是req.params.name（从你评论的这个文章这边获取的作者名字），不能是currentUser.name(这是你留言者的名字)是这个原因你这个name应该是你文章的名字，你不能拿文章作者名字去搜索啊
	var newComment = new Comment(req.params.name, req.params.day, req.params.title, comment);
	newComment.save(function (err) {
		if (err) {
			req.flash('error', err); 
			return res.redirect('back');
		}
		req.flash('success', '留言成功!');
		res.redirect('back');//留言成功后返回到文章页
	});
});


//下面这个而是编辑已经写好的文章，单纯的编辑写的文章，然后这个写要放进数据库的
router.get('/edit/:name/:day/:title', checkLogin);
router.get('/edit/:name/:day/:title', function (req, res) {
	var currentUser = req.session.name;//你看这边你编辑的时候只会有自己登陆号的名字
	// console.log("怎么回事1");
	// console.log(currentUser);
	// console.log("怎么回事2");
	Post.edit(currentUser, req.params.day, req.params.title, function (err, post) {
		if (err) {
			req.flash('error', err);
			return res.redirect('back');
		}
		// console.log("怎么回事3");
		// console.log(post);
		// console.log("怎么回事4");
		res.render('edit', {
			title: '编辑',
			post: post,
			result: req.session.result
		});
	});
});

//下面这个是保存修改后的文章，当你点击以后就会进行更新了。因为它们（保存和编辑的路径是一样的）的路径都是一样的你发现没有，
router.post('/edit/:name/:day/:title', checkLogin);
router.post('/edit/:name/:day/:title', function (req, res) {
	var currentUser = req.session.name;//这个也是只有登陆号的名字
	Post.update(currentUser, req.params.day, req.params.title, req.body.post, function (err) {
		var url = encodeURI('/u/' + currentUser + '/' + req.params.day + '/' + req.params.title);
		if (err) {
			req.flash('error', err); 
			return res.redirect(url);//出错！返回文章页
		}
		res.locals.success = '修改成功';
		res.redirect(url);//成功！返回文章页
	});
});


//删除一篇文章
router.get('/remove/:name/:day/:title', checkLogin);
router.get('/remove/:name/:day/:title', function (req, res) {
	var currentUser = req.session.name;
	Post.remove(currentUser, req.params.day, req.params.title, function (err) {
		if (err) {
			req.flash('error', err);
			return res.redirect('back');
		}
		req.flash('success', '删除成功!');
		res.redirect('/');
	});
});


//转载文章的页面获取情况，路由响应
router.get('/reprint/:name/:day/:title', checkLogin);
router.get('/reprint/:name/:day/:title', function (req, res) {
	Post.edit(req.params.name, req.params.day, req.params.title, function (err, post) {
		if (err) {
			req.flash('error', err); 
			return res.redirect('back');
		}
		var currentUser = req.session.result,
			reprint_from = {name: post.name, day: post.time.day, title: post.title},//这个就是文章原有的用户
			reprint_to = {name: currentUser.name, head: currentUser.head};//这个就是目前登录的用户
			console.log("怎么回事3");
			console.log(currentUser.head);
			console.log("怎么回事4");
		Post.reprint(reprint_from, reprint_to, function (err, post) {
			if (err) { 
				return res.redirect('back');
			}
			// console.log("怎么回事3");
			// console.log(currentUser);
			// console.log(reprint_from);
			// console.log(reprint_to);
			// console.log(post);
			// console.log("怎么回事4");
			res.locals.success = '转载成功';
			var url = encodeURI('/u/' + post.name + '/' + post.time.day + '/' + post.title);
			//跳转到转载后的文章页面
			res.redirect(url);
		});
	});
});
  
  

router.get('/logout', checkLogin);
router.get('/logout', function (req, res) {
	req.session.destroy();//此时这个session就清除掉
	res.redirect('/login');//然后回到登录界面
});
  

//访问不行的时候访问404...这个问题是，如果加上下面这个我的upload就没法用了，但是我知道upload放到这个里面肯定就可以用
// router.use(function (req, res) {
  // res.render("404");
// });

  
function checkLogin(req, res, next) {
    if (!req.session.name) {//或者换成res.locals.name
		req.flash('error', '未登录!'); 
		res.redirect('/login');
    }
    next();
}

function checkNotLogin(req, res, next) {
    if (req.session.name) {
		req.flash('error', '已登录!'); 
		res.redirect('back');
    }
    next();
}
  
module.exports = router;
