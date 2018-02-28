
let auth, creator, username, dp, info, quickie, bookmark, topbar, theme;
let model, fbProfile = null;

Parse.initialize( "1e3bc14f-0975-4cb6-9872-bff78542f22b" );
Parse.serverURL = "https://parse.buddy.com/parse";


let GOOGLE_API_KEY = "AIzaSyDypHKQ7C0LtLgv9fkd0VJcEdAvJjrdNEQ";
var opts = {
	lines: 13, // The number of lines to draw
	length: 38, // The length of each line
	width: 10, // The line thickness
	radius: 45, // The radius of the inner circle
	position: 'absolute' // Element positioning
};
const spin = new Spinner( opts ).spin();
$("#my-spinner").html( spin.el );
$.fn.serializeObject = function() {
	var o = {};
	var a = this.serializeArray();
	$.each(a, function() {
		if (o[this.name]) {
			if (!o[this.name].push) {
				o[this.name] = [o[this.name]];
			}
			o[this.name].push(this.value || '');
		} else {
			o[this.name] = this.value || '';
		}
	});
	return o;
};

if( Parse.User.current() != null ) {
	Parse.User.current().fetch();
}
fetch("/gradients.json").then(res=>res.json()).then(json=>{
	let index = Math.floor(Math.random()*json.length);
	let colors = json[index].colors;
	console.log( colors[0], colors[colors.length-1] );
	$("body").css({
		"background": `linear-gradient( ${colors[0]}, ${colors[colors.length-1]})`
	});
});

const Model = Backbone.Model.extend();
const Goog = Backbone.Model.extend({
	urlRoot: `https://www.googleapis.com/urlshortener/v1/url?key=${GOOGLE_API_KEY}`
});

window.fbAsyncInit = function() {
	Parse.FacebookUtils.init({
		appId 	: "1778142652491392",	// Facebook App ID
		status 	: false,				// check Facebook Login status
		cookie 	: true,				// enable cookies to allow Parse to access the session
		xfbml 	: true,				// initialize Facebook social plugins on the page
		version 	: "v2.11"				// point to the latest Facebook Graph API version
	});
	if( auth == null ) auth = new Auth();
	$("#my-spinner").show();
	auth.checkLogin().then( response => {
		if( response.status == "connected" && Parse.User.current() != null ) {
			auth.getProfile().then( prof => auth.afterLogin( prof ) );
		} else {
			auth.render();
		}
	});
};

const Auth = Backbone.View.extend({
	el: "#auth",
	events: {
		"click .login-btn": "openLogin"
	},
	openLogin: function( ev ) {
		ev.preventDefault();
		let self = this;
		$("#my-spinner").show();
		Parse.FacebookUtils.logIn("email,public_profile", {
			success: function(user) {
				self.getProfile().then( prof => self.afterLogin( prof ) );
			},
			error: function(user, error) {
				$("#my-spinner").hide();
				console.log("User cancelled the Facebook login or did not fully authorize.");
				$.sticky("User cancelled the Facebook login or did not fully authorize.");
			}
		});
	},
	getProfile: function() {
		return new Promise(( resolve ) => {
			FB.api("/me?fields=id,name,email,picture,cover", function( response ) {
				resolve( response );
			});
		});
	},
	checkLogin: function() {
		return new Promise(( resolve )=>{
			FB.getLoginStatus( resolve );
		});
	},
	afterLogin: function( prof ) {
		$(".page").hide();
		$(".main-page").fadeIn();
		fbProfile = prof;	
		if( username == null ) username = new Username();
		username.render();
		model = new Model();
		model.on("change:profile", ( model, profile )=>{ info.render(); });
		model.on("change:image", ( model, image )=>{ dp.render(); });
		model.on("change:favbtns", ( model, favbtns )=>{ quickie.render(); });
		model.on("change:links", ( model, links )=> bookmark.render() );
		model.on("change:theme", ( model )=> theme.render() );

		dp = new DP();
		info = new Info();
		quickie = new Quickie();
		bookmark = new Bookmark();
		topbar = new Topbar();
		theme = new Theme();

		let profile = { name: "Excited user", email: "", about: "Excited to see this", mobile: "" }
		profile = $.extend( profile, fbProfile, Parse.User.current().get( "profile" ) );
		delete profile.cover;
		delete profile.picture;

		model.set( "profile", profile );
		model.set("favbtns", Parse.User.current().get("favbtns"));
		model.set("links", Parse.User.current().get("links"));
		model.set("theme", Parse.User.current().get("theme"));
		if ( Parse.User.current().get("image") != null ) {
			model.set( "image", Parse.User.current().get("image") );
		} else {
			model.set( "image", fbProfile.picture.data.url );
		}
		Parse.User.current().set("email", fbProfile.email);
	},
	render: function() {
		$( ".page" ).hide();
		this.$el.show();
		return this;
	}
});

