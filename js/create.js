// Fri Mar  2 20:29:40 2018

let auth, creator, username, dp, info, quickie, bookmark, topbar, theme;
let model, fbProfile = null;

let GOOGLE_API_KEY = "AIzaSyDypHKQ7C0LtLgv9fkd0VJcEdAvJjrdNEQ";

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
		let self = this;
		return new Promise(( resolve )=>{
			FB.getLoginStatus(( loginStatus )=>{
				if( loginStatus.status == "connected" )
					FB.api("/me?fields=id,name,email,about,picture,link,age_range", async function( response ) {
						fbProfile = response;
						let u = Parse.User.current();
						let location = await self.getLocation();
						u.set("location", location );
						if( u.getEmail() != fbProfile.email ) {
							u.setEmail( fbProfile.email );
							u.save().then(()=>{
								console.log( "User private email updated" );
								console.log( u.toJSON() );
							}).catch(console.warn);
						}
						resolve(response)
					});
			});
		});
	},
	getLocation: function() {
		return new Promise(( resolve ) => {
			$.getJSON('//freegeoip.net/json/', resolve );
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
		let self = this;
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
	sendUrl : "http://www.facebook.com/dialog/send?app_id=1778142652491392&link={href}&redirect_uri={href}&display=page",
	fbShareUrl : "https://www.facebook.com/dialog/share?app_id=1778142652491392&display=page&href={href}&redirect_uri={href}",
	tweetUrl : "https://twitter.com/intent/tweet?text={href}",
	render: function() {
		this.$el.find('input').val( Parse.User.current().get("username") );
		this.updateShareLink( Parse.User.current().get("username") );
		return this;
	},
	events: {
		"submit form": "updateUsername",
		"keyup input": "inputKeyUp",
		"click .copy-share-link": "copyShareLink"
	},
	updateUsername: function( ev ) {
		ev.preventDefault();
		var self = this;
		let username = this.$el.find('input').val().toLowerCase();
		let user = Parse.User.current();
		if( user.get("username").toLowerCase() != username ) {
			user.set("username", username);
			mdl.render({ body: "Updating username" });
			user.save().then(function( user ) {
				mdl.hide();
				self.updateShareLink( username );
			}, function( user, error ) {
				mdl.render({ type: "error", body: error.message, timeout: 4000 });
				console.log( user, error );
			});
		} else {
			mdl.render({ type: "success", body: "No need to change", timeout: 4*1000 });
		}
	},
	updateShareLink: function( username ) {
		this.$el.find('.share-link').text( `${location.origin}/${username}` );
		this.$el.find('#sharer .facebook').attr("href", this.fbShareUrl.replace(/{href}/g, encodeURIComponent(`${location.origin}/${username}`)));
		this.$el.find('#sharer .messenger').attr("href",  this.sendUrl.replace(/{href}/g, encodeURIComponent(`${location.origin}/${username}`)));
		this.$el.find('#sharer .twitter').attr("href",  this.tweetUrl.replace(/{href}/g, encodeURIComponent(`${location.origin}/${username}`)));
		$('.preview').attr({ href: `${location.origin}/${username}` });
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
		console.log( model.get("image") );
		let u = null;
		if( model.get("image").type == "file" ) {
			u = model.get("image").data.url()
		} else {
			u = model.get("image").data
		}
		this.croppie.bind({ url: u, points: [ 0,0,320,320 ] });
		return this;
	},
	events: {
		"click .remove": "removeProfilePicture",
		"click .change": "updateProfilePicture",
		"click .from-facebook": "fromFacebook",
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
		model.set("image", {type: "url", url: "https://source.unsplash.com/random/320x320"})
		this.croppie.bind({ url: model.get("image").url, points: [ 0,0,320,320 ] });
		mdl.render({ type: "success", body: 'Click <i class="fas fa-check"></i> to reset image', timeout: 2000 });
	},
	fromFacebook: function( ev ) {
		ev.preventDefault();
		model.set( "image", fbProfile.picture.data.url );
		this.croppie.bind({ url: model.get("image").url, points: [ 0,0,320,320 ] });
		mdl.render({ type: "success", body: 'Click <i class="fas fa-check"></i> to reset image', timeout: 2000 });
	},
	updateProfilePicture: function( ev ) {
		let self = this;
		ev.preventDefault();
		this.croppie.result({
			type:"base64",
			quality: 0.5,
			size: { width:320, height: 320 },
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
		this.$el.find("#name").val( model.get("profile").name );
		this.$el.find("#about").val( model.get("profile").about );
		this.$el.find("#mobile").val( model.get("profile").mobile );
		this.$el.find("#email").val( model.get("profile").email );
		return this;
	},
	events: {
		"keyup input" : "updateInfo"
	},
	updateInfo: function( ev ) {
		ev.preventDefault();
		let prof = model.get("profile");
		prof[ev.currentTarget.id] = ev.currentTarget.value;
		model.set("profile", prof);
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
			case "whatsapp": this.$el.find('.info').text( "Enter mobile with ISD code. e.g., +919650123123" ); break;
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
			quickie.short_url = r.id;
			self.renderQuickie( quickie );
			mdl.render({ type: "success", body: "Do not forget to save your changes", timeout: 3*1000 });
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
	openGraph: function( url ) {
		return new Promise(( resolve, reject ) => {
			Parse.Cloud.run("opengraph", { url :url }).then( resolve ).catch( reject );
		});
	},
	updateView: function( dummy ) {
		let self = this;
		console.log( dummy );
		if( !dummy.page_url.startsWith("http") ) dummy.page_url = "http://"+dummy.page_url;
		mdl.render({body:"Optimizing link for click count"})
		this.shortenUrl( dummy.page_url ).then(r=>{
			dummy.short_page_url = r.id;
			console.log( "After shortening: ", dummy );
			self.renderBookmark( dummy );
			mdl.render({ type: "success", body: "Do not forget to save your changes", timeout: 3*1000 });
		}).catch(()=>{
			mdl.render({ type: "error", body: "Sorry! URL couldn't be optimized for click count. <br><br>Do not forget to save your changes", timeout: 3*1000 });
			dummy.short_page_url = dummy.page_url;
			console.log( "After shortening: ", dummy );
			self.renderBookmark( dummy );
		});
	},
	addBookmark: function( ev ) {
		let self = this;
		ev.preventDefault();
		let bookmark = $( ev.currentTarget ).serializeObject();
		console.log( bookmark );
		mdl.render({body:"Getting url details"});
		let dummy = {
			description: "",
			image_url:"https://webname.ga/icons/cover.png?i=0",
			page_url:bookmark.page_url,
			title:bookmark.page_url,
		}
		this.openGraph( bookmark.page_url ).then( result => {
			console.log( result);
			if( result.success ) {
				dummy.title = result.data.ogTitle;
				dummy.description = result.data.ogDescription;
				dummy.image_url = result.data.ogImage.url;
				self.updateView( dummy );
			}
		}).catch( error => {
			console.log( error );
			mdl.render({ type: "error", body:"Couldn't get url details", timeout: 5*1000})
			self.updateView( dummy );
		});
		$( ev.currentTarget ).find('input').val("");
	}
});

