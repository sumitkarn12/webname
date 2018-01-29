toastr.options.closeButton = true;
toastr.options.positionClass = "toast-bottom-center";

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
$("#my-spinner").show();

window.fbAsyncInit = function() {
	Parse.FacebookUtils.init({
		appId 	: "1778142652491392",	// Facebook App ID
		status 	: false,				// check Facebook Login status
		cookie 	: true,				// enable cookies to allow Parse to access the session
		xfbml 	: true,				// initialize Facebook social plugins on the page
		version 	: "v2.11"				// point to the latest Facebook Graph API version
	});
	console.log( "Facebook SDK loaded" );
	var self = this;
	if( auth == null )
		auth = new Auth();
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
				toastr.info("Logged in with Facebook");
				self.getProfile().then( res => {
					if( creator == null )
						creator = new Creator();
					creator.render();
				});
			},
			error: function(user, error) {
				$("#my-spinner").hide();
				console.log("User cancelled the Facebook login or did not fully authorize.");
				toastr.error("User cancelled the Facebook login or did not fully authorize.");
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
		let user = Parse.User.current().get("profile");
		if( user != null ) {
			this.prepareInfo( user ).then(()=>{
				self.populateLinkCard();
			});
		} else {
			this.prepareInfo({
				name: "Excited user",
				picture: "https://avatars.io/facebook",
				cover: "https://placeimg.com/851/316/any"
			}).then(()=>{
				self.populateLinkCard();
			});
		}
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
		"click .link-card": "openLink"
	},
	closeModal: function( ev ) {
		if( ev.target.classList.contains('w3-modal') ) {
			ev.preventDefault();
			$(".w3-modal").hide();
		}
	},
	openInfoCardModal: function( ev ) {
		ev.preventDefault();
		this.$el.find("#info-card-modal").show();
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
	prepareInfo: function( data ) {
		var self = this;
		return new Promise( resolve =>{
			let cover = self.lazyLoad( data.cover, ()=>{
				setTimeout(async function() {
					self.$el.find(".picture-card").height( self.$el.find(".cover").height() );
					resolve()
				}, 500);
			});
			cover.classList.add( "w3-image" );
			self.$el.find(".section .cover").html( cover );
			let dp = this.lazyLoad( data.picture, ()=>{});
			dp.classList.add("w3-image","w3-card-4","w3-circle", "w3-border", "w3-theme", "profile-picture");
			self.$el.find(".section .dp").html( dp );
			self.$el.find(".section .info-card .display-name").text( data.name );
			self.$el.find(".section .info-card .bio").text( data.about );

			// Update info-card-modal fields as well
			self.$el.find("#info-card-modal .cover_photo_url").val( data.cover );
			self.$el.find("#info-card-modal .profile_photo_url").val( data.picture );
			self.$el.find("#info-card-modal .display_name").val( data.name );
			self.$el.find("#info-card-modal .about").val( data.about );
		});
	},
	lazyLoad: function( src, callback ) {
		let im = new Image();
		im.setAttribute( "src", src );
		im.setAttribute( "data-src", "" );
		im.onload = ( ev )=>{
			im.removeAttribute( "data-src" );
			callback( ev );
		};
		return im;
	},
	populateLinkCard: async function() {
		var self = this;
		for( const card of Parse.User.current().get("links") ) {
			await self.renderLinkCard( card );
		}
	},
	openNewLinkCardModal: function( ev ) {
		ev.preventDefault();
		this.$el.find('#new-link-card-modal').show();
	},
	addNewLinkCard: function( ev ) {
		ev.preventDefault();
		let form = $( ev.target );
		let data = {};
		data.url = form.find(".url").val();
		if( !data.url.startsWith("http") ) {
			toastr.error("Seems not a correct web address");
			return false;
		}
		data.caption = form.find(".caption").val();
		let u = Parse.User.current();
		u.add("links", data);
		u.save();
		this.renderLinkCard( data );
		this.$el.find('.w3-modal').click();
	},
	renderLinkCard: function( data ) {
		var self = this;
		return new Promise((res)=>{
			let username = data.url.substring( data.url.lastIndexOf("/")+1 );
			data.username = username;
			self.$el.find('.link-cards').append( self.cardTemplate( data ) );
			setTimeout( res, 500);
		});
	},
	removeLinkCard: function(ev) {
		let links = Parse.User.current().get("links");
		let target = $( ev.target );
		if( target.hasClass('remove') ) {
			ev.stopPropagation();
			links = links.filter(a=> a.url != target.data("url") );
			Parse.User.current().set("links", links);
			Parse.User.current().save();
			target.parent().parent().parent().parent().fadeOut('slow', function() {
				$( this ).remove();
			});
		}
	},
	openLink: function( ev ) {
		ev.preventDefault();
		let card = $( ev.currentTarget );
		window.open(card.data("url"), "_blank")
	}
});