const Topbar = Backbone.View.extend({
	el: "#topbar",
	events: {
		"click .signout": "signOut",
		"click .save": "save"
	},
	save: function( ev ) {
		ev.preventDefault();
		let favbtns = [];
		let bookmarks = [];
		quickie.$el.find('.links .link').each(function(index, el) {
			favbtns.push( $( el ).data("raw") );
		});
		bookmark.$el.find('.links .link').each(function(index, el) {
			let els = $( el );
			bookmarks.push(els.data("raw"));
		});
		console.log( bookmarks );
		let user = Parse.User.current();
		user.set( "image", model.get("image") );
		user.set( "profile", model.get("profile") );
		user.set( "favbtns", favbtns );
		user.set( "links", bookmarks );
		user.set( "theme", model.get("theme") );
		console.log( user.toJSON() );
		$.sticky( "Saving..." );
		user.save().then(()=>{
			$.sticky( "Saved" );
		}, ()=>{
			$.sticky( "Could not saved" );
		});
	},
	signOut: function( ev ) {
		ev.preventDefault();
		let self = this;
		Parse.User.logOut().then(()=> auth.render() );
	}
});

const Username = Backbone.View.extend({
	el: "#username",
	facebookShareUrl: `https://www.facebook.com/sharer/sharer.php?u=`,
	twitterShareUrl: `https://twitter.com/home?status=`,
	render: function() {
		this.$el.find('input').val( Parse.User.current().get("username") );
		this.updateShareLink( Parse.User.current().get("username") );
		return this;
	},
	events: {
		"submit form": "updateUsername",
		"keyup input": "inputKeyUp",
		"click #sharer .close": "closeSharer",
		"click .copy-share-link": "copyShareLink"
	},
	openSharer: function() {
		this.$el.find("#sharer").show();
	},
	closeSharer: function() {
		this.$el.find("#sharer").hide();
	},
	updateUsername: function( ev ) {
		ev.preventDefault();
		var self = this;
		let username = this.$el.find('input').val().toLowerCase();
		if( username.length < 4 ) {
			$.sticky("Username is too short");
			return false;
		}
		let user = Parse.User.current();
		user.set("username", username);
		$.sticky( "updating username" );
		user.save().then(function( user ) {
			$.sticky( "username updated" );
			self.openSharer();
		}, function( user, error ) {
			$.sticky( error.message );
			console.log( user, error );
		});
	},
	inputKeyUp: function( ev ) {
		this.updateShareLink( ev.currentTarget.value );
	},
	updateShareLink: function( username ) {
		this.$el.find('.share-link').text( `${location.origin}/${username}` );
		this.$el.find('#sharer .share-on-facebook').attr("href", this.facebookShareUrl+`${location.origin}/${username}`);
		this.$el.find('#sharer .share-on-twitter').attr("href", this.twitterShareUrl+`${location.origin}/${username}`);
		$('.preview').attr({
			href: `${location.origin}/${username}`
		});
	},
	copyShareLink: function() {
		let ta = document.createElement( "textarea" );
		$( ta ).addClass('clipboard-textarea');
		ta.value = this.$el.find('.share-link').text().trim();
		$( "body" ).append( ta );
		ta.select();
		let fa = document.execCommand( "copy" );
		if( fa ) {
			$.sticky( "Link copied" );
		} else {
			$.sticky( "Something went wrong" );
		}
		ta.remove();
	}
});

const Theme = Backbone.View.extend({
	el: "#app-theme",
	render: function() {
		this.$el.find('.theme-selector').val( model.get("theme") );
		$("#app-theme-link").attr( "href", model.get("theme") );
		return this;
	},
	events: {
		"change .theme-selector": "changeTheme"
	},
	changeTheme: function( ev ) {
		model.set("theme", ev.currentTarget.value );
	}
});

