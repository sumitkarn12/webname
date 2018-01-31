
var auth = null;
var creator = null;

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

window.fbAsyncInit = function() {
	Parse.FacebookUtils.init({
		appId 	: "1778142652491392",	// Facebook App ID
		status 	: false,				// check Facebook Login status
		cookie 	: true,				// enable cookies to allow Parse to access the session
		xfbml 	: true,				// initialize Facebook social plugins on the page
		version 	: "v2.11"				// point to the latest Facebook Graph API version
	});
	if( auth == null )
		auth = new Auth();
	$("#my-spinner").show();
	auth.checkLogin().then( response => {
		if( response.status == "connected" && Parse.User.current() != null ) {
			creator = new Creator();
			creator.render();
		} else {
			auth.render();
		}
	});
};

const Auth = Backbone.View.extend({
	el: "#auth",
	initialize: function() {
		return this;
	},
	events: {
		"click .login-btn": "openLogin"
	},
	openLogin: function( ev ) {
		ev.preventDefault();
		let self = this;
		$("#my-spinner").show();
		Parse.FacebookUtils.logIn("email,public_profile", {
			success: function(user) {
				$("#my-spinner").hide();
				if( creator == null )
					creator = new Creator();
				creator.render();
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
	render: function() {
		$( ".page" ).hide();
		this.$el.show();
		return this;
	}
});

const Creator = Backbone.View.extend({
	el: "#creator",
	initialize: function() {
		var self = this;
		this.cardTemplate = _.template(this.$el.find("#link-card-template").html());
		setTimeout(()=>{
			$("#my-spinner").show();
			Parse.User.current().fetch().then(( u )=>{
				if( u.get( "profile" ) != null ) {
					self.prepareInfo( u.get( "profile" ) );
					self.populateLinkCard();
				} else {
					self.prepareInfo({
						name: "Excited user",
						picture: "https://avatars.io/facebook",
						cover: "https://placeimg.com/851/316/any"
					});
				}
				$("#my-spinner").hide();
			}, ()=>{
				$.sticky("Something went wrong");
				$("#my-spinner").hide();
				auth.render();
			});
		}, 100);
		return this;
	},
	render: function() {
		let self = this;
		$( ".page" ).hide();
		this.$el.show();
		return this;
	},
	events: {
		"click .new-link-btn": "openNewLinkCardModal",
		"submit #new-link-card-modal form": "addNewLinkCard",
		"click .open-info-card-modal": "openInfoCardModal",
		"submit #info-card-modal form": "updateInfoCard",
		"click .w3-modal": "closeModal",
		"click .from-facebook-btn": "fromFacebook",
		"click .link-card .remove": "removeLinkCard",
		"click .refrence": "openUsernameModal",
		"click .copy-username": "copyUsername",
		"click .fav-btns button": "openFavBtnModal",
		"submit #username-modal form": "changeUsername",
		"submit #fav-btn-modal form": "addFavBtn"
	},
	prepareInfo: function( data ) {
		var self = this;
		let cover = self.lazyLoad( data.cover, ()=>{
			self.$el.find(".picture-card").height( self.$el.find(".cover").height() );
		});
		cover.classList.add( "w3-image" );
		self.$el.find(".section .cover").html( cover );
		let dp = this.lazyLoad( data.picture );
		dp.classList.add("w3-image","w3-card-4","w3-circle", "w3-border", "w3-theme", "profile-picture");
		self.$el.find(".section .dp").html( dp );
		self.$el.find(".section .info-card .display-name").text( data.name );
		self.$el.find(".section .info-card .bio").text( data.about );

		// Update info-card-modal fields as well
		self.$el.find("#info-card-modal .cover_photo_url").val( data.cover );
		self.$el.find("#info-card-modal .profile_photo_url").val( data.picture );
		self.$el.find("#info-card-modal .display_name").val( data.name );
		self.$el.find("#info-card-modal .about").val( data.about );

		self.$el.find('.refrence').html( Parse.User.current().get("username") );
		self.$el.find('.refrence').data( "ref", Parse.User.current().get("username") );
		cover.setAttribute( "src", cover.getAttribute("data-src") );
		dp.setAttribute( "src", dp.getAttribute("data-src") );
	},
	lazyLoad: function( src, callback ) {
		let im = new Image();
		im.setAttribute( "data-src", src );
		im.onload = ( ev )=>{
			im.removeAttribute( "data-src" );
			if( callback )
				callback( ev );
		};
		return im;
	},
	closeModal: function( ev ) {
		if( ev.target.classList.contains('w3-modal') ) {
			ev.preventDefault();
			$(".w3-modal").hide();
		}
	},
	showImageUrlHint: function() {
		$.sticky("use <a target='_blank' href='https://ctrlq.org/images'>https://ctrlq.org/images</a> to get image url", {
			autoclose: 10000
		});
	},
	openInfoCardModal: function( ev ) {
		ev.preventDefault();
		this.$el.find("#info-card-modal").show();
		this.showImageUrlHint();
	},
	fromFacebook: function( ev ) {
		ev.preventDefault();
		var self = this;
		$("#my-spinner").show();
		auth.getProfile().then(profile=>{
			$("#my-spinner").hide();
			self.$el.find(".cover_photo_url").val( profile.cover.source );
			self.$el.find(".profile_photo_url").val( profile.picture.data.url );
			self.$el.find(".display_name").val( profile.name );
			console.log( profile );
		});
	},
	updateInfoCard: function( ev ) {
		ev.preventDefault();
		let model = {};
		model.cover = this.$el.find("#info-card-modal .cover_photo_url").val();
		model.picture = this.$el.find("#info-card-modal .profile_photo_url").val();
		model.name = this.$el.find("#info-card-modal .display_name").val();
		model.about = this.$el.find("#info-card-modal .about").val();
		let u = Parse.User.current();
		u.set("profile", model);
		u.save();
		this.prepareInfo( model );
		console.log( model );
		this.$el.find('.w3-modal').click();
	},
	openUsernameModal: function( ev ) {
		ev.preventDefault();
		this.$el.find('#username-modal .username').val( Parse.User.current().get("username") );
		this.$el.find('#username-modal').show();
		this.showImageUrlHint();
	},
	changeUsername: function( ev ) {
		ev.preventDefault();
		var self = this;
		let username = this.$el.find('#username-modal .username').val();
		if( username.length < 4 ) {
			$.sticky("Username is too short");
			return false;
		}
		$("#my-spinner").show();
		let user = Parse.User.current();
		user.set("username", username);
		user.save().then(function( user ) {
			$("#my-spinner").hide();
			self.$el.find('.refrence').html( user.get("username") );
			self.$el.find('.refrence').data( "ref", user.get("username") );
			console.log( user.get("username") );
			self.$el.find('.w3-modal').click();
		}, function( user, error ) {
			$("#my-spinner").hide();
			$.sticky( error.message );
			console.log( user, error );
		});
	},
	copyUsername: function( ev ) {
		ev.preventDefault();
		let ta = document.createElement( "textarea" );
		$( ta ).addClass('clipboard-textarea');
		ta.value = location.origin+"/"+Parse.User.current().get("username");
		$( "body" ).append( ta );
		ta.select();
		let fa = document.execCommand( "copy" );
		if( fa ) {
			$.sticky( "Link copied" );
		} else {
			$.sticky( "Something went wrong" );
		}
		ta.remove();
	},
	populateLinkCard: async function() {
		var self = this;
		for( const card of Parse.User.current().get("links") ) {
			await self.renderLinkCard( card );
		}
	},
	openFavBtnModal: function( ev ) {
		ev.preventDefault();
		let type = $(ev.currentTarget).data("type");
		this.$el.find('form').data( "type", type );
		let favbtns = Parse.User.current().get("favbtns");
		if( favbtns != null ) {
			favbtns = favbtns.filter(function(btn) {
				return btn.type == type;
			});
			try {this.$el.find('input').val( favbtns[0].uid ); } catch(e){}
		}
		this.$el.find('label').text( `Enter ${$(ev.currentTarget).data("type")} userid` );
		this.$el.find('#fav-btn-modal').show();
	},
	addFavBtn: function( ev ) {
		ev.preventDefault();
		let form = $(ev.currentTarget);
		let type = form.data("type");
		let uid = form.find("input").val();
		let favbtns = Parse.User.current().get("favbtns");
		if( favbtns == null ) favbtns = [];
		favbtns = favbtns.filter(function(btn) {
			return btn.type != type;
		});
		favbtns.push({
			type: type,
			uid: uid
		});
		Parse.User.current().set("favbtns", favbtns );
		Parse.User.current().save();
		console.log( favbtns );
		this.$el.find('.w3-modal').click();
	},
	openNewLinkCardModal: function( ev ) {
		ev.preventDefault();
		this.$el.find('#new-link-card-modal').show();
		this.showImageUrlHint();
	},
	addNewLinkCard: function( ev ) {
		ev.preventDefault();
		let form = $( ev.target );
		let data = {};
		data.image_url = form.find(".image_url").val();
		data.page_url = form.find(".page_url").val();
		if( $.trim(data.image_url) == "" ) {
			data.image_url = "https://source.unsplash.com/random/150x150";
		}
		if( !data.image_url.startsWith("http") ) {
			$.sticky("Image url is not correct");
			return false;
		}
		if( !data.page_url.startsWith("http") ) {
			$.sticky("Page url is not correct");
			return false;
		}
		data.caption = form.find(".caption").val();
		if( data.caption.length == 0 || data.caption.length > 16 ) {
			$.sticky("Caption is either too long or too short");
			return false;
		}
		let u = Parse.User.current();
		u.add("links", data);
		u.save();
		this.renderLinkCard( data );
		this.$el.find('.w3-modal').click();
	},
	renderLinkCard: function( data ) {
		var self = this;
		return new Promise((res)=>{
			let el = $( self.cardTemplate( data ) );
			el.find("img").on("load", (ev)=>{
				ev.target.removeAttribute("data-src");
				let img = $(ev.target);
				img.parent().height( img.width() );
			});
			self.$el.find('.link-cards').append( el );
			setTimeout( res, 500);
		});
	},
	removeLinkCard: function(ev) {
		let links = Parse.User.current().get("links");
		let target = $( ev.target );
		if( target.hasClass('remove') ) {
			ev.stopPropagation();
			links = links.filter(a=> a.page_url != target.data("url") );
			Parse.User.current().set("links", links);
			Parse.User.current().save();
			target.parent().parent().parent().parent().fadeOut('slow', function() {
				$( this ).remove();
			});
		}
	}
});

$( window ).on('resize', function(event) {
	event.preventDefault();
	$(".page").css("margin-bottom", $(".w3-bottom").height())
});
$(".page").css("margin-bottom", $(".w3-bottom").height())