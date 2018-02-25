
let auth, creator, username, dp, info, quickie, bookmark, topbar;
let model, fbProfile = null;

Parse.initialize( "1e3bc14f-0975-4cb6-9872-bff78542f22b" );
Parse.serverURL = "https://parse.buddy.com/parse";

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

		dp = new DP();
		info = new Info();
		quickie = new Quickie();
		bookmark = new Bookmark();
		topbar = new Topbar();

		let profile = { name: "Excited user", email: "excited@user.com", about: "Excited to see this", mobile: "+919650123456" }
		profile = $.extend( profile, fbProfile, Parse.User.current().get( "profile" ) );
		delete profile.cover;
		delete profile.picture;

		model.set( "profile", profile );
		model.set("favbtns", Parse.User.current().get("favbtns"));
		model.set("links", Parse.User.current().get("links"));
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
			let els = $( el );
			favbtns.push({
				type: els.data( "type" ),
				uid: els.data( "uid" )
			});
		});
		bookmark.$el.find('.links .link').each(function(index, el) {
			let els = $( el );
			bookmarks.push({
				image_url: els.data( "image" ),
				page_url: els.data( "url" )
			});
		});
		let user = Parse.User.current();
		user.set( "image", model.get("image") );
		user.set( "profile", model.get("profile") );
		user.set( "favbtns", favbtns );
		user.set( "links", bookmarks );
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

const DP = Backbone.View.extend({
	el: "#dp",
	render: function() {
		this.$el.find('.profile-image-url').val( model.get( "image" ) );
		this.$el.find('.profile-image').attr( "src", model.get( "image" ) );
		this.$el.find('.cover-image').attr( "src", model.get( "image" ) );
		return this;
	},
	events: {
		"submit form": "updateProfilePicture",
		"click .profile-image": "removeProfilePicture"
	},
	removeProfilePicture: function( ev ) {
		ev.preventDefault();
		model.set( "image", fbProfile.picture.data.url );
		$.sticky( "Changed to default Profile picture" );
	},
	updateProfilePicture: function( ev ) {
		ev.preventDefault();
		model.set("image", this.$el.find(".profile-image-url").val().trim() );
		$.sticky( "Profile picture changed" );
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
		"click .remove": "removeQuickie",
		"change .sitename": "changeTypeInfo",
		"submit form": "addQuickie"
	},
	renderQuickie: function( e ) {
		let self = this;
		self.$el.find('.links').append( self.template({ sitename: e.type, username: e.uid }) );
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
		let quickie = $( ev.currentTarget ).serializeObject();
		$( ev.currentTarget ).find('input').val("");
		this.renderQuickie( quickie );
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
			model.get("links").forEach((e,i)=> self.renderBookmark( e ) );
		}
		return this;
	},
	events: {
		"click .link .remove>button": "removeBookmark",
		"submit form": "addBookmark"
	},
	renderBookmark: function( bm ) {
		let temp = $(this.template( bm ));
		this.$el.find('.links').append( temp );
		let cardWidth = temp.find(".image-wrapper").width();
		temp.find(".image-wrapper, .image-wrapper img").height( cardWidth );
	},
	removeBookmark: function( ev ) {
		ev.preventDefault();
		$( ev.currentTarget ).closest('.link').remove();
	},
	addBookmark: function( ev ) {
		ev.preventDefault();
		let bookmark = $( ev.currentTarget ).serializeObject();
		bookmark.image_url = $.trim(bookmark.image_url);
		if( bookmark.image_url.length == 0 ) bookmark.image_url = "https://source.unsplash.com/random/150x150";
		this.renderBookmark( bookmark );
		$( ev.currentTarget ).find('input').val("");
	}
});

