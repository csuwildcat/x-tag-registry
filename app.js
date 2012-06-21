var express = require('express'),
	app = express.createServer(),
	exgf = require('amanda'),
	Sequelize = require('sequelize');

var sequelize = new Sequelize('xtags', 'xtagregistry', 'password123', {
	dialect: 'sqlite',
	storage: 'data/xtags.sqlite'
});

var XTagRepo = sequelize.define('XTagRepo', {
	repo: 	{ type: Sequelize.STRING, unique: true, allowNull: false, validate:{ isUrl: true } },
	title: 	{ type: Sequelize.STRING, allowNull: false },
	description: Sequelize.TEXT,
	author: { type: Sequelize.STRING },
	email: 	{ type: Sequelize.STRING, validate: { isEmail: true }},
	revision: { type: Sequelize.STRING }
});

var XTagElement = sequelize.define('XTagElement', {	
	name: { type: Sequelize.STRING },
	description: { type: Sequelize.TEXT },
	category: { type: Sequelize.STRING }, 
	compatibility: { type: Sequelize.TEXT },
	demo_url: { type: Sequelize.STRING, validation: { isUrl: true }},
	raw: { type: Sequelize.TEXT }
});
XTagRepo.hasMany(XTagElement);

var githubSchema = {
	type: 'object',
	properties: {
		'repository':{
			required: true,
			type: 'object',
			properties: {
				'url': { type: 'string', required: true },
				'name': { type: 'string', required: true },
				'description': { type: 'string', required: true },
				'owner': {
					type: 'object',
					properties: {
						'email':  { type: 'string', required: true },
						'name':  { type: 'string', required: true },
					}
				}
			}
		},
		'after': {
			required: true,
			type: 'string',
			length: 40
		},
		'ref': {
			required: true,
			type: 'string'
		}

	}
}

console.log("db-sync:", sequelize.sync());

app.use(express.logger());
app.use(express.bodyParser());

app.post('/customtag', function(req, res){
	exgf.validate(req.body, githubSchema, function(err){
		if (err){
			console.log("deal breaker:", req.body);
			return res.send(400);
		}

		console.log("POSTED Data:", req.body);

		addUpdateRepo(req.body, findControls);

		res.send(200);

	});
});

app.get('/search', function(req, res){

});

var addUpdateRepo = function(ghData, callback){	
	XTagRepo.find({ where: { repo: ghData.repository.url }}).success(function(repo){
		console.log("searched for repo", ghData.repository.url);
		if (repo){
			repo.updateAttributes({ 
				title: ghData.repository.name,
				description: ghData.repository.description,
				email: ghData.repository.owner.email,
				revision: ghData.after
			}).error(function(err){
				console.log("UPDATE-ERR", err, ghData.repository.url);				
			}).success(function(){
				console.log("repo " + repo.repo + " updated");
				callback(repo.repo, ghData.ref);
			});
		} else {
			repo = XTagRepo.create({ 
				repo: ghData.repository.url,
				title: ghData.repository.name, 
				description: ghData.repository.description,
				author: ghData.repository.owner.name,
				email: ghData.repository.owner.email,
				revision: ghData.after
			}).error(function(err){
				console.log("CREATE-ERR", err, ghData.repository.url);
			}).success(function(){
				console.log("repo " + repo.repo + " created");
				callback(repo.repo,  ghData.ref);
			});
		}
	});
}

var findControls = function(repoUrl, branch){
	//https://github.com/pennyfx/FlightDeck
	console.log("looking around for controls", repoUrl);
	var xtagJsonUrl = "https://raw.github.com/{user}/{repo}/{branch}/xtag.json";
	var urlParts = repoUrl.split('/');
	var branchParts = branch.split('/');
	xtagJsonUrl = xtagJsonUrl.replace('{user}', urlParts[urlParts.length-2])
		.replace('{repo}', urlParts[urlParts.length-1])
		.replace('{branch}', branchParts[branchParts.length-1]);
	console.log("fetching", xtagJsonUrl);
	//https://raw.github.com/sdepold/sequelize/master/xtag.json

}

app.listen(process.env.PORT || 3000);