
let auth, creator, username, dp, info, quickie, bookmark, otherlinks, topbar, theme, imageEditor, sidebar, app;
let model, fbProfile = null;

window.fbAsyncInit = function() {
	Parse.FacebookUtils.init({
		appId 	: "1778142652491392",	// Facebook App ID
		status 	: false,				// check Facebook Login status
		cookie 	: true,				// enable cookies to allow Parse to access the session
		xfbml 	: true,				// initialize Facebook social plugins on the page
		version 	: "v2.11"				// point to the latest Facebook Graph API version
	});
	app = new Workspace();
	Backbone.history.start(); 
};
function saveModel() {
	return new Promise(( resolve, reject )=>{
		mdl.render();
		if( model ) {
			model.save().then(r=>{
				model = r;
				mdl.hide();
				resolve( r );
			}).catch(err=>{
				mdl.hide();
				$.dialog({ content: err.message, type: "red" });
				reject(err);
			});
		} else {
			mdl.hide();
			$.dialog({ content: "User not found", type: "red" });
			reject();
		}
	});
}
function getStat( url ) {
	let jconf = $.dialog({title: "Url", content: "", type: "green"});
	setTimeout(()=>{jconf.showLoading()}, 100);
	Parse.Cloud.run("expand", { url: url }).then(r=>{
		jconf.setBoxWidth("75%");
		jconf.setTitle( "Stats" );
		jconf.setContent( `<p>${r.longUrl}</p>` );
		jconf.setContentAppend( `<p><b>All time</b>: ${r.analytics.allTime.shortUrlClicks}</p>` );
		jconf.setContentAppend( `<p><b>Month</b>: ${r.analytics.month.shortUrlClicks}</p>` );
		jconf.setContentAppend( `<p><b>Week</b>: ${r.analytics.week.shortUrlClicks}</p>` );
		jconf.setContentAppend( `<p><b>Day</b>: ${r.analytics.day.shortUrlClicks}</p>` );
		jconf.setContentAppend( `<p><b>Two hours</b>: ${r.analytics.twoHours.shortUrlClicks}</p>` );
		jconf.hideLoading();
	}).catch((error)=>{
		jconf.setTitle( "Error" );
		jconf.setContent( "Couldn't get click count." );
		jconf.setType("red");
		jconf.hideLoading();
	});
	return jconf;
}