const DP = Backbone.View.extend({
	el: "#dp",
	initialize: function() {
		this.croppie = new Croppie(this.$el.find("#picture")[0], {
			viewport: {
				width: 240,
				height: 240,
				type: 'circle'
			}
		});
	},
	render: function() {
		let u = null;
		if( model.get("image").type == "file" ) {
			u = model.get("image").data.url()
		} else {
			u = model.get("image").data
		}
		this.croppie.bind({ url: u, points: [ 0,0,640,640 ] });
		return this;
	},
	events: {
		"click .change-picture": "updateProfilePicture",
		"click .profile-image": "removeProfilePicture",
		"change .picture-selector": "changePicture"
	},
	changePicture: function( ev ) {
		let self = this;
		let fr = new FileReader();
		fr.onload = ( r ) => {
			self.croppie.bind({
				url: r.target.result
			})
		}
		fr.readAsDataURL( ev.target.files[0] );
	},
	removeProfilePicture: function( ev ) {
		ev.preventDefault();
		model.set( "image", fbProfile.picture.data.url );
		$.sticky( "Changed to default Profile picture" );
	},
	updateProfilePicture: function( ev ) {
		let self = this;
		ev.preventDefault();
		this.croppie.result({
			type:"base64",
			quality: 0.5,
			size: { width:640, height: 640 },
			format: "jpeg"
		}).then(r=>{
			let parseProfilePicFile = new Parse.File(fbProfile.id+".jpg", { base64: r });
			$.sticky( "Uploading porfile picture" );
			parseProfilePicFile.save().then((file)=>{
				model.set("image", {
					type: "file",
					data: file
				});
				$.sticky( "Profile picture uploaded" );
			}, () =>$.sticky( "Profile picture couldn't uploaded" ))
		});
	}
});

const Info = Backbone.View.extend({
	el: "#info",
	render: function() {
		this.$el.find("[name=name]").val( model.get("profile").name );
		this.$el.find("[name=about]").val( model.get("profile").about );
		this.$el.find("[name=mobile]").val( model.get("profile").mobile );
		this.$el.find("[name=email]").val( model.get("profile").email );
		return this;
	},
	events: {
		"submit form": "updateInfo"
	},
	updateInfo: function( ev ) {
		ev.preventDefault();
		let profile = $( ev.currentTarget ).serializeObject();
		model.set( "profile", profile );
	}
});

const Quickie = Backbone.View.extend({
	el: "#quickie",
	initialize: function() {
		this.template = _.template( this.$el.find("#q-tmpl").html() );
		Sortable.create( document.querySelector('#quickie .links') );
		return this;
	},
	render: function() {
		let self = this;
		this.model = Parse.User.current().get("favbtns");
		if ( model.get("favbtns") ) {
			this.$el.find(".links").empty();
			model.get("favbtns").forEach((e,i)=> self.renderQuickie( e ) );
		}
		return this;
	},
	events: {
		"click .count": "countClick",
		"click .remove": "removeQuickie",
		"change .sitename": "changeTypeInfo",
		"submit form": "addQuickie"
	},
	countClick: function( ev ) {
		ev.preventDefault();
		if($.trim(ev.currentTarget.dataset.url)=="") {
			$.sticky("Click count is only available for newly added links");
			return false;
		}
		$.get(`https://www.googleapis.com/urlshortener/v1/url`,{
			shortUrl: ev.currentTarget.dataset.url,
			projection: "FULL",
			key: GOOGLE_API_KEY
		}).done(r=>{
			ev.currentTarget.innerHTML = r.analytics.allTime.shortUrlClicks
		}).fail(console.error);
	},
	renderQuickie: function( d ) {
		let self = this;
		d = $.extend({ url: null, short_url:null }, d);
		let temp = $( self.template( d ) );
		temp.data( "raw", d );
		self.$el.find('.links').append( temp );
		console.log( d );
	},
	changeTypeInfo: function( ev ) {
		ev.preventDefault();
		let type = ev.currentTarget.value;
		switch ( type ) {
			case "whatsapp": this.$el.find('.info').text( "Enter mobile with ISD code" ); break;
			case "facebook": this.$el.find('.info').text( "Enter facebook userid" ); break;
			case "instagram": this.$el.find('.info').text( "Enter instagram userid" ); break;
			default: this.$el.find('.info').text( "Enter userid only" ); break;
		}
		this.$el.find("input").focus();
	},
	removeQuickie: function( ev ) {
		ev.preventDefault();
		$( ev.currentTarget ).closest('.link').remove();
	},
	addQuickie: function( ev ) {
		ev.preventDefault();
		let self = this;
		let quickie = $( ev.currentTarget ).serializeObject();
		$( ev.currentTarget ).find('input').val("");
		quickie.url = this.toUrl( quickie );
		self.shortenUrl( quickie.url ).then(r=>{
			quickie.short_url = r.id;
			self.renderQuickie( quickie );
		});
	},
	shortenUrl: async function( long_url ) {
		let g = new Goog();
		g.set( "longUrl", long_url );
		return g.save();
	},
	toUrl: function( o ) {
		switch( o.type ) {
			case "facebook" : return `https://www.facebook.com/${o.uid}`;
			case "twitter" : return `https://www.twitter.com/${o.uid}`;
			case "instagram" : return `https://www.instagram.com/_u/${o.uid}`;
			case "facebook-messenger" : return `https://m.me/${o.uid}`;
			case "youtube" : return `https://www.youtube.com/${o.uid}`;
			case "google-plus" : return `https://plus.google.com/+${o.uid}`;
			case "linkedin" : return `https://www.linkedin.com/in/${o.uid}`;
			case "github" : return `https://www.github.com/${o.uid}`;
			case "whatsapp" : return `https://api.whatsapp.com/send?phone=${o.uid}&text=${encodeURIComponent("Sending hi from "+location.href)}`;
			default: return o.uid;
		}
	}
});

