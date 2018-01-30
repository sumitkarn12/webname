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

let page = "sumit";

const Creator = Backbone.View.extend({
	el: "#creator",
	initialize: function() {
		var self = this;
		this.$el.find('.fav-btns a').hide();
		this.cardTemplate = _.template(this.$el.find("#link-card-template").html());
		this.searchProfile( page ).then(r => {
			$("#my-spinner").fadeOut( "slow" );
			let profile = r.get("profile");
			profile.username = r.get("username");
			this.prepareInfo( profile ).then(async function() {
				await self.populateFavBtns( r.get("favbtns") );
				await self.populateLinkCard( r.get("links") );
			});
			console.log( r );
		}).catch(err=>{
			console.log( err );
		});
		return this;
	},
	render: function() {
		let self = this;
		$( ".page" ).hide();
		this.$el.show();
		return this;
	},
	searchProfile: function( username ) {
		return new Promise((resolve, reject)=>{
			let q = new Parse.Query( Parse.User );
			q.equalTo( "username", username );
			q.first().then( resolve, reject );
		});
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
		"submit #fav-btn-modal form": "addFavBtn",
		"click .link-card": "openLink"
	},
	prepareInfo: function( data ) {
		var self = this;
		return new Promise( resolve =>{
			let cover = self.lazyLoad( data.cover, ()=>{
				self.$el.find(".picture-card").height( self.$el.find(".cover").height() );
				setTimeout( resolve, 1000 );
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

			cover.setAttribute( "src", cover.getAttribute("data-src") );
			dp.setAttribute( "src", dp.getAttribute("data-src") );
		});
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
	populateFavBtns: async function( data ) {
		var self = this;
		for( const btn of data ) {
			await self.renderFavBtn( btn );
		}
	},
	renderFavBtn: function( data ) {
		var self = this;
		return new Promise((res)=>{
			let btn = self.$el.find('.fav-btns').find(`[data-type=${data.type}]`);
			btn.show();
			btn.attr( "href", self.createUrl( data ) );
			res();
		});
	},
	createUrl: function( res ) {
		switch( res.type ) {
			case "facebook": return `https://fb.me/${res.uid}`;
			case "twitter": return `https://twitter.com/${res.uid}`;
			case "instagram": return `https://instagr.am/_u/${res.uid}`;
			case "whatsapp": return `https://api.whatsapp.com/send?phone=${res.uid}`;
			case "youtube": return `https://www.youtube.com/${res.uid}`;
		}
		return "";
	},
	populateLinkCard: async function( data ) {
		var self = this;
		for( const card of data ) {
			await self.renderLinkCard( card );
		}
	},
	renderLinkCard: function( data ) {
		var self = this;
		return new Promise((res)=>{
			let el = $( self.cardTemplate( data ) );
			el.find("img").on("load", (ev)=> ev.target.removeAttribute("data-src") );
			self.$el.find('.link-cards').append( el );
			setTimeout( res, 500);
		});
	},
	openLink: function( ev ) {
		ev.preventDefault();
		let card = $( ev.currentTarget );
		window.open(card.data("url"), "_blank")
	}
});

creator = new Creator();
creator.render();