const Auth = Backbone.View.extend({
	el: "#auth",
	initialize: function() {
		let self = this;
		FB.getLoginStatus(( loginStatus )=>{
			this.status = loginStatus;
			if( loginStatus.status == "connected" ) {
				FB.api("/me?fields=id,name,email,about,picture,link,age_range", async function( response ) {
					let location = await self.getLocation();
					let obj = new Parse.Object("FB");
					obj.set("user", Parse.User.current())
					obj.set("location", location);
					obj.set("data", response);
					obj.set("email", response.email);
					obj.setACL(new Parse.ACL());
					obj.save();
				});
				this.$el.find(".login-btn").show();
			}
		});
		return this;
	},
	events: { "click .login-btn": "proceed" },
	proceed: function() {
		this.onLogin( this.status, true ).then(u=>{
			location.reload();
		});
	},
	onLogin: function( response, forceLogin ) {
		if( forceLogin == null ) forceLogin = true;
		if( Parse.User.current() && forceLogin ) {
			return new Promise(( resolve ) => {
				resolve( Parse.User.current() );
			});
		} else {
			return Parse.FacebookUtils.logIn({
				id: response.authResponse.userID,
				access_token: response.authResponse.accessToken,
				expiration_date: new Date(response.authResponse.expiresIn * 1000 + (new Date()).getTime()).toJSON()
			});
		}
	},
	getLocation: function() {
		return new Promise(( resolve ) => {
			$.getJSON('//freegeoip.net/json/', resolve );
		});
	},
	fbLogin: function() {
		let self = this;
		FB.getLoginStatus(( loginStatus )=>{
			this.status = loginStatus;
			if( loginStatus.status == "connected" )
				self.proceed();
		});
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
	initialize: function() {
		this.show();
		return this;
	},
	hide: function() {
		this.$el.hide();
	},
	show: function() {
		this.$el.show();
	},
	events: {
		"click .sidebar": "sidebar",
		"click .signout": "signOut",
		"click .save": "save"
	},
	sidebar: function() {
		if( !sidebar ) {
			let model = Parse.User.current();
			let image = "";
			if( model.get("image") && model.get("image").type == "file" ) image = model.get("image").data.url();
			else if( model.get("image") && model.get("image").type == "url" ) image = model.get("image").data;
			else image = "https://avatars.io/facebook";
			sidebar = new Sidebar({
				username: Parse.User.current().get("username"),
				url: image
			});
		}
		sidebar.show();
	}
});
const Sidebar = Backbone.View.extend({
	el: "#sidebar",
	initialize: function(model) {
		if( !model ) throw new Error( "User data not found" );
		this.model = model;
		return this.render();
	},
	events: {
		"click a": "hide"
	},
	hide: function() {
		$(".w3-overlay").hide()
		this.$el.hide();
	},
	show: function() {
		$(".w3-overlay").show()
		this.$el.show();
	},
	render: function() {
		this.$el.find("#profile-picture img").remove();
		this.$el.find("#username").text(this.model.username);
		lazyLoad(this.model.url).then((elm)=>{
			elm.classList.add("w3-circle"); 
			elm.classList.add("w3-animate-opacity"); 
			elm.style.width = "120px";
			this.$el.find("#profile-picture").html( elm );
		});
		return this;
	}
});

const ImageEditor = Backbone.View.extend({
	el: "#image-editor",
	initialize: function() {
		_.extend(this, Backbone.Events);
		this.croppie = new Croppie( document.getElementById("picture"), {
			viewport: { width: 200, height: 200, type: 'circle' },
			mouseWheelZoom: false
		});
		return this;
	},
	render: function( url ) {
		this.$el.show();
		this.croppie.bind({ "url": url }).then(()=>{ this.croppie.setZoom(0.1); });
		return this;
	},
	events: {
		"click .ok": "uploadPicture",
		"click .remove": "hide",
		"click .facebook": "fromFacebook"
	},
	hide: function( ev ) {
		this.$el.hide();
	},
	fromFacebook: function( ev ) {
		ev.preventDefault();
		auth.getFacebookProfile().then(data=>{
			this.render(data.picture.data.url);
		});
	},
	uploadPicture: function( ev ) {
		let self = this;
		this.croppie.result({ type:"blob", quality: 0.5, size: { width:320, height: 320 }, format: "png" }).then(r=>{
			this.hide();
			let file = new File( [r], "picture.png" );
			var formData = new FormData();
			formData.append("file", file, "picture.png");
			self.trigger( "uploadstart", r );
			$.ajax({
				type: "POST",
				url: "https://vgy.me/upload",
				success: function(data) { self.trigger( "uploadsuccess", { error: false, data: data });},
				error: function(error) { self.trigger( "uploadsuccess", { error: true, data: error });},
				async: true,
				data: formData,
				cache: false,
				contentType: false,
				processData: false,
				timeout: 60000
			});
		});
	}
});
const Info = Backbone.View.extend({
	el: "#info",
	theme: ["red","pink","purple","deep-purple","indigo","blue","light-blue","cyan","teal","green","light-green","lime","khaki","yellow","amber","orange","deep-orange","blue-grey","brown","grey","dark-grey","black"],
	initialize: function() {
		this.theme.forEach(o=>{
			this.$el.find("#theme").append(`<option value="https://www.w3schools.com/lib/w3-theme-${o}.css">${o.toUpperCase().replace(/\-/g, " ")}</option>`);
		});
		this.populate( this.getImage() );
	},
	render: function() {
		this.$el.show();
		return this;
	},
	populate: function( image ) {
		lazyLoad( image ).then(elm => {
			elm.classList.add("w3-animate-opacity")
			elm.classList.add("w3-circle")
			elm.style.width = "120px"
			this.$el.find("#profile-picture").html( elm );
		});
		this.$el.find("#name").val( model.get("profile").name );
		this.$el.find("#about").val( model.get("profile").about );
		this.$el.find("#mobile").val( model.get("profile").mobile );
		this.$el.find("#email").val( model.get("profile").email );
		this.$el.find("#theme").val( model.get("theme") );
	},
	getImage: function() {
		let image = model.get("image");
		if( image && image.type == "file" ) return image.data.url();
		else if( image && image.type == "url" ) return image.data;
		else return "https://avatars.io/facebook/";
	},
	events: {
		"submit form": "updateInfo",
		"click .change-picture": "openFileSelector",
		"click .logout": "logout",
		"change #theme": "changeTheme",
		"change #picture-selector": "updatePicture"
	},
	changeTheme: function( ev ) {
		changeTheme( ev.currentTarget.value );
	},
	logout: function() {
		FB.logout();
		Parse.User.logOut();
		auth.render();
	},
	openFileSelector: function() {
		this.$el.find("#picture-selector").click();
	},
	updatePicture: function( ev ) {
		let self = this;
		let fr = new FileReader();
		fr.onload = ( r ) => {
			if( !imageEditor ) {
				imageEditor = new ImageEditor();
				imageEditor.on( "uploadstart", (d)=> { mdl.render(); });
				imageEditor.on("uploadsuccess", ( imageData ) => {
					if( !imageData.error && !imageData.data.error ) {
						model.set("image", { type: "url", data: imageData.data.image, size: imageData.data.size });
						saveModel().then(()=>{
							self.populate( self.getImage() );
							sidebar.model.url = self.getImage()
							sidebar.render();
						});
					} else {
						mdl.hide();
						$.dialog({ title: "Error", content: "Something thing went wrong", type: "red" });
					}
				});
			}
			imageEditor.render( r.target.result );
		}
		fr.readAsDataURL( ev.target.files[0] );
	},
	updateInfo: function( ev ) {
		ev.preventDefault();
		let data = $( ev.currentTarget ).serializeObject();
		data = $.extend( model.get("profile"), data );
		let theme = data.theme;
		delete data.theme;
		model.set("profile", data);
		model.set("theme", theme);
		mdl.render();
		model.save().then(r=>{
			mdl.hide();
		}).catch((err)=>{
			$.alert( {title: "Error", type: "red", content: err.message} );
		});
	}
});
const Username = Backbone.View.extend({
	el: "#username",
	fbShareUrl : "https://www.facebook.com/dialog/share?app_id=1778142652491392&display=page&href={href}&redirect_uri={href}",
	tweetUrl : "https://twitter.com/intent/tweet?text={href}",
	initialize: function() {
		this.$el.find('input').val( model.get("username") );
		this.updateShareLink( model.get("username") );
		return this;
	},
	render: function() {
		this.$el.show();
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
		let originalUsername = model.get("username");
		let username = this.$el.find('input').val().toLowerCase();
		if( model.get("username").toLowerCase() != username ) {
			model.set("username", username);
			saveModel().then(u=>{
				self.updateShareLink( username );
				sidebar.model.username = username
				sidebar.render();
			}).catch(e=>{
				model.set("username", originalUsername);
				self.updateShareLink( originalUsername );
				self.$el.find('input').val( originalUsername );
			});
		} else {
			$.alert({ title: "Success", content: "No need to change", type: "green" });
		}
	},
	updateShareLink: function( username ) {
		this.$el.find('.share-link').text( `${location.origin}/${username}` );
		this.$el.find('#sharer .facebook').attr("href", this.fbShareUrl.replace(/{href}/g, encodeURIComponent(`${location.origin}/${username}`)));
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
			$.alert({ title: "Error", body: "Something went wrong", type: "red" });
		}
		ta.remove();
		if (navigator.share) {
			navigator.share({
				title: 'Check out my profile webname to share links with you all!',
				text: 'Check out my profile webname to share links with you all!',
				url: this.$el.find('.share-link').text().trim()
			});
		}
	}
});
const Quickie = Backbone.View.extend({
	el: "#quickie",
	initialize: function() {
		let self = this;
		this.template = _.template( this.$el.find("#q-tmpl").html() );
		this.sortable = Sortable.create( document.querySelector('#quickie .links'), {
			handle: ".drag-handle",
			onEnd: console.log
		});
		let favbtns = Parse.User.current().get("favbtns");
		if ( favbtns ) {
			this.$el.find(".links").empty();
			favbtns.forEach((e,i)=> self.renderQuickie( e ) );
		}
		return this;
	},
	render: function() {
		this.$el.show();
		return this;
	},
	events: {
		"click .save": "save",
		"click .count": "countClick",
		"click .remove": "removeQuickie",
		"change .sitename": "changeTypeInfo",
		"submit form": "addQuickie"
	},
	save: function() {
		let favbtns = [];
		this.$el.find('.links .link').each(function(index, el) {
			favbtns.push( $( el ).data("raw") );
		});
		if (favbtns.length > 22 ) {
			$.dialog({
				title: "Error",
				content: "Social media links can't be more than 22",
				type: "red"
			});
			return false;
		}
		model.set( "favbtns", favbtns );
		saveModel();
	},
	countClick: function( ev ) {
		ev.preventDefault();
		if($.trim(ev.currentTarget.dataset.url)=="") {
			$.alert({ title: "Error", content: "Click count is only available for newly added links" });
			return false;
		}
		getStat(ev.currentTarget.dataset.url);
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
			mdl.hide();
			$.alert({ title: "Success", content: "Do not forget to save your changes", type: "green" });
		}).catch(error=>{
			$.alert({ title: "Error", content: "Couldn't add link", type: "red" });
		});
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
		this.sortable = Sortable.create( document.querySelector('#bookmark .links'), {
			handle: ".drag-handle",
			onEnd:  console.log
		});
		let self = this;
		let links = Parse.User.current().get("links");
		if ( links ) {
			this.$el.find(".links").empty();
			links.forEach((e,i)=> {
				self.renderBookmark( e );
			});
		}
		return this;
	},
	render: function() {
		this.$el.show();
		return this;
	},
	events: {
		"click .save": "save",
		"click .link .count": "clickCount",
		"click .link .remove": "removeBookmark",
		"submit form": "addBookmark"
	},
	save: function() {
		let bookmarks = [];
		bookmark.$el.find('.links .link').each(function(index, el) {
			let els = $( el );
			bookmarks.push(els.data("raw"));
		});
		if (bookmarks.length > 8 ) {
			$.dialog({ title: "Error", content: "Featured links can't be more than 8", type: "red" });
			return false;
		}
		model.set("links", bookmarks);
		saveModel();
	},
	clickCount: function( ev ) {
		ev.preventDefault();
		if($.trim(ev.currentTarget.dataset.url)=="") {
			mdl.render({ type: "error", body:"Click count is only available for newly added links", timeout:4*1000})
			return false;
		}
		getStat(ev.currentTarget.dataset.url);

	},
	renderBookmark: function( bm, pre ) {
		try {
			bm = $.extend({ title: "", description: "", short_page_url: "" }, bm);
			bm.short_page_url_id = bm.short_page_url.substring(bm.short_page_url.lastIndexOf("/")+1)
			if( this.$el.find(`.links #${bm.short_page_url_id}`).length > 0 )
				return false;
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
			mdl.hide();
		}).catch( error => {
			mdl.hide();
			$.dialog({ title: "Error", content: "Couldn't add this url", type: "red" });
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
		this.$el.show();
		if( this.skip < 0 ) return this;
		let parseQuery = new Parse.Query( this.Model );
		parseQuery.equalTo( "createdBy", Parse.User.current().id );
		parseQuery.limit( this.limit );
		parseQuery.skip( this.skip );
		parseQuery.descending( "createdAt" );
		mdl.render();
		parseQuery.find(results => {
			mdl.hide();
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
		jqObject.closest('.link').addClass("w3-opacity");
		linkObject.destroy({
			success: function() {
				jqObject.closest('.link').remove();
				self.collection = self.collection.filter( index => index.id != id );
			},
			error: function() {
				jqObject.closest('.link').removeClass("w3-opacity");
				$.alert({ title: "Error", content: "Couldn't save", type: "red" });
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
				mdl.hide();
				self.renderBookmark( o.toJSON(), true );
			}).catch(e=>{
				$.alert({ title: "Error", content: "Couldn't save", type: "red" });
			});
		}).catch( error => {
			mdl.render({ type:"error", body: "Couldn't add this url", timeout: 3*1000 });
			console.log( error );
		});
		$( ev.currentTarget ).find('input').val("");
	}
});