const Bookmark = Backbone.View.extend({
	el: "#bookmark",
	initialize: function() {
		this.template = _.template( this.$el.find("#b-tmpl").html() );
		Sortable.create( document.querySelector('#bookmark .links') );
		return this;
	},
	render: function() {
		let self = this;
		this.model = Parse.User.current().get("links");
		if ( model.get("links") ) {
			this.$el.find(".links").empty();
			model.get("links").forEach((e,i)=> {
				self.renderBookmark( e );
			});
		}
		return this;
	},
	events: {
		"click .link .count": "clickCount",
		"click .link .remove": "removeBookmark",
		"submit form": "addBookmark"
	},
	clickCount: function( ev ) {
		ev.preventDefault();
		$.get(`https://www.googleapis.com/urlshortener/v1/url`,{
			shortUrl: ev.currentTarget.dataset.url,
			projection: "FULL",
			key: GOOGLE_API_KEY
		}).done(r=>{
			ev.currentTarget.innerHTML = r.analytics.allTime.shortUrlClicks
		}).fail(console.error);
	},
	renderBookmark: function( bm ) {
		try {
			bm = $.extend({ title: "", description: "", short_page_url: "" }, bm);
			let temp = $(this.template( bm ));
			this.$el.find('.links').append( temp );
			temp.data("raw", bm);
			return temp;
		} catch ( e ) {
			console.log( e );
		}
		return null;
	},
	removeBookmark: function( ev ) {
		ev.preventDefault();
		$( ev.currentTarget ).closest('.link').remove();
	},
	shortenUrl: async function( long_url ) {
		let g = new Goog();
		g.set( "longUrl", long_url );
		return g.save();
	},
	addBookmark: function( ev ) {
		let self = this;
		ev.preventDefault();
		let bookmark = $( ev.currentTarget ).serializeObject();
		console.log( bookmark );
		$.sticky( "Getting url details" );
		Parse.Cloud.run("og", {
			url: bookmark.page_url
		}).then(( res )=>{
			try {

			let dummy = null;
			if( res.error ) {
				$.sticky( res.error.message );
				dummy = {
					description: "",favicon:"",image_url:"https://webname.ga/icons/cover.png?i=0",
					page_url:bookmark.page_url,
					site_name:"",title:"",type:"website"
				}
			} else {
				dummy = res.hybridGraph;
				dummy.image_url = dummy.image;
				dummy.page_url = dummy.url;
				delete dummy.image;
				delete dummy.url;
			}
			console.log( dummy );
			if( !dummy.page_url.startsWith("http") ) dummy.page_url = "http://"+dummy.page_url;
			self.shortenUrl( dummy.page_url ).then(r=>{
				dummy.short_page_url = r.id;
				console.log( dummy );
				self.renderBookmark( dummy );
			});
			} catch(e) { console.log( e );}
		}, (  er ) => {
			console.log( er );
			$.sticky( "Couldn't get url details" );
		});
		$( ev.currentTarget ).find('input').val("");
	}
});

