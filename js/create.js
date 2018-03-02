
let auth, creator, username, dp, info, quickie, bookmark, topbar, theme, mdl;
let model, fbProfile = null;

Parse.initialize( "1e3bc14f-0975-4cb6-9872-bff78542f22b" );
Parse.serverURL = "https://parse.buddy.com/parse";

let GOOGLE_API_KEY = "AIzaSyDypHKQ7C0LtLgv9fkd0VJcEdAvJjrdNEQ";

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

if( Parse.User.current() != null ) { Parse.User.current().fetch(); }
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
	mdl.render({ body: "Checking authentication" });
	if( Parse.User.current() ) {
		auth.afterLogin();
	} else {
		auth.render();
	}
};

const Auth = Backbone.View.extend({
	el: "#auth",
	events: { "click .login-btn": "openLogin" },
	openLogin: function( ev ) {
		ev.preventDefault();
		let self = this;
		mdl.render({ body: "Waiting for auth confirmation" });
		Parse.FacebookUtils.logIn("email,public_profile", {
			success: function(user) {
				self.getProfile().then(r=>self.afterLogin())
			},
			error: function(user, error) {
				mdl.hide();
				mdl.render({ type: "error", body: "User cancelled the Facebook login or did not fully authorize.", timeout:3000 });
			}
		});
	},
	getProfile: function() {
		return new Promise(( resolve )=>{
			FB.api("/me?fields=id,name,email,picture,cover", function( response ) {
				fbProfile = response;
				Parse.User.current().set( "email", fbProfile.email );
				resolve(response)
			});
		});
	},
	afterLogin: function() {
		$(".page").hide();
		$(".main-page").fadeIn();
		mdl.hide();
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
		this.getProfile();
	},
	render: function() {
		mdl.hide();
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
		mdl.render({ body: "Saving..." });
		user.save().then(()=>{
			mdl.hide();
		}, ()=>{
			mdl.render({ type: "error", body: "Couldn't save", timeout: 4*1000 });
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
			mdl.render({ type: "error", body: "Username is too short", timeout: 3*1000 });
			return false;
		}
		let user = Parse.User.current();
		user.set("username", username);
		mdl.render({ body: "Updating username" });
		user.save().then(function( user ) {
			mdl.hide();
			self.openSharer();
		}, function( user, error ) {
			mdl.render({ type: "error", body: error.message, timeout: 4000 });
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
			mdl.render({ type: "success", body: "Link copied", timeout: 1*1000 });
		} else {
			mdl.render({ type: "error", body: "Something went wrong", timeout: 2*1000 });
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
		mdl.render({ type: "success", body: "Changed to default Profile picture", timeout: 2000 });
	},
	updateProfilePicture: function( ev ) {
		let self = this;
		ev.preventDefault();
		this.croppie.result({
			type:"base64",
			quality: 0.5,
			size: { width:640, height: 640 },
			format: "png"
		}).then(r=>{
			let parseProfilePicFile = new Parse.File(fbProfile.id+".jpg", { base64: r });
			mdl.render({ body: "Uploading porfile picture" });
			parseProfilePicFile.save().then((file)=>{
				model.set("image", {
					type: "file",
					data: file
				});
				mdl.hide();
			}, () => mdl.render({ type: "error", body: "Profile picture couldn't uploaded", timeout: 3*1000 }) )
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
		mdl.render({ type: "success", body: "Changed", timeout: 1000 });
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
			mdl.render({ type: "error", body:"Click count is only available for newly added links", timeout:4*1000})
			return false;
		}
		mdl.render({body:"Getting count"})
		$.get(`https://www.googleapis.com/urlshortener/v1/url`,{
			shortUrl: ev.currentTarget.dataset.url,
			projection: "FULL",
			key: GOOGLE_API_KEY
		}).done(r=>{
			mdl.hide();
			ev.currentTarget.innerHTML = r.analytics.allTime.shortUrlClicks
		}).fail(()=>{
			mdl.render({ type: "error", body:"Couldn't get click count.", timeout: 4*1000})			
		});
	},
	renderQuickie: function( d ) {
		let self = this;
		d = $.extend({ url: null, short_url:null }, d);
		let temp = $( self.template( d ) );
		temp.data( "raw", d );
		self.$el.find('.links').append( temp );
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
		mdl.render({body:"Adding link"})
		self.shortenUrl( quickie.url ).then(r=>{
			mdl.hide();
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
			case "twitter" : return `https://twitter.com/intent/follow?screen_name=${o.uid}`;
			case "instagram" : return `https://www.instagram.com/_u/${o.uid}`;
			case "facebook-messenger" : return `https://m.me/${o.uid}`;
			case "youtube" : return `https://www.youtube.com/${o.uid}`;
			case "google-plus" : return `https://plus.google.com/+${o.uid}`;
			case "linkedin" : return `https://www.linkedin.com/in/${o.uid}`;
			case "github" : return `https://www.github.com/${o.uid}`;
			case "whatsapp" : return `https://api.whatsapp.com/send?phone=${o.uid}&text=${encodeURIComponent(location.href)}`;
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
		mdl.render({body:"Getting count"})
		$.get(`https://www.googleapis.com/urlshortener/v1/url`,{
			shortUrl: ev.currentTarget.dataset.url,
			projection: "FULL",
			key: GOOGLE_API_KEY
		}).done(r=>{
			mdl.hide();
			ev.currentTarget.innerHTML = r.analytics.allTime.shortUrlClicks
		}).fail(()=>{
			mdl.render({ type: "error", body:"Couldn't get count", timeout: 4*1000})
		});
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
		mdl.render({body:"Getting url details"})
		Parse.Cloud.run("og", {
			url: bookmark.page_url
		}).then(( res )=>{
			try {
				let dummy = null;
				if( res.error ) {
					mdl.render({ type: "error", body:res.error.message, timeout: 5*1000})
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
				mdl.render({body:"Optimizing link for click count"})
				self.shortenUrl( dummy.page_url ).then(r=>{
					dummy.short_page_url = r.id;
					console.log( dummy );
					mdl.hide();
					self.renderBookmark( dummy );
				});
			} catch(e) { console.log( e );}
		}, (  er ) => {
			console.log( er );
			mdl.render({ type: "error", body:"Couldn't get url details", timeout: 5*1000})
		});
		$( ev.currentTarget ).find('input').val("");
	}
});

const Mdl = Backbone.View.extend({
	el: ".spinner-wrapper",
	initialize: function() {
		this.$el.on("animationend", ( ev )=> {
			if($( ev.target ).hasClass('spinner-wrapper')) {
				this.$el.removeClass('spinner-wrapper-hide')
				this.$el.hide()
			}
		});
	},
	render: function( o ) {
		o = $.extend({ type: "spinner", body: "", timeout: 60*60*1000 }, o);
		this.$el.find(".type").hide();
		this.$el.find(".msg").html( o.body );
		this.tym = setTimeout( ()=> this.hide(), o.timeout );
		this.$el.show();
		this.$el.find("."+o.type).show();
	},
	hide: function() {
		clearTimeout( this.tym );
		this.$el.addClass('spinner-wrapper-hide');
	}
});
mdl = new Mdl();