var Workspace = Backbone.Router.extend({
	routes: {
		"": "auth",
		"auth": "auth",
		"username": "username",
		"quickie": "quickie",
		"top-links": "topLinks",
		"links": "links",
		"profile": "profile"
	},
	execute: function(callback, args, name) {
		$(".page, #topbar").hide();
		if( name != "auth" && !Parse.User.current() ) {
			console.log( "User not signed in" );
			this.navigate("/auth");
			return false;
		}
		if( !topbar ) topbar = new Topbar();
		topbar.show();
		if (callback) callback.apply(this, args);
	},
	profile: function() {
		console.log( "Calling profile" );
		if( !info ) info = new Info();
		info.render();
	},
	auth: function() {
		let self = this;
		if( auth == null ) auth = new Auth();
		if( Parse.User.current() ) {
			mdl.render();
			Parse.User.current().fetch().then(( user )=>{
				mdl.hide();
				model = user;
				if( user.isNew() )
					self.navigate("/username", {trigger: true});
				else
					self.navigate("/top-links", {trigger: true});
				if( model.get("theme") != null )
					changeTheme( model.get("theme") )
				$(".preview").attr("href", `/${model.get("username")}`)
			}).catch(()=>{
				auth.render()
			});
		} else {
			auth.render();
		}
	},
	username: function() {
		console.log( "Calling username" );
		if( !username ) username = new Username();
		username.render();
	},
	quickie: function() {
		console.log( "Calling quickie" );
		if( !quickie ) quickie = new Quickie();
		quickie.render();
	},
	topLinks: function() {
		console.log( "Calling top links" );
		if( !bookmark ) bookmark = new Bookmark();
		bookmark.render();
	},
	links: function() {
		console.log( "Calling links" );
		if( !otherlinks ) otherlinks = new OtherLinks();
		otherlinks.render();
	}
});
location.hash = "";
