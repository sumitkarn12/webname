// Fri Mar  2 20:29:40 2018

let auth, creator, username, dp, info, quickie, bookmark, otherlinks, topbar, theme, imageEditor;
let model, fbProfile = null;

const Model = Backbone.Model.extend();

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
		FB.getLoginStatus(function( response ) {
			auth.onLogin( response );
		});
	}
};

const Auth = Backbone.View.extend({
	el: "#auth",
	events: { "click .login-btn": "openLogin" },
	onLogin: function( response ) {
		console.log( response );
		if( response.status == "connected" ) {
			mdl.render({ body: "Signing in.." });
			console.log( response );
			var authData = {
				id: response.authResponse.userID,
				access_token: response.authResponse.accessToken,
				expiration_date: new Date(response.authResponse.expiresIn * 1000 + (new Date()).getTime()).toJSON()
			}
			Parse.FacebookUtils.logIn( authData, {
				success: auth.afterLogin,
				error: function(err) {
					console.log( err );
					mdl.render({ type: "error", body: "Couldn't logged in. Please try clearing your browser cookies."});
				}
			});
		}
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
							u.save();
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
		otherlinks = new OtherLinks();
		topbar = new Topbar();
		theme = new Theme();

		this.update();
		this.getProfile().then(()=> this.update())
	},
	update: function() {
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
		if (favbtns.length > 22 ) {
			mdl.render({ type: "error", body: "Social media links can't be more than 22", timeout: 5*1000 });
			return false;
		}
		bookmark.$el.find('.links .link').each(function(index, el) {
			let els = $( el );
			bookmarks.push(els.data("raw"));
		});
		if (bookmarks.length > 8 ) {
			mdl.render({ type: "error", body: "Featured links can't be more than 8", timeout: 5*1000 });
			return false;
		}
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
	sendUrl : "http://www.facebook.com/dialog/send?app_id=1778142652491392&link={href}&redirect_uri={href}",
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
		let originalUsername = Parse.User.current().get("username");
		let username = this.$el.find('input').val().toLowerCase();
		let user = Parse.User.current();
		if( user.get("username").toLowerCase() != username ) {
			user.set("username", username);
			mdl.render({ body: "Updating username" });
			user.save().then(function( user ) {
				mdl.hide();
				self.updateShareLink( username );
			}).catch(er=>{
				mdl.render({ type: "error", body: er.message, timeout: 4000 });
				self.updateShareLink( originalUsername );
				self.$el.find('input').val( originalUsername );
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
		this.croppie = new Croppie(this.$el.find('#picture')[0], {
			viewport: { width: 200, height: 200, type: 'circle' },
			mouseWheelZoom: false
		});
		return this;
	},
	render: function( url ) {
		if( !url ) {
			if( model.get("image").type == "file" ) url = model.get("image").data.url();
			else url = model.get("image").data;
		}
		this.croppie.bind({ "url": url, points: [0,0, 320, 320] }).then(()=>{
			this.croppie.setZoom(0.1);
		});
		return this;
	},
	events: {
		"click .ok": "uploadPicture",
		"click .remove": "removeProfilePicture",
		"click .facebook": "fromFacebook",
		"change .picture-selector": "changePicture"
	},
	changePicture: function( ev ) {
		let self = this;
		let fr = new FileReader();
		fr.onload = ( r ) => {
			self.render( r.target.result );
		}
		fr.readAsDataURL( ev.target.files[0] );
	},
	removeProfilePicture: function( ev ) {
		ev.preventDefault();
		this.render("/icons/icon-rect.png");
	},
	fromFacebook: function( ev ) {
		ev.preventDefault();
		this.render(fbProfile.picture.data.url);
	},
	uploadPicture: function( ev ) {
		let self = this;
		this.croppie.result({ type:"base64", quality: 0.5, size: { width:320, height: 320 }, format: "png" }).then(r=>{
			let parseProfilePicFile = new Parse.File(fbProfile.id+".png", { base64: r });
			mdl.render({ body: "Uploading porfile picture" });
			parseProfilePicFile.save().then((file)=>{
				Parse.User.current().set("image", { type: "file", data: file });
				Parse.User.current().save();
				mdl.hide();
				self.render( file.url() )
			}).catch(() => mdl.render({ type: "error", body: "Profile picture couldn't uploaded", timeout: 3*1000 }) )
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
		Parse.Cloud.run("expand", { url: ev.currentTarget.dataset.url }).then(r=>{
			mdl.hide();
			ev.currentTarget.innerHTML = r.analytics.allTime.shortUrlClicks
		}).catch((error)=>{
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
		mdl.render({body:"Adding link"});
		Parse.Cloud.run("shorten", { url: quickie.url }).then(r=>{
			quickie.short_url = r.id;
			self.renderQuickie( quickie );
			mdl.render({ type: "success", body: "Do not forget to save your changes", timeout: 3*1000 });
		}).catch(error=>{
			mdl.render({ type: "error", body: "Couldn't optimize for click count", timeout: 3*1000 });
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
			case "snapchat" : return `https://www.snapchat.com/add/${o.uid}`;
			case "telegram" : return `https://t.me/${o.uid}`;
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
		if($.trim(ev.currentTarget.dataset.url)=="") {
			mdl.render({ type: "error", body:"Click count is only available for newly added links", timeout:4*1000})
			return false;
		}
		mdl.render({body:"Getting count"})
		Parse.Cloud.run("expand", { url: ev.currentTarget.dataset.url }).then(r=>{
			mdl.hide();
			ev.currentTarget.innerHTML = r.analytics.allTime.shortUrlClicks
		}).catch((error)=>{
			mdl.render({ type: "error", body:"Couldn't get click count.", timeout: 4*1000})			
		});
	},
	renderBookmark: function( bm, pre ) {
		try {
			bm = $.extend({ title: "", description: "", short_page_url: "" }, bm);
			let temp = $(this.template( bm ));
			if( pre ) this.$el.find('.links').prepend( temp );
			else this.$el.find('.links').append( temp );
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
	addBookmark: function( ev ) {
		let self = this;
		ev.preventDefault();
		let bookmark = $( ev.currentTarget ).serializeObject();
		mdl.render({body:"Getting url details"});
		let dummy = {
			description: "",
			image_url:"https://webname.ga/icons/cover.png?i=0",
			page_url:bookmark.page_url,
			title:bookmark.page_url,
		}
		Parse.Cloud.run("og", { url: bookmark.page_url }).then( result => {
			console.log( result );
			dummy.title = result.data.ogTitle;
			dummy.description = result.data.ogDescription;
			dummy.image_url = result.data.ogImage.url;
			dummy.short_page_url = result.short_url;
			self.renderBookmark( dummy );
			mdl.render({ type:"success", body: "Do not forget to save your changes", timeout: 3*1000 });
		}).catch( error => {
			mdl.render({ type:"error", body: "Couldn't add this url", timeout: 3*1000 });
			console.log( error );
		});
		$( ev.currentTarget ).find('input').val("");
	}
});

const OtherLinks = Bookmark.extend({
	el: "#otherlinks",
	Model: Parse.Object.extend("LINKS"),
	collection: [],
	skip: 0,
	limit: 12,
	initialize: function() {
		let self = this;
		this.template = _.template( this.$el.find("#b-tmpl").html() );
		let io = new IntersectionObserver( entries => {
			if( entries.filter( en => en.target.id == "load-next" )[0].isIntersecting ) {
				self.render();
			}
		});
		io.observe( this.$el.find("#load-next")[0] );		
		return this;
	},
	render: function() {
		let self = this;
		if( this.skip < 0 ) return this;
		let parseQuery = new Parse.Query( this.Model );
		parseQuery.equalTo( "createdBy", Parse.User.current().id );
		parseQuery.limit( this.limit );
		parseQuery.skip( this.skip );
		parseQuery.descending( "createdAt" );
		parseQuery.find(results => {
			results.forEach(result=>{
				self.collection.push( result );
				self.renderBookmark( result.toJSON() );
			});
			self.skip = self.skip+self.limit;
			if( results.length == 0 ) self.skip = -1;
		});
		return this;
	},
	events: {
		"click .link .count": "clickCount",
		"click .link .remove": "removeBookmark",
		"submit form": "addBookmark"
	},
	removeBookmark: function( ev ) {
		ev.preventDefault();
		let self = this;
		let jqObject = $( ev.currentTarget );
		let id = jqObject.data("id");
		let linkObject = this.collection.filter( index => index.id == id )[0];
		mdl.render({ body: "Removing..." });
		linkObject.destroy({
			success: function() {
				jqObject.closest('.link').remove();
				mdl.render({ type: "success", body: "Removed", timeout: 3*1000 });
				self.collection = self.collection.filter( index => index.id != id );
			},
			error: function() {
				mdl.render({ type: "error", body: "Couldn't remove", timeout: 3*1000 });
			}
		});
	},
	addBookmark: function( ev ) {
		let self = this;
		ev.preventDefault();
		let bookmark = $( ev.currentTarget ).serializeObject();
		mdl.render({body:"Getting url details"});
		let link = new this.Model();
		link.set( "description", "" );
		link.set( "image_url", "https://webname.ga/icons/cover.png?i=0" );
		link.set( "page_url", bookmark.page_url );
		link.set( "title", bookmark.page_url );
		Parse.Cloud.run("og", { url: bookmark.page_url }).then( result => {
			link.set("title", result.data.ogTitle )
			link.set("description", result.data.ogDescription )
			if( result.data.ogImage )
				link.set("image_url", result.data.ogImage.url )
			link.set("short_page_url", result.short_url )
			link.save().then( o=>{
				self.collection.push( o );
				self.renderBookmark( o.toJSON(), true );
				mdl.render({ type:"success", body: "Saved", timeout: 3*1000 });
			}).catch(e=>{
				mdl.render({ type:"error", body: "Couldn't save", timeout: 3*1000 });
			});
		}).catch( error => {
			mdl.render({ type:"error", body: "Couldn't add this url", timeout: 3*1000 });
			console.log( error );
		});
		$( ev.currentTarget ).find('input').val("");
	}
});